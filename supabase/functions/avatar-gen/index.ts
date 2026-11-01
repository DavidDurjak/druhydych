// GainTrain: Avatar štúdio (v313). Z vybraného vzhľadu (a voliteľne zo selfie) nakreslí AI realistického avatara na profilovku.
// Do AI ide len pevne poskladaný anglický popis z povolených možností (žiadny voľný text od používateľa), selfie sa NEUKLADÁ.
// Úprava hotového avatara: pošle sa predchádzajúci obrázok a len zmenené vlastnosti, aby ostala rovnaká tvár.
// Limit: AVATAR_DAILY (predvolene 8) za deň na človeka, počíta sa cez ai_usage (funkcia "avatar"); keď AI zlyhá, pokus sa vráti.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
// obrázky môžu ísť cez samostatný kľúč z projektu so zapnutou platbou (GEMINI_IMAGE_KEY), ostatné AI ostáva na pôvodnom kľúči
const KEY = Deno.env.get("GEMINI_IMAGE_KEY") || Deno.env.get("GEMINI_API_KEY") || "";
const MODELS = [...new Set([Deno.env.get("AVATAR_MODEL") || "gemini-3.1-flash-image-preview", "gemini-3.1-flash-image", "gemini-2.5-flash-image"])];
const DAILY = Number(Deno.env.get("AVATAR_DAILY") || 8);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// povolené hodnoty: kľúč -> anglický popis pre AI ("keep" = ako na fotke / bez zmeny)
const O: Record<string, Record<string, string>> = {
  style: {
    real3d: "a premium, highly realistic 3D character render in the quality of a modern AAA video game cinematic (MetaHuman level): lifelike skin with subtle pores and subsurface scattering, individually rendered hair strands, natural eyes with catchlights, physically based materials",
    photo: "a photorealistic professional studio portrait photograph, shot on a full frame camera with an 85mm lens, natural skin texture, shallow depth of field",
    anim: "a polished stylized 3D animated feature film character: appealing slightly exaggerated proportions, soft clean shading, expressive eyes, still clearly a believable adult human",
  },
  gender: { m: "a man", f: "a woman" },
  age: { a18: "in their early twenties", a25: "in their late twenties", a35: "in their late thirties", a45: "in their late forties", a55: "in their late fifties" },
  build: { slim: "slim, lean build", fit: "fit athletic build", muscular: "very muscular bodybuilder build with a thick neck, broad shoulders and big traps", big: "big, broad, heavyset strong build" },
  skin: { s1: "very fair porcelain skin", s2: "fair skin", s3: "light skin with warm undertones", s4: "light olive skin", s5: "medium tan skin", s6: "light brown skin", s7: "brown skin", s8: "deep dark brown skin" },
  expr: { smile: "a warm, friendly open smile showing teeth", soft: "a subtle confident closed mouth smile", serious: "a focused, determined, confident serious expression" },
  eyes: { brown: "brown eyes", dark: "dark brown eyes", hazel: "hazel eyes", green: "green eyes", blue: "blue eyes", gray: "gray eyes" },
  beard: { none: "clean shaven, no facial hair", stubble: "light stubble", short: "a short, neatly trimmed beard", full: "a full thick well groomed beard", goatee: "a goatee", mustache: "a mustache only" },
  hair: {
    buzz: "a very short buzz cut", fade: "a skin fade with a longer textured top", crop: "a textured French crop with a short fringe", slick: "hair slicked back", side: "a classic side part", medium: "medium length hair", curly: "short curly hair", long: "long straight hair",
    wavy: "long wavy hair", pony: "a sleek high ponytail", bun: "a top bun", bob: "a chin length bob", pixie: "a pixie cut", braids: "box braids", cornrows: "cornrows", locs: "locs", afro: "a natural afro", bald: "a clean shaved bald head",
  },
  hairc: { black: "black", dbrown: "dark brown", brown: "medium brown", auburn: "auburn", blond: "golden blond", platinum: "platinum blond", red: "ginger red", gray: "salt and pepper gray" },
  outfit: { tee: "fitted crew neck t-shirt", tank: "gym tank top", hoodie: "hoodie", comp: "tight compression training shirt", zip: "sporty zip up training jacket", bra: "sports bra with a light open zip jacket over it" },
  color: { black: "black", white: "white", gray: "heather gray", navy: "navy blue", green: "deep emerald green", red: "deep red", beige: "beige", pink: "dusty pink" },
  glasses: { none: "no glasses", square: "modern square glasses", round: "round glasses", metal: "thin metal frame glasses", sun: "sporty sunglasses" },
  hat: { none: "no headwear", cap: "a plain baseball cap without any logo", beanie: "a knit beanie", band: "a sport headband" },
  extra: { none: "no accessories", chain: "a thin silver chain necklace", earrings: "small stud earrings", headphones: "over ear headphones resting around the neck" },
  bg: {
    studio: "a dark charcoal studio backdrop with soft vignette",
    green: "a smooth gradient backdrop from deep forest green to near black, with a soft mint green rim light",
    gym: "a softly blurred modern gym in the background with warm bokeh lights",
    outdoor: "a softly blurred outdoor park at golden hour",
    light: "a clean light gray seamless studio backdrop",
  },
};
const LABEL_EN: Record<string, string> = { gender: "gender", age: "age", build: "body build", skin: "skin tone", expr: "facial expression", eyes: "eye color", beard: "facial hair", hair: "hairstyle", hairc: "hair color", outfit: "clothing", color: "clothing color", glasses: "glasses", hat: "headwear", extra: "accessories", bg: "background" };

