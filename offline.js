// Offline zápis: keď nie je signál, jedlo sa uloží do telefónu (data.js) a tento modul ho po pripojení odošle.
// Človek vidí jedinú vec: „Uložené v telefóne“ a potom „Odoslané“. Nič sa nestratí a nič sa nezdvojí.
import * as db from './data.js';
import { ctx } from './app.js';

const plural = n => (n === 1 ? 'zápis' : n < 5 ? 'zápisy' : 'zápisov');
const say = (t, bad) => { try { ctx.toast(t, bad); } catch (_) { /* bez hlásenia */ } };

addEventListener('fw-queued', e => {
  const n = e.detail || 1;
  say(n === 1 ? 'Uložené v telefóne. Odošle sa po pripojení.' : `Uložené v telefóne (${n} čakajú na odoslanie).`);
});

addEventListener('fw-synced', e => {
  const n = e.detail || 0;
  say(`Odoslané: ${n} ${plural(n)}`);
  const busy = document.querySelector('.sheet-bg') || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
  if (!busy) setTimeout(() => dispatchEvent(new HashChangeEvent('hashchange')), 200);
});

let t = 0;
function tick() {
  clearTimeout(t);
  db.flushQueue().catch(() => { }).finally(() => { t = setTimeout(tick, db.pendingFood().length ? 15000 : 60000); });
}
addEventListener('online', () => setTimeout(tick, 400));
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
db.ready.then(() => setTimeout(tick, 2500)).catch(() => { });
