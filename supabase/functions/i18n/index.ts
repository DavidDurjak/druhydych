// GainTrain: automatický preklad textov appky zo slovenčiny do jazyka používateľa. Každý text sa prekladá len raz
// a uloží sa do tabuľky i18n, odkiaľ ho potom berú všetci. Nové funkcie sa tak preložia samé pri prvom zobrazení.
// Čísla prichádzajú ako {0}, {1}… a musia ostať na mieste.
// v11 (bezpečnosť): hotové preklady dostane každý (aj pred prihlásením), ale nové preklady cez AI spustí len
// prihlásený používateľ, cron appky (x-cron-secret) alebo server (služobný kľúč). Prepis starých prekladov (redo) len server.
// Poistky ostávajú: max 100 textov na volanie, denný strop na jazyk aj celkovo, len známe jazyky.
import { createClient } from "jsr:@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = [Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash", Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.5-flash-lite", "gemini-flash-latest"];
const MAX_N = 100, MAX_LEN = 600, DAILY_CAP = 15000, DAILY_CAP_ALL = 300000;
const LANGS = new Set(["cs", "de", "hu", "pl", "en", "uk", "es", "fr", "it", "ro", "hr", "sl", "sr", "bg", "ru", "nl", "pt", "sv", "da", "no", "fi", "tr", "lt", "lv", "et", "el",
  "ar", "he", "fa", "hi", "bn", "ur", "zh", "ja", "ko", "vi", "id", "ms", "th", "tl", "sw", "ca", "is", "bs", "mk", "sq",
  "zh-TW", "pt-BR", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "as", "ne", "si", "my", "km", "lo", "mn", "ka", "hy", "az", "kk", "uz", "ky", "tg", "tk", "be",
  "ps", "sd", "ku", "am", "ha", "yo", "ig", "zu", "xh", "af", "so", "rw", "mg", "jv", "su", "ceb", "eu", "gl", "cy", "ga", "mt", "lb"]);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const ph = (s: string) => (s.match(/\{\d+\}/g) || []).sort().join(",");
const TONE: Record<string, string> = { cs: "tykání", de: "du (informal)", hu: "tegezés", pl: "ty (informal)", en: "friendly, second person", uk: "ти", es: "tú", fr: "tu", it: "tu", ro: "tu", hr: "ti", sl: "ti", sr: "ti", bg: "ти", ru: "ты", nl: "je/jij", pt: "tu (European Portuguese, informal)", sv: "du", da: "du", no: "du", fi: "sinä", tr: "sen", lt: "tu", lv: "tu", et: "sina", el: "εσύ",
  ar: "friendly modern standard Arabic, second person", he: "informal second person", fa: "informal (تو)", hi: "तुम (friendly)", bn: "তুমি", ur: "تم (friendly)", zh: "你 (friendly)", ja: "friendly polite です/ます form", ko: "friendly polite 해요체", vi: "bạn", id: "kamu", ms: "awak/kamu (friendly)", th: "friendly polite", tl: "ikaw (friendly)", sw: "wewe (friendly)", ca: "tu", is: "þú", bs: "ti", mk: "ти", sq: "ti",
  "zh-TW": "你 (friendly, Traditional characters)", "pt-BR": "você (informal Brazilian)", be: "ты", kk: "сен", ky: "сен", tg: "ту", mn: "чи", uz: "sen", az: "sən", tk: "sen", ka: "შენ", hy: "դու" };
const NAMES: Record<string, string> = { zh: "Simplified Chinese (Mandarin)", "zh-TW": "Traditional Chinese (Taiwan, Hong Kong)", "pt-BR": "Brazilian Portuguese", pt: "European Portuguese", no: "Norwegian Bokmål", tl: "Filipino (Tagalog)", ms: "Malay", bs: "Bosnian", ar: "Modern Standard Arabic", ku: "Kurdish (Kurmanji, Latin script)", ceb: "Cebuano", or: "Odia", as: "Assamese" };
// pojmy, ktoré sa v appke opakujú a musia sa prekladať jednotne
const GLOSSARY = `Raňajky = breakfast; Desiata = morning snack (between breakfast and lunch); Obed = lunch; Olovrant = afternoon snack (between lunch and dinner); Večera = dinner; Druhá večera = second dinner / late snack; Snack = snack. Desiata and Olovrant MUST be two different terms.
Ťukni / ťuknutie = tap (on a touch screen). Bielkoviny = protein, Sacharidy = carbs, Tuky = fat, Vláknina = fiber. Séria = streak (days in a row) or set (in training, depends on context). Rezerva = reps in reserve (RIR). Kouč = coach (the AI coach). Tréner = a real human trainer. Check-in stays "check-in". Pitný režim = hydration / water intake. Zápis / zapísať = log.`;

