// Kamaráti: týždenná tabuľka s ľuďmi, ktorých si pozveš kódom alebo odkazom.
// Kamaráti vidia len počty dní so zápisom, dní v cieli a tréningov za 7 dní, nikdy kalórie ani váhu.
// Týždenná výzva: každý týždeň (pondelok až nedeľa) rovnaká výzva pre celú skupinu, vidno len počty dní a tréningov.
// Karta sa vloží pod jedlá na obrazovke Dnes (bez zásahu do today.js). Pozvánka: #/kamarat/KÓD.
import { sb } from './data.js';
import { ctx } from './app.js';

const ls = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* nič */ } }, del: k => { try { localStorage.removeItem(k); } catch (_) { /* nič */ } } };
const PEND = 'fw_fr_pending';

const CSS = `
.fr-card{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 14px;padding:13px 14px;border-radius:18px;border:1px solid var(--line);background:linear-gradient(160deg,rgba(124,255,178,.10),rgba(124,255,178,.02));color:var(--text);font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.fr-card:active{transform:scale(.985)}
.fr-card>span{font-size:24px}.fr-card div{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}.fr-card b{font-size:15px}.fr-card small{font-size:12.5px;color:var(--muted)}.fr-card i{font-style:normal;font-size:22px;color:var(--muted)}
.fr-h{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.fr-h h3{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em}.fr-h small{display:block;color:var(--muted);font-size:13px;margin-top:2px}
.fr-h .del{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--bg-2,var(--card-2));color:var(--text);font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer}
.fr-av{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:800;color:#0B1512;background:var(--c,#7CFFB2);letter-spacing:-.01em}
.fr-av.me{box-shadow:0 0 0 2px var(--bg-2,#0B1512),0 0 0 4px var(--accent)}
/* výzva týždňa */
.fr-ch{position:relative;margin:0 0 18px;padding:16px;border-radius:22px;overflow:hidden;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);
  background:radial-gradient(120% 90% at 100% 0%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 60%),var(--card-2)}
.fr-ch-h{display:flex;align-items:center;gap:12px}
.fr-ch-i{flex:none;width:48px;height:48px;border-radius:15px;display:grid;place-items:center;font-size:25px;background:color-mix(in srgb,var(--accent) 20%,transparent)}
.fr-ch-h div{flex:1;min-width:0}.fr-tag{display:inline-block;font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:99px;background:var(--accent);color:var(--accent-ink,#06210f);margin-bottom:4px}
.fr-ch-h b{display:block;font-size:18px;font-weight:800;letter-spacing:-.01em;line-height:1.2}
.fr-ch p{font-size:13.5px;line-height:1.45;margin:12px 0 14px;color:var(--muted)}
.fr-pr{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:14px}
.fr-pr .fr-av{flex:0 0 28px;width:28px;height:28px;font-size:11px}
.fr-pr>span:not(.fr-av){flex:0 0 64px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}.fr-pr.me>span:not(.fr-av){font-weight:800}
.fr-pr i{flex:1;height:10px;border-radius:99px;background:color-mix(in srgb,var(--text) 10%,transparent);overflow:hidden}.fr-pr i b{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 60%,#5BB8FF));transition:width .5s ease}
.fr-pr em{flex:0 0 46px;text-align:right;font-style:normal;font-weight:700;font-variant-numeric:tabular-nums;color:var(--muted)}.fr-pr em.ok{color:var(--accent)}
.fr-team{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
.fr-last{font-size:12.5px;color:var(--muted);line-height:1.45;margin:12px 0 0;padding-top:10px;border-top:1px solid var(--line)}
/* rebríček */
.fr-sec{display:flex;align-items:baseline;justify-content:space-between;margin:4px 2px 10px}.fr-sec b{font-size:17px;font-weight:800}.fr-sec small{font-size:12.5px;color:var(--muted)}
.fr-sub{font-size:13px;color:var(--muted);margin:4px 0 12px;line-height:1.45}
.fr-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;border:1px solid var(--line);background:var(--card-2);margin-bottom:8px}
.fr-row.me{border-color:color-mix(in srgb,var(--accent) 50%,transparent);background:linear-gradient(160deg,color-mix(in srgb,var(--accent) 14%,transparent),transparent),var(--card-2)}
.fr-rk{flex:0 0 24px;text-align:center;font-size:15px;font-weight:800;color:var(--muted);font-variant-numeric:tabular-nums}
.fr-rk.g1{color:#FFC94D}.fr-rk.g2{color:#C9D3DD}.fr-rk.g3{color:#E39A5B}
.fr-n{flex:1;min-width:0}.fr-n b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fr-st{display:flex;gap:10px;margin-top:3px;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}.fr-st span{white-space:nowrap}
.fr-p{flex:0 0 auto;text-align:right;font-size:21px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}.fr-p small{display:block;font-size:11px;font-weight:600;color:var(--muted);margin-top:3px}
.fr-how{margin:2px 2px 0;font-size:12px;color:var(--muted);line-height:1.5}
/* pozvánka */
.fr-box{margin-top:16px;padding:16px;border-radius:22px;border:1px solid var(--line);background:var(--card-2)}
.fr-box>b{display:block;font-size:16px;font-weight:800}.fr-box>small{display:block;color:var(--muted);font-size:13px;line-height:1.4;margin-top:3px}
.fr-codew{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 12px;padding:12px 14px;border-radius:16px;border:1.5px dashed color-mix(in srgb,var(--accent) 45%,var(--line))}
.fr-codew small{color:var(--muted);font-size:12px}
.fr-code{font-family:ui-monospace,Menlo,monospace;font-size:24px;font-weight:800;letter-spacing:.16em;margin:0}
.fr-btns{display:flex;gap:8px;flex-wrap:wrap}.fr-btns button{white-space:nowrap;padding-left:8px;padding-right:8px}
.fr-box .fr-btns #frShare{flex:1 1 100%!important}.fr-box .fr-btns #frCopy,.fr-box .fr-btns #frQr{flex:1 1 calc(50% - 4px)!important;min-width:0}
.fr-join{margin-top:10px;border-radius:18px;border:1px solid var(--line);background:var(--card-2)}
.fr-join summary{list-style:none;cursor:pointer;padding:14px 16px;font-size:14.5px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
.fr-join summary::-webkit-details-marker{display:none}.fr-join summary::after{content:'›';font-size:20px;color:var(--muted);transition:transform .2s}.fr-join[open] summary::after{transform:rotate(90deg)}
.fr-join .fr-add{display:flex;gap:8px;padding:0 16px 16px;align-items:stretch}.fr-join .fr-add button{width:auto;flex:0 0 auto;padding:0 20px}.fr-join .fr-add input{width:0;flex:1 1 0;min-width:0;text-transform:uppercase;letter-spacing:.12em;font-family:ui-monospace,Menlo,monospace}
.fr-note{display:flex;gap:8px;font-size:12px;color:var(--muted);line-height:1.5;margin:14px 2px 0}.fr-note i{font-style:normal}
.fr-empty{text-align:center;padding:20px 12px;border-radius:18px;border:1px dashed var(--line);color:var(--muted);font-size:13.5px;line-height:1.5}.fr-empty b{display:block;font-size:16px;color:var(--text);margin-bottom:4px}
`;

