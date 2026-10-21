// Séria: ťuknutie na plamienok na Dnes vysvetlí, čo sa do série počíta a ako funguje voľný deň.
// Počíta sa rovnako ako na Dnes (calc.streakSafe), tu sa len zobrazí.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const dni = n => `${n} ${n === 1 ? 'deň' : n < 5 ? 'dni' : 'dní'}`;

document.addEventListener('click', async e => {
  const a = e.target.closest?.('.tdh-streak'); if (!a) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const uid = ctx.state?.profile?.id; if (!uid) return;
  const bg = ctx.sheet('<div class="row between"><h2>Séria</h2><button class="del" data-x aria-label="Zavrieť">×</button></div><p class="muted small mt">Načítavam...</p>');
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  let n = 0, saved = 0, today = false;
  try {
    const dates = await db.activityDates(uid, calc.addDays(calc.today(), -400));
    ({ n, saved } = calc.streakSafe(dates)); today = dates.includes(calc.today());
  } catch (_) { n = Number(a.textContent.replace(/\D/g, '')) || 0; saved = Number(a.dataset.saved) || 0; }
  const S = bg.querySelector('.sheet') || bg;
  S.innerHTML = `<div class="row between"><h2>Séria</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <p style="font-size:34px;font-weight:800;margin:10px 0 2px">🔥 ${esc(dni(n))}</p>
    <p class="muted small">${n ? (today ? 'Dnešný deň už máš v sérii.' : 'Zapíš dnes aspoň jednu vec a séria pokračuje.') : 'Zapíš dnes aspoň jednu vec a séria sa začne.'}</p>
    <div class="mt" style="display:grid;gap:10px;font-size:14px;line-height:1.45">
      <div><b>Čo sa počíta</b><br><span class="muted">Deň je v sérii, keď zapíšeš aspoň jednu vec: jedlo, váhu, check-in alebo tréning. Stačí jedno ťuknutie, nemusíš sa trafiť do kalórií.</span></div>
      <div><b>Voľný deň</b><br><span class="muted">Jeden vynechaný deň za 7 dní sériu nezruší. Dva dni za sebou áno. ${saved ? `V tejto sérii ťa už zachránil ${esc(dni(saved))}.` : 'V tejto sérii ťa zatiaľ nemusel zachrániť.'}</span></div>
    </div>
    <button class="btn primary mt" data-x>Rozumiem</button>`;
  S.querySelectorAll('[data-x]').forEach(b => b.onclick = () => bg.remove());
  try { window.fwTrack && window.fwTrack('streak_info', { n }); } catch (_) { }
}, true);

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
