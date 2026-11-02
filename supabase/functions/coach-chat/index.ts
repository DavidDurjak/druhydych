// GainTrain: AI pomocník a kouč (chat + ranná otvárajúca správa).
// Pozná dáta používateľa, odpovedá podľa pravidiel v prompt.js (v jazyku, v ktorom človek appku používa) a vie otvoriť správne miesto v appke.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildSystem, OPENER, ROUTES } from "./prompt.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
// Modely 2.5 Google vyradil (404). Pre inú kvalitu stačí v nastaveniach funkcie zmeniť COACH_MODEL.
const MODEL = Deno.env.get("COACH_MODEL") || "gemini-3.5-flash-lite";
const MODELS = [MODEL, "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-flash-latest"].filter((m, i, a) => a.indexOf(m) === i);
const THINK = Number(Deno.env.get("COACH_THINK") || 1024);
const DAILY_LIMIT = Number(Deno.env.get("COACH_DAILY_LIMIT") || 150);
const TIMEOUT_MS = 40000;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const tz = "Europe/Bratislava";
const dayStr = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: tz });
const r1 = (v: number) => Math.round(v * 10) / 10;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// Jazyk appky (posiela ho appka). Pravidlá v prompt.js sú po slovensky, odpoveď ide v jazyku používateľa.
const LANGS: Record<string, string> = { sk: "Slovak", cs: "Czech", de: "German", hu: "Hungarian", pl: "Polish", en: "English", uk: "Ukrainian", es: "Spanish", fr: "French", it: "Italian", ro: "Romanian", hr: "Croatian", sl: "Slovenian", sr: "Serbian (Latin script)", bg: "Bulgarian", ru: "Russian", nl: "Dutch", pt: "Portuguese", sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish", tr: "Turkish", lt: "Lithuanian", lv: "Latvian", et: "Estonian", el: "Greek",
  ar: "Arabic", he: "Hebrew", fa: "Persian", hi: "Hindi", bn: "Bengali", ur: "Urdu", zh: "Simplified Chinese", ja: "Japanese", ko: "Korean", vi: "Vietnamese", id: "Indonesian", ms: "Malay", th: "Thai", tl: "Filipino (Tagalog)", sw: "Swahili", ca: "Catalan", is: "Icelandic", bs: "Bosnian", mk: "Macedonian", sq: "Albanian" };
const langOf = (v: unknown) => { const c = String(v || "").toLowerCase().slice(0, 2); return c in LANGS ? c : "sk"; };
function langBlock(lang: string) {
  if (lang === "sk") return "";
  const n = LANGS[lang];
  return `\n\nJAZYK ODPOVEDE (má prednosť pred pravidlom "hovor po slovensky"): používateľ má appku nastavenú v jazyku ${n}. "reply", "chips" aj "action.label" píš výlučne v jazyku ${n}, prirodzene a gramaticky správne, neformálne ako kamarát, ktorý sa vyzná (v jazykoch s tykaním tykaj). Ak používateľ napíše v inom jazyku, odpovedz v jazyku jeho správy. Staršie správy v histórii môžu byť po slovensky, to nevadí. Obrazovky appky pomenuj po ${n} podľa významu (Dnes, Jedlo, Tréning, Pokrok, Profil). Pravidlo o oslovení v 5. páde platí len pre slovenčinu, inak použi meno v tvare bežnom pre ${n}. Pri ohrození života uveď tiesňové číslo 112, slovenské linky uvádzaj len človeku zo Slovenska. Jednotky nechaj metrické (g, kg, kcal).`;
}

