// Fuelwind: odosielanie web push notifikácií z fronty push_queue
// Volá sa každých 5 minút (pg_cron -> pg_net). Kľúče sú v Supabase Vault.
// v3: notifikácie v jazyku používateľa (profiles.lang). Texty sa píšu po slovensky a prekladajú sa cez spoločný slovník
// appky (funkcia i18n, tabuľka i18n): čísla sa nahradia {0}, {1}…, takže sa ten istý text prekladá len raz pre všetkých.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NUM = /\d+(?:[.,]\d+)?/g;

// "3 z 8 pohárov" -> { t: "{0} z {1} pohárov", n: ["3", "8"] }
function tmpl(s: string) { const n: string[] = []; const t = String(s || "").replace(NUM, (m) => `{${n.push(m) - 1}}`); return { t, n }; }
const fill = (t: string, n: string[]) => t.replace(/\{(\d+)\}/g, (_, i) => n[Number(i)] ?? "");

async function translate(lang: string, strings: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const uniq = [...new Set(strings.filter((s) => s && /\p{L}/u.test(s)))];
  for (let i = 0; i < uniq.length; i += 100) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/i18n`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ lang, strings: uniq.slice(i, i + 100) }), signal: AbortSignal.timeout(55000),
      });
      const j = await r.json().catch(() => null);
      Object.assign(map, j?.map || {});
    } catch (_) { /* bez prekladu ostane slovenčina */ }
  }
  return map;
}

Deno.serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: secrets, error: sErr } = await sb.rpc("get_push_secrets");
  if (sErr || !secrets?.length) return new Response("secrets missing", { status: 500 });
  const S: Record<string, string> = {};
  for (const s of secrets) S[s.name] = s.secret;

  // ochrana: volá to len cron so zdieľaným tajomstvom
  const auth = req.headers.get("x-cron-secret") || new URL(req.url).searchParams.get("s") || "";
  if (auth !== S.cron_secret) return new Response("forbidden", { status: 403 });

  webpush.setVapidDetails("mailto:dejvid.durjak@gmail.com", S.vapid_public, S.vapid_private);

  // 1) naplánuj nové pripomienky
  const { data: planned } = await sb.rpc("plan_reminders");

  // 2) neodoslané z fronty
  const { data: queue, error } = await sb.from("push_queue").select("*").eq("sent", false).order("created_at").limit(200);
  if (error) return new Response(error.message, { status: 500 });
  if (!queue?.length) return Response.json({ planned, sent: 0 });

  const userIds = [...new Set(queue.map((q: any) => q.user_id))];
  const [{ data: subs }, { data: profs }] = await Promise.all([
    sb.from("push_subscriptions").select("*").in("user_id", userIds),
    sb.from("profiles").select("id,lang").in("id", userIds),
  ]);
  const byUser: Record<string, any[]> = {};
  (subs || []).forEach((s: any) => { (byUser[s.user_id] ||= []).push(s); });
  const langOf: Record<string, string> = {};
  (profs || []).forEach((p: any) => { langOf[p.id] = String(p.lang || "sk"); });

  // 3) preklad do jazyka používateľa
  const texts = new Map<number, { title: string; body: string }>();
  const byLang: Record<string, { id: number; tt: { t: string; n: string[] }; tb: { t: string; n: string[] } }[]> = {};
  for (const q of queue) {
    const lang = langOf[q.user_id] || "sk";
    texts.set(q.id, { title: q.title, body: q.body });
    if (lang === "sk") continue;
    (byLang[lang] ||= []).push({ id: q.id, tt: tmpl(q.title), tb: tmpl(q.body) });
  }
  for (const [lang, items] of Object.entries(byLang)) {
    const map = await translate(lang, items.flatMap((x) => [x.tt.t, x.tb.t]));
    for (const x of items) {
      const title = map[x.tt.t] ? fill(map[x.tt.t], x.tt.n) : null, body = map[x.tb.t] ? fill(map[x.tb.t], x.tb.n) : null;
      if (title || body) texts.set(x.id, { title: title || texts.get(x.id)!.title, body: body || texts.get(x.id)!.body });
    }
  }

  let sent = 0; const dead: number[] = []; const okIds: number[] = [];
  for (const q of queue) {
    const tx = texts.get(q.id)!;
    for (const s of (byUser[q.user_id] || [])) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: tx.title, body: tx.body, url: q.url || "#/", tag: q.tag || "dd" }),
          { TTL: 3600 },
        );
        sent++; okIds.push(s.id);
      } catch (e: any) {
        const code = e?.statusCode || 0;
        if (code === 404 || code === 410) dead.push(s.id);
        else await sb.from("push_subscriptions").update({ fail_count: (s.fail_count || 0) + 1 }).eq("id", s.id);
      }
    }
  }
  await sb.from("push_queue").update({ sent: true }).in("id", queue.map((q: any) => q.id));
  if (okIds.length) await sb.from("push_subscriptions").update({ last_ok: new Date().toISOString(), fail_count: 0 }).in("id", okIds);
  if (dead.length) await sb.from("push_subscriptions").delete().in("id", dead);
  await sb.from("push_queue").delete().lt("created_at", new Date(Date.now() - 7 * 864e5).toISOString()).eq("sent", true);

  return Response.json({ planned, queued: queue.length, sent, dead: dead.length, translated: Object.keys(byLang) });
});