const days = n => (n === 1 ? 'deň' : n >= 2 && n <= 4 ? 'dni' : 'dní');
const trn = n => (n === 1 ? 'tréning' : n >= 2 && n <= 4 ? 'tréningy' : 'tréningov');
const AVC = ['#7CFFB2', '#FFC857', '#FF8FB1', '#8EC5FF', '#C9A7FF', '#FFAE7A', '#7FE3E0'];
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
const avColor = n => { let x = 0; for (const c of String(n || '')) x = (x * 31 + c.charCodeAt(0)) >>> 0; return AVC[x % AVC.length]; };
const firstName = n => String(n || 'Kamarát').trim().split(/\s+/)[0];
const av = (h, name, me) => `<span class="fr-av${me ? ' me' : ''}" style="--c:${avColor(name)}">${h(initials(name))}</span>`;

let cache = null, cacheAt = 0;
async function board(force) {
  if (!force && cache && Date.now() - cacheAt < 30000) return cache;
  const { data, error } = await sb.rpc('friends_board');
  if (error) throw error;
  cache = Array.isArray(data) ? data : []; cacheAt = Date.now();
  return cache;
}

// ---------- týždenná výzva ----------
const CHALLENGES = [
  { id: 'log', icon: '📝', title: 'Zapíš 6 dní', text: 'Zapíš jedlo aspoň v 6 dňoch z 7. Nemusí byť dokonalé, dôležité je vedieť, čo jete.', key: 'logged', goal: 6, unit: 'dní' },
  { id: 'prot', icon: '💪', title: 'Bielkovinový týždeň', text: 'Dosiahni aspoň 90 % denného cieľa bielkovín v 5 dňoch.', key: 'prot', goal: 5, unit: 'dní' },
  { id: 'trn', icon: '🏋️', title: 'Tréningový týždeň', text: 'Odcvič 3 tréningy v tomto týždni.', key: 'workouts', goal: 3, unit: 'tréningov' },
  { id: 'tgt', icon: '🎯', title: 'Presný týždeň', text: 'Buď v cieli kalórií (85 až 110 %) aspoň 4 dni. Počítajú sa dokončené dni, dnešok až zajtra.', key: 'ontarget', goal: 4, unit: 'dní' },
  { id: 'team', icon: '🤝', title: 'Spolu to dáme', text: 'Spoločný cieľ: dokopy 3 tréningy na každého z vás. Každý tréning sa počíta.', key: 'workouts', goal: 3, unit: 'tréningov', team: true },
  { id: 'perf', icon: '⭐', title: 'Dokonalé dni', text: 'Kalórie v cieli a bielkoviny splnené v 3 dňoch. Počítajú sa dokončené dni.', key: 'perfect', goal: 3, unit: 'dní' },
];
const parseDay = d => { const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, dd); };
const challengeFor = ws => CHALLENGES[Math.floor(parseDay(ws) / 86400000 / 7) % CHALLENGES.length];
let chCache = null, chAt = 0;
async function challengeData(force) {
  if (!force && chCache && Date.now() - chAt < 30000) return chCache;
  const [cur, prev] = await Promise.all([sb.rpc('friends_challenge', { p_offset: 0 }), sb.rpc('friends_challenge', { p_offset: 1 })]);
  if (cur.error) throw cur.error;
  chCache = { cur: cur.data, prev: prev.error ? null : prev.data }; chAt = Date.now();
  return chCache;
}
const leftTxt = n => (n <= 1 ? 'Dnes je posledný deň' : `Zostáva ${n} ${days(n)}`);
function challengeHtml(d, h) {
  const rows = d?.cur?.rows || [];
  if (!d?.cur?.week_start || !rows.length) return '';
  const ch = challengeFor(d.cur.week_start);
  const left = Math.round((parseDay(d.cur.week_end) - parseDay(d.cur.today)) / 86400000) + 1;
  const goal = ch.goal;
  const bar = (name, val, g, me, full) => `<div class="fr-pr${me ? ' me' : ''}">${full !== false ? av(h, full || name, me) : ''}<span>${h(name)}</span><i><b style="width:${Math.min(100, g ? val / g * 100 : 0)}%"></b></i><em class="${val >= g ? 'ok' : ''}">${val >= g ? '✓ ' : ''}${val}/${g}</em></div>`;
  const sorted = rows.slice().sort((a, b) => (b[ch.key] - a[ch.key]) || (b.me - a.me) || String(a.name).localeCompare(String(b.name)));
  const solo = rows.length === 1;
  let body;
  if (ch.team) {
    const tot = rows.reduce((a, r) => a + (r[ch.key] || 0), 0), tg = goal * rows.length;
    body = sorted.map(r => bar(r.me ? 'Ty' : firstName(r.name), r[ch.key] || 0, goal, r.me, r.name || 'Ty')).join('')
      + `<div class="fr-team">${bar('Spolu', tot, tg, false, false)}</div>`;
  } else {
    body = sorted.map(r => bar(r.me ? 'Ty' : firstName(r.name), r[ch.key] || 0, goal, r.me, r.name || 'Ty')).join('');
  }
  let last = '';
  if (d.prev?.week_start && (d.prev.rows || []).length) {
    const pc = challengeFor(d.prev.week_start), pr = d.prev.rows;
    const ok = pc.team ? (pr.reduce((a, r) => a + (r[pc.key] || 0), 0) >= pc.goal * pr.length ? pr : []) : pr.filter(r => (r[pc.key] || 0) >= pc.goal);
    const any = pr.some(r => (r.logged || 0) > 0 || (r.workouts || 0) > 0);
    if (any) {
      const names = ok.map(r => (r.me ? 'ty' : (r.name || 'kamarát')));
      last = `<p class="fr-last">Minulý týždeň (${h(pc.title)}): ${pc.team ? (ok.length ? 'splnili ste to spolu ✓' : 'spoločný cieľ ste nedali') : (names.length ? 'splnil' + (names.length > 1 ? 'i' : '') + ' ' + names.map(h).join(', ') : 'nikto to nedotiahol')}.</p>`;
    }
  }
  return `<div class="fr-ch"><div class="fr-ch-h"><span class="fr-ch-i">${ch.icon}</span><div><span class="fr-tag">Výzva týždňa · ${leftTxt(left).toLowerCase()}</span><b>${h(ch.title)}</b></div></div>
    <p>${h(ch.text)}${solo ? ' Pozvi kamaráta a pretekajte sa.' : ''}</p>${body}${last}</div>`;
}

