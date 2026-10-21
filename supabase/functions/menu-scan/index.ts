// Fuelwind: odfotené denné menu alebo jedálny lístok -> zoznam jedál s odhadom kalórií a makier.
// Poradie podľa toho, čo človeku dnes chýba, počíta appka (deterministicky), AI len prečíta lístok a odhadne hodnoty. Fotka sa NEUKLADÁ.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = [Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.5-flash-lite", Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
const MAX_B64 = 4_000_000;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const bursts = new Map<string, number[]>();
const LANGS: Record<string, string> = { sk: "Slovak", cs: "Czech", de: "German", hu: "Hungarian", pl: "Polish", en: "English", uk: "Ukrainian", es: "Spanish", fr: "French", it: "Italian", ro: "Romanian", hr: "Croatian", sl: "Slovenian", sr: "Serbian (Latin script)", bg: "Bulgarian", ru: "Russian", nl: "Dutch", pt: "Portuguese", sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish", tr: "Turkish", lt: "Lithuanian", lv: "Latvian", et: "Estonian", el: "Greek", ar: "Arabic", he: "Hebrew", fa: "Persian", hi: "Hindi", bn: "Bengali", ur: "Urdu", zh: "Simplified Chinese", ja: "Japanese", ko: "Korean", vi: "Vietnamese", id: "Indonesian", ms: "Malay", th: "Thai", tl: "Filipino", sw: "Swahili", ca: "Catalan", is: "Icelandic", bs: "Bosnian", mk: "Macedonian", sq: "Albanian" };

const PROMPT = (lang: string) => `You read a photo of a restaurant menu, a daily lunch menu board ("denné menu", "polední menu"), a canteen list or a delivery app screenshot, for a nutrition app.
Extract every dish that a person could order. For each dish estimate a typical served portion as it is usually served in Central European restaurants (soups about 300 ml, main course with side dish 350 to 550 g), and the nutrition for that whole portion. Be realistic, restaurants use plenty of oil, butter, cream and sauces: do not underestimate fat. If the menu lists grams (e.g. "150 g" meat), use them for the meat part and add the side dish.
Return ONLY JSON:
{"ok":true,"note":"","dishes":[{"name":"dish name exactly as on the menu, cleaned up (no allergen numbers)","kind":"soup|main|salad|dessert|drink|other","price":"price as written or null","grams":450,"kcal":650,"protein":35,"carbs":70,"fat":22,"desc":"max 8 words: what it is, main components"}]}
Rules: keep dish names in the original menu language. "desc" and "note" in ${lang}. Max 20 dishes, in menu order. Skip drinks unless the menu is only drinks. If the photo is not a menu or is unreadable, return {"ok":false,"note":"short reason in ${lang}","dishes":[]}. All numbers are integers.`;

const num = (v: unknown, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await user.auth.getUser();
  if (!u?.user) return json({ error: "Prihlás sa znova." }, 401);
  const now = Date.now();
  const hits = (bursts.get(u.user.id) || []).filter((t) => now - t < 3600_000);
  if (hits.filter((t) => now - t < 60000).length >= 4 || hits.length >= 30) return json({ error: "Príliš veľa skenov naraz. Skús o chvíľu." }, 429);
  bursts.set(u.user.id, [...hits, now]);
  let b: { image?: string; mime?: string; lang?: string } = {};
  try { b = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }
  const image = String(b.image || "");
  if (!image || image.length > MAX_B64) return json({ error: "Fotka chýba alebo je príliš veľká." }, 400);
  if (!KEY) return json({ error: "AI zatiaľ nie je zapnutá." }, 503);
  const lc = String(b.lang || "sk").toLowerCase().slice(0, 2);
  const lang = LANGS[lc] || "Slovak";
  let quota = 0;
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: image } }, { text: PROMPT(lang) }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 4096 } }),
      });
      const resp = await r.json().catch(() => null);
      if (!r.ok) {
        const msg = resp?.error?.message || "chyba " + r.status;
        console.error("menu-scan", m, r.status, String(msg).slice(0, 140));
        if (r.status === 429 || /quota/i.test(msg)) quota++;
        continue;
      }
      const out = (resp?.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("");
      const a = out.indexOf("{"), z = out.lastIndexOf("}");
      let j: any = null;
      try { j = JSON.parse(a >= 0 && z > a ? out.slice(a, z + 1) : "{}"); } catch { continue; }
      const dishes = (Array.isArray(j?.dishes) ? j.dishes : []).slice(0, 20).map((d: any) => ({
        name: String(d?.name || "").slice(0, 90).trim(), kind: ["soup", "main", "salad", "dessert", "drink", "other"].includes(d?.kind) ? d.kind : "other",
        price: d?.price ? String(d.price).slice(0, 20) : null, grams: num(d?.grams, 2000), kcal: num(d?.kcal, 4000), protein: num(d?.protein, 300), carbs: num(d?.carbs, 500), fat: num(d?.fat, 300),
        desc: String(d?.desc || "").slice(0, 80),
      })).filter((d: any) => d.name && d.kcal > 0);
      return json({ ok: dishes.length > 0, note: String(j?.note || "").slice(0, 160), dishes });
    } catch (_) { /* ďalší model */ }
  }
  return json({ error: quota >= MODELS.length ? "AI je dočasne preťažená. Skús to o chvíľu." : "Menu sa nepodarilo prečítať. Skús ostrejšiu fotku." }, 502);
});
