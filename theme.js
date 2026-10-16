// Svetlý a tmavý režim. Predvolene sa riadi nastavením iPhonu (Automaticky), v Profile sa dá zvoliť natrvalo Svetlý alebo Tmavý.
// Appka je navrhnutá tmavá. Svetlý vzhľad sa skladá automaticky: pre každé pravidlo štýlu, ktoré nastavuje farbu, vznikne
// jeho svetlá verzia (tmavé plochy zosvetlia, svetlý text stmavne, žiarivé farby na texte stmavnú kvôli čitateľnosti).
// Hlavné farby appky (pozadie, karty, text, akcent) majú ručne vyladené svetlé hodnoty v index.html.
const KEY = 'fw_theme';
const H = document.documentElement;
const P = 'html[data-theme=light]';
const OWN = new Set(['--bg', '--bg-2', '--card', '--card-2', '--line', '--text', '--muted', '--accent', '--accent-ink', '--accent-2', '--protein', '--carbs', '--fat', '--danger']);

export function getMode() { try { return localStorage.getItem(KEY) || 'auto'; } catch (_) { return 'auto'; } }
const mq = matchMedia('(prefers-color-scheme: light)');
const resolve = m => (m === 'auto' ? (mq.matches ? 'light' : 'dark') : m);

// ---------- farby ----------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function parse(tok) {
  tok = tok.trim().toLowerCase();
  if (tok === 'white') return [255, 255, 255, 1];
  if (tok === 'black') return [0, 0, 0, 1];
  if (tok[0] === '#') {
    let x = tok.slice(1);
    if (x.length === 3 || x.length === 4) x = x.split('').map(c => c + c).join('');
    if (x.length !== 6 && x.length !== 8) return null;
    const n = i => parseInt(x.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), x.length === 8 ? n(6) / 255 : 1];
  }
  const m = tok.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const p = m[1].replace(/\//g, ' ').split(/[\s,]+/).filter(Boolean);
  if (p.length < 3) return null;
  const ch = s => s.endsWith('%') ? parseFloat(s) * 2.55 : parseFloat(s);
  const a = p[3] == null ? 1 : p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
  return [ch(p[0]), ch(p[1]), ch(p[2]), a];
}
function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l, 0];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l, d];
}
function fromHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const out = (rgb, a) => { const [r, g, b] = rgb.map(v => Math.round(clamp(v, 0, 255))); return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`; };
const INK = [16, 24, 40];

// text (a čiary SVG): svetlý text stmavne, žiarivé farby stmavnú tak, aby boli čitateľné na bielej
function fg(c) {
  const [r, g, b, a] = c; if (!a) return null;
  const [h, s, l, chroma] = toHsl(r, g, b);
  if (l <= 0.55) return null;
  if (chroma < 0.15) return out(fromHsl(h, Math.min(s, 0.25), clamp(0.95 - 0.85 * l, 0.08, 0.5)), a);
  return out(fromHsl(h, Math.min(s, 0.75), 0.33), a);
}
// plochy a orámovanie: tmavé zosvetlia, priesvitné biele a čierne vrstvy sa otočia na jemné tmavé
function bg(c) {
  const [r, g, b, a] = c; if (!a) return null;
  if (r > 200 && g > 200 && b > 200 && a < 1) return out(INK, a * 0.6);
  if (r < 30 && g < 30 && b < 30 && a < 0.8) return out(INK, a >= 0.45 ? a * 0.6 : a * 0.18); // stmievanie pod oknom ostane, jemné výplne zoslabnú
  const [h, s, l] = toHsl(r, g, b);
  if (l >= 0.4) return null;
  return out(fromHsl(h, Math.min(s, 0.6), clamp(1 - l * 0.55, 0.8, 0.985)), a);
}
// tiene: čierne slabšie, farebné žiary jemnejšie
function sh(c) {
  const [r, g, b, a] = c; if (!a) return null;
  const [, , l, chroma] = toHsl(r, g, b);
  if (r > 200 && g > 200 && b > 200) return null;
  if (l < 0.25 && chroma < 0.15) return out(INK, a * 0.35);
  return out([r, g, b], a * 0.6);
}
// vlastné premenné (napr. farba svalu na karte cviku): žiarivé stmavnú, neutrálne podľa jasu
function cv(c) {
  const [r, g, b, a] = c; if (!a) return null;
  const [, , l, chroma] = toHsl(r, g, b);
  if (chroma >= 0.15 && l > 0.55) return fg(c);
  if (chroma < 0.15 && l < 0.35) return bg(c);
  if (chroma < 0.15 && l > 0.7) return fg(c);
  return null;
}
const TOK = /#[0-9a-f]{3,8}\b|rgba?\([^()]*\)|\b(?:white|black)\b/gi;
const conv = (v, fn) => v.replace(TOK, t => { const c = parse(t); return (c && fn(c)) || t; });

function kind(p) {
  if (p.startsWith('--')) return 'cv';
  if (/^(color|-webkit-text-fill-color|caret-color|fill|stroke|text-decoration|text-decoration-color|text-emphasis-color)$/.test(p)) return 'fg';
  if (/^(box-shadow|text-shadow|filter|-webkit-filter)$/.test(p)) return 'sh';
  if (/^background|^border(?!-radius|-width|-style|-collapse|-spacing|-image)|^outline(?!-offset|-width|-style)|^column-rule/.test(p)) return 'bg';
  return null;
}
const FN = { fg, bg, sh, cv };
function decls(text) {
  const res = []; let depth = 0, cur = '', q = null;
  for (const ch of text) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(') depth++; else if (ch === ')') depth--;
    if (ch === ';' && !depth) { res.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) res.push(cur);
  return res.map(d => { const i = d.indexOf(':'); if (i < 0) return null; const prop = d.slice(0, i).trim(); let val = d.slice(i + 1).trim(); const imp = /!important\s*$/i.test(val); if (imp) val = val.replace(/!important\s*$/i, '').trim(); return [prop.startsWith('--') ? prop : prop.toLowerCase(), val, imp]; }).filter(Boolean);
}
function lightDecls(cssText, keepAll) {
  const outD = [];
  for (const [p, v, imp] of decls(cssText)) {
    const k = kind(p); if (!k) continue;
    if (k === 'cv' && OWN.has(p)) continue;
    const nv = conv(v, FN[k]);
    if (!keepAll && nv === v) continue;
    outD.push(`${p}:${nv}${imp ? ' !important' : ''}`);
  }
  return outD;
}
function splitSel(sel) {
  const parts = []; let depth = 0, cur = '';
  for (const ch of sel) { if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth--; if (ch === ',' && !depth) { parts.push(cur); cur = ''; } else cur += ch; }
  parts.push(cur);
  return parts.map(s => s.trim()).filter(Boolean);
}
function scope(sel) {
  return splitSel(sel).map(s => {
    if (/^:root\b/.test(s)) return P + s.slice(5);
    if (/^html\b/.test(s)) return P + s.slice(4);
    return `${P} ${s}`;
  }).join(',');
}
function rulesText(rules) {
  let txt = '';
  for (const r of rules) {
    try {
      if (r.type === 1) { // CSSStyleRule
        const d = lightDecls(r.style.cssText, true);
        if (d.length) txt += `${scope(r.selectorText)}{${d.join(';')}}\n`;
      } else if (r.type === 4 && r.cssRules) { // @media
        const inner = rulesText(r.cssRules); if (inner) txt += `@media ${r.conditionText || r.media.mediaText}{${inner}}\n`;
      } else if (r.type === 12 && r.cssRules) { // @supports
        const inner = rulesText(r.cssRules); if (inner) txt += `@supports ${r.conditionText}{${inner}}\n`;
      }
    } catch (_) { /* nečitateľné pravidlo preskočíme */ }
  }
  return txt;
}

// ---------- svetlé štýly ku každému štýlu appky ----------
const done = new WeakSet();
function processSheets() {
  for (const s of [...document.styleSheets]) {
    const owner = s.ownerNode;
    if (!owner || done.has(owner) || owner.dataset?.fwLight != null) continue;
    let rules; try { rules = s.cssRules; } catch (_) { done.add(owner); continue; } // cudzia doména (fonty)
    if (!rules) continue;
    done.add(owner);
    const txt = rulesText(rules);
    if (!txt) continue;
    const el = document.createElement('style'); el.dataset.fwLight = ''; el.textContent = txt;
    document.head.appendChild(el);
  }
}

// ---------- farby priamo v prvkoch (style="...") ----------
const inl = new WeakMap(), tracked = new Set();
function fixInline(el) {
  const cur = el.getAttribute('style'); if (cur == null) return;
  const rec = inl.get(el);
  if (rec && cur === rec.out) return; // náš vlastný zápis
  const orig = cur;
  const d = lightDecls(orig, false);
  if (!d.length) { inl.delete(el); return; }
  let txt = orig;
  for (const line of d) { const i = line.indexOf(':'); el.style.setProperty(line.slice(0, i), line.slice(i + 1).replace(/ !important$/, ''), / !important$/.test(line) ? 'important' : ''); }
  txt = el.getAttribute('style');
  inl.set(el, { orig, out: txt }); tracked.add(el);
}
function restoreInline() {
  for (const el of tracked) { const rec = inl.get(el); if (rec && el.isConnected && el.getAttribute('style') === rec.out) el.setAttribute('style', rec.orig); inl.delete(el); }
  tracked.clear();
}
function scanInline(root) {
  if (root.nodeType !== 1) return;
  if (root.hasAttribute('style')) fixInline(root);
  root.querySelectorAll?.('[style]').forEach(fixInline);
}

// ---------- prepínanie ----------
let obs = null;
function setMeta(t) {
  let m = document.querySelector('meta[name="theme-color"]');
  if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
  m.content = t === 'light' ? '#F3F5F8' : '#0B0E12';
}
function apply() {
  const t = resolve(getMode());
  H.dataset.theme = t;
  H.style.background = '';
  setMeta(t);
  if (t === 'light') {
    processSheets();
    scanInline(document.body);
    if (!obs) {
      obs = new MutationObserver(recs => {
        if (H.dataset.theme !== 'light') return;
        let sheets = false;
        for (const r of recs) {
          if (r.type === 'attributes') { if (r.target.nodeType === 1) fixInline(r.target); continue; }
          r.addedNodes.forEach(n => { if (n.nodeName === 'STYLE' || n.nodeName === 'LINK') sheets = true; else scanInline(n); });
        }
        if (sheets) { processSheets(); setTimeout(processSheets, 300); }
      });
      obs.observe(H, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
      document.querySelectorAll('link[rel=stylesheet]').forEach(l => l.addEventListener('load', processSheets));
    }
  } else {
    restoreInline();
  }
}
export function setMode(m) { try { localStorage.setItem(KEY, m); } catch (_) { } apply(); }
mq.addEventListener?.('change', () => { if (getMode() === 'auto') apply(); });
apply();
window.addEventListener('load', () => { if (H.dataset.theme === 'light') processSheets(); });

// ---------- výber v Profile ----------
const LABEL = { auto: 'Automaticky', light: 'Svetlý', dark: 'Tmavý' };
function profileUi() {
  const tiles = document.querySelector('#app .pfx-root .pfx-tiles');
  const outBtn = document.querySelector('#app #out');
  let card = document.querySelector('#fwTheme');
  if (!tiles && !outBtn) return;
  if (!card) {
    card = document.createElement('div');
    card.className = 'card'; card.id = 'fwTheme'; card.style.marginTop = '14px';
    card.innerHTML = `<b>Vzhľad</b><div class="seg" style="margin-top:10px">${Object.entries(LABEL).map(([k, v]) => `<button type="button" data-th="${k}">${v}</button>`).join('')}</div><p class="muted small" style="margin:8px 2px 0">Automaticky sa riadi tým, či máš iPhone v svetlom alebo tmavom režime.</p>`;
    const mark = () => card.querySelectorAll('[data-th]').forEach(b => b.classList.toggle('on', b.dataset.th === getMode()));
    card.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { setMode(b.dataset.th); mark(); });
    mark();
  }
  if (tiles) { if (card.previousElementSibling !== tiles) tiles.after(card); }
  else if (!card.isConnected) outBtn.parentNode.insertBefore(card, outBtn);
}
const app = document.getElementById('app');
if (app) new MutationObserver(profileUi).observe(app, { childList: true, subtree: true });
