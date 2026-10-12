// Dátová vrstva: všetko, čo komunikuje so Supabase, je tu. UI túto vrstvu len volá.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function must({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ---------- Auth ----------
export async function getSession() {
  const { data } = await sb.auth.getSession();
  return data.session;
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
export async function listFood(userId, date) {
  return must(await sb.from('food_logs').select('*').eq('user_id', userId).eq('date', date).order('created_at'));
}
export async function addFood(row) {
  return must(await sb.from('food_logs').insert(row).select().single());
}
export async function deleteFood(id) {
  must(await sb.from('food_logs').delete().eq('id', id));
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
export async function coachOverview(fromDate) {
  const profiles = must(await sb.from('profiles').select('*').order('name'));
  const weights = must(await sb.from('weight_logs').select('user_id,date,weight_kg').order('date'));
  const foods = must(await sb.from('food_logs').select('user_id,date,kcal').gte('date', fromDate));
  const checkins = must(await sb.from('checkins').select('user_id,date,sleep_h,steps,mood').gte('date', fromDate));
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
  const [f, w, c, t] = await Promise.all([
    sb.from('food_logs').select('date').eq('user_id', userId).gte('date', fromDate),
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
  const base = await coachOverview(fromDate);
  const wlogs = must(await sb.from('workout_logs').select('user_id,date,done').gte('date', fromDate));
  const photos = must(await sb.from('progress_photos').select('user_id,date'));
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
  const { data, error } = await sb.rpc('search_foods', { q, lim });
  if (error) throw new Error(error.message);
  return data || [];
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
  const rows = must(await sb.from('food_logs').select('name,brand,grams,kcal,protein,carbs,fat,source,barcode,food_id,portion,qty')
    .eq('user_id', userId).eq('date', fromDate).eq('meal', meal).order('created_at'));
  if (!rows.length) return 0;
  must(await sb.from('food_logs').insert(rows.map(r => ({ ...r, user_id: userId, date: toDate, meal }))));
  return rows.length;
}
export async function recentLogs(userId, limit = 25) {
  const rows = must(await sb.from('food_logs').select('name,brand,grams,kcal,protein,carbs,fat,source,barcode,food_id,portion,qty,created_at')
    .eq('user_id', userId).neq('source', 'quick').order('created_at', { ascending: false }).limit(300));
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
  const rows = must(await sb.from('food_logs').select('date,kcal,protein,carbs,fat').eq('user_id', userId).gte('date', fromDate).lte('date', toDate));
  const out = {};
  rows.forEach(r => {
    const d = out[r.date] = out[r.date] || { kcal: 0, protein: 0, carbs: 0, fat: 0, n: 0 };
    d.kcal += Number(r.kcal) || 0; d.protein += Number(r.protein) || 0; d.carbs += Number(r.carbs) || 0; d.fat += Number(r.fat) || 0; d.n++;
  });
  return out;
}
export async function foodCount(userId) {
  const { count, error } = await sb.from('food_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (error) throw new Error(error.message);
  return count || 0;
}
