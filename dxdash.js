// Režimy na obrazovke Dnes a v Profile: karta „Moja diéta“ (lepok, laktóza, alergény, soľ, cukrovka), odkaz na nastavenia.
// Samo sa pripojí cez MutationObserver, bez zásahu do today.js.
import * as db from './data.js';
import * as calc from './calc.js';
import * as dx from './dxcore.js';
import { ctx } from './app.js';
import { openHypo, hypoPending } from './glucose.js';

const root = document.getElementById('app');
let busy = false, ensured = null;
const n1 = v => String(Math.round(v * 10) / 10).replace('.', ',');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ASK = 'dd_dx_ask';
const getAsk = () => { try { return localStorage.getItem(ASK); } catch (_) { return null; } };
const setAsk = () => { try { localStorage.setItem(ASK, '1'); } catch (_) { /* súkromný režim */ } };

const CSS = `
.dxd{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:14px}
.dxd h3{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:15px;margin-bottom:10px}
.dxd h3 a{font-size:12px;font-weight:700}
.dxd .dxr{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--line)}
.dxd .dxr:first-of-type{border-top:0}
.dxd .dxr>span{font-size:20px;flex:0 0 26px;text-align:center}
.dxd .dxr div{flex:1;min-width:0;font-size:13.5px}
.dxd .dxr b{display:block;font-size:14px}
.dxd .dxr small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px;line-height:1.4}
.dxd .bad-t{color:#FF8FA4;font-weight:700}
.dxg{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.dxg-v{font-size:38px;font-weight:800;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}
.dxg-v small{font-size:12px;font-weight:600;color:var(--muted);margin-left:4px;letter-spacing:0}
.dxg-s{font-size:12.5px;color:var(--muted);line-height:1.35}
.dxg-s b{display:block;font-size:13.5px}
.dxbt{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dxbt .btn{padding:11px 8px;font-size:14px}
.dxbt .low{background:rgba(255,92,122,.12);border-color:rgba(255,92,122,.4);color:#FF8FA4}
.dxch{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.dxch span{background:var(--bg-2);border-radius:99px;padding:4px 10px;font-size:12px;font-weight:600}
.dxch span b{color:var(--accent)}
.dxk{margin-top:10px;font-size:12.5px;color:var(--muted)}
.dxk .bar{height:6px;border-radius:99px;background:var(--bg-2);overflow:hidden;margin-top:4px}.dxk .bar i{display:block;height:100%;border-radius:99px;background:#7CFFB2}
.dxwait{border-radius:12px;background:rgba(255,200,87,.12);border:1px solid rgba(255,200,87,.4);padding:10px 12px;margin-bottom:10px;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.dxwait button{border:0;background:#FFC857;color:#3A2A00;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer}
.dxask{position:relative}.dxask p{font-size:13.5px;color:var(--muted);margin:4px 0 12px;line-height:1.4}
.dxask .x{position:absolute;top:8px;right:10px;border:0;background:none;color:var(--muted);font-size:22px;cursor:pointer}
`;
if (!document.getElementById('dx-dash-css')) { const el = document.createElement('style'); el.id = 'dx-dash-css'; el.textContent = CSS; document.head.appendChild(el); }

async function flagsFor(rows) {
  const ids = [...new Set(rows.map(r => r.food_id).filter(Boolean))];
  const m = {};
  if (ids.length) {
    const { data } = await db.sb.from('foods').select('id,gluten,lactose,allergens,traces').in('id', ids);
    (data || []).forEach(f => { m[f.id] = f; });
    // moje vlastné overenia z obalu dopĺňajú chýbajúce údaje
    try {
      const { data: own } = await db.sb.from('food_checks').select('food_id,gluten,lactose,allergens').eq('user_id', ctx.state.profile.id).in('food_id', ids);
      (own || []).forEach(o => {
        const f = m[o.food_id] || (m[o.food_id] = { id: o.food_id });
        if (f.gluten == null && o.gluten) f.gluten = o.gluten;
        if (f.lactose == null && o.lactose) f.lactose = o.lactose;
        if (!Array.isArray(f.allergens) && Array.isArray(o.allergens)) f.allergens = o.allergens;
      });
    } catch (_) { /* tabuľka ešte nemusí existovať */ }
  }
  return m;
}

