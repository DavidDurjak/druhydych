// Prechod medzi obrazovkami ako v natívnej appke: nová obrazovka jemne prikĺzne zo strany, ktorou smeruješ v spodnej lište
// (Dnes → Jedlo → Tréning → Pokrok → Profil), podobrazovky (napr. Ciele, Váha) prídu sprava, návrat späť zľava.
// Pri prekreslení tej istej obrazovky (iný deň, uložený zápis) sa nehýbe nič.
const st = document.createElement('style');
st.textContent = `
@keyframes fwNavIn{from{opacity:.35;transform:translate3d(var(--fw-nx,0),0,0)}to{opacity:1;transform:none}}
#app>.screen.fw-nav-in{animation:fwNavIn .26s cubic-bezier(.2,.8,.2,1) both}
@media (prefers-reduced-motion:reduce){#app>.screen.fw-nav-in{animation:none}}
#aiText::placeholder{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;
document.head.appendChild(st);

const TABS = ['#/', '#/jedlo', '#/trening', '#/pokrok', '#/profil'];
const pathOf = () => (location.hash || '#/').split('?')[0];
const app = document.getElementById('app');
let shown = null, lastPath = null, prevPath = null, back = false;

addEventListener('hashchange', () => { const p = pathOf(); back = p === prevPath; prevPath = lastPath; });

function check() {
  const scr = app && app.querySelector(':scope > .screen');
  if (!scr || scr === shown) return;
  const path = pathOf(), from = lastPath;
  shown = scr; lastPath = path;
  if (!from || from === path || document.documentElement.classList.contains('fw-snap')) return;
  const a = TABS.indexOf(from), b = TABS.indexOf(path);
  let dir;
  if (a >= 0 && b >= 0) dir = b > a ? 1 : -1;
  else if (b >= 0) dir = -1;          // z podobrazovky späť na kartu
  else dir = back ? -1 : 1;           // do podobrazovky
  scr.style.setProperty('--fw-nx', dir * 18 + 'px');
  scr.classList.remove('fw-nav-in'); void scr.offsetWidth; scr.classList.add('fw-nav-in');
  scr.addEventListener('animationend', () => { scr.classList.remove('fw-nav-in'); scr.style.removeProperty('--fw-nx'); }, { once: true });
}

if (app) { new MutationObserver(check).observe(app, { childList: true }); check(); }
