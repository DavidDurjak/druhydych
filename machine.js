// Skener strojov: odfoť stroj v posilňovni a appka povie cvik, nastavenie a čo máš dať dnes.
// AI iba pozná stroj (funkcia machine-scan). Série, opakovania a váhy počíta appka z tvojho plánu a histórie.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { EXERCISES, nextDay } from './workouts.js';

const h = (...a) => ctx.h(...a);
const CSS = `
.mc-btn{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 12px;padding:13px 14px;border-radius:18px;border:1px solid rgba(124,255,178,.35);background:linear-gradient(160deg,rgba(124,255,178,.12),rgba(124,255,178,.02));color:var(--text);font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.mc-btn:active{transform:scale(.985)}
.mc-btn>span{font-size:24px}.mc-btn div{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}.mc-btn b{font-size:15px}.mc-btn small{font-size:12.5px;color:var(--muted)}.mc-btn i{font-style:normal;font-size:22px;color:var(--muted)}
.mc-top{display:flex;gap:14px;align-items:center;margin-bottom:12px}
.mc-img{width:84px;height:84px;border-radius:16px;object-fit:cover;background:var(--card-2);flex:0 0 auto}
.mc-top h3{margin:2px 0 4px;font-size:19px;line-height:1.2}.mc-top small{color:var(--muted);font-size:12.5px}
.mc-warn{padding:10px 12px;border-radius:12px;background:rgba(255,196,107,.12);color:#FFC46B;font-size:13px;line-height:1.4;margin-bottom:12px}
.mc-alts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px;align-items:center;font-size:12.5px;color:var(--muted)}
.mc-alts button{border:1px solid var(--line);background:var(--card-2);color:var(--text);border-radius:99px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}
.mc-sec{margin:0 0 12px;padding:12px 13px;border-radius:14px;background:var(--card-2);border:1px solid var(--line)}
.mc-sec b{display:block;font-size:13px;margin-bottom:4px}.mc-sec p{margin:0;font-size:13.5px;line-height:1.5;color:var(--text)}
.mc-today{margin:0 0 14px;padding:14px;border-radius:18px;border:1px solid rgba(124,255,178,.4);background:linear-gradient(160deg,rgba(124,255,178,.14),rgba(124,255,178,.03))}
.mc-today small{color:var(--muted);font-size:12.5px}
.mc-big{font-size:30px;font-weight:800;letter-spacing:-.02em;margin:2px 0 4px}.mc-big span{font-size:15px;font-weight:600;color:var(--muted);margin-left:6px}
.mc-last{font-size:13.5px;margin:8px 0 0;color:var(--muted)}.mc-last b{color:var(--text)}
.mc-go{font-size:15px;font-weight:700;margin:8px 0 0;color:var(--accent);line-height:1.35}
.mc-note{font-size:12.5px;color:var(--muted);margin:8px 0 0;line-height:1.45}
.mc-load{text-align:center;padding:10px 0 4px}.mc-load img{width:100%;max-height:34vh;object-fit:cover;border-radius:16px;margin-bottom:14px}
.mc-load p{margin:0;color:var(--muted);font-size:14px}
.mc-bar{height:4px;border-radius:2px;background:var(--track);overflow:hidden;margin:12px 0 0}.mc-bar i{display:block;height:100%;width:40%;border-radius:2px;background:var(--accent);animation:mcb 1.2s ease-in-out infinite}
@keyframes mcb{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
.mc-flash{animation:mcf 1.6s ease-out}
@keyframes mcf{0%,60%{box-shadow:0 0 0 2px rgba(124,255,178,.9)}100%{box-shadow:0 0 0 2px rgba(124,255,178,0)}}
.mc-btns{display:flex;gap:8px}.mc-btns .btn{flex:1}
@media (prefers-reduced-motion:reduce){.mc-bar i,.mc-flash{animation:none}}
`;

const REPS = { H: [6, 8], M: [8, 12], L: [10, 15], X: [12, 20] };
const REST = { H: 180, M: 120, L: 90, X: 60 };
const LOWER = /kvadriceps|zadok|zadn|stehn|lýtk/i;

const fmtKg = n => String(+Number(n).toFixed(1)).replace('.', ',');
const dShort = iso => { const d = new Date(iso + 'T00:00:00'); return `${d.getDate()}. ${d.getMonth() + 1}.`; };

// resize fotky na max 1024 px (menej dát, rýchlejšie rozpoznanie)
function shrink(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1024 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const dataUrl = c.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(url);
      res({ preview: dataUrl, b64: dataUrl.split(',')[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Fotku sa nepodarilo načítať.')); };
    img.src = url;
  });
}

async function callScan(payload) {
  const { data, error } = await db.sb.functions.invoke('machine-scan', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* nič */ }
    throw new Error(msg);
  }
  return data;
}

