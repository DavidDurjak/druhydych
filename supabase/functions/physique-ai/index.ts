// Fuelwind: AI analýza postavy z fotiek (len pre dospelých). Fotky sa NEUKLADAJÚ, ukladá sa iba výsledok.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = [Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash", "gemini-flash-latest", Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.5-flash-lite"];
const DAILY_LIMIT = 6;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MUSCLES = ["shoulders", "reardelt", "chest", "lats", "backthick", "biceps", "triceps", "quads", "hams", "glutes", "calves", "core"];
const GROUPS = ["chest", "back", "shoulders", "arms", "quads", "posterior", "calves"];
const GROUP_OF: Record<string, string> = { shoulders: "shoulders", reardelt: "shoulders", chest: "chest", lats: "back", backthick: "back", biceps: "arms", triceps: "arms", quads: "quads", hams: "posterior", glutes: "posterior", calves: "calves" };
const POSES = ["front", "frontbi", "side", "back", "backbi", "abs"];
const POSE_TXT: Record<string, string> = { front: "spredu uvoľnene", frontbi: "spredu dvojitý biceps", side: "zboku", back: "zozadu uvoľnene", backbi: "zozadu dvojitý biceps", abs: "brucho a nohy" };
const LABEL: Record<string, string> = { shoulders: "predné a bočné ramená", reardelt: "zadné ramená", chest: "hrudník", lats: "šírka chrbta", backthick: "hrúbka chrbta a trapézy", biceps: "biceps", triceps: "triceps", quads: "predné stehná", hams: "zadné stehná", glutes: "zadok", calves: "lýtka", core: "brucho a stred tela" };
const LEVELS = ["začiatočník", "mierne pokročilý", "pokročilý", "elitný"];
const VS = ["zaostáva", "vyvážené", "vedie"];

