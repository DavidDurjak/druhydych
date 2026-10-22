// Obrazovka Jedlo: jedno pole namiesto dvoch (vyhľadávanie + AI zápis).
// Píšeš do AI karty a hneď pod ňou sa ukazujú výsledky z databázy (zadarmo, bez AI).
// AI sa zavolá len vtedy, keď ťukneš na šípku, na riadok „Zapísať celé cez AI“, nadiktuješ alebo odfotíš jedlo,
// alebo stlačíš Enter pri texte s viacerými položkami či množstvom („2 vajcia a rožok“). Čiarový kód je v tej istej karte.
const CSS = `
.screen:has(#mealseg) .input-row:has(#q){position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);margin:0;padding:0;border:0}
.screen:has(#mealseg) .ai-box .jai-ch{display:none!important}
.ob-act{display:flex;gap:8px;margin:12px 0 0}
.ob-act>*{flex:1 1 0;min-width:0;width:auto!important;height:42px!important;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:14px;border:1px solid color-mix(in srgb,var(--text) 14%,transparent);
  background:color-mix(in srgb,var(--text) 6%,transparent);color:var(--text);font:inherit;font-size:13px;font-weight:700;cursor:pointer;-webkit-appearance:none;appearance:none;padding:0 8px;white-space:nowrap;position:relative;overflow:hidden}
.ob-act>*:active{transform:scale(.96)}
.ob-act svg{width:19px;height:19px;flex:none}
.ob-act .ai-mic.rec{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.ob-act #scan{width:auto}
.ob-act #scan::after{display:none}
.ob-hide{display:none!important}
.ob-ai{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 12px;margin:0 0 6px;border-radius:16px;border:1px dashed color-mix(in srgb,var(--accent) 55%,transparent);
  background:color-mix(in srgb,var(--accent) 8%,transparent);color:var(--text);font:inherit;cursor:pointer;-webkit-appearance:none;appearance:none}
.ob-ai i{font-style:normal;width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:11px;background:linear-gradient(135deg,#7CFFB2,#5BB8FF);color:#0B0E12;font-weight:900}
.ob-ai b{display:block;font-size:14px}.ob-ai span{display:block;font-size:12px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ob-ai div{min-width:0;flex:1}
`;
if (!document.getElementById('ob-css')) { const s = document.createElement('style'); s.id = 'ob-css'; s.textContent = CSS; document.head.appendChild(s); }

const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const BAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M16 8v8"/></svg>';
const h = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// text, ktorý je zrejme celé jedlo (viac položiek alebo množstvo), patrí AI; jedno slovo je hľadanie
const isMeal = t => /\d|,|\+|\s(a|s|so|and)\s/i.test(t) || t.trim().split(/\s+/).length >= 3;

function setup(box, q) {
  if (box.dataset.ob) return;
  box.dataset.ob = '1';
  const ta = box.querySelector('#aiText'), go = box.querySelector('#aiGo'), inRow = box.querySelector('.ai-in');
  const scan = document.querySelector('#scan');
  if (!ta || !go || !inRow) return;
  const title = box.querySelector('.ai-top b');
  if (title) title.textContent = 'Hľadaj alebo napíš, čo si jedol';
  ta.placeholder = 'napr. tvaroh alebo 2 vajcia a rožok';
  ta.setAttribute('enterkeyhint', 'search');
  // tlačidlá pod poľom: diktovanie, fotka (AI) a čiarový kód
  const act = document.createElement('div'); act.className = 'ob-act';
  const mic = box.querySelector('#aiMic'), cam = box.querySelector('label.ai-cam');
  if (mic) { mic.innerHTML = MIC + '<span>Nadiktovať</span>'; act.appendChild(mic); }
  if (cam) { [...cam.querySelectorAll('svg')].forEach(s => s.remove()); cam.insertAdjacentHTML('beforeend', CAM + '<span>Odfotiť</span>'); act.appendChild(cam); }
  if (scan) { scan.className = ''; scan.innerHTML = BAR + '<span>Kód</span>'; act.appendChild(scan); }
  inRow.after(act);

  // písanie v karte = hľadanie v databáze (skryté pole #q robí všetko ostatné ako doteraz)
  const screen = box.closest('.screen');
  const between = () => { const out = []; let n = box.nextElementSibling; while (n && !n.querySelector?.('#results') && n.id !== 'results') { out.push(n); n = n.nextElementSibling; } return out; };
  const sync = () => {
    const t = ta.value.trim();
    if (q.value !== t) { q.value = t; q.dispatchEvent(new Event('input', { bubbles: true })); }
    // počas hľadania sú výsledky hneď pod kartou
    between().forEach(el => el.classList.toggle('ob-hide', !!t));
    aiRow();
  };
  ta.addEventListener('input', sync);
  // Enter: jedno slovo len hľadá (zadarmo), celé jedlo pošle AI
  box.addEventListener('keydown', e => {
    if (e.target !== ta || e.key !== 'Enter' || e.shiftKey) return;
    if (!isMeal(ta.value)) { e.preventDefault(); e.stopPropagation(); ta.blur(); }
  }, true);
  // keď appka chce kurzor v hľadaní (napr. odkaz ?q=1), dáme ho do karty
  q.addEventListener('focus', () => ta.focus());

  // prvý riadok výsledkov: zapísať celé cez AI
  const res = document.querySelector('#results');
  function aiRow() {
    if (!res) return;
    const t = ta.value.trim(), cur = res.querySelector('.ob-ai');
    if (!t) { cur?.remove(); return; }
    if (cur) { cur.querySelector('span').textContent = '„' + t + '“'; if (res.firstElementChild !== cur) res.prepend(cur); return; }
    res.insertAdjacentHTML('afterbegin', `<button type="button" class="ob-ai"><i>✦</i><div><b>Zapísať celé cez AI</b><span>„${h(t)}“</span></div></button>`);
    res.querySelector('.ob-ai').onclick = () => go.click();
  }
  if (res) new MutationObserver(() => { if (ta.value.trim() && res.firstElementChild?.className !== 'ob-ai') aiRow(); }).observe(res, { childList: true });
  // po zápise cez AI sa pole vyprázdni: vrátime aj zoznam Naposledy
  new MutationObserver(() => { if (!ta.value.trim() && q.value) sync(); }).observe(box, { attributes: true, attributeFilter: ['class'] });
  screen?.classList.add('ob');
}

function tune() {
  const box = document.querySelector('.screen:has(#mealseg) #aiBox'), q = document.querySelector('#q');
  if (box && q) setup(box, q);
}
new MutationObserver(tune).observe(document.documentElement, { childList: true, subtree: true });
tune();