// dnešné čísla pre cvik: plán + posledný tréning + posun váhy
export function prescribe({ id, plan, logs, goal, dayNo }) {
  const ex = EXERCISES[id];
  if (!ex) return null;
  let planEx = null, planDay = 0;
  const today = plan?.days?.[dayNo - 1]?.exercises?.find(e => e.id === id);
  if (today) { planEx = today; planDay = dayNo; }
  else if (plan) for (const d of plan.days) { const f = d.exercises.find(e => e.id === id); if (f) { planEx = f; planDay = d.day; break; } }
  const rrange = (() => { const m = String(planEx?.reps || '').match(/(\d+)\s*-\s*(\d+)/); return m ? [Number(m[1]), Number(m[2])] : (REPS[ex.rr] || [8, 12]); })();
  const sets = planEx?.sets || (goal === 'maintain' ? 2 : 3);
  const rest = planEx?.rest || REST[ex.rr] || 90;
  const rir = planEx?.rir ?? (ex.rr === 'X' ? 1 : 2);
  const inToday = planDay === dayNo && !!today;

  // posledná odcvičená séria tohto cviku
  let last = null;
  for (const l of logs || []) {
    if (!l.done) continue;
    const s = (l.sets || []).filter(x => x.ex === id && Number(x.kg) > 0 && Number(x.reps) > 0);
    if (s.length) { last = { date: l.date, sets: s.map(x => ({ kg: Number(x.kg), reps: Number(x.reps) })) }; break; }
  }
  let go = '', kg = null;
  const lower = LOWER.test(ex.muscle) || /legpress|hack|squat|deadlift|rdl|hipthrust/.test(id);
  if (last) {
    const top = Math.max(...last.sets.map(s => s.kg));
    const atTop = last.sets.filter(s => s.kg === top);
    const min = Math.min(...atTop.map(s => s.reps));
    if (atTop.length >= Math.min(2, sets) && atTop.every(s => s.reps >= rrange[1])) { kg = top + (lower ? 5 : 2.5); go = `Dnes skús ${fmtKg(kg)} kg. Minule si dal hornú hranicu opakovaní, čas pridať.`; }
    else if (min < rrange[0]) { kg = top; go = `Drž ${fmtKg(top)} kg a cieľ je aspoň ${rrange[0]} opakovaní v každej sérii. Váhu zatiaľ nezvyšuj.`; }
    else { kg = top; go = `Drž ${fmtKg(top)} kg a skús pridať opakovanie v každej sérii (cieľ ${rrange[1]}). Až potom pridaj váhu.`; }
  } else {
    go = `Začni ľahšie: zober váhu, s ktorou dáš ${rrange[1]} opakovaní a ${rir} by ti ešte zostali v rezerve. Zapíš si ju, nabudúce na ňu nadviažem.`;
  }
  const extra = goal === 'lose' ? 'V deficite je výhra udržať si váhy. Ak ich držíš, svaly ti ostávajú.' : goal === 'maintain' && last ? 'Na udržanie svalov stačí držať váhy a objem.' : '';
  return { ex, planEx, planDay, inToday, sets, reps: rrange, rest, rir, last, go, kg, extra };
}

function resultHtml(res, rx, preview, id) {
  const ex = EXERCISES[id];
  const name = ex?.name || res.name || 'Cvik';
  const conf = Math.round((res.confidence || 0) * 100);
  const low = (res.confidence || 0) < 0.55;
  const alts = (res.alts || []).filter(a => EXERCISES[a] && a !== id);
  const setup = res.setup ? `<div class="mc-sec"><b>Nastavenie stroja</b><p>${h(res.setup)}</p></div>` : '';
  const cue = (ex?.cue || res.cue) ? `<div class="mc-sec"><b>Technika</b><p>${h(ex?.cue || res.cue)}</p></div>` : '';
  let today = '';
  if (rx) {
    const mins = rx.rest >= 60 ? `${String(+(rx.rest / 60).toFixed(1)).replace('.', ',')} min` : `${rx.rest} s`;
    today = `<div class="mc-today"><small>${rx.inToday ? 'Dnes v tvojom pláne' : rx.planDay ? `V pláne máš ten cvik v dni D${rx.planDay}` : 'Nie je v tvojom pláne, ber to ako odporúčanie'}</small>
      <div class="mc-big">${rx.sets} × ${rx.reps[0]}-${rx.reps[1]}<span>pauza ${mins}</span></div>
      <small>Nechaj si ${rx.rir} ${rx.rir === 1 ? 'opakovanie' : 'opakovania'} v rezerve.</small>
      ${rx.last ? `<p class="mc-last">Naposledy (${dShort(rx.last.date)}): <b>${rx.last.sets.map(s => `${fmtKg(s.kg)} kg × ${s.reps}`).join(', ')}</b></p>` : ''}
      <p class="mc-go">${h(rx.go)}</p>${rx.extra ? `<p class="mc-note">${h(rx.extra)}</p>` : ''}</div>`;
  } else {
    today = `<div class="mc-sec"><b>Séria a váhy</b><p>Tento cvik zatiaľ nemáme v katalógu, tak ti nevieme spočítať váhy. Rob 3 série po 8 až 12 opakovaní, tak aby ti 2 opakovania zostali v rezerve.</p></div>`;
  }
  return `<div class="mc-top"><img class="mc-img" src="${preview}" alt=""><div><small>Rozpoznané</small><h3>${h(name)}</h3><small>istota ${conf} %</small></div></div>
    ${low ? '<div class="mc-warn">Nie som si istý. Over, že to sedí, alebo vyber iný cvik nižšie.</div>' : ''}
    ${alts.length ? `<div class="mc-alts">Môže to byť aj:${alts.map(a => `<button data-alt="${h(a)}">${h(EXERCISES[a].name)}</button>`).join('')}</div>` : ''}
    ${today}${setup}${cue}
    <div class="mc-btns">${rx?.inToday ? '<button class="btn primary" id="mcLog">Ísť na cvik v tréningu</button>' : ''}<button class="btn ghost" id="mcAgain">Skenovať znova</button></div>`;
}

