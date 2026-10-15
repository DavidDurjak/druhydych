// Denná pripravenosť (Readiness): 3 otázky ráno, zelený / žltý / červený deň a jedna rada pre tréning a jedlo.
// Skóre sa počíta z toho, čo človek zadá (spánok, energia, bolesť svalov) a z tréningov za posledné 3 dni.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const h = (...a) => ctx.h(...a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const SLEEP = [[4.5, 'Do 5 h'], [5.5, '5 až 6 h'], [6.5, '6 až 7 h'], [7.5, '7 až 8 h'], [8.5, 'Nad 8 h']];
const ENERGY = [[1, '😴', 'Žiadna'], [2, '😕', 'Málo'], [3, '😐', 'Bežne'], [4, '🙂', 'Dobrá'], [5, '⚡', 'Na maximum']];
const SORE = [[1, 'Žiadna'], [2, 'Mierna'], [3, 'Stredná'], [4, 'Veľká'], [5, 'Extrémna']];

const CSS = `
.rd-card{display:block;width:100%;text-align:left;font:inherit;color:var(--text);-webkit-appearance:none;appearance:none;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:16px;margin-bottom:14px;--rc:var(--accent)}
.rd-empty{display:flex;align-items:center;gap:12px;cursor:pointer}
.rd-empty .rd-i{width:42px;height:42px;flex:0 0 auto;border-radius:14px;background:var(--bg-2);display:grid;place-items:center;font-size:22px}
.rd-empty div{flex:1;min-width:0}.rd-empty p{font-size:13px;color:var(--muted);margin-top:2px}
.rd-y{--rc:#F5C04A}.rd-r{--rc:var(--danger,#FF6B5E)}
.rd-top{display:flex;align-items:center;gap:14px}
.rd-ring{position:relative;width:64px;height:64px;flex:0 0 auto}
.rd-ring svg{width:64px;height:64px;transform:rotate(-90deg)}
.rd-ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:20px;font-weight:800}
.rd-top h3{font-size:18px;color:var(--rc)}
.rd-top p{font-size:13px;color:var(--muted);margin-top:2px}
.rd-line{display:flex;gap:10px;margin-top:12px;font-size:14px;line-height:1.4}
.rd-line span{flex:0 0 22px;text-align:center}
.rd-why{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.rd-why i{font-style:normal;font-size:12px;padding:4px 9px;border-radius:99px;background:var(--bg-2);color:var(--muted)}
.rd-safe{font-size:12px;color:var(--muted);margin-top:12px;line-height:1.4}
.rd-edit{margin-top:12px;background:none;border:0;padding:0;font:inherit;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer}
.rd-q{font-size:14px;font-weight:700;margin:16px 0 8px}
.rd-o{display:flex;flex-wrap:wrap;gap:8px}
.rd-o button{-webkit-appearance:none;appearance:none;font:inherit;font-size:14px;color:var(--text);padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--bg-2);cursor:pointer}
.rd-o button.on{border-color:var(--accent);background:rgba(124,255,178,.14);color:var(--accent);font-weight:700}
`;
if (!document.getElementById('rd-css')) { const s = document.createElement('style'); s.id = 'rd-css'; s.textContent = CSS; document.head.appendChild(s); }

export const filled = ci => !!ci && ci.energy != null && ci.soreness != null && ci.sleep_h != null;

