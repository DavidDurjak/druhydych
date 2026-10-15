// v0.8: AI logovanie. Napíš alebo odfoť, čo si jedol; AI rozpozná položky a gramy, hodnoty berieme z databázy.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const state = () => ctx.state;
const h = (...a) => ctx.h(...a), r0 = (...a) => ctx.r0(...a), toast = (...a) => ctx.toast(...a), sheet = (...a) => ctx.sheet(...a);
const MEALS = () => ctx.MEALS;
const r1 = v => Math.round(Number(v || 0) * 10) / 10;

const IOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
// mikrofón: štýl je tu, aby sa nemuselo meniť celé v08.css
if (typeof document !== 'undefined' && !document.getElementById('v10css')) {
  const st = document.createElement('style'); st.id = 'v10css';
  st.textContent = '.ai-mic{-webkit-appearance:none;appearance:none}.ai-mic.rec{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);animation:aiPulse 1.1s ease-in-out infinite}@keyframes aiPulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 6px color-mix(in srgb,var(--accent) 28%,transparent)}}@media (prefers-reduced-motion:reduce){.ai-mic.rec{animation:none}}.ai-grp{display:flex;justify-content:space-between;align-items:baseline;margin:14px 2px 6px;font-size:13px;font-weight:700}.ai-grp span{font-weight:500;color:var(--muted)}.ai-ms{margin-top:6px}.ai-ms select{font:inherit;font-size:12.5px;padding:4px 8px;border-radius:10px;border:1px solid var(--line,#ddd);background:transparent;color:inherit}';
  document.head.appendChild(st);
}
const EXAMPLES = ['2 vajcia a rožok', '150 g kuracieho a ryža', 'bryndzové halušky', 'skyr a banán', 'kebab a kofola', 'ráno 2 vajcia a chlieb, na obed kuracie s ryžou'];

// Karta s AI vstupom na obrazovke Jedlo
export function aiBoxHtml() {
  const ex = EXAMPLES[new Date().getMinutes() % EXAMPLES.length];
  return `<section class="ai-box" id="aiBox">
    <div class="ai-top"><span class="ai-spark">✦</span><b>${SR ? 'Napíš, nadiktuj alebo odfoť, čo si jedol' : 'Napíš alebo odfoť, čo si jedol'}</b></div>
    <div class="ai-in">
      <textarea id="aiText" rows="1" placeholder="napr. ${h(ex)}" enterkeyhint="send" maxlength="1600"></textarea>
      ${SR ? '<button type="button" class="ai-cam ai-mic" id="aiMic" aria-label="Nadiktovať jedlo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>' : ''}
      <label class="ai-cam" aria-label="Odfotiť jedlo"><input type="file" id="aiPhoto" accept="image/*" hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></label>
      <button class="ai-go" id="aiGo" aria-label="Zapísať">→</button>
    </div>
  </section>`;
}