const PROMPT = `Si skúsený kouč kulturistiky a fyziqu s praxou v posudzovaní postavy (štýl IFBB rozhodcu a zároveň osobného trénera) v slovenskej aplikácii Fuelwind. Dospelý používateľ poslal 1 až 6 fotiek postavy v pózach: spredu uvoľnene (front), spredu dvojitý biceps (frontbi), zboku (side), zozadu uvoľnene (back), zozadu dvojitý biceps (backbi), brucho a nohy (abs). Urob poctivé, presné hodnotenie každého svalu, ako by ho urobil kouč, ktorý podľa neho staví tréningový plán. Nechváľ zo slušnosti a nehaň zbytočne: skóre musí zodpovedať tomu, čo na fotke naozaj vidíš.

KROK 1, KVALITA. Fotka je použiteľná, len ak je na nej človek dostatočne osvetlený, ostrý, bez filtrov, s odhaleným vrchom tela (bez voľného oblečenia), a zachytáva potrebnú časť tela: pri pózach front, side a back celú postavu aspoň po kolená (na posúdenie lýtok po päty), pri frontbi, backbi a abs od hlavy aspoň po stehná. Ak ktorákoľvek fotka nie je použiteľná, v "issues" a v "photos" uveď presne prečo a čo opraviť (napr. "príliš tma", "rozmazané", "postava odrezaná pri kolenách", "voľné tričko skrýva siluetu", "silné protisvetlo"). Ak nie je použiteľná ani jedna, nastav usable na false a nič ďalšie nehodnoť. Ak na fotke nie je človek, alebo osoba vyzerá ako maloletá, nastav usable na false a uveď dôvod.

KROK 2, POZOROVANIE. Pred skórovaním si pre každú fotku v "observations" zapíš, čo konkrétne vidíš (šírka ramien oproti driekom, tvar a plnosť svalov, oddelenie, ľavá oproti pravej strane, držanie tela). Hodnoť len to, čo je na fotkách skutočne vidno. Zohľadni, že svetlo, pumpa, napnutie, opálenie a uhol kamery vzhľad ovplyvňujú; uvoľnená póza ukáže menej ako napnutá.

KROK 3, HODNOTENIE (len ak je usable true). Každý sval hodnoť z póz, na ktorých je najlepšie vidieť: ramená, hrudník a biceps zo spredu a z boku, šírka chrbta a zadné ramená zozadu, triceps zboku a zozadu, hrúbka chrbta a trapézy zozadu, nohy a brucho z pózy brucho a nohy, zadok a lýtka zozadu. Kritériá: objem a plnosť, tvar (napr. horná časť hrudníka, guľatosť ramien, šírka a tvar lats, tvar stehien), oddelenie a definícia, symetria ľavej a pravej strany, proporcia k zvyšku tela.
- "level": celková úroveň rozvoja svalovej hmoty jedným z: "začiatočník", "mierne pokročilý", "pokročilý", "elitný".
- "muscles": pre každú z partií shoulders (predné a bočné ramená), reardelt, chest, lats (šírka chrbta), backthick (hrúbka chrbta a trapézy), biceps, triceps, quads, hams, glutes, calves, core daj:
  * "score" 1 až 5 podľa ABSOLÚTNEHO rozvoja pre pohlavie používateľa: 1 = takmer žiadny viditeľný rozvoj, 2 = začiatočnícky rozvoj, 3 = solídny rozvoj trénovaného človeka (stredne pokročilý), 4 = pokročilý rozvoj výrazne nad priemerom posilňovne, 5 = elitná súťažná úroveň. Väčšina ľudí z bežnej posilňovne má 2 až 3. Štvorku a päťku dávaj len pri jasne viditeľnom výnimočnom rozvoji. Nekaľ nikoho, neprikrášľuj.
  * "vs": voči rozvoju zvyšku TOHTO človeka: "zaostáva", "vyvážené" alebo "vedie". Ak sú všetky partie na rovnakej úrovni, daj väčšine "vyvážené".
  * "note": jedna vecná veta po slovensky, čo konkrétne vidíš (nie všeobecná fráza).
  Ak partiu na žiadnej z fotiek nevidieť, daj score 0, vs "vyvážené" a note "nevidno".
- "strengths": 1 až 3 silné stránky.
- "priorities": 1 až 2 kľúče skupín (len z: chest, back, shoulders, arms, quads, posterior, calves), ktoré by priniesli najväčší vizuálny pokrok. back = chrbát, arms = biceps a triceps, posterior = zadok a zadné stehná. Vyber partie, ktoré najviac zaostávajú za zvyškom a zároveň najviac kazia celkový dojem (proporcie, X-tvar, rovnováha hore a dole), nie podľa módy.
- "priority_notes": objekt, kde pre každú vybranú prioritu je krátke (do 120 znakov) zdôvodnenie po slovensky.
- "proportions": 1 až 2 vety o celkových proporciách (pomer ramien k driekom, hore a dole, predná a zadná strana).
- "symmetry": jedna veta o symetrii ľavej a pravej strany, alebo prázdny reťazec, ak nič nápadné.
- "posture": jedna veta o držaní tela (ramená, panva, chrbtica), alebo prázdny reťazec.
- "conditioning": jedno z "nízka", "stredná", "vysoká" (viditeľná svalová definícia a suchosť kože). NIKDY neuvádzaj percento telesného tuku ani iné číslo, z fotky sa to spoľahlivo odhadnúť nedá.
- "advice": 3 až 5 konkrétnych odporúčaní pre tréning po slovensky, každé s partiou a krokom (napr. "zadné ramená: pridaj 6 sérií týždenne face pull alebo reverzných rozpätí"), nie všeobecné frázy.
- "retake": 0 až 3 krátke tipy, ako fotky urobiť nabudúce lepšie (svetlo, uhol, napnutie, vzdialenosť), ak tam bol nejaký problém. Ak nie, prázdne pole.
- "confidence": 0 až 1, ako spoľahlivo to z týchto fotiek vieš posúdiť (jedna póza = nízko, spredu aj zozadu aj zboku = stredne, štyri a viac póz s napnutím = vyššie).
- "caution": prázdny reťazec, alebo krátka vecná veta, ak osoba pôsobí podvyživene alebo zdravotne rizikovo. Vtedy nehodnoť nič ako "treba schudnúť" a odporuč porozprávať sa s lekárom.

Pravidlá: píš vecne a s rešpektom, bez ponižovania a bez komentárov o atraktivite. Nepodsúvaj chudnutie ani extrémne diéty. Netvrď istotu tam, kde ju fotka nedáva. Všetky texty po slovensky, krátke vety, bez pomlčiek ako oddeľovačov.

Vráť IBA JSON v tomto poradí kľúčov:
{"usable":true,"issues":[],"photos":[{"pose":"front","ok":true,"issue":""}],"observations":[{"pose":"front","text":""}],"level":"mierne pokročilý","summary":"","muscles":{"shoulders":{"score":3,"vs":"vyvážené","note":""}},"strengths":[],"priorities":[],"priority_notes":{},"proportions":"","symmetry":"","posture":"","conditioning":"stredná","advice":[],"retake":[],"confidence":0.7,"caution":""}`;

