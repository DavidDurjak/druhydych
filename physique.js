// Analýza postavy z fotiek (AI). Len pre dospelých. Fotky sa neukladajú, ukladá sa iba výsledok.
// Pred odoslaním sa fotka skontroluje v telefóne (svetlo, ostrosť, rozlíšenie, orientácia), aby sa AI nemíňala na zlé fotky.
import * as db from './data.js';
import { ctx } from './app.js';

const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), sheet = (...a) => ctx.sheet(...a);

export const LABEL = { shoulders: 'Predné a bočné ramená', reardelt: 'Zadné ramená', chest: 'Hrudník', lats: 'Šírka chrbta (lats)', backthick: 'Hrúbka chrbta a trapézy', biceps: 'Biceps', triceps: 'Triceps', quads: 'Predné stehná', hams: 'Zadné stehná', glutes: 'Zadok', calves: 'Lýtka', core: 'Brucho a stred tela',
  back: 'Chrbát', arms: 'Ruky', posterior: 'Zadok a zadné stehná' };
const ROW_ORDER = ['shoulders', 'reardelt', 'chest', 'lats', 'backthick', 'back', 'biceps', 'triceps', 'arms', 'quads', 'hams', 'glutes', 'posterior', 'calves', 'core'];
const POSES = [
  ['front', 'Spredu uvoľnene', 'Povinná. Stoj prirodzene, ruky pri tele.'],
  ['frontbi', 'Spredu dvojitý biceps', 'Ukáže ramená, hrudník a ruky.'],
  ['side', 'Zboku', 'Hrudník alebo triceps. Ukáže držanie tela.'],
  ['back', 'Zozadu uvoľnene', 'Ukáže chrbát, zadok a lýtka.'],
  ['backbi', 'Zozadu dvojitý biceps', 'Ukáže šírku a hrúbku chrbta.'],
  ['abs', 'Brucho a nohy', 'Ruky za hlavou, jedna noha vpred.'],
];
const UPPER = ['chest', 'back', 'lats', 'backthick', 'shoulders', 'reardelt', 'arms', 'biceps', 'triceps'], LOWER = ['quads', 'posterior', 'hams', 'glutes', 'calves'];

// ---------- kontrola kvality fotky ----------
export function metricsOf(img) {
  const W = 256, s = W / img.width, H = Math.max(8, Math.round(img.height * s));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, g = new Float32Array(W * H);
  let sum = 0;
  for (let i = 0; i < W * H; i++) { const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; g[i] = v; sum += v; }
  const mean = sum / (W * H);
  let vs = 0; for (let i = 0; i < W * H; i++) vs += (g[i] - mean) ** 2;
  const std = Math.sqrt(vs / (W * H));
  let ls = 0, ls2 = 0, n = 0;
  for (let yy = 1; yy < H - 1; yy++) for (let xx = 1; xx < W - 1; xx++) {
    const i = yy * W + xx, l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - W] - g[i + W];
    ls += l; ls2 += l * l; n++;
  }
  const lap = ls2 / n - (ls / n) ** 2;
  return { mean, std, lap };
}
export function qualityOf(w, hgt, m) {
  const hard = [], soft = [];
  if (Math.min(w, hgt) < 700) hard.push('Fotka má nízke rozlíšenie. Použi hlavný fotoaparát, nie priblíženie ani snímku obrazovky.');
  if (hgt / w < 1.2) hard.push('Fotku urob na výšku, aby sa zmestila celá postava od hlavy po kolená alebo nižšie.');
  if (m.mean < 55) hard.push('Fotka je príliš tmavá. Postav sa k oknu alebo zapni svetlo pred sebou.');
  if (m.mean > 215) hard.push('Fotka je prežiarená. Vyhni sa priamemu slnku a blesku.');
  if (!hard.length) {
    if (m.std < 30) soft.push('Fotka je plochá a bez kontrastu. Svetlo zboku zvýrazní svaly.');
    if (m.lap < 35) soft.push('Fotka vyzerá rozmazaná. Oprej telefón o niečo a nechaj ostriť.');
  }
  return { hard, soft };
}
function loadImg(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Fotku sa nepodarilo načítať')); };
    img.src = url;
  });
}
function toJpeg(img, max, q) {
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', q);
  return { url, b64: url.slice(url.indexOf(',') + 1) };
}

