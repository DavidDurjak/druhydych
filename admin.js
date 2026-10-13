// v0.9: spätná väzba z appky a admin prehľad (registrácie, návratnosť, jedlá, AI)
import { sb } from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const $app = () => ctx.$app;
const state = () => ctx.state;
const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), nav = (...a) => ctx.nav(...a);
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
export const APP_VERSION = '0.9';

const CSS = `
.fb-kinds { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.fb-kinds button { -webkit-appearance: none; appearance: none; padding: 14px 8px; border-radius: 16px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; }
.fb-kinds button span { font-size: 24px; }
.fb-kinds button.on { border-color: var(--accent); background: rgba(124,255,178,.1); }
.fb-photo { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 16px; border: 1px dashed var(--line); color: var(--muted); cursor: pointer; margin-top: 10px; }
.fb-photo img { width: 56px; height: 56px; object-fit: cover; border-radius: 12px; }
.fb-photo b { color: var(--text); display: block; font-size: 14px; }
.fb-photo small { font-size: 12px; }
.ad-k { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; }
.ad-k div { background: var(--card); border-radius: 18px; padding: 14px; }
.ad-k b { display: block; font-size: 28px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.ad-k span { font-size: 12px; color: var(--muted); }
.ad-k em { font-style: normal; font-size: 12px; color: var(--accent); font-weight: 700; margin-left: 4px; }
.ad-bars { display: flex; align-items: flex-end; gap: 4px; height: 90px; margin-top: 12px; }
.ad-bars i { flex: 1; border-radius: 6px 6px 2px 2px; background: var(--accent); min-height: 3px; opacity: .85; }
.ad-bars i.z { background: var(--track); }
.ad-bl { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 6px; }
.ad-row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-top: 1px solid var(--line); }
.ad-row:first-of-type { border-top: 0; }
.ad-row .n { flex: 1; min-width: 0; }
.ad-row .n b { display: block; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ad-row .n span { font-size: 12px; color: var(--muted); }
.ad-dots { display: flex; gap: 3px; }
.ad-dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--track); }
.ad-dots i.on { background: var(--accent); }
.ad-fb { padding: 12px 0; border-top: 1px solid var(--line); }
.ad-fb:first-of-type { border-top: 0; }
.ad-fb p { font-size: 14px; line-height: 1.45; margin: 6px 0; white-space: pre-wrap; word-break: break-word; }
.ad-fb small { font-size: 12px; color: var(--muted); }
.ad-fb img { width: 100%; max-height: 260px; object-fit: contain; border-radius: 12px; background: var(--bg-2); margin: 6px 0; }
.ad-fb .acts { display: flex; gap: 8px; margin-top: 6px; }
.ad-fb.done { opacity: .5; }
.ad-tag { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: var(--bg-2); }
.ad-tag.bug { color: #FF8A7A; } .ad-tag.idea { color: #FFC857; } .ad-tag.new { color: var(--accent); }
.td-first { margin-bottom: 14px; }
`;
function css() { if (!document.getElementById('v09css')) { const s = document.createElement('style'); s.id = 'v09css'; s.textContent = CSS; document.head.appendChild(s); } }

// výsledok si pamätáme pre konkrétneho používateľa (po odhlásení a prihlásení iného sa zistí znova)
let adminCache = { uid: null, val: false };
export async function isAdmin() {
  const uid = state()?.profile?.id || null;
  if (uid && adminCache.uid === uid) return adminCache.val;
  const { data } = await sb.rpc('is_admin');
  adminCache = { uid, val: !!data };
  return adminCache.val;
}
export function resetAdmin() { adminCache = { uid: null, val: false }; }

function shrink(file, max = 1280, q = 0.75) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => { URL.revokeObjectURL(url); b ? res(b) : rej(new Error('Fotku sa nepodarilo spracovať')); }, 'image/jpeg', q);
    };
    img.onerror = rej; img.src = url;
  });
}

