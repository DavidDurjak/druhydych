// Superserie: dva cviky idúce po sebe (A, B, A, B...). Pri cviku je tlačidlo "Superséria s ďalším cvikom"; po odškrtnutí série sa
// otvorí partner, takže sa nemusí hľadať a ťukať. Párovanie sa pamätá na zariadení. Nič sa nemení v ukladaní tréningu.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY = 'fw_supersets';
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (_) { /* nič */ } };
const idOf = card => $('.set[data-ex]', card)?.dataset.ex || '';
const pairKey = (a, b) => a + '|' + b;

const CSS = `.ss-btn{display:block;margin:2px 0 10px;border:1px dashed var(--line);background:none;color:var(--muted);border-radius:99px;padding:6px 12px;font:600 12.5px inherit;font-family:inherit;cursor:pointer}
.ss-btn.on{border-style:solid;border-color:var(--accent);color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}
.card.ex.ss-a,.card.ex.ss-b{border-left:3px solid var(--accent)}
.card.ex.ss-a{margin-bottom:0;border-bottom-left-radius:6px;border-bottom-right-radius:6px}
.card.ex.ss-b{margin-top:2px;border-top-left-radius:6px;border-top-right-radius:6px}
.ss-tag{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:99px;font:700 11px inherit;font-family:inherit;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);vertical-align:middle}`;
if (!document.getElementById('ss-css')) { const s = document.createElement('style'); s.id = 'ss-css'; s.textContent = CSS; document.head.appendChild(s); }

let busy = false;
function scan() {
  if (busy) return; busy = true;
  try {
    const scr = $('#app .screen'); if (!scr || !$('#finish', scr)) return;
    const cards = $$('.card.ex', scr), pairs = load();
    cards.forEach((c, i) => {
      const id = idOf(c), nxt = cards[i + 1], nid = nxt && idOf(nxt);
      const on = !!(nid && pairs.includes(pairKey(id, nid)));
      const a = on, b = i > 0 && pairs.includes(pairKey(idOf(cards[i - 1]), id));
      c.classList.toggle('ss-a', a); c.classList.toggle('ss-b', b);
      const tag = $('.ss-tag', c), label = a ? 'Superséria A' : b ? 'Superséria B' : '';
      if (label && !tag) { const h = $('.exn h3', c); if (h) { const t = document.createElement('span'); t.className = 'ss-tag'; t.textContent = label; h.append(t); } }
      else if (tag && !label) tag.remove(); else if (tag && tag.textContent !== label) tag.textContent = label;
      let btn = $('.ss-btn', c);
      const want = nid && $('.set[data-ex]', nxt) && $('[data-f=kg]', nxt) && $('[data-f=kg]', c);
      if (!want) { btn?.remove(); return; }
      if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ss-btn'; c.append(btn); }
      btn.classList.toggle('on', on);
      const txt = on ? 'Superséria s ďalším cvikom (zrušiť)' : 'Superséria s ďalším cvikom';
      if (btn.textContent !== txt) btn.textContent = txt;
      btn.dataset.pair = pairKey(id, nid);
    });
  } finally { busy = false; }
}
let raf = 0;
const app = document.getElementById('app');
if (app) new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); }).observe(app, { childList: true, subtree: true });

document.addEventListener('click', e => {
  const btn = e.target.closest?.('.ss-btn');
  if (btn) {
    const p = load(), k = btn.dataset.pair, i = p.indexOf(k);
    if (i >= 0) p.splice(i, 1); else p.push(k);
    save(p); scan();
    try { window.fwTrack && window.fwTrack('superset', { on: i < 0 }); } catch (_) { }
    return;
  }
  const chk = e.target.closest?.('[data-chk]'); if (!chk) return;
  const row = chk.closest('.set'), card = row?.closest('.card.ex'); if (!card || row.classList.contains('done')) return;
  const cards = $$('.card.ex', card.parentElement), i = cards.indexOf(card);
  const partner = card.classList.contains('ss-a') ? cards[i + 1] : card.classList.contains('ss-b') ? cards[i - 1] : null;
  if (!partner) return;
  // po odškrtnutí série (trainflow ju dopíše hneď) otvoríme partnera, ak má ešte neodcvičené série
  setTimeout(() => {
    const left = $$('.set', partner).some(s => !s.classList.contains('done'));
    if (!left || partner.classList.contains('tf-open')) return;
    const exh = $('.exh', partner); if (exh) exh.click();
  }, 120);
}, true);
scan();