export function bindAiBox(root, getMeal, done) {
  const ta = root.querySelector('#aiText'), go = root.querySelector('#aiGo'), ph = root.querySelector('#aiPhoto');
  if (!ta) return;
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; root.querySelector('#aiBox').classList.toggle('has', !!ta.value.trim()); };
  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const send = () => { const t = ta.value.trim(); if (!t) { ta.focus(); return; } openAiLog({ text: t }, getMeal(), done, () => { ta.value = ''; grow(); }); };
  go.onclick = send;
  const mic = root.querySelector('#aiMic');
  if (mic && SR) {
    let rec = null, want = false, base = '', lastAt = 0, startedAt = 0, fatal = false, gotAny = false;
    const finish = () => { want = false; mic.classList.remove('rec'); rec = null; if (ta.value.trim()) send(); else if (!gotAny) ta.focus(); };
    const stop = () => { want = false; try { rec && rec.stop(); } catch (_) { finish(); } };
    const begin = () => {
      const r = new SR(); rec = r; r.lang = 'sk-SK'; r.interimResults = true; r.continuous = true; r.maxAlternatives = 1;
      if (IOS) r.continuous = false; // iOS pri nepretržitom režime často nevráti žiadny text
      let seen = '';
      r.onresult = e => { seen = Array.from(e.results).map(x => x[0].transcript).join(' ').trim(); if (seen) { gotAny = true; lastAt = Date.now(); } ta.value = (base ? base + ' ' : '') + seen; grow(); };
      r.onerror = e => {
        if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture'].includes(e.error)) fatal = true;
        const m = { 'not-allowed': 'Povoľ mikrofón v nastaveniach prehliadača.', 'service-not-allowed': 'Povoľ mikrofón v nastaveniach prehliadača.', 'no-speech': 'Nepočul som nič. Skús znova, alebo použi mikrofón na klávesnici.', 'language-not-supported': 'Slovenčina na diktovanie tu nie je dostupná. Použi mikrofón na klávesnici.', 'network': 'Rozpoznávanie reči potrebuje internet.' }[e.error];
        if (m && (e.error !== 'no-speech' || !gotAny)) toast(m, true);
      };
      // prehliadač diktovanie po paузe ukončí; kým človek hovorí (a nepresiahne ~90 s), potichu ho spustíme znova a text pripíšeme
      r.onend = () => {
        if (seen) base = ((base ? base + ' ' : '') + seen).trim();
        const now = Date.now(), fresh = gotAny ? now - lastAt < 6000 : now - startedAt < 8000;
        if (want && !fatal && now - startedAt < 90000 && fresh) { try { begin(); return; } catch (_) { } }
        finish();
      };
      r.start();
    };
    mic.onclick = () => {
      if (rec) return stop();
      base = ta.value.trim(); want = true; fatal = false; gotAny = false; lastAt = 0; startedAt = Date.now();
      mic.classList.add('rec');
      try { begin(); } catch (_) { want = false; mic.classList.remove('rec'); rec = null; }
    };
  }
  ph.onchange = async () => {
    const f = ph.files?.[0]; ph.value = ''; if (!f) return;
    try { const img = await shrinkToJpeg(f, 768, 0.7); openAiLog({ image: img.b64, preview: img.url, text: ta.value.trim() }, getMeal(), done, () => { ta.value = ''; grow(); }); }
    catch (_) { toast('Fotku sa nepodarilo načítať', true); }
  };
}

function shrinkToJpeg(file, max, q) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', q);
      res({ b64: data.slice(data.indexOf(',') + 1), url: data });
      URL.revokeObjectURL(url);
    };
    img.onerror = rej; img.src = url;
  });
}

async function callAi(payload) {
  const { data, error } = await db.sb.functions.invoke('ai-log', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j?.error) msg = j.error; } catch (_) { }
    throw new Error(msg);
  }
  return data;
}

// Položka -> aktuálne zvolený zdroj hodnôt (databáza alebo odhad AI)
function current(it) {
  if (it.sel >= 0 && it.matches[it.sel]) { const m = it.matches[it.sel]; return { name: m.name, brand: m.brand, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, food_id: m.id, verified: m.verified, src: 'db' }; }
  return { name: it.name, kcal: it.estimate.kcal, protein: it.estimate.protein, carbs: it.estimate.carbs, fat: it.estimate.fat, food_id: null, src: 'ai' };
}

