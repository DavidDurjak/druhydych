// GainTrain: zmazanie účtu s 30-dňovou lehotou (ako TikTok a Instagram).
// 1) Prihlásený používateľ (aj staršia verzia appky, ktorá volá túto funkciu): účet sa len deaktivuje cez request_account_deletion,
//    natrvalo sa zmaže o 30 dní. Prihlásením sa dá dovtedy obnoviť.
// 2) Denný cron (hlavička x-cron-secret): natrvalo zmaže účty, ktorým uplynula lehota: najprv súbory zo storage, potom účet;
//    databázové riadky zmaže kaskáda.
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function purgeUser(admin: ReturnType<typeof createClient>, uid: string) {
  for (const bucket of ["progress-photos", "feedback", "trainer-photos", "trainer-proofs"]) {
    for (let i = 0; i < 20; i++) {
      const { data, error } = await admin.storage.from(bucket).list(uid, { limit: 100 });
      if (error || !data || !data.length) break;
      const { error: re } = await admin.storage.from(bucket).remove(data.map((f) => `${uid}/${f.name}`));
      if (re) throw new Error(re.message);
    }
  }
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error && !/not.?found/i.test(error.message)) throw new Error(error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Zlá požiadavka." }, 405);
  const admin = createClient(URL_, SERVICE);

  // denné natrvalo zmazanie po uplynutí lehoty
  const cron = req.headers.get("x-cron-secret");
  if (cron) {
    const { data: secret } = await admin.rpc("get_cron_secret");
    if (!secret || cron !== secret) return json({ error: "forbidden" }, 403);
    const { data: due, error } = await admin.from("account_deletions").select("user_id").lte("purge_at", new Date().toISOString()).limit(50);
    if (error) return json({ error: error.message }, 500);
    let done = 0; const failed: string[] = [];
    for (const r of due || []) {
      try { await purgeUser(admin, r.user_id); done++; } catch (e) { failed.push(r.user_id); console.error("purge", r.user_id, String((e as Error).message).slice(0, 200)); }
    }
    return json({ ok: true, purged: done, failed: failed.length });
  }

  // prihlásený používateľ: len deaktivácia s lehotou 30 dní
  const auth = req.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return json({ error: "Prihlás sa znova." }, 401);
  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch (_) { /* nič */ }
  if (body.confirm !== "ZMAZAT") return json({ error: "Chýba potvrdenie." }, 400);
  const user = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
  const { data, error } = await user.rpc("request_account_deletion");
  if (error) { console.error("schedule", error.message.slice(0, 200)); return json({ error: "Účet sa nepodarilo zmazať. Skús to znova alebo nám napíš." }, 500); }
  return json({ ok: true, purge_at: data });
});