let cronSecret: string | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let body: { lang?: string; strings?: unknown[]; redo?: boolean | string } = {};
  try { body = await req.json(); } catch { return json({ error: "bad" }, 400); }
  const raw = String(body.lang || "");
  const lang = ({ "zh-tw": "zh-TW", "pt-br": "pt-BR" } as Record<string, string>)[raw.toLowerCase()] || raw.toLowerCase();
  if (!LANGS.has(lang)) return json({ map: {} });
  const strings = [...new Set((Array.isArray(body.strings) ? body.strings : []).map((s) => String(s ?? "")).filter((s) => s.trim() && s.length <= MAX_LEN && /\p{L}/u.test(s)))].slice(0, MAX_N);
  if (!strings.length) return json({ map: {} });
  const admin = createClient(SUPABASE_URL, SERVICE);

  // kto volá: server (služobný kľúč), cron appky, prihlásený používateľ, alebo nik (len hotové preklady)
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const isServer = !!token && token === SERVICE;
  let isCron = false;
  const cs = req.headers.get("x-cron-secret");
  if (cs) {
    if (cronSecret === null) { const { data } = await admin.rpc("get_cron_secret"); cronSecret = data || ""; }
    isCron = !!cronSecret && cs === cronSecret;
  }
  let isUser = false;
  if (!isServer && !isCron && token) { const { data } = await admin.auth.getUser(token); isUser = !!data?.user; }
  const mayTranslate = isServer || isCron || isUser;
  const redo = isServer && (body.redo === true || body.redo === "1");

  const map: Record<string, string> = {};
  if (!redo) {
    const { data: have } = await admin.from("i18n").select("src,dst").eq("lang", lang).in("src", strings);
    for (const r of have || []) map[r.src] = r.dst;
  }
  const todo = strings.filter((s) => !(s in map));
  if (!todo.length || !KEY || !mayTranslate) return json({ map });
  if (!redo) {
    const since = new Date(Date.now() - 864e5).toISOString();
    const [{ count: cl }, { count: ca }] = await Promise.all([
      admin.from("i18n").select("src", { count: "exact", head: true }).eq("lang", lang).gte("created_at", since),
      admin.from("i18n").select("src", { count: "exact", head: true }).gte("created_at", since),
    ]);
    if ((cl || 0) >= DAILY_CAP || (ca || 0) >= DAILY_CAP_ALL) return json({ map, capped: true });
  }
  let langName = NAMES[lang] || lang; if (!NAMES[lang]) { try { langName = new Intl.DisplayNames(["en"], { type: "language" }).of(lang) || lang; } catch (_) { /* nič */ } }
  const prompt = `You are a professional app localizer. Translate the user interface of "GainTrain", a Slovak nutrition, calorie counting and fitness app (meals, macros, water, training plans, weight, AI coach, real trainers), from Slovak into ${langName} (${lang}).
Rules:
- Write fluent, grammatically perfect, natural ${langName} exactly as a top native ${langName} app would. Never leave Slovak words or Slovak grammar in the result (watch out for false friends between similar languages). Short, clear, friendly. Address the user informally (${TONE[lang] || "informal you"}).
- Use this glossary consistently: ${GLOSSARY}
- Keep placeholders like {0}, {1} exactly as they are, in a grammatically correct position. They stand for numbers.
- Keep emoji, symbols, arrows and punctuation. Keep the brand name GainTrain. Keep units (kcal, g, ml, l, kg, km, min) in the usual ${langName} form.
- Many items are fragments of one sentence shown next to a bold number (e.g. "z {0} l", "cieľ "); translate them so they still read well in that place.
- Food or product names: translate generic food words (e.g. "Kuracie prsia" -> chicken breast), but keep brand names unchanged.
- If an item is already not Slovak (a brand, a code, an English word used as is), return it unchanged.
- Return ONLY a JSON array of strings, same length and order as the input.
Input:
${JSON.stringify(todo)}`;
  let out: string[] | null = null, lastErr = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(50000),
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, responseMimeType: "application/json" } }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error?.message || "AI " + r.status);
      const txt = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      const a = txt.indexOf("["), b = txt.lastIndexOf("]");
      const arr = JSON.parse(a >= 0 && b > a ? txt.slice(a, b + 1) : "[]");
      if (Array.isArray(arr) && arr.length === todo.length) { out = arr.map((x) => String(x ?? "")); break; }
      lastErr = "zly pocet";
    } catch (e) { lastErr = String((e as Error).message).slice(0, 200); }
  }
  if (!out) { console.error("i18n", lang, lastErr); return json({ map, err: "ai" }); }
  const rows: { lang: string; src: string; dst: string; created_at?: string }[] = [];
  const now = new Date().toISOString();
  todo.forEach((s, i) => {
    let d = out![i];
    // zachovať medzery na okrajoch (texty sú často kusy vety vedľa tučného čísla)
    const lead = s.match(/^\s*/)![0], trail = s.match(/\s*$/)![0];
    d = lead + d.trim() + trail;
    if (d.trim() && d.length <= 1200 && ph(d) === ph(s)) { map[s] = d; rows.push({ lang, src: s, dst: d, created_at: now }); }
  });
  // pri redo sa starý preklad prepíše a dostane nový čas, aby si ho zariadenia pri synchronizácii stiahli znova
  if (rows.length) await admin.from("i18n").upsert(rows, { onConflict: "lang,src", ignoreDuplicates: !redo });
  return json({ map });
});
