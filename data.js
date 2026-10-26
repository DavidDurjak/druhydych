// Dátová vrstva: všetko, čo komunikuje so Supabase, je tu. UI túto vrstvu len volá.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Supabase knižnica je pribalená priamo v appke (vendor/supabase.mjs vyrába build.js pri nasadení): jeden súbor
// z našej domény, ktorý si appka drží offline. Predtým sa ťahala z cudzieho CDN ako 6 súborov za sebou pri každenom štarte.
// Záloha pre istotu: keby pribalený súbor chýbal, načíta sa rovnaká verzia z CDN.
// Načítava sa asynchrónne (bez top-level await, aby sa nezmenilo poradie spúšťania modulov); app.js pri štarte čaká na `ready`.
const SUPA_VER = '2.117.3';
let client = null;
export const ready = import('./vendor/supabase.mjs')
  .catch(() => import(`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@${SUPA_VER}/+esm`))
  .then(m => (client = m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)));

// `sb` sa správa presne ako Supabase klient (sb.from, sb.auth, sb.rpc…), len odkazuje na klienta vytvoreného po načítaní knižnice
// (vlastnosti nastavené priamo na sb, napr. obal sb.rpc v searchfix.js, majú prednosť)
export const sb = new Proxy({}, {
  get(own, k) {
    if (Object.prototype.hasOwnProperty.call(own, k)) return own[k];
    if (!client) throw new Error('Pripájam sa, skús o sekundu.');
    const v = client[k];
    return typeof v === 'function' ? v.bind(client) : v;
  },
});

