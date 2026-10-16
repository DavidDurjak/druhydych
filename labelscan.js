// Odfoť tabuľku výživových hodnôt na obale a AI vyplní formulár „Nové jedlo“ (funkcia label-scan).
// Tak to robia MyFitnessPal a Yazio: produkt, ktorý v databáze chýba, pridá prvý človek za pár sekúnd a ďalší ho už nájdu.
// AI iba prepíše čísla z obalu, používateľ ich vidí a potvrdí tlačidlom Uložiť.
import * as db from './data.js';

const st = document.createElement('style');
st.textContent = `
.lbs{display:flex;align-items:center;gap:12px;width:100%;margin:2px 0 14px;padding:13px 14px;border-radius:16px;border:1.5px dashed color-mix(in srgb,var(--accent) 55%,transparent);
background:color-mix(in srgb,var(--accent) 9%,var(--card));color:var(--text);text-align:left;font:inherit;cursor:pointer;-webkit-appearance:none;appearance:none}
.lbs:active{transform:scale(.985)}
.lbs i{flex:none;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:var(--accent);color:var(--accent-ink)}
.lbs i svg{width:22px;height:22px}
.lbs b{display:block;font-size:15px}
.lbs span{display:block;font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.35}
.lbs.busy{pointer-events:none;opacity:.85}
.lbs.busy i{animation:lbsP 1s ease-in-out infinite}
@keyframes lbsP{50%{transform:scale(.88);opacity:.7}}
.lbs-note{margin:-6px 0 12px;padding:9px 12px;border-radius:12px;font-size:13px;line-height:1.4;background:color-mix(in srgb,var(--accent) 12%,transparent)}
.lbs-note.warn{background:rgba(255,181,71,.16)}
.lbs-hit{box-shadow:0 0 0 2px var(--accent) !important;transition:box-shadow .3s}
@media (prefers-reduced-motion:reduce){.lbs.busy i{animation:none}}
`;
document.head.appendChild(st);

const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

// fotka zmenšená na 1600 px: tabuľka ostane čitateľná, prenos je rýchly
function shrink(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Fotku sa nepodarilo načítať.')); };
    img.src = url;
  });
}

async function scan(b64) {
  const { data, error } = await db.sb.functions.invoke('label-scan', { body: { image: b64, mime: 'image/jpeg' } });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* nič */ }
    throw new Error(/failed to send|fetch|network|load failed/i.test(msg) ? 'Bez internetu. Hodnoty zadaj ručne alebo to skús, keď sa pripojíš.' : msg);
  }
  return data;
}

const fmt = v => String(v).replace('.', ',');
function setVal(sheet, sel, v) {
  const el = sheet.querySelector(sel);
  if (!el || v === null || v === undefined || v === '') return false;
  el.value = typeof v === 'number' ? String(v) : v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.classList.add('lbs-hit'); setTimeout(() => el.classList.remove('lbs-hit'), 2400);
  return true;
}

function fill(sheet, r) {
  sheet.querySelector('[data-b="100"]')?.click();
  ['#kcal', '#protein', '#carbs', '#fat'].forEach(s => setVal(sheet, s, r[s.slice(1)]));
  const extra = ['fiber', 'sugar', 'salt'].map(k => setVal(sheet, '#' + k, r[k])).some(Boolean);
  if (extra) { const d = sheet.querySelector('#fiber')?.closest('details'); if (d) d.open = true; }
  if (!sheet.querySelector('#name').value.trim() && r.name) setVal(sheet, '#name', r.name);
  if (!sheet.querySelector('#brand').value.trim() && r.brand) setVal(sheet, '#brand', r.brand);
  // porcia z obalu (napr. 30 g odmerka proteínu), aby sa nemuselo vážiť
  if (r.serving_g && ![...sheet.querySelectorAll('[data-pg]')].some(i => Number(i.value) === r.serving_g)) {
    sheet.querySelector('#padd')?.click();
    const ls = sheet.querySelectorAll('[data-pl]'), gs = sheet.querySelectorAll('[data-pg]');
    const l = ls[ls.length - 1], g = gs[gs.length - 1];
    if (l && g) { l.value = '1 porcia'; l.dispatchEvent(new Event('input', { bubbles: true })); g.value = String(r.serving_g); g.dispatchEvent(new Event('input', { bubbles: true })); }
  }
}

function inject(sheet) {
  if (sheet.querySelector('.lbs')) return;
  const h2 = sheet.querySelector('h2');
  if (!h2 || h2.textContent.trim() !== 'Nové jedlo' || !sheet.querySelector('#basis') || !sheet.querySelector('#kcal')) return;
  const name = sheet.querySelector('#name')?.closest('.field');
  if (!name) return;
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'lbs';
  btn.innerHTML = `<i>${CAM}</i><div><b>Odfotiť tabuľku z obalu</b><span>AI vyplní kalórie a makrá za teba. Ty ich len skontroluješ.</span></div>`;
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment'); inp.hidden = true;
  const note = document.createElement('p'); note.className = 'lbs-note'; note.hidden = true;
  name.before(btn, note, inp);
  btn.onclick = () => inp.click();
  inp.onchange = async () => {
    const f = inp.files?.[0]; inp.value = '';
    if (!f) return;
    const b = btn.querySelector('b'), s = btn.querySelector('span');
    btn.classList.add('busy'); b.textContent = 'Čítam tabuľku…'; s.textContent = 'Chvíľu to trvá, zvyčajne do 10 sekúnd.';
    note.hidden = true;
    try {
      const r = await scan(await shrink(f));
      if (!r?.ok) { note.className = 'lbs-note warn'; note.textContent = r?.note || 'Tabuľku som na fotke nenašiel. Odfoť ju zblízka, ostro a bez odleskov.'; note.hidden = false; return; }
      fill(sheet, r);
      note.className = 'lbs-note' + (r.warn ? ' warn' : '');
      note.textContent = r.warn || `Hotovo: ${r.kcal} kcal, ${fmt(r.protein)} g bielkovín na 100 ${r.unit || 'g'}. Skontroluj čísla s obalom a ulož.`;
      note.hidden = false;
      document.activeElement?.blur?.();
      const sc = sheet.closest('.sheet') || sheet; requestAnimationFrame(() => { sc.scrollTop = 0; btn.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      if (navigator.vibrate) navigator.vibrate(15);
    } catch (e) {
      note.className = 'lbs-note warn'; note.textContent = e.message || 'Nepodarilo sa prečítať tabuľku.'; note.hidden = false;
    } finally {
      btn.classList.remove('busy'); b.textContent = 'Odfotiť tabuľku z obalu'; s.textContent = 'AI vyplní kalórie a makrá za teba. Ty ich len skontroluješ.';
    }
  };
}

new MutationObserver(muts => {
  for (const m of muts) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    const sh = n.classList?.contains('sheet-bg') ? n.querySelector('.sheet') : n.querySelector?.('.sheet-bg .sheet');
    if (sh) inject(sh);
  }
}).observe(document.body, { childList: true });