function linkFor(code) { return `${location.origin}${location.pathname}#/kamarat/${code}`; }

async function openFriends() {
  const h = (...a) => ctx.h(...a);
  const me = ctx.state?.profile;
  if (!me) return;
  let code = me.friend_code || '';
  if (!code) { try { const { data } = await sb.from('profiles').select('friend_code').eq('id', me.id).maybeSingle(); code = data?.friend_code || ''; me.friend_code = code; } catch (_) { /* bez kódu */ } }
  const bg = ctx.sheet('<div class="fr-h"><div><h3>Kamaráti</h3><small>Týždenná výzva a rebríček s ľuďmi, ktorých poznáš</small></div><button class="del" data-x aria-label="Zavrieť">×</button></div><div id="frBody"><p class="fr-sub">Načítavam…</p></div>');
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  const body = bg.querySelector('#frBody');
  const draw = async (force) => {
    let rows = [], chd = null;
    try { [rows, chd] = await Promise.all([board(force), challengeData(force).catch(() => null)]); } catch (e) { body.innerHTML = '<p class="fr-sub">Tabuľku sa nepodarilo načítať. Skús to o chvíľu.</p>'; return; }
    const others = rows.filter(r => !r.me).length;
    body.innerHTML = `${challengeHtml(chd, h)}
      <div class="fr-sec"><b>Rebríček</b><small>posledných 7 dní</small></div>
      ${others ? rows.map((r, i) => `<div class="fr-row${r.me ? ' me' : ''}"><div class="fr-rk${i < 3 ? ' g' + (i + 1) : ''}">${i + 1}</div>${av(h, r.name || 'Ty', r.me)}
        <div class="fr-n"><b>${h(r.name || 'Kamarát')}${r.me ? ' (ty)' : ''}</b><div class="fr-st"><span>📝 ${r.logged} ${days(r.logged)}</span><span>🎯 ${r.ontarget} v cieli</span><span>🏋️ ${r.workouts}</span></div></div>
        <div class="fr-p">${r.points}<small>bodov</small></div></div>`).join('') + '<p class="fr-how">Body: 10 za deň so zápisom, 10 za deň v cieli kalórií, 10 za deň s bielkovinami, 20 za tréning.</p>'
        : `<div class="fr-empty"><b>Zatiaľ si tu sám</b>Pozvi kamaráta. Keď zadá tvoj kód alebo otvorí odkaz, uvidíte sa navzájom v rebríčku.</div>`}
      <div class="fr-box"><b>Pozvi kamaráta</b><small>Pošli mu odkaz. Po registrácii sa pridá k tebe automaticky.</small>
        <div class="fr-codew"><small>Tvoj kód</small><div class="fr-code">${h(code || '…')}</div></div>
        <div class="fr-btns"><button class="btn primary" id="frShare">Poslať pozvánku</button><button class="btn ghost" id="frCopy">Kopírovať kód</button></div></div>
      <details class="fr-join"><summary>Mám kód od kamaráta</summary>
        <div class="fr-add"><input class="input" id="frIn" maxlength="6" placeholder="ABC123" autocapitalize="characters" autocomplete="off"><button class="btn primary" id="frAdd">Pridať</button></div></details>
      <p class="fr-note"><i>🔒</i><span>Kamaráti vidia len počty dní so zápisom, dní v cieli a tréningov. Nikdy nevidia tvoje kalórie, jedlá ani váhu.</span></p>`;
    const text = `Pridaj sa a porovnajme sa v GainTrain. Každý týždeň uvidíme, kto zapisoval, trafil kalórie a trénoval viac. Odkaz: ${linkFor(code)} (kód ${code})`;
    body.querySelector('#frShare').onclick = async () => {
      try {
        if (navigator.share) await navigator.share({ title: 'GainTrain', text });
        else { await navigator.clipboard.writeText(text); ctx.toast('Pozvánka skopírovaná'); }
      } catch (e) { if (e?.name !== 'AbortError') ctx.toast('Nepodarilo sa odoslať', true); }
    };
    body.querySelector('#frCopy').onclick = async () => {
      try { await navigator.clipboard.writeText(code); ctx.toast('Kód skopírovaný'); } catch (_) { ctx.toast(code); }
    };
    const add = async () => {
      const v = body.querySelector('#frIn').value.trim();
      if (v.length < 6) return ctx.toast('Kód má 6 znakov', true);
      const btn = body.querySelector('#frAdd'); btn.disabled = true;
      try { await addByCode(v); await draw(true); } catch (e) { ctx.toast(e.message || 'Nepodarilo sa pridať', true); btn.disabled = false; }
    };
    body.querySelector('#frAdd').onclick = add;
    body.querySelector('#frIn').onkeydown = e => { if (e.key === 'Enter') add(); };
  };
  await draw(true);
}