// skóre 0 až 100 a úroveň; null, keď ešte nie sú odpovede
export function readinessOf(ci, wlogs, date) {
  if (!filled(ci)) return null;
  const sl = Number(ci.sleep_h);
  const sS = clamp((sl - 4) / 4.5, 0, 1), eS = (ci.energy - 1) / 4, rS = (5 - ci.soreness) / 4;
  const done = (wlogs || []).filter(w => w.done);
  const t = n => done.some(w => w.date === calc.addDays(date, -n));
  const d1 = t(1), d2 = t(2), d3 = t(3);
  const pen = (d1 ? 0.5 : 0) + (d2 ? 0.3 : 0) + (d3 ? 0.2 : 0);
  let score = Math.round(100 * (0.35 * sS + 0.30 * eS + 0.20 * rS + 0.15 * (1 - pen)));
  let level = score >= 70 ? 'g' : score >= 45 ? 'y' : 'r';
  // jedna veľmi zlá vec nemôže dať zelený deň
  if (level === 'g' && (sl <= 5 || ci.soreness >= 5 || ci.energy <= 1)) { level = 'y'; score = Math.min(score, 69); }
  const why = [];
  if (sl <= 5.5) why.push('málo spánku');
  if (ci.energy <= 2) why.push('nízka energia');
  if (ci.soreness >= 4) why.push('bolia ťa svaly');
  if (d1 && d2) why.push('tréning dva dni v rade');
  else if (d1) why.push('včera si trénoval');
  if (!why.length) why.push(level === 'g' ? 'spánok, energia aj svaly v poriadku' : 'všetko je na hrane');
  return { score, level, why, d1, d2, sore: ci.soreness };
}

export function adviceOf(r, { p = {}, dayName = '', trainedToday = false } = {}) {
  const kcal = p.target_kcal ? Math.round(p.target_kcal) : null, prot = p.target_protein ? Math.round(p.target_protein) : null;
  const protTxt = prot ? `${prot} g bielkovín` : 'bielkoviny';
  const day = dayName ? ` (${dayName})` : '';
  const head = { g: 'Zelený deň', y: 'Žltý deň', r: 'Červený deň' }[r.level];
  const sub = { g: 'Telo je pripravené, dnes sa dá ísť naplno.', y: 'Dá sa trénovať, ale nehraj na maximum.', r: 'Dnes ťa viac posunie regenerácia ako záťaž.' }[r.level];
  let train;
  if (trainedToday) train = 'Dnešný tréning máš hotový. Teraz sa počíta jedlo a spánok.';
  else if (r.level === 'g') train = `Naplno podľa plánu${day}. Dnes je dobrý deň pridať váhu alebo opakovanie.`;
  else if (r.level === 'y') train = `Rob plán${day}, ale o tretinu menej sérií a nechaj si 2 opakovania v rezerve. Žiadne zlyhanie.`;
  else train = 'Ťažký tréning dnes vynechaj. Prechádzka 20 až 30 minút alebo ľahká mobilita je lepšia ako ďalšia záťaž.';
  let food;
  if (r.level === 'g') food = `Kalórie a bielkoviny podľa cieľa${kcal ? ` (${kcal} kcal, ${protTxt})` : ''}.`;
  else if (r.level === 'y') food = `Drž kalórie na cieli${kcal ? ` (${kcal} kcal)` : ''}, väčšinu sacharidov daj okolo tréningu a dopraj si ${protTxt}.`;
  else food = `Nejedz dnes menej, než je tvoj cieľ${kcal ? ` (${kcal} kcal)` : ''}. Bielkoviny ${prot ? prot + ' g' : 'podľa cieľa'} sú základ regenerácie.`;
  const sleepTip = r.why.includes('málo spánku') ? 'Dnes večer choď spať o hodinu skôr. Viac to pomôže než akýkoľvek doplnok.' : '';
  const safe = r.level === 'r' || r.sore >= 4 ? 'Ostrá bolesť kĺbu, tlak na hrudi alebo závrat nie je bežná únava. Netrénuj a rieš to s lekárom.' : '';
  return { head, sub, train, food, sleepTip, safe };
}

const ring = (score, level) => {
  const R = 28, C = 2 * Math.PI * R, off = C * (1 - score / 100);
  return `<div class="rd-ring"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--bg-2)" stroke-width="6"/><circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--rc)" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg><b>${score}</b></div>`;
};

