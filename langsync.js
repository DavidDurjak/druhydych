// Jazyk appky sa uloží aj do profilu (profiles.lang), aby notifikácie (pripomienky, kouč) chodili v jazyku používateľa.
// Platí aj automatický jazyk podľa telefónu aj ručne zvolený v Profile (po zmene sa appka načíta znova a uloží sa nový).
import * as db from './data.js';
import { ctx } from './app.js';
import { currentLang } from './i18n.js';

let doneKey = '';
function sync() {
  const p = ctx.state?.profile, lang = currentLang();
  if (!p?.id || !lang) return;
  const key = p.id + ':' + lang;
  if (p.lang === lang || doneKey === key) return;
  doneKey = key;
  db.sb.from('profiles').update({ lang }).eq('id', p.id).then(({ error }) => { if (!error) p.lang = lang; else doneKey = ''; }, () => { doneKey = ''; });
}
setInterval(sync, 15000);
setTimeout(sync, 3000);
