// AI pomocník a kouč: plávajúce tlačidlo s postavičkou, ktorú si človek pomenuje a nastaví, a chat.
// Samo sa vloží do appky (bez zásahu do app.js). Odpovede robí edge funkcia coach-chat.
import * as db from './data.js';
import { ctx } from './app.js';
import { avatarSvg, norm, randomBuddy, ARMOR, GLOW, SKIN, HAIRC, BGC, ARCH, SHOULDERS, CRESTS, EMBLEMS, MARKS, BGS, FRAMES, PRESETS } from './avatars.js';

const root = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
export { avatarSvg };

const buddy = () => norm(ctx.state?.profile?.buddy);
let curAv = '', fab = null, panel = null, busy = false, opened = false;

function showFab() {
  const on = !!root.querySelector('.nav') && !!ctx.state?.profile;
  if (on && !fab) {
    fab = document.createElement('button');
    fab.className = 'bd-fab'; fab.setAttribute('aria-label', 'Otvoriť pomocníka');
    fab.onclick = openChat;
    document.body.appendChild(fab);
  }
  if (fab) {
    fab.style.display = on ? '' : 'none';
    const key = JSON.stringify(buddy());
    if (fab.dataset.sig !== key) { fab.dataset.sig = key; fab.innerHTML = avatarSvg(buddy(), 64, { anim: true }); }
  }
}