function dietRows(rows, flags, c) {
  const out = [];
  const summarize = (mode, icon, title, empty) => {
    const items = rows.map(r => ({ name: r.name, a: dx.assess({ ...(flags[r.food_id] || {}), carbs: r.carbs }, { ...c, modes: [mode] }).find(x => x.mode === mode) }));
    if (!items.length) { out.push(`<div class="dxr"><span>${icon}</span><div><b>${title}</b><small>${empty}</small></div></div>`); return; }
    const cnt = { ok: 0, warn: 0, bad: 0, unk: 0 };
    items.forEach(i => { cnt[i.a ? i.a.level : 'unk']++; });
    const bad = items.filter(i => i.a && i.a.level === 'bad').map(i => esc(i.name));
    const parts = [cnt.ok ? `✓ ${cnt.ok} v poriadku` : '', cnt.warn ? `! ${cnt.warn} over obal` : '', cnt.unk ? `? ${cnt.unk} neoverené` : '', cnt.bad ? `✕ ${cnt.bad} nevhodné` : ''].filter(Boolean).join(' · ');
    out.push(`<div class="dxr"><span>${icon}</span><div><b>${title}</b><small>${parts}</small>${bad.length ? `<small class="bad-t">Pozor: ${bad.slice(0, 4).join(', ')}${bad.length > 4 ? ' a ďalšie' : ''}</small>` : ''}</div></div>`);
  };
  if (dx.active('celiac', c)) summarize('celiac', '🌾', 'Bezlepková diéta', 'Zatiaľ nič zapísané.');
  if (dx.active('lactose', c)) summarize('lactose', '🥛', 'Laktóza', 'Zatiaľ nič zapísané.');
  if (dx.active('allergy', c) && c.allergens.length) summarize('allergy', '🥜', 'Alergény', 'Zatiaľ nič zapísané.');
  return out.join('');
}

async function build(date) {
  const p = ctx.state.profile, c = dx.cfg();
  const parts = [];
  const needFood = dx.active('celiac', c) || dx.active('lactose', c) || dx.active('allergy', c) || dx.active('salt', c) || dx.active('diabetes', c);
  let rows = [];
  if (needFood) {
    const { data } = await db.sb.from('food_logs').select('id,name,meal,food_id,carbs,salt,kcal').eq('user_id', p.id).eq('date', date);
    rows = data || [];
  }
  const flags = (dx.active('celiac', c) || dx.active('lactose', c) || dx.active('allergy', c)) ? await flagsFor(rows) : {};
  const diet = dietRows(rows, flags, c);
  if (dx.active('salt', c)) {
    const salt = rows.reduce((a, r) => a + Number(r.salt || 0), 0), top = rows.slice().sort((a, b) => Number(b.salt || 0) - Number(a.salt || 0))[0];
    const withSalt = rows.filter(r => r.salt != null).length;
    const over = salt > 5;
    parts.push(`<div class="dxr"><span>🧂</span><div><b>Soľ ${n1(salt)} g z 5 g</b><div class="dxk" style="margin:4px 0 0"><div class="bar"><i style="width:${Math.min(100, salt / 5 * 100)}%;background:${over ? '#FF5C7A' : '#7CFFB2'}"></i></div></div><small>${withSalt < rows.length ? `Počíta sa z ${withSalt} z ${rows.length} jedál, ktoré majú údaj o soli.` : 'Počíta sa zo všetkých zapísaných jedál.'}${top && Number(top.salt) > 1 ? ` Najviac soli: ${esc(top.name)} (${n1(Number(top.salt))} g).` : ''}</small></div></div>`);
  }
  let glu = '';
  if (dx.active('diabetes', c)) {
    let g = [];
    try { g = await dx.fetchGlucose(p.id, calc.addDays(calc.today(), -6)); } catch (_) { g = null; }
    const today = (g || []).filter(r => r.date === calc.today()), last = (g || [])[g ? g.length - 1 : 0];
    const st = dx.stats(g || [], c);
    const wait = hypoPending();
    const byMeal = {};
    rows.forEach(r => { byMeal[r.meal] = (byMeal[r.meal] || 0) + Number(r.carbs || 0); });
    const totalC = rows.reduce((a, r) => a + Number(r.carbs || 0), 0);
    const M = ctx.MEALS || {};
    const k = last ? dx.gclass(Number(last.mmol), c) : null;
    glu = `<div class="dxd" id="dxglu">
      <h3>🩸 Cukrovka <a href="#/cukor">Denník a správa</a></h3>
      ${wait && Date.now() - wait.until < 3 * 3600000 ? `<div class="dxwait"><span>Po nízkom cukre: čas zmerať znova.</span><button id="dxre">Zmerať</button></div>` : ''}
      ${g === null ? `<p class="muted small">Denník glykémie sa ešte pripravuje.</p>` : `<div class="dxg"><div class="dxg-v" style="color:${k ? dx.GCOL[k] : 'inherit'}">${last ? dx.fmtG(Number(last.mmol), c.unit) : '–'}<small>${dx.unitLbl(c.unit)}</small></div>
        <div class="dxg-s"><b>${last ? ({ vlow: 'Veľmi nízky', low: 'Nízky', in: 'V rozsahu', high: 'Vysoký', vhigh: 'Veľmi vysoký' })[k] : 'Zatiaľ bez merania'}</b>${last ? new Date(last.at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) + ' · ' + dx.CTX[last.ctx || 'other'] : 'Zapíš prvé meranie'}${st ? `<br>7 dní: ${Math.round(st.tir)} % v rozsahu` : ''}</div></div>`}
      <div class="dxbt"><a class="btn primary" href="#/cukor">＋ Zapísať cukor</a><button class="btn low" id="dxlow">🍬 Nízky cukor</button></div>
      <div class="dxk">Dnešné sacharidy: <b style="color:var(--text)">${Math.round(totalC)} g</b> (${n1(dx.sjOf(totalC, c))} SJ)${c.mealCarb ? `, cieľ na jedlo ${c.mealCarb} g` : ''}</div>
      ${Object.keys(byMeal).length ? `<div class="dxch">${Object.entries(byMeal).map(([m, v]) => `<span>${M[m] || m} <b>${n1(dx.sjOf(v, c))} SJ</b></span>`).join('')}</div>` : ''}
    </div>`;
  }
  const hasRows = diet || parts.length;
  const card = hasRows ? `<div class="dxd"><h3>${dx.anyMode(c) ? 'Moja diéta dnes' : ''}<a href="#/rezim">Nastaviť</a></h3>${diet}${parts.join('')}</div>` : '';
  return glu + card;
}