function clean(raw: unknown): Record<string, string> {
  const o: Record<string, string> = {};
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  for (const k of Object.keys(O)) { const v = String(src[k] ?? ""); if (v && v !== "keep" && O[k][v]) o[k] = v; }
  if (!o.style) o.style = "real3d";
  if (o.gender === "f" && o.beard) delete o.beard;
  return o;
}

function look(o: Record<string, string>): string[] {
  const L: string[] = [];
  const who = [o.gender ? O.gender[o.gender] : "", o.age ? O.age[o.age] : ""].filter(Boolean).join(" ");
  if (who) L.push(`Person: ${who}.`);
  if (o.build) L.push(`Body: ${O.build[o.build]}.`);
  if (o.skin) L.push(`Skin: ${O.skin[o.skin]}.`);
  if (o.expr) L.push(`Expression: ${O.expr[o.expr]}.`);
  if (o.eyes) L.push(`Eyes: ${O.eyes[o.eyes]}.`);
  if (o.beard) L.push(`Facial hair: ${O.beard[o.beard]}.`);
  if (o.hair || o.hairc) L.push(`Hair: ${o.hair ? O.hair[o.hair] : "hairstyle unchanged"}${o.hairc && o.hair !== "bald" ? `, ${O.hairc[o.hairc]} color` : ""}.`);
  if (o.outfit || o.color) L.push(`Clothing: ${o.outfit ? "a " : "the same top, recolored "}${o.color ? O.color[o.color] + " " : ""}${o.outfit ? O.outfit[o.outfit] : ""}`.trim() + ", plain, no logos or text.");
  if (o.glasses) L.push(`Glasses: ${O.glasses[o.glasses]}.`);
  if (o.hat) L.push(`Headwear: ${O.hat[o.hat]}.`);
  if (o.extra) L.push(`Accessories: ${O.extra[o.extra]}.`);
  if (o.bg) L.push(`Background: ${O.bg[o.bg]}.`);
  return L;
}

const FRAME = "Composition: square 1:1 profile picture, head and upper shoulders, the face centered and filling about half of the frame, looking straight at the camera, eye level, flattering soft key light with gentle fill and a subtle rim light. One single person only. No text, no letters, no watermark, no logos, no frame or border.";

function buildPrompt(o: Record<string, string>, mode: "new" | "selfie" | "edit", changed: string[]): string {
  if (mode === "edit") {
    const ch = changed.filter((k) => k === "style" || o[k]);
    const lines = look(Object.fromEntries(ch.filter((k) => k !== "style").map((k) => [k, o[k]])));
    return [
      "Edit the attached avatar image. Keep the exact same person: same face, facial structure, identity, age and proportions, the same framing, camera angle and lighting setup.",
      ch.includes("style") ? `Re-render it as ${O.style[o.style]}, keeping the same person and design.` : `Keep the same rendering style: ${O.style[o.style]}.`,
      lines.length ? "Change only these things:\n" + lines.join("\n") : "Make a fresh, higher quality take of the same avatar.",
      "Everything not listed stays exactly as it is.",
      FRAME,
    ].join("\n");
  }
  const base = mode === "selfie"
    ? `Create a profile avatar of the person in the attached photo as ${O.style[o.style]}. The likeness is the most important thing: keep their real face shape, eyes, nose, mouth, eyebrows, skin tone and distinctive features so friends instantly recognize them. Ignore the photo's background, lighting and clothing.`
    : `Create a profile avatar of an original, ordinary looking person (not a celebrity) as ${O.style[o.style]}.`;
  const lines = look(o);
  return [
    base,
    lines.length ? (mode === "selfie" ? "Apply these choices (anything not listed stays as in the photo):\n" : "Look:\n") + lines.join("\n") : "",
    "Tasteful, natural, attractive but realistic, suitable as a fitness app profile picture. Fully clothed.",
    FRAME,
  ].filter(Boolean).join("\n");
}