async function scan(file) {
  const p = ctx.state?.profile; if (!p) return;
  const bg = ctx.sheet('<div id="mcBody"></div>');
  const body = bg.querySelector('#mcBody');
  let shot;
  try { shot = await shrink(file); } catch (e) { body.innerHTML = `<p class="mc-note">${h(e.message)}</p>`; return; }
  body.innerHTML = `<div class="mc-load"><img src="${shot.preview}" alt=""><p id="mcMsg">Pozerám sa na stroj…</p><div class="mc-bar"><i></i></div></div>`;
  const msgs = ['Pozerám sa na stroj…', 'Hľadám ho medzi cvikmi…', 'Skladám ti dnešné čísla…'];
  let mi = 0; const tm = setInterval(() => { const m = body.querySelector('#mcMsg'); if (m) m.textContent = msgs[Math.min(++mi, msgs.length - 1)]; }, 2500);
  try {
    const catalog = Object.values(EXERCISES).filter(e => e.eq !== 'home' && e.id !== 'cardio').map(e => ({ id: e.id, name: e.name }));
    const [res, plan, logs] = await Promise.all([callScan({ image: shot.b64, mime: 'image/jpeg', catalog }), db.getPlan(p.id).catch(() => null), db.listWorkoutLogs(p.id, calc.addDays(calc.today(), -120)).catch(() => [])]);
    clearInterval(tm);
    if (!res?.ok) { body.innerHTML = `<div class="mc-load"><img src="${shot.preview}" alt=""><p>${h(res?.note || 'Stroj som nerozpoznal.')}</p></div><button class="btn primary" id="mcAgain">Skúsiť znova</button>`; body.querySelector('#mcAgain').onclick = () => { bg.remove(); pick(); }; return; }
    const todayLog = (logs || []).find(l => l.date === ctx.state.date);
    const dayNo = plan ? (todayLog ? todayLog.plan_day : nextDay(plan, logs || [])) : 1;
    const draw = id => {
      const rx = id && EXERCISES[id] ? prescribe({ id, plan, logs, goal: p.goal, dayNo }) : null;
      body.innerHTML = resultHtml(res, rx, shot.preview, id);
      body.querySelectorAll('[data-alt]').forEach(b => b.onclick = () => draw(b.dataset.alt));
      body.querySelector('#mcAgain').onclick = () => { bg.remove(); pick(); };
      body.querySelector('#mcLog')?.addEventListener('click', () => {
        bg.remove();
        const row = document.querySelector(`.set[data-ex="${CSS_ESC(id)}"]`);
        if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); const c = row.closest('.card'); c?.classList.remove('mc-flash'); void c?.offsetWidth; c?.classList.add('mc-flash'); }
      });
    };
    draw(res.id || '');
  } catch (e) {
    clearInterval(tm);
    body.innerHTML = `<div class="mc-load"><img src="${shot.preview}" alt=""><p>${h(e.message || 'Skenovanie sa nepodarilo.')}</p></div><button class="btn primary" id="mcAgain">Skúsiť znova</button>`;
    body.querySelector('#mcAgain').onclick = () => { bg.remove(); pick(); };
  }
}
const CSS_ESC = s => String(s).replace(/[^\w-]/g, '');

function pick() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment'); inp.style.display = 'none';
  inp.onchange = () => { const f = inp.files?.[0]; inp.remove(); if (f) scan(f); };
  document.body.appendChild(inp); inp.click();
}

// tlačidlo nad cvikmi na obrazovke Tréning
if (typeof document !== 'undefined') {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.getElementById('app');
  const inject = () => {
    if (!root || !/^#\/trening/.test(location.hash) || root.querySelector('#fw-machine')) return;
    const first = root.querySelector('.card.ex'), stats = root.querySelector('.screen .grid3');
    if (!first) return;
    const b = document.createElement('button'); b.id = 'fw-machine'; b.className = 'mc-btn';
    b.innerHTML = '<span>📷</span><div><b>Skenuj stroj</b><small>Odfoť ho a dostaneš cvik, nastavenie a dnešný cieľ</small></div><i>›</i>';
    b.onclick = pick;
    if (stats) stats.after(b); else first.before(b);
  };
  if (root) new MutationObserver(inject).observe(root, { childList: true, subtree: true });
}
