// GainTrain: nový názov a logo bez prepisovania starších súborov.
// Vymení text „Fuelwind" za „GainTrain" všade, kde sa zobrazí v appke, a na prihlasovacej obrazovke ukáže nové logo (nápis).
// Je to dočasná vrstva: keď sa názov prepíše priamo v súboroch, tento modul sa dá zmazať.
import { WORDMARK } from './brand.js';

const OLD = 'Fuelwind', NEW = 'GainTrain';
// ikona (SVG aj PNG) sa generuje z tabulky app_assets cez funkciu app-icon
const ICON = 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/app-icon';
const CSS = `.ah-brand .gt-word{height:24px;width:auto;display:block;color:var(--text)}
.ah-brand img{box-shadow:0 6px 18px rgba(255,90,31,.25)!important}`;
if (!document.getElementById('gt-css')) { const s = document.createElement('style'); s.id = 'gt-css'; s.textContent = CSS; document.head.appendChild(s); }

function head() {
  if (document.title.includes(OLD)) document.title = document.title.split(OLD).join(NEW);
  const m = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (m && m.content !== NEW) m.content = NEW;
  const fav = document.querySelector('link[rel="icon"]');
  if (fav && !fav.href.includes('app-icon')) { fav.href = ICON + '?svg=1&v=3'; fav.type = 'image/svg+xml'; }
  const ati = document.querySelector('link[rel="apple-touch-icon"]');
  if (ati && !ati.href.includes('v=3')) ati.href = ICON + '?v=3';
  document.querySelectorAll('img[src="icon.svg"]').forEach(i => { i.src = ICON + '?size=192&v=3'; });
}

function fixText(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (root.nodeValue.includes(OLD)) root.nodeValue = root.nodeValue.split(OLD).join(NEW); return; }
  if (root.nodeType !== 1 || root.closest?.('input,textarea,[contenteditable]')) return;
  if (!(root.textContent || '').includes(OLD)) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) if (n.nodeValue.includes(OLD)) n.nodeValue = n.nodeValue.split(OLD).join(NEW);
}

function brand() {
  const b = document.querySelector('.ah-brand');
  if (b && !b.querySelector('.gt-word')) { b.classList.add('notranslate'); b.innerHTML = WORDMARK; }
}

function run(muts) {
  if (muts) for (const m of muts) { if (m.type === 'characterData') fixText(m.target); else m.addedNodes.forEach(fixText); }
  else fixText(document.body);
  brand(); head();
}
run();
new MutationObserver(run).observe(document.body, { childList: true, subtree: true, characterData: true });
