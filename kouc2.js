// Kouč: prehľad klientov a detail klienta (nový vzhľad a funkcie).
// Modul nič nepočíta znova: prečíta hotovú kartu Kouč z app2.js a poskladá ju do prehľadnejšieho tvaru.
// Prehľad: súhrn s prstencom, najprv ľudia, ktorí potrebujú pozornosť, filter a hľadanie, ukazovatele ako pásiky.
// Detail: hlavička s iniciálami a rýchle vety, ktoré sa jedným ťuknutím vložia do správy.
const CSS = `
.ko-root{padding-bottom:110px}
.ko-h{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:0 0 14px}
.ko-h h1{margin:0;font-size:34px;letter-spacing:-.04em;line-height:1}
.ko-h p{margin:5px 0 0;font-size:13px;color:var(--muted)}
.ko-h .btn{flex:none}
.ko-sum{position:relative;overflow:hidden;display:flex;align-items:center;gap:18px;padding:18px;border-radius:26px;margin:0 0 14px;border:1px solid var(--line);
  background:radial-gradient(90% 130% at 100% 0%,color-mix(in srgb,var(--accent) 16%,transparent),transparent 62%),var(--card);animation:koIn .55s cubic-bezier(.2,.9,.3,1) both}
@keyframes koIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.ko-ring{position:relative;flex:none;width:112px;height:112px}
.ko-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ko-ring circle{fill:none;stroke-width:11;stroke-linecap:butt}
.ko-ring .t{stroke:var(--track,color-mix(in srgb,var(--text) 9%,transparent))}
.ko-ring .a{stroke-dasharray:0 302;animation:koArc 1.1s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes koArc{to{stroke-dasharray:var(--l) 302}}
.ko-ring div{position:absolute;inset:0;display:grid;place-content:center;text-align:center;line-height:1}
.ko-ring b{font-size:30px;font-weight:800;letter-spacing:-.04em}
.ko-ring small{font-size:11px;color:var(--muted);margin-top:4px}
.ko-leg{flex:1;min-width:0;display:grid;gap:9px}
.ko-leg div{display:flex;align-items:center;gap:9px;font-size:13.5px;color:var(--muted)}
.ko-leg i{flex:none;width:10px;height:10px;border-radius:3px}
.ko-leg b{margin-left:auto;color:var(--text);font-variant-numeric:tabular-nums}
.ko-kp{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 16px}
.ko-kp div{padding:11px 12px;border-radius:16px;background:var(--card);border:1px solid var(--line);min-width:0}
.ko-kp b{display:block;font-size:20px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums;white-space:nowrap}
.ko-kp b.pos{color:var(--accent)}
.ko-kp span{font-size:11.5px;color:var(--muted)}
.ko-tools{display:flex;gap:8px;align-items:center;margin:0 0 12px;overflow-x:auto;scrollbar-width:none}
.ko-tools::-webkit-scrollbar{display:none}
.ko-ch{flex:none;appearance:none;border:1px solid var(--line);background:var(--card);color:var(--muted);font:inherit;font-size:13px;font-weight:600;padding:8px 13px;border-radius:99px;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
.ko-ch b{margin-left:5px;font-variant-numeric:tabular-nums}
.ko-ch.on{background:var(--text);color:var(--bg);border-color:var(--text)}
.ko-q{width:100%;margin:0 0 12px;height:44px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;padding:0 14px}
.ko-sec{margin:18px 2px 10px;font-size:13px;font-weight:700;color:var(--muted);display:flex;align-items:center;gap:8px}
.ko-sec b{font-weight:700;color:var(--text)}
.ko-c{position:relative;display:block;color:inherit;text-decoration:none;padding:14px;border-radius:22px;background:var(--card);border:1px solid var(--line);margin:0 0 10px;overflow:hidden;transition:transform .12s;animation:koIn .5s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--n,0)*50ms)}
.ko-c:active{transform:scale(.988)}
.ko-c::before{content:'';position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--accent)}
.ko-c.warn::before{background:var(--fat,#FFB547)} .ko-c.bad::before{background:var(--danger,#FF5C7A)}
.ko-c.bad{background:linear-gradient(100deg,color-mix(in srgb,var(--danger,#FF5C7A) 9%,var(--card)),var(--card) 55%)}
.ko-top{display:flex;align-items:center;gap:12px}
.ko-av{flex:none;position:relative;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:16px;letter-spacing:-.02em;color:hsl(var(--h) 85% 68%);
  background:linear-gradient(145deg,hsl(var(--h) 70% 55% / .28),hsl(calc(var(--h) + 40) 70% 45% / .16));box-shadow:inset 0 0 0 1.5px hsl(var(--h) 70% 60% / .35)}
.ko-av::after{content:'';position:absolute;right:-1px;bottom:-1px;width:13px;height:13px;border-radius:50%;background:var(--accent);border:2.5px solid var(--card)}
.ko-c.warn .ko-av::after{background:var(--fat,#FFB547)} .ko-c.bad .ko-av::after{background:var(--danger,#FF5C7A)}
html[data-theme=light] .ko-av{color:hsl(var(--h) 70% 30%)}
.ko-id{flex:1;min-width:0}
.ko-id b{display:block;font-size:16.5px;font-weight:700;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ko-id span{display:inline-block;margin-top:3px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:99px;color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent)}
.ko-c.warn .ko-id span{color:var(--fat,#FFB547);background:color-mix(in srgb,var(--fat,#FFB547) 15%,transparent)}
.ko-c.bad .ko-id span{color:var(--danger,#FF5C7A);background:color-mix(in srgb,var(--danger,#FF5C7A) 15%,transparent)}
.ko-w{flex:none;text-align:right}
.ko-w b{display:block;font-size:18px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.ko-w b small{font-size:11px;color:var(--muted);font-weight:700;margin-left:2px}
.ko-w em{font-style:normal;font-size:11.5px;color:var(--muted)}
.ko-m{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
.ko-m div{min-width:0}
.ko-m span{display:flex;justify-content:space-between;gap:4px;font-size:11.5px;color:var(--muted);margin-bottom:6px}
.ko-m span b{color:var(--text);font-variant-numeric:tabular-nums}
.ko-bar{position:relative;height:6px;border-radius:99px;background:var(--bg-2);overflow:hidden}
.ko-bar i{display:block;height:100%;width:0;border-radius:99px;background:var(--accent);animation:koBar .9s cubic-bezier(.2,.8,.2,1) .15s forwards}
.ko-bar.over i{background:var(--accent-2,#FF6B35)} .ko-bar.low i{background:#5BB8FF} .ko-bar.mid i{background:var(--fat,#FFB547)}
@keyframes koBar{to{width:var(--p)}}
.ko-bar u{position:absolute;top:-1px;bottom:-1px;width:2px;left:var(--t);background:var(--text);opacity:.5}
.ko-empty{padding:26px 18px;text-align:center;border-radius:22px;border:1px dashed var(--line);color:var(--muted);font-size:14px;line-height:1.5}
.ko-empty b{display:block;color:var(--text);font-size:17px;margin-bottom:4px}
.ko-none{display:none;text-align:center;color:var(--muted);font-size:14px;padding:18px}

.ko-dh{display:flex;align-items:center;gap:14px;margin:0 0 16px}
.ko-dh .ko-av{width:58px;height:58px;font-size:21px}
.ko-dh .ko-av::after{display:none}
.ko-dh div:nth-child(2){flex:1;min-width:0}
.ko-dh h1{margin:0;font-size:26px;letter-spacing:-.035em;line-height:1.05}
.ko-dh p{margin:4px 0 0;font-size:13px;color:var(--muted)}
.ko-qr{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.ko-qr button{appearance:none;border:1px solid var(--line);background:var(--bg-2);color:var(--text);font:inherit;font-size:12.5px;padding:8px 12px;border-radius:99px;cursor:pointer;text-align:left;transition:background .15s,border-color .15s}
.ko-qr button:active{border-color:var(--accent)}
@media (prefers-reduced-motion:reduce){.ko-sum,.ko-c,.ko-ring .a,.ko-bar i{animation:none!important}.ko-ring .a{stroke-dasharray:var(--l) 302}.ko-bar i{width:var(--p)}}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = s => { const m = String(s || '').replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/); return m ? Number(m[0].replace(',', '.')) : null; };
const comma = s => String(s).replace(/^-(0[.,]0+)(?!\d)/, '$1').replace('.', ',').replace(/^-/, '−');
const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const hue = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const flagOf = el => el?.classList.contains('bad') ? 'bad' : el?.classList.contains('warn') ? 'warn' : 'ok';

function parseCard(a, i) {
  const nm = a.querySelector('h3')?.textContent.trim() || '';
  const right = a.querySelector('[style*="text-align:right"]');
  const kg = right?.querySelector('b')?.textContent || '';
  const delta = right?.querySelector('p')?.textContent || '';
  const stats = [...a.querySelectorAll('.stat')].map(s => [s.querySelector('b')?.textContent || '', s.querySelector('span')?.textContent || '']);
  const [lg, tr, kc] = stats;
  const lgm = (lg?.[0] || '').split('/'), trm = (tr?.[0] || '').split('/');
  return {
    i, id: (a.getAttribute('href') || '').split('/')[2], name: nm, flag: flagOf(a.querySelector('.flag')),
    why: a.querySelector('p.muted.small')?.textContent.trim() || '',
    kg: /\d/.test(kg) ? kg.replace(/\s*kg\s*$/, '') : null, delta: delta.replace(/\s*od štartu\s*$/, ''), hasDelta: /od štartu/.test(delta),
    logged: Number(lgm[0]) || 0, trained: Number(trm[0]) || 0, trainTarget: Number(trm[1]) || 0,
    avg: num(kc?.[0]), target: num(kc?.[1]),
  };
}

function bar(p, cls = '', t) {
  return `<div class="ko-bar ${cls}" style="--p:${Math.max(3, Math.min(100, p * 100)).toFixed(0)}%${t != null ? `;--t:${t}%` : ''}"><i></i>${t != null ? '<u></u>' : ''}</div>`;
}

function card(x, n) {
  const kcalP = x.avg && x.target ? x.avg / x.target : 0;
  const kcalCls = !x.avg ? '' : kcalP > 1.1 ? 'over' : kcalP < 0.8 ? 'low' : '';
  const dl = x.hasDelta ? comma(x.delta) : 'bez váženia';
  return `<a class="ko-c ${x.flag}" href="#/kouc/${esc(x.id)}" data-name="${esc(x.name.toLowerCase())}" data-flag="${x.flag}" style="--n:${n}">
    <div class="ko-top"><div class="ko-av" style="--h:${hue(x.name)}">${esc(initials(x.name))}</div>
      <div class="ko-id"><b>${esc(x.name)}</b><span>${esc(x.why)}</span></div>
      <div class="ko-w"><b>${x.kg ? comma(x.kg) : '–'}${x.kg ? '<small>kg</small>' : ''}</b><em>${esc(dl)}${x.hasDelta ? ' od štartu' : ''}</em></div></div>
    <div class="ko-m">
      <div><span>Jedlo <b>${x.logged}/7</b></span>${bar(x.logged / 7, x.logged >= 5 ? '' : x.logged >= 3 ? 'mid' : 'over')}</div>
      <div><span>Tréningy <b>${x.trained}/${x.trainTarget || '–'}</b></span>${bar(x.trainTarget ? Math.min(1, x.trained / x.trainTarget) : 0, x.trainTarget && x.trained >= x.trainTarget * 0.5 ? '' : 'mid')}</div>
      <div><span>Kalórie <b>${x.avg ? Math.round(x.avg).toLocaleString('sk-SK') : '–'}</b></span>${bar(Math.min(1.3, kcalP) / 1.3, kcalCls, (100 / 1.3).toFixed(1))}</div>
    </div></a>`;
}

function overview(scr) {
  const csv = scr.querySelector('#csv');
  const title = scr.querySelector('.topbar h1')?.textContent.trim() || 'Kouč';
  const extras = [...scr.children].filter(e => e.matches('.tr-code,.tr-req')).map(e => e.outerHTML).join(''); // tréner: kód a žiadosti o koučing (trainers.js)
  const cards = [...scr.querySelectorAll('a.card.link[href^="#/kouc/"]')];
  const xs = cards.map(parseCard);
  const reports = [...scr.children].filter(e => e.matches('section.card'));
  const stat = [...scr.querySelectorAll('.grid3.mb .stat')];
  const totalLoss = stat[2]?.querySelector('b')?.textContent.trim() || '0.0';
  const bad = xs.filter(x => x.flag === 'bad'), warn = xs.filter(x => x.flag === 'warn'), ok = xs.filter(x => x.flag === 'ok');
  const att = [...bad, ...warn];
  const n = xs.length || 1;
  const adh = xs.length ? Math.round(xs.reduce((a, x) => a + x.logged / 7, 0) / n * 100) : 0;
  const trn = xs.filter(x => x.trainTarget);
  const trp = trn.length ? Math.round(trn.reduce((a, x) => a + Math.min(1, x.trained / x.trainTarget), 0) / trn.length * 100) : 0;
  const C = 2 * Math.PI * 48;
  const segs = [[ok.length, 'var(--accent)'], [warn.length, 'var(--fat,#FFB547)'], [bad.length, 'var(--danger,#FF5C7A)']];
  let off = 0;
  const arcs = xs.length ? segs.filter(s => s[0]).map(([c, col]) => { const len = Math.max(2, c / n * C - 3), el = `<circle class="a" cx="60" cy="60" r="48" stroke="${col}" style="--l:${len.toFixed(1)};stroke-dashoffset:${(-off).toFixed(1)}"/>`; off += c / n * C; return el; }).join('') : '';
  const date = new Date().toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' });
  const tail = reports.map(r => r.outerHTML).join('');
  const node = document.createElement('div'); node.className = 'ko-root';
  node.innerHTML = `<div class="ko-h"><div><h1>${esc(title)}</h1><p>${esc(date)}</p></div><span id="ko-csv"></span></div>
    ${extras}
    ${xs.length ? `<section class="ko-sum"><div class="ko-ring"><svg viewBox="0 0 120 120"><circle class="t" cx="60" cy="60" r="48"/>${arcs}</svg><div><b>${ok.length}/${xs.length}</b><small>v pohode</small></div></div>
      <div class="ko-leg"><div><i style="background:var(--danger,#FF5C7A)"></i>Potrebuje zásah<b>${bad.length}</b></div><div><i style="background:var(--fat,#FFB547)"></i>Pozor<b>${warn.length}</b></div><div><i style="background:var(--accent)"></i>V pohode<b>${ok.length}</b></div></div></section>
      <div class="ko-kp"><div><b>${adh} %</b><span>zapisovanie jedla</span></div><div><b>${trp} %</b><span>splnené tréningy</span></div><div><b class="${Number(totalLoss) > 0 ? 'pos' : ''}">${esc(comma(totalLoss))}</b><span>kg dole spolu</span></div></div>
      <div class="ko-tools" role="tablist"><button class="ko-ch on" data-f="all">Všetci<b>${xs.length}</b></button><button class="ko-ch" data-f="att">Pozornosť<b>${att.length}</b></button><button class="ko-ch" data-f="ok">V pohode<b>${ok.length}</b></button></div>
      ${xs.length > 5 ? '<input class="ko-q" type="search" placeholder="Hľadať klienta" aria-label="Hľadať klienta">' : ''}
      ${att.length ? `<div class="ko-sec" data-sec="att">Potrebujú pozornosť <b>${att.length}</b></div>${att.map((x, i) => card(x, i)).join('')}` : ''}
      ${ok.length ? `<div class="ko-sec" data-sec="ok">V pohode <b>${ok.length}</b></div>${ok.map((x, i) => card(x, i + att.length)).join('')}` : ''}
      <div class="ko-none">Nikto nevyhovuje filtru.</div>`
      : `<div class="ko-empty"><b>Zatiaľ žiadni klienti</b>${title === 'Klienti' ? 'Pošli klientom svoj kód z trénerského profilu alebo počkaj na žiadosti z katalógu. Keď ich prijmeš, uvidíš tu ich jedlo, tréningy a váhu.' : 'Keď sa niekto zaregistruje a dokončí úvodné nastavenie, objaví sa tu aj s označením, či ide podľa plánu.'}</div>`}
    ${tail ? `<div class="ko-sec">Týždenné reporty</div>${tail}` : ''}`;
  scr.innerHTML = '';
  scr.appendChild(node);
  if (csv) node.querySelector('#ko-csv').replaceWith(csv); else node.querySelector('#ko-csv')?.remove();
  // filter a hľadanie
  const apply = () => {
    const f = node.querySelector('.ko-ch.on')?.dataset.f || 'all', q = (node.querySelector('.ko-q')?.value || '').trim().toLowerCase();
    let shown = 0;
    node.querySelectorAll('.ko-c').forEach(c => {
      const fl = c.dataset.flag, pass = (f === 'all' || (f === 'att' && fl !== 'ok') || (f === 'ok' && fl === 'ok')) && (!q || c.dataset.name.includes(q));
      c.style.display = pass ? '' : 'none'; if (pass) shown++;
    });
    node.querySelectorAll('.ko-sec[data-sec]').forEach(s => { let e = s.nextElementSibling, any = false; while (e && e.classList.contains('ko-c')) { if (e.style.display !== 'none') any = true; e = e.nextElementSibling; } s.style.display = any ? '' : 'none'; });
    const none = node.querySelector('.ko-none'); if (none) none.style.display = shown ? 'none' : 'block';
  };
  node.querySelectorAll('.ko-ch').forEach(b => b.onclick = () => { node.querySelectorAll('.ko-ch').forEach(x => x.classList.toggle('on', x === b)); apply(); });
  node.querySelector('.ko-q')?.addEventListener('input', apply);
}

const QUICK = [
  'Super týždeň, takto pokračuj.',
  'Skús pridať bielkoviny k raňajkám.',
  'Zapisuj aj víkend, nech vidím celý obraz.',
  'Ako sa cítiš? Napíš mi, čo ti ide ťažko.',
  'Nezabudni na tréning tento týždeň.',
];

function detail(scr) {
  const top = scr.querySelector('.topbar'), form = scr.querySelector('form#mf'); if (!top || !form) return;
  const name = top.querySelector('h1')?.textContent.trim() || '', sub = top.querySelector('p')?.textContent.trim() || '';
  const hd = document.createElement('div'); hd.className = 'ko-dh';
  hd.innerHTML = `<div class="ko-av" style="--h:${hue(name)}">${esc(initials(name))}</div><div><h1>${esc(name)}</h1><p>${esc(sub)}</p></div>`;
  top.replaceWith(hd);
  const ta = form.querySelector('textarea'); if (!ta) return;
  const row = document.createElement('div'); row.className = 'ko-qr';
  row.innerHTML = QUICK.map(t => `<button type="button">${esc(t)}</button>`).join('');
  ta.before(row);
  row.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ta.value = ta.value ? ta.value.replace(/\s*$/, ' ') + b.textContent : b.textContent; ta.focus(); });
}

function run() {
  const scr = document.querySelector('#app .screen');
  if (!scr || scr.dataset.ko) return;
  if (scr.querySelector('#csv') && /^(Kouč|Klienti)$/.test(scr.querySelector('.topbar h1')?.textContent.trim() || '')) { scr.dataset.ko = '1'; overview(scr); return; }
  if (scr.querySelector('form#mf') && scr.querySelector('.topbar a[href="#/kouc"]')) { scr.dataset.ko = '1'; detail(scr); }
}
let q = 0;
const app = document.getElementById('app');
if (app) { new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; run(); }); }).observe(app, { childList: true, subtree: true }); run(); }
