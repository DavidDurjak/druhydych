// Pohyb (v328): zápis športu a aktivít so spálenými kalóriami (hokej, futbal, bicykel, plávanie, upratovanie…).
// Kalórie = MET × hmotnosť × hodiny (Compendium of Physical Activities). Behy zo sekcie Beh sa započítajú samy.
// K dennému cieľu sa pripočíta polovica (predvolené): tabuľky aj hodinky výdaj nadhodnocujú a bežný pohyb už je v cieli.
// Dáta: tabuľka activity_logs (supabase/migrations/20261102_activity.sql).
import { ctx } from './app.js';
import * as db from './data.js';

const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (...a) => ctx.toast(...a);
const st = () => ctx.state;

// [id, názov, MET, emoji, skupina, kľúčové slová]
export const ACTS = [
  ['football', 'Futbal (rekreačne)', 7, '⚽', 'sport', 'futbal kopana'], ['football_m', 'Futbal (zápas)', 10, '⚽', 'sport', 'futbal kopana zapas'],
  ['hockey', 'Hokej (rekreačne)', 8, '🏒', 'sport', 'hokej lad'], ['hockey_m', 'Hokej (zápas)', 10, '🏒', 'sport', 'hokej lad zapas'],
  ['hockeyball', 'Hokejbal', 7, '🏑', 'sport', 'hokejbal'], ['floorball', 'Florbal', 8, '🏑', 'sport', 'florbal unihokej'],
  ['basket', 'Basketbal (hra)', 6.5, '🏀', 'sport', 'basketbal kos'], ['basket_m', 'Basketbal (zápas)', 8, '🏀', 'sport', 'basketbal zapas'],
  ['volley', 'Volejbal', 4, '🏐', 'sport', 'volejbal'], ['beachvolley', 'Plážový volejbal', 8, '🏐', 'sport', 'plazovy volejbal beach'],
  ['handball', 'Hádzaná', 8, '🤾', 'sport', 'hadzana'], ['tennis', 'Tenis (dvojhra)', 8, '🎾', 'sport', 'tenis'], ['tennis2', 'Tenis (štvorhra)', 6, '🎾', 'sport', 'tenis stvorhra'],
  ['padel', 'Padel', 6, '🎾', 'sport', 'padel'], ['tabletennis', 'Stolný tenis', 4, '🏓', 'sport', 'stolny tenis pingpong ping pong'],
  ['badminton', 'Bedminton', 5.5, '🏸', 'sport', 'bedminton badminton'], ['squash', 'Squash', 12, '🎾', 'sport', 'squash'],
  ['golf', 'Golf (s chôdzou)', 4.8, '⛳', 'sport', 'golf'], ['climb', 'Lezenie na stene', 8, '🧗', 'sport', 'lezenie stena boulder'],
  ['box', 'Box (vrece, lapy)', 5.5, '🥊', 'sport', 'box boxovanie vrece'], ['box_s', 'Box (sparing)', 7.8, '🥊', 'sport', 'box sparing'],
  ['martial', 'Bojové umenia (karate, judo, MMA)', 10.3, '🥋', 'sport', 'karate judo mma bojove kickbox'],
  ['ski', 'Lyžovanie (zjazd)', 5.3, '⛷️', 'sport', 'lyzovanie zjazd lyze'], ['xc', 'Bežky', 9, '🎿', 'sport', 'bezky bezecke lyzovanie'],
  ['snowboard', 'Snowboard', 5.3, '🏂', 'sport', 'snowboard'], ['skate', 'Korčuľovanie', 7, '⛸️', 'sport', 'korculovanie lad'],
  ['inline', 'Kolieskové korčule', 7.5, '🛼', 'sport', 'kolieskove korcule inline'], ['horse', 'Jazda na koni', 5.5, '🐎', 'sport', 'kon jazda'],
  ['dance', 'Tanec', 5, '💃', 'sport', 'tanec tancovanie'], ['zumba', 'Zumba', 6.5, '💃', 'sport', 'zumba'],
  ['swim', 'Plávanie (pomaly)', 5.8, '🏊', 'cardio', 'plavanie bazen'], ['swim_f', 'Plávanie (rýchlo)', 9.8, '🏊', 'cardio', 'plavanie bazen rychlo'],
  ['kayak', 'Kajak, kanoe', 5, '🛶', 'cardio', 'kajak kanoe splav'], ['sup', 'Paddleboard', 6, '🏄', 'cardio', 'paddleboard sup'],
  ['bike', 'Bicykel (pohodovo)', 4, '🚲', 'cardio', 'bicykel bicyklovanie'], ['bike_m', 'Bicykel (stredne, 20 km/h)', 8, '🚴', 'cardio', 'bicykel cyklistika'],
  ['bike_f', 'Bicykel (rýchlo, 25+ km/h)', 10, '🚴', 'cardio', 'bicykel cyklistika rychlo cestak'], ['mtb', 'Horský bicykel', 8.5, '🚵', 'cardio', 'horsky bicykel mtb'],
  ['ebike', 'Elektrobicykel', 4, '🚲', 'cardio', 'elektrobicykel ebike'], ['spin', 'Spinning, rotoped', 8.5, '🚴', 'cardio', 'spinning rotoped stacionarny'],
  ['elliptic', 'Eliptický trenažér', 5, '🏃', 'cardio', 'elipticky trenazer elipsa orbitrek'], ['row', 'Veslovací trenažér', 7, '🚣', 'cardio', 'veslovanie trenazer'],
  ['rope', 'Švihadlo', 11.8, '🪢', 'cardio', 'svihadlo'], ['stairs', 'Schody, stepper', 9, '🪜', 'cardio', 'schody stepper'],
  ['hike', 'Turistika', 6, '🥾', 'cardio', 'turistika hory vylet'], ['walk', 'Chôdza (5 km/h)', 3.5, '🚶', 'cardio', 'chodza prechadzka'],
  ['walk_f', 'Rýchla chôdza (6 km/h)', 4.3, '🚶', 'cardio', 'rychla chodza'], ['nordic', 'Nordic walking', 4.8, '🚶', 'cardio', 'nordic walking palice'],
  ['hiit', 'HIIT, kruhový tréning', 8, '🔥', 'gym', 'hiit kruhovy trening tabata'], ['crossfit', 'CrossFit', 8, '🏋️', 'gym', 'crossfit'],
  ['gym', 'Posilňovanie', 3.5, '🏋️', 'gym', 'posilnovanie posilnovna cinky'], ['gym_h', 'Posilňovanie (intenzívne)', 6, '🏋️', 'gym', 'posilnovanie tazke'],
  ['calis', 'Kalistenika', 5, '🤸', 'gym', 'kalistenika zhyby kliky'], ['aerobic', 'Aerobik', 7.3, '🤸', 'gym', 'aerobik'],
  ['yoga', 'Joga', 2.5, '🧘', 'gym', 'joga yoga'], ['pilates', 'Pilates', 3, '🧘', 'gym', 'pilates'], ['stretch', 'Strečing', 2.3, '🤸', 'gym', 'strecing natahovanie'],
  ['clean', 'Upratovanie', 3.3, '🧹', 'home', 'upratovanie vysavanie'], ['cook', 'Varenie', 2, '🍳', 'home', 'varenie'],
  ['garden', 'Práca v záhrade', 4, '🌱', 'home', 'zahrada zahradka'], ['mow', 'Kosenie trávy', 5.5, '🌿', 'home', 'kosenie trava'],
  ['snow', 'Odhŕňanie snehu', 5.3, '❄️', 'home', 'odhranie sneh lopata'], ['kids', 'Hra s deťmi', 4, '🧒', 'home', 'deti hra'],
  ['dog', 'Venčenie psa', 3, '🐕', 'home', 'pes vencenie'], ['moving', 'Sťahovanie, nosenie', 6, '📦', 'home', 'stahovanie nosenie'],
  ['labor', 'Fyzická práca (stavba)', 5.5, '🔨', 'home', 'stavba praca fyzicka'], ['carwash', 'Umývanie auta', 3, '🚗', 'home', 'auto umyvanie'],
];
const GROUPS = [['all', 'Všetko'], ['recent', 'Nedávne'], ['sport', 'Šport'], ['cardio', 'Kardio'], ['gym', 'Cvičenie'], ['home', 'Doma a práca']];
const A = id => ACTS.find(a => a[0] === id);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
const kg = () => Number(st().profile?.start_weight) || 72;
export const kcalOf = (met, min) => Math.round(met * kg() * min / 60);

