// GainTrain: import receptu z odkazu. Stiahne stranu, nájde recept (schema.org JSON-LD alebo text strany) a AI z neho spraví zoznam surovín
// v gramoch s makrami na 100 g. Appka ho otvorí v editore receptu, kde si človek všetko skontroluje. Nič sa neukladá bez jeho potvrdenia.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = [Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.5-flash-lite", Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const bursts = new Map<string, number[]>();
const MAX_HTML = 1_500_000;

function privateIp(ip: string): boolean {
  if (ip.includes(":")) { const l = ip.toLowerCase(); return l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80") || l.startsWith("::ffff:") || l === "::"; }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((x) => !Number.isFinite(x))) return true;
  const [a, b] = p;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function safeUrl(raw: string): Promise<URL | null> {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".internal") || host === "localhost") return null;
  if (/^[\d.]+$/.test(host) || host.startsWith("[")) return null;
  try {
    const [a, aaaa] = await Promise.all([Deno.resolveDns(host, "A").catch(() => [] as string[]), Deno.resolveDns(host, "AAAA").catch(() => [] as string[])]);
    const all = [...a, ...aaaa];
    if (!all.length || all.some(privateIp)) return null;
  } catch { return null; }
  return u;
}
async function fetchPage(raw: string): Promise<string | null> {
  let cur = raw;
  for (let i = 0; i < 4; i++) {
    const u = await safeUrl(cur);
    if (!u) return null;
    const r = await fetch(u.href, { redirect: "manual", signal: AbortSignal.timeout(10000), headers: { "User-Agent": "Mozilla/5.0 (compatible; GainTrainRecipeImport/1.0)", "Accept": "text/html,application/xhtml+xml", "Accept-Language": "sk,cs,en;q=0.8" } });
    if (r.status >= 300 && r.status < 400) { const loc = r.headers.get("location"); if (!loc) return null; cur = new URL(loc, u).href; continue; }
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!/text\/html|xml|text\/plain/i.test(ct)) return null;
    const reader = r.body?.getReader(); if (!reader) return null;
    const chunks: Uint8Array[] = []; let total = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; total += value.length; if (total > MAX_HTML) { try { await reader.cancel(); } catch { /* nič */ } break; } chunks.push(value); }
    const buf = new Uint8Array(Math.min(total, MAX_HTML)); let o = 0; for (const c of chunks) { buf.set(c.subarray(0, Math.max(0, buf.length - o)), o); o += c.length; }
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }
  return null;
}

function findRecipe(node: any): any | null {
  if (!node) return null;
  if (Array.isArray(node)) { for (const n of node) { const r = findRecipe(n); if (r) return r; } return null; }
  if (typeof node !== "object") return null;
  const t = node["@type"];
  if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return node;
  if (node["@graph"]) return findRecipe(node["@graph"]);
  return null;
}
function jsonLdRecipe(html: string): any | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try { const r = findRecipe(JSON.parse(m[1].trim())); if (r) return r; } catch { /* ďalší blok */ }
  }
  return null;
}
const plain = (s: string) => s.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const num = (v: unknown, max: number) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };

const PROMPT = `You convert a web recipe into data for a nutrition app. Input is either schema.org Recipe JSON or the text of a recipe page.
Return ONLY JSON: {"ok":true,"name":"recipe title in original language","servings":4,"ingredients":[{"name":"ingredient in the recipe's language, short, no quantity","grams":250,"kcal":165,"protein":31,"carbs":0,"fat":3.6}]}
Rules: ingredient grams are the TOTAL amount in the whole recipe, converted from units (1 tbsp oil = 14 g, 1 tsp = 5 g, 1 cup flour = 125 g, 1 egg = 55 g, 1 clove garlic = 4 g, 1 medium onion = 110 g, 1 ml water = 1 g). "to taste" salt, pepper and water for boiling = skip. kcal, protein, carbs, fat are per 100 g of the RAW ingredient as it is weighed (typical values). "servings" is the number of portions the recipe makes (default 2 if unknown). Max 30 ingredients. If the input is not a recipe, return {"ok":false,"ingredients":[]}.`;

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
  const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await user.auth.getUser();
  if (!u?.user) return json({ error: "Prihlás sa znova." }, 401);
  const now = Date.now();
  const hits = (bursts.get(u.user.id) || []).filter((t) => now - t < 3600_000);
  if (hits.filter((t) => now - t < 60000).length >= 4 || hits.length >= 30) return json({ error: "Príliš veľa importov naraz. Skús o chvíľu." }, 429);
  bursts.set(u.user.id, [...hits, now]);
  let b: { url?: string } = {};
  try { b = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }
  const url = String(b.url || "").trim().slice(0, 600);
  if (!/^https?:\/\//i.test(url)) return json({ error: "Vlož celý odkaz, ktorý začína na https://" }, 400);
  if (!KEY) return json({ error: "AI zatiaľ nie je zapnutá." }, 503);
  let html: string | null = null;
  try { html = await fetchPage(url); } catch { html = null; }
  if (!html) return json({ error: "Stránku sa nepodarilo otvoriť. Skontroluj odkaz." }, 422);
  const svc = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const q = await aiTake(svc, u.user.id, "recipe_import"); // predplatné
  if (!q.ok) return json(paywallBody(q, "recipe_import"), 402);
  const ld = jsonLdRecipe(html);
  const input = ld
    ? JSON.stringify({ name: ld.name, recipeYield: ld.recipeYield, recipeIngredient: ld.recipeIngredient }).slice(0, 12000)
    : plain(html).slice(0, 14000);
  let quota = 0;
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT + "\n\nINPUT:\n" + input }] }], generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 4096 } }),
      });
      const resp = await r.json().catch(() => null);
      if (!r.ok) { const msg = resp?.error?.message || "chyba " + r.status; console.error("recipe-import", m, r.status, String(msg).slice(0, 140)); if (r.status === 429 || /quota/i.test(msg)) quota++; continue; }
      const out = (resp?.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("");
      const a = out.indexOf("{"), z = out.lastIndexOf("}");
      let j: any = null;
      try { j = JSON.parse(a >= 0 && z > a ? out.slice(a, z + 1) : "{}"); } catch { continue; }
      const ing = (Array.isArray(j?.ingredients) ? j.ingredients : []).slice(0, 30).map((i: any) => ({
        name: String(i?.name || "").slice(0, 80).trim(), grams: Math.round(num(i?.grams, 20000)),
        per100: { kcal: Math.round(num(i?.kcal, 900)), protein: Math.round(num(i?.protein, 100) * 10) / 10, carbs: Math.round(num(i?.carbs, 100) * 10) / 10, fat: Math.round(num(i?.fat, 100) * 10) / 10 },
      })).filter((i: any) => i.name && i.grams > 0);
      if (!j?.ok || !ing.length) return json({ ok: false, error: "Na tejto stránke sa nenašiel recept." });
      return json({ ok: true, name: String(j?.name || ld?.name || "Importovaný recept").slice(0, 100).trim(), servings: Math.min(24, Math.max(1, Math.round(num(j?.servings, 24)) || 2)), ingredients: ing, host: new URL(url).hostname });
    } catch (_) { /* ďalší model */ }
  }
  await aiRefund(svc, u.user.id, "recipe_import");
  return json({ error: quota >= MODELS.length ? "AI je dočasne preťažená. Skús to o chvíľu." : "Recept sa nepodarilo prečítať." }, 502);
});
