// Hlas pre AI pomocníka: mikrofón v chate (hlasová správa -> text) a čítanie odpovedí nahlas.
// Čítanie nahlas robí hlas telefónu (zadarmo). Hlasovku prepíše rozpoznávanie reči telefónu; ak ho zariadenie v appke nepustí,
// nahrá sa krátke audio a prepíše ho funkcia voice-stt (AI). Samo sa vloží do chatu, bez zásahu do buddy.js.
import * as db from './data.js';
import { ctx } from './app.js';
import { currentLang } from './i18n.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const canRec = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
const canTts = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
const BCP = { sk: 'sk-SK', cs: 'cs-CZ', de: 'de-DE', hu: 'hu-HU', pl: 'pl-PL', en: 'en-US', uk: 'uk-UA', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', ro: 'ro-RO', hr: 'hr-HR', sl: 'sl-SI', sr: 'sr-RS', bg: 'bg-BG', ru: 'ru-RU', nl: 'nl-NL', pt: 'pt-PT', sv: 'sv-SE', da: 'da-DK', no: 'nb-NO', fi: 'fi-FI', tr: 'tr-TR', lt: 'lt-LT', lv: 'lv-LV', et: 'et-EE', el: 'el-GR', ar: 'ar-SA', he: 'he-IL', fa: 'fa-IR', hi: 'hi-IN', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', vi: 'vi-VN', id: 'id-ID', ms: 'ms-MY', th: 'th-TH' };
const bcp = () => { const l = currentLang(); return BCP[l] || l; };
const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const FAIL_KEY = 'fw_stt_rec';
const preferRec = () => { try { return localStorage.getItem(FAIL_KEY) === '1'; } catch (_) { return false; } };
const markRec = () => { try { localStorage.setItem(FAIL_KEY, '1'); } catch (_) { /* nič */ } };

const css = document.createElement('style');
css.textContent = `
.vx-mic{width:44px;height:44px;flex:none;border-radius:50%;border:1px solid var(--line,#232a33);background:var(--card,#151a21);color:var(--text,#fff);display:grid;place-items:center;cursor:pointer;padding:0;transition:background .15s,border-color .15s}
.vx-mic svg{width:20px;height:20px}
.vx-mic.rec{background:#e5484d;border-color:#e5484d;color:#fff;animation:vxp 1.3s ease-in-out infinite}
.vx-mic.busy{opacity:.6;pointer-events:none}
@keyframes vxp{0%,100%{box-shadow:0 0 0 0 rgba(229,72,77,.5)}50%{box-shadow:0 0 0 9px rgba(229,72,77,0)}}
.vx-bar{display:flex;align-items:center;gap:10px;padding:8px 14px;border-top:1px solid var(--line,#232a33);font-size:14px;color:var(--text,#fff)}
.vx-bar i{width:9px;height:9px;border-radius:50%;background:#e5484d;flex:none}
.vx-bar span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vx-bar span.n{color:var(--muted,#8a94a3)}
.vx-bar button{background:none;border:0;color:var(--muted,#8a94a3);font:inherit;font-size:13.5px;padding:6px 8px;cursor:pointer;border-radius:8px}
.vx-spk{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;background:none;border:0;color:var(--muted,#8a94a3);font:inherit;font-size:13px;padding:4px 6px 4px 2px;cursor:pointer;border-radius:8px}
.vx-spk svg{width:18px;height:18px}
.vx-spk.on{color:var(--accent,#3fd5c4)}
@media (prefers-reduced-motion:reduce){.vx-mic.rec{animation:none}}
`;
document.head.appendChild(css);

const ICO_MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const ICO_STOP = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';
const ICO_SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>';
const ICO_SPK_OFF = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

