// CrossFit (v335): platený kruhový plán od Laury, vstup z obrazovky Tréning (karta pod Behom) a cez #/crossfit.
// Zápis cvikov: "Názov | počet" (opakovania, "1 min" výdrž). Hodnoty označené " ?" Laura ešte skontroluje.
// Formát: každý cvik 1 séria, medzi cvikmi najviac 20 s pauza, medzi kolami 1 až 2 min. Plán je len pre GainTrain Plus.
import { ctx } from './app.js';
import { isPremium, paywall } from './billing.js';

const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const WARMUP = {
  title: 'Aktívny strečing s expandrom',
  sub: 'Na rozohriatie, 8 až 10 minút. Každý cvik 2 série, pomaly a s kontrolou.',
  items: [
    ['Otvárače hrudníka s expandrom', '2x12'],
    ['Pull-apart (rozťahovanie expandra)', '2x15'],
    ['Good morning s expandrom', '2x12'],
    ['Drep s expandrom nad kolenami', '2x12'],
    ['Bočné kroky s expandrom', '2x10 na stranu'],
    ['Výpad s rotáciou trupu', '2x8 na stranu'],
    ['Kruhy rukami a panvou', '2x10'],
  ],
};

const SETS = {
  out: {
    label: 'Vonku', e: '🌳', sub: 'Park, ihrisko alebo dvor. Stačí švihadlo a hrazda.',
    days: [
      { name: 'Vonku 1', rounds: 3, items: [['Drepy', '15'], ['Kliky', '10'], ['Výpady', '12 na nohu'], ['Plank', '1 min'], ['Mountain climbers', '20'], ['Švihadlo', '1 min ?']] },
      { name: 'Vonku 2', rounds: 4, items: [['Anglicáky (burpees)', '10'], ['Zhyby', '6'], ['Drep s výskokom', '15'], ['Dipy', '10'], ['Šprint', '100 m']] },
    ],
  },
  in: {
    label: 'Vnútri', e: '🏋️', sub: 'Posilňovňa alebo box. Kettlebell, jednoručky, debna, lopta a airbike.',
    days: [
      { name: 'Vnútri 1', rounds: 3, items: [['Švih s kettlebellom', '12'], ['Sumo drep', '12'], ['Kliky', '10'], ['Box step-ups', '10 na nohu'], ['Plank', '30 s']] },
      { name: 'Vnútri 2', rounds: 4, items: [['Dumbbell snatch s jednoručkou', '12'], ['Výskoky na debnu', '10'], ['Švihy s kettlebellom', '15'], ['Zhyby', '8'], ['Výpady v chôdzi', '20']] },
      { name: 'Vnútri 3', rounds: 4, items: [['Anglicáky (burpees)', '10'], ['Hody loptou o stenu', '15'], ['Švihy s kettlebellom', '15'], ['Výstupy na debnu', '10'], ['Airbike na záver', '2 min']] },
    ],
  },
};

const KEY = 'gt-cf-v1';
const today = () => new Date().toISOString().slice(0, 10);
function store(set) {
  try { const o = JSON.parse(localStorage.getItem(KEY) || '{}'); if (set) { localStorage.setItem(KEY, JSON.stringify(set(o) || o)); return o; } return o; } catch (_) { return {}; }
}
const doneOf = id => { const o = store(); return o.d === today() ? (o.r?.[id] || 0) : 0; };
const setDone = (id, n) => store(o => { if (o.d !== today()) o = { d: today(), r: {} }; o.r[id] = n; return o; });

let tab = 'out', timer = 0;
const CSS = `
.cf .cf-tabs{display:flex;gap:8px;margin:0 0 14px}
.cf .cf-tabs button{flex:1;padding:12px 10px;border-radius:16px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-weight:800;font-size:15px}
.cf .cf-tabs button.on{border-color:#FF7A1A;background:linear-gradient(125deg,#FF9A3D,#FF5F2E);color:#1B0A00}
.cf .cf-rule{padding:13px 14px;border-radius:18px;background:var(--card);border:1px solid var(--line);font-size:13.5px;line-height:1.5;color:var(--muted);margin:0 0 14px}
.cf .cf-rule b{color:var(--text)}
.cf .cf-card{padding:15px;border-radius:22px;background:var(--card);border:1px solid var(--line);margin:0 0 12px}
.cf .cf-card h3{margin:0;font-size:18px;letter-spacing:-.02em;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.cf .cf-card h3 small{font-size:13px;font-weight:700;color:var(--muted)}
.cf .cf-ex{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:15px}
.cf .cf-ex:first-of-type{margin-top:10px}
.cf .cf-ex span:last-child{font-weight:800;white-space:nowrap}
.cf .cf-rounds{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.cf .cf-rounds button{flex:1;min-width:64px;padding:11px 8px;border-radius:14px;border:1.5px solid var(--line);background:transparent;color:var(--text);font:inherit;font-weight:800}
.cf .cf-rounds button.on{background:#FF7A1A;border-color:#FF7A1A;color:#1B0A00}
.cf .cf-lock .cf-ex.blur{filter:blur(5px);user-select:none;pointer-events:none}
.cf .cf-unlock{display:block;width:100%;margin-top:12px;padding:14px;border-radius:16px;border:0;background:linear-gradient(125deg,#FF9A3D,#FF5F2E);color:#1B0A00;font:inherit;font-weight:800;font-size:15.5px}
.cf-rest{position:fixed;left:16px;right:16px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:50;padding:14px 16px;border-radius:20px;background:#1B0A00;color:#FFD9B8;display:flex;justify-content:space-between;align-items:center;box-shadow:0 14px 34px -14px #000}
.cf-rest b{font-size:26px;font-variant-numeric:tabular-nums;color:#fff}
.cf-rest button{border:0;border-radius:12px;padding:9px 14px;background:#FF7A1A;color:#1B0A00;font:inherit;font-weight:800}
`;
function css() { if (document.getElementById('cfCss')) return; const s = document.createElement('style'); s.id = 'cfCss'; s.dataset.fwLight = ''; s.textContent = CSS; document.head.appendChild(s); }

