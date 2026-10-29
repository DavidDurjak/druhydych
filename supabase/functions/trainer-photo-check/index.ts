// GainTrain: jemna kontrola profilovej fotky trénera. Odmietne len zjavne nepoužiteľné fotky (žiadny človek, tvár nie je vidieť, skupina, logo/kresba/jedlo/zviera).
// Nikdy neodmieta pre štýl, kvalitu ani podozrenie na stock fotku. Pri chybe AI fotku nezablokuje (profil aj tak schvaľuje správca).
// v4: volať ju môže len prihlásený používateľ (overenie cez Supabase Auth), nie hocikto s verejným kľúčom appky.
import { createClient } from "jsr:@supabase/supabase-js@2";
const KEY = Deno.env.get("GEMINI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MODELS = [Deno.env.get("GEMINI_MODEL_LITE") || "gemini-3.5-flash-lite", Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash"];
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const PROMPT = `You do a LENIENT check of a profile photo for a fitness coach marketplace. When in doubt, ACCEPT.
ACCEPT (ok=true) if the photo shows one person as the main subject whose face is reasonably visible (portrait, upper body or full body, studio or gym or outdoor, any style or quality, professional or stock-looking photos are fine).
REJECT (ok=false) ONLY if clearly: no person at all; the face is not visible at all (back of head, fully covered or cut off); several people with no clear main subject; a drawing, cartoon, logo, meme, food, animal, product, car, text or screenshot; or the image is black or blank.
Do NOT judge whether the photo looks like stock, edited, retouched, professional or AI-made. Never reject for style.
Answer ONLY with JSON: {"ok": boolean, "reason": string}. reason is a short Slovak sentence addressed to the user ("ty") saying what is wrong and what to upload; empty string when ok is true.`;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = token ? await createClient(SUPABASE_URL, SERVICE).auth.getUser(token) : { data: null };
  if (!u?.user) return json({ error: "Prihlás sa znova." }, 401);
  let body: { image?: string } = {};
  try { body = await req.json(); } catch { return json({ error: "bad" }, 400); }
  const img = String(body.image || "").replace(/^data:image\/\w+;base64,/, "");
  if (!img || img.length > 900_000) return json({ ok: false, reason: "Fotka je príliš veľká alebo prázdna. Skús inú." });
  if (!KEY) return json({ ok: true, skipped: true });
  for (const m of MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(25000),
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: PROMPT }, { inline_data: { mime_type: "image/jpeg", data: img } }] }], generationConfig: { temperature: 0, responseMimeType: "application/json" } }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error?.message || "AI " + r.status);
      const txt = (j?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
      const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
      const o = JSON.parse(a >= 0 && b > a ? txt.slice(a, b + 1) : "{}");
      if (typeof o.ok !== "boolean") throw new Error("format");
      return json({ ok: o.ok, reason: o.ok ? "" : String(o.reason || "Nahraj fotku, na ktorej je dobre vidieť tvoju tvár.").slice(0, 240) });
    } catch (e) { console.error("photo-check", m, String((e as Error).message).slice(0, 200)); }
  }
  return json({ ok: true, skipped: true });
});
