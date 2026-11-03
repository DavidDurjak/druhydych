// GainTrain Plus: odstúpenie od zmluvy online (§20a zákona 108/2024 Z. z.), dvojkrokové v appke.
// Zruší predplatné vo Stripe hneď, ak je ešte v 14-dňovej lehote od uzavretia zmluvy (prvý súhlas s objednávkou), vráti peniaze
// za nevyužitú časť zaplatenej doby (pomerná platba za čas používania sa zadrží, §21 ods. 5) a zapíše žiadosť s dátumom a časom.
// Po lehote funkcia nič nemení: appka človeka nasmeruje na bežné zrušenie.
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const DAY = 864e5;

async function stripe(path: string, method = "GET", params?: Record<string, string>) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method, headers: { Authorization: `Bearer ${STRIPE}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Stripe ${r.status}`);
  return j;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Zlá požiadavka." }, 405);
  if (!STRIPE) return json({ error: "Odstúpenie sa teraz nedá spracovať. Napíš nám." }, 503);
  const admin = createClient(URL_, SERVICE);
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [{ data: u }, body] = await Promise.all([admin.auth.getUser(jwt), req.json().catch(() => ({}))]);
  const user = u?.user;
  if (!user) return json({ error: "Prihlás sa znova." }, 401);
  if (body.confirm !== true) return json({ error: "Chýba potvrdenie." }, 400);

  const { data: sub } = await admin.from("subscriptions").select("status,stripe_subscription_id,source").eq("user_id", user.id).maybeSingle();
  const subId = sub?.stripe_subscription_id;
  if (!subId || !/^sub_[A-Za-z0-9]+$/.test(subId) || !["active", "trialing", "past_due"].includes(sub?.status || "")) {
    return json({ error: "Nemáš aktívne predplatné, od ktorého by si mohol odstúpiť." }, 409);
  }
  const { data: first } = await admin.from("order_consents").select("accepted_at").eq("user_id", user.id).order("accepted_at", { ascending: true }).limit(1).maybeSingle();
  // zmluva vznikla pri prvej objednávke; ak záznam chýba, berieme začiatok predplatného zo Stripe
  const now = Date.now();
  const { data: reqRow } = await admin.from("withdrawals").insert({ user_id: user.id, stripe_subscription_id: subId, status: "requested" }).select("id,requested_at").single();
  try {
    const s = await stripe(`subscriptions/${subId}?expand[]=latest_invoice`);
    const start = first?.accepted_at ? new Date(first.accepted_at).getTime() : (s.start_date || s.created) * 1000;
    const within = now <= start + 14 * DAY;
    if (!within) {
      await admin.from("withdrawals").update({ status: "late", within_period: false, confirmed_at: new Date().toISOString() }).eq("id", reqRow?.id);
      return json({ ok: false, late: true, requested_at: reqRow?.requested_at });
    }
    // peniaze: z poslednej zaplatenej faktúry vrátime nevyužitú časť doby (od začiatku platenej doby)
    let refund = 0;
    const inv = s.latest_invoice;
    if (inv && inv.status === "paid" && Number(inv.amount_paid) > 0 && inv.payment_intent) {
      const ps = (inv.period_start || 0) * 1000, pe = (inv.period_end || 0) * 1000;
      const lines = inv.lines?.data?.[0]?.period;
      const a = lines ? lines.start * 1000 : ps, b = lines ? lines.end * 1000 : pe;
      if (b > a) {
        const usedFrac = Math.min(1, Math.max(0, (now - a) / (b - a)));
        refund = Math.floor(Number(inv.amount_paid) * (1 - usedFrac));
      }
      if (refund >= 50) {
        await stripe("refunds", "POST", { payment_intent: String(inv.payment_intent), amount: String(refund), "metadata[reason]": "withdrawal" });
      } else refund = 0;
    }
    await stripe(`subscriptions/${subId}`, "DELETE");
    await admin.from("subscriptions").update({ status: "canceled", cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    const at = new Date().toISOString();
    await admin.from("withdrawals").update({ status: "done", within_period: true, refund_cents: refund, confirmed_at: at }).eq("id", reqRow?.id);
    return json({ ok: true, at, requested_at: reqRow?.requested_at, refund_cents: refund });
  } catch (e) {
    console.error("withdraw", user.id, String((e as Error).message).slice(0, 200));
    await admin.from("withdrawals").update({ status: "error", note: String((e as Error).message).slice(0, 200) }).eq("id", reqRow?.id);
    return json({ error: "Odstúpenie sa nepodarilo dokončiť. Tvoja žiadosť je zaznamenaná, ozveme sa ti. Môžeš nám aj napísať." }, 502);
  }
});
