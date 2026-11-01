// GainTrain Plus: Stripe posiela sem zmeny predplatného (zaplatené, obnovené, zlyhaná platba, zrušené).
// Podpis sa overí tajomstvom STRIPE_WEBHOOK_SECRET; stav sa zapíše do tabuľky subscriptions, appka ho číta cez my_entitlement().
// V Stripe: Developers → Webhooks → endpoint https://<projekt>.supabase.co/functions/v1/billing-webhook, udalosti:
// checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
// v314: jedna karta = jedna skúšobná doba. Pri predplatnom v skúšobnej dobe sa pozrie odtlačok karty (card.fingerprint, nie číslo karty);
// keď ju už mal iný účet, skúšobná doba sa hneď ukončí a Stripe stiahne platbu. Kto si kúpi vlastné predplatné, vypadne z cudzej rodiny.
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const WH = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const enc = new TextEncoder();

async function verify(raw: string, header: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]).filter((p) => p.length === 2 && p[0] !== "v1"));
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!WH || !t || !sigs.length || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(WH), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${raw}`)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}
async function api(path: string, params?: Record<string, string>) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: params ? "POST" : "GET",
    headers: { Authorization: `Bearer ${STRIPE}`, "Stripe-Version": "2024-06-20", ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  if (!r.ok) throw new Error("Stripe " + r.status);
  return await r.json();
}
const getSub = (id: string) => api("subscriptions/" + id);

// jedna karta = jedna skúšobná doba; vráti true, keď sa skúšobná doba ukončila
async function trialGuard(admin: ReturnType<typeof createClient>, sub: Record<string, any>, uid: string) {
  if (sub.status !== "trialing") return false;
  const full = await api(`subscriptions/${sub.id}?expand[]=default_payment_method`);
  let fp = full?.default_payment_method?.card?.fingerprint;
  if (!fp) { const c = await api(`customers/${sub.customer}?expand[]=invoice_settings.default_payment_method`); fp = c?.invoice_settings?.default_payment_method?.card?.fingerprint; }
  if (!fp) return false;
  const { data: seen } = await admin.from("trial_cards").select("user_id").eq("fingerprint", fp).maybeSingle();
  if (seen && seen.user_id && seen.user_id !== uid) {
    await api("subscriptions/" + sub.id, { trial_end: "now", proration_behavior: "none" });
    await admin.from("app_events").insert({ user_id: uid, name: "trial_card_reused", props: {} }).then(() => {}, () => {});
    return true;
  }
  if (!seen) await admin.from("trial_cards").insert({ fingerprint: fp, user_id: uid }).then(() => {}, () => {});
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const raw = await req.text();
  if (!(await verify(raw, req.headers.get("stripe-signature") || ""))) return new Response("bad signature", { status: 400 });
  const ev = JSON.parse(raw);
  const admin = createClient(URL_, SERVICE);
  try {
    let sub = null as null | Record<string, any>;
    if (ev.type === "checkout.session.completed" && ev.data.object.subscription) sub = await getSub(ev.data.object.subscription);
    else if (/^customer\.subscription\./.test(ev.type)) sub = ev.data.object;
    if (!sub) return new Response("ignored");

    // komu patrí: z metadát predplatného, inak podľa zákazníka uloženého pri otvorení platby
    let uid = sub.metadata?.user_id || "";
    if (!uid) { const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", sub.customer).maybeSingle(); uid = data?.user_id || ""; }
    if (!uid) { console.error("webhook: neznámy zákazník", sub.customer); return new Response("unknown customer"); }

    const { data: cfgRow } = await admin.from("app_config").select("value").eq("key", "billing").maybeSingle();
    const price = sub.items?.data?.[0]?.price?.id;
    const plan = sub.metadata?.plan || (cfgRow?.value?.plans || []).find((p: { price_id: string }) => p.price_id === price)?.id || null;
    const end = sub.current_period_end || sub.items?.data?.[0]?.current_period_end;
    const status = ev.type === "customer.subscription.deleted" ? "canceled" : String(sub.status || "none");
    // staršia udalosť nesmie prepísať novšiu (Stripe ich neposiela vždy v poradí)
    const at = new Date((ev.created || Date.now() / 1000) * 1000).toISOString();
    const { data: cur } = await admin.from("subscriptions").select("updated_at,stripe_subscription_id").eq("user_id", uid).maybeSingle();
    if (cur?.updated_at && cur.updated_at > at && cur.stripe_subscription_id === sub.id) return new Response("stale");
    const { error } = await admin.from("subscriptions").upsert({
      user_id: uid, status, plan, current_period_end: end ? new Date(end * 1000).toISOString() : null,
      cancel_at_period_end: !!sub.cancel_at_period_end, stripe_customer_id: sub.customer, stripe_subscription_id: sub.id, updated_at: at,
    });
    if (error) throw new Error(error.message);
    if (["active", "trialing"].includes(status)) {
      await admin.from("sub_members").delete().eq("member_id", uid).then(() => {}, () => {});
      if (ev.type === "checkout.session.completed" || ev.type === "customer.subscription.created") {
        try { await trialGuard(admin, sub, uid); } catch (e) { console.error("trial guard", e); }
      }
    }
    await admin.from("app_events").insert({ user_id: uid, name: "sub_" + status, props: { plan, ev: ev.type } }).then(() => {}, () => {});
    return new Response("ok");
  } catch (e) {
    console.error("webhook", e);
    return new Response("error", { status: 500 }); // Stripe to skúsi znova
  }
});
