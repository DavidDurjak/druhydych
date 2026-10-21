// Odfoť denné menu: fotka obedového menu, jedálneho lístka alebo screenshot z donášky -> AI prečíta jedlá a odhadne hodnoty,
// appka ich zoradí podľa toho, čo človeku dnes ešte chýba (zvyšné kalórie a bielkoviny) a vybrané jedlá zapíše jedným ťuknutím.
// Poradie počíta appka sama (nie AI), aby bolo stabilné a vysvetliteľné. Karta sa vloží na obrazovku Jedlo pod AI zápis.
import * as db from './data.js';
import { ctx } from './app.js';
import { currentLang } from './i18n.js';

const st = document.createElement('style');
st.textContent = `
.ms-entry{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 14px;padding:12px 14px;border-radius:18px;border:1px solid var(--line);
  background:var(--card);color:var(--text);text-align:left;font:inherit;cursor:pointer;-webkit-appearance:none;appearance:none;transition:transform .12s,border-color .2s}
.ms-entry:active{transform:scale(.985)}
.ms-entry i{flex:none;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#FFB547;
  background:color-mix(in srgb,#FFB547 16%,var(--bg-2))}
.ms-entry i svg{width:23px;height:23px}
.ms-entry b{display:block;font-size:15px;letter-spacing:-.01em}
.ms-entry span{display:block;font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.35}
.ms-entry em{margin-left:auto;flex:none;font-style:normal;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;color:#FFB547;background:color-mix(in srgb,#FFB547 14%,transparent)}
.ms-load{display:grid;justify-items:center;gap:14px;padding:18px 4px 8px;text-align:center}
.ms-ph{position:relative;width:min(260px,70vw);aspect-ratio:3/4;border-radius:18px;overflow:hidden;border:1px solid var(--line)}
.ms-ph img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.85)}
.ms-ph i{position:absolute;left:0;right:0;height:38%;top:-38%;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--accent) 38%,transparent),transparent);animation:msScan 1.6s ease-in-out infinite}
@keyframes msScan{to{top:100%}}
.ms-load p{margin:0;font-size:14px;color:var(--muted)}
.ms-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.ms-h h2{margin:0;font-size:21px;letter-spacing:-.02em}
.ms-left{display:flex;gap:8px;margin:10px 0 14px;flex-wrap:wrap}
.ms-left span{font-size:12.5px;color:var(--muted);padding:6px 10px;border-radius:99px;background:var(--bg-2);border:1px solid var(--line)}
.ms-left b{color:var(--text);font-variant-numeric:tabular-nums}
.ms-best{position:relative;padding:16px;border-radius:22px;margin-bottom:14px;cursor:pointer;
  border:1.5px solid color-mix(in srgb,var(--accent) 60%,var(--line));
  background:radial-gradient(120% 120% at 0% 0%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 60%),var(--card)}
.ms-best.sel{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 30%,transparent)}
.ms-tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--accent);margin-bottom:8px}
.ms-best h3{margin:0;font-size:18px;line-height:1.25;letter-spacing:-.015em}
.ms-d{margin:4px 0 0;font-size:13px;color:var(--muted);line-height:1.35}
.ms-why{margin:10px 0 0;font-size:13.5px;line-height:1.4;color:var(--text)}
.ms-nums{display:flex;align-items:baseline;gap:12px;margin-top:12px;flex-wrap:wrap}
.ms-nums b{font-size:26px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.ms-nums b small{font-size:13px;font-weight:600;color:var(--muted);margin-left:3px;letter-spacing:0}
.ms-nums span{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.ms-nums span i{font-style:normal;color:var(--text);font-weight:700}
.ms-g{margin:16px 0 8px 2px;font-size:13px;font-weight:600;color:var(--muted)}
.ms-row{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border-radius:16px;margin-bottom:8px;background:var(--card);border:1.5px solid var(--line);
  color:var(--text);text-align:left;font:inherit;cursor:pointer;-webkit-appearance:none;appearance:none;transition:border-color .15s,background .15s}
.ms-row.sel{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--card))}
.ms-dot{flex:none;width:10px;height:10px;border-radius:50%}
.ms-row .ms-t{flex:1;min-width:0}
.ms-row .ms-t b{display:block;font-size:14.5px;line-height:1.3}
.ms-row .ms-t span{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.ms-row .ms-k{flex:none;text-align:right}
.ms-row .ms-k b{display:block;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums}
.ms-row .ms-k span{display:block;font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums}
.ms-ck{flex:none;width:24px;height:24px;border-radius:8px;border:1.5px solid var(--line);display:grid;place-items:center;color:transparent;font-size:14px;font-weight:800}
.sel .ms-ck{background:var(--accent);border-color:var(--accent);color:var(--accent-ink,#06130C)}
.ms-best .ms-ck{position:absolute;top:14px;right:14px}
.ms-foot{position:sticky;bottom:0;margin:12px -4px -4px;padding:12px 4px 4px;background:linear-gradient(180deg,transparent,var(--card) 30%)}
.ms-foot .btn{width:100%}
.ms-note{font-size:12px;color:var(--muted);line-height:1.4;margin:10px 2px 0}
@media (prefers-reduced-motion:reduce){.ms-ph i{animation:none;top:30%}}
`;
document.head.appendChild(st);

const ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>';
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r0 = v => Math.round(Number(v) || 0);
const nf = v => r0(v).toLocaleString('sk-SK');
const GOOD = 'var(--accent)', MID = '#FFB547', OVER = '#FF7A6B';

function shrink(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const d = c.toDataURL('image/jpeg', 0.82);
      res({ b64: d.split(',')[1], url: d });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Fotku sa nepodarilo načítať.')); };
    img.src = url;
  });
}

// koľko človeku dnes ostáva a koľko z toho rozumne patrí do tohto jedla
async function budget() {
  const p = ctx.state?.profile || {}, date = ctx.state?.date;
  let eaten = { kcal: 0, protein: 0 };
  try { const rows = await db.listFood(p.id, date); eaten = (rows || []).reduce((a, f) => ({ kcal: a.kcal + Number(f.kcal || 0), protein: a.protein + Number(f.protein || 0) }), eaten); } catch (_) { /* bez dát počítame s celým dňom */ }
  const tk = Number(p.target_kcal) || 2000, tp = Number(p.target_protein) || 120;
  const left = tk - eaten.kcal, leftP = Math.max(0, tp - eaten.protein);
  const hr = new Date().getHours(), meals = hr < 11 ? 3 : hr < 15 ? 2.2 : hr < 19 ? 1.5 : 1;
  const meal = Math.max(Math.min(left, 350), Math.min(left * 1.0, (left / meals) * 1.3));
  return { left, leftP, meal: Math.max(250, meal), mealP: Math.max(20, leftP / meals) };
}

function rank(dishes, b) {
  const main = d => d.kind === 'main' || d.kind === 'salad' || d.kind === 'other';
  const maxP = Math.max(1, ...dishes.filter(main).map(d => d.protein));
  dishes.forEach(d => {
    const diff = d.kcal - b.meal, kS = diff > 0 ? Math.max(0, 1 - diff / b.meal) : Math.max(0, 1 - (-diff / b.meal) * 0.5);
    const pS = Math.min(1, d.protein / b.mealP), dens = Math.min(1, (d.protein * 4 / Math.max(1, d.kcal)) * 3);
    d.fit = 0.5 * kS + 0.32 * pS + 0.18 * dens;
    d.over = b.left - d.kcal;
    d.color = d.kcal > b.left + 50 ? OVER : d.fit >= 0.62 ? GOOD : MID;
    d.topP = main(d) && d.protein >= maxP;
  });
  const mains = dishes.filter(main).sort((a, z) => z.fit - a.fit);
  const best = mains[0] || dishes.slice().sort((a, z) => z.fit - a.fit)[0];
  return { best, mains: mains.filter(d => d !== best), soups: dishes.filter(d => d.kind === 'soup'), rest: dishes.filter(d => !main(d) && d.kind !== 'soup' && d !== best) };
}

