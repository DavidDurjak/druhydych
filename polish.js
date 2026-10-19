// Drobné vizuálne doladenia naprieč appkou:
// 1) obsah obrazoviek končí tesne nad spodnou lištou, bez prázdneho miesta pod poslednou kartou,
// 2) čísla v týždennom reporte sa nikdy nevylejú z mriežky,
// 3) prázdne Fotky: namiesto vety „Zatiaľ žiadne fotky.“ jasný štart premeny (tri pózy, tipy a tlačidlo na prvú fotku),
// 4) Váha: história s nadpisom a zmenou oproti predošlému váženiu, desatinná čiarka podľa jazyka (84,7 kg, nie 84.7),
// 5) Správy: bubliny ako v chate a prázdny stav s rýchlymi otázkami, ktoré sa jedným ťuknutím vpíšu do správy.
import { currentLang } from './i18n.js';
const CSS = `
#app>.screen:not(.no-nav):not(.fx-setup){padding-bottom:calc(var(--nav-h,72px) + env(safe-area-inset-bottom) + 18px)}
.pz{text-align:center;padding:6px 2px 4px}
.pz-poses{display:flex;justify-content:center;gap:10px;margin:4px 0 16px}
.pz-pose{width:78px;border-radius:16px;padding:10px 0 8px;border:1.5px dashed color-mix(in srgb,var(--accent) 45%,var(--line));background:color-mix(in srgb,var(--accent) 6%,transparent);color:var(--muted)}
.pz-pose svg{width:38px;height:72px;display:block;margin:0 auto 6px}
.pz-pose svg *{fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.pz-pose span{font-size:11.5px;font-weight:700}
.pz h3{margin:0 0 6px;font-size:20px;letter-spacing:-.02em}
.pz>p{margin:0 auto 14px;max-width:320px;color:var(--muted);font-size:14px;line-height:1.45}
.pz ul{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:8px;text-align:left}
.pz li{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;background:var(--bg-2);font-size:13.5px;line-height:1.35}
.pz li b{flex:none;font-size:18px}
.pz .btn{width:100%}
.pz-hide{display:none!important}
.rp-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.rp-s{min-width:0}.rp-s b,.rp-s em{overflow-wrap:anywhere}
.pw-h{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 4px}
.pw-h b{font-size:16px}.pw-h span{font-size:12.5px;color:var(--muted)}
.pw-d{flex:none;font-style:normal;font-size:12px;font-weight:700;padding:3px 8px;border-radius:99px;margin-right:10px;background:var(--bg-2);color:var(--muted);font-variant-numeric:tabular-nums}
.pw-d.z{opacity:.6}
.pm{text-align:center;padding:22px 8px 6px}
.pm-i{width:64px;height:64px;margin:0 auto 12px;border-radius:20px;display:grid;place-items:center;font-size:30px;background:color-mix(in srgb,var(--accent) 14%,transparent)}
.pm h3{margin:0 0 6px;font-size:19px;letter-spacing:-.02em}
.pm p{margin:0 auto 14px;max-width:310px;color:var(--muted);font-size:14px;line-height:1.45}
.pm-q{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.pm-q button{font:inherit;font-size:13.5px;padding:9px 13px;border-radius:99px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer}
.pm-q button:active{transform:scale(.97)}
#app .msg{width:fit-content;max-width:86%;min-width:42%;border-radius:20px 20px 20px 6px;margin-right:auto}
#app .msg.mine{margin-left:auto;margin-right:0;border-radius:20px 20px 6px 20px;background:color-mix(in srgb,var(--accent) 10%,var(--card));border-color:color-mix(in srgb,var(--accent) 30%,var(--line))}
`;
const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

const FIG = {
  front: '<svg viewBox="0 0 40 76"><circle cx="20" cy="9" r="6"/><path d="M11 21c2-3 5-4 9-4s7 1 9 4l2 18M11 21l-2 18M15 21v16c0 4 1 7 2 9l-1 26M25 21v16c0 4-1 7-2 9l1 26"/></svg>',
  side: '<svg viewBox="0 0 40 76"><circle cx="21" cy="9" r="6"/><path d="M17 18c-3 4-4 10-3 17 1 5 4 8 5 12l-2 25M22 18c3 3 4 8 3 14-1 5-3 9-3 15l2 25M18 24l-3 14"/></svg>',
  back: '<svg viewBox="0 0 40 76"><circle cx="20" cy="9" r="6"/><path d="M11 21c2-3 5-4 9-4s7 1 9 4l2 18M11 21l-2 18M15 21v16c0 4 1 7 2 9l-1 26M25 21v16c0 4-1 7-2 9l1 26M20 20v18"/></svg>',
};

