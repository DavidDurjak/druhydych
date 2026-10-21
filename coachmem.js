// Kouč: obrazovka „Čo o tebe viem“. Ukáže presne tie údaje, ktoré pomocník pri odpovedi vidí (profil, ciele, posledných 7 dní,
// váha, tréning, návyky), aby si človek mohol overiť, z čoho kouč vychádza. Len čítanie, nič sa tu nemení.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r0 = v => Math.round(Number(v) || 0);
const nf = v => r0(v).toLocaleString('sk-SK');
const kg = v => (Math.round(Number(v) * 10) / 10).toString().replace('.', ',') + ' kg';

const CSS = `
.bd-mem{padding:4px 2px 18px}.bd-mem .cm-h{margin:14px 2px 6px;font-size:13px;font-weight:700;color:var(--text)}
.cm-box{border:1px solid var(--line);border-radius:14px;background:var(--card);overflow:hidden}
.cm-r{display:flex;justify-content:space-between;gap:12px;padding:10px 14px;font-size:14px;line-height:1.35}
.cm-r+.cm-r{border-top:1px solid var(--line)}.cm-r span{color:var(--muted)}.cm-r b{font-weight:600;text-align:right;color:var(--text)}
.cm-note{margin:14px 2px 0;font-size:12.5px;line-height:1.5;color:var(--muted)}
.cm-empty{padding:12px 14px;font-size:13.5px;color:var(--muted)}
.bd-hbtn.cm{font-size:16px}
`;
if (!document.getElementById('cm-css')) { const s = document.createElement('style'); s.id = 'cm-css'; s.textContent = CSS; document.head.appendChild(s); }

const GOAL = { lose: 'schudnúť', maintain: 'udržať váhu', gain: 'nabrať svaly' };
const HB = { nicotine: 'nikotín', alcohol: 'alkohol' };
const box = rows => rows.length ? `<div class="cm-box">${rows.map(([l, v]) => `<div class="cm-r"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : '<div class="cm-box"><div class="cm-empty">Zatiaľ nemám dosť údajov.</div></div>';
const sec = (t, rows) => `<div class="cm-h">${esc(t)}</div>${box(rows)}`;

async function collect() {
  const p = ctx.state.profile, uid = p.id, today = calc.today();
  const d7 = calc.addDays(today, -7), d28 = calc.addDays(today, -28);
  const [food, weights, wlogs, cks, habits] = await Promise.all([
    db.foodByDay(uid, d7, calc.addDays(today, -1)).catch(() => ({})),
    db.listWeights(uid).catch(() => []),
    db.listWorkoutLogs(uid, d28).catch(() => []),
    db.sb.from('checkins').select('date,sleep_h').eq('user_id', uid).gte('date', d7).then(r => r.data || []).catch(() => []),
    db.sb.from('habits').select('kind,mode,daily_limit').eq('user_id', uid).eq('active', true).then(r => r.error ? [] : (r.data || [])).catch(() => []),
  ]);
  const out = [];
  const prof = [];
  if (p.name) prof.push(['Meno', p.name]);
  if (p.goal) prof.push(['Cieľ', GOAL[p.goal] || p.goal]);
  if (p.target_kcal) prof.push(['Denný cieľ', `${nf(p.target_kcal)} kcal`]);
  if (p.target_protein) prof.push(['Bielkoviny', `${nf(p.target_protein)} g`]);
  if (p.training_days) prof.push(['Tréningy týždenne', String(p.training_days)]);
  out.push(sec('Profil a ciele', prof));

  const days = Object.keys(food).filter(d => food[d].kcal > 0);
  const wk = [];
  if (days.length) {
    wk.push(['Dni so zápisom jedla', `${days.length} zo 7`]);
    wk.push(['Priemerný príjem', `${nf(days.reduce((a, d) => a + food[d].kcal, 0) / days.length)} kcal`]);
    wk.push(['Priemerné bielkoviny', `${nf(days.reduce((a, d) => a + food[d].protein, 0) / days.length)} g`]);
  }
  const sl = cks.map(c => Number(c.sleep_h)).filter(v => v > 0);
  if (sl.length) wk.push(['Priemerný spánok', `${(Math.round(sl.reduce((a, b) => a + b, 0) / sl.length * 10) / 10).toString().replace('.', ',')} h`]);
  out.push(sec('Posledných 7 dní', wk));

  const wt = [];
  if (weights.length) {
    const wl = weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) }));
    const tr = calc.trend(wl), last = wl[wl.length - 1];
    wt.push(['Posledné váženie', `${kg(last.weight)} (${calc.fmtDate(last.date)})`]);
    if (tr.length) wt.push(['Trend', kg(tr[tr.length - 1].trend)]);
    const ch = tr.length >= 2 ? calc.trendChange(tr, 7) : null;
    if (ch != null && isFinite(ch)) wt.push(['Zmena za 7 dní', `${ch > 0 ? '+' : ''}${(Math.round(ch * 10) / 10).toString().replace('.', ',')} kg`]);
    if (p.start_weight) wt.push(['Štartovacia váha', kg(p.start_weight)]);
  }
  out.push(sec('Váha', wt));

  const done = wlogs.filter(w => w.done);
  out.push(sec('Tréning', done.length ? [['Odtrénované za 28 dní', String(done.length)], ['Naposledy', calc.fmtDate(done[0].date)]] : []));

  if (habits.length) out.push(sec('Návyky', habits.map(h => [HB[h.kind] || h.kind, h.mode === 'quit' ? 'cieľ: skončiť' : `limit ${h.daily_limit} denne`])));
  return out.join('');
}

async function open() {
  const panel = document.querySelector('.bd-panel'); if (!panel || !ctx.state?.profile) return;
  const body = panel.querySelector('.bd-body');
  body.innerHTML = '<div class="bd-hist"><button class="bd-hback">← Späť na chat</button><div class="bd-mem"><p class="bd-hm">Načítavam...</p></div></div>';
  const back = () => { panel.querySelector('.bd-x')?.click(); setTimeout(() => document.querySelector('.bd-fab')?.click(), 60); };
  body.querySelector('.bd-hback').onclick = back;
  let html = '';
  try { html = await collect(); } catch (_) { html = '<p class="bd-hm">Údaje sa nenačítali. Skús to znova.</p>'; }
  if (!document.body.contains(body)) return;
  body.querySelector('.bd-mem').innerHTML = `<p class="cm-note" style="margin-top:4px">Toto vidí tvoj pomocník, keď ti odpovedá. Všetko je z toho, čo si zapísal v appke.</p>${html}
    <p class="cm-note">Pomocník vidí aj tvoje jedlá za posledný týždeň a aktuálny tréningový plán. Údaje sa nikomu nepredávajú. Svoje dáta si môžeš stiahnuť v Profile.</p>`;
  try { window.fwTrack && window.fwTrack('coach_mem'); } catch (_) { }
}

function inject() {
  const head = document.querySelector('.bd-panel .bd-head'), h = head?.querySelector('.bd-hbtn');
  if (!h || head.querySelector('.cm')) return;
  const b = document.createElement('button'); b.className = 'bd-hbtn cm'; b.type = 'button';
  b.setAttribute('aria-label', 'Čo o tebe viem'); b.title = 'Čo o tebe viem'; b.textContent = '🧠';
  b.onclick = open; h.before(b);
}
new MutationObserver(inject).observe(document.body, { childList: true, subtree: true });