// ---------- dáta ----------
async function lastChecks(uid) {
  const { data, error } = await db.sb.from('physique_checks').select('id,created_at,result').eq('user_id', uid).eq('ok', true).order('created_at', { ascending: false }).limit(5);
  if (error) throw new Error(error.message);
  return (data || []).filter(r => r.result?.usable);
}
async function callAi(images) {
  const { data, error } = await db.sb.functions.invoke('physique-ai', { body: { images } });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* nič */ }
    throw new Error(msg);
  }
  return data;
}
const fmtDate = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; };
export function applyHint(prio) {
  const up = prio.filter(k => UPPER.includes(k)).length, lo = prio.filter(k => LOWER.includes(k)).length;
  return { priority: prio.slice(0, 2), emphasis: up > lo ? 'upper' : lo > up ? 'lower' : 'balanced' };
}

// ---------- vzhľad ----------
const CSS = `
.px-card{margin-bottom:12px;padding:14px;border-radius:18px;border:1px solid var(--line);background:linear-gradient(160deg,rgba(124,255,178,.10),rgba(124,255,178,.02))}
.px-card b{display:block;font-size:15px}.px-card p{margin:4px 0 10px}
.px-tip{margin:0 0 14px;padding:0;list-style:none}.px-tip li{position:relative;padding:0 0 8px 22px;font-size:13.5px;line-height:1.45}.px-tip li:before{content:'';position:absolute;left:2px;top:6px;width:8px;height:8px;border-radius:50%;background:var(--accent)}
.px-slots{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:10px 0 12px}
.px-slot{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:132px;border-radius:14px;border:1px dashed var(--line);background:var(--card-2);color:var(--text);cursor:pointer;overflow:hidden;text-align:center;padding:8px;font-size:12.5px}
.px-slot b{font-size:13.5px}.px-slot small{color:var(--muted);font-size:11.5px;line-height:1.3}.px-slot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.px-slot.has{border-style:solid;border-color:var(--accent)}.px-slot.bad{border-style:solid;border-color:#ff7a7a}
.px-slot .tag{position:absolute;left:6px;bottom:6px;right:6px;padding:3px 6px;border-radius:8px;background:rgba(0,0,0,.65);color:#fff;font-size:11px}
.px-warn{margin:0 0 8px;padding:10px 12px;border-radius:12px;font-size:12.5px;line-height:1.45;background:rgba(255,122,122,.12);border:1px solid rgba(255,122,122,.35)}
.px-warn.soft{background:rgba(255,210,122,.10);border-color:rgba(255,210,122,.35)}
.px-note{font-size:12px;color:var(--muted);line-height:1.5;margin:10px 2px 0}
.px-m{margin:0 0 10px}.px-m .r{display:flex;align-items:center;gap:10px;font-size:13.5px}.px-m .r>span{flex:0 0 118px}
.px-m i{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.09);overflow:hidden}.px-m i b{display:block;height:100%;border-radius:4px;background:var(--accent)}
.px-m.low i b{background:#ffd27a}.px-m em{flex:0 0 38px;text-align:right;font-style:normal;font-size:12px;color:var(--muted)}.px-m em.up{color:var(--accent)}.px-m em.dn{color:#ff9b9b}
.px-m small{display:block;color:var(--muted);font-size:12px;line-height:1.4;margin:2px 0 0 128px}
.px-h{font-size:14px;margin:16px 0 6px}.px-list{margin:0 0 0 18px;padding:0;font-size:13.5px;line-height:1.5}
.px-sum{font-size:14px;line-height:1.5;margin:6px 0 4px}.px-prio{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.px-prio span{padding:7px 12px;border-radius:999px;border:1px solid var(--accent);background:rgba(124,255,178,.12);font-size:13.5px}
.px-caut{margin:12px 0 0;padding:11px 13px;border-radius:12px;background:rgba(255,210,122,.10);border:1px solid rgba(255,210,122,.4);font-size:13px;line-height:1.45}
.px-load{text-align:center;padding:26px 6px}.px-load .ph{position:relative;width:120px;height:160px;margin:0 auto 14px;border-radius:14px;overflow:hidden;background:#000}.px-load .ph img{width:100%;height:100%;object-fit:cover;opacity:.8}
.px-load .ph:after{content:'';position:absolute;left:0;right:0;height:3px;background:var(--accent);box-shadow:0 0 14px var(--accent);animation:pxScan 1.6s ease-in-out infinite alternate}
@keyframes pxScan{from{top:0}to{top:calc(100% - 3px)}}@media (prefers-reduced-motion:reduce){.px-load .ph:after{animation:none;top:50%}}
`;
if (typeof document !== 'undefined' && !document.getElementById('px-css')) { const st = document.createElement('style'); st.id = 'px-css'; st.textContent = CSS; document.head.appendChild(st); }

