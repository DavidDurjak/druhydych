// Obrazovka Jedlo: jedno pole namiesto dvoch (vyhľadávanie + AI zápis).
// Písanie = obyčajné hľadanie v databáze (zadarmo, bez AI), Enter tiež len hľadá.
// AI sa zavolá IBA keď človek sám ťukne na AI: tlačidlo ✦ AI pri poli, riadok „Zapísať celé cez AI“ pod výsledkami,
// Nadiktovať alebo Odfotiť. Čiarový kód je v tej istej karte (zadarmo).
const CSS = `
.screen:has(#mealseg) .input-row:has(#q){position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);margin:0;padding:0;border:0}
.screen:has(#mealseg) .ai-box .jai-ch{display:none!important}
.ob-box .ai-in{position:relative}
.ob-box .ob-mag{position:absolute;left:13px;top:13px;width:20px;height:20px;color:var(--muted);pointer-events:none}
.ob-box #aiText{padding-left:42px}
.ob-box #aiGo{display:none}
.ob-box.ob-meal #aiGo{display:grid;width:auto;padding:0 14px;font-size:14px;font-weight:800;color:#0B0E12;background:linear-gradient(135deg,#7CFFB2,#5BB8FF);gap:4px;grid-auto-flow:column;align-items:center}
.ob-box .ai-spark{font-size:0}
.ob-box .ai-spark::before{content:'';width:15px;height:15px;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E") center/contain no-repeat}
.obx-act{display:flex;gap:8px;margin:12px 0 0}
.obx-act>*{flex:1 1 0;min-width:0;width:auto!important;height:44px!important;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:14px;border:1px solid color-mix(in srgb,var(--text) 14%,transparent);
  background:color-mix(in srgb,var(--text) 6%,transparent);color:var(--text);font:inherit;font-size:13px;font-weight:700;cursor:pointer;-webkit-appearance:none;appearance:none;padding:0 8px;white-space:nowrap;position:relative;overflow:hidden;isolation:isolate}
.obx-act>*:active{transform:scale(.95)}
.obx-act>*::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(110deg,transparent 30%,color-mix(in srgb,var(--c) 26%,transparent) 50%,transparent 70%);transform:translateX(-120%);animation:obSh 4.5s ease-in-out infinite;animation-delay:var(--d)}
@keyframes obSh{0%,60%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
.obx-act .ob-i{position:relative;width:22px;height:22px;flex:none;display:grid;place-items:center;color:var(--c)}
.obx-act .ob-i svg{width:20px;height:20px}
.ob-mic .ob-i::before,.ob-mic .ob-i::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--c);opacity:0;animation:obWave 2.4s ease-out infinite}
.ob-mic .ob-i::after{animation-delay:1.2s}
@keyframes obWave{0%{transform:scale(.6);opacity:.7}100%{transform:scale(1.5);opacity:0}}
.obx-act .ai-mic.rec{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.obx-act .ai-mic.rec .ob-i{color:var(--accent-ink)}
.ob-cam .ob-i::after{content:'';position:absolute;inset:-4px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--c) 70%,#fff) 0,transparent 65%);opacity:0;animation:obFlash 3.6s ease-in-out infinite}
@keyframes obFlash{0%,82%,100%{opacity:0;transform:scale(.5)}88%{opacity:.9;transform:scale(1.1)}}
.ob-bar .ob-i::after{content:'';position:absolute;left:1px;right:1px;height:2px;border-radius:2px;background:var(--c);box-shadow:0 0 8px var(--c);top:3px;animation:obScan 1.8s ease-in-out infinite}
@keyframes obScan{0%,100%{top:3px}50%{top:17px}}
.obx-act .ob-ai-tag{position:absolute;top:3px;right:4px;font-size:8px;line-height:1.2;font-weight:900;padding:1px 4px;border-radius:6px;background:linear-gradient(135deg,#7CFFB2,#5BB8FF);color:#0B0E12;letter-spacing:.02em}
.obx-act #scan::after{display:none}
.ob-hide{display:none!important}
.ob-ai{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px;margin:8px 0 4px;border-radius:16px;border:1px dashed color-mix(in srgb,var(--accent) 55%,transparent);
  background:color-mix(in srgb,var(--accent) 7%,transparent);color:var(--text);font:inherit;cursor:pointer;-webkit-appearance:none;appearance:none}
.ob-ai i{font-style:normal;width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:11px;background:linear-gradient(135deg,#7CFFB2,#5BB8FF);color:#0B0E12;font-weight:900}
.ob-ai b{display:block;font-size:14px}.ob-ai span{display:block;font-size:12px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ob-ai div{min-width:0;flex:1}
@media (prefers-reduced-motion:reduce){.obx-act *,.obx-act>*::before{animation:none!important}}
`;
if (!document.getElementById('ob-css')) { const s = document.createElement('style'); s.id = 'ob-css'; s.textContent = CSS; document.head.appendChild(s); }

const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const BAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M16 8v8"/></svg>';
const MAG = '<svg class="ob-mag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
const HINTS = ['tvaroh', 'kuracie prsia', 'ovsené vločky', 'skyr', 'banán', 'bryndzové halušky', 'ryža basmati', 'proteínová tyčinka', 'avokádo'];
const h = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// text, ktorý vyzerá ako celé jedlo (viac položiek alebo množstvo): ponúkneme tlačidlo ✦ AI
const isMeal = t => /\d|,|\+|\s(a|s|so|and)\s/i.test(t) || t.trim().split(/\s+/).length >= 3;

