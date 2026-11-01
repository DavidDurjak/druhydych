// Reklamy (v314). Len pre ľudí bez GainTrain Plus a len keď sú zapnuté v app_config.ads (on + client z Google AdSense).
// Striedmo: jeden banner na konci obrazoviek Pokrok, Správy a Profil. Nikdy počas zápisu jedla alebo tréningu, žiadne vyskakovacie okná.
// Súhlas s cookies v EÚ rieši certifikované okno Google (AdSense → Ochrana súkromia a správy → Európske predpisy), načíta sa s reklamným skriptom.
// Pod reklamou je odkaz „Bez reklám s Plus“, ktorý otvorí predplatné.
import * as db from './data.js';
import { ent, isPremium, paywall } from './billing.js';

const PLACES = [
  { route: '#/pokrok', slot: 'progress' },
  { route: '#/spravy', slot: 'friends' },
  { route: '#/profil', slot: 'recipes' },
];
let cfg = null, loaded = false;

async function config() {
  if (cfg) return cfg;
  try { const { data } = await db.sb.from('app_config').select('value').eq('key', 'ads').maybeSingle(); cfg = data?.value || { on: false }; }
  catch (_) { cfg = { on: false }; }
  return cfg;
}
const want = () => ent.on && !isPremium() && cfg?.on && /^ca-pub-\d+$/.test(String(cfg.client || ''));

function script() {
  if (loaded) return; loaded = true;
  const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(cfg.client)}`;
  document.head.appendChild(s);
}
const CSS = `.gt-ad{margin:18px 0 6px;padding:10px 10px 8px;border-radius:18px;border:1px solid var(--line);background:var(--card)}
.gt-ad small{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:11.5px;margin:0 4px 6px}
.gt-ad button{border:0;background:none;color:var(--accent);font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;padding:0}
.gt-ad ins{display:block;min-height:90px}`;

function place() {
  if (!want()) { document.querySelectorAll('.gt-ad').forEach(x => x.remove()); return; }
  const p = PLACES.find(x => (location.hash || '#/').startsWith(x.route)); if (!p) return;
  const scr = document.querySelector('#app .screen'); if (!scr || scr.querySelector('.gt-ad')) return;
  const slot = cfg.slots?.[p.slot]; if (!slot) return;
  if (!document.getElementById('gtAdCss')) { const s = document.createElement('style'); s.id = 'gtAdCss'; s.textContent = CSS; document.head.appendChild(s); }
  script();
  const box = document.createElement('div'); box.className = 'gt-ad';
  box.innerHTML = `<small><span>Reklama</span><button type="button">Bez reklám s Plus</button></small>
    <ins class="adsbygoogle" data-ad-client="${cfg.client}" data-ad-slot="${String(slot).replace(/\D/g, '')}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  box.querySelector('button').onclick = () => paywall({ from: 'ad' });
  scr.appendChild(box);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) { }
}

db.ready.then(async () => {
  await config();
  const app = document.getElementById('app');
  if (app) new MutationObserver(() => place()).observe(app, { childList: true });
  addEventListener('hashchange', () => setTimeout(place, 300));
  addEventListener('fw-ent', place);
  place();
}).catch(() => { });
