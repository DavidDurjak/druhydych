// Nákupný zoznam na Dnes: miesto karty určuje todayorder.js (poradie kariet na Dnes)
// a živý košík: pri zobrazení sa vkotúľa, každých pár sekúnd doň spadnú tri suroviny a košík sa trochu zahojdá.
// Bez plánu na ďalších 7 dní ukáže kartu s pozvánkou na Hotový jedálniček, aby nový človek košík vôbec objavil.
import { sb } from './data.js';
import { ctx } from './app.js';
import * as calc from './calc.js';
const CSS = `
#fw-shop.shop-card{position:relative;overflow:hidden;border-color:rgba(255,190,90,.3);background:linear-gradient(160deg,rgba(255,190,90,.14),var(--card) 62%)}
#fw-shop.shop-card::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 42%,rgba(255,214,150,.16) 50%,transparent 58%);transform:translateX(-130%);animation:scxSheen 8s ease-in-out 1.2s infinite}
#fw-shop .sc-t{position:relative;flex:none;width:46px;height:46px;border-radius:15px;display:grid;place-items:center;overflow:hidden;font-size:0;background:radial-gradient(120% 120% at 30% 20%,rgba(255,200,110,.30),rgba(255,160,60,.10) 70%),#241d14;box-shadow:inset 0 0 0 1px rgba(255,200,110,.22),0 6px 16px -8px rgba(255,170,60,.55);transition:transform .18s}
#fw-shop:active .sc-t{transform:scale(.92)}
#fw-shop .sc-t svg{display:block;width:34px;height:34px;overflow:visible}
#fw-shop .sc-t g{transform-box:fill-box;transform-origin:center}
#fw-shop .sc-in{animation:scxIn .95s cubic-bezier(.2,.9,.3,1) both}
#fw-shop .sc-roll{transform-origin:50% 90%;animation:scxRoll 8s ease-in-out 1.1s infinite}
#fw-shop .sc-w{animation:scxSpin 8s ease-in-out 1.1s infinite}
#fw-shop .sc-i{opacity:0;animation:scxDrop 8s cubic-bezier(.3,.9,.4,1) infinite}
#fw-shop .sc-i.a{animation-delay:1.3s}#fw-shop .sc-i.b{animation-delay:1.65s}#fw-shop .sc-i.c{animation-delay:2s}
@keyframes scxIn{from{transform:translateX(-30px);opacity:0}60%{opacity:1}to{transform:none;opacity:1}}
@keyframes scxRoll{0%,22%,70%,100%{transform:none}8%{transform:translateX(2px) rotate(-3deg)}15%{transform:translateX(-1.5px) rotate(2deg)}74%{transform:translateX(2.5px) rotate(-2.5deg)}80%{transform:translateX(-1px) rotate(1.5deg)}86%{transform:none}}
@keyframes scxSpin{0%{transform:rotate(0)}22%{transform:rotate(360deg)}70%{transform:rotate(360deg)}86%{transform:rotate(720deg)}100%{transform:rotate(720deg)}}
@keyframes scxDrop{0%{transform:translateY(-16px);opacity:0}3%{opacity:1}9%{transform:translateY(2px)}12%{transform:translateY(-1.5px)}15%,86%{transform:none;opacity:1}94%,100%{transform:none;opacity:0}}
@keyframes scxSheen{0%{transform:translateX(-130%)}14%,100%{transform:translateX(130%)}}
@media (prefers-reduced-motion:reduce){#fw-shop *,#fw-shop::after{animation:none!important}#fw-shop .sc-i{opacity:1}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const CART = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><g class="sc-in"><g class="sc-roll">
<path d="M3 7h5l3.4 17.2a2 2 0 0 0 2 1.6h15a2 2 0 0 0 2-1.5L33 13H10" stroke="#FFC46B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11 18h21" stroke="#FFC46B" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>
<g class="sc-i a"><circle cx="16" cy="10.2" r="3.6" fill="#FF6B5E"/></g>
<g class="sc-i b"><circle cx="23.2" cy="9.4" r="3.9" fill="#7CFFB2"/></g>
<g class="sc-i c"><circle cx="29.2" cy="11" r="3.2" fill="#FFD84F"/></g>
<g class="sc-w"><circle cx="15" cy="32" r="2.9" fill="#241d14" stroke="#FFC46B" stroke-width="2"/><path d="M15 29.6v4.8" stroke="#FFC46B" stroke-width="1.3"/></g>
<g class="sc-w"><circle cx="27" cy="32" r="2.9" fill="#241d14" stroke="#FFC46B" stroke-width="2"/><path d="M27 29.6v4.8" stroke="#FFC46B" stroke-width="1.3"/></g>
</g></g></svg>`;

const root = document.getElementById('app');
const run = () => {
  const b = root.querySelector('#fw-shop');
  if (!b) return;
  const meals = root.querySelector('.screen.td .meals');
  // prvé umiestnenie pod jedlá; potom miesto karty určuje todayorder.js (poradie kariet na Dnes)
  if (meals && !b.dataset.pl) { b.dataset.pl = '1'; if (meals.nextElementSibling !== b) meals.after(b); }
  const tile = b.firstElementChild;
  if (tile && !tile.dataset.sc) { tile.dataset.sc = '1'; tile.className = 'sc-t'; tile.innerHTML = CART; }
};
const empty = async () => {
  const meals = root.querySelector('.screen.td .meals');
  if (!meals || meals.dataset.sc0 || root.querySelector('#fw-shop') || !ctx.state?.profile) return;
  meals.dataset.sc0 = '1';
  try {
    const from = calc.addDays(calc.today(), 1), to = calc.addDays(from, 6);
    const { count, error } = await sb.from('food_logs').select('id', { count: 'exact', head: true }).eq('user_id', ctx.state.profile.id).gte('date', from).lte('date', to);
    if (error || count || !meals.isConnected) return;
    await new Promise(r => setTimeout(r, 500));
    if (!meals.isConnected || root.querySelector('#fw-shop')) return;
    const b = document.createElement('button'); b.id = 'fw-shop'; b.className = 'shop-card';
    b.innerHTML = '<span></span><div><b>Nákupný zoznam</b><small>Naplánuj si jedlá a suroviny sa zložia samy</small></div><i>›</i>';
    b.onclick = () => { location.hash = '#/karta'; };
    meals.after(b);
  } catch (_) { /* bez karty */ }
};
if (root) { new MutationObserver(() => { run(); empty(); }).observe(root, { childList: true, subtree: true }); run(); }
