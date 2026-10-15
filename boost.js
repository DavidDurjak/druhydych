// Živšia appka: horiaci ocheň série s oslavou mílňikov, pohyblivé odznaky, výraztechnejšia karta týždňa
// a v plusku jedlá, ktoré si o tejto dobe zvykneš jesť (jedno ťuknutie).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const app = document.getElementById('app');
const CSS = `
.tdh-streak{position:relative}
.tdh-streak.fx{padding:6px 13px 6px 9px;gap:3px}
.fx-w{position:relative;display:inline-block;width:24px;height:28px;margin-top:-2px}
.fx-f{width:24px;height:28px;display:block;overflow:visible;transform-origin:50% 92%;animation:fxFl 1.05s ease-in-out infinite alternate;filter:drop-shadow(0 0 7px var(--fx-glow,rgba(255,140,40,.75)))}
.fx-f .o{fill:var(--fx-o,#FF8A1F)}.fx-f .i{fill:var(--fx-i,#FFD23F);transform-origin:50% 100%;animation:fxIn .62s ease-in-out infinite alternate}
@keyframes fxFl{0%{transform:scale(1,1) rotate(-3deg)}50%{transform:scale(.95,1.08) rotate(1.5deg)}100%{transform:scale(1.05,.98) rotate(-1deg)}}
@keyframes fxIn{from{transform:scale(.88,.82)}to{transform:scale(1.06,1.1)}}
.fx-w .em{position:absolute;left:50%;bottom:55%;width:3px;height:3px;border-radius:50%;background:var(--fx-i,#FFD23F);opacity:0;animation:fxEm 1.9s ease-out infinite}
.fx-w .e2{animation-delay:.6s;margin-left:5px}.fx-w .e3{animation-delay:1.2s;margin-left:-6px}
@keyframes fxEm{0%{opacity:0;transform:translateY(0) scale(1)}15%{opacity:.95}100%{opacity:0;transform:translateY(-22px) scale(.3)}}
.fx-t1{--fx-o:#FF7A1A;--fx-i:#FFD23F}
.fx-t2{--fx-o:#FF4D1F;--fx-i:#FFC53A;--fx-glow:rgba(255,90,30,.85)}
.fx-t3{--fx-o:#3D9BFF;--fx-i:#D6F4FF;--fx-glow:rgba(70,160,255,.9)}
.fx-t0 .fx-f{animation:none;filter:grayscale(1);opacity:.45}.fx-t0 .em{display:none}
.tdh-streak.fx b{font-weight:800}
.fx-sh{text-align:center;padding:4px 0 2px}
.fx-sh .fx-w{width:84px;height:98px;margin:6px auto 4px;display:block}.fx-sh .fx-f{width:84px;height:98px}
.fx-sh .fx-w .em{width:5px;height:5px}
.fx-sh h2{font-size:34px;letter-spacing:-.03em}.fx-sh p{color:var(--muted);margin-top:4px}
.fx-bar{height:10px;border-radius:99px;background:var(--track,rgba(255,255,255,.1));overflow:hidden;margin:16px 4px 6px}
.fx-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#FF7A1A,#FFD23F);position:relative;overflow:hidden}
.fx-bar i::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.6) 50%,transparent 65%);animation:fxSw 2s ease-in-out infinite}
@keyframes fxSw{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.fx-cel{position:fixed;inset:0;z-index:300;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;color:#fff;
  background:radial-gradient(70% 50% at 50% 42%,rgba(255,120,30,.38),rgba(6,8,12,.96) 70%);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);animation:qaBg .35s ease both}
.fx-cel .fx-w{width:130px;height:152px}.fx-cel .fx-f{width:130px;height:152px;animation-duration:.8s}.fx-cel .em{width:6px;height:6px}
.fx-cel .n{font-size:84px;font-weight:900;letter-spacing:-.05em;line-height:1;margin-top:6px;animation:fxPop .8s cubic-bezier(.2,1.5,.4,1) both}
.fx-cel h2{font-size:26px;margin-top:6px}.fx-cel p{color:rgba(255,255,255,.75);margin-top:6px;max-width:300px}
.fx-cel button{margin-top:26px;border:0;border-radius:18px;padding:15px 34px;font:inherit;font-weight:800;font-size:17px;color:#2a1200;background:linear-gradient(180deg,#FFE08A,#FFB547);cursor:pointer}
@keyframes fxPop{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}
.fx-cf{position:absolute;top:-12px;width:9px;height:14px;border-radius:2px;opacity:0;animation:fxCf var(--t,3s) ease-in var(--d,0s) both}
@keyframes fxCf{0%{opacity:1;transform:translateY(0) rotate(0)}100%{opacity:.9;transform:translateY(105vh) translateX(var(--x,0)) rotate(var(--r,540deg))}}

/* odznaky v Pokroku: lesk, vznášanie, žiara */
.bx-m.bronze,.bx-m.silver,.bx-m.gold,.bx-m.diamond{overflow:hidden}
.bx-m.bronze::after,.bx-m.silver::after,.bx-m.gold::after,.bx-m.diamond::after{content:'';position:absolute;inset:-25%;pointer-events:none;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.65) 50%,transparent 60%);transform:translateX(-130%);animation:bxShine 3.8s ease-in-out infinite}
.bx-md:nth-child(2) .bx-m::after{animation-delay:.5s}.bx-md:nth-child(3) .bx-m::after{animation-delay:1s}.bx-md:nth-child(4) .bx-m::after{animation-delay:1.5s}.bx-md:nth-child(5) .bx-m::after{animation-delay:2s}.bx-md:nth-child(6) .bx-m::after{animation-delay:2.5s}
@keyframes bxShine{0%,55%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
.bx-m.gold span,.bx-m.diamond span{animation:bxBob 2.6s ease-in-out infinite}
@keyframes bxBob{50%{transform:translateY(-2px) scale(1.08)}}
.bx-m.diamond:not(.new){animation:bxGlow 2.4s ease-in-out infinite}
@keyframes bxGlow{50%{box-shadow:inset 0 0 0 2px rgba(255,255,255,.55),0 4px 22px rgba(91,224,210,.85)}}
.bx-m.gold:not(.new){animation:bxGoldGlow 3s ease-in-out infinite}
@keyframes bxGoldGlow{50%{box-shadow:inset 0 0 0 2px rgba(255,255,255,.5),0 4px 20px rgba(255,181,71,.8)}}
.bx-lvn{animation:bxGoldGlow 3s ease-in-out infinite}
.bx-xp i{position:relative;overflow:hidden}
.bx-xp i::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.55) 50%,transparent 65%);animation:fxSw 2.4s ease-in-out infinite}

/* karta týždňa */
.rp-card{position:relative;overflow:hidden;border:1px solid rgba(124,255,178,.45)!important;background:linear-gradient(135deg,rgba(124,255,178,.18),rgba(91,224,210,.05))!important}
.rp-card::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,transparent 40%,rgba(255,255,255,.14) 50%,transparent 60%);transform:translateX(-120%);animation:fxSw 4.5s ease-in-out infinite}
.rp-card-i{display:inline-block;animation:bxBob 2.6s ease-in-out infinite}

/* obvyklé jedlá v plusku */
.fq-lb{font-size:13px;color:var(--muted);font-weight:700;margin:22px 2px 10px}
.fq-row{display:flex;gap:8px;overflow-x:auto;margin:0 -18px;padding:2px 18px 6px;scrollbar-width:none}.fq-row::-webkit-scrollbar{display:none}
.fq{flex:0 0 auto;max-width:220px;display:flex;align-items:center;gap:10px;padding:10px 14px 10px 10px;border-radius:18px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:#fff;font:inherit;text-align:left;cursor:pointer;transition:transform .15s}
.fq:active{transform:scale(.95)}
.fq .pl{flex:0 0 auto;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;padding:0 0 2px;font-weight:900;font-size:18px;color:#06210f;background:linear-gradient(180deg,#9dffc4,#5fe69a)}
.fq b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px}.fq small{display:block;font-size:12px;color:var(--muted);margin-top:1px}
.fq.ok{border-color:#7CFFB2;background:rgba(124,255,178,.18)}.fq.ok .pl{background:#fff;font-size:15px}
@media (prefers-reduced-motion:reduce){.fx-f,.fx-f .i,.fx-w .em,.fx-bar i::after,.bx-m::after,.bx-m span,.bx-m,.bx-lvn,.bx-xp i::after,.rp-card::after,.rp-card-i,.fx-cf{animation:none!important}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

// ---------- oheň série ----------
const MS = [[3, 'Rozbeh', 'Tri dni v rade. Takto vzniká návyk.'], [7, 'Týždeň v kuse', 'Celý týždeň bez vynechania.'], [14, 'Dva týždne', 'Dva týždne v kuse. Už to nie je náhoda.'], [30, 'Železná séria', 'Mesiac každý deň. Si iná liga.'],
  [60, 'Neotrasiteľný', 'Dva mesiace. Toto ťa už nezastaví.'], [100, 'Stovka v rade', 'Sto dní v rade. Legenda.'], [200, 'Dvojstovka', 'Dvesto dní. Takých ľudí je pár.'], [365, 'Celý rok', 'Rok každý deň. Mýtus.']];
const tier = n => n <= 0 ? 0 : n >= 30 ? 3 : n >= 7 ? 2 : 1;
const FL = `<svg class="fx-f" viewBox="0 0 24 28" aria-hidden="true"><path class="o" d="M12 1.2c.7 3.6-1.8 5.5-3.8 8C6.3 11.6 5.2 14 5.2 16.6c0 5 3 9.4 6.8 9.4s6.8-4.4 6.8-9.4c0-2.7-1.1-4.7-2.3-6.4-.3 1.7-1.1 2.8-2.3 3.4.6-4.4-.4-9.7-2.2-12.4z"/><path class="i" d="M12 26c-2.4 0-4.2-2.1-4.2-4.8 0-2.3 1.4-3.6 2.5-5.2.5 1.4 1.3 2 2 2.2.1-1.6.7-2.7 1.4-3.6 1.1 1.5 2.5 3.4 2.5 6.6 0 2.7-1.8 4.8-4.2 4.8z"/></svg>`;
const flame = n => `<span class="fx-w fx-t${tier(n)}">${FL}<i class="em e1"></i><i class="em e2"></i><i class="em e3"></i></span>`;
const pl = (n, a, b, c) => `${n} ${n === 1 ? a : n < 5 ? b : c}`;
const ls = { get: k => { try { return Number(localStorage.getItem(k) || 0); } catch (_) { return 0; } }, set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch (_) { } } };

function enhanceStreak() {
  const a = app.querySelector('.tdh-streak:not([data-fx])'); if (!a) return;
  a.dataset.fx = '1';
  const n = parseInt(a.textContent.replace(/\D/g, ''), 10) || 0;
  a.classList.add('fx'); a.dataset.n = n;
  a.innerHTML = `${flame(n)}<b>${n}</b>`;
  const m = MS.filter(x => x[0] <= n).pop();
  if (m && ls.get('fw_ms') < m[0]) { ls.set('fw_ms', m[0]); setTimeout(() => celebrate(n, m), 700); }
}
document.addEventListener('click', e => {
  const a = e.target.closest?.('.tdh-streak.fx'); if (!a) return;
  e.preventDefault(); e.stopPropagation();
  const n = Number(a.dataset.n) || 0, nx = MS.find(x => x[0] > n), prev = MS.filter(x => x[0] <= n).pop();
  const from = prev ? prev[0] : 0, pct = nx ? Math.round((n - from) / (nx[0] - from) * 100) : 100;
  const bg = ctx.sheet(`<div class="fx-sh">${flame(n)}<h2>${n ? pl(n, 'deň', 'dni', 'dní') + ' v rade' : 'Začni sériu'}</h2>
    <p>${n ? (prev ? prev[1] + '. ' : '') + 'Každý deň so zápisom ju predlžuje.' : 'Zapíš dnes aspoň jedno jedlo a ocheň sa rozsvieti.'}</p>
    ${nx ? `<div class="fx-bar"><i style="width:${Math.max(6, pct)}%"></i></div><p class="small">Ďalší cieľ: <b>${nx[1]}</b>, ešte ${pl(nx[0] - n, 'deň', 'dni', 'dní')}</p>` : '<p class="small mt"><b>Máš všetky mílňiky.</b></p>'}
    <button class="btn primary mt" data-bx>Moje odznaky</button></div>`);
  bg.querySelector('[data-bx]').onclick = () => { bg.remove(); location.hash = '#/pokrok'; };
}, true);

function celebrate(n, m) {
  const cols = ['#FFB547', '#FF6FA8', '#7CFFB2', '#8C8CFF', '#5CD6C0', '#FFD36E'];
  const cf = Array.from({ length: 44 }, () => `<i class="fx-cf" style="left:${Math.random() * 100}%;background:${cols[(Math.random() * cols.length) | 0]};--d:${(Math.random() * 1.2).toFixed(2)}s;--t:${(2.4 + Math.random() * 1.8).toFixed(2)}s;--x:${(Math.random() * 80 - 40) | 0}px;--r:${(Math.random() * 900 - 300) | 0}deg"></i>`).join('');
  const el = document.createElement('div'); el.className = 'fx-cel';
  el.innerHTML = `${cf}${flame(n)}<div class="n">${n}</div><h2>${m[1]}</h2><p>${m[2]}</p><button>Pokračujem</button>`;
  document.body.appendChild(el);
  try { navigator.vibrate?.([20, 40, 20, 40, 60]); } catch (_) { }
  const done = () => { el.style.transition = 'opacity .25s'; el.style.opacity = 0; setTimeout(() => el.remove(), 260); };
  el.querySelector('button').onclick = done;
  setTimeout(() => { if (el.isConnected) done(); }, 9000);
}

// ---------- obvyklé jedlá v plusku ----------
const COLS = 'name,brand,grams,kcal,protein,carbs,fat,source,barcode,food_id,portion,qty,fiber,sugar,salt';
const freqCache = {};
async function usual(uid, meal) {
  const c = freqCache[meal]; if (c && Date.now() - c.t < 60000) return c.v;
  const from = calc.addDays(calc.today(), -60);
  const { data, error } = await db.sb.from('food_logs').select(COLS + ',created_at').eq('user_id', uid).eq('meal', meal).gte('date', from).order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  const g = new Map();
  for (const r of data || []) {
    const k = (r.name + '|' + (r.brand || '')).toLowerCase(), e = g.get(k);
    if (e) e.n++; else g.set(k, { n: 1, row: r });
  }
  const v = [...g.values()].sort((a, b) => b.n - a.n).slice(0, 6);
  freqCache[meal] = { t: Date.now(), v };
  return v;
}
let addedAny = false;
async function injectUsual(ov) {
  const note = ov.querySelector('[data-qa^="note:"]'); if (!note) return;
  const meal = note.dataset.qa.split(':')[1], uid = ctx.state?.profile?.id; if (!uid) return;
  let list; try { list = await usual(uid, meal); } catch (_) { return; }
  if (!list.length || !ov.isConnected || ov.querySelector('.fq-row')) return;
  const host = ov.querySelector('.qa-hero')?.closest('.qa-pop'); if (!host) return;
  const label = (ctx.MEALS?.[meal] || 'tejto dobe').toLowerCase();
  const sec = document.createElement('div'); sec.className = 'qa-pop'; sec.style.setProperty('--i', 2);
  sec.innerHTML = `<div class="fq-lb">Obvykle na ${meal === 'late' ? 'druhú večeru' : label}, jedno ťuknutie</div><div class="fq-row">${list.map((x, i) => `<button class="fq" data-fq="${i}"><span class="pl">+</span><span><b>${ctx.h(x.row.name)}</b><small>${Math.round(x.row.kcal)} kcal${x.n > 1 ? ' · ' + x.n + '×' : ''}</small></span></button>`).join('')}</div>`;
  host.after(sec);
  sec.addEventListener('click', async e => {
    const b = e.target.closest('[data-fq]'); if (!b || b.classList.contains('ok')) return;
    const r = list[Number(b.dataset.fq)].row, row = {};
    COLS.split(',').forEach(k => { row[k] = r[k] ?? null; });
    row.user_id = uid; row.meal = meal; row.date = ctx.state?.date || calc.today();
    b.classList.add('ok'); b.querySelector('.pl').textContent = '✓';
    try { await db.addFood(row); if (row.food_id && db.foodUsed) db.foodUsed(row.food_id); addedAny = true; try { navigator.vibrate?.(15); } catch (_) { } ctx.toast(`Pridané: ${r.name}`); }
    catch (err) { b.classList.remove('ok'); b.querySelector('.pl').textContent = '+'; ctx.toast(err.message, true); }
  });
}
new MutationObserver(ms => {
  for (const m of ms) {
    m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList?.contains('qa-ov')) injectUsual(n); });
    m.removedNodes.forEach(n => {
      if (n.nodeType === 1 && n.classList?.contains('qa-ov') && addedAny) {
        addedAny = false; for (const k in freqCache) delete freqCache[k];
        if ((location.hash || '#/').split('?')[0] === '#/') window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  }
}).observe(document.body, { childList: true });

if (app) { new MutationObserver(enhanceStreak).observe(app, { childList: true, subtree: true }); enhanceStreak(); }