// pohyblivý text v prázdnom poli: Hľadaj: tvaroh| ... zmaže sa a napíše ďalšie jedlo
function typeLoop(ta) {
  let i = 0, j = 0, dir = 1, wait = 0;
  const tm = setInterval(() => {
    if (!ta.isConnected) { clearInterval(tm); return; }
    if (document.activeElement === ta || ta.value) { if (ta.placeholder !== 'Hľadaj jedlo alebo produkt') ta.placeholder = 'Hľadaj jedlo alebo produkt'; return; }
    if (wait > 0) { wait--; return; }
    const w = HINTS[i];
    j += dir; ta.placeholder = 'Hľadaj: ' + w.slice(0, Math.max(0, j)) + (j > 0 ? '|' : '');
    if (dir === 1 && j >= w.length) { dir = -1; wait = 18; }
    else if (dir === -1 && j <= 0) { dir = 1; i = (i + 1) % HINTS.length; wait = 4; }
  }, 70);
}

function setup(box, q) {
  if (box.dataset.ob) return;
  box.dataset.ob = '1';
  const ta = box.querySelector('#aiText'), go = box.querySelector('#aiGo'), inRow = box.querySelector('.ai-in');
  const scan = document.querySelector('#scan');
  if (!ta || !go || !inRow) return;
  box.classList.add('ob-box');
  const title = box.querySelector('.ai-top b');
  if (title) title.textContent = 'Hľadaj alebo zapíš, čo si jedol';
  ta.setAttribute('enterkeyhint', 'search');
  inRow.insertAdjacentHTML('afterbegin', MAG);
  go.innerHTML = '✦ AI'; go.setAttribute('aria-label', 'Zapísať celé cez AI');
  typeLoop(ta);
  // tlačidlá pod poľom: diktovanie a fotka (AI), čiarový kód (bez AI)
  const act = document.createElement('div'); act.className = 'obx-act';
  const mic = box.querySelector('#aiMic'), cam = box.querySelector('label.ai-cam');
  const tag = '<span class="ob-ai-tag">AI</span>';
  if (mic) { mic.classList.add('ob-mic'); mic.style.cssText = '--c:#FF8FB1;--d:0s'; mic.innerHTML = `<span class="ob-i">${MIC}</span><span>Nadiktovať</span>${tag}`; act.appendChild(mic); }
  if (cam) { cam.classList.add('ob-cam'); cam.style.cssText = '--c:#FFC857;--d:.6s'; [...cam.querySelectorAll('svg')].forEach(s => s.remove()); cam.insertAdjacentHTML('beforeend', `<span class="ob-i">${CAM}</span><span>Odfotiť</span>${tag}`); act.appendChild(cam); }
  if (scan) { scan.className = 'ob-bar'; scan.style.cssText = '--c:#7CFFB2;--d:1.2s'; scan.innerHTML = `<span class="ob-i">${BAR}</span><span>Kód</span>`; act.appendChild(scan); }
  inRow.after(act);

  // písanie v karte = hľadanie v databáze (skryté pole #q robí všetko ostatné ako doteraz)
  const between = () => { const out = []; let n = box.nextElementSibling; while (n && !n.querySelector?.('#results') && n.id !== 'results') { out.push(n); n = n.nextElementSibling; } return out; };
  const sync = () => {
    const t = ta.value.trim();
    if (q.value !== t) { q.value = t; q.dispatchEvent(new Event('input', { bubbles: true })); }
    box.classList.toggle('ob-meal', !!t && isMeal(t));
    // počas hľadania sú výsledky hneď pod kartou
    between().forEach(el => el.classList.toggle('ob-hide', !!t));
    aiRow();
  };
  ta.addEventListener('input', sync);
  // Enter vždy len hľadá (zadarmo); AI iba cez tlačidlá AI
  box.addEventListener('keydown', e => {
    if (e.target !== ta || e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault(); e.stopPropagation(); ta.blur();
  }, true);
  // keď appka chce kurzor v hľadaní (napr. odkaz ?q=1), dáme ho do karty
  q.addEventListener('focus', () => ta.focus());

  // pod výsledkami z databázy: ak človek nenašiel, môže zapísať celé cez AI
  const res = document.querySelector('#results');
  function aiRow() {
    if (!res) return;
    const t = ta.value.trim(), cur = res.querySelector('.ob-ai');
    if (!t) { cur?.remove(); return; }
    if (cur) { cur.querySelector('span').textContent = '„' + t + '“'; if (res.lastElementChild !== cur) res.appendChild(cur); return; }
    res.insertAdjacentHTML('beforeend', `<button type="button" class="ob-ai"><i>✦</i><div><b>Nenašiel si to? Zapíš celé cez AI</b><span>„${h(t)}“</span></div></button>`);
    res.querySelector('.ob-ai').onclick = () => go.click();
  }
  if (res) new MutationObserver(() => { if (ta.value.trim() && res.lastElementChild?.className !== 'ob-ai') aiRow(); }).observe(res, { childList: true });
  // po zápise cez AI sa pole vyprázdni: vrátime aj zoznam Naposledy
  new MutationObserver(() => { if (!ta.value.trim() && q.value) sync(); }).observe(box, { attributes: true, attributeFilter: ['class'] });
}

function tune() {
  const box = document.querySelector('.screen:has(#mealseg) #aiBox'), q = document.querySelector('#q');
  if (box && q) setup(box, q);
}
new MutationObserver(tune).observe(document.documentElement, { childList: true, subtree: true });
tune();