try { window.fwFriends = () => openFriends(); } catch (_) { }

async function addByCode(code) {
  const { data, error } = await sb.rpc('add_friend', { p_code: code });
  if (error) throw new Error(error.message || 'Nepodarilo sa pridať');
  cache = null;
  ctx.toast(`${data?.name || 'Kamarát'} je v tvojej tabuľke`);
  return data;
}

// ---------- pozvánkový odkaz #/kamarat/KÓD ----------
function grabInvite() {
  const m = /^#\/kamarat\/([A-Za-z0-9]{6})\b/.exec(location.hash || '');
  if (!m) return;
  ls.set(PEND, m[1].toUpperCase());
  history.replaceState(null, '', location.pathname + '#/');
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

let pendBusy = false;
async function processInvite() {
  const code = ls.get(PEND);
  if (!code || pendBusy || !ctx.state?.profile?.onboarded) return;
  pendBusy = true; ls.del(PEND);
  try { await addByCode(code); setTimeout(openFriends, 400); }
  catch (e) { ctx.toast(e.message || 'Pozvánku sa nepodarilo prijať', true); }
  finally { pendBusy = false; }
}

// ---------- karta na obrazovke Dnes ----------
if (typeof document !== 'undefined') {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  grabInvite();
  const root = document.getElementById('app');
  const seen = new WeakSet();
  const inject = async () => {
    processInvite();
    if (!root || !ctx.state?.profile?.onboarded) return;
    const meals = root.querySelector('.screen.td .meals');
    if (!meals || seen.has(meals) || root.querySelector('#fw-friends')) return;
    seen.add(meals);
    const b = document.createElement('button'); b.id = 'fw-friends'; b.className = 'fr-card';
    b.innerHTML = '<span>👥</span><div><b>Kamaráti</b><small>Pridaj sa a porovnajme sa: pošli pozvánku</small></div><i>›</i>';
    b.onclick = openFriends;
    meals.after(b);
    try {
      const [rows, chd] = await Promise.all([board(false), challengeData(false).catch(() => null)]);
      const others = rows.filter(r => !r.me).length;
      const cm = chd?.cur?.week_start ? (() => { const ch = challengeFor(chd.cur.week_start), mine = (chd.cur.rows || []).find(r => r.me); return mine ? `${ch.title}: ${Math.min(mine[ch.key] || 0, ch.goal)}/${ch.goal}` : ''; })() : '';
      if (b.isConnected) {
        const mine = rows.find(r => r.me), pos = rows.findIndex(r => r.me) + 1;
        const base = others ? `${pos}. miesto z ${rows.length} · ${mine?.points || 0} bodov` : 'Pridaj sa a porovnajme sa: pošli pozvánku';
        b.querySelector('b').textContent = 'Kamaráti';
        b.querySelector('small').textContent = cm ? (others ? `${pos}. miesto z ${rows.length} · výzva ${cm}` : `Výzva týždňa ${cm} · pozvi kamaráta`) : base;
      }
    } catch (_) { /* karta ostane s výzvou */ }
  };
  if (root) new MutationObserver(() => inject()).observe(root, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => { if (/^#\/kamarat\//.test(location.hash)) grabInvite(); });
}
