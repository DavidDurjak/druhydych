// v0.7: hodinky a Apple Zdravie (cez iOS Skratky) + dáta pre týždenný report
import { sb } from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), nav = (...a) => ctx.nav(...a);

export const SYNC_URL = 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/health-sync';
export const SHORTCUT_NAME = 'Druhý dych';
// iCloud odkaz na hotovú Skratku (doplní sa, keď ju kouč raz vytvorí a zdieľa)
export const SHORTCUT_ICLOUD = '';
export const STEP_GOAL = 8000;

const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

// ---------- dáta ----------
export async function healthDay(userId, date) {
  return must(await sb.from('health_daily').select('*').eq('user_id', userId).eq('date', date).maybeSingle());
}
export async function healthRange(userId, from, to) {
  return must(await sb.from('health_daily').select('*').eq('user_id', userId).gte('date', from).lte('date', to).order('date'));
}
export async function healthStatus(userId) {
  return must(await sb.from('health_tokens').select('last_sync,syncs,created_at').eq('user_id', userId).maybeSingle());
}
export async function healthToken(reset = false) {
  return must(await sb.rpc('health_token', { p_reset: reset }));
}
export async function weeklyReport(userId, from) {
  return must(await sb.rpc('weekly_report', { p_user: userId, p_from: from }));
}
export async function weeklyReportsAll(from) {
  return must(await sb.rpc('weekly_reports_all', { p_from: from }));
}

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
export const runShortcutUrl = () => 'shortcuts://run-shortcut?name=' + encodeURIComponent(SHORTCUT_NAME);
const hasValues = d => d && [d.steps, d.active_kcal, d.sleep_h, d.resting_hr].some(v => v != null);

export function ago(iso) {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return 'práve teraz';
  if (m < 60) return `pred ${m} min`;
  const hh = Math.round(m / 60);
  if (hh < 24) return `pred ${hh} h`;
  const d = Math.round(hh / 24);
  return d === 1 ? 'včera' : `pred ${d} dňami`;
}
export const fmtSleep = v => v == null ? '–' : `${Math.floor(v)} h ${String(Math.round((v % 1) * 60)).padStart(2, '0')}`;

// ---------- karta aktivity na obrazovke Dnes ----------
// vráti HTML alebo '' (nič, ak hodinky nie sú pripojené)
export async function activityCard(userId, date) {
  const [day, status] = await Promise.all([healthDay(userId, date).catch(() => null), healthStatus(userId).catch(() => null)]);
  if (!status?.last_sync) return '';
  const syncBtn = isIOS() ? `<a class="act-sync" href="${runShortcutUrl()}">Synchronizovať</a>` : '';
  if (!hasValues(day)) {
    if (date !== calc.today()) return '';
    return `<section class="act act-empty"><span class="act-w">⌚</span><div><h3>Hodinky</h3><p>Dnes ešte bez dát${status.last_sync ? `, posledná synchronizácia ${ago(status.last_sync)}` : ''}.</p></div>${syncBtn}</section>`;
  }
  const pct = Math.min(1, (day.steps || 0) / STEP_GOAL);
  const cell = (ic, val, lbl) => `<div class="act-c"><span>${ic}</span><b>${val}</b><small>${lbl}</small></div>`;
  return `<section class="act">
    <div class="act-h"><h3>Aktivita</h3><span>⌚ ${ago(day.updated_at)}</span>${syncBtn}</div>
    <div class="act-steps"><div class="act-st"><b>${day.steps != null ? day.steps.toLocaleString('sk-SK') : '–'}</b><small>krokov z ${STEP_GOAL.toLocaleString('sk-SK')}</small></div>
      <div class="act-bar"><i style="width:${pct * 100}%"></i></div></div>
    <div class="act-g">
      ${cell('🔥', day.active_kcal ?? '–', 'aktívne kcal')}
      ${cell('😴', fmtSleep(day.sleep_h != null ? Number(day.sleep_h) : null), 'spánok')}
      ${cell('❤️', day.resting_hr ?? '–', 'pokojový pulz')}
    </div>
  </section>`;
}

