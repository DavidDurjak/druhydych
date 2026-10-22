// Drobnosti, ktoré robia appku príjemnejšou:
// 1) Zvuk vody pri pridaní pohára (+150, +250, +500 v Pitnom režime): bublinky a šplechnutie, čím viac vody, tým dlhšie.
//    Zvuk sa vytvára v telefóne (Web Audio), nič sa nesťahuje. Keď má človek zapnutý tichý režim, telefón ho stíši ako každá appka.
// 2) Krížik na zavretie každého spodného okna (sheet), ktoré ho nemá. Napr. Hotový jedálniček sa inak nedal zavrieť.
const CSS = `
.sx-close{position:sticky;top:0;float:right;z-index:3;width:36px;height:36px;margin:-6px -4px 4px 10px;border-radius:50%;border:1px solid var(--line);
  background:var(--bg-2);color:var(--text);font:inherit;font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer;-webkit-appearance:none;appearance:none;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.sx-close:active{transform:scale(.92)}
`;
if (!document.getElementById('sx-css')) { const s = document.createElement('style'); s.id = 'sx-css'; s.textContent = CSS; document.head.appendChild(s); }

// ---------- zvuk vody ----------
let ac = null;
function audio() {
  const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
  if (!ac) ac = new A();
  if (ac.state === 'suspended') ac.resume().catch(() => { });
  return ac;
}
// jedna bublinka: krátky tón, ktorý rýchlo stúpa (typické „blub“)
function bubble(c, t, f, vol) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 2.6, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + 0.13);
}
// jemný šum tečúcej vody pod bublinkami
function pour(c, t, len) {
  const n = Math.floor(c.sampleRate * len), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(1500, t + len); bp.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
  g.gain.setValueAtTime(0.05, t + len * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t); src.stop(t + len + 0.02);
}
export function waterSound(ml) {
  try {
    const c = audio(); if (!c) return;
    const t = c.currentTime + 0.01;
    const count = ml >= 500 ? 7 : ml >= 250 ? 4 : 2, len = 0.18 + count * 0.075;
    pour(c, t, len);
    for (let i = 0; i < count; i++) bubble(c, t + i * 0.075 + Math.random() * 0.03, 260 + Math.random() * 260 + i * 25, 0.16);
    if (navigator.vibrate) navigator.vibrate(12);
  } catch (_) { /* bez zvuku */ }
}
document.addEventListener('click', e => {
  const b = e.target.closest?.('#wx [data-wx]');
  if (b) waterSound(Number(b.dataset.wx) || 250);
}, true);

// ---------- krížik na zavretie okien ----------
const hasClose = sh => [...sh.querySelectorAll('button,a')].some(b => /zavrie/i.test(b.getAttribute('aria-label') || '') || /^\s*(×|✕|✖|zavrieť)\s*$/i.test(b.textContent || ''));
function addClose(bg) {
  const sh = bg.querySelector(':scope > .sheet');
  if (!sh || sh.dataset.sx || hasClose(sh)) return;
  sh.dataset.sx = '1';
  const x = document.createElement('button');
  x.type = 'button'; x.className = 'sx-close'; x.setAttribute('aria-label', 'Zavrieť'); x.textContent = '×';
  x.onclick = () => bg.remove();
  sh.prepend(x);
}
new MutationObserver(ms => {
  for (const m of ms) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.classList?.contains('sheet-bg')) setTimeout(() => addClose(n), 0);
  }
}).observe(document.body, { childList: true });