async function api(body) {
  const { data, error } = await db.sb.functions.invoke('coach-chat', { body });
  if (error) {
    let msg = 'Pomocník teraz neodpovedal. Skús to o chvíľu.';
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* ostatné */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function bubble(role, text, extra = {}) {
  if (!panel) return null;
  const log = panel.querySelector('.bd-log');
  const el = document.createElement('div');
  el.className = 'bd-m ' + role;
  el.innerHTML = (role.startsWith('coach') ? `<div class="bd-mav">${curAv}</div>` : '') + `<div class="bd-t">${fmt(text)}</div>`;
  if (role === 'coach' && extra.id) {
    const r = document.createElement('div'); r.className = 'bd-rate';
    r.innerHTML = '<button data-v="1" aria-label="Pomohlo">👍</button><button data-v="-1" aria-label="Nepomohlo">👎</button>';
    r.querySelectorAll('button').forEach(b => b.onclick = async () => {
      r.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      try { await db.sb.from('coach_msgs').update({ rating: Number(b.dataset.v) }).eq('id', extra.id); } catch (_) { /* hodnotenie je bonus */ }
    });
    el.appendChild(r);
  }
  if (extra.action) {
    const a = document.createElement('button'); a.className = 'bd-act'; a.textContent = extra.action.label;
    a.onclick = () => { closeChat(); location.hash = extra.action.route; };
    el.appendChild(a);
  }
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}
function setChips(chips) {
  if (!panel) return;
  const box = panel.querySelector('.bd-chips');
  box.innerHTML = (chips || []).map(c => `<button>${esc(c)}</button>`).join('');
  box.querySelectorAll('button').forEach(b => b.onclick = () => send(b.textContent));
}
function typing(on) {
  if (!panel) return;
  panel.querySelector('.bd-typing')?.remove();
  if (!on) return;
  const t = document.createElement('div'); t.className = 'bd-m coach bd-typing'; t.innerHTML = `<div class="bd-mav">${curAv}</div><div class="bd-t"><i></i><i></i><i></i></div>`;
  const log = panel.querySelector('.bd-log'); log.appendChild(t); log.scrollTop = log.scrollHeight;
}

async function send(text) {
  text = String(text || '').trim();
  if (!text || busy || !panel) return;
  busy = true;
  const inp = panel.querySelector('.bd-in'); inp.value = ''; inp.style.height = '';
  setChips([]); bubble('me', text); typing(true);
  try {
    const r = await api({ mode: 'chat', message: text });
    typing(false); bubble('coach', r.reply, { id: r.id, action: r.action }); setChips(r.chips);
  } catch (e) {
    typing(false); bubble('coach err', e.message);
  } finally { busy = false; }
}

const TABS = [['a', 'Postava'], ['glow', 'Žiara'], ['gear', 'Výzbroj'], ['bg', 'Pozadie']];
// každý typ má vlastný základný vzhľad; jazva, znak a ozdoba sa pridávajú len ručne
const LOOK = { spartan: { cr: 'plume' }, samurai: { cr: 'horns' }, cyborg: { cr: 'fin' }, viking: { cr: 'horns' } };
const base = a => ({ cr: 'none', mk: 'none', em: 'none', ...(LOOK[a] || {}) });
const rnd = nm => { const r = randomBuddy(nm); r.mk = Math.random() < 0.2 ? r.mk : 'none'; r.em = Math.random() < 0.5 ? r.em : 'none'; if (Math.random() < 0.7) r.cr = base(r.a).cr; return r; };
const VB = { top: '10 0 80 60', chest: '0 52 100 48', body: '0 36 100 64', face: '14 14 72 72', full: '0 0 100 100' };

function setup(first) {
  const sheet = panel.querySelector('.bd-body');
  let st = first ? norm({ ...PRESETS[0], name: 'Dych' }) : norm(ctx.state.profile.buddy);
  let tab = 'a', keep = 0;
  const tile = (key, id, label, over, vb, size = 60) => `<button class="bd-tile ${st[key] === id ? 'on' : ''}" data-k="${key}" data-v="${id}"><span>${avatarSvg({ ...st, ...over }, size, { vb })}</span><i>${label}</i></button>`;
  const dots = (key, list) => `<div class="bd-row">${list.map((c, i) => `<button class="bd-dot ${st[key] === i ? 'on' : ''}" data-k="${key}" data-v="${i}" data-n="1" style="background:${c}" aria-label="Farba ${i + 1}"></button>`).join('')}</div>`;
  const group = (title, body) => `<div class="bd-g"><div class="bd-gt">${title}</div>${body}</div>`;
  const grid = (key, list, over, vb) => `<div class="bd-grid">${list.map(([id, l]) => tile(key, id, l, { [key]: id, ...(over || {}) }, vb)).join('')}</div>`;
  const panes = {
    a: () => group('Kto to bude', `<div class="bd-grid">${ARCH.map(([id, l]) => tile('a', id, l, { a: id, ...base(id) }, VB.full)).join('')}</div>`) + group('Farba panciera', dots('c', ARMOR))
      + (st.a === 'viking' ? group('Pleť', dots('sk', SKIN)) + group('Brada', dots('hc', HAIRC)) : ''),
    glow: () => group('Farba žiary (oči, línie, aura)', dots('g', GLOW)) + group('Znamenie', grid('mk', MARKS, { cr: 'none', em: 'none', fr: 'none' }, VB.face)),
    gear: () => group('Ramená', grid('sh', SHOULDERS, { cr: 'none', em: 'none', mk: 'none', fr: 'none' }, VB.body)) + group('Ozdoba hlavy', grid('cr', CRESTS, { em: 'none', mk: 'none', fr: 'none' }, VB.top)) + group('Znak na hrudi', grid('em', EMBLEMS, { cr: 'none', mk: 'none', fr: 'none' }, VB.chest)),
    bg: () => group('Pozadie', grid('bs', BGS, { cr: 'none', em: 'none' }, VB.full)) + group('Farba pozadia', dots('bg', BGC)) + group('Rám', grid('fr', FRAMES, { cr: 'none', em: 'none' }, VB.full)),
  };
  const draw = () => {
    const name = sheet.querySelector('.bd-name')?.value ?? st.name;
    st.name = name;
    sheet.innerHTML = `<div class="bd-setup">
      <div class="bd-top"><div class="bd-prev">${avatarSvg(st, 118, { anim: true })}</div>
        <div class="bd-tc"><label class="bd-l">Meno pomocníka<input class="bd-name" maxlength="20" value="${esc(st.name)}" placeholder="Dych"></label>
        <button class="bd-rnd" type="button">🎲 Náhodná postavička</button></div></div>
      <div class="bd-pre"><span>Hotové postavy</span><div class="bd-prs">${PRESETS.map((p, i) => `<button data-p="${i}" aria-label="${esc(p.n)}"><span>${avatarSvg(norm(p), 50)}</span><i>${esc(p.n)}</i></button>`).join('')}</div></div>
      <div class="bd-tabs" role="tablist">${TABS.map(([id, l]) => `<button role="tab" class="${tab === id ? 'on' : ''}" data-tab="${id}">${l}</button>`).join('')}</div>
      <div class="bd-pane">${panes[tab]()}</div>
      <div class="bd-foot"><button class="bd-save">${first ? 'Hotovo, poďme na to' : 'Uložiť'}</button></div>
    </div>`;
    sheet.querySelector('.bd-pane').scrollTop = keep;
    sheet.querySelectorAll('[data-k]').forEach(el => el.onclick = () => {
      keep = sheet.querySelector('.bd-pane').scrollTop;
      const k = el.dataset.k, v = el.dataset.n ? Number(el.dataset.v) : el.dataset.v;
      st[k] = v; if (k === 'a') Object.assign(st, base(v)); draw();
    });
    sheet.querySelectorAll('[data-tab]').forEach(el => el.onclick = () => { st.name = sheet.querySelector('.bd-name').value; tab = el.dataset.tab; keep = 0; draw(); });
    sheet.querySelectorAll('[data-p]').forEach(el => el.onclick = () => { const p = PRESETS[Number(el.dataset.p)]; const nm = sheet.querySelector('.bd-name').value; st = norm({ ...p, name: nm || p.n }); keep = 0; draw(); });
    sheet.querySelector('.bd-rnd').onclick = () => { const nm = sheet.querySelector('.bd-name').value; st = rnd(nm); keep = 0; draw(); };
    sheet.querySelector('.bd-save').onclick = async () => {
      st.name = (sheet.querySelector('.bd-name').value.trim() || 'Dych').slice(0, 20);
      const { error } = await db.sb.from('profiles').update({ buddy: st }).eq('id', ctx.state.profile.id);
      if (error) { ctx.toast(error.message, true); return; }
      ctx.state.profile.buddy = st; showFab(); renderChat();
    };
  };
  draw();
}

// ---------- história rozhovorov: každý deň zvlášť, dá sa vrátiť aj k starším ----------
const dkey = d => new Date(d).toLocaleDateString('sv-SE');
function dayLabel(iso) {
  const k = dkey(iso), now = new Date();
  if (k === dkey(now)) return 'Dnes';
  if (k === dkey(new Date(now.getTime() - 864e5))) return 'Včera';
  return new Date(iso).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'numeric' });
}
const nMsg = n => `${n} ${n === 1 ? 'správa' : n < 5 ? 'správy' : 'správ'}`;
function daySep(label) {
  const log = panel?.querySelector('.bd-log'); if (!log) return;
  const d = document.createElement('div'); d.className = 'bd-day'; d.textContent = label; log.appendChild(d);
}
async function openHistory() {
  if (!panel) return;
  const body = panel.querySelector('.bd-body');
  body.innerHTML = '<div class="bd-hist"><p class="bd-hm">Načítavam...</p></div>';
  const { data, error } = await db.sb.from('coach_msgs').select('role,content,created_at').eq('user_id', ctx.state.profile.id).order('created_at', { ascending: false }).limit(600);
  if (!panel) return;
  const back = () => renderChat();
  if (error || !(data || []).length) {
    body.innerHTML = `<div class="bd-hist"><button class="bd-hback">← Späť na chat</button><p class="bd-hm">${error ? 'História sa nenačítala. Skús to znova.' : 'Zatiaľ tu nie sú žiadne rozhovory. Napíš pomocníkovi a uložia sa sem.'}</p></div>`;
    body.querySelector('.bd-hback').onclick = back; return;
  }
  const days = new Map();
  data.slice().reverse().forEach(m => { const k = dkey(m.created_at); if (!days.has(k)) days.set(k, []); days.get(k).push(m); });
  const keys = [...days.keys()].reverse();
  const list = () => {
    body.innerHTML = `<div class="bd-hist"><button class="bd-hback">← Späť na chat</button><div class="bd-hl">${keys.map(k => {
      const ms = days.get(k), first = ms.find(x => x.role === 'user') || ms[0];
      return `<button class="bd-hr" data-d="${k}"><b>${esc(dayLabel(ms[0].created_at))}</b><span>${esc(String(first.content).slice(0, 80))}</span><i>${nMsg(ms.length)}</i></button>`;
    }).join('')}</div></div>`;
    body.querySelector('.bd-hback').onclick = back;
    body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => show(b.dataset.d));
  };
  const show = k => {
    const ms = days.get(k);
    body.innerHTML = `<div class="bd-hbar"><button class="bd-hback">← História</button><b>${esc(dayLabel(ms[0].created_at))}</b></div><div class="bd-log"></div><div class="bd-hfoot"><button class="bd-hcont">Pokračovať v chate</button></div>`;
    body.querySelector('.bd-hback').onclick = list;
    body.querySelector('.bd-hcont').onclick = back;
    ms.forEach(m => bubble(m.role === 'user' ? 'me' : 'coach', m.content));
    const log = body.querySelector('.bd-log'); log.scrollTop = 0;
  };
  list();
}

