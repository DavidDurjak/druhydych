// GainTrain Plus: zabezpečený portál Stripe (zmena karty, faktúry, zrušenie predplatného).
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const APP = Deno.env.get("APP_URL") || "https://druhydych.vercel.app/";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function backUrl(b: unknown) {
  try {
    const u = new URL(String(b || ""));
    if (u.origin === new URL(APP).origin || /^(localhost|127\.0\.0\.1)$/.test(u.hostname) || /^druhydych(-[a-z0-9-]+)?\.vercel\.app$/.test(u.hostname)) return u.origin + u.pathname;
  } catch (_) { /* zlá adresa */ }
  return APP;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Zlá požiadavka." }, 405);
  const admin = createClient(URL_, SERVICE);
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json({ error: "Prihlás sa znova." }, 401);
  if (!STRIPE) return json({ error: "Predplatné ešte nie je spustené." }, 503);
  const body = await req.json().catch(() => ({}));
  const { data: sub } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", u.user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return json({ error: "Predplatné sme nenašli. Napíš nám cez Profile." }, 404);
  try {
    const r = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST", headers: { Authorization: `Bearer ${STRIPE}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
      body: new URLSearchParams({ customer: sub.stripe_customer_id, return_url: backUrl(body.back) + "#/profil", locale: "sk" }).toString(),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || String(r.status));
    return json({ url: j.url });
  } catch (e) {
    console.error("portal", e);
    return json({ error: "Portál sa nepodarilo otvoriť. Skús to znova." }, 502);
  }
});
