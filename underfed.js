// Podjedanie: keď človek aspoň 4 z posledných 7 dní zapíše výrazne menej, než je jeho cieľ, ukáže sa na Dnes jedna pokojná karta.
// Appky na chudnutie takto samy tlačia ľudí do prílišného deficitu, tak tu robíme opak: ukážeme číslo a ponúkneme dve možné vysvetlenia.
// Nechváli to a nenabáda jesť ešte menej. Zavrieť sa dá na 7 dní.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const KEY = 'fw_uf_hide';
const nf = v => Math.round(v).toLocaleString('sk-SK');

const CSS = `.uf{margin:12px 0;padding:14px 16px;border-radius:16px;background:color-mix(in srgb,#FFC857 12%,var(--card));border:1px solid color-mix(in srgb,#FFC857 35%,var(--line))}
.uf b{display:block;font-size:14.5px}.uf p{margin:4px 0 0;font-size:13.5px;line-height:1.45;color:var(--text)}.uf p.m{color:var(--muted);font-size:12.5px}
.uf div{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.uf button{border:1px solid var(--line);background:var(--bg);color:var(--text);border-radius:99px;padding:7px 12px;font:600 13px inherit;font-family:inherit;cursor:pointer}`;
if (!document.getElementById('uf-css')) { const s = document.createElement('style'); s.id = 'uf-css'; s.textContent = CSS; document.head.appendChild(s); }

let busy = false, cache = null;

export function evaluate(p, byDay, today) {
  const T = Number(p.target_kcal) || 0; if (!T) return null;
  const days = Object.keys(byDay).filter(d => d < today && d >= calc.addDays(today, -7) && byDay[d].kcal >= 300);
  if (days.length < 4) return null;
  const avg = days.reduce((a, d) => a + byDay[d].kcal, 0) / days.length;
  const floor = Math.max(1200, T * 0.75);
  if (avg >= floor) return null;
  return { avg, T, n: days.length };
}

async function run() {
  if (busy) return;
  const scr = root?.querySelector('.tdh-streak'); if (!scr || root.querySelector('.uf')) return;
  const p = ctx.state?.profile; if (!p?.id || ctx.state.date !== calc.today()) return;
  try { if (Number(localStorage.getItem(KEY)) > Date.now()) return; } catch (_) { }
  busy = true;
  try {
    const t = calc.today();
    if (!cache || cache.uid !== p.id || cache.t !== t || Date.now() - cache.at > 300000) {
      const byDay = await db.foodByDay(p.id, calc.addDays(t, -7), calc.addDays(t, -1));
      cache = { uid: p.id, t, at: Date.now(), r: evaluate(p, byDay, t) };
    }
    const r = cache.r; if (!r) return;
    if (root.querySelector('.uf')) return;
    const gap = r.T - r.avg;
    const card = document.createElement('section'); card.className = 'uf'; card.setAttribute('role', 'note');
    card.innerHTML = `<b>Posledný týždeň ješ v priemere ${nf(r.avg)} kcal</b>
      <p>Tvoj cieľ je ${nf(r.T)} kcal, to je o ${nf(gap)} menej. Buď si nezapisuješ všetko (oleje, nápoje, večere), alebo ješ naozaj málo. Pri veľmi nízkom príjme ubúda svalov a trpí energia, spánok aj tréning.</p>
      <p class="m">Ak niečo chýba v zápise, doplň to. Ak nie, skús ísť bližšie k cieľu. Nemusíš ho trafiť naraz, stačí +200 kcal denne.</p>
      <div><button data-uf="ok">Chápem</button><button data-uf="mute">Neukázať týždeň</button></div>`;
    const anchor = root.querySelector('.wk-avg') || root.querySelector('.ml');
    if (!anchor) return;
    anchor.before(card);
    card.querySelectorAll('[data-uf]').forEach(b => b.onclick = () => { try { localStorage.setItem(KEY, String(Date.now() + 7 * 864e5)); } catch (_) { } card.remove(); try { window.fwTrack && window.fwTrack('underfed', { act: b.dataset.uf }); } catch (_) { } });
    try { window.fwTrack && window.fwTrack('underfed', { act: 'shown' }); } catch (_) { }
  } catch (_) { /* karta je bonus */ }
  finally { busy = false; }
}
if (root) { new MutationObserver(() => run()).observe(root, { childList: true, subtree: true }); run(); }
