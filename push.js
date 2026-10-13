// Push notifikácie: prihlásenie zariadenia + obrazovka Pripomienky
import * as db from './data.js';
import { ctx } from './app.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), nav = (...a) => ctx.nav(...a);

const DEFAULTS = { tz: 'Europe/Bratislava', enabled: true, breakfast: '08:00', breakfast_on: true, brunch: '10:30', brunch_on: false, lunch: '12:30', lunch_on: true, afternoon: '15:30', afternoon_on: true, dinner: '19:00', dinner_on: true, late: '21:00', late_on: false, weigh: '07:00', weigh_on: true, checkin: '21:00', checkin_on: true, training: '17:00', training_on: true, water_on: true, photo_on: true, streak_on: true };

export function pushSupport() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const has = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return { has, standalone, isIOS, needsHomeScreen: isIOS && !standalone };
}

function b64ToU8(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
function u8ToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function currentSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  // getRegistration odpovie hneď; `ready` by pri prvom spustení čakal na stiahnutie celej offline cache
  // a obrazovka Dnes by dovtedy visela na skeletone
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.pushManager) return null;
  return reg.pushManager.getSubscription();
}

export async function enablePush() {
  const s = pushSupport();
  if (!s.has) throw new Error('Tento prehliadač nepodporuje notifikácie.');
  if (s.needsHomeScreen) throw new Error('Na iPhone najprv pridaj appku na plochu (Zdieľať → Pridať na plochu) a otvor ju odtiaľ.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifikácie neboli povolené.');
  const reg = await navigator.serviceWorker.ready;
  const key = await db.vapidPublicKey();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(key) });
  const j = sub.toJSON();
  await db.savePushSubscription({ user_id: state().profile.id, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, ua: navigator.userAgent.slice(0, 200) });
  await db.ensureReminderSettings(state().profile.id, { ...DEFAULTS, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Bratislava' });
  return sub;
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (sub) { await db.deletePushSubscription(sub.endpoint); await sub.unsubscribe(); }
}

// Ponuka na Dnes: zobraz raz, kým nepovolí alebo nezamietne
export async function pushPromptCard() {
  const s = pushSupport();
  if (!s.has && !s.isIOS) return '';
  try { if (localStorage.getItem('dd_push_dismissed')) return ''; } catch (_) {}
  const sub = await currentSubscription().catch(() => null);
  if (sub) return '';
  const body = s.needsHomeScreen
    ? 'Pridaj appku na plochu (Zdieľať → Pridať na plochu), potom tu zapneš pripomienky na jedlo, tréning a váženie.'
    : 'Pripomienky na jedlo, tréning, váženie a check-in. Pošleme ich len vtedy, keď to ešte nemáš spravené.';
  return `<div class="card accent" id="pushCard"><div class="row between"><h3>Zapni pripomienky 🔔</h3><button class="del" id="pushNo">×</button></div><p class="small mt">${body}</p>${s.needsHomeScreen ? '' : '<button class="btn sm primary mt" id="pushYes">Povoliť notifikácie</button>'}</div>`;
}
export function bindPushCard(rerender) {
  $app().querySelector('#pushYes')?.addEventListener('click', async e => {
    e.target.disabled = true;
    try { await enablePush(); toast('Pripomienky zapnuté'); rerender(); }
    catch (err) { toast(err.message, true); e.target.disabled = false; }
  });
  $app().querySelector('#pushNo')?.addEventListener('click', () => { try { localStorage.setItem('dd_push_dismissed', '1'); } catch (_) {} $app().querySelector('#pushCard')?.remove(); });
}

// ---------- Obrazovka Pripomienky ----------
export async function renderReminders() {
  const uid = state().profile.id;
  const [sub, settings] = await Promise.all([currentSubscription().catch(() => null), db.getReminderSettings(uid)]);
  const s = { ...DEFAULTS, ...(settings || {}) };
  const sup = pushSupport();
  const rows = [
    ['weigh', 'Ranné váženie', '⚖️'], ['breakfast', 'Raňajky', '🍳'], ['brunch', 'Desiata', '🥪'], ['lunch', 'Obed', '🍲'], ['afternoon', 'Olovrant', '🥨'], ['dinner', 'Večera', '🍽️'], ['late', 'Druhá večera', '🌙'], ['training', 'Tréning', '🏋️'], ['checkin', 'Večerný check-in', '📝'],
  ];
  const toggles = [['water_on', 'Voda (11:00, 14:00, 17:00, len ak chýba)', '💧'], ['photo_on', 'Týždenná fotka (nedeľa 10:00)', '📸'], ['streak_on', 'Streak v ohrození (21:30)', '🔥']];
  const t5 = v => (v || '').slice(0, 5);
  $app().innerHTML = `<div class="screen">
    <div class="topbar"><h1>Pripomienky</h1><a class="btn sm ghost" href="#/profil">←</a></div>
    <div class="card ${sub ? 'accent' : ''}">
      <div class="row between"><div><h3>${sub ? 'Notifikácie sú zapnuté' : 'Notifikácie sú vypnuté'}</h3><p class="muted small">${sub ? 'Toto zariadenie dostáva pripomienky.' : sup.needsHomeScreen ? 'Na iPhone najprv pridaj appku na plochu a otvor ju odtiaľ.' : 'Povoľ ich jedným klikom.'}</p></div>
      ${sub ? '<button class="btn sm ghost" id="off">Vypnúť</button>' : (sup.needsHomeScreen ? '' : '<button class="btn sm primary" id="on">Zapnúť</button>')}</div>
      <p class="muted small mt">Pripomienka príde len vtedy, keď danú vec ešte nemáš zalogovanú. Žiadny spam.</p>
    </div>
    <form id="rf" class="card">
      <div class="row between mb"><h3>Všetky pripomienky</h3><label class="sw"><input type="checkbox" name="enabled" ${s.enabled ? 'checked' : ''}><i></i></label></div>
      ${rows.map(([k, lbl, ic]) => `<div class="rrow"><label class="sw"><input type="checkbox" name="${k}_on" ${s[k + '_on'] ? 'checked' : ''}><i></i></label><span class="rl">${ic} ${lbl}</span><input class="input tm" type="time" name="${k}" value="${t5(s[k])}"></div>`).join('')}
      ${toggles.map(([k, lbl, ic]) => `<div class="rrow"><label class="sw"><input type="checkbox" name="${k}" ${s[k] ? 'checked' : ''}><i></i></label><span class="rl">${ic} ${lbl}</span></div>`).join('')}
      <button class="btn primary mt" type="submit">Uložiť</button>
    </form>
    <div class="card"><h3 class="mb">Test</h3><p class="muted small mb">Pošle ti skúšobnú notifikáciu do minúty.</p><button class="btn sm" id="test" ${sub ? '' : 'disabled'}>Poslať test</button></div>
  </div>${nav('#/profil')}`;
  $app().querySelector('#on')?.addEventListener('click', async e => { e.target.disabled = true; try { await enablePush(); toast('Zapnuté'); renderReminders(); } catch (err) { toast(err.message, true); e.target.disabled = false; } });
  $app().querySelector('#off')?.addEventListener('click', async () => { await disablePush(); toast('Vypnuté'); renderReminders(); });
  $app().querySelector('#rf').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target); const out = { user_id: uid, tz: s.tz };
    ['enabled', 'breakfast_on', 'brunch_on', 'lunch_on', 'afternoon_on', 'dinner_on', 'late_on', 'weigh_on', 'checkin_on', 'training_on', 'water_on', 'photo_on', 'streak_on'].forEach(k => out[k] = f.get(k) === 'on');
    ['breakfast', 'brunch', 'lunch', 'afternoon', 'dinner', 'late', 'weigh', 'checkin', 'training'].forEach(k => out[k] = f.get(k) || DEFAULTS[k]);
    try { await db.saveReminderSettings(out); toast('Uložené'); } catch (err) { toast(err.message, true); }
  };
  $app().querySelector('#test')?.addEventListener('click', async e => { e.target.disabled = true; try { await db.queueTestPush(uid); toast('Test odoslaný, príde do minúty'); } catch (err) { toast(err.message, true); } setTimeout(() => e.target.disabled = false, 5000); });
}
