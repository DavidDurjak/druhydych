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