// ---------- čítanie nahlas ----------
let speakingBtn = null, voiceReply = false;
function clean(t) {
  return String(t || '').replace(/\*\*/g, '').replace(/^\s*[-•]\s+/gm, '').replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s*\n+\s*/g, '. ').replace(/\s+/g, ' ').trim();
}
function pickVoice(lang) {
  const vs = speechSynthesis.getVoices() || [], p = lang.slice(0, 2).toLowerCase();
  const m = vs.filter(v => v.lang && v.lang.toLowerCase().replace('_', '-').startsWith(p));
  return m.find(v => v.lang.toLowerCase().replace('_', '-') === lang.toLowerCase() && !v.localService === false) || m.find(v => v.lang.toLowerCase().replace('_', '-') === lang.toLowerCase()) || m[0] || null;
}
function stopSpeak() {
  if (!canTts) return;
  try { speechSynthesis.cancel(); } catch (_) { /* nič */ }
  if (speakingBtn) { speakingBtn.classList.remove('on'); speakingBtn.querySelector('svg').outerHTML = ICO_SPK; speakingBtn = null; }
}
function speak(text, btn) {
  if (!canTts) return;
  const was = speakingBtn === btn; stopSpeak(); if (was) return;
  const t = clean(text); if (!t) return;
  const u = new SpeechSynthesisUtterance(t), lang = bcp();
  u.lang = lang; const v = pickVoice(lang); if (v) u.voice = v; u.rate = 1;
  const done = () => { if (speakingBtn === btn) stopSpeak(); };
  u.onend = done; u.onerror = done;
  if (btn) { speakingBtn = btn; btn.classList.add('on'); btn.querySelector('svg').outerHTML = ICO_SPK_OFF; }
  speechSynthesis.speak(u);
}
// iOS pustí hlas až po ťuknutí používateľa: pri mikrofóne si ho "odomkneme" prázdnou vetou
function unlockTts() { if (!canTts) return; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (_) { /* nič */ } }
if (canTts) { try { speechSynthesis.getVoices(); speechSynthesis.addEventListener?.('voiceschanged', () => { }); } catch (_) { /* nič */ } }

function decorate(m) {
  if (m.dataset.vx || m.classList.contains('bd-typing') || m.classList.contains('err') || !m.classList.contains('coach')) return;
  const t = m.querySelector('.bd-t'); if (!t || !canTts) return;
  m.dataset.vx = '1';
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'vx-spk'; b.setAttribute('aria-label', 'Prečítať nahlas');
  b.innerHTML = ICO_SPK + '<span>Prečítať</span>';
  b.onclick = () => speak(t.innerText, b);
  const rate = m.querySelector('.bd-rate');
  m.insertBefore(b, rate || m.querySelector('.bd-act') || null);
  if (voiceReply) { voiceReply = false; speak(t.innerText, b); }
}

// ---------- hlasová správa ----------
let state = 'idle', rec = null, stream = null, mr = null, chunks = [], timer = 0, bar = null, mic = null, form = null, finalText = '', cancelled = false;

const setBar = (txt, muted, cancelable) => {
  if (!form) return;
  if (!bar) { bar = document.createElement('div'); bar.className = 'vx-bar'; form.parentNode.insertBefore(bar, form); }
  bar.innerHTML = `<i></i><span class="${muted ? 'n' : ''}"></span>${cancelable ? '<button type="button">Zrušiť</button>' : ''}`;
  bar.querySelector('span').textContent = txt;
  const c = bar.querySelector('button'); if (c) c.onclick = () => finish(true);
};
const clearBar = () => { bar?.remove(); bar = null; };
function setState(s) {
  state = s;
  if (!mic) return;
  mic.classList.toggle('rec', s === 'rec'); mic.classList.toggle('busy', s === 'busy');
  mic.innerHTML = s === 'rec' ? ICO_STOP : ICO_MIC;
  mic.setAttribute('aria-label', s === 'rec' ? 'Zastaviť a poslať' : 'Hlasová správa');
}
function sendText(text) {
  const inp = form?.querySelector('.bd-in'); if (!inp || !text.trim()) return false;
  inp.value = text.trim(); inp.dispatchEvent(new Event('input', { bubbles: true }));
  voiceReply = true;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  return true;
}
function release() {
  clearTimeout(timer);
  try { stream?.getTracks().forEach(t => t.stop()); } catch (_) { /* nič */ }
  stream = null; rec = null; mr = null;
}
function finish(cancel) {
  cancelled = !!cancel;
  if (rec) { try { cancel ? rec.abort() : rec.stop(); } catch (_) { /* nič */ } if (cancel) { release(); clearBar(); setState('idle'); } return; }
  if (mr && mr.state !== 'inactive') { try { mr.stop(); } catch (_) { /* nič */ } if (cancel) { chunks = []; release(); clearBar(); setState('idle'); } return; }
  release(); clearBar(); setState('idle');
}