// pripočítanie k cieľu: half (predvolené), full, none
export function addMode() { try { return localStorage.getItem('gt_move_mode_' + (st().profile?.id || '')) || 'half'; } catch (_) { return 'half'; } }
function setMode(m) { try { localStorage.setItem('gt_move_mode_' + st().profile.id, m); } catch (_) { } }
export const bonusOf = kcal => addMode() === 'full' ? kcal : addMode() === 'none' ? 0 : Math.round(kcal / 2);

// pohyb dňa: zapísané aktivity + behy zo sekcie Beh
export async function dayMove(uid, date) {
  const from = new Date(date + 'T00:00:00'), to = new Date(from); to.setDate(to.getDate() + 1);
  const [a, r] = await Promise.all([
    db.sb.from('activity_logs').select('id,act,name,minutes,kcal,created_at').eq('user_id', uid).eq('date', date).order('created_at'),
    db.sb.from('runs').select('id,kind,title,duration_s,distance_m,kcal,started_at').eq('user_id', uid).gte('started_at', from.toISOString()).lt('started_at', to.toISOString()),
  ]);
  const acts = a.error ? [] : (a.data || []);
  const runs = r.error ? [] : (r.data || []).map(x => ({ id: x.id, run: true, name: x.title || 'Beh', minutes: Math.round(x.duration_s / 60), kcal: x.kcal || 0, km: Number(x.distance_m) / 1000, kind: x.kind }));
  const items = [...acts, ...runs];
  return { items, kcal: items.reduce((s, x) => s + Number(x.kcal || 0), 0), missing: !!a.error };
}

