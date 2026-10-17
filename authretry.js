// Prihlásenie odolné voči preťaženému serveru: keď server neodpovedá do pár sekúnd, appka to povie
// („Server odpovedá pomalšie…“), sama to skúsi znova (spolu 3 pokusy) a až potom ukáže zrozumiteľnú chybu.
// Nesprávne heslo či e-mail sa neopakujú, tie sa ukážu hneď.
import * as db from './data.js';

const st = document.createElement('style');
st.textContent = `.ar-note{margin:10px 2px 0;font-size:13.5px;line-height:1.4;color:var(--muted);text-align:center}
.ar-note b{color:var(--text)}`;
document.head.appendChild(st);

const TRY_MS = 15000, TRIES = 3;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// chyby, pri ktorých má zmysel skúsiť znova (výpadok siete, časový limit, 5xx), nie zlé heslo
const retryable = e => !e || e.name === 'AuthRetryableFetchError' || e.__timeout || (e.status >= 500) || /fetch|network|load failed|timeout|gateway/i.test(e.message || '');

function note(text) {
  const f = document.querySelector('#authf'); if (!f) return;
  let n = f.querySelector('.ar-note');
  if (!text) { n?.remove(); return; }
  if (!n) { n = document.createElement('p'); n.className = 'ar-note'; n.setAttribute('role', 'status'); f.append(n); }
  n.innerHTML = text;
}

function wrap(auth, name) {
  const orig = auth[name].bind(auth);
  auth[name] = async (...args) => {
    let last = null;
    for (let i = 1; i <= TRIES; i++) {
      const slow = setTimeout(() => note(i === 1 ? 'Server odpovedá pomalšie ako zvyčajne, chvíľu vydrž…' : `Skúšam znova <b>(${i} z ${TRIES})</b>…`), i === 1 ? 5000 : 0);
      let timer;
      try {
        const res = await Promise.race([orig(...args), new Promise(r => { timer = setTimeout(() => r({ data: {}, error: Object.assign(new Error('timeout'), { __timeout: true }) }), TRY_MS); })]);
        clearTimeout(slow); clearTimeout(timer);
        if (!res?.error || !retryable(res.error)) { note(''); return res; }
        last = res;
      } catch (e) {
        clearTimeout(slow); clearTimeout(timer);
        if (!retryable(e)) { note(''); throw e; }
        last = { data: {}, error: e };
      }
      if (i < TRIES) { note(`Server je chvíľu preťažený. Skúšam znova <b>(${i + 1} z ${TRIES})</b>…`); await sleep(i * 2000); }
    }
    note('');
    return { data: last?.data || {}, error: Object.assign(new Error('Server je momentálne preťažený. Skús to prosím o minútu znova.'), { status: 503 }) };
  };
}

db.ready.then(() => {
  const auth = db.sb?.auth;
  if (!auth || auth.__ar) return; auth.__ar = true;
  wrap(auth, 'signInWithPassword');
}).catch(() => { });