// ---------- spätná väzba ----------
const KINDS = [['bug', '🐞', 'Problém'], ['idea', '💡', 'Nápad'], ['other', '💬', 'Iné']];
export async function renderFeedback() {
  css();
  const st = state(), uid = st.profile.id;
  const from = st.prevPath && st.prevPath !== '#/napis' ? st.prevPath : '';
  let kind = 'bug', photo = null;
  $app().innerHTML = `<div class="screen">
    <div class="topbar"><h1>Napíš nám</h1></div>
    <p class="muted mb">Niečo nefunguje alebo ti tu niečo chýba? Každú správu čítame a appku podľa nich upravujeme.</p>
    <div class="fb-kinds">${KINDS.map(([k, i, l]) => `<button data-k="${k}" class="${k === kind ? 'on' : ''}"><span>${i}</span>${l}</button>`).join('')}</div>
    <textarea class="input" id="fbMsg" rows="6" maxlength="2000" placeholder="Čo sa stalo? Čo si robil predtým a čo si čakal, že sa stane?"></textarea>
    <label class="fb-photo" id="fbPh"><input type="file" accept="image/*" id="fbFile" hidden><span style="font-size:26px">📎</span><div><b>Pridať screenshot</b><small>Nepovinné, ale pri probléme veľmi pomôže</small></div></label>
    <button class="btn primary mt" id="fbSend">Odoslať</button>
    <p class="muted small center mt">Spolu so správou pošleme typ zariadenia a obrazovku, z ktorej píšeš.</p>
  </div>${nav('#/napis')}`;
  const R = $app();
  const msg = R.querySelector('#fbMsg');
  const ph = { bug: 'Čo sa stalo? Čo si robil predtým a čo si čakal, že sa stane?', idea: 'Čo by ti v appke pomohlo? Pokojne aj malá vec.', other: 'Napíš, čo máš na srdci.' };
  R.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { kind = b.dataset.k; R.querySelectorAll('[data-k]').forEach(x => x.classList.toggle('on', x === b)); msg.placeholder = ph[kind]; });
  R.querySelector('#fbFile').onchange = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try { photo = await shrink(f); const u = URL.createObjectURL(photo); R.querySelector('#fbPh').innerHTML = `<img src="${u}" alt=""><div><b>Screenshot pridaný</b><small>Ťukni na Odoslať</small></div>`; }
    catch (err) { toast(err.message, true); }
  };
  R.querySelector('#fbSend').onclick = async () => {
    const text = msg.value.trim();
    if (text.length < 3) { toast('Napíš aspoň pár slov', true); msg.focus(); return; }
    const btn = R.querySelector('#fbSend'); btn.disabled = true; btn.textContent = 'Odosielam…';
    try {
      let path = null;
      if (photo) {
        path = `${uid}/${Date.now()}.jpg`;
        const { error } = await sb.storage.from('feedback').upload(path, photo, { contentType: 'image/jpeg' });
        if (error) path = null;
      }
      const device = `${navigator.userAgent.slice(0, 220)} | ${screen.width}x${screen.height} | v${APP_VERSION}${matchMedia('(display-mode: standalone)').matches ? ' | PWA' : ''}`;
      must(await sb.from('feedback').insert({ user_id: uid, kind, message: text, screen: from || null, device, photo: path }));
      R.innerHTML = `<div class="screen wc wc-done"><div class="wc-big">🙌</div><h1>Ďakujeme</h1><p class="muted">Správa je u nás. Ak to bude problém, opravíme ho čo najskôr.</p><a class="btn primary mt" href="#/">Späť na Dnes</a></div>${nav('#/napis')}`;
    } catch (err) { toast(err.message, true); btn.disabled = false; btn.textContent = 'Odoslať'; }
  };
}

// ---------- admin prehľad ----------
const pct = (ok, n) => n ? Math.round(ok / n * 100) + ' %' : '–';
const ago = d => { if (!d) return 'nikdy'; const n = Math.round((new Date(calc.today()) - new Date(d)) / 86400000); return n <= 0 ? 'dnes' : n === 1 ? 'včera' : `pred ${n} d`; };