// Bezpečnostné doplnky: tvrdé pravidlá, ktoré nezávisia len od toho, čo si model z dlhého promptu zapamätá.
const CRISIS = /samovra|zabi[tť] sa|sa zabi[tť]|nechcem (už )?[zž]i[tť]|chcem zomrie[tť]|ubli[zž]i[tť] si|sebapo[sš]k|porez(a|á)m si|suicid|kill myself|want to die|self.?harm/i;
const EDRISK = /vyvola[tť] vracanie|vyvr[aá]ca[tť]|zvracan|anorex|bul[ií]mi|hladova[tť] sa|trest za jedlo|zaslúži[tť] si jedlo|projím|laxativ/i;
function safetyExtra(ctx: any, message: string) {
  let s = "";
  const vek = Number(ctx?.profil?.vek);
  if (vek > 0 && vek < 18) s += "\n\nTVRDÉ PRAVIDLO (vek pod 18 rokov podľa profilu): nikdy nenavrhuj deficit kalórií, chudnutie, číselné ciele na redukciu ani obmedzovanie jedla. Zameraj sa na pravidelné jedlo, pohyb, spánok a silu. Pri téme váhy alebo vzhľadu láskavo odporuč rozhovor s rodičom a lekárom alebo školským psychológom.";
  if (message && CRISIS.test(message)) s += "\n\nTVRDÉ PRAVIDLO (správa naznačuje krízu): reaguj iba vľúdne a vážne, krátko. Neotváraj koučing, kalórie ani tréning. Povzbuď kontaktovať blízkeho človeka alebo krízovú linku (Linka dôvery Nezábudka 0800 800 566, v ohrození života 112) a opýtaj sa, či je teraz v bezpečí. Žiadna action okrem null.";
  else if (message && EDRISK.test(message)) s += "\n\nTVRDÉ PRAVIDLO (správa naznačuje poruchu príjmu potravy): nepodporuj obmedzovanie ani kompenzáciu jedla, nedávaj číselné ciele na redukciu. Láskavo a priamo odporuč pomoc (lekár, psychológ) a zostaň podporný.";
  return s;
}

