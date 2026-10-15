// Fuelwind: novinky zo sveta fitness a vyzivy.
// Raz za pol dna: vezme najnovsie studie z PubMedu (a par RSS), AI z nich spravi kratke slovenske zhrnutie
// vlastnymi slovami a ulozi ich ako "pending". Do appky sa dostanu az po schvaleni adminom.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = [Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"];
const MIN_GAP_MS = 5 * 3600 * 1000; // najviac jeden beh za 5 hodin, nech sa funkcia neda zneuzit
const MAX_NEW = 8;

type Cand = { url: string; source: string; title: string; text: string; type: string };
const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const OK_PT = '(randomized controlled trial[pt] OR meta-analysis[pt] OR systematic review[pt]) AND humans[mh]';
const QUERIES = [
  `("resistance training"[Title] OR "strength training"[Title] OR hypertrophy[Title] OR "muscle strength"[Title]) AND ${OK_PT}`,
  `(protein[Title] OR creatine[Title] OR "energy intake"[Title] OR "dietary"[Title] OR "body composition"[Title]) AND exercise AND ${OK_PT}`,
  `((sleep[Title] OR recovery[Title] OR "muscle soreness"[Title] OR stretching[Title]) AND (exercise[Title] OR athletes[Title] OR training[Title])) AND ${OK_PT}`,
];
const RSS = [
  { url: "https://www.sciencedaily.com/rss/health_medicine/fitness.xml", name: "ScienceDaily" },
  { url: "https://www.sciencedaily.com/rss/health_medicine/nutrition.xml", name: "ScienceDaily" },
];

async function pubmed(): Promise<Cand[]> {
  const ids: string[] = [];
  // NCBI povoluje ~3 poziadavky za sekundu, preto po jednej s malou pauzou
  const lists: string[][] = [];
  for (const term of QUERIES) {
    try {
      const u = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=4&sort=date&reldate=30&datetype=edat&term=${encodeURIComponent(term)}`;
      const j = await (await fetch(u, { signal: AbortSignal.timeout(10000) })).json();
      lists.push((j?.esearchresult?.idlist || []) as string[]);
    } catch (e) { console.error("esearch", String(e).slice(0, 120)); }
    await new Promise((r) => setTimeout(r, 450));
  }
  for (const l of lists) for (const id of l) if (!ids.includes(id)) ids.push(id);
  if (!ids.length) return [];
  const out: Cand[] = [];
  try {
    const xml = await (await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(",")}`, { signal: AbortSignal.timeout(15000) })).text();
    for (const art of xml.split("<PubmedArticle>").slice(1)) {
      const pmid = (art.match(/<PMID[^>]*>(\d+)<\/PMID>/) || [])[1];
      const title = strip((art.match(/<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/) || [])[1] || "");
      const abs = [...art.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => strip(m[1])).join(" ");
      const journal = strip((art.match(/<Title>([\s\S]*?)<\/Title>/) || [])[1] || "PubMed");
      const meta = /<PublicationType[^>]*>(Meta-Analysis|Systematic Review)</.test(art);
      if (!pmid || !title || abs.length < 200) continue;
      out.push({ url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, source: journal, title, text: abs.slice(0, 1100), type: meta ? "review" : "human" });
    }
  } catch (e) { console.error("efetch", String(e).slice(0, 120)); }
  return out;
}

