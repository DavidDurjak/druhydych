// Cukor v krvi: zápis, prehľad, grafy, postup pri nízkom cukre a správa pre lekára.
// Aplikácia len zapisuje a ukazuje. Nikdy nepočíta dávky inzulínu ani liekov.
import * as db from './data.js';
import * as calc from './calc.js';
import * as dx from './dxcore.js';
import { ctx } from './app.js';

const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), sheet = (...a) => ctx.sheet(...a), nav = (...a) => ctx.nav(...a);
const $app = () => ctx.$app, st = () => ctx.state;
const tm = at => new Date(at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
const dayLbl = iso => iso === calc.today() ? 'Dnes' : iso === calc.addDays(calc.today(), -1) ? 'Včera' : calc.fmtDate(iso);
const n1 = v => String(Math.round(v * 10) / 10).replace('.', ',');
const pc = v => Math.round(v) + ' %';
const localInput = d => { const z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };
const LABEL = { vlow: 'Veľmi nízky', low: 'Nízky', in: 'V rozsahu', high: 'Vysoký', vhigh: 'Veľmi vysoký' };

const CSS = `
.gl-in{display:flex;align-items:baseline;gap:10px;margin-bottom:6px}
.gl-in .input{font-size:34px;font-weight:800;letter-spacing:-.03em;padding:10px 14px;text-align:center}
.gl-in span{color:var(--muted);font-size:14px;white-space:nowrap}
.gl-live{min-height:20px;font-size:13.5px;font-weight:700;color:var(--muted);margin:0 0 10px;text-align:center}
.gl-ctx{flex-wrap:wrap;margin-bottom:12px}.gl-ctx button{flex:1 1 30%;font-size:13px;padding:8px 4px}
.gl-hypo{margin-top:10px;background:rgba(255,92,122,.12);border-color:rgba(255,92,122,.4);color:#FF8FA4}
.gl-alert{border-radius:14px;padding:12px 14px;margin:14px 0;font-size:13.5px;line-height:1.4}
.gl-alert.bad{background:rgba(255,92,122,.12);border:1px solid rgba(255,92,122,.4)}.gl-alert.bad b{color:#FF8FA4}
.gl-alert a{color:#fff;font-size:15px}
.gl-dot{width:10px;height:10px;border-radius:50%;flex:0 0 auto}
.item .n b small{color:var(--muted);font-weight:500;font-size:11px}
.gl-sg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.gl-tir{display:flex;height:10px;border-radius:99px;overflow:hidden;margin:14px 0 6px;background:var(--bg-2)}.gl-tir i{display:block;height:100%}
.gl-leg{display:flex;justify-content:space-between;font-size:11.5px;font-weight:700}
.gl .chart{width:100%;height:auto;display:block}
.gl-steps{margin:12px 0 14px;padding-left:20px;display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.4}
.gl-timer{text-align:center;padding:22px 0}.gl-timer b{display:block;font-size:56px;letter-spacing:-.04em}.gl-timer span{color:var(--muted);font-size:14px}
.rep{background:#fff;color:#111;border-radius:14px;padding:18px;font-size:13px;line-height:1.45;margin-bottom:14px;overflow-x:auto}
.rep h2{font-size:20px;margin:0 0 4px;color:#111}.rep h3{font-size:14px;margin:18px 0 6px;color:#111}
.rep .rp-sub{color:#444;margin-bottom:12px}.rep .chart{width:100%;height:auto;display:block}
.rep .rp-t{width:100%;border-collapse:collapse;margin:8px 0;font-size:11.5px}
.rep .rp-t th{background:#f0f2f5;text-align:left;padding:5px 6px;border:1px solid #ccd;font-weight:700}.rep .rp-t td{padding:4px 6px;border:1px solid #dde}
.rep .rp-foot{margin-top:16px;color:#666;font-size:11px}
@media print{
  body{background:#fff!important}
  .nav,.noprint,.toast,.bd-fab{display:none!important}
  .screen{padding:0!important;max-width:none!important}
  .rep{border-radius:0;padding:0;overflow:visible}
  .rep .rp-all tr{page-break-inside:avoid}
}`;
if (!document.getElementById('gl-css')) { const el = document.createElement('style'); el.id = 'gl-css'; el.textContent = CSS; document.head.appendChild(el); }

// ---------- grafy ----------
function chartTrend(rows, days, c, light) {
  const W = 520, H = 210, pl = 32, pr = 8, pt = 10, pb = 22;
  const end = Date.now(), start = end - days * 86400000;
  const pts = rows.map(r => ({ t: new Date(r.at).getTime(), v: Number(r.mmol) })).filter(p => p.t >= start);
  if (!pts.length) return '<p class="empty">V tomto období nemáš žiadne merania.</p>';
  const top = Math.max(14, Math.ceil(Math.max(...pts.map(p => p.v)) + 1)), bot = 2;
  const x = t => pl + (t - start) / (end - start) * (W - pl - pr), y = v => pt + (1 - (v - bot) / (top - bot)) * (H - pt - pb);
  const txt = light ? '#555' : '#8A94A6', grid = light ? '#ddd' : '#262E3A';
  const byDay = {}; pts.forEach(p => { const d = new Date(p.t).toDateString(); (byDay[d] = byDay[d] || []).push(p); });
  const line = Object.values(byDay).map(a => ({ t: a.reduce((s, p) => s + p.t, 0) / a.length, v: a.reduce((s, p) => s + p.v, 0) / a.length })).sort((a, b) => a.t - b.t);
  const ticks = [4, 7, 10, 14].filter(t => t < top);
  const dateTicks = [0, 0.5, 1].map(f => start + f * (end - start));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Graf glykémie">
    <rect x="${pl}" y="${y(c.hi)}" width="${W - pl - pr}" height="${y(c.lo) - y(c.hi)}" fill="${light ? '#d8f5e4' : 'rgba(124,255,178,.10)'}"/>
    ${ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="${grid}" stroke-width="1"/><text x="2" y="${y(t) + 4}" font-size="11" fill="${txt}">${t}</text>`).join('')}
    ${line.length > 1 ? `<path d="${line.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}" fill="none" stroke="${light ? '#2a7' : '#7CFFB2'}" stroke-width="1.5" opacity=".6"/>` : ''}
    ${pts.map(p => `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.6" fill="${dx.GCOL[dx.gclass(p.v, c)]}"/>`).join('')}
    ${dateTicks.map((t, i) => `<text x="${i === 0 ? pl : i === 2 ? W - pr : x(t)}" y="${H - 5}" font-size="11" fill="${txt}" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}">${calc.fmtDate(calc.toISO(new Date(t)))}</text>`).join('')}
  </svg>`;
}
function chartDay(rows, days, c, light) {
  const W = 520, H = 210, pl = 32, pr = 8, pt = 10, pb = 22;
  const since = Date.now() - days * 86400000;
  const pts = rows.filter(r => new Date(r.at).getTime() >= since).map(r => { const d = new Date(r.at); return { hr: d.getHours() + d.getMinutes() / 60, v: Number(r.mmol) }; });
  if (pts.length < 3) return '<p class="empty">Denný profil sa ukáže po troch meraniach.</p>';
  const top = Math.max(14, Math.ceil(Math.max(...pts.map(p => p.v)) + 1)), bot = 2;
  const x = hr => pl + hr / 24 * (W - pl - pr), y = v => pt + (1 - (v - bot) / (top - bot)) * (H - pt - pb);
  const txt = light ? '#555' : '#8A94A6', grid = light ? '#ddd' : '#262E3A';
  const med = a => { const s = [...a].sort((p, q) => p - q), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const buckets = [];
  for (let b = 0; b < 24; b += 3) { const v = pts.filter(p => p.hr >= b && p.hr < b + 3).map(p => p.v); if (v.length >= 2) buckets.push({ hr: b + 1.5, v: med(v) }); }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Denný profil glykémie">
    <rect x="${pl}" y="${y(c.hi)}" width="${W - pl - pr}" height="${y(c.lo) - y(c.hi)}" fill="${light ? '#d8f5e4' : 'rgba(124,255,178,.10)'}"/>
    ${[4, 7, 10, 14].filter(t => t < top).map(t => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" stroke="${grid}"/><text x="2" y="${y(t) + 4}" font-size="11" fill="${txt}">${t}</text>`).join('')}
    ${pts.map(p => `<circle cx="${x(p.hr).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.4" fill="${dx.GCOL[dx.gclass(p.v, c)]}" opacity=".85"/>`).join('')}
    ${buckets.length > 1 ? `<path d="${buckets.map((p, i) => `${i ? 'L' : 'M'}${x(p.hr).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')}" fill="none" stroke="${light ? '#06c' : '#5BB8FF'}" stroke-width="2.2"/>` : ''}
    ${[0, 6, 12, 18, 24].map(hr => `<text x="${x(hr)}" y="${H - 5}" font-size="11" fill="${txt}" text-anchor="${hr === 0 ? 'start' : hr === 24 ? 'end' : 'middle'}">${hr}:00</text>`).join('')}
  </svg>`;
}

function statCards(s, c) {
  if (!s) return '<p class="empty">Zatiaľ žiadne merania v tomto období.</p>';
  const u = c.unit;
  return `<div class="gl-sg">
    <div class="stat"><b class="mono">${dx.fmtG(s.mean, u)}</b><span>priemer ${dx.unitLbl(u)}</span></div>
    <div class="stat"><b class="mono" style="color:${s.tir >= 70 ? '#7CFFB2' : s.tir >= 50 ? '#FFC857' : '#FF5C7A'}">${pc(s.tir)}</b><span>v rozsahu</span></div>
    <div class="stat"><b class="mono" style="color:${s.lows ? '#FF5C7A' : 'inherit'}">${s.lows}</b><span>nízkych (pod ${dx.fmtG(c.lo, u)})</span></div>
    <div class="stat"><b class="mono">${pc(s.above)}</b><span>nad ${dx.fmtG(c.hi, u)}</span></div>
    <div class="stat"><b class="mono">${pc(s.cv)}</b><span>kolísanie (CV)</span></div>
    <div class="stat"><b class="mono">${s.n}</b><span>meraní</span></div>
  </div>
  <div class="gl-tir" role="img" aria-label="Podiel času v rozsahu"><i style="width:${s.below}%;background:#FF5C7A"></i><i style="width:${s.tir}%;background:#7CFFB2"></i><i style="width:${s.above}%;background:#FFC857"></i></div>
  <p class="gl-leg"><span style="color:#FF5C7A">pod ${pc(s.below)}</span><span style="color:#7CFFB2">v rozsahu ${pc(s.tir)}</span><span style="color:#FFC857">nad ${pc(s.above)}</span></p>`;
}

function byCtx(rows, c) {
  const g = {}; rows.forEach(r => { const k = r.ctx || 'other'; (g[k] = g[k] || []).push(r); });
  const order = ['fasting', 'before', 'after', 'bedtime', 'night', 'other'];
  const out = order.filter(k => g[k]).map(k => { const s = dx.stats(g[k], c); return `<div class="item"><div class="n"><b>${dx.CTX[k]}</b><span>${s.n} ${s.n === 1 ? 'meranie' : s.n < 5 ? 'merania' : 'meraní'} · ${dx.fmtG(s.min, c.unit)} až ${dx.fmtG(s.max, c.unit)}</span></div><span class="k mono">${dx.fmtG(s.mean, c.unit)}</span></div>`; });
  return out.join('');
}

// nárast po jedle: pár „pred jedlom“ a „po jedle“ v ten istý deň a pri tom istom jedle
function mealRise(rows, MEALS) {
  const m = {};
  rows.forEach(r => { if (!r.meal || (r.ctx !== 'before' && r.ctx !== 'after')) return; const k = r.meal + '|' + r.date; (m[k] = m[k] || {})[r.ctx] = Number(r.mmol); });
  const by = {};
  Object.entries(m).forEach(([k, v]) => { if (v.before != null && v.after != null) (by[k.split('|')[0]] = by[k.split('|')[0]] || []).push(v.after - v.before); });
  return Object.entries(by).filter(([, a]) => a.length >= 2).map(([meal, a]) => ({ meal: MEALS[meal] || meal, n: a.length, avg: a.reduce((s, x) => s + x, 0) / a.length }));
}

// ---------- obrazovka ----------
export async function renderGlucose() {
  const uid = st().profile.id;
  await dx.ensure(uid);
  let c = dx.cfg();
  if (!dx.active('diabetes', c)) {
    $app().innerHTML = `<div class="screen"><div class="topbar"><h1>Cukor v krvi</h1></div><div class="card"><p class="mb">Denník glykémie je súčasť režimu Cukrovka. Zapni si ho v nastaveniach a nastav si typ a cieľový rozsah.</p><a class="btn primary" href="#/rezim">Zapnúť režim Cukrovka</a></div></div>${nav('#/')}`;
    return;
  }
  let rows = [];
  try { rows = await dx.fetchGlucose(uid, calc.addDays(calc.today(), -90)); }
  catch (e) { $app().innerHTML = `<div class="screen"><div class="topbar"><h1>Cukor v krvi</h1></div><div class="card"><p class="muted">${h(/relation|does not exist|schema cache/i.test(e.message) ? 'Denník glykémie sa ešte pripravuje. Skús to o chvíľu.' : e.message)}</p></div></div>${nav('#/')}`; return; }
  let range = 14, view = 'trend', ctxSel = 'fasting', mealSel = '';
  const MEALS = ctx.MEALS;
  const u = () => c.unit;

  const draw = () => {
    const since = calc.addDays(calc.today(), -range + 1);
    const inRange = rows.filter(r => r.date >= since);
    const s = dx.stats(inRange, c);
    const today = rows.filter(r => r.date === calc.today()).slice().reverse();
    const rise = mealRise(inRange, MEALS);
    const needIns = c.insulin;
    const sev = today.find(r => Number(r.mmol) < 3);
    $app().innerHTML = `<div class="screen gl">
      <div class="topbar"><h1>Cukor v krvi</h1><a class="chip" href="#/cukor-sprava">Správa pre lekára</a></div>
      <form id="gf" class="card">
        <div class="gl-in"><input id="gv" class="input mono" type="text" inputmode="decimal" autocomplete="off" placeholder="${u() === 'mgdl' ? '110' : '6,5'}" aria-label="Hodnota glykémie"><span>${dx.unitLbl(u())}</span></div>
        <p class="gl-live" id="glv">Zadaj hodnotu z glukomera alebo senzora.</p>
        <div class="seg gl-ctx" id="ctxs">${Object.entries(dx.CTX).map(([k, l]) => `<button type="button" data-c="${k}" class="${k === ctxSel ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div id="mealRow" style="display:${ctxSel === 'before' || ctxSel === 'after' ? '' : 'none'}"><label class="field"><span>Ku ktorému jedlu</span><select class="input" id="gm"><option value="">Nevyberať</option>${Object.entries(MEALS).map(([k, l]) => `<option value="${k}" ${mealSel === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
        <div class="grid2">${needIns ? `<label class="field"><span>Inzulín (jednotky)</span><input class="input" id="gi" type="text" inputmode="decimal" placeholder="nepovinné"></label>` : ''}<label class="field" ${needIns ? '' : 'style="grid-column:1/-1"'}><span>Poznámka</span><input class="input" id="gn" maxlength="120" placeholder="nepovinné (šport, stres, choroba)"></label></div>
        <details class="mb"><summary class="muted small">Zmeniť čas merania</summary><input class="input mt" id="gt" type="datetime-local" value="${localInput(new Date())}" max="${localInput(new Date())}"></details>
        <button class="btn primary" type="submit">Uložiť meranie</button>
        <button class="btn gl-hypo" type="button" id="hypo">🍬 Mám nízky cukor</button>
      </form>
      ${sev ? `<div class="gl-alert bad"><b>Dnes si mal veľmi nízky cukor (${dx.fmtG(Number(sev.mmol), u())}).</b> Ak sa to opakuje, ozvi sa lekárovi. Ak si zmätený alebo nevládzeš prehĺtať, nech niekto volá 112.</div>` : ''}
      <div class="card"><div class="row between mb"><h3>Dnes</h3><span class="muted small">${today.length ? today.length + ' ' + (today.length === 1 ? 'meranie' : today.length < 5 ? 'merania' : 'meraní') : ''}</span></div>
        ${today.length ? today.map(r => `<div class="item"><span class="gl-dot" style="background:${dx.GCOL[dx.gclass(Number(r.mmol), c)]}"></span><div class="n"><b class="mono">${dx.fmtG(Number(r.mmol), u())} <small>${dx.unitLbl(u())}</small></b><span>${tm(r.at)} · ${dx.CTX[r.ctx || 'other']}${r.meal ? ' · ' + (MEALS[r.meal] || '') : ''}${r.insulin != null ? ' · inzulín ' + n1(Number(r.insulin)) + ' j.' : ''}${r.note ? ' · ' + h(r.note) : ''}</span></div><button class="del" data-del="${r.id}" aria-label="Zmazať meranie">×</button></div>`).join('') : '<p class="empty">Dnes ešte žiadne meranie.</p>'}
      </div>
      <div class="card">
        <div class="seg mb" id="rng">${[7, 14, 30, 90].map(d => `<button data-r="${d}" class="${d === range ? 'on' : ''}">${d} dní</button>`).join('')}</div>
        ${statCards(s, c)}
      </div>
      <div class="card">
        <div class="seg mb" id="vw"><button data-v="trend" class="${view === 'trend' ? 'on' : ''}">Vývoj</button><button data-v="day" class="${view === 'day' ? 'on' : ''}">Počas dňa</button></div>
        ${view === 'trend' ? chartTrend(rows, range, c) : chartDay(rows, range, c)}
        <p class="muted small mt">${view === 'trend' ? 'Zelené pásmo je tvoj cieľový rozsah. Čiara je denný priemer.' : 'Modrá čiara je medián po 3 hodinách. Ukáže, kedy sa ti cukor zvyčajne vychyľuje.'}</p>
      </div>
      ${s ? `<div class="card"><h3 class="mb">Podľa situácie</h3>${byCtx(inRange, c)}${rise.length ? `<p class="sec">Nárast po jedle (po − pred)</p>${rise.map(r => `<div class="item"><div class="n"><b>${h(r.meal)}</b><span>${r.n} ${r.n < 5 ? 'páry' : 'párov'} meraní</span></div><span class="k mono" style="color:${r.avg > 3 ? '#FFC857' : '#7CFFB2'}">${r.avg >= 0 ? '+' : '−'}${dx.fmtG(Math.abs(r.avg), u())}</span></div>`).join('')}` : '<p class="muted small mt">Ak zapíšeš cukor „pred jedlom“ aj „po jedle“ pri tom istom jedle, ukážem ti, ako ťa ktoré jedlo zdvíha.</p>'}</div>` : ''}
      <div class="card"><div class="row between"><div><b>Jednotky a rozsah</b><p class="muted small">${dx.unitLbl(u())} · cieľ ${dx.fmtG(c.lo, u())} až ${dx.fmtG(c.hi, u())}</p></div><a class="btn sm" href="#/rezim">Upraviť</a></div>
        <button class="btn ghost mt" id="csv">⬇️ Stiahnuť merania (CSV)</button></div>
      <p class="muted small center">Fuelwind nie je zdravotnícka pomôcka a nenahrádza lekára. Nikdy nepočíta dávky inzulínu.</p>
    </div>${nav('#/')}`;
    bind();
  };

  const bind = () => {
    const $ = s => $app().querySelector(s);
    const inp = $('#gv'), live = $('#glv');
    const val = () => { const n = Number(String(inp.value).replace(',', '.')); if (!isFinite(n) || n <= 0) return null; return dx.fromUnit(n, u()); };
    inp.oninput = () => {
      const m = val(); if (m == null) { live.textContent = 'Zadaj hodnotu z glukomera alebo senzora.'; live.style.color = ''; return; }
      if (m < 0.5 || m > 40) { live.textContent = 'Hodnota vyzerá nepravdepodobne, skontroluj jednotky.'; live.style.color = '#FFC857'; return; }
      const k = dx.gclass(m, c); live.textContent = LABEL[k] + (k === 'low' || k === 'vlow' ? '. Po uložení ti ukážem, čo robiť.' : '');
      live.style.color = dx.GCOL[k];
    };
    $('#ctxs').querySelectorAll('[data-c]').forEach(b => b.onclick = () => { ctxSel = b.dataset.c; $('#ctxs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); $('#mealRow').style.display = ctxSel === 'before' || ctxSel === 'after' ? '' : 'none'; });
    $('#gm') && ($('#gm').onchange = e => { mealSel = e.target.value; });
    $('#hypo').onclick = () => openHypo({ uid, c, onDone: reload, value: val() });
    $('#gf').onsubmit = async e => {
      e.preventDefault();
      const m = val(); if (m == null || m < 0.5 || m > 40) { toast('Zadaj platnú hodnotu', true); return; }
      const at = new Date($('#gt').value || Date.now()); if (isNaN(at)) { toast('Skontroluj čas', true); return; }
      const insulin = $('#gi') && $('#gi').value ? Number(String($('#gi').value).replace(',', '.')) : null;
      const btn = e.submitter || $('#gf button[type=submit]'); btn.disabled = true;
      try {
        const { error } = await db.sb.from('glucose_logs').insert({ user_id: uid, date: calc.toISO(at), at: at.toISOString(), mmol: m, ctx: ctxSel, meal: (ctxSel === 'before' || ctxSel === 'after') && mealSel ? mealSel : null,
          insulin: insulin != null && isFinite(insulin) ? insulin : null, note: $('#gn').value.trim() || null, hypo: m < c.lo });
        if (error) throw new Error(error.message);
        toast('Uložené: ' + dx.fmtG(m, u()) + ' ' + dx.unitLbl(u()));
        await reload();
        if (m < c.lo) openHypo({ uid, c, onDone: reload, value: m, logged: true });
      } catch (err) { toast(err.message, true); btn.disabled = false; }
    };
    $app().querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { await db.sb.from('glucose_logs').delete().eq('id', b.dataset.del); await reload(); });
    $('#rng').querySelectorAll('[data-r]').forEach(b => b.onclick = () => { range = Number(b.dataset.r); draw(); });
    $('#vw').querySelectorAll('[data-v]').forEach(b => b.onclick = () => { view = b.dataset.v; draw(); });
    $('#csv')?.addEventListener('click', () => exportCsv(rows, c));
  };
  async function reload() { rows = await dx.fetchGlucose(uid, calc.addDays(calc.today(), -90)); c = dx.cfg(); draw(); }
  draw();
}

function exportCsv(rows, c) {
  const cell = v => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const out = [['datum', 'cas', 'mmol_l', 'mg_dl', 'situacia', 'jedlo', 'inzulin_j', 'poznamka']];
  rows.forEach(r => out.push([r.date, tm(r.at), Number(r.mmol), Math.round(Number(r.mmol) * dx.MG), dx.CTX[r.ctx || 'other'], r.meal || '', r.insulin ?? '', r.note || '']));
  const url = URL.createObjectURL(new Blob(['﻿' + out.map(r => r.map(cell).join(';')).join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = `fuelwind-cukor-${calc.today()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ---------- nízky cukor: pravidlo 15 ----------
const HK = 'dd_hypo';
export const hypoPending = () => { try { const v = JSON.parse(localStorage.getItem(HK)); return v && v.until ? v : null; } catch (_) { return null; } };
const hypoSet = v => { try { v ? localStorage.setItem(HK, JSON.stringify(v)) : localStorage.removeItem(HK); } catch (_) { /* súkromný režim */ } };

export function openHypo({ uid, c, onDone, value, logged, resume }) {
  const u = c.unit;
  let timer = null;
  const bg = sheet('');
  const box = bg.querySelector('.sheet');
  const close = () => { clearInterval(timer); bg.remove(); };
  const saveReading = async (m, hypo) => {
    const now = new Date();
    const { error } = await db.sb.from('glucose_logs').insert({ user_id: uid, date: calc.toISO(now), at: now.toISOString(), mmol: m, ctx: 'other', hypo });
    if (error) throw new Error(error.message);
  };
  const emergency = `<div class="gl-alert bad"><b>Ak si zmätený, nevládzeš prehĺtať alebo si v bezvedomí:</b> nič nepi ani nejedz. Nech niekto okamžite volá <a href="tel:112"><b>112</b></a>. Ak máš predpísaný glukagón, použi ho podľa pokynov lekára.</div>`;

  const stepTreat = () => {
    box.innerHTML = `<div class="row between"><h2>Nízky cukor</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <p class="muted small mt">${value != null ? 'Namerané: <b>' + dx.fmtG(value, u) + ' ' + dx.unitLbl(u) + '</b>. ' : ''}Postupuj podľa pravidla 15:</p>
      <ol class="gl-steps">
        <li><b>Daj si 15 g rýchlych sacharidov.</b> Napríklad 3 až 4 tablety glukózy, 150 ml džúsu alebo sladkej limonády (nie diétnej), alebo 1 polievkovú lyžicu cukru rozpustenú vo vode.</li>
        <li><b>Nepi mlieko ani nejedz čokoládu.</b> Tuk spomaľuje vstrebávanie.</li>
        <li><b>Počkaj 15 minút</b> a zmeraj znova. Ak je stále pod ${dx.fmtG(c.lo, u)}, zopakuj.</li>
      </ol>
      ${value == null ? `<label class="field"><span>Aktuálna hodnota (nepovinné)</span><input class="input" id="hv" type="text" inputmode="decimal" placeholder="${u === 'mgdl' ? '65' : '3,4'}"></label>` : ''}
      <label class="row small mb" style="gap:10px"><input type="checkbox" id="hlog" checked> Zapísať 15 g sacharidov do dnešného denníka</label>
      <button class="btn primary" id="hgo">Dal som si cukor, spusti 15 minút</button>
      ${emergency}`;
    box.querySelector('[data-x]').onclick = close;
    box.querySelector('#hgo').onclick = async () => {
      const btn = box.querySelector('#hgo'); btn.disabled = true;
      try {
        const hv = box.querySelector('#hv');
        if (hv && hv.value.trim()) { const m = dx.fromUnit(Number(hv.value.replace(',', '.')), u); if (m >= 0.5 && m <= 40) { await saveReading(m, m < c.lo); value = m; } }
        if (box.querySelector('#hlog').checked) {
          await db.addFood({ user_id: uid, date: calc.today(), meal: 'snack', name: '🍬 Nízky cukor: rýchle sacharidy (15 g)', grams: 0, kcal: 60, protein: 0, carbs: 15, fat: 0, sugar: 15, source: 'quick' });
        }
        hypoSet({ until: Date.now() + 15 * 60000 });
        stepWait();
      } catch (e) { toast(e.message, true); btn.disabled = false; }
    };
  };

  const stepWait = () => {
    const until = (hypoPending()?.until) || Date.now() + 15 * 60000;
    box.innerHTML = `<div class="row between"><h2>Čakaj 15 minút</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <div class="gl-timer"><b id="tt" class="mono">15:00</b><span>Odpočívaj. Keď čas uplynie, zmeraj cukor.</span></div>
      <button class="btn primary" id="hm">Už som zmeral</button>${emergency}`;
    box.querySelector('[data-x]').onclick = close;
    box.querySelector('#hm').onclick = stepRecheck;
    const tick = () => {
      const left = Math.max(0, Math.round((until - Date.now()) / 1000)), el = box.querySelector('#tt');
      if (!el) { clearInterval(timer); return; }
      el.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
      if (!left) { clearInterval(timer); el.textContent = 'Zmeraj'; if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
    };
    tick(); timer = setInterval(tick, 1000);
  };

  const stepRecheck = () => {
    clearInterval(timer);
    box.innerHTML = `<div class="row between"><h2>Nová hodnota</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <label class="field mt"><span>Zmeraný cukor (${dx.unitLbl(u)})</span><input class="input mono" id="rv" type="text" inputmode="decimal" placeholder="${u === 'mgdl' ? '90' : '5,0'}"></label>
      <p class="gl-live" id="rl"></p>
      <button class="btn primary" id="rs">Uložiť</button>`;
    box.querySelector('[data-x]').onclick = close;
    const inp = box.querySelector('#rv'), lab = box.querySelector('#rl');
    inp.oninput = () => { const n = dx.fromUnit(Number(inp.value.replace(',', '.')), u); if (!(n > 0)) { lab.textContent = ''; return; } const k = dx.gclass(n, c); lab.textContent = LABEL[k]; lab.style.color = dx.GCOL[k]; };
    box.querySelector('#rs').onclick = async () => {
      const m = dx.fromUnit(Number(inp.value.replace(',', '.')), u); if (!(m >= 0.5 && m <= 40)) { toast('Zadaj platnú hodnotu', true); return; }
      try {
        await saveReading(m, m < c.lo);
        if (m < c.lo) {
          value = m; hypoSet(null);
          box.innerHTML = `<h2>Stále nízky: ${dx.fmtG(m, u)} ${dx.unitLbl(u)}</h2><p class="mt">Zopakuj ďalších 15 g rýchlych sacharidov a po 15 minútach zmeraj znova. ${m < 3 ? '<b>Cukor je veľmi nízky, nezostávaj sám a ak sa nezlepší, volaj 112.</b>' : 'Ak sa cukor nezlepšuje ani po druhom pokuse, kontaktuj lekára alebo volaj 112.'}</p>
            <button class="btn primary mt" id="again">Zopakovať</button>${emergency}`;
          box.querySelector('#again').onclick = () => { logged = true; stepTreat(); };
        } else {
          hypoSet(null);
          box.innerHTML = `<h2>Už si v poriadku: ${dx.fmtG(m, u)} ${dx.unitLbl(u)}</h2><p class="mt">Ak je do ďalšieho jedla viac ako hodina, daj si menšiu desiatu so sacharidmi a bielkovinou (napríklad chlieb so syrom), aby cukor znova neklesol.</p><button class="btn primary mt" id="ok">Hotovo</button>`;
          box.querySelector('#ok').onclick = close;
        }
        onDone?.();
      } catch (e) { toast(e.message, true); }
    };
  };

  if (resume && hypoPending() && hypoPending().until > Date.now() - 30 * 60000) stepWait(); else stepTreat();
  bg.addEventListener('click', e => { if (e.target === bg) clearInterval(timer); });
}

// ---------- správa pre lekára ----------
export async function renderGlucoseReport() {
  const uid = st().profile.id, p = st().profile;
  await dx.ensure(uid);
  const c = dx.cfg();
  const params = new URLSearchParams((location.hash.split('?')[1]) || '');
  const days = [14, 30, 90].includes(Number(params.get('d'))) ? Number(params.get('d')) : 30;
  const from = calc.addDays(calc.today(), -days + 1);
  let rows = [], fd = {}, weights = [];
  try {
    [rows, fd, weights] = await Promise.all([dx.fetchGlucose(uid, from), db.dailyTotals(uid, from, calc.today()).catch(() => ({})), db.listWeights(uid).catch(() => [])]);
  } catch (e) { $app().innerHTML = `<div class="screen"><div class="card"><p class="muted">${h(e.message)}</p></div></div>${nav('#/')}`; return; }
  const s = dx.stats(rows, c), u = c.unit, MEALS = ctx.MEALS;
  const lows = rows.filter(r => Number(r.mmol) < c.lo);
  const fdays = Object.keys(fd).length;
  const avg = k => fdays ? Math.round(Object.values(fd).reduce((a, x) => a + x[k], 0) / fdays) : null;
  const wIn = weights.filter(w => w.date >= from);
  const age = p.birth_year ? new Date().getFullYear() - p.birth_year : null;
  const tr = calc.trend(weights.map(w => ({ date: w.date, weight: Number(w.weight_kg) })));
  const wch = wIn.length >= 2 ? calc.trendChange(tr, days) : null;
  const typeLbl = dx.DTYPES[c.dtype]?.label || '';
  $app().innerHTML = `<div class="screen gl-rep-screen">
    <div class="topbar noprint"><h1>Správa pre lekára</h1><a class="chip" href="#/cukor">Späť</a></div>
    <div class="seg mb noprint" id="rd">${[14, 30, 90].map(d => `<button data-d="${d}" class="${d === days ? 'on' : ''}">${d} dní</button>`).join('')}</div>
    <button class="btn primary mb noprint" id="print">Vytlačiť alebo uložiť ako PDF</button>
    <div class="rep">
      <h2>Prehľad glykémie</h2>
      <p class="rp-sub">${h(p.name || '')}${age ? ', ' + age + ' rokov' : ''} · ${h(typeLbl)}${c.insulin ? ' · liečba inzulínom' : ''}<br>Obdobie: ${calc.fmtDate(from)} ${from.slice(0, 4)} až ${calc.fmtDate(calc.today())} ${calc.today().slice(0, 4)} (${days} dní) · cieľový rozsah ${dx.fmtG(c.lo, u)} až ${dx.fmtG(c.hi, u)} ${dx.unitLbl(u)}</p>
      ${s ? `<table class="rp-t"><tr><th>Meraní</th><th>Priemer</th><th>Smerodajná odchýlka</th><th>CV</th><th>Najnižšia</th><th>Najvyššia</th></tr>
        <tr><td>${s.n}</td><td>${dx.fmtG(s.mean, u)}</td><td>${dx.fmtG(s.sd, u)}</td><td>${pc(s.cv)}</td><td>${dx.fmtG(s.min, u)}</td><td>${dx.fmtG(s.max, u)}</td></tr></table>
        <table class="rp-t"><tr><th>V rozsahu</th><th>Pod rozsahom</th><th>Nad rozsahom</th><th>Nízkych (pod ${dx.fmtG(c.lo, u)})</th><th>Veľmi nízkych (pod ${dx.fmtG(3, u)})</th></tr>
        <tr><td>${pc(s.tir)}</td><td>${pc(s.below)}</td><td>${pc(s.above)}</td><td>${s.lows}</td><td>${s.severe}</td></tr></table>
        <h3>Vývoj</h3>${chartTrend(rows, days, c, true)}
        <h3>Priebeh počas dňa</h3>${chartDay(rows, days, c, true)}
        <h3>Podľa situácie</h3><table class="rp-t"><tr><th>Situácia</th><th>Meraní</th><th>Priemer</th><th>Rozsah hodnôt</th></tr>
        ${['fasting', 'before', 'after', 'bedtime', 'night', 'other'].map(k => { const a = rows.filter(r => (r.ctx || 'other') === k); const t = dx.stats(a, c); return t ? `<tr><td>${dx.CTX[k]}</td><td>${t.n}</td><td>${dx.fmtG(t.mean, u)}</td><td>${dx.fmtG(t.min, u)} až ${dx.fmtG(t.max, u)}</td></tr>` : ''; }).join('')}</table>
        ${lows.length ? `<h3>Nízky cukor (${lows.length})</h3><table class="rp-t"><tr><th>Dátum</th><th>Čas</th><th>Hodnota</th><th>Situácia</th><th>Poznámka</th></tr>${lows.slice(-30).map(r => `<tr><td>${calc.fmtDate(r.date)}</td><td>${tm(r.at)}</td><td>${dx.fmtG(Number(r.mmol), u)}</td><td>${dx.CTX[r.ctx || 'other']}</td><td>${h(r.note || '')}</td></tr>`).join('')}</table>` : '<h3>Nízky cukor</h3><p>V tomto období nebol zapísaný žiadny nízky cukor.</p>'}
        <h3>Výživa a váha</h3>
        <p>${fdays ? `Dni so zapísaným jedlom: ${fdays} z ${days}. Priemerne ${avg('carbs')} g sacharidov (${n1(avg('carbs') / c.sj)} SJ) a ${avg('kcal')} kcal za deň.` : 'V tomto období nie je zapísané jedlo.'}${wch != null ? ` Trend váhy za obdobie: ${wch > 0 ? '+' : ''}${n1(wch)} kg.` : ''}</p>
        <h3>Jednotlivé merania</h3><table class="rp-t rp-all"><tr><th>Dátum</th><th>Čas</th><th>${dx.unitLbl(u)}</th><th>Situácia</th><th>Jedlo</th>${c.insulin ? '<th>Inzulín</th>' : ''}<th>Poznámka</th></tr>
        ${rows.slice().reverse().slice(0, 300).map(r => `<tr><td>${calc.fmtDate(r.date)}</td><td>${tm(r.at)}</td><td>${dx.fmtG(Number(r.mmol), u)}</td><td>${dx.CTX[r.ctx || 'other']}</td><td>${r.meal ? (MEALS[r.meal] || '') : ''}</td>${c.insulin ? `<td>${r.insulin != null ? n1(Number(r.insulin)) : ''}</td>` : ''}<td>${h(r.note || '')}</td></tr>`).join('')}</table>` : '<p>V tomto období nie sú zapísané žiadne merania.</p>'}
      <p class="rp-foot">Údaje zadal pacient v aplikácii Fuelwind (${calc.fmtDate(calc.today())} ${calc.today().slice(0, 4)}). Prehľad slúži ako podklad na konzultáciu, nie je lekárska diagnostika.</p>
    </div></div>${nav('#/')}`;
  $app().querySelectorAll('[data-d]').forEach(b => b.onclick = () => { location.hash = '#/cukor-sprava?d=' + b.dataset.d; });
  $app().querySelector('#print').onclick = () => window.print();
}
