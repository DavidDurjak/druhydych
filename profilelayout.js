// Profil: prehľadnejšie rozloženie. Plus hore, tréner a vzhľad v kompaktných blokoch, jazyk vo vzhľade.
const css = `
.pfx-root .gt-sub{position:relative;overflow:hidden;margin:0 0 14px;padding:15px 14px 15px 15px;border-radius:22px;gap:13px;border:1px solid color-mix(in srgb,var(--accent) 45%,var(--line));background:radial-gradient(140% 140% at 0% 0%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 62%),linear-gradient(160deg,color-mix(in srgb,var(--accent) 10%,var(--card)),var(--card));box-shadow:0 14px 34px -18px color-mix(in srgb,var(--accent) 70%,transparent)}
.pfx-root .gt-sub i{width:44px;height:44px;border-radius:14px;font-size:21px;box-shadow:0 6px 16px -6px color-mix(in srgb,var(--accent) 80%,transparent)}
.pfx-root .gt-sub b{font-size:16.5px;letter-spacing:-.01em}.pfx-root .gt-sub small{display:block;margin-top:2px;line-height:1.35}
.pfx-root .gt-sub em{flex:none;font-style:normal;font-weight:800;font-size:13.5px;padding:9px 14px;border-radius:99px;background:var(--accent);color:var(--accent-ink,#06210f)}
.pfx-root .gt-sub::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.14) 50%,transparent 65%);transform:translateX(-120%);animation:gtSubSh 6s ease-in-out 1.5s infinite;pointer-events:none}
@keyframes gtSubSh{0%,60%,100%{transform:translateX(-120%)}80%{transform:translateX(120%)}}
@media (prefers-reduced-motion:reduce){.pfx-root .gt-sub::after{animation:none}}
.pfx-root .pfx-tiles{gap:8px!important}
.pfx-root .pfx-t{min-height:0!important;padding:11px 12px!important;display:flex!important;align-items:center;gap:10px}
.pfx-root .pfx-t small{display:none!important}
.pfx-root .pfx-ti{margin:0!important;flex:none}
.pfx-root .pfx-t b{font-size:14.5px}
#trCard.tr-me{padding:12px 14px!important;margin-top:12px!important}
#trCard .tr-cmp{display:flex;align-items:center;justify-content:space-between;gap:10px}
#trCard .tr-cmp-t b{display:block;font-size:15.5px}#trCard .tr-cmp-t small{display:block;margin-top:2px;color:var(--muted);font-size:12.5px;line-height:1.3}
#trCard .tr-cmp .tr-row{flex:none;margin:0}
#trCard .tr-jl{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px -2px -2px;padding:9px 2px 0;border-top:1px solid var(--line);text-decoration:none;color:var(--muted);font-size:13px}
#trCard .tr-jl b{color:var(--accent);font-size:13px;font-weight:700}
#fwTheme{padding:14px!important}
#fwTheme>b{font-size:15.5px}
#fwTheme>p,#fwTheme .muted,#fwTheme small.th-note{display:none!important}
#fwSkin{margin:10px 0 10px!important}
#fwTheme .lg-wrap{margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}
#fwTheme .lg-wrap .lg-btn{margin:0!important;width:100%}
`;
let styled = false;
function layout() {
  if ((location.hash || '#/').split('?')[0] !== '#/profil') return;
  const root = document.querySelector('.pfx-root'); if (!root) return;
  if (!styled) { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); styled = true; }
  const q = s => root.querySelector(':scope > ' + s);
  const search = q('.pfx-s'), plus = q('.gt-sub'), tr = q('#trCard'), hero = q('.pfx-hero'), tiles = q('.pfx-tiles'), th = q('#fwTheme'), lang = q('#fwLang');
  // jazyk presunieme do bloku Vzhľad (jedna karta namiesto dvoch)
  if (th && lang && !th.querySelector('.lg-wrap')) {
    const btn = lang.querySelector('.lg-btn');
    if (btn) { const w = document.createElement('div'); w.className = 'lg-wrap'; w.appendChild(btn); th.appendChild(w); lang.remove(); }
  }
  // poradie: hľadanie, Plus, ja, rýchle odkazy, tréner, vzhľad a jazyk, nastavenia
  const want = [plus, hero, tiles, tr, th].filter(Boolean);
  let prev = search || root.querySelector('h1') || null, changed = false;
  for (const el of want) {
    const should = prev ? prev.nextElementSibling : root.firstElementChild;
    if (should !== el) { prev ? prev.after(el) : root.prepend(el); changed = true; }
    prev = el;
  }
  return changed;
}
let raf = 0;
const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { try { layout(); } catch (_) { } }); };
const app = document.getElementById('app');
if (app) new MutationObserver(run).observe(app, { childList: true, subtree: true });
addEventListener('hashchange', run);
addEventListener('fw-ent', run);
run();