function must({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ---------- Auth ----------
export async function getSession() {
  const { data } = await sb.auth.getSession();
  if (data.session) verifyUser();
  return data.session;
}
// Ak bol účet medzitým zmazaný (napr. na inom zariadení), uložené prihlásenie je neplatné a appka by sa zasekávala
// na chybách. Na pozadí overíme, či účet ešte existuje, a ak nie, odhlásime a vrátime na úvod.
let verified = false;
async function verifyUser() {
  if (verified || !navigator.onLine) return; verified = true;
  try {
    const { data, error } = await sb.auth.getUser();
    const gone = error && (error.status === 403 || error.status === 404 || /not.?found|does not exist/i.test(error.message || ''));
    if (gone || (!error && !data?.user)) {
      try { await sb.auth.signOut({ scope: 'local' }); } catch (_) {}
      Object.keys(localStorage).filter(k => /^(fw_|sb-)/.test(k)).forEach(k => localStorage.removeItem(k));
      location.replace(location.pathname);
    }
  } catch (_) { verified = false; }
}
export function onAuthChange(cb) {
  return sb.auth.onAuthStateChange((_e, session) => cb(session));
}
export async function signUp(email, password, name) {
  return must(await sb.auth.signUp({ email, password, options: { data: { name } } }));
}
export async function signIn(email, password) {
  return must(await sb.auth.signInWithPassword({ email, password }));
}
export async function signOut() {
  await sb.auth.signOut();
}

// ---------- Profil ----------
export async function getProfile(userId) {
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function upsertProfile(profile) {
  return must(await sb.from('profiles').upsert(profile, { onConflict: 'id' }).select().single());
}

// ---------- Jedlo ----------
// ---------- Offline: zápis bez signálu ----------
// Bez internetu sa jedlo uloží do telefónu a odošle sa samo po pripojení. Dnešný deň, naposledy zapísané jedlá a už videné výsledky hľadania
// sa držia v telefóne, aby appka fungovala v posilňovni, vo vlaku aj na chate.
const OQ = 'fw_oq', OD = 'fw_od:', OR = 'fw_orec:', OS = 'fw_osr';
const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* plné úložisko: bez cache */ } };
export const isNetErr = e => /failed to fetch|load failed|networkerror|network request failed|connection was lost|internet connection appears to be offline|fetch failed|err_internet_disconnected/i.test(String(e?.message || e)) || e instanceof TypeError;
const isOff = () => navigator.onLine === false || document.documentElement.classList.contains('fw-off');
export const pendingFood = (userId, date) => jget(OQ, []).filter(r => (!userId || r.user_id === userId) && (!date || r.date === date));
const strip = r => { const { _a, ...x } = r; return x; };
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function listFood(userId, date) {
  const key = OD + userId + ':' + date;
  const pend = pendingFood(userId, date).map(strip);
  if (!isOff()) {
    try {
      const rows = must(await sb.from('food_logs').select('*').eq('user_id', userId).eq('date', date).order('created_at'));
      jset(key, rows);
      // staré dni sa čistia, aby úložisko nerástlo
      try { const ks = Object.keys(localStorage).filter(k => k.startsWith(OD)).sort(); while (ks.length > 16) localStorage.removeItem(ks.shift()); } catch (_) { }
      return rows.concat(pend);
    } catch (e) { if (!isNetErr(e)) throw e; }
  }
  const cached = jget(key, null);
  if (!cached && !pend.length) throw new Error('Failed to fetch');
  return (cached || []).concat(pend);
}
const noteAdd = row => { try { window.fwNoteAdd && window.fwNoteAdd(row.source || 'manual'); } catch (_) { } };
export async function addFood(row) {
  noteAdd(row);
  if (!isOff()) {
    try { return must(await sb.from('food_logs').insert(row).select().single()); }
    catch (e) { if (!isNetErr(e)) throw e; }
  }
  const local = { ...row, id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created_at: row.created_at || new Date().toISOString(), _local: true };
  const q = jget(OQ, []); q.push(local); jset(OQ, q);
  try { dispatchEvent(new CustomEvent('fw-queued', { detail: q.length })); } catch (_) { }
  return local;
}
export async function deleteFood(id) {
  if (typeof id === 'string' && id[0] === 'L') { jset(OQ, jget(OQ, []).filter(r => r.id !== id)); return; }
  must(await sb.from('food_logs').delete().eq('id', id));
}
// odošle uložené zápisy (po jednom, aby poradie ostalo); pri zlyhaní siete sa zastaví a skúsi neskôr
let flushing = false;
export async function flushQueue() {
  if (flushing || isOff()) return 0;
  if (!jget(OQ, []).length) return 0;
  flushing = true; let n = 0;
  try {
    for (const lr of jget(OQ, [])) {
      const { id, _local, _a, ...row } = lr;
      let ok = false;
      try { must(await sb.from('food_logs').insert(row)); ok = true; }
      catch (e) {
        if (isNetErr(e)) break;
        // iná chyba (napr. vypršané prihlásenie): zápis ostáva, po piatich neúspešných pokusoch sa zahodí
        const q = jget(OQ, []).map(r => r.id === id ? { ...r, _a: (r._a || 0) + 1 } : r).filter(r => (r._a || 0) < 5);
        jset(OQ, q); break;
      }
      if (ok) { jset(OQ, jget(OQ, []).filter(r => r.id !== id)); localStorage.removeItem(OD + row.user_id + ':' + row.date); n++; }
    }
  } finally { flushing = false; }
  if (n) { try { dispatchEvent(new CustomEvent('fw-synced', { detail: n })); } catch (_) { } }
  return n;
}
// Naposledy zalogované jedlá (na rýchle opakovanie)
export async function recentFoods(userId, limit = 30) {
  const rows = must(await sb.from('food_logs').select('name,brand,grams,kcal,protein,carbs,fat,source,barcode,created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(200));
  const seen = new Set(); const out = [];
  for (const r of rows) {
    const key = (r.name + '|' + (r.brand || '')).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key); out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}
export async function foodTotalsRange(userId, fromDate, toDate) {
  return must(await sb.from('food_logs').select('date,kcal,protein').eq('user_id', userId).gte('date', fromDate).lte('date', toDate));
}

// ---------- Váha ----------
export async function listWeights(userId) {
  return must(await sb.from('weight_logs').select('*').eq('user_id', userId).order('date'));
}
export async function upsertWeight(row) {
  return must(await sb.from('weight_logs').upsert(row, { onConflict: 'user_id,date' }).select().single());
}
export async function deleteWeight(id) {
  must(await sb.from('weight_logs').delete().eq('id', id));
}

// ---------- Check-in ----------
export async function getCheckin(userId, date) {
  const { data, error } = await sb.from('checkins').select('*').eq('user_id', userId).eq('date', date).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function upsertCheckin(row) {
  return must(await sb.from('checkins').upsert(row, { onConflict: 'user_id,date' }).select().single());
}

// ---------- Kouč ----------
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export async function coachOverview(fromDate) {
  // všetky dotazy naraz, nie jeden po druhom (Kouč sa inak načítaval niekoľko sekúnd)
  const [profiles, weights, foods, checkins] = await Promise.all([
    sb.from('profiles').select('*').order('name').then(must),
    sb.from('weight_logs').select('user_id,date,weight_kg').order('date').then(must),
    sb.from('food_logs').select('user_id,date,kcal').gte('date', fromDate).lte('date', todayISO()).then(must),
    sb.from('checkins').select('user_id,date,sleep_h,steps,mood').gte('date', fromDate).then(must),
  ]);
  return { profiles, weights, foods, checkins };
}

// ---------- v0.2 ----------
// Fotky
export async function listPhotos(userId) {
  return must(await sb.from('progress_photos').select('*').eq('user_id', userId).order('date'));
}
export async function uploadPhoto(userId, date, pose, file) {
  const ext = (file.type && file.type.split('/')[1]) || 'jpg';
  const path = `${userId}/${date}-${pose}-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const { error } = await sb.storage.from('progress-photos').upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' });
  if (error) throw new Error(error.message);
  return must(await sb.from('progress_photos').insert({ user_id: userId, date, pose, path }).select().single());
}
export async function deletePhoto(row) {
  await sb.storage.from('progress-photos').remove([row.path]);
  must(await sb.from('progress_photos').delete().eq('id', row.id));
}
export async function photoUrl(path) {
  const { data, error } = await sb.storage.from('progress-photos').createSignedUrl(path, 3600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
export async function photoUrls(paths) {
  if (!paths.length) return {};
  const { data, error } = await sb.storage.from('progress-photos').createSignedUrls(paths, 3600);
  if (error) throw new Error(error.message);
  const out = {}; data.forEach(d => { if (d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}

// Tréning
export async function getPlan(userId) {
  const { data, error } = await sb.from('workout_plans').select('*').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function savePlan(userId, plan) {
  await sb.from('workout_plans').update({ active: false }).eq('user_id', userId);
  return must(await sb.from('workout_plans').insert({ user_id: userId, name: plan.name, days: plan.days, active: true }).select().single());
}
export async function listWorkoutLogs(userId, fromDate) {
  let q = sb.from('workout_logs').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (fromDate) q = q.gte('date', fromDate);
  return must(await q);
}
export async function upsertWorkoutLog(row) {
  return must(await sb.from('workout_logs').upsert(row, { onConflict: 'user_id,date,plan_day' }).select().single());
}
// Posledné použité váhy pre každý cvik
export async function lastWeights(userId) {
  const logs = must(await sb.from('workout_logs').select('sets,date').eq('user_id', userId).eq('done', true).order('date', { ascending: false }).limit(30));
  const out = {};
  for (const l of logs) for (const s of (l.sets || [])) if (s.kg && !out[s.ex]) out[s.ex] = s.kg;
  return out;
}

// Správy
export async function listMessages(userId) {
  return must(await sb.from('messages').select('*').or(`to_user.eq.${userId},from_user.eq.${userId}`).order('created_at', { ascending: false }).limit(50));
}
export async function sendMessage(from, to, body) {
  return must(await sb.from('messages').insert({ from_user: from, to_user: to, body }).select().single());
}
export async function markRead(ids) {
  if (ids.length) must(await sb.from('messages').update({ read_at: new Date().toISOString() }).in('id', ids));
}

// Adaptívny cieľ
export async function listTargetHistory(userId) {
  return must(await sb.from('target_history').select('*').eq('user_id', userId).order('date'));
}
export async function applyTarget(userId, row, newTargets) {
  must(await sb.from('target_history').upsert({ user_id: userId, ...row }, { onConflict: 'user_id,date' }));
  if (!newTargets || !Object.keys(newTargets).length) return getProfile(userId);
  return must(await sb.from('profiles').update(newTargets).eq('id', userId).select().single());
}

// Dáta pre dnešok (streak, týždeň)
export async function activityDates(userId, fromDate) {
  // rýchla cesta: databáza vráti rovno zoznam dní (bez limitu 1000 riadkov pri dlhej sérii)
  const r = await sb.rpc('activity_days_for', { p_user: userId, p_from: fromDate });
  const fast = !r.error && Array.isArray(r.data) ? r.data.map(x => (typeof x === 'string' ? x : x?.activity_days_for)).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x || '')) : [];
  if (fast.length) return fast; // prázdne alebo v inom tvare: pre istotu pôvodná cesta
  const [f, w, c, t] = await Promise.all([
    sb.from('food_logs').select('date').eq('user_id', userId).gte('date', fromDate).lte('date', todayISO()),
    sb.from('weight_logs').select('date').eq('user_id', userId).gte('date', fromDate),
    sb.from('checkins').select('date').eq('user_id', userId).gte('date', fromDate),
    sb.from('workout_logs').select('date').eq('user_id', userId).eq('done', true).gte('date', fromDate),
  ]);
  const dates = new Set();
  [f, w, c, t].forEach(r => (r.data || []).forEach(x => dates.add(x.date)));
  return [...dates];
}
export async function foodByDay(userId, fromDate, toDate) {
  const rows = must(await sb.from('food_logs').select('date,kcal,protein').eq('user_id', userId).gte('date', fromDate).lte('date', toDate));
  const out = {};
  rows.forEach(r => { out[r.date] = out[r.date] || { kcal: 0, protein: 0 }; out[r.date].kcal += Number(r.kcal); out[r.date].protein += Number(r.protein); });
  return out;
}

// Kouč: detail účastníka
export async function participantDetail(userId, fromDate) {
  const [profile, weights, foods, checkins, photos, wlogs, targets] = await Promise.all([
    getProfile(userId), listWeights(userId),
    sb.from('food_logs').select('*').eq('user_id', userId).gte('date', fromDate).order('date', { ascending: false }).then(must),
    sb.from('checkins').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(30).then(must),
    listPhotos(userId), listWorkoutLogs(userId, fromDate), listTargetHistory(userId),
  ]);
  return { profile, weights, foods, checkins, photos, wlogs, targets };
}
export async function coachOverview2(fromDate) {
  const [base, wlogs, photos] = await Promise.all([
    coachOverview(fromDate),
    sb.from('workout_logs').select('user_id,date,done').gte('date', fromDate).then(must),
    sb.from('progress_photos').select('user_id,date').then(must),
  ]);
  return { ...base, wlogs, photos };
}
export async function exportCsv() {
  const [profiles, weights, foods, checkins] = await Promise.all([
    sb.from('profiles').select('id,name,goal,start_weight,start_date,target_kcal').then(must),
    sb.from('weight_logs').select('user_id,date,weight_kg,waist_cm').order('date').then(must),
    sb.from('food_logs').select('user_id,date,kcal,protein,carbs,fat').then(must),
    sb.from('checkins').select('user_id,date,sleep_h,steps,mood,water').then(must),
  ]);
  const name = {}; profiles.forEach(p => name[p.id] = p.name);
  const byDay = {};
  foods.forEach(f => { const k = f.user_id + '|' + f.date; byDay[k] = byDay[k] || { kcal: 0, protein: 0 }; byDay[k].kcal += Number(f.kcal); byDay[k].protein += Number(f.protein); });
  const rows = [['meno', 'datum', 'vaha_kg', 'pas_cm', 'kcal', 'bielkoviny_g', 'spanok_h', 'kroky', 'nalada', 'voda']];
  const keys = new Set([...weights.map(w => w.user_id + '|' + w.date), ...Object.keys(byDay), ...checkins.map(c => c.user_id + '|' + c.date)]);
  const wmap = {}; weights.forEach(w => wmap[w.user_id + '|' + w.date] = w);
  const cmap = {}; checkins.forEach(c => cmap[c.user_id + '|' + c.date] = c);
  [...keys].sort().forEach(k => {
    const [uid, date] = k.split('|'); const w = wmap[k] || {}, f = byDay[k] || {}, c = cmap[k] || {};
    rows.push([name[uid] || uid, date, w.weight_kg ?? '', w.waist_cm ?? '', f.kcal != null ? Math.round(f.kcal) : '', f.protein != null ? Math.round(f.protein) : '', c.sleep_h ?? '', c.steps ?? '', c.mood ?? '', c.water ?? '']);
  });
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
}

// ---------- v0.3: push ----------
export async function vapidPublicKey() {
  const { data, error } = await sb.rpc('vapid_public_key');
  if (error) throw new Error(error.message);
  return data;
}
export async function savePushSubscription(row) {
  return must(await sb.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' }).select().single());
}
export async function deletePushSubscription(endpoint) {
  must(await sb.from('push_subscriptions').delete().eq('endpoint', endpoint));
}
export async function getReminderSettings(userId) {
  const { data, error } = await sb.from('reminder_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function ensureReminderSettings(userId, defaults) {
  const cur = await getReminderSettings(userId);
  if (cur) return cur;
  return must(await sb.from('reminder_settings').insert({ user_id: userId, ...defaults }).select().single());
}
export async function saveReminderSettings(row) {
  return must(await sb.from('reminder_settings').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single());
}
export async function queueTestPush() {
  const { error } = await sb.rpc('queue_test_push');
  if (error) throw new Error(error.message);
}

// ---------- v0.4: komunitná databáza jedál ----------
export async function searchFoods(q, lim = 30) {
  try {
    let { data, error } = await sb.rpc('search_foods_v2', { q, lim });
    if (error && /search_foods_v2|schema cache|does not exist/i.test(error.message)) ({ data, error } = await sb.rpc('search_foods', { q, lim }));
    if (error) throw new Error(error.message);
    data = data || [];
    if (data.length) { // výsledky si telefón pamätá, aby sa dali nájsť aj bez signálu
      const m = jget(OS, {}); delete m[norm(q)]; m[norm(q)] = data.slice(0, 20);
      const ks = Object.keys(m); while (ks.length > 30) delete m[ks.shift()];
      jset(OS, m);
    }
    return data;
  } catch (e) {
    if (!isNetErr(e)) throw e;
    const words = norm(q).split(/\s+/).filter(Boolean), seen = new Set(), out = [];
    for (const list of Object.values(jget(OS, {}))) for (const f of list) {
      const hay = norm(f.name + ' ' + (f.brand || ''));
      if (!seen.has(f.id) && words.every(w => hay.includes(w))) { seen.add(f.id); out.push(f); }
    }
    return out.slice(0, lim);
  }
}
export async function getFood(id) {
  const { data, error } = await sb.from('foods').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function foodByBarcode(code) {
  const { data, error } = await sb.from('foods').select('*').eq('barcode', code).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
// fotky pre zoznam jedál (id -> adresa), napr. do záložky Nedávno
export async function foodImages(ids) {
  const { data } = await sb.from('foods').select('id,img').in('id', ids).not('img', 'is', null);
  return new Map((data || []).map(r => [r.id, r.img]));
}
export async function myFoods(userId) {
  return must(await sb.from('foods').select('*').eq('created_by', userId).order('updated_at', { ascending: false }).limit(100));
}
export async function createFood(row) {
  return must(await sb.from('foods').insert(row).select().single());
}
export async function updateFood(id, row) {
  return must(await sb.from('foods').update(row).eq('id', id).select().single());
}
export async function deleteFoodItem(id) {
  must(await sb.from('foods').delete().eq('id', id));
}
export async function foodUsed(id) {
  await sb.rpc('food_used', { p_id: id });
}
export async function reportFood(foodId, userId, reason) {
  const { error } = await sb.from('food_reports').insert({ food_id: foodId, user_id: userId, reason });
  if (error && error.code !== '23505') throw new Error(error.message);
}
// Skopíruje jedlá z jedného dňa/jedla do iného
export async function copyMeal(userId, fromDate, toDate, meal) {
  const rows = must(await sb.from('food_logs').select('name,brand,grams,kcal,protein,carbs,fat,source,barcode,food_id,portion,qty,fiber,sugar,salt')
    .eq('user_id', userId).eq('date', fromDate).eq('meal', meal).order('created_at'));
  if (!rows.length) return 0;
  must(await sb.from('food_logs').insert(rows.map(r => ({ ...r, user_id: userId, date: toDate, meal }))));
  return rows.length;
}
// celý deň (alebo jedna časť dňa) na viac dátumov naraz: plánovanie dopredu
export async function copyDay(userId, fromDate, toDates, meal = null) {
  let q = sb.from('food_logs').select('meal,name,brand,grams,kcal,protein,carbs,fat,source,barcode,food_id,portion,qty,fiber,sugar,salt').eq('user_id', userId).eq('date', fromDate).order('created_at');
  if (meal) q = q.eq('meal', meal);
  const rows = must(await q);
  if (!rows.length || !toDates.length) return 0;
  const out = [];
  toDates.forEach(d => rows.forEach(r => out.push({ ...r, user_id: userId, date: d })));
  must(await sb.from('food_logs').insert(out));
  return rows.length * toDates.length;
}
export async function clearMeal(userId, date, meal) {
  must(await sb.from('food_logs').delete().eq('user_id', userId).eq('date', date).eq('meal', meal));
}
export async function recentLogs(userId, limit = 25) {
  const pend = pendingFood(userId).map(strip).reverse();
  let rows;
  if (!isOff()) {
    try {
      rows = must(await sb.from('food_logs').select('name,brand,grams,kcal,protein,carbs,fat,source,barcode,food_id,portion,qty,fiber,sugar,salt,created_at')
        .eq('user_id', userId).neq('source', 'quick').order('created_at', { ascending: false }).limit(300));
      jset(OR + userId, rows.slice(0, 120));
    } catch (e) { if (!isNetErr(e)) throw e; }
  }
  if (!rows) rows = jget(OR + userId, null);
  if (!rows) { if (!pend.length) throw new Error('Failed to fetch'); rows = []; }
  rows = pend.filter(r => r.source !== 'quick').concat(rows);
  const seen = new Set(); const out = [];
  for (const r of rows) {
    const key = r.food_id ? 'id' + r.food_id : (r.name + '|' + (r.brand || '')).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key); out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- v0.6: Pokrok ----------
// denné súčty kalórií a makier + počet zapísaných položiek
export async function dailyTotals(userId, fromDate, toDate) {
  const rows = must(await sb.from('food_logs').select('date,kcal,protein,carbs,fat,fiber').eq('user_id', userId).gte('date', fromDate).lte('date', toDate));
  const out = {};
  rows.forEach(r => {
    const d = out[r.date] = out[r.date] || { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, fiberN: 0, n: 0 };
    d.kcal += Number(r.kcal) || 0; d.protein += Number(r.protein) || 0; d.carbs += Number(r.carbs) || 0; d.fat += Number(r.fat) || 0; d.n++;
    if (r.fiber != null) { d.fiber += Number(r.fiber) || 0; d.fiberN++; }
  });
  return out;
}
export async function foodCount(userId) {
  const { count, error } = await sb.from('food_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw new Error(error.message);
  return count || 0;
}