const CSS = `
.mv h2{margin:0 0 4px;font-size:24px;letter-spacing:-.03em}
.mv>p{margin:0 0 12px;color:var(--muted);font-size:13.5px;line-height:1.45}
.mv-sum{display:flex;align-items:center;gap:12px;padding:14px;border-radius:20px;margin:0 0 12px;background:linear-gradient(130deg,color-mix(in srgb,#FF7A45 22%,var(--card)),color-mix(in srgb,#FF3B6B 14%,var(--card)));border:1px solid color-mix(in srgb,#FF7A45 30%,transparent)}
.mv-sum b{font-size:30px;font-weight:800;letter-spacing:-.04em;font-variant-numeric:tabular-nums;line-height:1}
.mv-sum span{font-size:12.5px;color:var(--muted);display:block;margin-top:3px}
.mv-sum em{margin-left:auto;font-style:normal;text-align:right;font-size:12.5px;color:var(--muted)}
.mv-sum em strong{display:block;font-size:17px;color:var(--text)}
.mv-day{margin:0 0 12px}
.mv-it{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line)}
.mv-it:first-child{border-top:0}
.mv-it .e{flex:none;width:40px;height:40px;border-radius:13px;display:grid;place-items:center;font-size:21px;background:color-mix(in srgb,var(--text) 7%,transparent)}
.mv-it div{flex:1;min-width:0}
.mv-it b{display:block;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mv-it small{display:block;color:var(--muted);font-size:12.5px;margin-top:1px}
.mv-it strong{font-variant-numeric:tabular-nums;font-size:14.5px}
.mv-it button{border:0;background:none;color:var(--muted);font-size:20px;cursor:pointer;padding:4px 6px}
.mv-q{width:100%;height:46px;border-radius:14px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:16px;padding:0 14px;margin:0 0 10px}
.mv-g{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 0 8px;padding:1px}
.mv-g::-webkit-scrollbar{display:none}
.mv-g button{flex:none;padding:8px 13px;border-radius:99px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}
.mv-g button.on{background:var(--text);color:var(--card);border-color:var(--text)}
.mv-list{max-height:min(46vh,420px);overflow:auto;margin:0 -4px;padding:0 4px}
.mv-a{display:flex;align-items:center;gap:12px;width:100%;padding:10px 6px;border:0;border-top:1px solid var(--line);background:none;color:var(--text);font:inherit;text-align:left;cursor:pointer}
.mv-a:first-child{border-top:0}
.mv-a .e{flex:none;width:40px;height:40px;border-radius:13px;display:grid;place-items:center;font-size:21px;background:color-mix(in srgb,var(--text) 7%,transparent)}
.mv-a b{flex:1;font-size:15px;font-weight:600}
.mv-a small{color:var(--muted);font-size:12.5px;white-space:nowrap}
.mv-a i{font-style:normal;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:var(--on-accent,#06140C);font-size:20px;font-weight:700;flex:none}
.mv-none{text-align:center;padding:24px 10px;color:var(--muted);font-size:14px}
.mv-d{text-align:center}
.mv-d .e{font-size:46px;line-height:1;display:block;margin:4px 0 8px}
.mv-d h3{margin:0 0 4px;font-size:21px;letter-spacing:-.02em}
.mv-big{font-size:46px;font-weight:800;letter-spacing:-.05em;font-variant-numeric:tabular-nums;margin:12px 0 0;line-height:1}
.mv-big small{font-size:16px;color:var(--muted);font-weight:700;letter-spacing:0;margin-left:4px}
.mv-hint{color:var(--muted);font-size:12.5px;margin:6px 0 14px}
.mv-st{display:flex;align-items:center;justify-content:center;gap:14px;margin:6px 0 12px}
.mv-st button{width:48px;height:48px;border-radius:50%;border:1.5px solid var(--line);background:var(--card);color:var(--text);font-size:24px;font-weight:700;cursor:pointer}
.mv-st output{min-width:110px;font-size:30px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.mv-st output small{font-size:14px;color:var(--muted);font-weight:700;margin-left:3px}
.mv-qt{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:0 0 16px}
.mv-qt button{padding:8px 13px;border-radius:99px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}
.mv-qt button.on{background:var(--text);color:var(--card);border-color:var(--text)}
.mv-go{width:100%;height:54px;border-radius:18px;border:0;font:inherit;font-size:16.5px;font-weight:800;cursor:pointer;color:#fff;background:linear-gradient(120deg,#FF7A45,#FF3B6B)}
.mv-mode{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;border-radius:14px;background:color-mix(in srgb,var(--text) 6%,transparent);margin:6px 0 4px}
.mv-mode button{height:34px;border:0;border-radius:10px;background:none;color:var(--muted);font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.mv-mode button.on{background:var(--card);color:var(--text);box-shadow:0 1px 4px rgba(0,0,0,.12)}
.mv-lab{display:block;font-size:12.5px;font-weight:700;color:var(--muted);margin:14px 2px 6px}
/* Dnes: riadok pod "kcal zjedené" */
.hk-move{display:inline-flex;align-items:center;gap:7px;margin:8px auto 0;padding:7px 13px;border-radius:99px;border:0;font:inherit;font-size:13px;font-weight:700;cursor:pointer;
  background:color-mix(in srgb,#FF7A45 16%,transparent);color:var(--text)}
.hk-move b{font-variant-numeric:tabular-nums}
.hk-move small{color:var(--muted);font-weight:600;font-size:12.5px}
.hk-move.empty{background:color-mix(in srgb,var(--text) 7%,transparent);color:var(--muted)}
`;
function css() { if (document.getElementById('mvCss')) return; const s = document.createElement('style'); s.id = 'mvCss'; s.dataset.fwLight = ''; s.textContent = CSS; document.head.appendChild(s); }
const recentKey = () => 'gt_move_recent_' + (st().profile?.id || '');
const recent = () => { try { return JSON.parse(localStorage.getItem(recentKey()) || '[]'); } catch (_) { return []; } };
const pushRecent = id => { try { localStorage.setItem(recentKey(), JSON.stringify([id, ...recent().filter(x => x !== id)].slice(0, 12))); } catch (_) { } };