function photos() {
  const wrap = document.querySelector('#app #cmpWrap'), tl = document.querySelector('#app #tl'), add = document.querySelector('#app #add');
  if (!wrap || !tl || !add || wrap.querySelector('.pz')) return;
  // žiadna fotka: prázdne je porovnanie aj časová os
  if (!wrap.querySelector('p.empty') || !tl.querySelector('p.empty') || tl.querySelector('.tl-row')) return;
  wrap.innerHTML = `<div class="pz">
    <div class="pz-poses">${[['front', 'Spredu'], ['side', 'Zboku'], ['back', 'Zozadu']].map(([k, n]) => `<div class="pz-pose">${FIG[k]}<span>${n}</span></div>`).join('')}</div>
    <h3>Začni svoju premenu</h3>
    <p>Odfoť sa dnes spredu, zboku aj zozadu. O pár týždňov tu posuvníkom porovnáš, ako si sa zmenil. Váha klame, fotky nie.</p>
    <ul><li><b>💡</b>Vždy rovnaké miesto a svetlo, najlepšie ráno</li><li><b>👕</b>Rovnaké oblečenie, aby bolo vidno postavu</li><li><b>🔒</b>Fotky sú súkromné, vidíš ich len ty a tvoj kouč</li></ul>
    <button class="btn primary" type="button" id="pzGo">📸 Odfotiť prvú fotku</button></div>`;
  wrap.querySelector('#pzGo').onclick = () => add.click();
  tl.classList.add('pz-hide');
  const h = tl.previousElementSibling; if (h && h.tagName === 'H3') h.classList.add('pz-hide');
}

// ---------- Váha ----------
const DEC = (1.5).toLocaleString(currentLang()).charAt(1);
const fix = t => (DEC === ',' ? t.replace(/(\d)\.(\d)/g, '$1,$2') : t);
const num = t => Number(String(t).replace(',', '.').replace(/[^\d.]/g, ''));
function weights() {
  if (!document.querySelector('#app #wf')) return;
  const del = document.querySelector('#app .card [data-del]');
  const card = del?.closest('.card');
  if (card && !card.querySelector('.pw-h')) {
    const rows = [...card.querySelectorAll('.item')];
    const v = rows.map(r => num(r.querySelector('.k')?.textContent || ''));
    rows.forEach((r, i) => {
      const k = r.querySelector('.k'); if (!k) return;
      k.textContent = fix(k.textContent);
      if (i + 1 < v.length && isFinite(v[i]) && isFinite(v[i + 1])) {
        const d = Math.round((v[i] - v[i + 1]) * 10) / 10;
        k.insertAdjacentHTML('beforebegin', `<em class="pw-d notranslate${d === 0 ? ' z' : ''}">${d > 0 ? '↑ ' : d < 0 ? '↓ ' : '± '}${fix(Math.abs(d).toFixed(1))}</em>`);
      }
    });
    card.insertAdjacentHTML('afterbegin', `<div class="pw-h"><b>História vážení</b><span>${rows.length} ${rows.length === 1 ? 'váženie' : rows.length < 5 ? 'váženia' : 'vážení'}</span></div>`);
  }
  if (DEC === ',') document.querySelectorAll('#app .stat b, #app .stat span, #app .card svg text').forEach(el => {
    if (el.children.length) return; const t = fix(el.textContent); if (t !== el.textContent) el.textContent = t;
  });
}

// ---------- Správy ----------
const QS = ['Môžeš mi skontrolovať jedálniček?', 'Ako si upraviť tréning?', 'Nedarí sa mi, potrebujem radu'];
function messages() {
  const f = document.querySelector('#app #mf'); if (!f) return;
  const empty = f.parentElement.querySelector(':scope > p.empty'); if (!empty) return;
  const box = document.createElement('div'); box.className = 'pm';
  box.innerHTML = `<div class="pm-i">💬</div><h3>Tu si píšeš so svojím koučom</h3>
    <p>Spýtaj sa na jedálniček, tréning alebo čokoľvek, s čím si nevieš rady. Odpoveď nájdeš tu.</p>
    <div class="pm-q">${QS.map(q => `<button type="button">${q}</button>`).join('')}</div>`;
  empty.remove(); f.before(box);
  const ta = f.querySelector('textarea');
  box.querySelectorAll('.pm-q button').forEach(b => b.onclick = () => { if (ta) { ta.value = b.textContent; ta.focus(); } });
}

const app = document.getElementById('app');
if (app) new MutationObserver(() => { photos(); weights(); messages(); }).observe(app, { childList: true, subtree: true });
