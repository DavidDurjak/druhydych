// Prvé spustenie: pokojná prvá obrazovka, jasná správa po registrácii a návod na pridanie na plochu (iPhone).
const css = document.createElement('style');
css.textContent = `
/* výber jedla dňa v paneli: jeden riadok z tmavého skla, posúva sa do strán */
.sheet .seg:has(> button:nth-child(6)){display:flex;flex-wrap:nowrap;gap:4px;padding:4px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none;border-radius:16px;
  background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.04)),rgba(24,28,34,.52);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);
  border:1px solid rgba(255,255,255,.13);box-shadow:inset 0 1px 0 rgba(255,255,255,.16);
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 14px,#000 calc(100% - 22px),transparent 100%);mask-image:linear-gradient(90deg,transparent 0,#000 14px,#000 calc(100% - 22px),transparent 100%)}
.sheet .seg:has(> button:nth-child(6))::-webkit-scrollbar{display:none}
.sheet .seg:has(> button:nth-child(6)) button{flex:0 0 auto;white-space:nowrap;scroll-snap-align:center;padding:10px 16px;font-size:14px;border-radius:12px;min-width:0}
.sheet .seg:has(> button:nth-child(6)) button.on{background:linear-gradient(180deg,rgba(255,255,255,.20),rgba(255,255,255,.07));box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 0 0 1px rgba(255,255,255,.10),0 4px 14px rgba(0,0,0,.28)}
.sheet,.sheet-bg{max-width:100vw;box-sizing:border-box}
.sheet{min-width:0;overflow-x:hidden}
body:has(.sheet-bg) .bd-fab{display:none!important}
#aiText,#q{font-size:15px}
#aiText::placeholder,#q::placeholder{font-size:14px}

.fw-mail{border:1px solid rgba(122,255,178,.35);background:linear-gradient(160deg,rgba(122,255,178,.12),rgba(122,255,178,.03));border-radius:18px;padding:16px 16px 14px;margin-bottom:14px}
.fw-mail h3{margin:0 0 6px;font-size:17px}.fw-mail p{margin:0;font-size:14px;line-height:1.5;color:var(--muted,#9aa3b8)}
.fw-mail b{color:var(--text,#fff);word-break:break-all}
.fw-inst{display:flex;gap:12px;align-items:flex-start;margin:0 0 14px;padding:14px;border-radius:18px;border:1px solid var(--line,#232b3a);background:var(--card,#141a24)}
.fw-inst .ic{font-size:26px;line-height:1}.fw-inst h3{margin:0 0 4px;font-size:15px}.fw-inst p{margin:0;font-size:13px;line-height:1.5;color:var(--muted,#9aa3b8)}
.fw-inst button{margin-left:auto;background:none;border:0;color:var(--muted,#9aa3b8);font-size:20px;line-height:1;padding:0 2px;cursor:pointer}
`;
document.head.appendChild(css);

let lastEmail = '';
document.addEventListener('submit', e => {
  const f = e.target;
  if (f?.id !== 'authf') return;
  const em = f.querySelector('[name=email]')?.value || '';
  if (f.querySelector('[name=name]')) lastEmail = em;
}, true);

const ls = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* nič */ } } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function mailNote() {
  const t = document.querySelector('.toast');
  if (!lastEmail || !t || !/Účet vytvorený/.test(t.textContent)) return;
  const form = document.querySelector('#authf');
  if (!form || document.querySelector('.fw-mail')) return;
  const box = document.createElement('div');
  box.className = 'fw-mail';
  box.innerHTML = `<h3>Skontroluj e-mail</h3><p>Poslali sme potvrdzovací odkaz na <b>${esc(lastEmail)}</b>. Klikni naň a potom sa tu prihlás. Ak ho nevidíš, pozri aj do spamu.</p>`;
  form.parentElement.insertBefore(box, form.parentElement.firstChild.nextSibling || form);
  const em = form.querySelector('[name=email]'); if (em) em.value = lastEmail;
  form.querySelector('[name=password]')?.focus();
}

function installCard() {
  const first = document.querySelector('.td-first');
  if (!first || document.querySelector('.fw-inst')) return;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  if (!ios || standalone || ls.get('fw_inst_x')) return;
  const c = document.createElement('div');
  c.className = 'fw-inst';
  c.innerHTML = `<span class="ic">📲</span><div><h3>Pridaj Fuelwind na plochu</h3><p>V Safari klikni na Zdieľať (štvorec so šípkou) a vyber Pridať na plochu. Potom sa otvorí ako appka a prídu aj pripomienky.</p></div><button aria-label="Zavrieť">×</button>`;
  c.querySelector('button').onclick = () => { ls.set('fw_inst_x', '1'); c.remove(); };
  first.after(c);
}

function segScroll() {
  document.querySelectorAll('.sheet .seg button.on').forEach(b => {
    const p = b.parentElement;
    if (p.scrollWidth <= p.clientWidth + 2 || p._fwOn === b) return;
    p._fwOn = b;
    p.scrollTo({ left: b.offsetLeft - (p.clientWidth - b.offsetWidth) / 2, behavior: p._fwInit ? 'smooth' : 'auto' });
    p._fwInit = 1;
  });
}
const run = () => { mailNote(); installCard(); segScroll(); };
new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
run();
