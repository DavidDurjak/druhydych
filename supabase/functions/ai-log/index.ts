// GainTrain: AI logovanie jedla z textu alebo fotky.
// AI len rozpozná položky a odhadne gramy; výživové hodnoty berieme z našej databázy (search_foods).
// Ak sa jedlo v databáze nenájde, vrátime odhad AI označený ako odhad.
// v15: celý deň naraz. Ak človek povie čas dňa ("ráno vajíčka, na obed kuracie"), AI pri každej položke vráti "meal".
// v22: odstránený testovací vstup bez prihlásenia (?probe), AI volá len prihlásený používateľ.
// v16: jazyk používateľa (appka posiela lang). Názvy, porcie a poznámka sú v jeho jazyku, hľadacie slová vždy po slovensky (databáza je slovenská).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
// Modely 2.5 Google vyradil (404). Nové modely 3.x neprijímajú thinkingBudget 0, preto bez extra nastavení.
// Poradie: najrýchlejší lite model, jeho „latest“ alias, silnejší flash; kvóty a preťaženie majú modely oddelené.
const L35: [string, Record<string, unknown>] = [Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.5-flash-lite", {}];
const LLAT: [string, Record<string, unknown>] = ["gemini-flash-lite-latest", {}];
const F35: [string, Record<string, unknown>] = [Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash", {}];
const LATEST: [string, Record<string, unknown>] = ["gemini-flash-latest", {}];
const MODELS_TEXT = [L35, LLAT, F35, LATEST];
const MODELS_PHOTO = [L35, F35, LLAT, LATEST];
const TIMEOUT_MS = 20000;
const MAX_TEXT = 1600;
const MAX_ITEMS = 30;
const MEAL_KEYS = ["breakfast", "brunch", "lunch", "afternoon", "dinner", "late", "snack"];
const fold = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const DAILY_LIMIT = 60;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
// zápis, na ktorý používateľ neváča: dobehne na pozadí po odoslaní odpovede
const bg = (p: any) => { const pr = Promise.resolve(p).then(() => { }, () => { }); try { (globalThis as any).EdgeRuntime?.waitUntil?.(pr); } catch (_) { /* nič */ } };

// jazyk appky
const LANGS: Record<string, string> = { sk: "Slovak", cs: "Czech", de: "German", hu: "Hungarian", pl: "Polish", en: "English", uk: "Ukrainian", es: "Spanish", fr: "French", it: "Italian", ro: "Romanian", hr: "Croatian", sl: "Slovenian", sr: "Serbian (Latin script)", bg: "Bulgarian", ru: "Russian", nl: "Dutch", pt: "Portuguese", sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish", tr: "Turkish", lt: "Lithuanian", lv: "Latvian", et: "Estonian", el: "Greek",
  ar: "Arabic", he: "Hebrew", fa: "Persian", hi: "Hindi", bn: "Bengali", ur: "Urdu", zh: "Simplified Chinese", ja: "Japanese", ko: "Korean", vi: "Vietnamese", id: "Indonesian", ms: "Malay", th: "Thai", tl: "Filipino (Tagalog)", sw: "Swahili", ca: "Catalan", is: "Icelandic", bs: "Bosnian", mk: "Macedonian", sq: "Albanian" };
const langOf = (v: unknown) => { const c = String(v || "").toLowerCase().slice(0, 2); return c in LANGS ? c : "sk"; };
const langRule = (lang: string) => lang === "sk" ? "" : `JAZYK: používateľ používa appku v jazyku ${LANGS[lang]} a pravdepodobne píše v tomto jazyku. "name", "portion" a "note" napíš v jazyku ${LANGS[lang]}. "search" VŽDY po slovensky, lebo databáza potravín je slovenská: použi bežné slovenské slovo, ktoré by Slovák napísal do vyhľadávania v obchode, nie doslovný preklad (Brötchen alebo bread roll = "rožok", scrambled eggs alebo Rührei = "praženica", Hähnchenbrust gebraten = "kuracie prsia pečené", Quark = "tvaroh", cottage cheese = "cottage", oatmeal = "ovsená kaša", porridge oats = "ovsené vločky"). Ak si nie si istý slovenským slovom, použi všeobecnejšie (napr. "pečivo", "syr"). Pre "meal" platía rovnaké pravidlá aj pre výrazy v jeho jazyku (breakfast, Frühstück, reggeli = breakfast; lunch, Mittagessen = lunch; dinner, Abendessen = dinner). Ak používateľ množstvo neuviedol, použi bežnnú porciu pre dospelého.`;

const PROMPT = `Si výživový asistent slovenskej aplikácie GainTrain. Používateľ popísal alebo odfotil, čo zjedol (alebo čo plánuje zjesť).
Rozlož to na jednotlivé potraviny a pre každú odhadni hmotnosť v gramoch.
Pravidlá:
- Používateľ môže popísať aj viac jedál alebo celý deň naraz. Rozlož všetky položky, žiadnu nevynechaj.
- Ak používateľ uviedol množstvo (napr. "2 vajcia", "150 g ryže", "pol avokáda"), použi presne to.
- Ak množstvo neuviedol, použi bežnnú slovenskú porciu pre dospelého.
- Pri fotke odhadni porciu podľa taniera, príboru a veľkosti jedla. Buď realistický, skôr mierne viac ako menej (oleje a omáčky sa často podceňujú).
- Zložené jedlá z jedálne alebo reštaurácie (napr. "vyprážaný syr s hranolkami") rozdel na hlavné zložky, ak to dáva zmysel; jednoduché jedlá nechaj ako celok (napr. "bryndzové halušky").
- Ak ide o málo známe, regionálne alebo nezvyčajné jedlo, nevynechaj ho: odhadni ho podľa najpodobnejšieho jedla a daj nižšiu "confidence".
- Mäso, ryby, vajcia a prílohy (ryža, cestoviny, zemiaky, strukoviny, kuskus): ak používateľ výslovne nenapíše "surové" alebo "suché", ber to ako hotové jedlo tak, ako sa je (pečené, grilované, varené). Stav dopíš do "name" aj do "search" (napr. "kuracie prsia pečené", "ryža varená") a hodnoty na 100 g uveď pre hotový stav. Gramy sú hmotnosť hotového jedla na taniери.
- Názvy píš po slovensky, krátko a bežne (ako by ich človek hľadal v obchode).
- "search" je 1 až 3 kľúčové slová po slovensky bez značky, ktorými sa dá potravina nájsť v databáze (napr. "vajce", "ryža varená", "kuracie prsia").
- Hodnoty na 100 g odhadni podľa bežných tabuliek (ako záloha, ak potravina v databáze nebude).
- "portion" je ľudský popis množstva, napr. "2 ks", "1 tanier", "1 lžička", alebo prázdny reťazec.
- "meal" uveď LEN vtedy, keď používateľ v texte výslovne povedal jedlo alebo čas dňa. Povolené hodnoty: breakfast (raňajky, ráno), brunch (desiata, dopoludnia), lunch (obed, na obed), afternoon (olovrant, popoludňí), dinner (večera, večer), late (druhá večera, neskoro v noci), snack (snack, maškrta, medzi jedlami). Platí pre všetky položky, ktoré k tomu času patria, kým človek nepovie iný čas (napr. "ráno vajíčka a chlieb, na obed kuracie": vajcia aj chlieb sú breakfast, kuracie je lunch). Ak čas dňa nepovedal, daj prázdny reťazec. Pri fotke vždy prázdny reťazec.
- "confidence" je 0 až 1, ako veľmi si istý potravinou a gramami.
- Ak na fotke ani v texte nie je jedlo, vráť prázdny zoznam items a do "note" krátko napíš prečo.
Vráť IBA JSON v tvare:
{"items":[{"name":"","search":"","grams":0,"portion":"","meal":"","kcal100":0,"protein100":0,"carbs100":0,"fat100":0,"confidence":0}],"note":""}`;

// ---- rýchla cesta bez AI: vstup, kde je pri každej položke jasne uvedené množstvo v g/ml, napr. "150 g ryže, 200 g kuracie prsia" ----
const UNIT: Record<string, number> = { g: 1, gr: 1, dkg: 10, kg: 1000, ml: 1, dl: 100, l: 1000 };
// slová o čase dňa: také vstupy patria AI, lebo rýchla cesta by čas ticho zahodila
const TIME_WORDS = /rano|ranaj|desiat|dopoludn|obed|olovran|popoludn|poobed|vecer|noc|snack|makt|predpoludn/;
function parseSimple(text: string): { name: string; grams: number; count: number }[] | null {
  const parts = text.split(/\s*(?:,(?!\d)|;|\+|\n|\s+a\s+|\s+s\s+|\s+and\s+)\s*/i).map((x) => x.trim()).filter(Boolean);
  if (!parts.length || parts.length > 8) return null;
  const out: { name: string; grams: number; count: number }[] = [];
  for (const p of parts) {
    let m = p.match(/^(\d+(?:[.,]\d+)?)\s*(g|gr|dkg|kg|ml|dl|l)\.?\s+(?:(?:z|zo|of)\s+)?(.{2,50})$/i);
    let qty = "", unit = "", name = "";
    if (m) { qty = m[1]; unit = m[2]; name = m[3]; }
    else {
      m = p.match(/^(.{2,50}?)\s+(\d+(?:[.,]\d+)?)\s*(g|gr|dkg|kg|ml|dl|l)\.?$/i);
      if (m) { name = m[1]; qty = m[2]; unit = m[3]; }
      else {
        // počet kusov: "2 vajcia", "1 banán", "3 ks jablko"; gramy dopočítame z porcie v databáze
        const c = p.match(/^(\d{1,2})\s*(?:x|ks|kus|kusy|kusov)?\.?\s+(.{2,50})$/i);
        const cn = c ? c[2].replace(/^(z|zo)\s+/i, "").trim() : "";
        if (!c || Number(c[1]) < 1 || !cn || /\d/.test(cn)) return null;
        out.push({ name: cn, grams: 0, count: Number(c[1]) });
        continue;
      }
    }
    const grams = Number(qty.replace(",", ".")) * (UNIT[unit.toLowerCase()] || 0);
    name = name.replace(/^(z|zo)\s+/i, "").trim();
    if (!(grams > 0 && grams <= 3000) || !name || /\d/.test(name)) return null;
    out.push({ name, grams: Math.round(grams), count: 0 });
  }
  return out;
}

// zhoda prvého slova: "ryze" ~ "ryza", ale "chleba" !~ "ryzove"
function firstWord(x: string) { return fold(x).split(/[^a-z0-9]+/).filter(Boolean)[0] || ""; }
function agree(a: string, b: string) {
  // a = názov z databázy, b = to, čo napísal človek: po spoločnom začiatku môže mať názov max 1 znak navyše, človek max 3 (skloňovanie)
  const x = firstWord(a), y = firstWord(b); let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  return i >= 3 && x.length - i <= 1 && y.length - i <= 3;
}

function stemOf(search: string) {
  const key = fold(search).split(/[^a-z0-9]+/).find((w) => w.length >= 3) || "";
  return key.slice(0, Math.max(3, Math.min(5, key.length - 1)));
}

function num(v: unknown, lo = 0, hi = 5000) { const n = Number(v); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const t0 = Date.now();
  const auth = req.headers.get("Authorization") || "";
  // podpis a platnosť tokenu už overila brána (verify_jwt), tu len prečítame id používateľa, bez ďalšieho volania
  let uid = "";
  try {
    const pl = JSON.parse(atob(auth.replace(/^Bearer\s+/i, "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (pl.role === "authenticated" && typeof pl.sub === "string") uid = pl.sub;
  } catch (_) { /* nič */ }
  if (!uid) return json({ error: "Prihlás sa znova." }, 401);
  const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });

  const admin = createClient(SUPABASE_URL, SERVICE);
  let body: { text?: string; image?: string; mime?: string; lang?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }
  const text = String(body.text || "").slice(0, MAX_TEXT).trim();
  const image = body.image ? String(body.image) : "";
  const lang = langOf(body.lang);
  if (!text && !image) return json({ error: "Napíš, čo si jedol, alebo pridaj fotku." }, 400);
  if (image.length > 4_000_000) return json({ error: "Fotka je príliš veľká." }, 413);
  const kind = image ? "photo" : "text";

  // --- položky z databázy: spoločné pre AI, pamäť aj rýchlu cestu ---
  const matchItems = async (raw: any[], lim = 8) => Promise.all(raw.slice(0, MAX_ITEMS).map(async (it) => {
    const name = String(it.name || "").slice(0, 80) || "Jedlo";
    const search = String(it.search || it.name || "").slice(0, 60);
    const est = { kcal: num(it.kcal100, 0, 900), protein: num(it.protein100, 0, 100), carbs: num(it.carbs100, 0, 100), fat: num(it.fat100, 0, 100) };
    let matches: any[] = [];
    for (const q of [search, name]) {
      if (!q || matches.length) continue;
      const { data } = await user.rpc("search_foods", { q, lim });
      matches = (data || []).filter((f: any) => Number(f.kcal) > 0 || est.kcal < 15);
    }
    // hlavné slovo (prvé slovo hľadania) musí byť v názve, inak "uhorkový šalát" nájde "šalát ľadový"
    const stem = stemOf(search);
    const relevant = stem ? matches.filter((f: any) => fold(f.name).includes(stem)) : matches;
    // z relevantných uprednostníme položku najbližšiu odhadu (pečené vs surové, varená vs suchá ryža);
    // ak žiadna nesedí, predvolíme odhad AI a databázové ponúkneme len ako alternatívy
    let useEstimate = relevant.length === 0;
    // surové / suché položky len vtedy, keď ich používateľ chcel
    const wantRaw = /surov|such/.test(fold(search + " " + name + " " + text));
    const rawPen = (f: any) => (!wantRaw && /surov|such/.test(fold(f.name)) ? 1000 : 0);
    const dist = (f: any) => Math.abs(Number(f.kcal) - est.kcal) + rawPen(f);
    if (relevant.length && est.kcal > 0) {
      const close = relevant.filter((f: any) => Math.abs(Number(f.kcal) - est.kcal) <= Math.max(60, est.kcal * 0.45)).sort((a: any, b: any) => dist(a) - dist(b));
      if (!close.length) useEstimate = true;
      matches = [...close, ...relevant.filter((f: any) => !close.includes(f)), ...matches.filter((f: any) => !relevant.includes(f))];
    } else {
      // bez odhadu AI (rýchla cesta): surové a suché až nakoniec
      // a názov, ktorého prvé slovo je oveľa dlhšie ako to, čo človek napísal ("ryže" vs "Ryžové chlebíčky"), je zrejme iná potravina
      const w0 = fold(name).split(/[^a-z0-9]+/)[0] || "";
      const wordPen = (f: any) => Math.max(0, (fold(f.name).split(/[^a-z0-9]+/)[0] || "").length - w0.length - 1) * 100;
      const agPen = (f: any) => (agree(f.name, name) ? 0 : 500);
      const sorted = [...relevant].sort((a: any, b: any) => rawPen(a) + wordPen(a) + agPen(a) - rawPen(b) - wordPen(b) - agPen(b));
      matches = [...sorted, ...matches.filter((f: any) => !relevant.includes(f))];
    }
    const alt = matches.slice(0, 4).map((f: any) => ({ id: f.id, name: f.name, brand: f.brand, kcal: Number(f.kcal), protein: Number(f.protein), carbs: Number(f.carbs), fat: Number(f.fat), portions: f.portions || [], verified: !!f.verified }));
    const meal = MEAL_KEYS.includes(String(it.meal || "")) ? String(it.meal) : "";
    return { name, grams: Math.round(num(it.grams, 1, 3000)), portion: String(it.portion || "").slice(0, 40), meal, confidence: num(it.confidence, 0, 1), estimate: est, useEstimate, matches: alt };
  }));

  const log = (extra: Record<string, unknown>) => admin.from("ai_logs").insert({ user_id: uid, input: text || null, ms: Date.now() - t0, ...extra });
  const usedToday = async () => {
    const since = new Date(Date.now() - 864e5).toISOString();
    const { count } = await admin.from("ai_logs").select("id", { count: "exact", head: true }).eq("user_id", uid).in("kind", ["text", "photo"]).eq("ok", true).gte("created_at", since);
    return count || 0;
  };

  // 1) rýchla cesta bez AI: každá položka má v texte jasné množstvo a nájde sa v našej databáze
  if (!image && !TIME_WORDS.test(fold(text))) {
    const simple = parseSimple(text);
    if (simple) {
      const raw = [];
      for (const s of simple) {
        // slovenské skloňovanie ("ryže", "kuracieho"): skúsime aj skrátený tvar slova
        const words = s.name.split(/\s+/);
        const cut = words.map((w) => (w.length > 5 ? w.slice(0, w.length - 2) : w.length > 3 ? w.slice(0, w.length - 1) : w)).join(" ");
        raw.push({ name: s.name, search: cut, grams: s.grams || 1, confidence: 0.9 });
      }
      const [items, usedFast] = await Promise.all([matchItems(raw, 20), usedToday()]);
      let ok = items.length === simple.length && items.every((it, i) => !it.useEstimate && it.matches.length && agree(it.matches[0].name, simple[i].name));
      if (ok) {
        items.forEach((it, i) => {
          const m = it.matches[0], cnt = simple[i].count;
          if (cnt) {
            // počet kusov: gramy z prvej porcie ("1 ks", "1 krajec") v databáze
            const p = (m.portions || [])[0];
            if (!p || !/^1\s/.test(String(p.label)) || !(Number(p.g) > 0)) { ok = false; return; }
            it.grams = Math.round(cnt * Number(p.g));
            it.portion = `${cnt} ${String(p.label).replace(/^1\s+/, "")}`;
          }
          it.name = m.name; it.estimate = { kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat };
        });
      }
      // musí sa nájsť všetko a v databáze, inak ideme cez AI
      if (ok) {
        bg(log({ kind: "fast", items: items.length }));
        return json({ items, note: "", left: DAILY_LIMIT - usedFast, fast: true });
      }
    }
  }

  // 2) pamäť: rovnaký text už AI rozpoznávala (pre iný jazyk appky zvlášť, lebo názvy sú v jazyku používateľa)
  const cacheKey = !image ? (lang === "sk" ? "" : lang + "|") + fold(text).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim() : "";
  if (cacheKey) {
    const { data: hit } = await admin.from("ai_cache").select("result,hits").eq("key", cacheKey).maybeSingle();
    if (hit?.result?.items?.length) {
      bg(admin.from("ai_cache").update({ hits: (hit.hits || 0) + 1 }).eq("key", cacheKey));
      const [items, usedC] = await Promise.all([matchItems(hit.result.items), usedToday()]);
      bg(log({ kind: "cache", items: items.length }));
      return json({ items, note: String(hit.result.note || "").slice(0, 200), left: DAILY_LIMIT - usedC, cached: true });
    }
  }

  // 3) AI
  if (!KEY) return json({ error: "AI zatiaľ nie je zapnutá (chýba kľúč na serveri)." }, 503);
  // počet dnešných použití zisťujeme popri volaní AI, nie pred ním (šetrí ~0,2 s)
  const usedP = usedToday();

  const parts: unknown[] = [{ text: PROMPT }];
  if (lang !== "sk") parts.push({ text: langRule(lang) });
  if (text) parts.push({ text: "Používateľ napísal: " + text });
  if (image) parts.push({ inline_data: { mime_type: body.mime || "image/jpeg", data: image } });

  let ai: { items?: any[]; note?: string } = {};
  try {
    // jedno volanie modelu; pri chybe vyhodí Error so stavom (429 = kvóta)
    const callOne = async (m: string, extra: Record<string, unknown>) => {
      let r: Response;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS),
          body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.2, responseMimeType: "application/json", ...extra } }),
        });
      } catch (_) { throw Object.assign(new Error("AI neodpovedala včas"), { status: 0 }); }
      const resp = await r.json().catch(() => null);
      if (r.ok) return resp;
      const msg = resp?.error?.message || "AI chyba " + r.status;
      console.error("ai-log model", m, r.status, String(msg).slice(0, 140));
      throw Object.assign(new Error(msg), { status: r.status });
    };
    const isQuota = (e: any) => e?.status === 429 || /quota/i.test(String(e?.message || ""));
    let j: any = null, lastErr = "";
    // 3 kála s krátkou pauzou (bezplatná úroveň Googlu pri vyťažení často odmietne na pár sekúnd)
    outer: for (const wait of [0, 1200, 2500]) {
      if (wait) { if (Date.now() - t0 > 30000) break; await new Promise((s) => setTimeout(s, wait)); }
      const list = image ? MODELS_PHOTO : MODELS_TEXT;
      let quotaHits = 0;
      // vlna 1: dva najrýchlejšie modely naraz, berieme prvú úspšnú odpoveď (rýchlejšie a odolnejšie pri preťažení)
      try {
        j = await Promise.any(list.slice(0, 2).map(([m, extra]) => callOne(m, extra)));
        break outer;
      } catch (agg: any) {
        for (const e of (agg?.errors || [])) { lastErr = e?.message || lastErr; if (isQuota(e)) quotaHits++; }
      }
      // vlna 2: zvyšné modely postupne
      for (const [m, extra] of list.slice(2)) {
        if (Date.now() - t0 > 40000) break outer;
        try { j = await callOne(m, extra); break outer; } catch (e: any) { lastErr = e?.message || "AI neodpovedala včas"; if (isQuota(e)) quotaHits++; }
      }
      // kvóta vyčerpaná pri všetkých modeloch: ďalšie kála by ju len mísali
      if (quotaHits >= list.length) break outer;
    }
    if (!j) throw new Error(lastErr);
    const out = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
    const a = out.indexOf("{"), b = out.lastIndexOf("}");
    ai = JSON.parse(a >= 0 && b > a ? out.slice(a, b + 1) : "{}");
  } catch (e) {
    bg(log({ kind, ok: false }));
    console.error("ai-log zlyhanie:", String((e as Error).message).slice(0, 300));
    const quota = /quota/i.test(String((e as Error).message));
    return json({ error: quota ? "Dnešná kapacita AI je vyčerpaná. Jedlo zatiaľ vyhľadaj ručne, AI bude čoskoro znova fungovať." : "AI je teraz vyťažená. Skús to o minútu, alebo jedlo vyhľadaj ručne." }, 502);
  }

  const used = await usedP;
  if (used >= DAILY_LIMIT) return json({ error: "Dnešný limit AI logovania je vyčerpaný. Skús to zajtra alebo pridaj jedlo vyhľadávaním." }, 429);

  const rawItems = Array.isArray(ai.items) ? ai.items.slice(0, MAX_ITEMS) : [];
  // do pamäte ukladáme len rozpoznanie (nie hodnoty z databázy), nech sa pri zmene databázy použijú čerstvé
  if (cacheKey && rawItems.length) bg(admin.from("ai_cache").upsert({ key: cacheKey, result: { items: rawItems, note: String(ai.note || "") } }));
  const items = await matchItems(rawItems);

  bg(log({ kind, items: items.length }));
  return json({ items, note: String(ai.note || "").slice(0, 200), left: DAILY_LIMIT - used - 1 });
});
