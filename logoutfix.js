// Poistka odhlásenia: ak odhlásenie zlyhá na slabom signáli, prihlásenie by v telefóne ostalo uložené a appka by po otvorení znova bežala prihlásená.
// Po ťuknutí na "Odhlásiť sa" počkáme na normálne odhlásenie. Ak po pár sekundách zostane uložené prihlásenie, zmažeme ho a appku načítame znova.
const KEY = /^sb-.*-auth-token/;

function left() {
  try { return Object.keys(localStorage).filter(k => KEY.test(k)); } catch (_) { return []; }
}

document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#out');
  if (!b) return;
  let n = 0;
  const t = setInterval(() => {
    n++;
    const keys = left();
    if (!keys.length) { clearInterval(t); return; }
    if (n >= 8) {
      clearInterval(t);
      try { keys.forEach(k => localStorage.removeItem(k)); localStorage.removeItem('fw_snap'); } catch (_) { /* nič */ }
      location.reload();
    }
  }, 500);
}, true);
