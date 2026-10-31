// GainTrain Plus: otvorí platbu predplatného cez Stripe Checkout (karta, Apple Pay, Google Pay).
// Kým nie je nastavený STRIPE_SECRET_KEY a v app_config.billing.plans chýba price_id, vráti „predplatné ešte nie je spustené“.
// Človek sa vráti do appky na ?billing=ok alebo ?billing=cancel; samotné zapnutie predplatného urobí billing-webhook.
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const APP = Deno.env.get("APP_URL") || "https://druhydych.vercel.app/";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// návratová adresa len na našu appku (alebo lokálny vývoj), nikdy na cudziu stránku
function backUrl(b: unknown) {
  try {
    const u = new URL(String(b || ""));
    if (u.origin === new URL(APP).origin || /^(localhost|127\.0\.0\.1)$/.test(u.hostname) || /^druhydych(-[a-z0-9-]+)?\.vercel\.app$/.test(u.hostname)) return u.origin + u.pathname;
  } catch (_) { /* zlá adresa */ }
  return APP;
}
async function stripe(path: string, params: Record<string, string> | null, method = "POST") {
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
  const admin = createClient(URL_, SERVICE);
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  const user = u?.user;
  if (!user) return json({ error: "Prihlás sa znova." }, 401);
  const body = await req.json().catch(() => ({}));

  const { data: cfgRow } = await admin.from("app_config").select("value").eq("key", "billing").maybeSingle();
  const cfg = cfgRow?.value || {};
  const plan = (cfg.plans || []).find((p: { id: string }) => p.id === body.plan) || (cfg.plans || [])[0];
  if (!cfg.on || !STRIPE || !plan?.price_id) return json({ error: "Predplatné ešte nie je spustené. Skús to o pár dní." }, 503);

  try {
    const { data: sub } = await admin.from("subscriptions").select("status,stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (sub && ["active", "trialing", "past_due"].includes(sub.status)) return json({ error: "Predplatné už máš. Spravuješ ho v Profile." }, 409);
    let customer = sub?.stripe_customer_id;
    if (!customer) {
      const c = await stripe("customers", { email: user.email || "", "metadata[user_id]": user.id, "preferred_locales[0]": "sk" });
      customer = c.id;
      const { error } = await admin.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customer, status: sub?.status || "none", updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    }
    const back = backUrl(body.back);
    const s = await stripe("checkout/sessions", {
      mode: "subscription", customer, client_reference_id: user.id, locale: "sk",
      "line_items[0][price]": plan.price_id, "line_items[0][quantity]": "1",
      "subscription_data[metadata][user_id]": user.id, "subscription_data[metadata][plan]": plan.id,
      "metadata[user_id]": user.id, allow_promotion_codes: "true",
      success_url: back + "?billing=ok#/profil", cancel_url: back + "?billing=cancel#/profil",
    });
    return json({ url: s.url });
  } catch (e) {
    console.error("checkout", e);
    return json({ error: "Platbu sa nepodarilo otvoriť. Skús to znova." }, 502);
  }
});