async function renderChat() {
  const b = buddy();
  curAv = avatarSvg(b, 34, { anim: true });
  panel.querySelector('.bd-head').innerHTML = `${avatarSvg(b, 44, { anim: true })}<div class="bd-hn"><b>${esc(b.name)}</b><span>tvoj pomocník a kouč</span></div><button class="bd-hbtn" aria-label="História rozhovorov" title="História rozhovorov">🕘</button><button class="bd-edit" aria-label="Upraviť postavičku">✎</button><button class="bd-x" aria-label="Zavrieť">×</button>`;
  panel.querySelector('.bd-x').onclick = closeChat;
  panel.querySelector('.bd-edit').onclick = () => setup(false);
  panel.querySelector('.bd-hbtn').onclick = openHistory;
  panel.querySelector('.bd-body').innerHTML = `<div class="bd-log"></div><div class="bd-chips"></div>
    <form class="bd-form"><textarea class="bd-in" rows="1" maxlength="1000" placeholder="Napíš, s čím ti mám pomôcť"></textarea><button class="bd-send" aria-label="Poslať">➤</button></form>`;
  const inp = panel.querySelector('.bd-in');
  inp.oninput = () => { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; };
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(inp.value); } };
  panel.querySelector('.bd-form').onsubmit = e => { e.preventDefault(); send(inp.value); };
  // história
  const { data } = await db.sb.from('coach_msgs').select('id,role,kind,content,meta,created_at').eq('user_id', ctx.state.profile.id).order('created_at', { ascending: false }).limit(30);
  if (!panel) return;
  let prevDay = '';
  (data || []).reverse().forEach(m => {
    const k = dkey(m.created_at);
    if (k !== prevDay) { daySep(dayLabel(m.created_at)); prevDay = k; }
    bubble(m.role === 'user' ? 'me' : 'coach', m.content, m.role === 'coach' ? { id: m.id, action: m.meta?.action } : {});
  });
  // ranná správa, ak ešte nie je
  typing(true);
  try {
    const r = await api({ mode: 'opener' });
    typing(false);
    const last = data && data[data.length - 1];
    if (!(last && last.id === r.id)) { if (prevDay !== dkey(new Date())) daySep('Dnes'); bubble('coach', r.reply, { id: r.id, action: r.action }); }
    setChips(r.chips);
  } catch (e) {
    typing(false);
    if (!(data || []).length) bubble('coach', `Ahoj, som ${b.name}. Pomôžem ti s appkou, jedlom aj tréningom. Napíš mi, čo potrebuješ.`);
    setChips(['Ako zapíšem jedlo?', 'Aký tréning mi sedí?', 'Koľko bielkovín mám jesť?']);
  }
}

function openChat() {
  if (panel) return;
  opened = true;
  panel = document.createElement('div');
  panel.className = 'bd-panel';
  panel.innerHTML = '<div class="bd-card" role="dialog" aria-label="Pomocník"><div class="bd-head"></div><div class="bd-body"></div></div>';
  panel.addEventListener('click', e => { if (e.target === panel) closeChat(); });
  document.body.appendChild(panel);
  document.body.classList.add('bd-open');
  if (!ctx.state.profile.buddy) {
    panel.querySelector('.bd-head').innerHTML = `<div class="bd-hn"><b>Zoznámte sa</b><span>vyber si pomocníka a daj mu meno</span></div><button class="bd-x" aria-label="Zavrieť">×</button>`;
    panel.querySelector('.bd-x').onclick = closeChat;
    setup(true);
  } else renderChat();
}
function closeChat() { panel?.remove(); panel = null; opened = false; document.body.classList.remove('bd-open'); }

if (root) { new MutationObserver(showFab).observe(root, { childList: true, subtree: true }); showFab(); }