// hlavné okno: dnešný pohyb + pridanie aktivity
export async function openMove(date) {
  css();
  const uid = st().profile.id;
  date = date || st().date || new Date().toISOString().slice(0, 10);
  const bg = ctx.sheet(`<div class="mv"><h2>Pohyb</h2><p>Šport, kardio aj bežné aktivity. Behy zo sekcie Beh sa započítajú samy.</p><div id="mvDay"><div class="spinner"></div></div>
    <input class="mv-q" id="mvQ" type="search" placeholder="Hľadať aktivitu (napr. hokej, bicykel)" autocomplete="off">
    <div class="mv-g" id="mvG"></div><div class="mv-list" id="mvL"></div></div>`);
  let group = recent().length ? 'recent' : 'all';
  const drawList = () => {
    const q = norm(bg.querySelector('#mvQ').value.trim());
    let xs = ACTS;
    if (q) xs = ACTS.filter(a => norm(a[1] + ' ' + a[5]).includes(q));
    else if (group === 'recent') xs = recent().map(A).filter(Boolean);
    else if (group !== 'all') xs = ACTS.filter(a => a[4] === group);
    bg.querySelector('#mvG').innerHTML = q ? '' : GROUPS.filter(g => g[0] !== 'recent' || recent().length).map(([id, l]) => `<button type="button" data-g="${id}" class="${id === group ? 'on' : ''}">${l}</button>`).join('');
    bg.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { group = b.dataset.g; drawList(); });
    bg.querySelector('#mvL').innerHTML = xs.length ? xs.map(a => `<button type="button" class="mv-a" data-a="${a[0]}"><span class="e">${a[3]}</span><b>${h(a[1])}</b><small>${kcalOf(a[2], 30)} kcal / 30 min</small><i>+</i></button>`).join('')
      : `<div class="mv-none">Takú aktivitu nepoznáme. Skús podobnú, napríklad „HIIT“ alebo „Tanec“.</div>`;
    bg.querySelectorAll('[data-a]').forEach(b => b.onclick = () => detail(A(b.dataset.a), date, () => drawDay()));
  };
  const drawDay = async () => {
    const box = bg.querySelector('#mvDay'); if (!box) return;
    const d = await dayMove(uid, date).catch(() => ({ items: [], kcal: 0, missing: true }));
    if (d.missing) { box.innerHTML = '<p class="muted small">Pohyb sa práve spúšťa, skús to o chvíľu.</p>'; return; }
    const mode = addMode();
    box.innerHTML = `<div class="mv-sum"><div><b>${d.kcal}</b><span>kcal spálených pohybom</span></div><em>${mode === 'none' ? 'k cieľu nepripočítavame' : `do dnešného cieľa<strong>+${bonusOf(d.kcal)} kcal</strong>`}</em></div>
      ${d.items.length ? `<div class="mv-day">${d.items.map(x => `<div class="mv-it"><span class="e">${x.run ? (x.kind === 'walk' ? '🚶' : '🏃') : (A(x.act)?.[3] || '🔥')}</span><div><b>${h(x.name)}</b><small>${x.minutes} min${x.km ? ` · ${x.km.toFixed(1).replace('.', ',')} km` : ''}${x.run ? ' · z Behu' : ''}</small></div><strong>${x.kcal} kcal</strong>${x.run ? '' : `<button type="button" data-del="${x.id}" aria-label="Zmazať">×</button>`}</div>`).join('')}</div>` : ''}
      <span class="mv-lab">Koľko z toho pripočítať k cieľu jedla</span>
      <div class="mv-mode">${[['half', 'Polovicu'], ['full', 'Všetko'], ['none', 'Nič']].map(([m, l]) => `<button type="button" data-m="${m}" class="${m === mode ? 'on' : ''}">${l}</button>`).join('')}</div>
      <p class="muted" style="font-size:12px;margin:4px 2px 14px;line-height:1.4">Odporúčame polovicu: s bežným pohybom už tvoj cieľ počíta a spálené kalórie bývajú nadhodnotené.</p>`;
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await db.sb.from('activity_logs').delete().eq('id', b.dataset.del); drawDay(); refresh(); });
    box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { setMode(b.dataset.m); drawDay(); refresh(); });
  };
  bg.querySelector('#mvQ').addEventListener('input', drawList);
  drawList(); drawDay();
}
function refresh() { if ((location.hash || '#/').split('?')[0] === '#/') window.dispatchEvent(new HashChangeEvent('hashchange')); }

