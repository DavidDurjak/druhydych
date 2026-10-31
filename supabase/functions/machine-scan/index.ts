// GainTrain: rozpoznanie stroja v posilňovni z fotky. AI len vyberie cvik z nášho katalógu (id) a poradí nastavenie.
// Čísla (série, opakovania, váhy) počíta appka z plánu a histórie používateľa, nie AI.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = [Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.5-flash-lite", Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
const TIMEOUT_MS = 20000;
const DAILY_LIMIT = 40;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const clean = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

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
  const auth = req.headers.get("Authorization") || "";
  let uid = "";
  try {
    const pl = JSON.parse(atob(auth.replace(/^Bearer\s+/i, "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (pl.role === "authenticated" && typeof pl.sub === "string") uid = pl.sub;
  } catch (_) { /* nič */ }
  if (!uid) return json({ error: "Prihlás sa znova." }, 401);

  let body: { image?: string; mime?: string; catalog?: { id: string; name: string }[] } = {};
  try { body = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }
  const image = String(body.image || "");
  if (!image) return json({ error: "Chýba fotka." }, 400);
  if (image.length > 4_000_000) return json({ error: "Fotka je príliš veľká." }, 413);
  const catalog = (Array.isArray(body.catalog) ? body.catalog : []).slice(0, 120)
    .map((c) => ({ id: clean(c?.id, 40), name: clean(c?.name, 80) })).filter((c) => c.id && c.name);
  if (!catalog.length) return json({ error: "Chýba katalóg cvikov." }, 400);
  if (!KEY) return json({ error: "AI zatiaľ nie je zapnutá (chýba kľúč na serveri)." }, 503);

  const admin = createClient(SUPABASE_URL, SERVICE);
  const since = new Date(Date.now() - 864e5).toISOString();
  const usedP = admin.from("ai_logs").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("kind", "machine").eq("ok", true).gte("created_at", since)
    .then((r: any) => r.count || 0, () => 0);
  const q = await aiTake(admin, uid, "machine_scan"); // predplatné
  if (!q.ok) return json(paywallBody(q, "machine_scan"), 402);

  const PROMPT = `Si tréner v posilňovni slovenskej aplikácie GainTrain. Na fotke je stroj, kladka, lavica alebo iné cvičebné náradie.
Katalóg cvikov (id: názov):
${catalog.map((c) => `${c.id}: ${c.name}`).join("\n")}

Úloha:
1. Ak na fotke nie je žiadne cvičebné náradie, vráť {"ok":false,"note":"krátky dôvod po slovensky"}.
2. Inak vyber z katalógu id cviku, ktorý sa na tomto stroji najčastejšie robí. Ak je náradie viacúčelové (napríklad kladka alebo lavica), vyber najpravdepodobnejší cvik a do "alts" daj najviac 2 ďalšie id z katalógu. Ak stroj v katalógu nie je, nechaj "id" prázdne a vyplň "name" (bežný slovenský názov cviku) a "cue" (jedna veta o správnej technike).
3. "setup": 1 až 2 krátke vety po slovensky, ako stroj nastaviť pre človeka (výška sedadla, opora chrbta, zarážka, kolík). Žiadne čísla váh.
4. "confidence" je 0 až 1, ako veľmi si istý, že si vybral správny cvik.
Vráť IBA JSON: {"ok":true,"id":"","alts":[],"name":"","setup":"","cue":"","confidence":0}`;

  const parts = [{ text: PROMPT }, { inline_data: { mime_type: body.mime || "image/jpeg", data: image } }];
  const callOne = async (m: string) => {
    let r: Response;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.1, responseMimeType: "application/json" } }),
      });
    } catch (_) { throw Object.assign(new Error("AI neodpovedala včas"), { status: 0 }); }
    const resp = await r.json().catch(() => null);
    if (r.ok) return resp;
    const msg = resp?.error?.message || "AI chyba " + r.status;
    console.error("machine-scan model", m, r.status, String(msg).slice(0, 140));
    throw Object.assign(new Error(msg), { status: r.status });
  };

  let j: any = null, lastErr = "";
  outer: for (const wait of [0, 1200, 2500]) {
    if (wait) { if (Date.now() - t0 > 30000) break; await new Promise((s) => setTimeout(s, wait)); }
    try { j = await Promise.any(MODELS.slice(0, 2).map(callOne)); break outer; }
    catch (agg: any) { for (const e of (agg?.errors || [])) lastErr = e?.message || lastErr; }
    for (const m of MODELS.slice(2)) {
      if (Date.now() - t0 > 40000) break outer;
      try { j = await callOne(m); break outer; } catch (e: any) { lastErr = e?.message || lastErr; }
    }
  }
  if (!j) {
    console.error("machine-scan zlyhanie:", clean(lastErr, 300));
    await aiRefund(admin, uid, "machine_scan");
    const quota = /quota/i.test(lastErr);
    return json({ error: quota ? "Dnešná kapacita AI je vyčerpaná. Skús to zajtra." : "AI je teraz vyťažená. Skús to o minútu." }, 502);
  }

  let ai: any = {};
  try {
    const out = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
    const a = out.indexOf("{"), b = out.lastIndexOf("}");
    ai = JSON.parse(a >= 0 && b > a ? out.slice(a, b + 1) : "{}");
  } catch (_) { ai = {}; }

  const used = await usedP;
  if (used >= DAILY_LIMIT) return json({ error: "Dnešný limit skenovania strojov je vyčerpaný. Skús to zajtra." }, 429);

  const ids = new Set(catalog.map((c) => c.id));
  const id = ids.has(String(ai.id)) ? String(ai.id) : "";
  const alts = (Array.isArray(ai.alts) ? ai.alts : []).map(String).filter((x: string) => ids.has(x) && x !== id).slice(0, 2);
  const ok = ai.ok !== false && (id || clean(ai.name, 80));
  admin.from("ai_logs").insert({ user_id: uid, kind: "machine", ok: !!ok, ms: Date.now() - t0 }).then(() => { }, () => { });
  if (!ok) return json({ ok: false, note: clean(ai.note, 160) || "Na fotke som nenašiel cvičebný stroj. Odfoť ho celý zo vzdialenosti 2 až 3 metre.", left: DAILY_LIMIT - used - 1 });
  const conf = Math.max(0, Math.min(1, Number(ai.confidence) || 0));
  return json({ ok: true, id, alts, name: clean(ai.name, 80), setup: clean(ai.setup, 300), cue: clean(ai.cue, 240), confidence: conf, left: DAILY_LIMIT - used - 1 });
});