async function rss(): Promise<Cand[]> {
  const parts = await Promise.all(RSS.map(async (f) => {
    const out: Cand[] = [];
    try {
      const xml = await (await fetch(f.url, { signal: AbortSignal.timeout(10000) })).text();
      for (const it of xml.split("<item>").slice(1, 4)) {
        const title = strip((it.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
        const link = strip((it.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "");
        const desc = strip((it.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || "");
        if (title && /^https:\/\//.test(link) && desc.length > 80) out.push({ url: link, source: f.name, title, text: desc.slice(0, 800), type: "opinion" });
      }
    } catch (e) { console.error("rss", f.url, String(e).slice(0, 100)); }
    return out;
  }));
  return parts.flat();
}

const PROMPT = `Si redaktor slovenskej fitness a výživovej appky Fuelwind. Cieľovka sú mladí ľudia a začiatočníci v posilňovni.
Dostaneš zoznam článkov (číslo, názov, text alebo abstrakt). Pre každý rozhodni, či je vhodný, a ak áno, napíš ho po slovensky VLASTNÝMI SLOVAMI (nikdy nekopíruj vety zo zdroja).
Pravidlá:
- Píš správnou spisovnou slovenčinou s diakritikou (š, č, ž, ý, á, í, é, ô, ľ, ť, ň). Pred odpoveďou skontroluj preklepy a medzery medzi slovami.
- keep=false ak: ide o zvieratá alebo bunky bez praktického dosahu, doplnok s tvrdením o zázračnom efekte, extrémnu diétu, odvňovanie, liečbu, lieky, hormóny, tehotenstvo, choroby, alebo je článok nejasný.
- title: max 70 znakov, jasný, bez clickbaitu, bez pomĺčiek (nepoužívaj znaky - ani – ani —).
- summary: 2 krátke vety: čo sa zistilo, na kom (napr. "u 60 mužov") a aký veľký bol efekt. Nepreháňaj, nepíš "dokázané", použi "štúdia naznačuje", ak je dôkaz slabý.
- why: 1 veta, čo si z toho vie človek prakticky vziať (konkrétne, bez záruk). Žiadne zdravotné rady pre chorých.
- category: training | nutrition | recovery
- evidence: human (štúdia na ľudoch) | review (súhrnná práca) | animal | opinion (tlačová správa alebo názor)
Vráť IBA JSON: {"items":[{"i":0,"keep":true,"title":"","summary":"","why":"","category":"","evidence":""}]}`;

async function ask(cands: Cand[]) {
  const list = cands.map((c, i) => `#${i} ${c.title}\n${c.text}`).join("\n\n");
  let last = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT }, { text: list }] }], generationConfig: { temperature: 0.3, responseMimeType: "application/json" } }),
      });
      const j = await r.json();
      if (!r.ok) { last = j?.error?.message || String(r.status); continue; }
      const out = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      const a = out.indexOf("{"), b = out.lastIndexOf("}");
      return JSON.parse(out.slice(a, b + 1)).items || [];
    } catch (e) { last = String(e).slice(0, 120); }
  }
  throw new Error(last || "AI nedostupna");
}

Deno.serve(async () => {
  const admin = createClient(SUPABASE_URL, SERVICE);
  const { data: lastRow } = await admin.from("news").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lastRow && Date.now() - new Date(lastRow.created_at).getTime() < MIN_GAP_MS) return new Response(JSON.stringify({ skipped: "nedavno bezalo" }));
  if (!KEY) return new Response(JSON.stringify({ error: "chyba kluc" }), { status: 503 });

  const tt = Date.now();
  const [pm, rs] = await Promise.all([pubmed(), rss()]);
  const all = [...pm, ...rs];
  const tFetch = Date.now() - tt;
  const seen = new Set<string>();
  const uniq = all.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));
  const { data: have } = await admin.from("news").select("source_url").in("source_url", uniq.map((c) => c.url));
  const known = new Set((have || []).map((r: any) => r.source_url));
  const fresh = uniq.filter((c) => !known.has(c.url)).slice(0, MAX_NEW);
  if (!fresh.length) return new Response(JSON.stringify({ added: 0, found: all.length }));

  const res = await ask(fresh);
  const rows: any[] = [];
  for (const r of res) {
    const c = fresh[Number(r.i)];
    if (!c || r.keep !== true) continue;
    const clean = (s: unknown, n: number) => String(s || "").replace(/[–—]/g, ",").trim().slice(0, n);
    const cat = ["training", "nutrition", "recovery"].includes(r.category) ? r.category : "training";
    let ev = ["human", "review", "animal", "opinion"].includes(r.evidence) ? r.evidence : c.type;
    if (ev === "animal") continue;
    if (!clean(r.title, 80) || !clean(r.summary, 400)) continue;
    rows.push({ title: clean(r.title, 80), summary: clean(r.summary, 400), why: clean(r.why, 220), category: cat, evidence: ev, source_name: c.source.slice(0, 60), source_url: c.url, status: "pending" });
  }
  if (rows.length) await admin.from("news").upsert(rows, { onConflict: "source_url", ignoreDuplicates: true });
  return new Response(JSON.stringify({ added: rows.length, candidates: fresh.length, found: all.length, pubmed: pm.length, rss: rs.length, ms_fetch: tFetch, ms_total: Date.now() - tt }));
});
