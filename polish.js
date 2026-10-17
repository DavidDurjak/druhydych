// Drobné vizuálne doladenia naprieč appkou:
// 1) obsah obrazoviek končí nad plávajúcim avatarom kouča, takže ho posledná karta ani text nikdy neprekryjú,
// 2) čísla v týždennom reporte sa nikdy nevylejú z mriežky,
// 3) prázdne Fotky: namiesto vety „Zatiaľ žiadne fotky.“ jasný štart premeny (tri pózy, tipy a tlačidlo na prvú fotku).
const CSS = `
body:has(.bd-fab) #app>.screen:not(.no-nav):not(.fx-setup){padding-bottom:calc(var(--nav-h,72px) + env(safe-area-inset-bottom) + 88px)}
.pz{text-align:center;padding:6px 2px 4px}
.pz-poses{display:flex;justify-content:center;gap:10px;margin:4px 0 16px}
.pz-pose{width:78px;border-radius:16px;padding:10px 0 8px;border:1.5px dashed color-mix(in srgb,var(--accent) 45%,var(--line));background:color-mix(in srgb,var(--accent) 6%,transparent);color:var(--muted)}
.pz-pose svg{width:38px;height:72px;display:block;margin:0 auto 6px}
.pz-pose svg *{fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.pz-pose span{font-size:11.5px;font-weight:700}
.pz h3{margin:0 0 6px;font-size:20px;letter-spacing:-.02em}
.pz>p{margin:0 auto 14px;max-width:320px;color:var(--muted);font-size:14px;line-height:1.45}
.pz ul{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:8px;text-align:left}
.pz li{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:var(--bg-2);font-size:13.5px;line-height:1.35}
.pz li b{flex:none;font-size:18px}
.pz .btn{width:100%}
.pz-hide{display:none!important}
.rp-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.rp-s{min-width:0}.rp-s b,.rp-s em{overflow-wrap:anywhere}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const FIG = {
  front: '<svg viewBox="0 0 40 76"><circle cx="20" cy="9" r="6"/><path d="M11 21c2-3 5-4 9-4s7 1 9 4l2 18M11 21l-2 18M15 21v16c0 4 1 7 2 9l-1 26M25 21v16c0 4-1 7-2 9l1 26"/></svg>',
  side: '<svg viewBox="0 0 40 76"><circle cx="21" cy="9" r="6"/><path d="M17 18c-3 4-4 10-3 17 1 5 4 8 5 12l-2 25M22 18c3 3 4 8 3 14-1 5-3 9-3 15l2 25M18 24l-3 14"/></svg>',
  back: '<svg viewBox="0 0 40 76"><circle cx="20" cy="9" r="6"/><path d="M11 21c2-3 5-4 9-4s7 1 9 4l2 18M11 21l-2 18M15 21v16c0 4 1 7 2 9l-1 26M25 21v16c0 4-1 7-2 9l1 26M20 20v18"/></svg>',
};

function photos() {
  const wrap = document.querySelector('#app #cmpWrap'), tl = document.querySelector('#app #tl'), add = document.querySelector('#app #add');
  if (!wrap || !tl || !add || wrap.querySelector('.pz')) return;
  // žiadna fotka: prázdne je porovnanie aj časová os
  if (!wrap.querySelector('p.empty') || !tl.querySelector('p.empty') || tl.querySelector('.tl-row')) return;
  wrap.innerHTML = `<div class="pz">
    <div class="pz-poses">${[['front', 'Spredu'], ['side', 'Zboku'], ['back', 'Zozadu']].map(([k, n]) => `<div class="pz-pose">${FIG[k]}<span>${n}</span></div>`).join('')}</div>
    <h3>Začni svoju premenu</h3>
    <p>Odfoť sa dnes spredu, zboku aj zozadu. O pár týždňov tu posuvníkom porovnáš, ako si sa zmenil. Váha klame, fotky nie.</p>
    <ul><li><b>💡</b>Vždy rovnaké miesto a svetlo, najlepšie ráno</li><li><b>👕</b>Rovnaké oblečenie, aby bolo vidno postavu</li><li><b>🔒</b>Fotky sú súkromné, vidíš ich len ty a tvoj kouč</li></ul>
    <button class="btn primary" type="button" id="pzGo">📸 Odfotiť prvú fotku</button></div>`;
  wrap.querySelector('#pzGo').onclick = () => add.click();
  tl.classList.add('pz-hide');
  const h = tl.previousElementSibling; if (h && h.tagName === 'H3') h.classList.add('pz-hide');
}

const app = document.getElementById('app');
if (app) new MutationObserver(photos).observe(app, { childList: true, subtree: true });