const seen = new WeakSet();
async function inject() {
  if (busy || !root || !ctx.state?.profile) return;
  const uid = ctx.state.profile.id;
  if (!ensured || ensured.uid !== uid) { ensured = { uid, p: dx.ensure(uid) }; }
  // odkaz v Profile (iba tlačidlo Moje ciele, nie malý odkaz „cieľ“ na obrazovke Dnes)
  const link = root.querySelector('.screen a.btn[href="#/ciele"]');
  if (link && !root.querySelector('#dxlink')) {
    ensured.p.then(() => {
      if (!link.isConnected || root.querySelector('#dxlink')) return;
      const c = dx.cfg(), a = document.createElement('a');
      a.id = 'dxlink'; a.className = 'btn mb'; a.href = '#/rezim';
      a.textContent = '🩺 Zdravie a diéta' + (c.modes.length ? ': ' + c.modes.map(m => dx.MODES[m].title).join(', ') : ' (cukrovka, celiakia, alergie)');
      link.after(a);
    });
  }
  const meals = root.querySelector('.screen.td .meals');
  if (!meals || root.querySelector('#dxdash') || seen.has(meals)) return;
  // každú vykreslenú obrazovku skontroluje len raz (inak by pri každej zmene na stránke znova volal databázu)
  seen.add(meals);
  busy = true;
  try {
    await ensured.p;
    const date = ctx.state.date, c = dx.cfg();
    const m = root.querySelector('.screen.td .meals');
    if (!m || root.querySelector('#dxdash')) return;
    let html = '';
    // bez zapnutého režimu nič nad jedlami; ponuka je dlaždica v páse „Objav v appke“ (discover.js)
    if (!dx.anyMode(c)) return;
    html = await build(date);
    if (!html) return;
    const m2 = root.querySelector('.screen.td .meals');
    if (!m2 || root.querySelector('#dxdash') || ctx.state.date !== date) return;
    const wrap = document.createElement('section'); wrap.id = 'dxdash'; wrap.innerHTML = html;
    m2.before(wrap);
    wrap.querySelector('.x')?.addEventListener('click', () => { setAsk(); wrap.remove(); });
    // po zápise nízkeho cukru sa karta vykreslí nanovo (povolí sa nová kontrola tej istej obrazovky)
    const redo = () => { wrap.remove(); const mm = root.querySelector('.screen.td .meals'); if (mm) seen.delete(mm); inject(); };
    wrap.querySelector('#dxlow')?.addEventListener('click', () => openHypo({ uid, c: dx.cfg(), onDone: redo }));
    wrap.querySelector('#dxre')?.addEventListener('click', () => openHypo({ uid, c: dx.cfg(), resume: true, onDone: redo }));
  } catch (_) { /* nepodstatné */ } finally { busy = false; }
}
if (root) { new MutationObserver(inject).observe(root, { childList: true, subtree: true }); inject(); }
