// GainTrain: vstup do skupinového tréningu naživo (Daily.co).
// Pustí len trénera tréningu a pozvaných klientov s aktívnou spoluprácou, a len v okne 15 minút pred začiatkom až 30 minút po konci.
// Klient, ktorý ešte nepotvrdil účasť, sa vstupom prihlási (ak je voľné miesto). Tréner dostane práva hostiteľa (stlmiť, vyhodiť, zdieľať obrazovku).
import { createClient } from "jsr:@supabase/supabase-js@2";

const DAILY = Deno.env.get("DAILY_API_KEY") || "";
const DOMAIN = Deno.env.get("DAILY_DOMAIN") || "gaintrain";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const dj = (path: string, init: RequestInit = {}) => fetch("https://api.daily.co/v1" + path, { ...init, headers: { Authorization: "Bearer " + DAILY, "Content-Type": "application/json", ...(init.headers || {}) } });
const EARLY_MIN = 15, LATE_MIN = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Zlá požiadavka." }, 405);
  if (!DAILY) return json({ error: "Videohovory zatiaľ nie sú nastavené." }, 503);
  const admin = createClient(URL_, SERVICE);
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  const me = u?.user?.id;
  if (!me) return json({ error: "Prihlás sa znova." }, 401);
  const body = await req.json().catch(() => ({}));
  const sid = String(body.session || "");
  if (!/^[0-9a-f-]{36}$/i.test(sid)) return json({ error: "Tréning sme nenašli." }, 400);

  const { data: s } = await admin.from("group_sessions").select("id,trainer_id,title,starts_at,duration_min,capacity,status,started_at").eq("id", sid).maybeSingle();
  if (!s) return json({ error: "Tréning sme nenašli." }, 404);
  const owner = s.trainer_id === me;
  if (s.status !== "scheduled") return json({ error: "Tréning je zrušený." }, 410);
  const start = new Date(s.starts_at).getTime(), end = start + s.duration_min * 60e3;
  const now = Date.now();
  if (now < start - EARLY_MIN * 60e3) {
    const mins = Math.ceil((start - EARLY_MIN * 60e3 - now) / 60e3);
    return json({ error: `Miestnosť sa otvorí 15 minút pred začiatkom${mins < 120 ? `, o ${mins} min` : ""}.`, code: "early" }, 425);
  }
  if (now > end + LATE_MIN * 60e3) return json({ error: "Tréning už skončil.", code: "over" }, 410);

  let name = "Účastník";
  if (owner) {
    const { data: tp } = await admin.from("trainer_profiles").select("display_name,approved").eq("user_id", me).maybeSingle();
    if (!tp?.approved) return json({ error: "Tvoj trénerský profil nie je schválený." }, 403);
    name = tp.display_name || "Tréner";
  } else {
    const [{ data: inv }, { data: link }] = await Promise.all([
      admin.from("group_invites").select("rsvp").eq("session_id", sid).eq("client_id", me).maybeSingle(),
      admin.from("trainer_clients").select("client_name").eq("trainer_id", s.trainer_id).eq("client_id", me).eq("status", "active").limit(1).maybeSingle(),
    ]);
    if (!inv || !link) return json({ error: "Na tento tréning nie si pozvaný." }, 403);
    if (inv.rsvp !== "going") {
      const { count } = await admin.from("group_invites").select("client_id", { count: "exact", head: true }).eq("session_id", sid).eq("rsvp", "going");
      if ((count || 0) >= s.capacity) return json({ error: "Tréning je plný.", code: "full" }, 409);
      await admin.from("group_invites").update({ rsvp: "going" }).eq("session_id", sid).eq("client_id", me);
    }
    const { data: p } = await admin.from("profiles").select("name").eq("id", me).maybeSingle();
    name = link.client_name || p?.name || "Účastník";
  }

  const room = "gs-" + sid.replace(/-/g, "").slice(0, 24);
  const exp = Math.floor((end + LATE_MIN * 60e3) / 1000);
  const props = {
    max_participants: Math.min(60, s.capacity + 2), exp, eject_at_room_exp: true,
    enable_prejoin_ui: true, enable_people_ui: true, enable_chat: true, enable_emoji_reactions: true, enable_hand_raising: true,
    enable_screenshare: true, enable_pip_ui: true, enable_noise_cancellation_ui: true, enable_knocking: false, start_video_off: false, lang: "en",
  };
  let r = await dj("/rooms/" + room);
  if (r.status === 404) {
    r = await dj("/rooms", { method: "POST", body: JSON.stringify({ name: room, privacy: "private", properties: props }) });
    if (r.status === 400) { // Daily nepozná niektorú voľbu: miestnosť aspoň so základmi
      console.error("daily room props", (await r.text()).slice(0, 200));
      r = await dj("/rooms", { method: "POST", body: JSON.stringify({ name: room, privacy: "private", properties: { max_participants: props.max_participants, exp, enable_chat: true, enable_screenshare: true, enable_prejoin_ui: true } }) });
    }
  }
  else if (r.ok) r = await dj("/rooms/" + room, { method: "POST", body: JSON.stringify({ properties: { exp, max_participants: props.max_participants } }) });
  if (!r.ok) { console.error("daily room", r.status, (await r.text()).slice(0, 200)); return json({ error: "Miestnosť sa nepodarilo otvoriť. Skús to znova." }, 502); }

  // jazyk obrazovky hovoru podľa appky (Daily nevie po slovensky, vtedy angličtina)
  const DL: Record<string, string> = { da: "da", de: "de", en: "en", es: "es", fi: "fi", fr: "fr", it: "it", ja: "jp", ka: "ka", nl: "nl", no: "no", pl: "pl", pt: "pt", "pt-br": "pt-BR", ru: "ru", sv: "sv", tr: "tr" };
  const lang = DL[String(body.lang || "").toLowerCase()] || DL[String(body.lang || "").toLowerCase().split("-")[0]] || "en";
  const tokenProps: Record<string, unknown> = {
    room_name: room, user_name: String(name).slice(0, 40), user_id: me, exp, is_owner: owner,
    enable_screenshare: owner, start_audio_off: !owner, start_video_off: false, lang,
  };
  let tr = await dj("/meeting-tokens", { method: "POST", body: JSON.stringify({ properties: tokenProps }) });
  if (tr.status === 400) { delete tokenProps.lang; tr = await dj("/meeting-tokens", { method: "POST", body: JSON.stringify({ properties: tokenProps }) }); }
  const tj = await tr.json().catch(() => null);
  if (!tr.ok || !tj?.token) { console.error("daily token", tr.status, JSON.stringify(tj).slice(0, 200)); return json({ error: "Miestnosť sa nepodarilo otvoriť. Skús to znova." }, 502); }

  if (owner && !s.started_at) await admin.from("group_sessions").update({ started_at: new Date().toISOString() }).eq("id", sid);
  if (!owner) await admin.from("group_invites").update({ joined_at: new Date().toISOString() }).eq("session_id", sid).eq("client_id", me);
  return json({ url: `https://${DOMAIN}.daily.co/${room}`, token: tj.token, owner, title: s.title, ends_at: new Date(end).toISOString() });
});
