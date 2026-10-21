// Import slovenských a českých balených potravín z Open Food Facts: všetky produkty predávané na SK a CZ (podľa obľúbenosti)
// + domáce značky a privátne značky reťazcov (Lidl, Kaufland, Tesco, Billa, COOP Jednota). Berú sa len produkty, ktorých
// kalórie sedia s makrami (kontrola 4/4/9), so slovenským alebo českým názvom, ak existuje. Existujúce čiarové kódy sa neprepisujú.
// Úlohy sa reťazia samy (stav v off_import, kľúče sk:...). ?token=...&mode=status|test&q=...
import { createClient } from "jsr:@supabase/supabase-js@2";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL_, KEY);
const TOKEN = "sk-7f3a91c2";
const H = { "User-Agent": "Fuelwind/1.0 (druhydych.vercel.app)" };
const BUDGET_MS = 100000, PAGE = 100;
const FIELDS = "code,product_name,product_name_sk,product_name_cs,brands,nutriments,unique_scans_n,serving_quantity,product_quantity";

const BRANDS = ["rajo", "tami", "zvolensky", "sedita", "kofola", "figaro", "liptov", "hyza", "mecom", "tauris", "pikok", "k-classic", "kaufland", "clever", "billa", "tesco", "tesco-finest", "lidl", "milbona", "pilos", "chef-select", "freshona", "dulano", "solevita", "crownfield", "coop-jednota", "jednota", "mlsna", "orion", "opavia", "madeta", "olma", "kunin", "pribina", "hollandia", "emco", "bonavita", "penam", "babicka", "vitana", "hame", "bohemia", "mlyn-sturovo", "rauch", "budis", "rajec", "vinea", "baron", "mlieko-tatranske", "tatranske", "agro-tami", "zlaty-bazant", "saris", "corgon", "kucharka", "palma", "kaufland-classic", "vitasia", "alesto", "favorina", "gut-bio", "bio-organic"];