function exRow(x, blur) { return `<div class="cf-ex${blur ? ' blur' : ''}"><span>${h(x[0])}</span><span>${h(x[1])}</span></div>`; }

export async function render() {
  css();
  const prem = isPremium(), S = SETS[tab];
  const warm = `<div class="cf-card${prem ? '' : ' cf-lock'}"><h3>${h(WARMUP.title)}</h3><p class="muted" style="margin:4px 0 0;font-size:13.5px">${h(WARMUP.sub)}</p>${WARMUP.items.map((x, i) => exRow(x, !prem && i > 1)).join('')}</div>`;
  const days = S.days.map((d, di) => {
    const id = tab + di, n = doneOf(id);
    const rounds = prem ? `<div class="cf-rounds">${Array.from({ length: d.rounds }, (_, i) => `<button type="button" data-id="${id}" data-i="${i + 1}" class="${i < n ? 'on' : ''}">Kolo ${i + 1}</button>`).join('')}</div>` : '';
    return `<div class="cf-card${prem ? '' : ' cf-lock'}"><h3>${h(d.name)}<small>${d.rounds} kolá</small></h3>${d.items.map((x, i) => exRow(x, !prem && i > 1)).join('')}${rounds}</div>`;
  }).join('');
  ctx.$app.innerHTML = `<div class="screen cf"><div class="rn-h" style="margin-bottom:14px"><h1>CrossFit</h1><p>Kruhové tréningy. Vonku aj vnútri.</p></div>
    <div class="cf-tabs">${Object.entries(SETS).map(([k, v]) => `<button type="button" data-t="${k}" class="${k === tab ? 'on' : ''}">${v.e} ${v.label}</button>`).join('')}</div>
    <div class="cf-rule"><b>Ako na to:</b> každý cvik robíš jednu sériu a hneď ideš na ďalší, pauza medzi cvikmi najviac 20 sekúnd. Keď prejdeš všetky cviky, máš 1 až 2 minúty pauzu a ideš odznova. Spolu ${S.days[0].rounds} až ${Math.max(...S.days.map(d => d.rounds))} kolá.</div>
    ${warm}${days}${prem ? '' : '<button class="cf-unlock" type="button" id="cfUnlock">Odomknúť CrossFit s GainTrain Plus</button>'}</div>${ctx.nav('#/trening')}`;
  const root = ctx.$app.querySelector('.cf');
  root.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
  root.querySelector('#cfUnlock')?.addEventListener('click', () => paywall({ feature: 'crossfit', reason: 'premium_only' }));
  root.querySelectorAll('.cf-rounds button').forEach(b => b.onclick = () => {
    const id = b.dataset.id, i = Number(b.dataset.i), now = doneOf(id);
    const next = now === i ? i - 1 : i; setDone(id, next);
    root.querySelectorAll(`.cf-rounds button[data-id="${id}"]`).forEach(x => x.classList.toggle('on', Number(x.dataset.i) <= next));
    if (next > now) rest(90);
  });
}

function rest(sec) {
  clearInterval(timer); document.querySelector('.cf-rest')?.remove();
  const el = document.createElement('div'); el.className = 'cf cf-rest';
  let left = sec; const mm = () => `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  el.innerHTML = `<span>Pauza</span><b>${mm()}</b><button type="button">Preskočiť</button>`;
  document.body.appendChild(el);
  const stop = () => { clearInterval(timer); el.remove(); };
  el.querySelector('button').onclick = stop;
  timer = setInterval(() => { left--; if (left <= 0 || !document.body.contains(el)) { stop(); try { navigator.vibrate?.(200); } catch (_) { } return; } el.querySelector('b').textContent = mm(); }, 1000);
}
addEventListener('hashchange', () => { if (!(location.hash || '').startsWith('#/crossfit')) { clearInterval(timer); document.querySelector('.cf-rest')?.remove(); } });