export async function renderAdmin() {
  css();
  if (!(await isAdmin())) { location.hash = '#/'; return; }
  $app().innerHTML = `<div class="screen"><h1>Admin</h1><div class="spinner"></div></div>${nav('#/admin')}`;
  const [s, fb] = await Promise.all([
    sb.rpc('admin_stats').then(must),
    sb.from('feedback').select('id,kind,message,screen,device,photo,status,created_at,user_id').order('created_at', { ascending: false }).limit(50).then(must),
  ]);
  const names = Object.fromEntries((s.people || []).map(p => [p.id, p.name || p.email]));
  const photos = fb.filter(f => f.photo).map(f => f.photo);
  const signed = photos.length ? (await sb.storage.from('feedback').createSignedUrls(photos, 3600)).data || [] : [];
  const urlOf = Object.fromEntries(signed.map(x => [x.path, x.signedUrl]));
  const max = Math.max(1, ...(s.daily || []).map(d => d.n));
  const aiShare = s.logs7 ? Math.round(s.logs_ai7 / s.logs7 * 100) : 0;

  $app().innerHTML = `<div class="screen">
    <div class="topbar"><div><h1>Admin</h1><p class="muted small">Fuelwind · ${calc.fmtDate(s.today)}</p></div><button class="btn icon ghost" id="adRe" aria-label="Obnoviť">↻</button></div>

    <div class="ad-k">
      <div><b>${s.onboarded}</b><span>používateľov</span>${s.new7 ? `<em>+${s.new7} za 7 dní</em>` : ''}</div>
      <div><b>${s.dau}</b><span>aktívnych dnes</span></div>
      <div><b>${pct(s.d1.ok, s.d1.n)}</b><span>vrátili sa na 2. deň (${s.d1.ok}/${s.d1.n})</span></div>
      <div><b>${pct(s.d7.ok, s.d7.n)}</b><span>aktívni po týždni (${s.d7.ok}/${s.d7.n})</span></div>
    </div>

    <section class="pg-card">
      <div class="pg-row"><h3>Aktívni ľudia za 14 dní</h3><span class="pg-chip">${s.wau} za 7 dní</span></div>
      <div class="ad-bars">${(s.daily || []).map(d => `<i class="${d.n ? '' : 'z'}" style="height:${Math.max(3, d.n / max * 100)}%" title="${calc.fmtDate(d.d)}: ${d.n}"></i>`).join('')}</div>
      <div class="ad-bl"><span>${s.daily?.[0] ? calc.fmtDate(s.daily[0].d) : ''}</span><span>dnes</span></div>
    </section>

    <section class="pg-card">
      <h3 class="mb">Jedlo a AI za 7 dní</h3>
      <div class="rp-grid">
        <div class="rp-s"><span>🍽️</span><b>${s.logs7}</b><small>zapísaných jedál</small></div>
        <div class="rp-s"><span>✦</span><b>${aiShare} %</b><small>cez AI</small></div>
        <div class="rp-s"><span>🤖</span><b>${s.ai_req7}</b><small>AI požiadaviek</small><em>${s.ai_fail7} zlyhalo</em></div>
        <div class="rp-s"><span>⏱️</span><b>${s.ai_ms ? (s.ai_ms / 1000).toFixed(1).replace('.', ',') + ' s' : '–'}</b><small>priemerná odpoveď AI</small></div>
      </div>
    </section>

    <section class="pg-card">
      <div class="pg-row"><h3>Spätná väzba</h3><span class="pg-chip">${s.feedback_new} nových</span></div>
      ${fb.length ? fb.map(f => `<div class="ad-fb ${f.status === 'done' ? 'done' : ''}">
        <div class="row between"><span><span class="ad-tag ${f.kind}">${{ bug: '🐞 problém', idea: '💡 nápad', other: '💬 iné' }[f.kind]}</span> ${f.status === 'new' ? '<span class="ad-tag new">nové</span>' : ''}</span><small>${new Date(f.created_at).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</small></div>
        <p>${h(f.message)}</p>
        ${f.photo && urlOf[f.photo] ? `<a href="${urlOf[f.photo]}" target="_blank" rel="noopener"><img src="${urlOf[f.photo]}" alt="screenshot" loading="lazy"></a>` : ''}
        <small>${h(names[f.user_id] || 'Používateľ')}${f.screen ? ' · ' + h(f.screen) : ''}${f.device ? ' · ' + h(f.device.split(' | ').slice(1).join(' · ')) : ''}</small>
        <div class="acts">${f.status !== 'done' ? `<button class="btn sm" data-fs="${f.id}:done">✓ Vybavené</button>` : `<button class="btn sm ghost" data-fs="${f.id}:new">Vrátiť</button>`}</div>
      </div>`).join('') : '<p class="muted small mt">Zatiaľ žiadne správy. Tlačidlo „Napíš nám“ majú ľudia v Profile.</p>'}
    </section>

    <section class="pg-card">
      <div class="pg-row"><h3>Ľudia</h3><span class="pg-chip">${(s.people || []).length}</span></div>
      ${(s.people || []).map(p => `<div class="ad-row"><div class="n"><b>${h(p.name || '(bez mena)')}${p.role === 'coach' ? ' <span class="chip">kouč</span>' : ''}</b><span>${h(p.email || '')} · od ${calc.fmtDate(p.joined)} · ${p.logs} jedál · naposledy ${ago(p.last)}</span></div><div class="ad-dots" title="${p.days7} z 7 dní">${Array.from({ length: 7 }, (_, i) => `<i class="${i < p.days7 ? 'on' : ''}"></i>`).join('')}</div></div>`).join('')}
    </section>
    <p class="muted small center mt">„Aktívny“ = v ten deň zapísal jedlo, váhu, tréning alebo check-in.</p>
  </div>${nav('#/admin')}`;

  const R = $app();
  R.querySelector('#adRe').onclick = () => renderAdmin();
  R.querySelectorAll('[data-fs]').forEach(b => b.onclick = async () => {
    const [id, status] = b.dataset.fs.split(':');
    try { must(await sb.from('feedback').update({ status }).eq('id', Number(id))); renderAdmin(); } catch (e) { toast(e.message, true); }
  });
  // otvorením prehľadu sa nové správy označia ako videné
  const fresh = fb.filter(f => f.status === 'new').map(f => f.id);
  if (fresh.length) sb.from('feedback').update({ status: 'seen' }).in('id', fresh).then(() => { });
}
