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
body:has(.sheet-bg) .qa-fab,body:has(.sheet-bg) .bd-fab{display:none!important}
.toast{z-index:600}
.af-ok{display:flex;gap:12px;align-items:flex-start;margin:14px 0 0;padding:14px;border-radius:16px;border:1px solid color-mix(in srgb,var(--accent) 45%,transparent);background:color-mix(in srgb,var(--accent) 10%,var(--card));animation:afIn .38s cubic-bezier(.2,1.2,.4,1) both}
.af-ok.err{border-color:color-mix(in srgb,var(--danger) 55%,transparent);background:color-mix(in srgb,var(--danger) 10%,var(--card))}
@keyframes afIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
.af-ok i{flex:0 0 28px;height:28px;border-radius:50%;background:var(--accent);color:#0B0E12;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:15px}
.af-ok.err i{background:var(--danger);color:#fff}
.af-ok b{display:block;font-size:15px;margin-bottom:2px}
.af-ok span{display:block;color:var(--muted);font-size:13.5px;line-height:1.4}
.af-ok em{color:var(--text);font-style:normal;font-weight:600;word-break:break-all}
.af-ok button{margin-top:8px;padding:0;border:0;background:none;color:var(--accent);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}
.af-ok button:disabled{color:var(--muted);cursor:default}
@media (prefers-reduced-motion:reduce){.af-ok{animation:none}}
.af-pw{position:relative;display:block}
.af-pw input{padding-right:52px!important}
.af-eye{position:absolute;right:2px;top:50%;transform:translateY(-50%);width:46px;height:46px;border:0;background:none;color:var(--muted);display:grid;place-items:center;cursor:pointer;-webkit-appearance:none;appearance:none;-webkit-tap-highlight-color:transparent}
.af-eye[aria-pressed=true]{color:var(--accent)}
.af-eye svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
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

let cd = null;
function panel(b, kind, title, text, email) {
  clearInterval(cd);
  b.parentNode.querySelector('.af-ok')?.remove();
  const d = document.createElement('div');
  d.className = 'af-ok' + (kind === 'err' ? ' err' : '');
  d.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  d.innerHTML = '<i>' + (kind === 'err' ? '!' : '✓') + '</i><div><b></b><span></span></div>';
  d.querySelector('b').textContent = title;
  const sp = d.querySelector('span');
  if (email) { sp.append(text + ' '); const em = document.createElement('em'); em.textContent = email; sp.append(em, '. Ak ho nevidíš, pozri aj spam.'); }
  else sp.textContent = text;
  b.after(d);
  return d;
}
async function forgot(form, b) {
  if (b.disabled) return;
  const email = form.querySelector('[name=email]')?.value.trim();
  if (!email) { panel(b, 'err', 'Chýba e-mail', 'Najprv napíš e-mail, ktorým sa prihlasuješ.'); form.querySelector('[name=email]')?.focus(); return; }
  b.disabled = true; b.textContent = 'Posielam…';
  try {
    const { error } = await db.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw new Error(error.message);
    const d = panel(b, 'ok', 'Skontroluj e-mail', 'Poslali sme odkaz na zmenu hesla na', email);
    const re = document.createElement('button');
    re.type = 'button'; re.disabled = true; d.lastElementChild.append(re);
    let n = 30;
    const tick = () => { if (n > 0) { re.textContent = 'Poslať znova o ' + n + ' s'; n--; } else { clearInterval(cd); re.disabled = false; re.textContent = 'Poslať znova'; } };
    tick(); cd = setInterval(tick, 1000);
    re.onclick = () => { b.disabled = false; forgot(form, b); };
  } catch (e) { panel(b, 'err', 'Nepodarilo sa poslať', sk(e.message || '')); }
  b.disabled = false; b.textContent = 'Zabudol si heslo?';
}

const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>';
function eyeify(inp) {
  if (!inp || inp.parentNode.classList.contains('af-pw')) return;
  const w = document.createElement('div');
  w.className = 'af-pw';
  inp.parentNode.insertBefore(w, inp);
  w.appendChild(inp);
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'af-eye'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Zobraziť heslo');
  b.innerHTML = EYE;
  b.onmousedown = b.ontouchstart = e => e.preventDefault();
  b.onclick = () => {
    const show = inp.type === 'password';
    const a = inp.selectionStart, z = inp.selectionEnd;
    inp.type = show ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Skryť heslo' : 'Zobraziť heslo');
    b.innerHTML = show ? EYE_OFF : EYE;
    try { inp.focus(); inp.setSelectionRange(a, z); } catch (_) {}
  };
  w.appendChild(b);
}

function run() {
  const lead = root?.querySelector('.hero .lead');
  if (lead && lead.textContent !== LEAD) lead.textContent = LEAD;
  eyeify(root?.querySelector('#authf input[name=password]'));
  const f = root?.querySelector('#authf');
  if (f && !f.querySelector('[name=name]') && !f.parentNode.querySelector('.af-fp')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'af-fp'; b.textContent = 'Zabudol si heslo?';
    b.onclick = () => forgot(f, b);
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
  eyeify(inp);
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