export async function openAiLog(input, meal, done, onSaved) {
  const bg = sheet(`<div class="ai-load">
      ${input.preview ? `<div class="ai-ph"><img src="${input.preview}" alt=""><i class="ai-scan"></i></div>` : `<div class="ai-q">„${h(input.text)}“</div>`}
      <div class="ai-dots"><i></i><i></i><i></i></div>
      <p class="muted small">Rozpoznávam jedlo a hľadám ho v databáze…</p>
    </div>`);
  let res;
  try { res = await callAi({ text: input.text || '', image: input.image || '', mime: 'image/jpeg' }); }
  catch (e) {
    // keď AI nejde, človeka nenecháme v slepej uličke: text pošleme rovno do vyhľadávania
    const q = document.getElementById('q'), canSearch = q && input.text;
    bg.querySelector('.sheet').innerHTML = `<div class="ai-err"><b>Nepodarilo sa</b><p class="muted small mt">${h(e.message)}</p>${canSearch ? '<button class="btn primary mt" data-s>Hľadať „' + h(input.text.slice(0, 24)) + '“ ručne</button>' : ''}<button class="btn mt" data-x>Zavrieť</button></div>`;
    bg.querySelector('[data-x]').onclick = () => bg.remove();
    const sb = bg.querySelector('[data-s]');
    if (sb) sb.onclick = () => { bg.remove(); q.value = input.text; q.dispatchEvent(new Event('input', { bubbles: true })); q.focus(); };
    return;
  }
  const items = (res.items || []).map(it => ({ ...it, meal: MEALS()[it.meal] ? it.meal : '', sel: it.useEstimate || !it.matches?.length ? -1 : 0, open: false, off: false }));
  if (!items.length) {
    bg.querySelector('.sheet').innerHTML = `<div class="ai-err"><b>Nenašiel som žiadne jedlo</b><p class="muted small mt">${h(res.note || 'Skús to napísať inak, napríklad „2 vajcia a chlieb“.')}</p><button class="btn mt" data-x>Zavrieť</button></div>`;
    bg.querySelector('[data-x]').onclick = () => bg.remove();
    return;
  }
  let curMeal = meal;
  const dayMode = items.some(i => i.meal);
  const ORDER = ['breakfast', 'brunch', 'lunch', 'afternoon', 'dinner', 'late', 'snack'].filter(k => MEALS()[k]);
  const eff = it => it.meal || curMeal;
  const cnt = n => `${n} ${n === 1 ? 'položka' : n < 5 ? 'položky' : 'položiek'}`;

  const itemHtml = (it, i) => {
        const c = current(it), s = calc.scale(c, it.grams);
        const low = it.confidence < 0.6;
        return `<div class="ai-it ${low ? 'low' : ''}">
          <div class="ai-it-h">
            <button class="ai-name" data-sw="${i}"><b>${h(c.name)}</b><span class="ai-src ${c.src}">${c.src === 'db' ? (c.verified ? '✓ overené' : 'z databázy') : '≈ odhad AI'}</span>${it.matches.length || c.src === 'db' ? '<i>⇅</i>' : ''}</button>
            <button class="ai-rm" data-rm="${i}" aria-label="Odstrániť">×</button>
          </div>
          ${it.open ? `<div class="ai-alts">${it.matches.map((m, j) => `<button data-pick="${i}:${j}" class="${it.sel === j ? 'on' : ''}"><b>${h(m.name)}${m.verified ? ' ✓' : ''}</b><span>${m.brand ? h(m.brand) + ' · ' : ''}${r0(m.kcal)} kcal/100 g</span></button>`).join('')}<button data-pick="${i}:-1" class="${it.sel === -1 ? 'on' : ''}"><b>${h(it.name)}</b><span>odhad AI · ${r0(it.estimate.kcal)} kcal/100 g</span></button></div>` : ''}
          <div class="ai-it-b">
            <div class="ai-g"><button data-g="${i}:-1" aria-label="Menej">−</button><input data-gi="${i}" type="number" inputmode="numeric" value="${r0(it.grams)}"><span>g</span><button data-g="${i}:1" aria-label="Viac">+</button></div>
            <div class="ai-k"><b>${r0(s.kcal)}</b><span>kcal</span></div>
          </div>
          ${dayMode ? `<div class="ai-ms"><select data-im="${i}" aria-label="Jedlo dňa">${ORDER.map(k => `<option value="${k}"${eff(it) === k ? ' selected' : ''}>${h(MEALS()[k])}</option>`).join('')}</select></div>` : ''}
          <p class="ai-m">${it.portion ? h(it.portion) + ' · ' : ''}B ${r1(s.protein)} · S ${r1(s.carbs)} · T ${r1(s.fat)}${low ? ' · <em>over množstvo</em>' : ''}</p>
        </div>`;
  };

  const draw = () => {
    const live = items.filter(i => !i.off);
    const tot = live.reduce((a, it) => { const s = calc.scale(current(it), it.grams); a.kcal += s.kcal; a.p += s.protein; a.c += s.carbs; a.f += s.fat; return a; }, { kcal: 0, p: 0, c: 0, f: 0 });
    bg.querySelector('.sheet').innerHTML = `
      <div class="row between"><h2>${live.length === 1 ? 'Našiel som 1 položku' : `Našiel som ${live.length} ${live.length < 5 ? 'položky' : 'položiek'}`}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <p class="muted small">Skontroluj gramy, ťukni na názov pre inú položku z databázy.</p>
      ${input.preview ? `<img class="ai-thumb" src="${input.preview}" alt="">` : ''}
      <div class="ai-list">${(dayMode ? ORDER.flatMap(k => { const g = items.map((it, i) => [it, i]).filter(([it]) => !it.off && eff(it) === k); if (!g.length) return []; const kc = g.reduce((a, [it]) => a + calc.scale(current(it), it.grams).kcal, 0); return [`<div class="ai-grp"><b>${h(MEALS()[k])}</b><span>${r0(kc)} kcal</span></div>`, ...g.map(([it, i]) => itemHtml(it, i))]; }) : items.map((it, i) => itemHtml(it, i))).join('')}</div>
      <div class="ai-sum"><div><b>${r0(tot.kcal)} kcal</b><span>B ${r0(tot.p)} g · S ${r0(tot.c)} g · T ${r0(tot.f)} g</span></div></div>
      ${!dayMode || live.some(i => !i.meal) ? `${dayMode ? '<p class="muted small mt">Ostatné položky bez času dňa idú do:</p>' : ''}` : ''}
      ${!dayMode || live.some(i => !i.meal) ? `<div class="seg mt" id="aiMeal">${Object.entries(MEALS()).map(([k, l]) => `<button data-m="${k}" class="${k === curMeal ? 'on' : ''}">${l}</button>`).join('')}</div>` : ''}
      <button class="btn primary mt" id="aiSave" ${live.length ? '' : 'disabled'}>${dayMode ? `Zapísať ${cnt(live.length)}` : `Pridať do: ${MEALS()[curMeal].toLowerCase()}`}</button>`;
    bind();
  };

  const bind = () => {
    const S = bg.querySelector('.sheet');
    S.querySelector('[data-x]').onclick = () => bg.remove();
    S.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const it = items[Number(b.dataset.sw)]; if (!it.matches.length) return; it.open = !it.open; draw(); });
    S.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { const [i, j] = b.dataset.pick.split(':').map(Number); items[i].sel = j; items[i].open = false; draw(); });
    S.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { items[Number(b.dataset.rm)].off = true; draw(); });
    S.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const [i, d] = b.dataset.g.split(':').map(Number); const it = items[i]; const step = it.grams >= 100 ? 10 : 5; it.grams = Math.max(step, Math.round((it.grams + d * step) / step) * step); draw(); });
    S.querySelectorAll('[data-gi]').forEach(inp => inp.onchange = () => { const it = items[Number(inp.dataset.gi)]; it.grams = Math.max(1, Math.min(3000, Number(inp.value) || it.grams)); draw(); });
    S.querySelectorAll('[data-im]').forEach(sel => sel.onchange = () => { items[Number(sel.dataset.im)].meal = sel.value; draw(); });
    S.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { curMeal = b.dataset.m; draw(); });
    S.querySelector('#aiSave').onclick = save;
  };

  const save = async () => {
    const btn = bg.querySelector('#aiSave'); btn.disabled = true; btn.textContent = 'Ukladám…';
    try {
      const live = items.filter(i => !i.off);
      for (const it of live) {
        const c = current(it), s = calc.scale(c, it.grams);
        await db.addFood({ user_id: state().profile.id, date: state().date, meal: eff(it), name: c.name, brand: c.brand || null, grams: r1(it.grams), ...s,
          source: c.src === 'db' ? 'db' : 'ai', barcode: null, food_id: c.food_id, portion: null, qty: null });
        if (c.food_id) db.foodUsed(c.food_id);
      }
      bg.remove(); onSaved && onSaved();
      toast(`Zapísané: ${cnt(live.length)}`);
      done && done(curMeal);
    } catch (e) { toast(e.message, true); btn.disabled = false; btn.textContent = 'Skúsiť znova'; }
  };
  draw();
}
