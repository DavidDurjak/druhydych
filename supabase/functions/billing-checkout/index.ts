// GainTrain Plus (v314): otvorí platbu predplatného cez Stripe Checkout (karta, Apple Pay, Google Pay).
// Plány a ceny sú v app_config.billing.plans; Stripe cenu vytvorí pri platbe (price_data), netreba zakladať ceny v Stripe.
// Skúšobná doba 7 dní (s kartou) len pre toho, kto ešte nikdy nemal predplatné; či karta už skúšobnú dobu mala, stráži billing-webhook.
// Zľavy: prvý rok ročného za nižšiu cenu pre nových (offers.first_year), nižšia cena prvého roka pri návrate po zrušení (offers.winback).
// Človek sa vráti do appky na ?billing=ok alebo ?billing=cancel; samotné zapnutie predplatného urobí billing-webhook.
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const APP = Deno.env.get("APP_URL") || "https://druhydych.vercel.app/";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const cents = (v: unknown) => Math.round(Number(v) * 100);

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
  if (!r.ok) { const e = new Error(j?.error?.message || `Stripe ${r.status}`) as Error & { status?: number }; e.status = r.status; throw e; }
  return j;
}
// kupón zo Stripe podľa ID; keď ešte neexistuje (alebo má inú hodnotu), založí sa
async function makeCoupon(id: string, params: Record<string, string>) {
  try { await stripe("coupons", { id, duration: "once", ...(params.amount_off ? { currency: "eur" } : {}), ...params }); } catch (e) { if ((e as { status?: number }).status !== 400) throw e; /* už existuje */ }
  return id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Zlá požiadavka." }, 405);
  const admin = createClient(URL_, SERVICE);
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [{ data: u }, { data: cfgRow }, body] = await Promise.all([
    admin.auth.getUser(jwt),
    admin.from("app_config").select("value").eq("key", "billing").maybeSingle(),
    req.json().catch(() => ({})),
  ]);
  const user = u?.user;
  if (!user) return json({ error: "Prihlás sa znova." }, 401);
  const cfg = cfgRow?.value || {};
  const plan = (cfg.plans || []).find((p: { id: string }) => p.id === body.plan);
  if ((!cfg.on && !(cfg.testers || []).includes(user.id)) || !STRIPE) return json({ error: "Predplatné ešte nie je spustené. Skús to o pár dní." }, 503);
  if (!plan || !(Number(plan.price) > 0)) return json({ error: "Tento plán nepoznáme. Zavri okno a skús to znova." }, 400);

  // zákonný súhlas (§17 ods. 4 a 10 zákona 108/2024): bez zaznamenaného súhlasu sa platba neotvorí
  const cons = body.consent;
  if (!cons || cons.ok !== true || typeof cons.v !== "string" || cons.v.length > 40 || typeof cons.text !== "string" || cons.text.length < 40 || cons.text.length > 1500) {
    return json({ error: "Aktualizuj appku (potiahni stránku nadol) a skús to znova." }, 400);
  }

  try {
    const [{ data: sub }, { data: member }] = await Promise.all([
      admin.from("subscriptions").select("status,stripe_customer_id,updated_at").eq("user_id", user.id).maybeSingle(),
      admin.from("sub_members").select("owner_id").eq("member_id", user.id).maybeSingle(),
    ]);
    if (sub && ["active", "trialing", "past_due"].includes(sub.status)) return json({ error: "Predplatné už máš. Spravuješ ho v Profile." }, 409);
    let customer = sub?.stripe_customer_id;
    if (!customer) {
      const c = await stripe("customers", { email: user.email || "", "metadata[user_id]": user.id, "preferred_locales[0]": "sk" });
      customer = c.id;
      const { error } = await admin.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customer, status: sub?.status || "none", updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    }

    // nový zákazník (nikdy nemal predplatné, ani ako člen rodiny ho práve nemá): skúšobná doba + zľava na prvý rok
    const isNew = !sub || !sub.status || sub.status === "none";
    const trialDays = isNew && !member ? Number(cfg.stripe_trial_days || 0) : 0;
    const offers = cfg.offers || {};
    let discount = "";
    let couponMake: (() => Promise<string>) | null = null;
    const fy = offers.first_year, wb = offers.winback;
    if (isNew && fy && (fy.plans || []).includes(plan.id) && Number(fy.price) > 0 && Number(fy.price) < Number(plan.price)) {
      const off = cents(plan.price) - cents(fy.price);
      discount = `GT_FIRST_${plan.id}_${off}`.toUpperCase(); couponMake = () => makeCoupon(discount, { amount_off: String(off), name: "Zľava na prvý rok" });
    } else if (!isNew && sub?.status === "canceled" && wb && (wb.plans || []).includes(plan.id) && Number(wb.price) > 0 && Number(wb.price) < Number(plan.price)
      && new Date(sub.updated_at).getTime() < Date.now() - Number(wb.after_days || 7) * 864e5) {
      const off = cents(plan.price) - cents(wb.price);
      discount = `GT_BACK_${plan.id}_${off}`.toUpperCase(); couponMake = () => makeCoupon(discount, { amount_off: String(off), name: "Vitaj späť" });
    }

    const { error: ce } = await admin.from("order_consents").insert({ user_id: user.id, plan: plan.id, price: plan.price, trial_days: trialDays, text_version: cons.v, consent_text: cons.text });
    if (ce) throw new Error("consent " + ce.message);

    const back = backUrl(body.back);
    const params: Record<string, string> = {
      mode: "subscription", customer, client_reference_id: user.id, locale: "sk",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(cents(plan.price)),
      "line_items[0][price_data][tax_behavior]": "inclusive",
      "line_items[0][price_data][recurring][interval]": plan.interval === "year" ? "year" : "month",
      "line_items[0][price_data][recurring][interval_count]": String(Math.max(1, Number(plan.count) || 1)),
      "line_items[0][price_data][product_data][name]": `GainTrain Plus, ${String(plan.name).toLowerCase()}`,
      "line_items[0][price_data][product_data][metadata][plan]": plan.id,
      "subscription_data[metadata][user_id]": user.id, "subscription_data[metadata][plan]": plan.id,
      "metadata[user_id]": user.id, "metadata[plan]": plan.id,
      "payment_method_types[0]": "card", // karta (vrátane Apple Pay a Google Pay): menej volieb, rýchlejšia platba
      payment_method_collection: "always", // karta aj pri skúšobnej dobe (jedna karta = jedna skúšobná doba)
      success_url: back + "?billing=ok#/profil", cancel_url: back + "?billing=cancel#/profil",
    };
    if (trialDays > 0) {
      params["subscription_data[trial_period_days]"] = String(trialDays);
      params["subscription_data[trial_settings][end_behavior][missing_payment_method]"] = "cancel";
      params["subscription_data[metadata][trial]"] = "1";
    }
    if (discount) params["discounts[0][coupon]"] = discount; else params.allow_promotion_codes = "true";
    let s;
    try { s = await stripe("checkout/sessions", params); }
    catch (e) { // kupón ešte neexistuje: založ ho a skús znova
      if (discount && couponMake && /coupon/i.test((e as Error).message)) { await couponMake(); s = await stripe("checkout/sessions", params); } else throw e;
    }
    return json({ url: s.url });
  } catch (e) {
    console.error("checkout", e);
    return json({ error: "Platbu sa nepodarilo otvoriť. Skús to znova." }, 502);
  }
});
