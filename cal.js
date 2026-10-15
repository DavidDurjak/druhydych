// Kalendár na obrazovke Dnes: ikonka s číslom dňa pri dátume a mesačný prehľad v okne.
// Dni majú rovnakú reč ako týždenný pás: plný zelený kotúč = trafený cieľ, oranžový = nad cieľom, oblúk = čiastočný deň, bodka = tréning.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const MON = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December'];
const MONG = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
const DAYL = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
const DOW = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

const CSS = `
.tdh-cal{-webkit-appearance:none;appearance:none;display:inline-flex;align-items:center;gap:9px;margin-top:8px;min-height:0;height:40px;box-sizing:border-box;padding:0 12px 0 6px;border-radius:99px;border:1px solid var(--line);background:var(--card);color:var(--muted);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.tdh-cal:active{transform:scale(.97)}
.tdh-cal .cal-ic{position:relative;width:28px;height:28px;border-radius:9px;overflow:hidden;background:#1d242e;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);display:flex;align-items:flex-end;justify-content:center;padding:0 0 4px;box-sizing:border-box;flex:none}
.tdh-cal .cal-ic::before{content:'';position:absolute;left:0;right:0;top:0;height:9px;background:linear-gradient(180deg,#8ff5bf,#4fe39a)}
.tdh-cal .cal-ic b{position:relative;display:block;font-size:12px;line-height:1;color:var(--text);font-variant-numeric:tabular-nums}
.tdh-cal svg{width:10px;height:10px;opacity:.7}
.cal-sh{padding-top:16px;border-top:1px solid rgba(255,255,255,.1);background:radial-gradient(120% 50% at 50% 0%,rgba(124,255,178,.05),transparent 70%),linear-gradient(180deg,rgba(20,24,31,.88),rgba(7,9,12,.95));-webkit-backdrop-filter:blur(30px) saturate(150%);backdrop-filter:blur(30px) saturate(150%);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
body:has(.cal-sh) .qa-fab,body:has(.cal-sh) .bd-fab{display:none!important}
.fwcal{background:none;border:0;box-shadow:none;padding:0;margin:0;border-radius:0}
.cal-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.cal-n{-webkit-appearance:none;appearance:none;width:42px;height:42px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--text);font-size:22px;line-height:1;cursor:pointer}
.cal-n:active{transform:scale(.94)}
.cal-t{text-align:center}.cal-t b{display:block;font-size:23px;letter-spacing:-.03em}.cal-t span{color:var(--muted);font-size:13px;font-weight:600}
.cal-w,.cal-g{display:grid;grid-template-columns:repeat(7,1fr);justify-items:center}
.cal-w span{font-size:11px;font-weight:700;color:var(--muted);padding:2px 0 8px}
.cal-g{row-gap:11px}.cal-g>span{width:42px;height:42px}
.cal-d{position:relative;-webkit-appearance:none;appearance:none;width:42px;height:42px;padding:0;margin:0;border:0;border-radius:50%;background:none;display:block;color:var(--text);font:inherit;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;cursor:pointer}
.cal-d b{position:absolute;left:0;top:0;width:100%;height:100%;z-index:2;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;text-align:center}
.cal-d .cr{display:none;position:absolute;inset:0;border-radius:50%;z-index:1;background:conic-gradient(var(--accent) calc(var(--p) * 1%),rgba(255,255,255,.07) 0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 3.5px),#000 calc(100% - 3px));mask:radial-gradient(farthest-side,transparent calc(100% - 3.5px),#000 calc(100% - 3px))}
.cal-d.lg .cr{display:block}
.cal-d.hit::before{content:'';position:absolute;inset:3.5px;border-radius:50%;z-index:1;background:radial-gradient(circle at 35% 25%,#c9fadf,#6be8a6 58%,#38c982);box-shadow:0 0 12px rgba(124,255,178,.35)}
.cal-d.hit .cr{background:#8ff5bf}
.cal-d.hit b{color:var(--accent-ink);font-weight:800}
.cal-d.over .cr{background:#ff9a4c}.cal-d.over b{color:#ffb35c}
.cal-d.fut:not(.sel) b{color:var(--muted)}
.cal-d.now:not(.hit) b{color:var(--accent)}
.cal-d.sel{box-shadow:0 0 0 2px #0d1015,0 0 0 3.5px var(--accent)}
.cal-d.sel:not(.hit){background:rgba(124,255,178,.14)}
.cal-d .ct{display:none;position:absolute;left:50%;bottom:-6px;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--accent);box-shadow:0 0 6px var(--accent)}
.cal-d.tr .ct{display:block}
.cal-s{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0 12px}
.cal-s div{background:rgba(255,255,255,.04);border:1px solid var(--line);border-radius:14px;padding:10px 6px;text-align:center}
.cal-s b{display:block;font-size:21px;letter-spacing:-.02em}.cal-s span{font-size:11.5px;color:var(--muted)}
.cal-lg{font-size:11.5px;color:var(--muted);text-align:center;margin:0 0 12px}
.cal-f{display:flex;gap:8px}.cal-f .btn{flex:1}
/* karta týždňa: boost.js jej ikonku prestavil na inline-block a emoji sa vtlačilo do rohu, tu sa vracia na stred */
.rp-card .rp-card-i{display:grid;place-items:center;width:42px;height:42px;line-height:1;text-align:center}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const cache = {};
async function load(y, m) {
  const p = ctx.state?.profile; if (!p) return {};
  const key = `${y}-${m}`, c = cache[key];
  if (c && Date.now() - c.at < 20000) return c.data;
  const from = iso(y, m, 1), to = iso(y, m, new Date(y, m + 1, 0).getDate());
  const [byDay, logs] = await Promise.all([
    db.foodByDay(p.id, from, to).catch(() => ({})),
    db.listWorkoutLogs(p.id, from).catch(() => []),
  ]);
  const tr = new Set((logs || []).filter(l => l.done && l.date >= from && l.date <= to).map(l => l.date));
  const data = {};
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
    const k = iso(y, m, d), kcal = byDay[k]?.kcal || 0;
    data[k] = { pct: p.target_kcal ? kcal / p.target_kcal : 0, kcal, tr: tr.has(k) };
  }
  cache[key] = { at: Date.now(), data };
  return data;
}

function openCal(sel, inp) {
  let [vy, vm] = sel.split('-').map(Number); vm -= 1;
  const bg = ctx.sheet('<div class="fwcal"></div>');
  bg.querySelector('.sheet').classList.add('cal-sh');
  const box = bg.querySelector('.fwcal'), today = calc.today();
  const pick = d => { bg.remove(); if (d !== sel) { inp.value = d; inp.dispatchEvent(new Event('change', { bubbles: true })); } };

  const draw = (data = {}) => {
    const first = (new Date(vy, vm, 1).getDay() + 6) % 7, n = new Date(vy, vm + 1, 0).getDate();
    let cells = '', logged = 0, hits = 0, trs = 0;
    for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let d = 1; d <= n; d++) {
      const k = iso(vy, vm, d), x = data[k] || { pct: 0, tr: false };
      const past = k <= today, lg = x.pct > 0, hit = lg && x.pct >= 0.85 && x.pct <= 1.1, over = x.pct > 1.1;
      if (lg && past) logged++; if (hit && past) hits++; if (x.tr) trs++;
      cells += `<button class="cal-d${k === sel ? ' sel' : ''}${k === today ? ' now' : ''}${k > today ? ' fut' : ''}${lg ? ' lg' : ''}${hit ? ' hit' : ''}${over ? ' over' : ''}${x.tr ? ' tr' : ''}" data-d="${k}" style="--p:${Math.min(100, Math.round(x.pct * 100))}" aria-label="${d}. ${MONG[vm]}"><i class="cr"></i><b>${d}</b><i class="ct"></i></button>`;
    }
    box.innerHTML = `<div class="cal-h"><button class="cal-n" data-m="-1" aria-label="Predošlý mesiac">‹</button><div class="cal-t"><b>${MON[vm]}</b><span>${vy}</span></div><button class="cal-n" data-m="1" aria-label="Ďalší mesiac">›</button></div>
      <div class="cal-w">${DOW.map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal-g">${cells}</div>
      <div class="cal-s"><div><b>${logged}</b><span>dní so zápisom</span></div><div><b>${hits}</b><span>v cieli</span></div><div><b>${trs}</b><span>tréningov</span></div></div>
      <p class="cal-lg">Zelený kotúč: trafený cieľ. Oranžový: nad cieľom. Bodka: tréning.</p>
      <div class="cal-f"><button class="btn primary" data-now>Dnes</button><button class="btn ghost" data-x>Zavrieť</button></div>`;
    box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => shift(Number(b.dataset.m)));
    box.querySelectorAll('[data-d]').forEach(b => b.onclick = () => pick(b.dataset.d));
    box.querySelector('[data-now]').onclick = () => pick(today);
    box.querySelector('[data-x]').onclick = () => bg.remove();
  };
  const show = async () => {
    const y = vy, m = vm;
    draw(cache[`${y}-${m}`]?.data);
    const data = await load(y, m);
    if (bg.isConnected && y === vy && m === vm) draw(data);
  };
  const shift = d => { vm += d; if (vm < 0) { vm = 11; vy--; } if (vm > 11) { vm = 0; vy++; } show(); };
  let sx = 0, sy = 0;
  box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchend', e => { const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1); }, { passive: true });
  show();
}

function enhance() {
  const lab = document.querySelector('.td .tdh-s');
  if (!lab || lab.dataset.cal) return;
  const inp = lab.querySelector('.tdh-dp'), sel = inp?.value;
  if (!sel) return;
  lab.dataset.cal = '1';
  const [y, m, d] = sel.split('-').map(Number), dow = new Date(y, m - 1, d).getDay();
  lab.style.display = 'none';
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'tdh-cal'; b.setAttribute('aria-label', 'Otvoriť kalendár');
  b.innerHTML = '<span class="cal-ic"><b></b></span><span class="cal-tx"></span><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';
  b.querySelector('b').textContent = d;
  b.querySelector('.cal-tx').textContent = `${DAYL[dow]} ${d}. ${MONG[m - 1]}`;
  lab.after(b);
  b.onclick = () => openCal(sel, inp);
}

const root = document.getElementById('app');
if (root) { new MutationObserver(enhance).observe(root, { childList: true, subtree: true }); enhance(); }
