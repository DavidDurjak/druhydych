// AI pomocník a kouč: plávajúce tlačidlo s postavičkou, ktorú si človek pomenuje a nastaví, a chat.
// Samo sa vloží do appky (bez zásahu do app.js). Odpovede robí edge funkcia coach-chat.
import * as db from './data.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const COLORS = ['#7CFFB2', '#6FC3FF', '#FF8A7A', '#FFD66B', '#B79CFF', '#FFB38A', '#B9E86B', '#9FB3C8'];
const EYES = ['dots', 'happy', 'wide', 'sleepy'];
const MOUTHS = ['smile', 'grin', 'flat', 'open'];
const ACCS = ['none', 'cap', 'glasses', 'band', 'crown', 'leaf'];
const ACC_LABEL = { none: 'Nič', cap: 'Šiltovka', glasses: 'Okuliare', band: 'Čelenka', crown: 'Koruna', leaf: 'Lístok' };
const DEFAULT = { name: 'Dych', c: 0, e: 0, m: 0, a: 0 };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

export function avatarSvg(b, size = 56) {
  const col = COLORS[b.c] || COLORS[0], eyes = EYES[b.e] || 'dots', mouth = MOUTHS[b.m] || 'smile', acc = ACCS[b.a] || 'none';
  const ink = '#10161d';
  const E = {
    dots: `<circle cx="23" cy="34" r="3.2" fill="${ink}"/><circle cx="41" cy="34" r="3.2" fill="${ink}"/>`,
    happy: `<path d="M19 35q4-6 8 0M37 35q4-6 8 0" stroke="${ink}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
    wide: `<circle cx="23" cy="34" r="5" fill="#fff"/><circle cx="41" cy="34" r="5" fill="#fff"/><circle cx="23.8" cy="34.5" r="2.6" fill="${ink}"/><circle cx="41.8" cy="34.5" r="2.6" fill="${ink}"/>`,
    sleepy: `<path d="M18 34h9M37 34h9" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>`,
  }[eyes];
  const M = {
    smile: `<path d="M25 44q7 6 14 0" stroke="${ink}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`,
    grin: `<path d="M23 43h18q-1 9-9 9t-9-9z" fill="${ink}"/><path d="M26 43h12v3H26z" fill="#fff"/>`,
    flat: `<path d="M26 46h12" stroke="${ink}" stroke-width="2.8" stroke-linecap="round"/>`,
    open: `<ellipse cx="32" cy="47" rx="5" ry="5.5" fill="${ink}"/>`,
  }[mouth];
  const A = {
    none: '',
    cap: `<path d="M10 24q2-16 22-16t22 16z" fill="#2D6BFF"/><path d="M44 22h16q-1 5-9 5h-7z" fill="#1F4FCC"/>`,
    glasses: `<circle cx="23" cy="34" r="8" fill="none" stroke="${ink}" stroke-width="2.2"/><circle cx="41" cy="34" r="8" fill="none" stroke="${ink}" stroke-width="2.2"/><path d="M31 34h2" stroke="${ink}" stroke-width="2.2"/>`,
    band: `<path d="M8 25q24-10 48 0" stroke="#FF4D6D" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    crown: `<path d="M14 18l5-12 8 8 5-10 5 10 8-8 5 12z" fill="#FFC93C" stroke="#E0A400" stroke-width="1.5" stroke-linejoin="round"/>`,
    leaf: `<path d="M32 12q-2-8 7-9 1 8-7 9z" fill="#4CCB6E"/><path d="M32 12v-6" stroke="#2E9E4B" stroke-width="2"/>`,
  }[acc];
  return `<svg class="bd-av" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="26" fill="${col}"/><circle cx="14" cy="44" r="4.5" fill="#fff" opacity=".28"/><circle cx="50" cy="44" r="4.5" fill="#fff" opacity=".28"/>${E}${M}${A}</svg>`;
}

const buddy = () => ({ ...DEFAULT, ...(ctx.state?.profile?.buddy || {}) });
let fab = null, panel = null, busy = false, opened = false;

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
    if (fab.dataset.sig !== key) { fab.dataset.sig = key; fab.innerHTML = avatarSvg(buddy(), 50); }
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
  el.innerHTML = `<div class="bd-t">${fmt(text)}</div>`;
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
  const t = document.createElement('div'); t.className = 'bd-m coach bd-typing'; t.innerHTML = '<div class="bd-t"><i></i><i></i><i></i></div>';
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

function setup(first) {
  const b = buddy();
  const sheet = panel.querySelector('.bd-body');
  let st = { ...b };
  const draw = () => {
    sheet.innerHTML = `<div class="bd-setup">
      <div class="bd-prev">${avatarSvg(st, 110)}</div>
      <label class="bd-l">Meno pomocníka<input class="bd-name" maxlength="20" value="${esc(st.name)}" placeholder="Dych"></label>
      <div class="bd-l">Farba<div class="bd-row">${COLORS.map((c, i) => `<button class="bd-dot ${st.c === i ? 'on' : ''}" data-k="c" data-v="${i}" style="background:${c}" aria-label="Farba ${i + 1}"></button>`).join('')}</div></div>
      <div class="bd-l">Oči<div class="bd-row">${EYES.map((x, i) => `<button class="bd-opt ${st.e === i ? 'on' : ''}" data-k="e" data-v="${i}">${avatarSvg({ ...st, e: i, a: 0, m: 2 }, 38)}</button>`).join('')}</div></div>
      <div class="bd-l">Ústa<div class="bd-row">${MOUTHS.map((x, i) => `<button class="bd-opt ${st.m === i ? 'on' : ''}" data-k="m" data-v="${i}">${avatarSvg({ ...st, m: i, a: 0 }, 38)}</button>`).join('')}</div></div>
      <div class="bd-l">Doplnok<div class="bd-row">${ACCS.map((x, i) => `<button class="bd-chip ${st.a === i ? 'on' : ''}" data-k="a" data-v="${i}">${ACC_LABEL[x]}</button>`).join('')}</div></div>
      <button class="bd-save">${first ? 'Hotovo, poďme na to' : 'Uložiť'}</button>
    </div>`;
    sheet.querySelectorAll('[data-k]').forEach(el => el.onclick = () => { st.name = sheet.querySelector('.bd-name').value; st[el.dataset.k] = Number(el.dataset.v); draw(); });
    sheet.querySelector('.bd-save').onclick = async () => {
      st.name = (sheet.querySelector('.bd-name').value.trim() || 'Dych').slice(0, 20);
      const { error } = await db.sb.from('profiles').update({ buddy: st }).eq('id', ctx.state.profile.id);
      if (error) { ctx.toast(error.message, true); return; }
      ctx.state.profile.buddy = st; showFab(); renderChat();
    };
  };
  draw();
}

async function renderChat() {
  const b = buddy();
  panel.querySelector('.bd-head').innerHTML = `${avatarSvg(b, 38)}<div class="bd-hn"><b>${esc(b.name)}</b><span>tvoj pomocník a kouč</span></div><button class="bd-edit" aria-label="Upraviť postavičku">✎</button><button class="bd-x" aria-label="Zavrieť">×</button>`;
  panel.querySelector('.bd-x').onclick = closeChat;
  panel.querySelector('.bd-edit').onclick = () => setup(false);
  panel.querySelector('.bd-body').innerHTML = `<div class="bd-log"></div><div class="bd-chips"></div>
    <form class="bd-form"><textarea class="bd-in" rows="1" maxlength="1000" placeholder="Napíš, s čím ti mám pomôcť"></textarea><button class="bd-send" aria-label="Poslať">➤</button></form>`;
  const inp = panel.querySelector('.bd-in');
  inp.oninput = () => { inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; };
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(inp.value); } };
  panel.querySelector('.bd-form').onsubmit = e => { e.preventDefault(); send(inp.value); };
  // história
  const { data } = await db.sb.from('coach_msgs').select('id,role,kind,content,meta').eq('user_id', ctx.state.profile.id).order('created_at', { ascending: false }).limit(16);
  if (!panel) return;
  (data || []).reverse().forEach(m => bubble(m.role === 'user' ? 'me' : 'coach', m.content, m.role === 'coach' ? { id: m.id, action: m.meta?.action } : {}));
  // ranná správa, ak ešte nie je
  typing(true);
  try {
    const r = await api({ mode: 'opener' });
    typing(false);
    const last = data && data[0];
    if (!(last && last.id === r.id)) bubble('coach', r.reply, { id: r.id, action: r.action });
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
