// v0.7: hodinky a Apple Zdravie (cez iOS Skratky) + dáta pre týždenný report
import { sb } from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), nav = (...a) => ctx.nav(...a);

export const SYNC_URL = 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/health-sync';
export const SHORTCUT_NAME = 'Fuelwind';
// iCloud odkaz na hotovú Skratku (v akcii Text je VLOZ SVOJU ADRESU, účastník si tam vloží svoju adresu)
export const SHORTCUT_ICLOUD = 'https://www.icloud.com/shortcuts/37dbbdcf14f547a4985da8fc5492b377';
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
  const myUrl = SYNC_URL + '?t=' + token;
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
        ${step(1, 'Skopíruj svoju adresu', `<div class="hw-key"><code>${h(myUrl)}</code><button class="btn sm primary" id="copyKey">Kopírovať</button></div><p class="muted small">Adresa obsahuje tvoj osobný kľúč. Nikomu ju neposielaj.</p>`)}
        ${step(2, 'Pridaj Skratku', `<a class="btn sm primary" href="${SHORTCUT_ICLOUD}">Pridať Skratku „${SHORTCUT_NAME}“</a><p class="muted small mt">Otvorí sa appka Skratky. Ťukni na <b>Pridať skratku</b>.</p>`)}
        ${step(3, 'Vlož adresu do Skratky', `<p class="small">V Skratkách ťukni na kartu <b>${SHORTCUT_NAME}</b> (nie na ▶). V akcii <b>Text</b> zmaž <b>VLOZ SVOJU ADRESU</b>, podrž prst a daj <b>Vložiť</b>. Adresa musí začínať na <code>https://</code>.</p>`)}
        ${step(4, 'Spusti ju prvýkrát', `<p class="small">Ťukni na <b>▶</b>. Pri otázkach na Zdravie zapni prepínače, vyber <b>Posledných 30 dní a budúce dáta</b> a daj <b>Povoliť</b>. Pri odosielaní daj <b>Vždy povoliť</b>. Na konci vyskočí „✅ Fuelwind: … krokov“.</p>`)}
        ${step(5, 'Nastav automatické spúšťanie', `<p class="small">Skratky → <b>‹</b> vľavo hore → <b>Automatizácia</b> → <b>+</b> → modré tlačidlo <b>Automatizácia</b> → <b>Denná doba</b> → <b>21:30</b>, Každý deň (Hlásiť nechaj vypnuté). Potom pridaj akciu <b>Spustiť skratku</b> a vyber <b>${SHORTCUT_NAME}</b>. To isté zopakuj pre <b>13:00</b>.</p><p class="muted small">Ak je iPhone v tej chvíli zamknutý, Zdravie dáta nevydá. Kedykoľvek ich pošleš ručne tlačidlom nižšie.</p>`)}
        ${step(6, 'Synchronizovať ručne', `<a class="btn sm ghost" href="${runShortcutUrl()}">Synchronizovať teraz</a>`)}
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
      <p class="muted small mt">Spálené kalórie sa k dennému cieľu nepripóčitavajú. Cieľ už počíta s tvojou aktivitou a hodinky výdaj často nadhodnocujú.</p>
      <button class="btn sm ghost mt" id="resetKey">Vygenerovať novú adresu</button>
    </section>
  </div>${nav('#/hodinky')}`;

  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); toast(msg); }
    catch (_) { window.prompt('Skopíruj:', text); }
  };
  $app().querySelector('#copyKey')?.addEventListener('click', () => copy(myUrl, 'Adresa skopírovaná'));
  $app().querySelector('#resetKey').onclick = async () => {
    if (!confirm('Stará adresa prestane fungovať a v Skratke ju budeš musieť vymeniť za novú. Pokračovať?')) return;
    await healthToken(true); toast('Nová adresa vytvorená'); renderWatch();
  };
}