// Návyky (nikotín, alkohol): zhrnutie pre kouča. Tabuľky nemusia existovať, vtedy vráti null.
const HB_ITEM: Record<string, string> = { cig: "cigarety", vape: "vape", snus: "nikotínové vrecúška", chew: "žuvací tabak", cigar: "cigary", beer: "pivo 0,5 l", beer33: "pivo 0,33 l", wine: "víno 2 dl", spirit: "panák 4 cl", mixed: "koktail" };
const HB_TRIG: Record<string, string> = { stress: "stres", coffee: "káva", social: "spoločnosť", bored: "nuda", alcohol: "pri pití", meal: "po jedle", habit: "zo zvyku", other: "iné" };
async function habitsContext(admin: any, uid: string, today: string) {
  try {
    const from30 = dayStr(new Date(Date.now() - 30 * 864e5));
    const [hb, lg] = await Promise.all([
      admin.from("habits").select("id,kind,sub,mode,baseline,daily_limit,unit_cost,start_date,quit_at").eq("user_id", uid).eq("active", true),
      admin.from("habit_logs").select("habit_id,date,at,qty,kcal,trigger").eq("user_id", uid).gte("date", from30).order("at"),
    ]);
    if (hb.error || !hb.data?.length) return null;
    const logs = lg.data || [];
    const weekAgo = dayStr(new Date(Date.now() - 7 * 864e5));
    return hb.data.map((h: any) => {
      const L = logs.filter((l: any) => l.habit_id === h.id);
      const use = L.filter((l: any) => Number(l.qty) > 0), wins = L.filter((l: any) => Number(l.qty) === 0);
      const last = use.length ? new Date(use[use.length - 1].at) : (h.quit_at ? new Date(h.quit_at) : new Date(h.start_date + "T00:00:00"));
      const cleanH = Math.max(0, (Date.now() - last.getTime()) / 36e5);
      const daysIn = Math.max(1, Math.round((new Date(today + "T00:00:00").getTime() - new Date(h.start_date + "T00:00:00").getTime()) / 864e5) + 1);
      const used = use.reduce((a: number, l: any) => a + Number(l.qty), 0);
      const todayQty = use.filter((l: any) => l.date === today).reduce((a: number, l: any) => a + Number(l.qty), 0);
      const weekQty = use.filter((l: any) => l.date >= weekAgo).reduce((a: number, l: any) => a + Number(l.qty), 0);
      const weekKcal = use.filter((l: any) => l.date >= weekAgo).reduce((a: number, l: any) => a + Number(l.kcal || 0), 0);
      const avoided = Math.max(0, (Number(h.baseline) || 0) * daysIn - used);
      const trig: Record<string, number> = {};
      L.forEach((l: any) => { if (l.trigger) trig[l.trigger] = (trig[l.trigger] || 0) + 1; });
      const top = Object.entries(trig).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${HB_TRIG[k] || k} ${n}x`);
      const byDay: Record<string, number> = {};
      use.forEach((l: any) => { byDay[l.date] = (byDay[l.date] || 0) + Number(l.qty); });
      let streak = 0;
      for (let d = new Date(today + "T00:00:00"); dayStr(d) >= h.start_date; d = new Date(d.getTime() - 864e5)) {
        const k = dayStr(d); const ok = h.mode === "quit" ? !(byDay[k] > 0) : (byDay[k] || 0) <= (Number(h.daily_limit) || 0);
        if (!ok) break; streak++;
      }
      return {
        typ: h.kind === "nicotine" ? "nikotín" : "alkohol", forma: HB_ITEM[h.sub] || h.sub, ciel: h.mode === "quit" ? "skončiť úplne" : `znížiť na ${h.daily_limit} denne`,
        predtym_denne: h.baseline, od: h.start_date, dni_v_programe: daysIn,
        dnes: todayQty, tento_tyzden: weekQty, kcal_z_alkoholu_tento_tyzden: h.kind === "alcohol" ? Math.round(weekKcal) : undefined,
        bez_pouzitia_hodin: Math.round(cleanH), bez_pouzitia_dni: Math.floor(cleanH / 24), seria_dni_v_cieli: streak,
        odolane_chute_30d: wins.length, usetrene_eur: Math.round(avoided * (Number(h.unit_cost) || 0)), menej_nez_predtym_ks: Math.round(avoided),
        spustace: top, posledne_pouzitie: use.length ? use[use.length - 1].at : null,
      };
    });
  } catch (_) { return null; }
}

// beh a tréningy naživo: zhrnutie pre kouča (tabuľky nemusia existovať, vtedy null)
const RUN_KIND: Record<string, string> = { outdoor: "beh vonku", treadmill: "beh na páse", track: "dráha", runwalk: "beh a chôdza", walk: "prechádzka" };
async function runsContext(admin: any, uid: string) {
  try {
    const from = new Date(Date.now() - 42 * 864e5).toISOString();
    const [rr, gg, pp] = await Promise.all([
      admin.from("runs").select("kind,started_at,distance_m,duration_s,best").eq("user_id", uid).gte("started_at", from).order("started_at", { ascending: false }).limit(25),
      admin.from("run_goals").select("kind,target").eq("user_id", uid),
      admin.from("run_program").select("done").eq("user_id", uid).maybeSingle(),
    ]);
    const runs = rr.data || [];
    const pace = (s: number, m: number) => m > 0 ? `${Math.floor(s / (m / 1000) / 60)}:${String(Math.round(s / (m / 1000) % 60) % 60).padStart(2, "0")}/km` : null;
    const best: Record<string, number> = {};
    runs.forEach((r: any) => Object.entries(r.best || {}).forEach(([d, s]) => { if (!best[d] || (s as number) < best[d]) best[d] = s as number; }));
    const out: any = {
      posledne_aktivity: runs.slice(0, 8).map((r: any) => `${dayStr(new Date(r.started_at))} ${RUN_KIND[r.kind] || r.kind} ${(Number(r.distance_m) / 1000).toFixed(1)} km za ${Math.round(r.duration_s / 60)} min${pace(r.duration_s, Number(r.distance_m)) ? ", tempo " + pace(r.duration_s, Number(r.distance_m)) : ""}`),
      km_6_tyzdnov: Math.round(runs.filter((r: any) => r.kind !== "walk").reduce((a: number, r: any) => a + Number(r.distance_m || 0), 0) / 100) / 10,
      najlepsie_casy_s: Object.keys(best).length ? best : undefined,
      bezecke_ciele: (gg.data || []).map((g: any) => `${g.kind} ${g.target}`),
      od_gauca_k_5km: pp.data ? `${(pp.data.done || []).length} z 24 tréningov` : undefined,
    };
    if (!runs.length && !out.bezecke_ciele.length && !pp.data) return null;
    return out;
  } catch (_) { return null; }
}
async function liveContext(admin: any, uid: string) {
  try {
    const { data } = await admin.from("group_invites").select("rsvp,group_sessions!inner(title,starts_at,duration_min,status)").eq("client_id", uid).gte("group_sessions.starts_at", new Date(Date.now() - 3 * 36e5).toISOString()).limit(5);
    const xs = (data || []).filter((x: any) => x.group_sessions?.status === "scheduled");
    return xs.length ? xs.map((x: any) => `${x.group_sessions.title}, ${new Date(x.group_sessions.starts_at).toLocaleString("sk-SK", { timeZone: tz, weekday: "long", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}, odpoveď: ${({ going: "ide", declined: "nejde", invited: "ešte neodpovedal" } as any)[x.rsvp] || x.rsvp}`) : null;
  } catch (_) { return null; }
}

async function buildContext(admin: any, uid: string) {
  const today = dayStr();
  const from28 = dayStr(new Date(Date.now() - 28 * 864e5));
  const from7 = dayStr(new Date(Date.now() - 7 * 864e5));
  const [pr, fl, wl, ck, wo, pl, navyky, beh, nazivo] = await Promise.all([
    admin.from("profiles").select("name,sex,birth_year,height_cm,start_weight,start_date,goal,activity,training_days,gym,target_kcal,target_protein,target_carbs,target_fat,targets_mode,water_goal").eq("id", uid).single(),
    admin.from("food_logs").select("date,meal,name,grams,kcal,protein,carbs,fat").eq("user_id", uid).gte("date", from7).order("created_at"),
    admin.from("weight_logs").select("date,weight_kg,waist_cm").eq("user_id", uid).gte("date", from28).order("date"),
    admin.from("checkins").select("date,sleep_h,steps,mood,water").eq("user_id", uid).gte("date", from7).order("date"),
    admin.from("workout_logs").select("date,day_name,done").eq("user_id", uid).gte("date", from28).order("date"),
    admin.from("workout_plans").select("name,days").eq("user_id", uid).eq("active", true).limit(1),
    habitsContext(admin, uid, today),
    runsContext(admin, uid),
    liveContext(admin, uid),
  ]);
  const p = pr.data || {};
  const foods = fl.data || [];
  const byDay: Record<string, { kcal: number; protein: number }> = {};
  foods.forEach((f: any) => { const d = (byDay[f.date] = byDay[f.date] || { kcal: 0, protein: 0 }); d.kcal += Number(f.kcal) || 0; d.protein += Number(f.protein) || 0; });
  const todayFoods = foods.filter((f: any) => f.date === today);
  const tk = todayFoods.reduce((a: any, f: any) => ({ kcal: a.kcal + Number(f.kcal || 0), protein: a.protein + Number(f.protein || 0), carbs: a.carbs + Number(f.carbs || 0), fat: a.fat + Number(f.fat || 0) }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const pastDays = Object.entries(byDay).filter(([d, v]) => d !== today && v.kcal > 0);
  const w = (wl.data || []).map((x: any) => ({ date: x.date, kg: Number(x.weight_kg), waist: x.waist_cm ? Number(x.waist_cm) : undefined }));
  const wLast = w.slice(-7).map((x: any) => x.kg), wPrev = w.slice(-14, -7).map((x: any) => x.kg);
  const trendChange = wLast.length >= 2 && wPrev.length >= 2 ? r1(avg(wLast) - avg(wPrev)) : null;
  const workouts = (wo.data || []).filter((x: any) => x.done);
  const planRow = (pl.data || [])[0];
  const hourNow = Number(new Date().toLocaleString("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }));
  const age = p.birth_year ? new Date().getFullYear() - Number(p.birth_year) : null;
  return {
    today, hour: hourNow,
    profil: { meno: p.name, pohlavie: p.sex === "f" ? "žena" : "muž", vek: age, vyska_cm: p.height_cm, startova_vaha_kg: p.start_weight, start: p.start_date, ciel: ({ lose: "schudnúť", maintain: "udržať váhu", gain: "nabrať svaly" } as any)[p.goal] || p.goal, aktivita: p.activity, treningy_tyzdenne: p.training_days, chodi_do_gymu: p.gym },
    ciele: { kcal: p.target_kcal, bielkoviny_g: p.target_protein, sacharidy_g: p.target_carbs, tuky_g: p.target_fat, rezim: p.targets_mode === "custom" ? "vlastné" : "automatické" },
    dnes: { prijem: { kcal: Math.round(tk.kcal), bielkoviny_g: Math.round(tk.protein), sacharidy_g: Math.round(tk.carbs), tuky_g: Math.round(tk.fat) }, zapisane_jedla: todayFoods.slice(0, 25).map((f: any) => `${f.meal}: ${String(f.name).slice(0, 50)} ${Math.round(f.grams)} g, ${Math.round(f.kcal)} kcal`) },
    posledne_dni_priemer: pastDays.length ? { dni_so_zapisom: pastDays.length, kcal: Math.round(avg(pastDays.map(([, v]) => v.kcal))), bielkoviny_g: Math.round(avg(pastDays.map(([, v]) => v.protein))) } : null,
    vaha: { aktualna_kg: w.length ? w[w.length - 1].kg : null, posledne_vazenia: w.slice(-10), zmena_trendu_7d_oproti_predchadzajucim_7d_kg: trendChange },
    checkiny_7d: (ck.data || []).map((c: any) => ({ date: c.date, spanok_h: c.sleep_h, kroky: c.steps, nalada: c.mood, voda_pohare: c.water })),
    treningy_28d: { odtrenovane: workouts.length, posledne: workouts.slice(-4).map((x: any) => `${x.date} ${x.day_name || ""}`.trim()) },
    plan: planRow ? { nazov: planRow.name, dni: JSON.stringify(planRow.days).slice(0, 1800) } : null,
    navyky: navyky || undefined,
    beh: beh || undefined,
    treningy_nazivo: nazivo || undefined,
  };
}

function parseJson(out: string) {
  const a = out.indexOf("{"), b = out.lastIndexOf("}");
  try { return JSON.parse(a >= 0 && b > a ? out.slice(a, b + 1) : "{}"); } catch { return null; }
}

async function callModel(system: string, contents: unknown[], t0: number) {
  let lastErr = "";
  let quotaHits = 0;
  for (const m of MODELS) {
    if (Date.now() - t0 > 55000) break;
    try {
      const cfg: Record<string, unknown> = { temperature: 0.5, responseMimeType: "application/json", maxOutputTokens: 2048 };
      if (m.startsWith("gemini-2.5")) cfg.thinkingConfig = { thinkingBudget: m.includes("pro") ? Math.max(THINK, 128) : THINK };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: cfg }),
      });
      const resp = await r.json().catch(() => null);
      if (r.ok) {
        const out = (resp?.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("");
        const j = parseJson(out);
        if (j && typeof j.reply === "string" && j.reply.trim()) return { j, model: m };
        lastErr = "prázdna odpoveď";
        continue;
      }
      lastErr = resp?.error?.message || "AI chyba " + r.status;
      console.error("coach-chat model", m, r.status, String(lastErr).slice(0, 140));
      if (r.status === 429 || /quota/i.test(lastErr)) quotaHits++;
    } catch (_) { lastErr = "AI neodpovedala včas"; }
  }
  return { err: lastErr, quota: quotaHits >= MODELS.length };
}

function cleanAction(a: any) {
  if (!a || typeof a !== "object") return null;
  const route = String(a.route || "");
  if (!(route in ROUTES)) return null;
  return { label: String(a.label || "Otvoriť").slice(0, 40), route };
}
const cleanChips = (c: unknown) => (Array.isArray(c) ? c.map((x) => String(x).slice(0, 40)).filter(Boolean).slice(0, 3) : []);

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
  const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: u } = await user.auth.getUser();
  if (!u?.user) return json({ error: "Prihlás sa znova." }, 401);
  const uid = u.user.id;
  const admin = createClient(SUPABASE_URL, SERVICE);
  let body: { mode?: string; message?: string; lang?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }
  const mode = body.mode === "opener" ? "opener" : "chat";
  const lang = langOf(body.lang);
  const message = String(body.message || "").slice(0, 1000).trim();
  if (mode === "chat" && !message) return json({ error: "Napíš správu." }, 400);
  if (!KEY) return json({ error: "AI pomocník zatiaľ nie je zapnutý." }, 503);

  const since = new Date(Date.now() - 864e5).toISOString();
  const { count: used } = await admin.from("coach_msgs").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("role", "user").gte("created_at", since);

  // ranná správa: jedna za ~10 hodín (v jazyku, v ktorom bola napísaná; po zmene jazyka sa napíše nová)
  if (mode === "opener") {
    const recent = new Date(Date.now() - 10 * 36e5).toISOString();
    const { data: ex } = await admin.from("coach_msgs").select("id,content,meta").eq("user_id", uid).eq("kind", "opener").gte("created_at", recent).order("created_at", { ascending: false }).limit(1);
    if (ex?.length && (ex[0].meta?.lang || "sk") === lang) return json({ reply: ex[0].content, chips: ex[0].meta?.chips || [], action: ex[0].meta?.action || null, id: ex[0].id, cached: true });
  } else if ((used || 0) >= DAILY_LIMIT) {
    return json({ error: "Na dnes si vyčerpal limit správ pre pomocníka. Zajtra som tu znova." }, 429);
  }

  if (mode !== "opener") {
    const q = await aiTake(admin, uid, "coach_chat"); // predplatné: denný limit správ
    if (!q.ok) return json(paywallBody(q, "coach_chat"), 402);
  }

  if (mode !== "opener") {
    // ochrana proti zneužitiu (skripty, boti): najviac 8 správ za minútu
    const { count: burst } = await admin.from("coach_msgs").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("role", "user").gte("created_at", new Date(Date.now() - 6e4).toISOString());
    if ((burst || 0) >= 8) return json({ error: "Píšeš príliš rýchlo. Počkaj chvíľu a skús znova." }, 429);
  }

  const ctx = await buildContext(admin, uid);
  const { data: prof } = await admin.from("profiles").select("buddy").eq("id", uid).single();
  const buddyName = String(prof?.buddy?.name || "").slice(0, 20) || "Gust";
  const system = buildSystem({ buddyName, ctx }) + langBlock(lang) + safetyExtra(ctx, mode === "chat" ? message : "");

  let contents: { role: string; parts: { text: string }[] }[] = [];
  if (mode === "chat") {
    const { data: hist } = await admin.from("coach_msgs").select("role,content").eq("user_id", uid).order("created_at", { ascending: false }).limit(14);
    contents = (hist || []).reverse().map((m: any) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] }));
    contents.push({ role: "user", parts: [{ text: message }] });
    // Gemini vyžaduje striedanie, začiatok musí byť používateľ
    while (contents.length && contents[0].role !== "user") contents.shift();
  } else {
    contents = [{ role: "user", parts: [{ text: OPENER + (lang !== "sk" ? ` Píš v jazyku ${LANGS[lang]}.` : "") }] }];
  }

  const res: any = await callModel(system, contents, t0);
  if (!res.j) {
    console.error("coach-chat zlyhanie:", String(res.err).slice(0, 200));
    if (mode !== "opener") await aiRefund(admin, uid, "coach_chat");
    return json({ error: res.quota ? "Pomocník je dočasne preťažený (kapacita AI). Skús to o chvíľu." : "Pomocník teraz neodpovedal. Skús to o minútu." }, 502);
  }
  let reply = String(res.j.reply).slice(0, 3500).trim();
  // meno na začiatku každej odpovede pôsobí neprirodzene: v chate ho zo začiatku vždy odstránime (napr. "David, ..." alebo "Super, Dávid! ...")
  const nm = String(ctx.profil?.meno || "").trim().split(/\s+/)[0] || "";
  if (mode === "chat" && nm.length >= 2) {
    const stem = nm.normalize("NFD").replace(/\p{M}/gu, "").slice(0, Math.max(3, nm.length - 2)).toLowerCase();
    const m = reply.match(/^((?:\p{L}+[,!]?\s+){0,1})(\p{L}+)\s*[,!]\s*/u);
    if (m && m[2].normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().startsWith(stem)) {
      const lead = m[1].trim().replace(/[,!]$/, ""), bang = /!/.test(m[0].slice(m[1].length));
      let rest = reply.slice(m[0].length);
      if (!lead || bang) rest = rest.charAt(0).toUpperCase() + rest.slice(1);
      reply = lead ? lead + (bang ? "! " : ", ") + rest : rest;
    }
  }
  const chips = cleanChips(res.j.chips);
  const action = cleanAction(res.j.action);

  if (mode === "chat") await admin.from("coach_msgs").insert({ user_id: uid, role: "user", kind: "chat", content: message });
  const { data: saved } = await admin.from("coach_msgs").insert({ user_id: uid, role: "coach", kind: mode === "opener" ? "opener" : "chat", content: reply, meta: { chips, action, model: res.model, ms: Date.now() - t0, lang } }).select("id").single();
  return json({ reply, chips, action, id: saved?.id, left: Math.max(0, DAILY_LIMIT - (used || 0) - (mode === "chat" ? 1 : 0)) });
});