// ---------- obrazovka Hodinky ----------
export async function renderWatch() {
  const uid = state().profile.id;
  $app().innerHTML = `<div class="screen"><div class="topbar"><h1>Hodinky</h1><a class="btn sm ghost" href="#/profil">←</a></div><div class="spinner"></div></div>${nav('#/hodinky')}`;
  const [token, status, recent] = await Promise.all([healthToken(), healthStatus(uid), healthRange(uid, calc.addDays(calc.today(), -6), calc.today())]);
  const days = recent.filter(hasValues).reverse();
  const ios = isIOS();
  const connected = !!status?.last_sync;
  const step = (n, title, body) => `<li class="hw-step"><span class="hw-n">${n}</span><div><h4>${title}</h4>${body}</div></li>`;

  $app().innerHTML = `<div class="screen hw">
    <div class="topbar"><h1>Hodinky</h1><a class="btn sm ghost" href="#/profil">←</a></div>

    <section class="hw-hero ${connected ? 'on' : ''}">
      <div class="hw-watch"><span>⌚</span></div>
      <div><h2>${connected ? 'Pripojené' : 'Pripoj hodinky'}</h2>
        <p>${connected ? `Posledná synchronizácia ${ago(status.last_sync)}. Spolu ${status.syncs}×.` : 'Kroky, spálené kalórie, spánok, pokojový pulz a váha sa budú zapisovať samé.'}</p></div>
    </section>

    ${days.length ? `<section class="card"><h3 class="mb">Posledné dni</h3>${days.map(d => `<div class="hw-row"><b>${calc.fmtDate(d.date)}</b><span>👟 ${d.steps != null ? d.steps.toLocaleString('sk-SK') : '–'}</span><span>🔥 ${d.active_kcal ?? '–'}</span><span>😴 ${fmtSleep(d.sleep_h != null ? Number(d.sleep_h) : null)}</span><span>❤️ ${d.resting_hr ?? '–'}</span></div>`).join('')}</section>` : ''}

    ${ios ? `
    <section class="card">
      <h3>iPhone a Apple Watch</h3>
      <p class="muted small mt">Funguje s Apple Watch aj s hodinkami a váhami, ktoré zapisujú do appky Zdravie (Garmin, Amazfit, Xiaomi, Withings a ďalšie). Nastavuje sa raz, potom to beží samo.</p>
      <ol class="hw-steps">
        ${step(1, 'Skopíruj svoj kľúč', `<div class="hw-key"><code>${h(token)}</code><button class="btn sm primary" id="copyKey">Kopírovať</button></div><p class="muted small">Kľúč patrí len tebe. Nikomu ho neposielaj.</p>`)}
        ${SHORTCUT_ICLOUD
          ? step(2, 'Pridaj Skratku', `<a class="btn sm primary" href="${SHORTCUT_ICLOUD}">Pridať Skratku „${SHORTCUT_NAME}“</a><p class="muted small mt">Pri inštalácii vlož kľúč z kroku 1 a povoľ prístup k Zdraviu.</p>`)
          : step(2, 'Vytvor Skratku „' + SHORTCUT_NAME + '“', `<p class="small">Otvor appku <b>Skratky</b>, ťukni na <b>+</b> a pridaj tieto akcie v tomto poradí:</p>
            <ol class="hw-sub">
              <li><b>Nájsť vzorky zdravia</b> (Find Health Samples): typ <b>Kroky</b> (Steps), Dátum začiatku <b>je dnes</b>, Zoskupiť podľa <b>Deň</b>.</li>
              <li>To isté pre <b>Aktívna energia</b> (Active Energy).</li>
              <li>To isté pre <b>Pokojová srdcová frekvencia</b> (Resting Heart Rate).</li>
              <li>Voliteľné: <b>Hmotnosť</b> (Weight), Dátum začiatku je dnes, Zoradiť od najnovšieho, Limit 1.</li>
              <li><b>Získať obsah URL</b> (Get Contents of URL): URL <code class="hw-url">${SYNC_URL}</code>, Metóda <b>POST</b>, Telo požiadavky <b>JSON</b> s poľami: <code>token</code> (text: tvoj kľúč), <code>steps</code>, <code>kcal</code>, <code>hr</code>, <code>weight</code> (vyber výsledky z bodov 1 až 4).</li>
              <li><b>Zobraziť upozornenie</b> s výsledkom <b>Obsah URL</b>, aby si videl, že sa to podarilo.</li>
            </ol>
            <p class="muted small">Skratku pomenuj presne <b>${SHORTCUT_NAME}</b>, inak nepôjde tlačidlo Synchronizovať. Pri prvom spustení povoľ prístup k Zdraviu.</p>
            <button class="btn sm ghost mt" id="copyUrl">Kopírovať URL</button>`)}
        ${step(3, 'Nastav automatické spúšťanie', `<p class="small">Skratky → <b>Automatizácia</b> → <b>+</b> → <b>Čas dňa</b> → <b>21:30</b>, Denne → <b>Spustiť okamžite</b> → vyber Skratku „${SHORTCUT_NAME}“. Pridaj druhú na <b>13:00</b>, nech vidíš kroky aj cez deň.</p><p class="muted small">Ak je iPhone v tej chvíli zamknutý, Zdravie dáta nevydá. Preto je tu aj tlačidlo nižšie.</p>`)}
        ${step(4, 'Vyskúšaj to', `<a class="btn sm primary" href="${runShortcutUrl()}">Synchronizovať teraz</a><p class="muted small mt">Otvorí Skratku, pošle dáta a ukáže výsledok. Potom sa vráť sem a obnov stránku.</p>`)}
      </ol>
    </section>` : `
    <section class="card">
      <h3>Android, Samsung Galaxy Watch, Garmin</h3>
      <p class="small mt">Na Androide sa dáta zo Samsung Zdravia a Health Connect dajú čítať len z natívnej aplikácie. Tá je v pláne. Dovtedy zapisuj kroky a spánok v dennom check-ine, zaberie to 20 sekúnd.</p>
      <p class="muted small mt">Máš iPhone a hodinky, ktoré zapisujú do Apple Zdravia? Otvor túto stránku na iPhone a nastav to tam.</p>
    </section>`}

    <section class="card">
      <h3 class="mb">Čo sa posiela</h3>
      <p class="small">Len denné súčty: kroky, aktívne kalórie, spánok, pokojový pulz a váha. Kroky a spánok sa zapíšu aj do check-inu, váha do váženia (len ak si sa v ten deň nevážil ručne).</p>
      <p class="muted small mt">Spálené kalórie sa k dennému cieľu nepripočítavajú. Cieľ už počíta s tvojou aktivitou a hodinky výdaj často nadhodnocujú.</p>
      <button class="btn sm ghost mt" id="resetKey">Vygenerovať nový kľúč</button>
    </section>
  </div>${nav('#/hodinky')}`;

  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch (_) { window.prompt('Skopíruj:', text); }
  };
  $app().querySelector('#copyKey')?.addEventListener('click', () => copy(token, 'Kľúč skopírovaný'));
  $app().querySelector('#copyUrl')?.addEventListener('click', () => copy(SYNC_URL, 'URL skopírovaná'));
  $app().querySelector('#resetKey').onclick = async () => {
    if (!confirm('Starý kľúč prestane fungovať a v Skratke ho budeš musieť vymeniť. Pokračovať?')) return;
    await healthToken(true); toast('Nový kľúč vytvorený'); renderWatch();
  };
}
