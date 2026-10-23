// GainTrain: Čo uvarím z chladničky.
// mode "detect": 1 až 3 fotky chladničky, mrazáka alebo špajze -> zoznam surovín s odhadom množstva a tipy, čo dokúpiť pre cieľ.
// mode "recipes": potvrdené suroviny + cieľ a zvyšok dňa -> recepty s gramážou a makrami po surovinách.
// Makrá receptu sa počítajú tu zo súčtu surovín (nie z odhadu AI pre celé jedlo) a kalórie sa kontrolujú cez 4/4/9.
// Poradie receptov podľa toho, čo človeku dnes zostáva, robí appka. Fotky sa NEUKLADAJÚ.
// AI: rozpoznávanie fotky Claude Sonnet (presnejší na obraz), recepty Claude Haiku; záloha Gemini.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const GKEY = Deno.env.get("GEMINI_API_KEY") || "";
const AKEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
// najprv rýchly Flash-Lite (suroviny ~2 s, 4 recepty ~6 s); Flash je pomalší a často preťažený, ostáva ako záloha
const GMODELS = [Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.5-flash-lite", "gemini-flash-lite-latest", Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash", "gemini-flash-latest"];
const AMODELS = [Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-5-5", "claude-haiku-4-5"];
// rozpoznávanie fotky: silnejší model, pri zlyhaní padá na Haiku
const DMODELS = [Deno.env.get("ANTHROPIC_DETECT_MODEL") || "claude-sonnet-5-5", ...AMODELS];
const MAX_B64 = 4_000_000;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const bursts = new Map<string, number[]>();
const LANGS: Record<string, string> = { sk: "Slovak", cs: "Czech", de: "German", hu: "Hungarian", pl: "Polish", en: "English", uk: "Ukrainian", es: "Spanish", fr: "French", it: "Italian", ro: "Romanian", hr: "Croatian", sl: "Slovenian", ru: "Russian", nl: "Dutch", pt: "Portuguese" };
const GOALS: Record<string, string> = { lose: "lose fat while keeping muscle (filling, high protein, lower calorie)", gain: "build muscle (enough calories, high protein)", maintain: "maintain weight and muscle (balanced, high protein)" };
const CATS = ["protein", "dairy", "veg", "fruit", "carb", "fat", "sauce", "drink", "snack", "other"];
const TAGS = ["high_protein", "quick", "low_cal", "vegetarian", "one_pan", "meal_prep", "no_cook"];

const num = (v: unknown, max: number, dec = 0) => { const n = Number(v); if (!Number.isFinite(n) || n < 0) return 0; const k = 10 ** dec; return Math.min(Math.round(n * k) / k, max); };
const str = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const DETECT = (lang: string, goal: string) => `You look at 1 to 3 photos of a fridge, freezer or pantry for a nutrition app. List every food item you can actually see.
Work in this order and do not skip any area: (1) every shelf from top to bottom, left to right, including the very top shelf where packs are piled up; (2) drawers; (3) the door shelves: list every bottle, jar and sauce separately (dressings, ketchup, mustard, soy and Asian sauces, pesto, jam, pickles). Fridges are crowded, so do not stop at the obvious items; small jars, tubs, bottles, packs of sliced meat or cheese, spreads and bakery items in bags all count.
Read the printed text on every package and copy the product name as printed (a brand-less generic name is enough, e.g. "ajvar", "pesto", "salad dressing", "butter", "cottage cheese", "cocoa drink"). Never rename a product into something else: if a carton says cocoa, it is cocoa, not a caramel drink. If you cannot read it, describe what it most likely is and set "conf":"low".
Estimate the quantity: use the weight or volume printed on the package when you can read it (e.g. butter 250 g); count items that can be counted (eggs, yogurt cups, bottles) and give the exact count you see; if eggs are in a tray, count the visible eggs.
Do not invent items that are not visible; if you are not sure what something is, still list it with "conf":"low".
The photos may show the same fridge from different angles: never count one item twice. Group duplicates into one item, but keep different products separate (two different yogurts are two items). Ignore non-food things.
Bowls, pots and boxes covered with cling film or a lid are leftovers or prepared meals: list EACH container separately; if the content is not clearly recognizable, name it "prepared meal (leftovers)" or the dish if you can tell what it is, with "conf":"low" and a rough "g". Never guess a specific dish you cannot see.
Raw meat, fish, vegetables, eggs and dairy matter most for cooking, so be careful and precise with those. Beer, wine and other alcohol are drinks (cat "drink", health "limit"), listed once with the bottle count.
The user's goal: ${goal}.
Return ONLY JSON:
{"ok":true,"note":"","items":[{"name":"short generic food name in ${lang}, e.g. chicken breast, eggs, Greek yogurt","qty":"human quantity in ${lang}, e.g. ~6 ks, ~300 g, 1 fľaša, pol hlávky","g":300,"cat":"protein|dairy|veg|fruit|carb|fat|sauce|drink|snack|other","emoji":"one emoji","health":"good|ok|limit","conf":"high|low"}],
"shop":[{"name":"food to buy, in ${lang}","why":"max 7 words in ${lang}, positive, why it helps the goal"}]}
Rules: "health":"limit" only for fried, ultra-processed, sugary or very fatty foods (sweets, chips, sausages, sugary drinks, fried leftovers). "g" is the estimated total edible grams (or ml) of that item, integer.
"shop": 3 to 5 healthy, cheap, common foods that are MISSING and would let the user cook better meals for the goal (e.g. a lean protein if none is visible, vegetables, a whole-grain side). Never shame the user.
If the photos show no food at all, return {"ok":false,"note":"short reason in ${lang}","items":[],"shop":[]}. Max 60 items.`;

type RIn = { items: { name: string; qty?: string; g?: number }[]; staples: string[]; useFirst: string[]; meal: string; minutes: number; servings: number; goal: string; kcal: number; protein: number; diet: string; exclude: string[]; wish: string };
const ANGLES = [
  "the quickest and simplest one, using ONLY the available food and staples",
  "the one with the most protein, using ONLY the available food and staples",
  "a really tasty, popular home-style dish; it may need at most 2 missing cheap common ingredients",
  "something different from a typical dish (another cuisine, a bowl, wrap, bake or salad); it may need at most 2 missing cheap common ingredients",
];
// rôznorodosť: 4 recepty vznikajú naraz a o sebe nevedia, preto každý dostane inú hlavnú surovinu (najprv bielkovinové)
const MAIN_RE = /kurac|kura\b|morc|maso|masa|hovad|brav|mlet|ryb|losos|tuniak|treska|krev|vajc|vajic|tvaroh|jogurt|skyr|syr|mozzarel|cottage|tofu|tempeh|sunk|slanin|cicer|sosovic|fazul|strukov/;
function mainsFor(items: { name: string }[]): string[] {
  const names = items.map((i) => i.name);
  const prot = names.filter((n) => MAIN_RE.test(fold(n)));
  const rest = names.filter((n) => !prot.includes(n));
  return [...prot, ...rest].slice(0, 6);
}
const RECIPES = (lang: string, r: RIn, angle = "", main = "") => `You are a sports nutritionist and a great home cook. Create ${angle ? `exactly 1 recipe for this person: ${angle}.${main ? ` Build it around: ${main}.` : ""} Base it` : "4 DIFFERENT recipes for this person,"} mainly on the food they have at home.
Available at home (with rough quantity): ${r.items.map((i) => i.name + (i.qty ? ` (${i.qty})` : "")).join(", ")}.
Pantry staples they always have (free to use): ${r.staples.join(", ") || "salt, pepper"}.
${r.useFirst.length ? `Use these first, they will spoil soon: ${r.useFirst.join(", ")}.` : ""}
Meal: ${r.meal}. Max cooking time: ${r.minutes} minutes. Servings: ${r.servings}.
Goal: ${r.goal}. Target per ONE serving: about ${r.kcal} kcal and at least ${r.protein} g protein.
${r.diet ? `Dietary restrictions, never break them: ${r.diet}.` : ""}
${r.wish ? `The user's wish: ${r.wish}.` : ""}
${r.exclude.length ? `Do not repeat these recipes: ${r.exclude.join(", ")}.` : ""}
Rules:
${angle ? "" : "- At least 2 recipes must use ONLY available food and staples. The others may need at most 2 missing ingredients, only cheap common ones.\n"}- Never use more of an ingredient than the person has.
- Per serving stay within about 15 % of the kcal target and reach the protein target when the ingredients allow it.
- Real, tasty food people actually cook. Concise steps (3 to 7), each max 20 words, with heat and times.
- "g" is grams (or ml) for ALL servings together, raw/uncooked weight. Give nutrition for exactly that amount from standard food tables. Count cooking oil.
Return ONLY JSON, all texts in ${lang}:
{"recipes":[{"name":"","emoji":"one emoji","minutes":20,"servings":${r.servings},"tags":["high_protein|quick|low_cal|vegetarian|one_pan|meal_prep|no_cook"],"desc":"max 10 words","ingredients":[{"name":"","g":150,"have":true,"kcal":165,"protein":31,"carbs":0,"fat":3.6}],"steps":[""],"tip":"one short tip how to make it even better for the goal"}]}`;

// ---------- AI ----------
// odpoveď AI na objekt: zvládne aj čisté pole (ľahší model ho niekedy vráti namiesto objektu) a text okolo JSON
const parse = (t: string | null): any => {
  if (!t) return null;
  const s = t.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const wrap = (v: any) => Array.isArray(v) ? (v[0]?.ingredients ? { recipes: v } : { items: v }) : v;
  try { return wrap(JSON.parse(s)); } catch { /* skúsime vyrezať */ }
  const a = s.indexOf("{"), z = s.lastIndexOf("}"), a2 = s.indexOf("["), z2 = s.lastIndexOf("]");
  if (a2 >= 0 && (a < 0 || a2 < a) && z2 > a2) { try { return wrap(JSON.parse(s.slice(a2, z2 + 1))); } catch { /* ďalej */ } }
  try { return a >= 0 && z > a ? wrap(JSON.parse(s.slice(a, z + 1))) : null; } catch { return null; }
};
async function claude(images: string[], prompt: string, maxTokens: number, valid: (j: any) => boolean, models: string[] = AMODELS): Promise<any> {
  if (!AKEY) return null;
  for (const m of models) {
    try {
      const body: any = { model: m, max_tokens: maxTokens, messages: [{ role: "user", content: [...images.map((d) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: d } })), { type: "text", text: prompt }] }] };
      // teplotu posielame len Haiku (novšie modely ju niekedy odmietnú)
      if (m.includes("haiku")) body.temperature = 0.4;
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: AbortSignal.timeout(55000),
        headers: { "x-api-key": AKEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) { console.error("fridge claude", m, r.status, String(j?.error?.message || "").slice(0, 140)); continue; }
      const out = parse((j?.content || []).map((p: any) => p.text || "").join(""));
      if (out && valid(out)) return { ...out, __model: m };
      console.error("fridge claude", m, "neplatná odpoveď");
    } catch (e) { console.error("fridge claude", m, String(e).slice(0, 100)); }
  }
  return null;
}
async function gemini(images: string[], prompt: string, maxTokens: number, valid: (j: any) => boolean): Promise<{ j: any; quota: boolean }> {
  let quota = 0;
  if (!GKEY) return { j: null, quota: false };
  const GM = [...GMODELS], retried = new Set<string>();
  for (let gi = 0; gi < GM.length; gi++) {
    const m = GM[gi];
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${GKEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ contents: [{ role: "user", parts: [...images.map((d) => ({ inlineData: { mimeType: "image/jpeg", data: d } })), { text: prompt }] }], generationConfig: { temperature: 0.4, responseMimeType: "application/json", maxOutputTokens: maxTokens } }),
      });
      const resp = await r.json().catch(() => null);
      if (!r.ok) {
        const msg = resp?.error?.message || "chyba " + r.status;
        console.error("fridge gemini", m, r.status, String(msg).slice(0, 140));
        // preťažený model: ešte jeden pokus o chvíľu
        if (r.status === 503 && !retried.has(m)) { retried.add(m); await new Promise((ok) => setTimeout(ok, 600)); GM.splice(gi + 1, 0, m); }
        if (r.status === 429 || /quota/i.test(msg)) quota++;
        continue;
      }
      const out = parse((resp?.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join(""));
      if (out && valid(out)) return { j: out, quota: false };
      console.error("fridge gemini", m, "neplatná odpoveď", resp?.candidates?.[0]?.finishReason || "", JSON.stringify(out || "").slice(0, 160));
    } catch (e) { console.error("fridge gemini", m, String(e).slice(0, 100)); }
  }
  return { j: null, quota: quota >= GM.length };
}
async function ask(images: string[], prompt: string, maxTokens: number, valid: (j: any) => boolean, models: string[] = AMODELS) {
  const c = await claude(images, prompt, maxTokens, valid, models);
  if (c) return { j: c, via: "claude:" + (c.__model || ""), quota: false };
  const g = await gemini(images, prompt, maxTokens, valid);
  if (g.j) return { j: g.j, via: "gemini", quota: false };
  return { j: null, via: "", quota: g.quota };
}

const sha = async (t: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, "0")).join("");

// ---------- čistenie výsledkov ----------
function cleanItems(j: any) {
  const seen = new Set<string>();
  const items = (Array.isArray(j?.items) ? j.items : []).map((i: any) => ({
    name: str(i?.name, 40), qty: str(i?.qty, 24), g: num(i?.g, 5000), cat: CATS.includes(i?.cat) ? i.cat : "other",
    emoji: str(i?.emoji, 4), health: ["good", "ok", "limit"].includes(i?.health) ? i.health : "ok", conf: i?.conf === "low" ? "low" : "high",
  })).filter((i: any) => { const k = i.name.toLowerCase(); if (!i.name || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 60);
  const shop = (Array.isArray(j?.shop) ? j.shop : []).map((s: any) => ({ name: str(s?.name, 40), why: str(s?.why, 60) })).filter((s: any) => s.name).slice(0, 5);
  return { items, shop };
}
// "máš doma" overíme sami: AI niekedy označí ako dostupnú aj surovinu, ktorá v chladničke nie je
const fold = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const stems = (t: string) => fold(t).split(/[^a-z]+/).filter((w) => w.length >= 3).map((w) => w.slice(0, 4));
const FREE = /^(voda|sol|soli|korenie|cierne korenie|bylinky|koreniny|ladov|kocky ladu)/;
function haveCheck(name: string, avail: string[][]): boolean {
  const n = fold(name).trim();
  if (FREE.test(n)) return true;
  const st = stems(name);
  return avail.some((a) => a.some((x) => st.some((y) => x.startsWith(y) || y.startsWith(x))));
}
function cleanRecipes(j: any, servings: number, target = 0, available: string[] = []) {
  const avail = available.map(stems).filter((a) => a.length);
  return (Array.isArray(j?.recipes) ? j.recipes : []).slice(0, 5).map((r: any) => {
    const sv = Math.max(1, Math.min(8, Math.round(Number(r?.servings) || servings)));
    const ingredients = (Array.isArray(r?.ingredients) ? r.ingredients : []).slice(0, 18).map((x: any) => {
      const p = num(x?.protein, 400, 1), c = num(x?.carbs, 800, 1), f = num(x?.fat, 400, 1);
      let k = num(x?.kcal, 6000);
      const calc = p * 4 + c * 4 + f * 9;
      // kalórie, ktoré nesedia s makrami, sa prepočítajú z makier
      if (calc > 0 && Math.abs(k - calc) > Math.max(25, calc * 0.25)) k = Math.round(calc);
      const name = str(x?.name, 40);
      return { name, g: num(x?.g, 3000), have: avail.length ? haveCheck(name, avail) : x?.have !== false, kcal: k, protein: p, carbs: c, fat: f };
    }).filter((x: any) => x.name && x.g > 0);
    // porcia presne na cieľ: AI sa v kalóriách mýli o 20 až 30 %, preto gramáž všetkých surovín pomerne upravíme (najviac o 30 %)
    const raw = ingredients.reduce((a: number, x: any) => a + x.kcal, 0) / sv;
    const f = target && raw > 0 && Math.abs(raw - target) / target > 0.06 ? Math.max(0.7, Math.min(1.3, target / raw)) : 1;
    if (f !== 1) ingredients.forEach((x: any) => {
      x.g = Math.max(1, x.g * f >= 20 ? Math.round(x.g * f / 5) * 5 : Math.round(x.g * f));
      x.kcal = Math.round(x.kcal * f); x.protein = Math.round(x.protein * f * 10) / 10; x.carbs = Math.round(x.carbs * f * 10) / 10; x.fat = Math.round(x.fat * f * 10) / 10;
    });
    const tot = ingredients.reduce((a: any, x: any) => ({ kcal: a.kcal + x.kcal, protein: a.protein + x.protein, carbs: a.carbs + x.carbs, fat: a.fat + x.fat, g: a.g + x.g }), { kcal: 0, protein: 0, carbs: 0, fat: 0, g: 0 });
    const per = { kcal: Math.round(tot.kcal / sv), protein: Math.round(tot.protein / sv), carbs: Math.round(tot.carbs / sv), fat: Math.round(tot.fat / sv), g: Math.round(tot.g / sv) };
    return {
      name: str(r?.name, 70), emoji: str(r?.emoji, 4) || "🍽️", minutes: Math.max(1, Math.min(240, Math.round(Number(r?.minutes) || 20))), servings: sv,
      tags: (Array.isArray(r?.tags) ? r.tags : []).filter((t: string) => TAGS.includes(t)).slice(0, 3), desc: str(r?.desc, 90),
      ingredients, steps: (Array.isArray(r?.steps) ? r.steps : []).map((s: any) => str(s, 200)).filter(Boolean).slice(0, 9), tip: str(r?.tip, 160),
      per, scaled: f !== 1, missing: ingredients.filter((x: any) => !x.have).map((x: any) => x.name),
    };
  }).filter((r: any) => r.name && r.ingredients.length >= 2 && r.per.kcal > 0 && r.steps.length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // servisný test bez prihlásenia (fotka chladničky z Wikimedia): len so servisným kľúčom, v kóde je iba jeho odtlačok (SHA-256)
  const tb: any = await req.clone().json().catch(() => ({}));
  if (typeof tb?.selftest === "string" && tb.selftest.length === 32 && await sha(tb.selftest) === "b81cf5c822263d4606f6f0a312f8afc82817bebd8f2a29340cf7865d64ab22fd") {
    if (Array.isArray(tb.items)) {
      const t0 = Date.now();
      const rin: RIn = { items: tb.items.map((x: any) => ({ name: str(x, 40) })), staples: ["soľ", "korenie", "olej"], useFirst: [], meal: String(tb.meal || "dinner"), minutes: 30, servings: 1, goal: GOALS[tb.goal] || GOALS.lose, kcal: Number(tb.kcal) || 600, protein: 40, diet: str(tb.diet, 200), exclude: [], wish: "" };
      const ok = (j: any) => Array.isArray(j?.recipes) && j.recipes.length > 0;
      const mains = mainsFor(rin.items);
      const runs = await Promise.all(ANGLES.map(async (a, i) => { const t = Date.now(); const x = await ask([], RECIPES("Slovak", rin, a, mains.length ? mains[i % mains.length] : ""), 4096, ok); return { ...x, ms: Date.now() - t }; }));
      const avail = [...tb.items.map(String), "soľ", "korenie", "olej"];
      return json({ ms: Date.now() - t0, each: runs.map((x) => x.ms), via: runs.map((x) => x.via), recipes: runs.flatMap((x) => x.j ? cleanRecipes(x.j, 1, rin.kcal, avail).slice(0, 1) : []) });
    }
    const api = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(String(tb.q || "open refrigerator food"))}&prop=imageinfo&iiprop=url&iiurlwidth=1100&format=json`, { headers: { "User-Agent": "GainTrainTest/1.0" } }).then((r) => r.json()).catch(() => null);
    const urls = (Object.values(api?.query?.pages || {}) as any[]).map((p) => p?.imageinfo?.[0]?.thumburl).filter((x: string) => x && /\.(jpe?g|png)/i.test(x));
    const buf = new Uint8Array(await (await fetch(urls[Number(tb.i || 0)], { headers: { "User-Agent": "GainTrainTest/1.0" } })).arrayBuffer());
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const t0 = Date.now();
    const d = await ask([btoa(bin)], DETECT("Slovak", GOALS[tb.goal] || GOALS.lose), 6144, (j) => Array.isArray(j?.items) || j?.ok === false, DMODELS);
    const det = d.j ? cleanItems(d.j) : null; const t1 = Date.now();
    let rec: any = null;
    if (det?.items?.length) {
      const rr = await ask([], RECIPES("Slovak", { items: det.items.map((i: any) => ({ name: i.name, qty: i.qty })), staples: ["soľ", "korenie", "olej", "cesnak", "cibuľa", "ryža", "cestoviny"], useFirst: [], meal: "dinner", minutes: 30, servings: 1, goal: GOALS[tb.goal] || GOALS.lose, kcal: 600, protein: 40, diet: "", exclude: [], wish: "" }), 16384, (j) => Array.isArray(j?.recipes) && j.recipes.length > 0);
      rec = rr.j ? { via: rr.via, recipes: cleanRecipes(rr.j, 1, 600).map((r: any) => ({ n: r.name, per: r.per, scaled: r.scaled, miss: r.missing })) } : { err: true, quota: rr.quota };
    }
    return json({ n: det?.items?.length, names: det?.items?.map((i: any) => i.name), detectVia: d.via, ms: [t1 - t0, Date.now() - t1], rec });
  }
  const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await user.auth.getUser();
  if (!u?.user) return json({ error: "Prihlás sa znova." }, 401);
  const now = Date.now();
  const hits = (bursts.get(u.user.id) || []).filter((t) => now - t < 3600_000);
  if (hits.filter((t) => now - t < 60000).length >= 6 || hits.length >= 40) return json({ error: "Príliš veľa pokusov naraz. Skús o chvíľu." }, 429);
  bursts.set(u.user.id, [...hits, now]);
  let b: any = {};
  try { b = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }
  if (!GKEY && !AKEY) return json({ error: "AI zatiaľ nie je zapnutá." }, 503);
  const lang = LANGS[String(b.lang || "sk").toLowerCase().slice(0, 2)] || "Slovak";
  const goal = GOALS[b.goal] || GOALS.maintain;

  if (b.mode === "detect") {
    const images = (Array.isArray(b.images) ? b.images : []).map(String).filter((x: string) => x && x.length <= MAX_B64).slice(0, 3);
    if (!images.length) return json({ error: "Fotka chýba alebo je príliš veľká." }, 400);
    const res = await ask(images, DETECT(lang, goal), 6144, (j) => Array.isArray(j?.items) || j?.ok === false, DMODELS);
    if (!res.j) return json({ error: res.quota ? "AI je dočasne preťažená. Skús to o chvíľu." : "Fotku sa nepodarilo prečítať. Skús ju odfotiť znova, s otvorenými dverami a zapnutým svetlom." }, 502);
    const { items, shop } = cleanItems(res.j);
    console.log("fridge detect", res.via, items.length);
    return json({ ok: items.length > 0, note: str(res.j?.note, 160), items, shop, via: res.via });
  }

  if (b.mode === "recipes") {
    const list = (a: unknown, n: number, m = 40) => (Array.isArray(a) ? a : []).map((x) => str(x, m)).filter(Boolean).slice(0, n);
    const items = (Array.isArray(b.items) ? b.items : []).map((i: any) => ({ name: str(i?.name ?? i, 40), qty: str(i?.qty, 24) })).filter((i: any) => i.name).slice(0, 50);
    if (items.length < 1) return json({ error: "Pridaj aspoň jednu surovinu." }, 400);
    const servings = Math.max(1, Math.min(6, Math.round(Number(b.servings) || 1)));
    const r: RIn = {
      items, staples: list(b.staples, 20), useFirst: list(b.useFirst, 10), meal: str(b.meal || "lunch", 20), minutes: Math.max(5, Math.min(120, Math.round(Number(b.minutes) || 30))),
      servings, goal, kcal: Math.max(150, Math.min(1500, Math.round(Number(b.kcal) || 600))), protein: Math.max(5, Math.min(90, Math.round(Number(b.protein) || 35))),
      diet: str(b.diet, 200), exclude: list(b.exclude, 12, 70), wish: str(b.wish, 120),
    };
    // rýchlosť: 4 recepty naraz, každý zvlášť a s iným zameraním (čaká sa len na najpomalší jeden recept, nie na všetky štyri za sebou)
    const ok = (j: any) => Array.isArray(j?.recipes) && j.recipes.length > 0;
    const avail = [...items.map((i: any) => i.name), ...r.staples];
    const seen = new Set<string>();
    const uniq = (x: any) => { const k = fold(x.name); if (seen.has(k)) return false; seen.add(k); return true; };
    const mains = mainsFor(items);
    const runs = await Promise.all(ANGLES.map((a, i) => ask([], RECIPES(lang, r, a, mains.length ? mains[i % mains.length] : ""), 4096, ok)));
    let recipes = runs.flatMap((x) => x.j ? cleanRecipes(x.j, servings, r.kcal, avail).slice(0, 1) : []).filter(uniq);
    // keď väčšina paralelných pokusov zlyhá (napr. preťaženie), doplní sa jedným spoločným
    if (recipes.length < 2) {
      const res = await ask([], RECIPES(lang, r), 16384, ok);
      if (res.j) recipes = [...recipes, ...cleanRecipes(res.j, servings, r.kcal, avail).filter(uniq)];
      else if (!recipes.length) return json({ error: res.quota || runs.some((x) => x.quota) ? "AI je dočasne preťažená. Skús to o chvíľu." : "Recepty sa nepodarilo vymyslieť. Skús to znova." }, 502);
    }
    if (!recipes.length) return json({ error: "Recepty sa nepodarilo vymyslieť. Skús to znova." }, 502);
    return json({ ok: true, recipes: recipes.slice(0, 4), via: runs.find((x) => x.via)?.via || "" });
  }
  return json({ error: "Neznámy režim." }, 400);
});
