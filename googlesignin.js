// Prihlásenie cez Google: tlačidlo na prihlasovacej obrazovke a v poslednom kroku kvízu (vytvorenie účtu).
// Používa Supabase OAuth (poskytovateľ Google). Po návrate sa používateľ prihlási sám, nový účet prejde onboardingom ako pri e-maile.
// V kvíze sa pred presmerovaním vyžaduje zaškrtnutie "mám aspoň 18 rokov", rovnako ako pri registrácii e-mailom.
import * as db from './data.js';
import { tr } from './i18n.js';

const T = s => tr(s) || s;
const G = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

const CSS = `.gs-wrap{margin:14px 0 4px}
.fnq-foot .gs-wrap{margin:10px 0 2px}.fnq-foot .gs-or{margin:0 0 10px}.fnq-foot .gs-btn{height:50px}
.gs-or{display:flex;align-items:center;gap:12px;margin:0 0 12px;color:var(--muted,#8a94a3);font-size:13px}
.gs-or::before,.gs-or::after{content:"";flex:1;height:1px;background:var(--line,rgba(255,255,255,.12))}
.gs-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;height:52px;border-radius:16px;border:1px solid var(--line,rgba(255,255,255,.16));background:var(--bg-2,rgba(255,255,255,.06));color:var(--text,#fff);font:inherit;font-size:16px;font-weight:700;cursor:pointer}
.gs-btn:active{transform:scale(.985)}.gs-btn[disabled]{opacity:.6}
.gs-err{margin:8px 0 0;font-size:13px;color:#FF6B6B;text-align:center}
.gs-wrap[data-gs=login]{margin:2px 0 16px}.gs-wrap[data-gs=login] .gs-or{margin:16px 0 0}
.gs-wrap[data-gs=login] .gs-btn{height:54px;background:#fff;color:#1F1F1F;border-color:#747775;box-shadow:0 6px 18px rgba(0,0,0,.18)}
html[data-theme=light] .gs-wrap[data-gs=login] .gs-btn{background:#131314;color:#E3E3E3;border-color:#8E918F}
.gs-legal{margin:10px 2px 0;font-size:12px;line-height:1.45;color:var(--muted,#8a94a3);text-align:center}.gs-legal a{color:inherit;text-decoration:underline}`;
if (!document.getElementById('gs-css')) { const s = document.createElement('style'); s.id = 'gs-css'; s.textContent = CSS; document.head.appendChild(s); }

function track(where, act) { try { window.fwTrack && window.fwTrack('google_signin', { where, act }); } catch (_) { } }

async function start(btn, err, where, gate) {
  err.hidden = true;
  if (gate) { const m = gate(); if (m) { err.textContent = m; err.hidden = false; return; } }
  if (!navigator.onLine) { err.textContent = T('Bez internetu. Skús to znova.'); err.hidden = false; return; }
  btn.disabled = true; track(where, 'click');
  try {
    await db.ready;
    const { error } = await db.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/', queryParams: { prompt: 'select_account' } } });
    if (error) throw error;
  } catch (e) {
    btn.disabled = false; track(where, 'error');
    err.textContent = T('Prihlásenie cez Google sa nepodarilo. Skús to znova alebo použi e-mail.'); err.hidden = false;
  }
}

const LEGAL = '<p class="gs-legal">Pokračovaním súhlasíš s <a href="podmienky.html" target="_blank" rel="noopener">Podmienkami používania</a> a <a href="zasady.html" target="_blank" rel="noopener">Zásadami ochrany súkromia</a> a potvrdzuješ, že máš aspoň 18 rokov.</p>';
function make(where, gate) {
  const w = document.createElement('div'); w.className = 'gs-wrap'; w.dataset.gs = where;
  const btnHtml = `<button type="button" class="gs-btn">${G}<span>${T('Pokračovať cez Google')}</span></button><p class="gs-err" role="alert" hidden></p>`;
  // prihlásenie: Google je hore (jedno ťuknutie, bez hesla), e-mail pod ním
  w.innerHTML = where === 'login' ? `${btnHtml}<div class="gs-or">${T('alebo e-mailom')}</div>` : `<div class="gs-or">${T('alebo')}</div>${btnHtml}`;
  const btn = w.querySelector('button'), err = w.querySelector('.gs-err');
  btn.onclick = () => start(btn, err, where, gate);
  return w;
}

function scan() {
  const f = document.querySelector('#authf');
  if (f && !document.querySelector('[data-gs=login]')) {
    const seg = f.previousElementSibling?.classList.contains('seg') ? f.previousElementSibling : f;
    seg.before(make('login'));
    f.insertAdjacentHTML('afterend', LEGAL);
  }
  const a = document.querySelector('#fnqAcc');
  if (a && !document.querySelector('[data-gs=quiz]')) {
    // v kvíze ide Google priamo pod hlavné tlačidlo v spodnej lište, aby bolo vždy vidieť
    const cta = document.querySelector('.fnq .fnq-foot .fnq-cta');
    (cta || a).after(make('quiz', () => (a.querySelector('[name=ok]')?.checked ? '' : T('Potvrď, že máš aspoň 18 rokov a súhlasíš s podmienkami.'))));
  }
}
new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
scan();
