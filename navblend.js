// Spodná lišta: pri ťahaní sa ikony zvýrazňujú podľa toho,koľko z nich bublina prekrýva (medzi dvoma záložkami svietia obe)
const clear = n => n.querySelectorAll('a').forEach(a => { a.style.color = ''; const ic = a.querySelector('.ic'); if (ic) ic.style.transform = ''; });
function blend(n) {
  const lens = n.querySelector('.nav-lens'); if (!lens) return;
  const lr = lens.getBoundingClientRect(), cx = lr.left + lr.width / 2;
  n.querySelectorAll('a').forEach(a => {
    const r = a.getBoundingClientRect(), p = Math.max(0, 1 - Math.abs(r.left + r.width / 2 - cx) / r.width);
    a.style.color = `color-mix(in srgb, var(--accent) ${Math.round(p * 100)}%, var(--muted))`;
    const ic = a.querySelector('.ic'); if (ic) ic.style.transform = `scale(${(1 + 0.14 * p).toFixed(3)})`;
  });
}
document.addEventListener('pointermove', () => { const n = document.querySelector('.nav.drag'); if (n) blend(n); }, { passive: true });
const end = () => document.querySelectorAll('.nav').forEach(clear);
document.addEventListener('pointerup', end, { passive: true });
document.addEventListener('pointercancel', end, { passive: true });
