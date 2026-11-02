// GainTrain: beh alebo prechádzka z Apple Watch (cez Zdravie a iOS Skratky) do sekcie Beh.
// Skratka po skončení tréningu pošle: t (osobný token z Profil → Hodinky), start a end (dátum a čas), km (vzdialenosť), voliteľne type, kcal.
// POST JSON alebo formulár, aj GET s parametrami. Rovnaký tréning poslaný dvakrát sa zapíše len raz (podľa času štartu).
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Content-Type": "text/plain; charset=utf-8" };
const say = (t: string, status = 200) => new Response(t, { status, headers: CORS });

// "5,23 km" -> 5.23 ; "5 230 m" -> 5230 (jednotku vráti zvlášť)
function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  let s = String(v).split("\n").map((x) => x.trim()).filter(Boolean).map((x) => x.replace(/[^\d.,]/g, "")).filter(Boolean)[0] || "";
  const c = s.lastIndexOf(","), d = s.lastIndexOf(".");
  if (c >= 0 && d >= 0) s = c > d ? s.split(".").join("").replace(",", ".") : s.split(",").join("");
  else if (c >= 0) s = s.replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}
// súčet viacerých hodnôt (Skratka môže poslať zoznam vzoriek po riadkoch)
function total(v: unknown): number | null {
  if (v == null) return null;
  if (Array.isArray(v)) { const xs = v.map(num).filter((x): x is number => x != null); return xs.length ? xs.reduce((a, b) => a + b, 0) : null; }
  const parts = String(v).split(/\n|;/).map(num).filter((x): x is number => x != null);
  return parts.length ? parts.reduce((a, b) => a + b, 0) : num(v);
}
// dátum: ISO 8601, unix sekundy, alebo slovenský/anglický zápis zo Skratiek
function when(v: unknown): Date | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return new Date(v > 1e12 ? v : v * 1000);
  const s = String(v).trim();
  if (/^\d{9,13}$/.test(s)) { const n = Number(s); return new Date(n > 1e12 ? n : n * 1000); }
  const iso = new Date(s); if (!isNaN(iso.getTime()) && /\d{4}-\d{2}-\d{2}/.test(s)) return iso;
  // "2. 11. 2026 o 18:40" alebo "2.11.2026, 18:40:12"
  const m = s.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\D+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const [, D, M, Y, h, mi, se] = m;
    const local = `${Y}-${M.padStart(2, "0")}-${D.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:${se || "00"}`;
    return fromBratislava(local);
  }
  const p = new Date(s); return isNaN(p.getTime()) ? null : p;
}
function fromBratislava(local: string) { // miestny čas v Bratislave -> UTC
  const guess = new Date(local + "Z");
  const off = (d: Date) => { const p = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Bratislava", hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(d); const g = (t: string) => Number(p.find((x) => x.type === t)!.value) % (t === "hour" ? 24 : 1e9); return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - d.getTime(); };
  return new Date(guess.getTime() - off(guess));
}
function kindOf(t: string): string | null {
  const s = t.toLowerCase();
  if (!s) return "outdoor";
  if (/walk|chôdz|chodz|prechádz|prechadz|hiking|turist/.test(s)) return "walk";
  if (/run|beh|jog/.test(s)) return /indoor|vnútor|vnutor|treadmill|pás/.test(s) ? "treadmill" : "outdoor";
  return null;
}
const pad = (n: number) => String(n).padStart(2, "0");
const dur = (s: number) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const o: Record<string, unknown> = {};
  new URL(req.url).searchParams.forEach((v, k) => { o[k.toLowerCase()] = v; });
  if (req.method === "POST") {
    const raw = await req.text();
    try { const j = JSON.parse(raw); if (j && typeof j === "object") for (const [k, v] of Object.entries(j)) o[k.toLowerCase()] = v; }
    catch { new URLSearchParams(raw).forEach((v, k) => { o[k.toLowerCase()] = v; }); }
  }
  const token = String(o.t || o.token || "").trim();
  if (token.length < 20) return say("❌ Chýba token. Skopíruj adresu v appke: Beh → Prepojiť Apple Watch.", 400);
  const sb = createClient(URL_, SERVICE);
  const { data: tk } = await sb.from("health_tokens").select("user_id").eq("token", token).maybeSingle();
  if (!tk?.user_id) return say("❌ Neplatný token. Skopíruj novú adresu v appke: Beh → Prepojiť Apple Watch.", 400);

  const kind = kindOf(String(o.type || o.typ || ""));
  if (!kind) return say("ℹ️ Tento tréning nie je beh ani chôdza, do Behu sa nezapíše.");
  const start = when(o.start || o.zaciatok), end = when(o.end || o.koniec);
  let secs = num(o.sec ?? o.seconds);
  if (secs == null && o.duration != null) { const d = String(o.duration); const m = d.match(/(?:(\d+):)?(\d+):(\d{2})/); secs = m ? Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) : (num(d) ?? 0) <= 400 ? (num(d) ?? 0) * 60 : num(d); }
  if (secs == null && start && end) secs = (end.getTime() - start.getTime()) / 1000;
  if (!start || !secs || secs < 60 || secs > 86400) return say("⚠️ Chýba začiatok alebo dĺžka tréningu. Skontroluj, či Skratka posiela start a end.", 400);
  if (start.getTime() > Date.now() + 3600e3 || start.getTime() < Date.now() - 30 * 864e5) return say("⚠️ Dátum tréningu nesedí (musí byť z posledných 30 dní).", 400);
  let m = total(o.km ?? o.distance ?? o.vzdialenost) ?? 0;
  const unit = String(o.unit || o.km || o.distance || "").toLowerCase();
  if (/\bmi\b|mile/.test(unit)) m = m * 1609.344; else if (/(^|[^k])m\b|meter|metr/.test(unit) || m > 300) { /* metre */ } else m = m * 1000;
  if (m < 0 || m > 300000) m = 0;
  if (m > 0 && secs / (m / 1000) < 150) return say("⚠️ Tempo vychádza nereálne. Skontroluj vzdialenosť.", 400);
  const kcalIn = total(o.kcal ?? o.energy);
  const { data: prof } = await sb.from("profiles").select("start_weight").eq("id", tk.user_id).maybeSingle();
  const kcal = kcalIn && kcalIn > 0 && kcalIn < 5000 ? Math.round(kcalIn) : Math.round((kind === "walk" ? 0.55 : 1) * (Number(prof?.start_weight) || 72) * m / 1000);

  // už zapísaný (do 3 minút od štartu)?
  const { data: dup } = await sb.from("runs").select("id").eq("user_id", tk.user_id)
    .gte("started_at", new Date(start.getTime() - 180e3).toISOString()).lte("started_at", new Date(start.getTime() + 180e3).toISOString()).limit(1);
  if (dup?.length) return say("✅ Tento tréning už v GainTrain máš.");

  const hr = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bratislava", hour: "2-digit", hour12: false }).format(start));
  const tod = hr < 10 ? "Ranný" : hr < 13 ? "Dopoludňajší" : hr < 18 ? "Popoludňajší" : "Večerný";
  const title = kind === "walk" ? `${tod.replace(/ý$/, "á")} prechádzka` : kind === "treadmill" ? `${tod} beh na páse` : `${tod} beh`;
  const { error } = await sb.from("runs").insert({
    user_id: tk.user_id, kind, source: "watch", started_at: start.toISOString(), duration_s: Math.round(secs), elapsed_s: end ? Math.round((end.getTime() - start.getTime()) / 1000) : Math.round(secs),
    distance_m: Math.round(m * 10) / 10, kcal, title, meta: { from: "apple_watch" },
  });
  if (error) { console.error("run-import", error.message); return say("❌ Chyba servera, skús to znova.", 500); }
  await sb.from("health_tokens").update({ last_sync: new Date().toISOString() }).eq("user_id", tk.user_id);
  const pace = m > 0 ? `, tempo ${Math.floor(secs / (m / 1000) / 60)}:${pad(Math.round(secs / (m / 1000) % 60) % 60)}/km` : "";
  return say(`✅ GainTrain: ${kind === "walk" ? "prechádzka" : "beh"} ${(m / 1000).toFixed(2).replace(".", ",")} km za ${dur(secs)}${pace}`);
});
