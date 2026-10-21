// Prístupnosť: priblíženie stránky párom prstov musí fungovať (slabý zrak, WCAG 1.4.4).
// iOS približuje stránku pri kliknutí do pohľadu s písmom menším ako 16 px, preto sa na dotykových zariadeniach
// všetky vstupy zväčšia na 16 px. Vtedy je bezpečné zoom povoliť.
try {
  if (!document.getElementById('a11y-css')) {
    const s = document.createElement('style'); s.id = 'a11y-css';
    s.textContent = '@media (pointer:coarse){input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),select,textarea{font-size:16px !important}}';
    document.head.appendChild(s);
  }
  const m = document.querySelector('meta[name=viewport]');
  if (m) m.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
} catch (_) { /* bonus */ }