const clip = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const arr = (v: unknown, n: number, len: number) => (Array.isArray(v) ? v : []).map((x) => clip(x, len)).filter(Boolean).slice(0, n);

function parseAi(out: string): any | null {
  try { const a = out.indexOf("{"), b = out.lastIndexOf("}"); const j = JSON.parse(a >= 0 && b > a ? out.slice(a, b + 1) : "{}"); return j && typeof j === "object" && ("usable" in j) ? j : null; } catch (_) { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const auth = req.headers.get("Authorization") || "";
  let uid = "";
  try {
    const pl = JSON.parse(atob(auth.replace(/^Bearer\s+/i, "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (pl.role === "authenticated" && typeof pl.sub === "string") uid = pl.sub;
  } catch (_) { /* nič */ }
  if (!uid) return json({ error: "Prihlás sa znova." }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE);

  let body: { images?: { pose?: string; data?: string }[] } = {};
  try { body = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }
  const imgs = (Array.isArray(body.images) ? body.images : []).filter((i) => i && typeof i.data === "string" && i.data.length > 1000).slice(0, 6);
  if (!imgs.length) return json({ error: "Pridaj aspoň jednu fotku." }, 400);
  if (imgs.some((i) => (i.data as string).length > 3_000_000)) return json({ error: "Fotka je príliš veľká." }, 413);

  // len dospelí; popri tom kontext (výška, váha, pas, úroveň v pláne, cieľ) a denný limit
  const since = new Date(Date.now() - 864e5).toISOString();
  const [{ data: prof }, { count }, { data: wl }, { data: plan }] = await Promise.all([
    admin.from("profiles").select("birth_year,sex,height_cm,start_weight,goal").eq("id", uid).maybeSingle(),
    admin.from("physique_checks").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("created_at", since),
    admin.from("weight_logs").select("weight_kg,waist_cm,date").eq("user_id", uid).order("date", { ascending: false }).limit(1),
    admin.from("workout_plans").select("meta").eq("user_id", uid).eq("active", true).order("created_at", { ascending: false }).limit(1),
  ]);
  const by = Number(prof?.birth_year || 0);
  const age = by ? new Date().getFullYear() - by : 0;
  if (!by || age < 18) return json({ error: "Analýza postavy je dostupná len pre dospelých. Doplň rok narodenia v profile.", }, 403);
  if ((count || 0) >= DAILY_LIMIT) return json({ error: "Dnes si už urobil veľa analýz. Skús to zajtra." }, 429);
  if (!KEY) return json({ error: "AI zatiaľ nie je zapnutá (chýba kľúč na serveri)." }, 503);

  const wt = Number(wl?.[0]?.weight_kg) || Number(prof?.start_weight) || 0, waist = Number(wl?.[0]?.waist_cm) || 0, hcm = Number(prof?.height_cm) || 0;
  const LV: Record<string, string> = { beginner: "začiatočník", intermediate: "mierne pokročilý", advanced: "pokročilý", elite: "elitný" };
  const declared = LV[String((plan?.[0]?.meta as any)?.params?.level)] || "";
  const ctx = [`Pohlavie: ${prof?.sex === "f" ? "žena" : "muž"}`, `vek: ${age} rokov`, hcm ? `výška: ${Math.round(hcm)} cm` : "", wt ? `váha: ${Math.round(wt * 10) / 10} kg` : "", waist ? `pás: ${Math.round(waist)} cm` : "", declared ? `úroveň, ktorú si používateľ sám zvolil v pláne: ${declared} (neber ju ako fakt, posúď z fotiek)` : ""].filter(Boolean).join(", ");

  const poses = imgs.map((i) => POSES.includes(String(i.pose)) ? String(i.pose) : "front");
  const parts: unknown[] = [{ text: PROMPT }, { text: `${ctx}. Fotky v poradí: ${poses.join(", ")}.` }];
  imgs.forEach((i, k) => { parts.push({ text: `Fotka ${k + 1} (${poses[k]}, ${POSE_TXT[poses[k]]}):` }); parts.push({ inline_data: { mime_type: "image/jpeg", data: i.data } }); });

  const t0 = Date.now();
  let ai: any = null, lastErr = "", sawOutput = false;
  for (const m of MODELS) {
    if (Date.now() - t0 > 75000) break;
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(60000),
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) { lastErr = j?.error?.message || "AI chyba " + r.status; console.error("physique model", m, r.status, String(lastErr).slice(0, 140)); continue; }
      const out = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      if (out) sawOutput = true;
      ai = parseAi(out);
      if (ai) break;
      console.error("physique model", m, "nečitateľný JSON");
    } catch (e) { lastErr = String((e as Error).message); }
  }
  if (!ai) {
    if (sawOutput) return json({ error: "AI vrátila nečitateľnú odpoveď. Skús to znova." }, 502);
    const quota = /quota/i.test(lastErr);
    return json({ error: quota ? "Dnešná kapacita AI je vyčerpaná. Skús to neskôr." : "AI je teraz vyťažená. Skús to o minútu." }, 502);
  }

  const usable = ai.usable === true;
  const photos = (Array.isArray(ai.photos) ? ai.photos : []).slice(0, 6).map((p: any, k: number) => ({ pose: poses[k] || "front", ok: p?.ok !== false, issue: clip(p?.issue, 140) }));
  let result: Record<string, unknown>;
  if (!usable) {
    result = { usable: false, issues: arr(ai.issues, 5, 160), photos };
    await admin.from("physique_checks").insert({ user_id: uid, ok: false, poses, result });
    return json({ result });
  }
  const muscles: Record<string, { score: number; vs: string; note: string }> = {};
  for (const k of MUSCLES) {
    const s = Number(ai.muscles?.[k]?.score), sc = isFinite(s) ? Math.max(0, Math.min(5, Math.round(s))) : 0;
    const vs = VS.includes(String(ai.muscles?.[k]?.vs)) ? String(ai.muscles[k].vs) : "vyvážené";
    muscles[k] = { score: sc, vs: sc ? vs : "vyvážené", note: clip(ai.muscles?.[k]?.note, 200) };
  }
  let prio = [...new Set((Array.isArray(ai.priorities) ? ai.priorities : []).map(String).filter((k: string) => GROUPS.includes(k)))].slice(0, 2) as string[];
  if (!prio.length) {
    // model nevybral prioritu: odvodíme ju zo svalov, ktoré sám označil ako zaostávajúce
    const lag: Record<string, number> = {};
    for (const k of MUSCLES) { const g = GROUP_OF[k], m = muscles[k]; if (g && m.score && m.vs === "zaostáva") lag[g] = Math.min(lag[g] ?? 9, m.score); }
    prio = Object.keys(lag).sort((a, b) => lag[a] - lag[b]).slice(0, 2);
  }
  const pn: Record<string, string> = {};
  for (const g of prio) { const t = clip(ai.priority_notes?.[g], 140); if (t) pn[g] = t; }
  const cond = ["nízka", "stredná", "vysoká"].includes(String(ai.conditioning)) ? String(ai.conditioning) : "";
  const conf = Math.max(0, Math.min(1, Number(ai.confidence) || 0));
  // spoľahlivosť nikdy nad to, čo dovolia dodané pózy
  const cover = (poses.includes("front") ? 1 : 0) + (poses.includes("back") || poses.includes("backbi") ? 1 : 0) + (poses.includes("side") ? 1 : 0);
  const cap = poses.length === 1 ? 0.45 : cover >= 3 ? 1 : cover === 2 ? 0.8 : 0.6;
  result = {
    v: 2, usable: true, issues: arr(ai.issues, 5, 160), photos, summary: clip(ai.summary, 420), level: LEVELS.includes(String(ai.level)) ? String(ai.level) : "", muscles,
    strengths: arr(ai.strengths, 3, 160), priorities: prio, priority_notes: pn, proportions: clip(ai.proportions, 320), symmetry: clip(ai.symmetry, 240), posture: clip(ai.posture, 220),
    conditioning: cond, advice: arr(ai.advice, 5, 240), retake: arr(ai.retake, 3, 160), confidence: Math.min(conf, cap), caution: clip(ai.caution, 260), labels: LABEL,
  };
  const { data: row } = await admin.from("physique_checks").insert({ user_id: uid, ok: true, poses, result }).select("id,created_at").single();
  return json({ result, id: row?.id, created_at: row?.created_at });
});
