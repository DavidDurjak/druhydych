// Fuelwind: prepis hlasovej správy pre AI pomocníka. Audio sa NEUKLADÁ, vráti sa iba text.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-flash-latest"];
const MAX_B64 = 2_500_000; // ~1,8 MB audia, zhruba 2 minúty
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const bursts = new Map<string, number[]>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const user = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await user.auth.getUser();
  if (!u?.user) return json({ error: "Prihlás sa znova." }, 401);
  const now = Date.now();
  const hits = (bursts.get(u.user.id) || []).filter((t) => now - t < 60000);
  if (hits.length >= 8) return json({ error: "Príliš rýchlo. Počkaj chvíľu." }, 429);
  bursts.set(u.user.id, [...hits, now]);
  let b: { audio?: string; mime?: string; lang?: string } = {};
  try { b = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }
  const audio = String(b.audio || "");
  if (!audio || audio.length > MAX_B64) return json({ error: "Hlasovka je prázdna alebo príliš dlhá." }, 400);
  if (!KEY) return json({ error: "Prepis hlasu zatiaľ nie je zapnutý." }, 503);
  const mime = /^(audio|video)\/[\w.+-]+/.test(String(b.mime || "")) ? String(b.mime).split(";")[0] : "audio/mp4";
  const lang = String(b.lang || "sk").slice(0, 5).replace(/[^a-zA-Z-]/g, "");
  const prompt = `Transcribe this short voice message exactly as spoken. The speaker most likely uses the language with code "${lang}" (talking to a nutrition and fitness coach), but transcribe whatever language is actually spoken. Output ONLY the transcript text with natural punctuation. No quotes, no comments, no translation. If there is no intelligible speech, output an empty string.`;
  let quota = 0, last = "";
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ inlineData: { mimeType: mime, data: audio } }, { text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 600 } }),
      });
      const resp = await r.json().catch(() => null);
      if (r.ok) {
        const text = (resp?.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || "").join("").trim().replace(/^["„]|["“]$/g, "").slice(0, 1000);
        return json({ text });
      }
      last = resp?.error?.message || "chyba " + r.status;
      console.error("voice-stt", m, r.status, String(last).slice(0, 140));
      if (r.status === 429 || /quota/i.test(last)) quota++;
    } catch (_) { last = "timeout"; }
  }
  return json({ error: quota >= MODELS.length ? "Prepis hlasu je dočasne preťažený. Napíš správu alebo skús o chvíľu." : "Hlasovku sa nepodarilo prepísať." }, 502);
});