function startSpeech() {
  const r = new SR(); rec = r; finalText = ''; cancelled = false;
  r.lang = bcp(); r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  let failed = '';
  r.onresult = e => {
    let fin = '', tmp = '';
    for (let i = 0; i < e.results.length; i++) (e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (tmp += e.results[i][0].transcript));
    finalText = fin; setBar((fin + ' ' + tmp).trim() || 'Počúvam...', !(fin + tmp).trim(), true);
  };
  r.onerror = e => { failed = e.error || 'error'; };
  r.onend = () => {
    rec = null; release();
    if (cancelled) { clearBar(); setState('idle'); return; }
    const txt = finalText.trim();
    if (txt) { clearBar(); setState('idle'); sendText(txt); return; }
    if (failed && failed !== 'no-speech' && failed !== 'aborted') {
      // rozpoznávanie reči sa v tomto zariadení nespustilo: ďalej budeme nahrávať a prepisovať cez AI
      markRec();
      if (canRec) { startRecord(); return; }
      ctx.toast?.('Mikrofón sa nepodarilo spustiť. Povoľ ho v nastaveniach prehliadača.', true);
    } else if (!failed) ctx.toast?.('Nič som nezachytil. Skús to znova.', true);
    clearBar(); setState('idle');
  };
  try { r.start(); setState('rec'); setBar('Počúvam... ťukni na štvorček, keď skončíš', true, true); } catch (_) { rec = null; if (canRec) { markRec(); startRecord(); } else { setState('idle'); } }
}

async function startRecord() {
  cancelled = false; chunks = [];
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    clearBar(); setState('idle');
    ctx.toast?.(e?.name === 'NotAllowedError' ? 'Mikrofón je zakázaný. Povoľ ho v nastaveniach telefónu alebo prehliadača.' : 'Mikrofón sa nepodarilo spustiť.', true);
    return;
  }
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported?.(t)) || '';
  try { mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined); } catch (_) { release(); clearBar(); setState('idle'); ctx.toast?.('Nahrávanie nie je v tomto zariadení dostupné.', true); return; }
  mr.ondataavailable = e => { if (e.data?.size) chunks.push(e.data); };
  mr.onstop = async () => {
    const mime = mr?.mimeType || type || 'audio/mp4', parts = chunks; chunks = []; release();
    if (cancelled || !parts.length) { clearBar(); setState('idle'); return; }
    setState('busy'); setBar('Prepisujem hlasovku...', true, false);
    try {
      const blob = new Blob(parts, { type: mime });
      if (blob.size < 1500) throw new Error('Nahrávka je príliš krátka. Skús to znova.');
      const b64 = await new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(String(f.result).split(',')[1] || ''); f.onerror = () => rej(new Error('Nahrávku sa nepodarilo načítať.')); f.readAsDataURL(blob); });
      const { data, error } = await db.sb.functions.invoke('voice-stt', { body: { audio: b64, mime, lang: currentLang() } });
      if (error) { let msg = 'Hlasovku sa nepodarilo prepísať.'; try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { /* nič */ } throw new Error(msg); }
      if (data?.error) throw new Error(data.error);
      const txt = String(data?.text || '').trim();
      clearBar(); setState('idle');
      if (!txt) { ctx.toast?.('Nič som nerozoznal. Skús to znova a hovor bližšie k telefónu.', true); return; }
      sendText(txt);
    } catch (e) { clearBar(); setState('idle'); ctx.toast?.(e.message || 'Hlasovku sa nepodarilo prepísať.', true); }
  };
  mr.start(); setState('rec'); setBar('Nahrávam... ťukni na štvorček, keď skončíš', true, true);
  timer = setTimeout(() => finish(false), 90000);
}

function onMic() {
  if (state === 'busy') return;
  if (state === 'rec') { finish(false); return; }
  stopSpeak(); unlockTts();
  const first = (standalone() && /iPhone|iPad|iPod/.test(navigator.userAgent)) || preferRec() || !SR;
  if (first && canRec) startRecord(); else if (SR) startSpeech(); else ctx.toast?.('Hlasové správy tento prehliadač nepodporuje.', true);
}

function decorateForm(f) {
  if (f.dataset.vx || (!SR && !canRec)) return;
  f.dataset.vx = '1'; form = f;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'vx-mic'; b.innerHTML = ICO_MIC; b.setAttribute('aria-label', 'Hlasová správa');
  b.onclick = onMic; mic = b;
  f.insertBefore(b, f.querySelector('.bd-send'));
  state = 'idle';
}

const scan = () => {
  const panel = document.querySelector('.bd-panel');
  if (!panel) { if (state !== 'idle') { cancelled = true; finish(true); } stopSpeak(); voiceReply = false; mic = null; form = null; bar = null; return; }
  const f = panel.querySelector('.bd-form'); if (f) { if (f !== form) { mic = null; bar = null; } decorateForm(f); }
  panel.querySelectorAll('.bd-m.coach').forEach(decorate);
  if (voiceReply && panel.querySelector('.bd-m.err:last-child')) voiceReply = false;
};
new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopSpeak(); if (state === 'rec') finish(true); } });
scan();
