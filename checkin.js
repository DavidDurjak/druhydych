// v0.8: týždenný check-in (60 sekúnd) + plán „ak, tak“ na ďalší týždeň
import { sb } from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { defaultWeek, reportReady } from './report.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), nav = (...a) => ctx.nav(...a);
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

export const SCALES = {
  energy: { q: 'Koľko si mal tento týždeň energie?', o: [['😴', 'Žiadna'], ['😕', 'Málo'], ['😐', 'Bežne'], ['🙂', 'Dosť'], ['⚡', 'Na maximum']] },
  sleep: { q: 'Ako si spal?', o: [['😵', 'Zle'], ['😕', 'Slabo'], ['😐', 'Bežne'], ['🙂', 'Dobre'], ['😴', 'Výborne']] },
  hunger: { q: 'Aký si bol hladný počas dňa?', o: [['🙂', 'Skoro vôbec'], ['😌', 'Málo'], ['😐', 'Normálne'], ['😬', 'Často'], ['😫', 'Stále']] },
  mood: { q: 'Nálada a chuť pokračovať?', o: [['😞', 'Na dne'], ['😕', 'Slabá'], ['😐', 'Okej'], ['🙂', 'Dobrá'], ['🔥', 'Idem naplno']] },
};
const WINS = ['Trafil som kalórie', 'Odtrénoval som všetko', 'Viac bielkovín', 'Zapisoval som každý deň', 'Lepší spánok', 'Menej sladkého'];
const PLANS = {
  log: ['Ak dojem, tak to hneď zapíšem, kým odložím tanier.', 'Ak je 21:00 a deň nemám zapísaný, tak ho doplním za 2 minúty.', 'Ak jem to isté ako včera, tak dám „Rovnako ako včera“.'],
  kcal: ['Ak mi večer zostáva menej ako 500 kcal, tak si dám bielkoviny a zeleninu.', 'Ak idem cez víkend von, tak cez deň jem ľahšie a zapíšem odhad.', 'Ak dostanem chuť na sladké, tak si najprv dám vodu a ovocie.'],
  protein: ['Ak raňajkujem, tak pridám skyr, tvaroh alebo vajcia.', 'Ak si kupujem jedlo von, tak vyberiem niečo s mäsom alebo strukovinami.', 'Ak cvičím, tak do 2 hodín zjem aspoň 30 g bielkovín.'],
  training: ['Ak je pondelok, streda alebo piatok o 17:00, tak idem trénovať.', 'Ak nemám čas na celý tréning, tak spravím aspoň 20 minút.', 'Ak sa mi nechce, tak si zbalím tašku a idem aspoň na rozcvičku.'],
  weigh: ['Ak ráno vstanem, tak sa po WC odvážim a zapíšem to.', 'Ak je pondelok, štvrtok alebo sobota, tak sa ráno odvážim.', 'Ak sa odvážim, tak sa pozerám na trend, nie na jedno číslo.'],
};

export async function getCheckin(userId, weekStart) {
  return must(await sb.from('weekly_checkins').select('*').eq('user_id', userId).eq('week_start', weekStart).maybeSingle());
}
async function latestPlan(userId) {
  const from = calc.addDays(calc.weekStart(calc.today()), -7);
  const rows = must(await sb.from('weekly_checkins').select('week_start,plan').eq('user_id', userId).gte('week_start', from).order('week_start', { ascending: false }).limit(1));
  return rows[0]?.plan ? rows[0] : null;
}

// Karta na Dnes: výzva na check-in (nedeľa večer až utorok) alebo plán na tento týždeň
export async function weekCardHtml(userId) {
  const wk = defaultWeek();
  const [ci, plan] = await Promise.all([reportReady() ? getCheckin(userId, wk).catch(() => null) : Promise.resolve(true), latestPlan(userId).catch(() => null)]);
  if (!ci) return `<a class="wc-card" href="#/tyzden"><span class="wc-i">🌬️</span><div><h3>Týždenný check-in</h3><p>60 sekúnd: ako sa cítiš a jeden plán na ďalší týždeň.</p></div><span class="wc-go">›</span></a>`;
  if (plan) return `<section class="plan-card"><small>Tvoj plán na tento týždeň</small><p>${h(plan.plan)}</p></section>`;
  return '';
}

