// Onboarding: dve krátke otázky navyše (aký je tvoj bežný deň, koľko krokov), z ktorých sa vypočíta presnejší výdaj energie.
// Hodnota sa ukladá do skrytého poľa "activity" ako kód a:<deň>:<kroky>:<tréningy>, takže uloženie ani výpočty inde sa nemenia.
import * as calc from './calc.js';
import { tr } from './i18n.js';
import { ctx } from './app.js';

const T = s => tr(s) || s;
const STEPS = [['3000', 'do 4'], ['5500', '4 až 7'], ['8500', '7 až 10'], ['11500', '10+'], ['auto', 'Neviem']];
const fmt = n => Number(n).toLocaleString('sk-SK');

const st0 = document.createElement('style');
st0.textContent = '.ob-act [data-g=steps] button b{font-size:13.5px;white-space:nowrap}';
document.head.appendChild(st0);

function build(form) {
  if (form.dataset.act) return true;
  const days = form.querySelector('[name=training_days]'), sel = form.querySelector('[name=activity]');
  const anchor = form.querySelector('.ob-g .ob-seg.days')?.closest('.ob-g');
  if (!days || !sel || !anchor) return false;
  form.dataset.act = '1';

  const cur = calc.decodeActivity(ctx?.state?.profile?.activity);
  const st = { job: cur?.job || 'desk', steps: 'auto' };
  if (cur) { const near = STEPS.filter(([v]) => v !== 'auto').reduce((a, b) => Math.abs(b[0] - cur.steps) < Math.abs(a[0] - cur.steps) ? b : a); st.steps = near[0]; }

  const box = document.createElement('div'); box.className = 'ob-g ob-act';
  box.innerHTML = `<div class="ob-t">${T('Aký je tvoj bežný deň?')}</div>
    <div class="ob-seg" role="radiogroup" data-g="job">${Object.entries(calc.JOBS).map(([k, j]) => `<button type="button" role="radio" data-v="${k}" aria-checked="false"><b>${T(j.label)}</b><small>${T(j.sub)}</small></button>`).join('')}</div>
    <div class="ob-t" style="margin-top:16px">${T('Koľko krokov denne (tisíce)?')}</div>
    <div class="ob-seg" role="radiogroup" data-g="steps">${STEPS.map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-checked="false"><b>${T(l)}</b></button>`).join('')}</div>
    <div class="ob-cap"></div>`;
  anchor.after(box);

  let busy = false;
  const apply = () => {
    const j = st.job, steps = st.steps === 'auto' ? calc.JOBS[j].steps : Number(st.steps), d = Math.max(0, Math.min(7, Number(days.value) || 0));
    const code = calc.encodeActivity({ job: j, steps, days: d });
    if (![...sel.options].some(o => o.value === code)) sel.add(new Option(code, code));
    box.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === (b.parentElement.dataset.g === 'job' ? st.job : st.steps))));
    box.querySelector('.ob-cap').textContent = T(`Počítam s ${fmt(steps)} krokmi denne${st.steps === 'auto' ? ' (odhad podľa tvojho dňa)' : ''}, ${d === 0 ? 'bez tréningov' : d === 1 ? 's jedným tréningom' : `s ${d} tréningami`} týždenne.`);
    if (sel.value !== code) { sel.value = code; busy = true; form.dispatchEvent(new Event('change', { bubbles: true })); busy = false; }
  };
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    st[b.parentElement.dataset.g] = b.dataset.v; apply();
  });
  form.addEventListener('input', () => { if (!busy) apply(); });
  apply();
  return true;
}

function scan() { const f = document.querySelector('#app #onb'); if (f) build(f); }
const app = document.getElementById('app');
if (app) { new MutationObserver(scan).observe(app, { childList: true, subtree: true }); scan(); }
