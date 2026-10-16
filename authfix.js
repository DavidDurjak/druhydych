// Prihlásenie pre cudzích ľudí: zabudnuté heslo (odkaz na e-mail a nastavenie nového), slovenské chybové hlášky
// a úvodný text bez "12 týždňov" a "kouč vidí každý krok". Beží ako doplnok nad app.js (tá sa nemení).
import * as db from './data.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const recovery = /type=recovery/.test(location.hash);

const st = document.createElement('style');
st.textContent = `
.af-fp{display:block;width:100%;margin:12px 0 0;padding:6px;border:0;background:none;color:var(--muted);font:inherit;font-size:14px;font-weight:600;text-align:center;cursor:pointer;-webkit-appearance:none;appearance:none}
.af-fp:active{color:var(--accent)}
.af-sh h3{margin:0 0 8px;font-size:20px;letter-spacing:-.02em}
.af-sh p{margin:0 0 14px;color:var(--muted);font-size:14.5px;line-height:1.45}
.af-in{width:100%;height:52px;padding:0 14px;border-radius:14px;border:1px solid var(--line);background:var(--bg-2);color:var(--text);font-size:17px;outline:0}
.af-in:focus{border-color:var(--accent)}
.af-sh .btn{width:100%;margin-top:12px}
.sheet-bg:has(.af-sh){z-index:500}
body:has(.af-sh) .bd-fab{display:none!important}
.toast{z-index:600}
`;
document.head.appendChild(st);

const LEAD = 'Zapíš jedlo jednou vetou. Appka dopočíta kalórie a bielkoviny a povie ti, čo zjesť ďalej.';
const ERR = [
  [/invalid login credentials/i, 'Nesprávny e-mail alebo heslo.'],
  [/already registered|already been registered/i, 'Tento e-mail už má účet. Skús sa prihlásiť.'],
  [/email not confirmed/i, 'E-mail ešte nie je potvrdený. Klikni na odkaz v správe od nás.'],
  [/at least \d+ characters/i, 'Heslo musí mať aspoň 6 znakov.'],
  [/rate limit|too many requests|security purposes/i, 'Príliš veľa pokusov. Skús to o chvíľu.'],
  [/unable to validate email|invalid format|valid email/i, 'Zadaj platný e-mail.'],
  [/failed to fetch|network|load failed/i, 'Nepodarilo sa pripojiť. Skontroluj internet a skús znova.'],
  [/same password|different from the old/i, 'Nové heslo musí byť iné ako staré.'],
];
const sk = m => { for (const [re, t] of ERR) if (re.test(m)) return t; return m; };

function fixToast(t) {
  if (!t.classList.contains('err')) return;
  const s = sk(t.textContent || '');
  if (s !== t.textContent) t.textContent = s;
}
new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('toast')) fixToast(n); })))
  .observe(document.body, { childList: true });

async function forgot(form) {
  const email = form.querySelector('[name=email]')?.value.trim();
  if (!email) { ctx.toast('Najprv napíš svoj e-mail', true); form.querySelector('[name=email]')?.focus(); return; }
  try {
    const { error } = await db.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw new Error(error.message);
    ctx.toast('Poslali sme ti odkaz na zmenu hesla. Pozri aj spam.');
  } catch (e) { ctx.toast(sk(e.message || ''), true); }
}

function run() {
  const lead = root?.querySelector('.hero .lead');
  if (lead && lead.textContent !== LEAD) lead.textContent = LEAD;
  const f = root?.querySelector('#authf');
  if (f && !f.querySelector('[name=name]') && !f.parentNode.querySelector('.af-fp')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'af-fp'; b.textContent = 'Zabudol si heslo?';
    b.onclick = () => forgot(f);
    f.after(b);
  }
}
if (root) { new MutationObserver(run).observe(root, { childList: true, subtree: true }); run(); }

// po kliknutí na odkaz z e-mailu: nastavenie nového hesla
let shown = false;
function newPasswordSheet() {
  if (shown) return; shown = true;
  const bg = ctx.sheet(`<div class="af-sh"><h3>Nové heslo</h3><p>Zvoľ si nové heslo, aspoň 6 znakov.</p><input class="af-in" type="password" minlength="6" autocomplete="new-password" aria-label="Nové heslo"><button class="btn primary" data-ok>Uložiť heslo</button></div>`);
  const inp = bg.querySelector('input'), ok = bg.querySelector('[data-ok]');
  setTimeout(() => inp.focus(), 150);
  const save = async () => {
    if (inp.value.length < 6) { ctx.toast('Heslo musí mať aspoň 6 znakov.', true); return; }
    ok.disabled = true;
    try {
      const { error } = await db.sb.auth.updateUser({ password: inp.value });
      if (error) throw new Error(error.message);
      bg.remove(); ctx.toast('Heslo je zmenené');
    } catch (e) { ok.disabled = false; ctx.toast(sk(e.message || ''), true); }
  };
  ok.onclick = save;
  inp.onkeydown = e => { if (e.key === 'Enter') save(); };
}
db.ready.then(() => {
  db.sb.auth.onAuthStateChange(ev => { if (ev === 'PASSWORD_RECOVERY' || (recovery && ev === 'SIGNED_IN')) setTimeout(newPasswordSheet, 400); });
  if (recovery) db.sb.auth.getSession().then(({ data }) => { if (data?.session) setTimeout(newPasswordSheet, 600); });
}).catch(() => {});