const b64ok = (s: unknown, max: number) => typeof s === "string" && s.length > 2000 && s.length < max && /^[A-Za-z0-9+/=]+$/.test(s.slice(0, 200));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Zlá požiadavka." }, 405);
  const auth = req.headers.get("Authorization") || "";
  const userDb = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userDb.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return json({ error: "Prihlás sa znova." }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE);

  let body: { opts?: unknown; selfie?: string; prev?: string; changed?: string[]; check?: boolean } = {};
  try { body = await req.json(); } catch { return json({ error: "Zlá požiadavka." }, 400); }

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bratislava" }).format(new Date()); // rovnaký deň ako v ai_usage
  const usedNow = async () => {
    const { data } = await admin.from("ai_usage").select("n").eq("user_id", uid).eq("feature", "avatar").eq("day", day).maybeSingle();
    return Number(data?.n || 0);
  };
  if (body.check) { const n = await usedNow().catch(() => 0); return json({ left: Math.max(DAILY - n, 0), limit: DAILY, day }); }

  const o = clean(body.opts);
  const prev = b64ok(body.prev, 4_000_000) ? body.prev! : "";
  const selfie = !prev && b64ok(body.selfie, 4_000_000) ? body.selfie! : "";
  const changed = (Array.isArray(body.changed) ? body.changed : []).map(String).filter((k) => k === "style" || k in LABEL_EN).slice(0, 20);
  const mode: "new" | "selfie" | "edit" = prev ? "edit" : selfie ? "selfie" : "new";
  if (mode === "new" && !o.gender) return json({ error: "Vyber, či je avatar muž alebo žena." }, 400);
  if (!KEY) return json({ error: "AI zatiaľ nie je zapnutá (chýba kľúč na serveri)." }, 503);

  // limit
  let take: any = { ok: true, used: 1 };
  try { const { data } = await admin.rpc("ai_take", { p_uid: uid, p_feature: "avatar" }); if (data) take = data; } catch (_) { /* radšej povoliť */ }
  const refund = () => admin.rpc("ai_refund", { p_uid: uid, p_feature: "avatar" }).then(() => {}, () => {});
  if (take.ok === false) return json({ error: "Dnešné pokusy sú minuté. Zajtra sa obnovia.", left: 0 }, 429);
  if (Number(take.used || 0) > DAILY) { await refund(); return json({ error: `Dnes si vytvoril už ${DAILY} avatarov. Zajtra môžeš znova.`, left: 0 }, 429); }
  const left = Math.max(DAILY - Number(take.used || 0), 0);

  const prompt = buildPrompt(o, mode, changed);
  const parts: unknown[] = [];
  if (mode === "edit") parts.push({ inline_data: { mime_type: "image/jpeg", data: prev } });
  if (mode === "selfie") parts.push({ inline_data: { mime_type: "image/jpeg", data: selfie } });
  parts.push({ text: prompt });

  const t0 = Date.now();
  let lastErr = "", blocked = false;
  for (const m of MODELS) {
    if (Date.now() - t0 > 100000) break;
    for (const withCfg of [true, false]) {
      try {
        const gc: Record<string, unknown> = { responseModalities: ["IMAGE"] };
        if (withCfg) gc.imageConfig = { aspectRatio: "1:1" };
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(90000),
          body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: gc }),
        });
        const j = await r.json().catch(() => null);
        if (!r.ok) {
          lastErr = j?.error?.message || "AI chyba " + r.status;
          console.error("avatar model", m, withCfg, r.status, String(lastErr).slice(0, 160));
          if (r.status === 400 && withCfg && /imageConfig|aspect|unknown name/i.test(lastErr)) continue; // starší model bez imageConfig
          break; // ďalší model
        }
        const cand = j?.candidates?.[0];
        const img = (cand?.content?.parts || []).find((p: any) => p.inlineData || p.inline_data);
        if (img) {
          const d = img.inlineData || img.inline_data;
          console.log("avatar ok", m, mode, Date.now() - t0, "ms");
          return json({ image: d.data, mime: d.mimeType || d.mime_type || "image/png", left, model: m });
        }
        const fr = String(cand?.finishReason || j?.promptFeedback?.blockReason || "");
        lastErr = "bez obrázka " + fr;
        console.error("avatar model", m, "no image", fr);
        if (/SAFETY|PROHIBITED|BLOCK|RECITATION/i.test(fr)) blocked = true;
        break;
      } catch (e) { lastErr = String((e as Error).message); console.error("avatar model", m, lastErr.slice(0, 160)); break; }
    }
    if (blocked) break;
  }
  await refund();
  if (blocked) return json({ error: mode === "selfie" ? "Z tejto fotky sa avatar nedá spraviť. Skús inú fotku, kde je dobre vidno tvoju tvár." : "Tento avatar sa nepodarilo vytvoriť. Skús zmeniť niektorú voľbu." , left: left + 1 }, 422);
  const quota = /quota|exhausted|billing/i.test(lastErr);
  return json({ error: quota ? "Kapacita AI na obrázky je dnes vyčerpaná. Skús to neskôr." : "AI je teraz vyťažená. Skús to o chvíľu.", left: left + 1 }, 502);
});
