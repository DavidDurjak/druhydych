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
.fr-h{display:flex;align-items:center;justify-content:space-between}.fr-h h3{margin:0;font-size:19px}
.fr-ch{margin:0 0 14px;padding:14px;border-radius:18px;border:1px solid rgba(124,255,178,.35);background:linear-gradient(160deg,rgba(124,255,178,.12),rgba(124,255,178,.02))}
.fr-ch-h{display:flex;align-items:center;gap:12px}.fr-ch-i{font-size:28px;line-height:1}.fr-ch-h div{flex:1;min-width:0}.fr-ch-h b{display:block;font-size:16px}.fr-ch-h small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.fr-ch p{font-size:13px;line-height:1.45;margin:10px 0 12px;color:var(--text)}
.fr-pr{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:13.5px}.fr-pr>span{flex:0 0 74px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fr-pr.me>span{font-weight:700}
.fr-pr i{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.09);overflow:hidden}.fr-pr i b{display:block;height:100%;border-radius:4px;background:var(--accent);transition:width .4s ease}
.fr-pr em{flex:0 0 52px;text-align:right;font-style:normal;font-variant-numeric:tabular-nums;color:var(--muted)}.fr-pr em.ok{color:var(--accent);font-weight:700}
.fr-team{margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}.fr-team .fr-pr i{height:10px}
.fr-last{font-size:12.5px;color:var(--muted);line-height:1.45;margin:10px 0 0}
.fr-sub{font-size:13px;color:var(--muted);margin:4px 0 12px;line-height:1.45}
.fr-row{display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;border:1px solid var(--line);background:var(--card-2);margin-bottom:8px}
.fr-row.me{border-color:rgba(124,255,178,.45);background:linear-gradient(160deg,rgba(124,255,178,.12),rgba(124,255,178,.03))}
.fr-rk{flex:0 0 30px;text-align:center;font-size:20px;font-weight:800;color:var(--muted)}
.fr-n{flex:1;min-width:0}.fr-n b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fr-n small{display:block;font-size:12px;color:var(--muted);margin-top:2px;line-height:1.35}
.fr-p{flex:0 0 auto;text-align:right;font-size:20px;font-weight:800;line-height:1}.fr-p small{display:block;font-size:11px;font-weight:600;color:var(--muted);margin-top:3px}
.fr-box{margin-top:14px;padding:14px;border-radius:16px;border:1px solid var(--line);background:var(--card-2)}
.fr-code{font-family:ui-monospace,Menlo,monospace;font-size:26px;font-weight:800;letter-spacing:.14em;margin:2px 0 10px}
.fr-btns{display:flex;gap:8px}.fr-btns button{flex:1 1 0;white-space:nowrap;padding-left:8px;padding-right:8px}.fr-btns .primary{flex:1.35 1 0}
.fr-box .fr-add{display:flex;gap:8px;margin-top:8px;align-items:stretch}.fr-box .fr-add button{width:auto;flex:0 0 auto;padding:0 20px}.fr-box .fr-add input{width:0;flex:1 1 0;min-width:0;text-transform:uppercase;letter-spacing:.12em;font-family:ui-monospace,Menlo,monospace}
.fr-note{font-size:12px;color:var(--muted);line-height:1.5;margin:12px 2px 0}
.fr-empty{text-align:center;padding:18px 8px 6px;color:var(--muted);font-size:14px;line-height:1.5}.fr-empty b{display:block;font-size:17px;color:var(--text);margin-bottom:4px}
`;

const days = n => (n === 1 ? 'deň' : n >= 2 && n <= 4 ? 'dni' : 'dní');
const trn = n => (n === 1 ? 'tréning' : n >= 2 && n <= 4 ? 'tréningy' : 'tréningov');
const medal = i => ['🥇', '🥈', '🥉'][i] || String(i + 1) + '.';

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
  const bar = (name, val, g, me) => `<div class="fr-pr${me ? ' me' : ''}"><span>${h(name)}</span><i><b style="width:${Math.min(100, g ? val / g * 100 : 0)}%"></b></i><em class="${val >= g ? 'ok' : ''}">${val >= g ? '✓ ' : ''}${val}/${g}</em></div>`;
  const sorted = rows.slice().sort((a, b) => (b[ch.key] - a[ch.key]) || (b.me - a.me) || String(a.name).localeCompare(String(b.name)));
  const solo = rows.length === 1;
  let body;
  if (ch.team) {
    const tot = rows.reduce((a, r) => a + (r[ch.key] || 0), 0), tg = goal * rows.length;
    body = sorted.map(r => bar(r.me ? 'Ty' : (r.name || 'Kamarát'), r[ch.key] || 0, goal, r.me)).join('')
      + `<div class="fr-team">${bar('Spolu', tot, tg, false)}</div>`;
  } else {
    body = sorted.map(r => bar(r.me ? 'Ty' : (r.name || 'Kamarát'), r[ch.key] || 0, goal, r.me)).join('');
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
  return `<div class="fr-ch"><div class="fr-ch-h"><span class="fr-ch-i">${ch.icon}</span><div><b>Výzva týždňa: ${h(ch.title)}</b><small>${leftTxt(left)}${solo ? ' · pozvi kamaráta a pretekajte sa' : ''}</small></div></div>
    <p>${h(ch.text)}</p>${body}${last}</div>`;
}

function linkFor(code) { return `${location.origin}${location.pathname}#/kamarat/${code}`; }