type Job = { key: string; q: string; max: number };
const JOBS: Job[] = [
  { key: "sk:country:slovakia", q: `countries_tags:"en:slovakia"`, max: 110 },
  { key: "sk:country:czech", q: `countries_tags:"en:czech-republic"`, max: 160 },
];
for (const b of BRANDS) JOBS.push({ key: `sk:brand:${b}`, q: `brands_tags:"${b}"`, max: 30 });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function num(v: unknown): number | null { if (v === null || v === undefined || v === "") return null; const n = Number(v); return isFinite(n) ? n : null; }
const r1 = (x: number) => Math.round(x * 10) / 10;
function isLatinName(s: string) { let lat = 0, other = 0; for (const ch of s) { const c = ch.codePointAt(0)!; if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 0xC0 && c <= 0x24F)) lat++; else if (c > 0x24F && ch.toLowerCase() !== ch.toUpperCase()) other++; } return lat >= 2 && other === 0; }
function clean(s: unknown) { return String(s || "").replace(/\s+/g, " ").trim(); }
function tidy(s: string) { if (s.length > 3 && s === s.toUpperCase() && s !== s.toLowerCase()) return s.charAt(0) + s.slice(1).toLowerCase(); return s; }
function conv(p: any) {
  const n = p.nutriments || {}; const code = String(p.code || "");
  if (!/^[0-9]{8,14}$/.test(code)) return null;
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === null) { const kj = num(n["energy-kj_100g"] ?? n["energy_100g"]); if (kj !== null) kcal = kj / 4.184; }
  const protein = num(n.proteins_100g), carbs = num(n.carbohydrates_100g), fat = num(n.fat_100g);
  if (kcal === null || protein === null || carbs === null || fat === null) return null;
  const alc = Math.max(0, Math.min(60, num(n.alcohol_100g) ?? 0));
  kcal = Math.round(kcal); if (kcal < 0 || kcal > 900) return null;
  for (const v of [protein, carbs, fat]) if (v < 0 || v > 100) return null;
  if (protein + carbs + fat > 100.5) return null;
  const alcG = r1(alc * 0.789); // OFF udáva % obj., databáza gramy
  if (Math.abs(kcal - (4 * protein + 4 * carbs + 9 * fat + 7 * alcG)) > Math.max(40, 0.3 * kcal)) return null; // rovnaká kontrola ako v databáze
  const t = clean(p.product_name_sk || p.product_name_cs || p.product_name);
  if (t.length < 2 || !isLatinName(t)) return null;
  const name = tidy(t).slice(0, 120);
  let brand: string | null = clean(Array.isArray(p.brands) ? p.brands[0] : String(p.brands || "").split(",")[0]).slice(0, 80);
  if (!brand || !isLatinName(brand)) brand = null; else brand = tidy(brand);
  const opt = (v: unknown) => { const x = num(v); return x !== null && x >= 0 && x <= 100 ? r1(x) : null; };
  const portions: { g: number; label: string }[] = [];
  const sq = num(p.serving_quantity), pq = num(p.product_quantity);
  if (sq !== null && sq >= 2 && sq <= 1000) portions.push({ g: Math.round(sq), label: "1 porcia" });
  if (pq !== null && pq >= 20 && pq <= 2000 && (sq === null || Math.round(pq) !== Math.round(sq))) portions.push({ g: Math.round(pq), label: "1 balenie" });
  return { name, brand, barcode: code, kcal, protein: r1(protein), carbs: r1(carbs), fat: r1(fat), fiber: opt(n.fiber_100g), sugar: opt(n.sugars_100g), salt: opt(n.salt_100g), alcohol: alcG, portions, is_public: true, src: "off", pop: Math.min(1000000, Math.max(0, Math.round(Number(p.unique_scans_n) || 0))) };
}
const json = (o: unknown) => new Response(JSON.stringify(o), { headers: { "Content-Type": "application/json" } });
async function offSearch(q: string, page: number) {
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&sort_by=-unique_scans_n&page_size=${PAGE}&page=${page}&fields=${FIELDS}`;
  let r = await fetch(url, { headers: H, signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (!r || !r.ok) { await sleep(4000); r = await fetch(url, { headers: H, signal: AbortSignal.timeout(30000) }).catch(() => null); }
  if (!r || !r.ok) throw new Error("OFF " + (r ? r.status : "timeout"));
  return await r.json();
}
Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("token") !== TOKEN) return new Response("no", { status: 403 });
  const t0 = Date.now();
  const mode = u.searchParams.get("mode");
  if (mode === "test") {
    const j = await offSearch(u.searchParams.get("q") || "", 1);
    const c = (j.hits || []).map(conv).filter(Boolean);
    return json({ count: j.debug?.count ?? j.count, hits: (j.hits || []).length, usable: c.length, sample: c.slice(0, 5).map((x: any) => `${x.brand} | ${x.name} | ${x.kcal}`) });
  }
  if (mode === "status") {
    const { data } = await admin.from("off_import").select("job,imported,done,total,page").like("job", "sk:%");
    return json({ jobs_total: JOBS.length, started: (data || []).length, done: (data || []).filter((d: any) => d.done).length, imported: (data || []).reduce((a: number, d: any) => a + (d.imported || 0), 0), jobs: data });
  }
  const { data: st } = await admin.from("off_import").select("*").like("job", "sk:%");
  const byKey = new Map((st || []).map((s: any) => [s.job, s]));
  const nowMs = Date.now();
  const job = JOBS.find((j) => { const s: any = byKey.get(j.key); return !(s && s.done) && !(s && s.lock_until && new Date(s.lock_until).getTime() > nowMs); });
  if (!job) return json({ msg: "hotovo alebo zamknute" });
  await admin.from("off_import").upsert({ job: job.key }, { onConflict: "job", ignoreDuplicates: true });
  const cur: any = byKey.get(job.key) || { page: 1, imported: 0, skipped: 0 };
  let page = cur.page || 1, imported = cur.imported || 0, skipped = cur.skipped || 0, total = cur.total || 0, done = false, err = "", pages = 0;
  await admin.from("off_import").update({ lock_until: new Date(Date.now() + 125000).toISOString() }).eq("job", job.key);
  try {
    while (Date.now() - t0 < BUDGET_MS) {
      const j = await offSearch(job.q, page);
      if (!j || !Array.isArray(j.hits)) { err = "zla odpoved"; break; }
      total = j.debug?.count ?? total;
      const seen = new Set<string>(); const rows: any[] = [];
      for (const p of j.hits) { const c = conv(p); if (c && !seen.has(c.barcode)) { seen.add(c.barcode); rows.push(c); } }
      let ins = 0;
      if (rows.length) {
        const { data, error } = await admin.from("foods").upsert(rows, { onConflict: "barcode", ignoreDuplicates: true }).select("id");
        if (error) { for (const row of rows) { const { data: d1, error: e1 } = await admin.from("foods").upsert([row], { onConflict: "barcode", ignoreDuplicates: true }).select("id"); if (!e1) ins += (d1 || []).length; } }
        else ins = (data || []).length;
      }
      imported += ins; skipped += j.hits.length - ins; pages++; page++;
      if (j.hits.length < PAGE || page > job.max || (total && (page - 1) * PAGE >= total)) done = true;
      await admin.from("off_import").update({ page, total, imported, skipped, done, updated_at: new Date().toISOString() }).eq("job", job.key);
      if (done) break;
      await sleep(300);
    }
  } catch (e) { err = String((e as Error).message).slice(0, 200); }
  await admin.from("off_import").update({ page, total, imported, skipped, done, lock_until: null, updated_at: new Date().toISOString() }).eq("job", job.key);
  if (u.searchParams.get("chain") !== "0" && !(err && pages === 0)) {
    // @ts-ignore
    EdgeRuntime.waitUntil(sleep(err && !done ? 20000 : 500).then(() => fetch(`${URL_}/functions/v1/off-sk?token=${TOKEN}`, { headers: { Authorization: `Bearer ${KEY}` } })).catch(() => null));
  }
  return json({ job: job.key, pages, page, total, imported, skipped, done, err, ms: Date.now() - t0 });
});
