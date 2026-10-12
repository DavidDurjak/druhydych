// Druhý dych: príjem dát z Apple Zdravie (iOS Skratky) alebo iného zdroja cez osobný token
// GET  /health-sync?t=TOKEN&steps=8432&kcal=540&sleep=7.2&hr=58&weight=79.4[&date=2026-10-12]
// POST /health-sync  JSON alebo formulár s rovnakými poľami
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Content-Type": "text/plain; charset=utf-8" };
const NL = String.fromCharCode(10), CR = String.fromCharCode(13);

// "8 432" -> 8432, "540,3 kcal" -> 540.3, viac riadkov -> zoznam čísel
function nums(v: unknown): number[] {
  if (v == null) return [];
  if (typeof v === "number") return isFinite(v) ? [v] : [];
  if (Array.isArray(v)) return v.flatMap(nums);
  const out: number[] = [];
  for (const part of String(v).split(CR).join(NL).split(";").join(NL).split(NL)) {
    let s = "";
    for (const ch of part) if ((ch >= "0" && ch <= "9") || ch === "." || ch === ",") s += ch;
    if (!s) continue;
    const c = s.lastIndexOf(","), d = s.lastIndexOf(".");
    if (c >= 0 && d >= 0) s = c > d ? s.split(".").join("").replace(",", ".") : s.split(",").join("");
    else if (c >= 0) s = s.replace(",", ".");
    const n = parseFloat(s);
    if (isFinite(n)) out.push(n);
  }
  return out;
}
const sum = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) : null;
const avg = (a: number[]) => a.length ? sum(a)! / a.length : null;
const last = (a: number[]) => a.length ? a[a.length - 1] : null;
const pick = (o: Record<string, unknown>, ...k: string[]) => { for (const x of k) if (o[x] != null && o[x] !== "") return o[x]; return null; };

function todayIn(tz: string, shift = 0) {
  const d = new Date(Date.now() + shift * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const o: Record<string, unknown> = {};
  url.searchParams.forEach((v, k) => { o[k.toLowerCase()] = v; });
  if (req.method === "POST") {
    const raw = await req.text();
    try { const j = JSON.parse(raw); if (j && typeof j === "object") for (const [k, v] of Object.entries(j)) o[k.toLowerCase()] = v; }
    catch { new URLSearchParams(raw).forEach((v, k) => { o[k.toLowerCase()] = v; }); }
  }
  const token = String(pick(o, "t", "token") || "").trim();
  if (token.length < 20) return new Response("❌ Chýba token. Skopíruj ho v appke: Profil → Hodinky.", { status: 400, headers: CORS });

  // dátum: yyyy-mm-dd, alebo day=-1 pre včerajšok, inak dnes (Bratislava)
  let date = String(pick(o, "date", "d") || "").slice(0, 10);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) date = todayIn("Europe/Bratislava", Math.max(-7, Math.min(0, Number(pick(o, "day")) || 0)));

  let steps = sum(nums(pick(o, "steps", "kroky")));
  let kcal = sum(nums(pick(o, "kcal", "active_kcal", "energy", "active")));
  let sleep = sum(nums(pick(o, "sleep", "spanok", "sleep_h")));
  let hr = avg(nums(pick(o, "hr", "resting_hr", "pulse")));
  let weight = last(nums(pick(o, "weight", "vaha", "weight_kg")));
  if (sleep != null) { if (sleep > 1000) sleep /= 3600; else if (sleep > 24) sleep /= 60; }
  if (weight != null && weight > 400) weight /= 1000; // gramy
  const clamp = (v: number | null, lo: number, hi: number) => v == null || v < lo || v > hi ? null : v;
  steps = clamp(steps, 0, 150000); kcal = clamp(kcal, 0, 10000); sleep = clamp(sleep, 0, 24); hr = clamp(hr, 25, 200); weight = clamp(weight, 25, 350);
  if ([steps, kcal, sleep, hr, weight].every((v) => v == null)) return new Response("⚠️ Neprišli žiadne dáta. Skontroluj, či má Skratka prístup k Zdraviu.", { status: 400, headers: CORS });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await sb.rpc("health_ingest", {
    p_token: token, p_date: date,
    p_steps: steps == null ? null : Math.round(steps), p_kcal: kcal == null ? null : Math.round(kcal),
    p_sleep: sleep == null ? null : Math.round(sleep * 100) / 100, p_hr: hr == null ? null : Math.round(hr),
    p_weight: weight == null ? null : Math.round(weight * 100) / 100,
  });
  if (error) return new Response("❌ Chyba servera: " + error.message, { status: 500, headers: CORS });
  if (!data?.ok) return new Response(data?.error === "bad_token" ? "❌ Neplatný token. Skopíruj nový v appke: Profil → Hodinky." : "❌ Neplatný dátum.", { status: 400, headers: CORS });

  const parts: string[] = [];
  if (steps != null) parts.push(`${Math.round(steps).toLocaleString("sk-SK")} krokov`);
  if (kcal != null) parts.push(`${Math.round(kcal)} kcal aktivita`);
  if (sleep != null) parts.push(`spánok ${Math.floor(sleep)} h ${Math.round((sleep % 1) * 60)} min`);
  if (hr != null) parts.push(`pokojový pulz ${Math.round(hr)}`);
  if (weight != null) parts.push(`váha ${weight.toFixed(1)} kg`);
  return new Response(`✅ Druhý dych: ${parts.join(", ")}`, { headers: CORS });
});