export function readinessCardHtml({ ci, wlogs, date, p, dayName, trainedToday }) {
  const r = readinessOf(ci, wlogs, date);
  if (!r) return `<button class="rd-card rd-empty" id="rdOpen" type="button"><span class="rd-i">🌬️</span><div><h3>Ako sa dnes máš?</h3><p>10 sekúnd a dostaneš radu, ako dnes trénovať a jesť.</p></div><span class="ci-go">Vyplniť</span></button>`;
  const a = adviceOf(r, { p, dayName, trainedToday });
  return `<section class="rd-card rd-${r.level}">
    <div class="rd-top">${ring(r.score, r.level)}<div><h3>${a.head}</h3><p>${a.sub}</p></div></div>
    <div class="rd-line"><span>🏋️</span><div>${h(a.train)}</div></div>
    <div class="rd-line"><span>🍽️</span><div>${h(a.food)}</div></div>
    ${a.sleepTip ? `<div class="rd-line"><span>😴</span><div>${h(a.sleepTip)}</div></div>` : ''}
    <div class="rd-why">${r.why.map(w => `<i>${h(w)}</i>`).join('')}</div>
    ${a.safe ? `<p class="rd-safe">${h(a.safe)}</p>` : ''}
    <button class="rd-edit" id="rdOpen" type="button">Upraviť odpovede</button>
  </section>`;
}

function openSheet({ uid, date, ci, onSaved }) {
  const ans = { sleep: ci?.sleep_h != null ? Number(ci.sleep_h) : null, energy: ci?.energy ?? null, sore: ci?.soreness ?? null };
  const bg = ctx.sheet(`<h3>Ako sa dnes máš?</h3><p class="muted small mt">Tri rýchle otázky. Odpovedaj podľa toho, ako sa cítiš teraz.</p>
    <div class="rd-q">Koľko si spal?</div><div class="rd-o" data-k="sleep">${SLEEP.map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="rd-q">Koľko máš energie?</div><div class="rd-o" data-k="energy">${ENERGY.map(([v, e, l]) => `<button type="button" data-v="${v}">${e} ${l}</button>`).join('')}</div>
    <div class="rd-q">Ako ťa bolia svaly?</div><div class="rd-o" data-k="sore">${SORE.map(([v, l]) => `<button type="button" data-v="${v}">${l}</button>`).join('')}</div>
    <button class="btn primary mt" id="rdGo" disabled>Ukáž mi môj deň</button>`);
  const go = bg.querySelector('#rdGo');
  // spánok z check-inu môže byť presné číslo (napr. z hodiniek), vyberie sa najbližšia možnosť
  const nearest = v => SLEEP.reduce((b, [x]) => Math.abs(x - v) < Math.abs(b - v) ? x : b, SLEEP[0][0]);
  const paint = () => {
    bg.querySelectorAll('.rd-o').forEach(g => {
      const cur = g.dataset.k === 'sleep' ? (ans.sleep == null ? null : nearest(ans.sleep)) : ans[g.dataset.k];
      g.querySelectorAll('button').forEach(b => b.classList.toggle('on', cur != null && Number(b.dataset.v) === cur));
    });
    go.disabled = ans.sleep == null || ans.energy == null || ans.sore == null;
  };
  bg.querySelectorAll('.rd-o').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => { ans[g.dataset.k] = Number(b.dataset.v); paint(); }));
  go.onclick = async () => {
    go.disabled = true;
    try {
      await db.upsertCheckin({ user_id: uid, date, sleep_h: ans.sleep == null ? null : nearest(ans.sleep), energy: ans.energy, soreness: ans.sore });
      bg.remove(); onSaved?.();
    } catch (e) { ctx.toast(e.message || 'Nepodarilo sa uložiť', true); go.disabled = false; }
  };
  paint();
}

export function bindReadiness(root, opts) {
  root.querySelector('#rdOpen')?.addEventListener('click', () => openSheet(opts));
}
