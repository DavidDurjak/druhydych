// Prvé spustenie: pokojná prvá obrazovka, jasná správa po registrácii a návod na pridanie na plochu (iPhone).
const css = document.createElement('style');
css.textContent = `
.screen.td:has(.td-first) :is(#fw-discover,#fast,.wt,.duo,.ci,#fw-shop){display:none}
#aiText,#q{font-size:15px}
#aiText::placeholder,#q::placeholder{font-size:14px}
.fw-more{margin:14px 4px 4px;text-align:center;font-size:13px;color:var(--muted,#8b93a7);line-height:1.5}
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

function moreNote() {
  const first = document.querySelector('.td-first');
  const meals = document.querySelector('.screen.td .meals');
  if (!first || !meals || document.querySelector('.fw-more')) return;
  const n = document.createElement('div');
  n.className = 'fw-more';
  n.textContent = 'Po prvom jedle sa odomknú voda, váha, tréning a denný check-in.';
  meals.after(n);
}

const run = () => { mailNote(); installCard(); moreNote(); };
new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
run();