export async function renderWeekCheckin() {
  const p = state().profile, uid = p.id;
  const wk = defaultWeek();
  const [existing, rep] = await Promise.all([getCheckin(uid, wk).catch(() => null), sb.rpc('weekly_report', { p_user: uid, p_from: wk }).then(r => r.data).catch(() => null)]);
  const ans = { energy: existing?.energy || 0, sleep: existing?.sleep || 0, hunger: existing?.hunger || 0, mood: existing?.mood || 0, win: existing?.win || '', plan: existing?.plan || '' };
  const focus = rep?.focus || 'log';
  const suggestions = PLANS[focus] || PLANS.log;
  const steps = ['energy', 'sleep', 'hunger', 'mood', 'win', 'plan'];
  let i = 0;

  const draw = () => {
    const key = steps[i];
    let body = '';
    if (SCALES[key]) {
      const sc = SCALES[key];
      body = `<h2 class="wc-q">${sc.q}</h2><div class="wc-opts">${sc.o.map(([e, l], n) => `<button data-v="${n + 1}" class="${ans[key] === n + 1 ? 'on' : ''}"><span>${e}</span><b>${l}</b></button>`).join('')}</div>`;
    } else if (key === 'win') {
      body = `<h2 class="wc-q">Čo sa ti tento týždeň podarilo?</h2><div class="wc-chips">${WINS.map(w => `<button data-w="${h(w)}" class="${ans.win.includes(w) ? 'on' : ''}">${h(w)}</button>`).join('')}</div>
        <textarea class="input mt" id="wcWin" rows="3" maxlength="300" placeholder="Alebo napíš vlastnými slovami (nepovinné)">${h(ans.win)}</textarea>
        <button class="btn primary mt" id="wcNext">Ďalej</button>`;
    } else {
      body = `<h2 class="wc-q">Jeden plán na ďalší týždeň</h2><p class="muted small mb">Plán „ak, tak“ funguje lepšie ako predsavzatie. Vyber jeden alebo napíš svoj.</p>
        <div class="wc-plans">${suggestions.map(s => `<button data-p="${h(s)}" class="${ans.plan === s ? 'on' : ''}">${h(s)}</button>`).join('')}</div>
        <textarea class="input mt" id="wcPlan" rows="2" maxlength="200" placeholder="Ak ..., tak ...">${suggestions.includes(ans.plan) ? '' : h(ans.plan)}</textarea>
        <button class="btn primary mt" id="wcSave">Uložiť check-in</button>`;
    }
    $app().innerHTML = `<div class="screen wc">
      <div class="wc-top"><button class="btn icon ghost" id="wcBack" aria-label="Späť">‹</button><div class="wc-prog">${steps.map((_, n) => `<i class="${n < i ? 'done' : n === i ? 'now' : ''}"></i>`).join('')}</div><span class="muted small">${i + 1}/${steps.length}</span></div>
      <p class="wc-week">Týždeň ${calc.fmtDate(wk)} až ${calc.fmtDate(calc.addDays(wk, 6))}</p>
      ${body}
    </div>${nav('#/tyzden')}`;
    bind();
  };

  const bind = () => {
    const R = $app();
    R.querySelector('#wcBack').onclick = () => { if (i === 0) history.back(); else { i--; draw(); } };
    R.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { ans[steps[i]] = Number(b.dataset.v); b.classList.add('on'); setTimeout(() => { i++; draw(); }, 180); });
    R.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
      const w = b.dataset.w, ta = R.querySelector('#wcWin');
      const parts = ta.value.split(', ').map(x => x.trim()).filter(Boolean);
      const at = parts.indexOf(w); if (at >= 0) parts.splice(at, 1); else parts.push(w);
      ta.value = parts.join(', '); b.classList.toggle('on', at < 0);
    });
    R.querySelector('#wcNext')?.addEventListener('click', () => { ans.win = R.querySelector('#wcWin').value.trim(); i++; draw(); });
    R.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { ans.plan = b.dataset.p; R.querySelectorAll('[data-p]').forEach(x => x.classList.toggle('on', x === b)); R.querySelector('#wcPlan').value = ''; });
    R.querySelector('#wcPlan')?.addEventListener('input', e => { if (e.target.value.trim()) { ans.plan = e.target.value.trim(); R.querySelectorAll('[data-p]').forEach(x => x.classList.remove('on')); } });
    R.querySelector('#wcSave')?.addEventListener('click', save);
  };

  const save = async () => {
    const btn = $app().querySelector('#wcSave'); btn.disabled = true;
    try {
      must(await sb.from('weekly_checkins').upsert({ user_id: uid, week_start: wk, energy: ans.energy || null, sleep: ans.sleep || null, hunger: ans.hunger || null, mood: ans.mood || null, win: ans.win || null, plan: ans.plan || null }, { onConflict: 'user_id,week_start' }));
      $app().innerHTML = `<div class="screen wc wc-done">
        <div class="wc-big">🌬️</div><h1>Hotovo</h1>
        <p class="muted">Kouč uvidí, ako sa máš. ${ans.plan ? 'Tvoj plán sa ti celý týždeň ukáže na obrazovke Dnes.' : ''}</p>
        ${ans.plan ? `<section class="plan-card mt"><small>Plán na ďalší týždeň</small><p>${h(ans.plan)}</p></section>` : ''}
        <a class="btn primary mt" href="#/report?w=${wk}">Pozrieť týždenný report</a>
        <a class="btn ghost mt" href="#/">Späť na Dnes</a>
      </div>${nav('#/tyzden')}`;
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  };
  draw();
}

// Pre kouča: krátky súhrn check-inu (report účastníka)
export function checkinSummaryHtml(ci) {
  if (!ci) return `<section class="pg-card"><h3>Check-in</h3><p class="muted small mt">Tento týždeň ešte nevyplnený.</p></section>`;
  const cell = k => { const v = ci[k]; if (!v) return ''; const [e, l] = SCALES[k].o[v - 1]; return `<div class="wc-s ${(k === 'hunger' && v >= 4) || (k !== 'hunger' && v <= 2) ? 'warn' : ''}"><span>${e}</span><b>${l}</b><small>${{ energy: 'energia', sleep: 'spánok', hunger: 'hlad', mood: 'nálada' }[k]}</small></div>`; };
  return `<section class="pg-card"><h3 class="mb">Check-in</h3>
    <div class="wc-sum">${['energy', 'sleep', 'hunger', 'mood'].map(cell).join('')}</div>
    ${ci.win ? `<p class="small mt"><b>Podarilo sa:</b> ${h(ci.win)}</p>` : ''}
    ${ci.plan ? `<p class="small mt"><b>Plán:</b> ${h(ci.plan)}</p>` : ''}
  </section>`;
}
// signál pre kouča: niečo nie je v poriadku
export function checkinAlert(ci) {
  if (!ci) return null;
  if (ci.mood && ci.mood <= 2) return 'nízka nálada';
  if (ci.energy && ci.energy <= 2) return 'málo energie';
  if (ci.hunger && ci.hunger >= 4) return 'veľký hlad';
  if (ci.sleep && ci.sleep <= 2) return 'zlý spánok';
  return null;
}
