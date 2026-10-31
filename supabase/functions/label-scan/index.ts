// Fuelwind: prečítanie tabuľky výživových hodnôt z fotky obalu. AI len prepíše čísla z obalu, nič neodhaduje.
// Hodnoty prepočíta na 100 g (alebo 100 ml) a skontroluje, či kalórie sedia s makrami. Používateľ ich ešte vidí a potvrdí.
import { createClient } from "jsr:@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = [Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash", Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest"];
const TIMEOUT_MS = 25000, DAILY_LIMIT = 30;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const clean = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (v: unknown) => { if (v === null || v === undefined || v === "") return null; const n = Number(String(v).replace(",", ".").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : null; };
const r1 = (x: number) => Math.round(x * 10) / 10;

const PROMPT = `Na fotke je obal potraviny, nápoja alebo doplnku stravy. Nájdi tabuľku výživových hodnôt (nutričné hodnoty, Nutrition facts, Nährwerte, Výživové údaje).
Pravidlá:
- Iba PREPÍŠ čísla, ktoré na obale vidíš. Nič neodhaduj ani nedopočítavaj. Čo nevidíš, daj null.
- Ak má tabuľka stĺpec na 100 g alebo 100 ml, použi ten (basis "100"). Ak je len na porciu, použi porciu (basis "serving") a vyplň serving_g (gramy alebo ml jednej porcie).
- Pri prášku (proteín, gainer) ber stĺpec pre samý prášok, nie pre nápoj pripravený s mliekom.
- kcal: ak je uvedené aj kJ aj kcal, daj kcal. Ak je len kJ, daj ho do kj a kcal nechaj null.
- "sacharidy" sú celkové sacharidy, "z toho cukry" je sugar. Tuky celkové, nie nasýtené.
- name a brand vyplň len ak sú na fotke čitateľné (názov produktu, značka).
- Ak na fotke nie je tabuľka výživových hodnôt, vráť {"ok":false,"note":"krátky dôvod po slovensky"}.
Vráť IBA JSON: {"ok":true,"basis":"100","unit":"g","serving_g":null,"kcal":null,"kj":null,"protein":null,"carbs":null,"sugar":null,"fat":null,"fiber":null,"salt":null,"name":"","brand":""}`;

// predplatné GainTrain Plus (v303): denný limit AI podľa plánu (app_config.billing). Kým je predplatné vypnuté, ai_take vždy povolí
// a len počíta. Keď databáza funkciu ešte nemá alebo zlyhá, AI ide ďalej (radšej povoliť ako zablokovať).
async function aiTake(db: any, uid: string, f: string): Promise<any> {
  try { const { data, error } = await db.rpc("ai_take", { p_uid: uid, p_feature: f }); return error || !data ? { ok: true } : data; } catch (_) { return { ok: true }; }
}
const aiRefund = (db: any, uid: string, f: string) => db.rpc("ai_refund", { p_uid: uid, p_feature: f }).then(() => {}, () => {});
const PAY_MSG: Record<string, string> = {
  free_limit: "Dnešné AI použitia zadarmo sú minuté. Zajtra sa obnovia, s GainTrain Plus ich máš bez limitu.",
  premium_only: "Táto funkcia je súčasťou GainTrain Plus.",
  cap: "Dnes si túto funkciu použil už veľakrát. Zajtra sa limit obnoví.",
};
const paywallBody = (q: any, f: string) => ({ error: PAY_MSG[q.reason] || PAY_MSG.cap, paywall: true, feature: f, reason: q.reason, limit: q.limit });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const t0 = Date.now();
  let uid = "";
  try { const pl = JSON.parse(atob((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); if (pl.role === "authenticated" && typeof pl.sub === "string") uid = pl.sub; } catch (_) { /* nič */ }
  if (!uid) return json({ error: "Prihlás sa znova." }, 401);
  let body: { image?: string; mime?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }
  const image = String(body.image || "");
  if (!image) return json({ error: "Chýba fotka." }, 400);
  if (image.length > 5_000_000) return json({ error: "Fotka je príliš veľká." }, 413);
  if (!KEY) return json({ error: "AI zatiaľ nie je zapnutá." }, 503);
  const admin = createClient(SUPABASE_URL, SERVICE);
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count: used } = await admin.from("ai_logs").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("kind", "label").gte("created_at", since);
  if ((used || 0) >= DAILY_LIMIT) return json({ error: "Dnešný limit čítania obalov je vyčerpaný. Hodnoty zadaj ručne alebo to skús zajtra." }, 429);
  const q = await aiTake(admin, uid, "label_scan"); // predplatné
  if (!q.ok) return json(paywallBody(q, "label_scan"), 402);

  const parts = [{ text: PROMPT }, { inline_data: { mime_type: body.mime || "image/jpeg", data: image } }];
  const callOne = async (m: string) => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0, responseMimeType: "application/json" } }),
    });
    const resp = await r.json().catch(() => null);
    if (r.ok) return resp;
    throw new Error(resp?.error?.message || "AI chyba " + r.status);
  };
  let j: any = null, lastErr = "";
  for (const m of MODELS) { if (Date.now() - t0 > 45000) break; try { j = await callOne(m); break; } catch (e: any) { lastErr = e?.message || lastErr; } }
  if (!j) { console.error("label-scan", clean(lastErr, 300)); await aiRefund(admin, uid, "label_scan"); return json({ error: /quota/i.test(lastErr) ? "Dnešná kapacita AI je vyčerpaná. Hodnoty zadaj ručne." : "AI je teraz vyťažená. Skús to o minútu." }, 502); }
  let ai: any = {};
  try { const out = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join(""); const a = out.indexOf("{"), b = out.lastIndexOf("}"); ai = JSON.parse(a >= 0 && b > a ? out.slice(a, b + 1) : "{}"); } catch (_) { ai = {}; }
  const log = (ok: boolean) => admin.from("ai_logs").insert({ user_id: uid, kind: "label", ok, ms: Date.now() - t0 }).then(() => { }, () => { });
  if (ai.ok === false) { log(false); return json({ ok: false, note: clean(ai.note, 160) || "Na fotke som nenašiel tabuľku výživových hodnôt. Odfoť ju zblízka a ostro." }); }

  // prepočet na 100 g
  let kcal = num(ai.kcal); const kj = num(ai.kj);
  if (kcal === null && kj !== null) kcal = kj / 4.184;
  const sg = num(ai.serving_g);
  const per = ai.basis === "serving" && sg && sg > 0 ? 100 / sg : 1;
  const sc = (v: unknown) => { const x = num(v); return x === null || x < 0 ? null : r1(x * per); };
  const out = { kcal: kcal === null ? null : Math.round(kcal * per), protein: sc(ai.protein), carbs: sc(ai.carbs), sugar: sc(ai.sugar), fat: sc(ai.fat), fiber: sc(ai.fiber), salt: sc(ai.salt) };
  const have = out.kcal !== null && out.protein !== null && out.carbs !== null && out.fat !== null;
  let warn = "";
  if (have) {
    const est = 4 * out.protein! + 4 * out.carbs! + 9 * out.fat!;
    if (out.kcal! > 900 || out.protein! + out.carbs! + out.fat! > 100.5) warn = "Čísla vyzerajú podozrivo. Skontroluj ich s obalom.";
    else if (Math.abs(out.kcal! - est) > Math.max(40, 0.3 * out.kcal!)) warn = "Kalórie celkom nesedia s makrami. Skontroluj ich s obalom.";
  } else warn = "Niektoré hodnoty sa nepodarilo prečítať. Doplň ich ručne.";
  log(have);
  return json({ ok: true, ...out, serving_g: sg && sg > 0 && sg <= 1000 ? Math.round(sg) : null, unit: ai.unit === "ml" ? "ml" : "g", name: clean(ai.name, 120), brand: clean(ai.brand, 80), warn, left: DAILY_LIMIT - (used || 0) - 1 });
});