function detail(a, date, done) {
  if (!a) return;
  let min = 60;
  const bg = ctx.sheet(`<div class="mv mv-d"><span class="e">${a[3]}</span><h3>${h(a[1])}</h3>
    <div class="mv-big" id="dK">0<small>kcal</small></div><p class="mv-hint">pri tvojej hmotnosti ${kg()} kg</p>
    <div class="mv-st"><button type="button" data-d="-5" aria-label="Menej">−</button><output id="dM"></output><button type="button" data-d="5" aria-label="Viac">+</button></div>
    <div class="mv-qt">${[[15, '15 min'], [30, '30 min'], [45, '45 min'], [60, '1 h'], [90, '1,5 h'], [120, '2 h']].map(([m, l]) => `<button type="button" data-q="${m}">${l}</button>`).join('')}</div>
    <button class="mv-go" id="dGo">Pridať</button></div>`);
  bg.style.zIndex = 1001;
  const upd = () => {
    bg.querySelector('#dM').innerHTML = `${min}<small>min</small>`;
    bg.querySelector('#dK').innerHTML = `${kcalOf(a[2], min)}<small>kcal</small>`;
    bg.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', Number(b.dataset.q) === min));
  };
  bg.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { min = Math.max(5, Math.min(600, min + Number(b.dataset.d))); upd(); });
  bg.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { min = Number(b.dataset.q); upd(); });
  upd();
  bg.querySelector('#dGo').onclick = async e => {
    e.currentTarget.disabled = true;
    const { error } = await db.sb.from('activity_logs').insert({ user_id: st().profile.id, date, act: a[0], name: a[1], met: a[2], minutes: min, kcal: kcalOf(a[2], min) });
    if (error) { toast('Nepodarilo sa uložiť.', true); e.currentTarget.disabled = false; return; }
    pushRecent(a[0]); bg.remove();
    try { navigator.vibrate?.(12); } catch (_) { }
    toast(`${a[1]}: ${kcalOf(a[2], min)} kcal`);
    done?.(); refresh();
  };
}
css(); // štýl riadku Pohyb na Dnes
