// Vizuálne prepracovanie slabších miest (v148):
// 1) Jedlo: vyhľadávanie je hlavná vec appky, preto je hneď pod výberom jedla, väčšie, s lupou a zvýrazneným rámom pri písaní;
//    zápis cez AI ide pod neho. Výber jedla je jeden posuvný riadok namiesto dvoch riadkov tlačidiel.
// 2) Plávajúci avatar kouča už na obrazovke Jedlo neprekrýva čísla kalórií vo výsledkoch.
// 3) Dnes: nižšia vodná karta, výrazVnejšie nadpisy sekcií, pokojnejšia karta týždenného prehodnotenia, vyrovnané dlaždice.
const CSS = `
/* ---------- Jedlo ---------- */
.screen:has(#mealseg) #mealseg{display:flex;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;gap:6px;padding:4px;scroll-snap-type:x proximity}
.screen:has(#mealseg) #mealseg::-webkit-scrollbar{display:none}
.screen:has(#mealseg) #mealseg button{flex:0 0 auto;white-space:nowrap;padding:9px 15px;scroll-snap-align:center}
.screen:has(#mealseg) .input-row:has(#q){gap:10px;margin-bottom:14px;align-items:stretch}
.screen:has(#mealseg) #q{height:56px;font-size:17px;font-weight:550;padding:0 16px 0 48px;border-radius:18px;border:1.5px solid var(--line);
  background:var(--card) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='%238a93a6' stroke-width='2.3' stroke-linecap='round'><circle cx='11' cy='11' r='7'/><path d='M20 20l-3.6-3.6'/></svg>") no-repeat 16px 50%;
  transition:border-color .15s,box-shadow .15s}
.screen:has(#mealseg) #q:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--accent) 22%,transparent)}
.screen:has(#mealseg) #q:not(:placeholder-shown){border-color:color-mix(in srgb,var(--accent) 70%,var(--line))}
.screen:has(#mealseg) .input-row:has(#q) .btn.icon{width:56px;height:56px;flex:0 0 56px;border-radius:18px}
.screen:has(#mealseg) .ai-box{padding:12px 14px 14px}
.screen:has(#mealseg) .ai-top b{font-size:15px}
.screen:has(#mealseg) .qa{gap:8px}
.screen:has(#mealseg) .qa-b{min-height:62px}
.screen:has(#mealseg) .results .sec{text-transform:none;letter-spacing:0;font-size:13px;font-weight:700;color:var(--muted);margin:2px 0 4px}
.screen:has(#mealseg) .res.hasft{padding:12px 0;gap:14px}
.screen:has(#mealseg) .res.hasft .n b{font-size:16px;line-height:1.25;font-weight:650;display:block;max-height:2.5em;overflow:hidden}
.screen:has(#mealseg) .res.hasft .ft.ph{border:1px solid var(--line)}
.screen:has(#mealseg) .res.hasft .n>span{font-size:12.5px;display:block;margin-top:2px}
.screen:has(#mealseg) .res.hasft .k{font-size:19px;font-weight:800;letter-spacing:-.01em}
.screen:has(#mealseg) .res.hasft .ft{width:56px;height:56px;border-radius:16px}
.screen:has(#mealseg) .res.hasft .vf{font-size:10px;margin-left:4px}
body:has(.screen #mealseg) .bd-fab{display:none!important}

/* ---------- Dnes ---------- */
.fwdk-h h3,.dc-h h3{font-size:19px;font-weight:750;letter-spacing:-.015em}
.fwdk-h span,.dc-h span{font-size:12.5px;color:var(--muted)}
#app #adaptCard.card.accent{background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 7%,var(--card)),var(--card));border:1px solid color-mix(in srgb,var(--accent) 26%,var(--line));box-shadow:none}
#app .wx{padding:14px 14px 12px;margin-bottom:12px}
#app .wx-h{margin-bottom:4px}
#app .wx-main{gap:14px}
#app .wx-bt{flex:0 0 62px;height:112px}
#app .wx-big{font-size:38px}
#app .wx-big small{font-size:20px}
#app .wx-of{margin-top:3px}
#app .wx-pct{margin-top:8px}
#app .wx-msg{margin-top:8px}
#app .wx-chips{margin-top:12px;gap:8px}
#app .wx-chip{padding:8px 2px 7px}
#app .wx-wk{margin-top:12px}
#app .wx-bar{height:26px;border-radius:8px}
#app .duo{gap:12px}
#app .duo .tile{min-height:150px;border-radius:20px}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

// obrazovka Jedlo: vyhľadávanie hneď pod výberom jedla, AI zápis pod ním; aktívny diel výberu sa odroluje do zorného poľa
function tune() {
  const q = document.querySelector('#q'), seg = document.querySelector('#mealseg');
  if (!q || !seg) return;
  const row = q.closest('.input-row'), ai = document.querySelector('#aiBox');
  if (row && ai && !row.dataset.vp) { row.dataset.vp = '1'; ai.parentNode.insertBefore(row, ai); }
  if (!seg.dataset.vp) {
    seg.dataset.vp = '1';
    const on = () => seg.querySelector('button.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    on(); seg.addEventListener('click', () => requestAnimationFrame(on));
  }
}
new MutationObserver(tune).observe(document.documentElement, { childList: true, subtree: true });
tune();