export function physiqueCardHtml() {
  return `<div class="px-card"><b>📸 Analýza postavy (AI)</b><p class="muted small">Odfoť sa a AI ti povie, ktoré partie zaostávajú a čo ti ide dobre. Podľa toho ti vie nastaviť plán.</p><button class="btn sm primary" id="physOpen">Otvoriť analýzu</button></div>`;
}

// ---------- hlavné okno ----------
export async function openPhysique({ profile, onApply }) {
  const age = profile.birth_year ? new Date().getFullYear() - Number(profile.birth_year) : 0;
  const bg = sheet('<div id="pxBody"><p class="muted small">Načítavam…</p></div>');
  const body = bg.querySelector('#pxBody');
  const close = () => bg.remove();
  const head = t => `<div class="row between"><h2>${t}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>`;
  const bindX = () => body.querySelector('[data-x]')?.addEventListener('click', close);
  if (age < 18) {
    body.innerHTML = head('Analýza postavy') + `<p class="muted small mt">Táto funkcia je len pre dospelých. ${profile.birth_year ? '' : 'Doplň rok narodenia v profile.'}</p>`;
    return bindX();
  }
  let history = [];
  try { history = await lastChecks(profile.id); } catch (_) { /* bez histórie */ }

  const showResult = (rec, prev) => {
    const r = rec.result, ms = r.muscles || {};
    const rows = ROW_ORDER.filter(k => ms[k]).map(k => {
      const m = ms[k];
      if (!m.score) return `<div class="px-m"><div class="r"><span>${LABEL[k]}</span><i></i><em>nevidno</em></div></div>`;
      const pv = prev?.result?.muscles?.[k]?.score, dl = pv ? m.score - pv : 0;
      return `<div class="px-m${m.score <= 2 ? ' low' : ''}"><div class="r"><span>${LABEL[k]}</span><i><b style="width:${m.score * 20}%"></b></i><em class="${dl > 0 ? 'up' : dl < 0 ? 'dn' : ''}">${m.score}/5${dl > 0 ? ' ▲' : dl < 0 ? ' ▼' : ''}</em></div>${m.note ? `<small>${h(m.note)}</small>` : ''}</div>`;
    }).join('');
    const prio = (r.priorities || []).map(k => LABEL[k]).filter(Boolean);
    const conf = r.confidence >= 0.75 ? 'vysoká' : r.confidence >= 0.5 ? 'stredná' : 'nízka';
    body.innerHTML = head('Tvoja analýza') + `<p class="muted small">${fmtDate(rec.created_at)}${prev ? ' · porovnanie s ' + fmtDate(prev.created_at) : ''}</p>
      ${r.summary ? `<p class="px-sum">${h(r.summary)}</p>` : ''}
      ${prio.length ? `<p class="px-h">Priorita na zlepšenie</p><div class="px-prio">${prio.map(t => `<span>${h(t)}</span>`).join('')}</div>` : ''}
      <p class="px-h">Hodnotenie svalov</p>${rows}
      ${(r.strengths || []).length ? `<p class="px-h">Silné stránky</p><ul class="px-list">${r.strengths.map(t => `<li>${h(t)}</li>`).join('')}</ul>` : ''}
      ${r.proportions ? `<p class="px-h">Proporcie</p><p class="small" style="margin:0">${h(r.proportions)}</p>` : ''}
      ${r.posture ? `<p class="px-h">Držanie tela</p><p class="small" style="margin:0">${h(r.posture)}</p>` : ''}
      ${r.conditioning ? `<p class="px-h">Viditeľnosť svalov</p><p class="small" style="margin:0">${h(r.conditioning)}</p>` : ''}
      ${(r.advice || []).length ? `<p class="px-h">Čo s tým v tréningu</p><ul class="px-list">${r.advice.map(t => `<li>${h(t)}</li>`).join('')}</ul>` : ''}
      ${r.caution ? `<div class="px-caut">${h(r.caution)}</div>` : ''}
      <p class="px-note">Spoľahlivosť odhadu: ${conf}. Je to odhad AI z fotiek, nie lekárske ani súťažné posúdenie. Jedna fotka nikdy nenahradí kouča, ktorý ťa vidí naživo.</p>
      ${(r.priorities || []).length ? '<button class="btn primary mt" id="pxApply">Nastaviť plán podľa analýzy</button>' : ''}
      <button class="btn mt" id="pxNew">Nová analýza</button>
      <button class="btn ghost mt" id="pxDel">Zmazať túto analýzu</button>`;
    bindX();
    body.querySelector('#pxNew').onclick = capture;
    body.querySelector('#pxApply')?.addEventListener('click', () => { close(); onApply(applyHint(r.priorities || [])); });
    body.querySelector('#pxDel').onclick = async () => {
      if (!confirm('Zmazať túto analýzu?')) return;
      try { const { error } = await db.sb.from('physique_checks').delete().eq('id', rec.id); if (error) throw new Error(error.message); history = history.filter(x => x.id !== rec.id); toast('Analýza zmazaná'); home(); }
      catch (e) { toast(e.message, true); }
    };
  };

  const home = () => {
    if (!history.length) return capture();
    const l = history[0], pr = (l.result.priorities || []).map(k => LABEL[k]).filter(Boolean);
    body.innerHTML = head('Analýza postavy') + `<div class="px-card"><b>Posledná analýza: ${fmtDate(l.created_at)}</b><p class="muted small">${pr.length ? 'Priorita: ' + h(pr.join(', ')) : 'Bez zvýraznenej priority'}</p><button class="btn sm primary" id="pxShow">Zobraziť</button></div>
      <button class="btn primary" id="pxNew">Nová analýza</button>
      <p class="px-note">Odporúčame novú analýzu raz za 4 až 8 týždňov, v rovnakom svetle a na rovnakom mieste, aby si videl skutočný pokrok.</p>`;
    bindX();
    body.querySelector('#pxShow').onclick = () => showResult(l, history[1]);
    body.querySelector('#pxNew').onclick = capture;
  };

  function capture() {
    const picked = {}; // pose -> { b64, url }
    body.innerHTML = head('Nová analýza') + `
      <p class="muted small">Dobrá fotka rozhoduje o tom, či bude analýza presná.</p>
      <ul class="px-tip">
        <li>Celá postava od hlavy po kolená alebo nižšie, telefón na výšku. Na pózy dvojitý biceps a brucho stačí od hlavy po stehná.</li>
        <li>Telefón vo výške hrude, 2 až 3 metre od teba (oprieť o niečo alebo požiadať niekoho).</li>
        <li>Svetlo spredu alebo mierne zboku, ideálne od okna. Žiadne protisvetlo, blesk ani filtre.</li>
        <li>Plavky alebo krátke šortky, bez trička. Ženy športová podprsenka. Voľné oblečenie skrýva svaly.</li>
        <li>Rovnaké miesto, svetlo a pozadie ako minule. Čím viac póz pošleš, tým presnejšie hodnotenie každého svalu. Spredu uvoľnene je povinná, ostatné odporúčame.</li>
      </ul>
      <div class="px-slots">${POSES.map(([k, t, s]) => `<label class="px-slot" data-slot="${k}"><input type="file" accept="image/*" hidden data-f="${k}"><b>${t}</b><small>${s}</small></label>`).join('')}</div>
      <div id="pxMsg"></div>
      <button class="btn primary" id="pxGo" disabled>Analyzovať</button>
      <p class="px-note">Fotky sa odošlú na spracovanie AI službe Google a neukladajú sa u nás. Uloží sa len textový výsledok, ktorý môžeš kedykoľvek zmazať. Fotky nevidí kouč ani kamaráti.</p>`;
    bindX();
    const msg = body.querySelector('#pxMsg'), go = body.querySelector('#pxGo');
    const refresh = () => { go.disabled = !picked.front || !!picked.front.bad; };
    body.querySelectorAll('input[data-f]').forEach(inp => inp.onchange = async () => {
      const f = inp.files?.[0]; inp.value = ''; if (!f) return;
      const k = inp.dataset.f, slot = body.querySelector(`[data-slot="${k}"]`);
      try {
        const img = await loadImg(f), q = qualityOf(img.width, img.height, metricsOf(img));
        const j = toJpeg(img, 1152, 0.82);
        picked[k] = { b64: j.b64, bad: q.hard.length > 0 };
        slot.className = 'px-slot ' + (q.hard.length ? 'bad' : 'has');
        slot.querySelectorAll('img,.tag').forEach(n => n.remove());
        slot.insertAdjacentHTML('beforeend', `<img src="${j.url}" alt=""><span class="tag">${q.hard.length ? 'Nevhodná, vyfoť znova' : q.soft.length ? 'Použiteľná' : 'Dobrá'}</span>`);
        msg.querySelectorAll(`[data-for="${k}"]`).forEach(n => n.remove());
        const label = POSES.find(p => p[0] === k)[1];
        q.hard.forEach(t => msg.insertAdjacentHTML('beforeend', `<div class="px-warn" data-for="${k}"><b style="display:inline">${label}:</b> ${h(t)}</div>`));
        q.soft.forEach(t => msg.insertAdjacentHTML('beforeend', `<div class="px-warn soft" data-for="${k}"><b style="display:inline">${label}:</b> ${h(t)}</div>`));
      } catch (e) { toast(e.message || 'Fotku sa nepodarilo načítať', true); }
      refresh();
    });
    go.onclick = async () => {
      const images = POSES.filter(([k]) => picked[k] && !picked[k].bad).map(([k]) => ({ pose: k, data: picked[k].b64 }));
      if (!images.length) return;
      body.innerHTML = `<div class="px-load"><div class="ph"><img src="data:image/jpeg;base64,${images[0].data}" alt=""></div><b>Analyzujem tvoju postavu…</b><p class="muted small mt">Trvá to okolo minúty. Nezatváraj appku.</p></div>`;
      try {
        const out = await callAi(images);
        const r = out?.result;
        if (!r?.usable) {
          body.innerHTML = head('Fotky sa nedali použiť') + `<p class="small mt">AI na týchto fotkách nevie spoľahlivo hodnotiť:</p><ul class="px-list">${(r?.issues?.length ? r.issues : ['Skús fotky urobiť znova podľa tipov.']).map(t => `<li>${h(t)}</li>`).join('')}</ul><button class="btn primary mt" id="pxAgain">Skúsiť znova</button>`;
          bindX(); body.querySelector('#pxAgain').onclick = capture; return;
        }
        const rec = { id: out.id, created_at: out.created_at || new Date().toISOString(), result: r };
        history = [rec, ...history];
        showResult(rec, history[1]);
      } catch (e) {
        body.innerHTML = head('Nepodarilo sa') + `<p class="muted small mt">${h(e.message)}</p><button class="btn primary mt" id="pxAgain">Skúsiť znova</button>`;
        bindX(); body.querySelector('#pxAgain').onclick = capture;
      }
    };
  }
  home();
}