function why(d, b) {
  const out = [];
  if (d.topP) out.push(`najviac bielkovín z ponuky (${r0(d.protein)} g)`);
  if (d.kcal <= b.left) out.push(`zmestí sa do tvojich zvyšných ${nf(Math.max(0, b.left))} kcal`);
  else out.push(`je o ${nf(d.kcal - b.left)} kcal nad tvojím zvyškom na dnes`);
  if (!d.topP && d.protein >= b.mealP) out.push(`pokryje bielkoviny na toto jedlo`);
  const s = out.join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

async function scanMenu(img) {
  const { data, error } = await db.sb.functions.invoke('menu-scan', { body: { image: img, lang: currentLang() } });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* nič */ }
    throw new Error(/failed to send|fetch|network|load failed/i.test(msg) ? 'Bez internetu. Skús to, keď sa pripojíš.' : msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function currentMeal() {
  const on = document.querySelector('#mealseg .on')?.dataset.meal;
  if (on) return on;
  const hr = new Date().getHours();
  return hr < 10 ? 'breakfast' : hr < 15 ? 'lunch' : hr < 18 ? 'afternoon' : 'dinner';
}

async function open(file) {
  let img;
  try { img = await shrink(file); } catch (e) { ctx.toast(e.message, true); return; }
  const bg = ctx.sheet(`<div class="ms-load"><div class="ms-ph"><img src="${img.url}" alt=""><i></i></div><b>Čítam menu…</b><p>Odhadujem kalórie a vyberám, čo ti dnes sedí najviac.</p></div>`);
  const S = () => bg.querySelector('.sheet');
  let res, b;
  try { [res, b] = await Promise.all([scanMenu(img.b64), budget()]); }
  catch (e) {
    S().innerHTML = `<div class="ai-err"><b>Menu sa nepodarilo prečítať</b><p class="muted small mt">${h(e.message)}</p><button class="btn mt" data-x>Zavrieť</button></div>`;
    S().querySelector('[data-x]').onclick = () => bg.remove(); return;
  }
  render(bg, res, b);
}

// výsledok skenu (export kvôli testom vzhľadu)
export function render(bg, res, b) {
  const S = () => bg.querySelector('.sheet');
  if (!res?.dishes?.length) {
    S().innerHTML = `<div class="ai-err"><b>Na fotke som nenašiel menu</b><p class="muted small mt">${h(res?.note || 'Odfoť tabuľu alebo lístok zblízka, nech je text ostrý a celý v zábere.')}</p><button class="btn mt" data-x>Zavrieť</button></div>`;
    S().querySelector('[data-x]').onclick = () => bg.remove(); return;
  }
  const dishes = res.dishes.map((d, i) => ({ ...d, i }));
  const R = rank(dishes, b), sel = new Set(), meal = currentMeal();
  const MEALS = ctx.MEALS || {};
  const meta = d => `<span><i>B ${r0(d.protein)}</i> · S ${r0(d.carbs)} · T ${r0(d.fat)} g${d.grams ? ` · ~${r0(d.grams)} g` : ''}</span>`;
  const row = d => `<button class="ms-row ${sel.has(d.i) ? 'sel' : ''}" data-i="${d.i}"><i class="ms-dot" style="background:${d.color}"></i>
      <div class="ms-t"><b class="notranslate">${h(d.name)}</b><span>${h(d.desc || '')}${d.price ? `${d.desc ? ' · ' : ''}<span class="notranslate" style="display:inline">${h(d.price)}</span>` : ''}</span></div>
      <div class="ms-k"><b>${nf(d.kcal)}</b><span>kcal · B ${r0(d.protein)}</span></div><i class="ms-ck">✓</i></button>`;
  const draw = () => {
    const chosen = dishes.filter(d => sel.has(d.i)), kc = chosen.reduce((a, d) => a + d.kcal, 0), pr = chosen.reduce((a, d) => a + d.protein, 0);
    const best = R.best;
    S().innerHTML = `
      <div class="ms-h"><h2>Čo si dať z menu</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <div class="ms-left"><span>Dnes ti ostáva <b>${nf(Math.max(0, b.left))} kcal</b></span><span>bielkoviny <b>${r0(b.leftP)} g</b></span></div>
      ${best ? `<div class="ms-best ${sel.has(best.i) ? 'sel' : ''}" data-i="${best.i}" role="button" tabindex="0">
        <div class="ms-tag">★ Najlepšia voľba pre teba</div><i class="ms-ck">✓</i>
        <h3 class="notranslate">${h(best.name)}</h3>${best.desc ? `<p class="ms-d">${h(best.desc)}</p>` : ''}
        <p class="ms-why">${h(why(best, b))}</p>
        <div class="ms-nums"><b>${nf(best.kcal)}<small>kcal</small></b>${meta(best)}</div></div>` : ''}
      ${R.mains.length ? `<div class="ms-g">Ďalšie jedlá, od najvhodnejšieho</div>${R.mains.map(row).join('')}` : ''}
      ${R.soups.length ? `<div class="ms-g">Polievky (môžeš pridať k hlavnému jedlu)</div>${R.soups.map(row).join('')}` : ''}
      ${R.rest.length ? `<div class="ms-g">Ostatné</div>${R.rest.map(row).join('')}` : ''}
      <p class="ms-note">Hodnoty sú odhad AI pre bežnú porciu v reštaurácii. Po zapísaní ich vieš upraviť ťuknutím na jedlo v Dnes.</p>
      <div class="ms-foot"><button class="btn primary" id="msSave" ${chosen.length ? '' : 'disabled'}>${chosen.length ? `Zapísať ${chosen.length === 1 ? 'jedlo' : chosen.length + ' jedlá'} · ${nf(kc)} kcal, B ${r0(pr)} g` : 'Ťukni na jedlo, ktoré si dáš'}</button></div>`;
    S().querySelector('[data-x]').onclick = () => bg.remove();
    S().querySelectorAll('[data-i]').forEach(el => el.onclick = () => { const i = Number(el.dataset.i); sel.has(i) ? sel.delete(i) : sel.add(i); const y = S().scrollTop; draw(); S().scrollTop = y; });
    S().querySelector('#msSave').onclick = save;
  };
  const save = async () => {
    const btn = S().querySelector('#msSave'); btn.disabled = true; btn.textContent = 'Zapisujem…';
    try {
      for (const d of dishes.filter(x => sel.has(x.i))) {
        await db.addFood({ user_id: ctx.state.profile.id, date: ctx.state.date, meal, name: d.name, brand: null, grams: d.grams || 100,
          kcal: d.kcal, protein: d.protein, carbs: d.carbs, fat: d.fat, source: 'ai', barcode: null, food_id: null, portion: null, qty: null });
      }
      bg.remove();
      ctx.toast(`Zapísané do: ${(MEALS[meal] || 'obed').toLowerCase()}`);
      location.hash = '#/';
    } catch (e) { ctx.toast(e.message, true); btn.disabled = false; btn.textContent = 'Skúsiť znova'; }
  };
  if (R.best) sel.add(R.best.i);
  draw();
}

function inject() {
  const box = document.querySelector('.screen:has(#mealseg) #aiBox');
  if (!box || box.parentNode.querySelector('.ms-entry')) return;
  const b = document.createElement('label');
  b.className = 'ms-entry';
  b.innerHTML = `<i>${ICO}</i><div><b>Odfoť denné menu</b><span>AI ti z lístka vyberie jedlo podľa toho, čo ti dnes chýba</span></div><em>Nové</em><input type="file" accept="image/*" hidden>`;
  const inp = b.querySelector('input');
  inp.onchange = () => { const f = inp.files?.[0]; inp.value = ''; if (f) open(f); };
  box.after(b);
}
const app = document.getElementById('app');
if (app) new MutationObserver(inject).observe(app, { childList: true, subtree: true });
inject();
