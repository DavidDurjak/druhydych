// Zmazanie účtu s lehotou 30 dní (ako TikTok a Instagram).
// Keď sa prihlási niekto, kto požiadal o zmazanie, uvidí obrazovku s dátumom zmazania a môže účet jedným ťuknutím obnoviť.
// Kým sa nerozhodne, appku nepoužíva (obrazovka je cez celé okno).
import { ctx } from './app.js';
import * as db from './data.js';

const CSS = `
.ad-ov{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:24px;background:var(--bg,#0B0E12)}
.ad-box{width:100%;max-width:400px;text-align:center}
.ad-ic{width:84px;height:84px;margin:0 auto 18px;border-radius:28px;display:grid;place-items:center;font-size:40px;background:color-mix(in srgb,var(--accent,#7CFFB2) 14%,transparent)}
.ad-box h1{font-size:26px;letter-spacing:-.03em;margin:0 0 10px}
.ad-box p{color:var(--muted);font-size:15px;line-height:1.5;margin:0 0 8px}
.ad-box p b{color:var(--text)}
.ad-days{display:inline-block;margin:10px 0 22px;padding:8px 14px;border-radius:99px;font-weight:800;font-size:14px;background:color-mix(in srgb,var(--danger,#FF5C7A) 14%,transparent);color:var(--danger,#FF5C7A)}
.ad-box .btn{width:100%;margin-top:10px;padding:15px;font-size:16px}
`;
const fmt = d => d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' });
let checked = null;

async function check() {
  const uid = ctx.state?.profile?.id;
  if (!uid || checked === uid || document.querySelector('.ad-ov')) return;
  checked = uid;
  let row = null;
  try { const { data, error } = await db.sb.from('account_deletions').select('purge_at').eq('user_id', uid).maybeSingle(); if (!error) row = data; } catch (_) { return; }
  if (!row) return;
  show(new Date(row.purge_at));
}

function show(purge) {
  if (!document.getElementById('ad-css')) { const s = document.createElement('style'); s.id = 'ad-css'; s.textContent = CSS; document.head.appendChild(s); }
  const days = Math.max(0, Math.ceil((purge - Date.now()) / 864e5));
  const ov = document.createElement('div'); ov.className = 'ad-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = `<div class="ad-box">
    <div class="ad-ic">🗑️</div>
    <h1>Tvoj účet sa maže</h1>
    <p>Požiadal si o zmazanie účtu. Natrvalo ho zmažeme <b>${fmt(purge)}</b>, spolu s jedlami, váhou, tréningami a fotkami.</p>
    <span class="ad-days">${days === 1 ? 'Zostáva 1 deň' : days >= 2 && days <= 4 ? `Zostávajú ${days} dni` : `Zostáva ${days} dní`}</span>
    <p>Rozmyslel si sa? Obnov účet a všetko bude tak, ako si to nechal.</p>
    <button class="btn primary" data-r>Obnoviť účet</button>
    <button class="btn ghost" data-o>Odhlásiť sa</button>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-r]').onclick = async e => {
    const b = e.currentTarget; b.disabled = true; b.textContent = 'Obnovujem…';
    try {
      const { error } = await db.sb.rpc('restore_account'); if (error) throw error;
      try { window.fwTrack?.('account_restored'); } catch (_) { }
      ov.remove(); ctx.toast?.('Účet je obnovený. Vitaj späť!');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) { b.disabled = false; b.textContent = 'Obnoviť účet'; ctx.toast?.('Účet sa nepodarilo obnoviť. Skús to znova.', true); }
  };
  ov.querySelector('[data-o]').onclick = async () => {
    try { await db.sb.auth.signOut({ scope: 'local' }); } catch (_) { }
    try { localStorage.clear(); sessionStorage.clear(); } catch (_) { }
    location.replace(location.pathname);
  };
}

const app = document.getElementById('app');
if (app) new MutationObserver(() => { if (ctx.state?.profile?.id && checked !== ctx.state.profile.id) check(); }).observe(app, { childList: true });
setTimeout(check, 800);