async function openFriends() {
  const h = (...a) => ctx.h(...a);
  const me = ctx.state?.profile;
  if (!me) return;
  let code = me.friend_code || '';
  if (!code) { try { const { data } = await sb.from('profiles').select('friend_code').eq('id', me.id).maybeSingle(); code = data?.friend_code || ''; me.friend_code = code; } catch (_) { /* bez kódu */ } }
  const bg = ctx.sheet('<div id="frBody"><p class="fr-sub">Načítavam…</p></div>');
  const body = bg.querySelector('#frBody');
  const draw = async (force) => {
    let rows = [], chd = null;
    try { [rows, chd] = await Promise.all([board(force), challengeData(force).catch(() => null)]); } catch (e) { body.innerHTML = '<p class="fr-sub">Tabuľku sa nepodarilo načítať. Skús to o chvíľu.</p>'; return; }
    const others = rows.filter(r => !r.me).length;
    body.innerHTML = `<div class="fr-h"><h3>👥 Kamaráti</h3><button class="del" data-x aria-label="Zavrieť">×</button></div>
      ${challengeHtml(chd, h)}
      <p class="fr-sub">Posledných 7 dní. Body: 10 za deň so zápisom, 10 za deň v cieli kalórií, 10 za deň s bielkovinami a 20 za tréning.</p>
      ${others ? rows.map((r, i) => `<div class="fr-row${r.me ? ' me' : ''}"><div class="fr-rk">${medal(i)}</div>
        <div class="fr-n"><b>${h(r.name || 'Kamarát')}${r.me ? ' (ty)' : ''}</b><small>${r.logged} ${days(r.logged)} zápisu · ${r.ontarget} v cieli · ${r.workouts} ${trn(r.workouts)}</small></div>
        <div class="fr-p">${r.points}<small>bodov</small></div></div>`).join('')
        : `<div class="fr-empty"><b>Zatiaľ si tu sám</b>Pozvi kamaráta. Keď zadá tvoj kód alebo otvorí odkaz, uvidíte sa navzájom v tabuľke.</div>`}
      <div class="fr-box"><small class="muted">Tvoj kód</small><div class="fr-code">${h(code || '…')}</div>
        <div class="fr-btns"><button class="btn primary" id="frShare">Poslať pozvánku</button><button class="btn ghost" id="frCopy">Kopírovať kód</button></div></div>
      <div class="fr-box"><b style="font-size:14px">Mám kód od kamaráta</b>
        <div class="fr-add"><input class="input" id="frIn" maxlength="6" placeholder="ABC123" autocapitalize="characters" autocomplete="off"><button class="btn primary" id="frAdd">Pridať</button></div></div>
      <p class="fr-note">Kamaráti vidia len počty dní so zápisom, dní v cieli a tréningov. Nikdy nevidia tvoje kalórie, jedlá ani váhu.</p>`;
    body.querySelector('[data-x]').onclick = () => bg.remove();
    const text = `Poď súťažiť so mnou vo Fuelwind. Môj kód: ${code}. Pridaj sa tu: ${linkFor(code)}`;
    body.querySelector('#frShare').onclick = async () => {
      try {
        if (navigator.share) await navigator.share({ title: 'Fuelwind', text });
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
    b.innerHTML = '<span>👥</span><div><b>Kamaráti</b><small>Pozvi kamaráta a porovnávajte týždeň</small></div><i>›</i>';
    b.onclick = openFriends;
    meals.after(b);
    try {
      const [rows, chd] = await Promise.all([board(false), challengeData(false).catch(() => null)]);
      const others = rows.filter(r => !r.me).length;
      const cm = chd?.cur?.week_start ? (() => { const ch = challengeFor(chd.cur.week_start), mine = (chd.cur.rows || []).find(r => r.me); return mine ? `${ch.title}: ${Math.min(mine[ch.key] || 0, ch.goal)}/${ch.goal}` : ''; })() : '';
      if (b.isConnected) {
        const mine = rows.find(r => r.me), pos = rows.findIndex(r => r.me) + 1;
        const base = others ? `${pos}. miesto z ${rows.length} · ${mine?.points || 0} bodov` : 'Pozvi kamaráta a porovnávajte týždeň';
        b.querySelector('b').textContent = cm ? 'Výzva týždňa' : 'Kamaráti';
        b.querySelector('small').textContent = cm ? (others ? `${cm} · ${pos}. miesto z ${rows.length}` : cm) : base;
      }
    } catch (_) { /* karta ostane s výzvou */ }
  };
  if (root) new MutationObserver(() => inject()).observe(root, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => { if (/^#\/kamarat\//.test(location.hash)) grabInvite(); });
}
