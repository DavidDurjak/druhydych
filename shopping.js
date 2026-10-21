// Nákupný zoznam z naplánovaných jedál: sčíta suroviny z denníka na najbližšie dni, zoradí ich podľa oddelení v obchode,
// dá sa odškrtávať, skopírovať alebo poslať. Funguje aj pre jedlá, ktoré si naplánoval sám.
import { sb } from './data.js';
import { ctx } from './app.js';
import { foodEmoji } from './foodimg.js';
import * as calc from './calc.js';

const CATS = [['veg', '🥬', 'Ovocie a zelenina'], ['meat', '🥩', 'Mäso a ryby'], ['dairy', '🥛', 'Mliečne a vajcia'], ['carb', '🍞', 'Pečivo a obilniny'], ['other', '🛒', 'Ostatné']];
const EMO = { meat: '🍗🥩🐟', dairy: '🥚🥛🧀🧈', carb: '🍞🍝🍚🌽🥣', veg: '🍌🍎🍊🍓🍇🍉🍐🍑🥭🫐🥕🍅🥔🥦🥒🧅🥬' };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function category(name) {
  if (/jogurt|skyr|tvaroh|cottage|mlieko|syr\b|mozzarell|vajc/.test(norm(name))) return 'dairy';
  const e = foodEmoji(name);
  for (const k of Object.keys(EMO)) if (EMO[k].includes(e)) return k;
  return 'other';
}
const LIQ = /mlieko|mlieka|kefir|acidko|maslienk|dzus|juice|smoothie|cola|kofola|fanta|sprite|limonad|pivo|vino|voda|water|caj\b|kava\b|olej\b|oil\b|smotana na/;
export const isLiquid = name => LIQ.test(norm(name));
export function qty(g, name = '') {
  const l = isLiquid(name), u = l ? 'ml' : 'g', big = l ? 'l' : 'kg';
  if (g >= 1000) return (Math.round(g / 100) / 10).toString().replace('.', ',') + ' ' + big;
  const r = g >= 100 ? Math.round(g / 10) * 10 : Math.round(g / 5) * 5;
  return Math.max(5, r) + ' ' + u;
}
// riadky denníka -> položky zoznamu (súčet gramov podľa názvu)
export function build(rows) {
  const m = new Map();
  for (const r of rows) {
    const g = Number(r.grams); if (!r.name || !(g > 0)) continue;
    const k = norm(r.name).trim();
    const it = m.get(k) || { key: k, name: r.name, g: 0 };
    it.g += g; m.set(k, it);
  }
  const out = CATS.map(([id, ic, label]) => ({ id, ic, label, items: [] }));
  for (const it of m.values()) out.find(c => c.id === category(it.name)).items.push(it);
  out.forEach(c => c.items.sort((a, b) => b.g - a.g));
  return out.filter(c => c.items.length);
}

const ls = {
  get() { try { return JSON.parse(localStorage.getItem('fw_shop_chk') || '{}'); } catch (_) { return {}; } },
  set(v) { try { localStorage.setItem('fw_shop_chk', JSON.stringify(v)); } catch (_) { /* súkromný režim */ } },
};

async function fetchRows(days = 14) {
  // od zajtra: dnešné jedlá už sú buď zjedené, alebo sa nakupujú až pri ďalšom plánovaní
  const uid = ctx.state.profile.id, from = calc.addDays(calc.today(), 1), to = calc.addDays(from, days - 1);
  const r = await sb.from('food_logs').select('name,grams,date').eq('user_id', uid).gte('date', from).lte('date', to).limit(1000);
  if (r.error) throw r.error;
  return r.data || [];
}

// záloha, keď nemá nič naplánované: čo človek reálne jedol za posledných 14 dní, prepočítané na zvolený počet dní
async function fetchRecent() {
  const uid = ctx.state.profile.id, to = calc.today(), from = calc.addDays(to, -13);
  const r = await sb.from('food_logs').select('name,grams,date').eq('user_id', uid).gte('date', from).lte('date', to).limit(1000);
  if (r.error) throw r.error;
  return r.data || [];
}

const CSS = `
.shop-card{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 14px;padding:13px 14px;border-radius:18px;border:1px solid var(--line);background:linear-gradient(160deg,rgba(255,200,87,.12),var(--card) 62%);color:var(--text);font:inherit;text-align:left;cursor:pointer;-webkit-appearance:none;appearance:none}
.shop-card:active{transform:scale(.985)}
.shop-card>span{font-size:24px}.shop-card div{flex:1;display:flex;flex-direction:column;gap:2px}.shop-card b{font-size:15px}.shop-card small{font-size:12.5px;color:var(--muted)}.shop-card i{font-style:normal;color:var(--muted);font-size:20px}
.shop-h{display:flex;align-items:center;justify-content:space-between}
.shop-sub{font-size:13px;color:var(--muted);margin:4px 0 12px}
.shop-r{display:flex;gap:8px;margin:0 0 12px}
.shop-r button{-webkit-appearance:none;appearance:none;border:1px solid var(--line);background:var(--card-2);color:var(--text);border-radius:99px;padding:7px 14px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}
.shop-r button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.shop-c{font-size:12.5px;font-weight:700;color:var(--muted);margin:14px 0 4px;letter-spacing:.01em}
.shop-i{display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid var(--line);cursor:pointer;-webkit-tap-highlight-color:transparent}
.shop-i:last-child{border-bottom:0}
.shop-i .bx{flex:0 0 24px;height:24px;border-radius:8px;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:14px;color:transparent;transition:background .15s,border-color .15s}
.shop-i .nm{flex:1;font-size:15px}.shop-i .q{font-size:14px;color:var(--muted);font-variant-numeric:tabular-nums}
.shop-i.done .bx{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.shop-i.done .nm,.shop-i.done .q{color:var(--muted);text-decoration:line-through}
.shop-a{display:flex;gap:8px;margin-top:16px}.shop-a .btn{flex:1}
.shop-e{display:grid;gap:8px;margin:6px 0 4px}.shop-e .btn{width:100%}
`;

export async function openShopping(initialDays = 7) {
  const h = (...a) => ctx.h(...a);
  let rows;
  try { rows = await fetchRows(14); } catch (e) { return ctx.toast(e.message || 'Zoznam sa nepodarilo načítať', true); }
  let days = initialDays, mode = 'plan', recent = null;
  const bg = ctx.sheet('<div id="shopBody"></div>');
  const body = bg.querySelector('#shopBody');
  const draw = () => {
    const to = calc.addDays(calc.today(), days);
    const src = mode === 'recent' ? (recent || []).map(r => ({ ...r, grams: Number(r.grams) * days / 14 })) : rows.filter(r => r.date <= to);
    const cats = build(src);
    const subTxt = (l, n) => mode === 'recent' ? `Odhad podľa toho, čo máš zapísané za posledných 14 dní, na ${days} ${days < 5 ? 'dni' : 'dní'}. Zostáva kúpiť: ${l} z ${n}.` : `Z tvojho plánovača od zajtra. Zostáva kúpiť: ${l} z ${n}.`;
    const chk = ls.get();
    const all = cats.flatMap(c => c.items), left = all.filter(i => !chk[i.key]).length;
    body.innerHTML = `<div class="shop-h"><h3>🛒 Nákupný zoznam</h3><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <p class="shop-sub">${all.length ? subTxt(left, all.length) : mode === 'recent' ? 'Za posledných 14 dní nemáš zapísané žiadne jedlá, takže nemám z čoho zoznam zložiť.' : 'Na tieto dni nemáš naplánované jedlá, preto je zoznam prázdny. Zoznam sa skladá z jedál, ktoré si naplánuješ dopredu.'}</p>
      <div class="shop-r">${[3, 7, 14].map(n => `<button data-n="${n}" class="${n === days ? 'on' : ''}">${n} ${n === 1 ? 'deň' : n < 5 ? 'dni' : 'dní'}</button>`).join('')}</div>
      ${!all.length ? `<div class="shop-e"><button class="btn primary" id="shopPlan">Naplánovať jedlá na týždeň</button>${mode === 'plan' ? '<button class="btn" id="shopRecent">Zoznam podľa toho, čo som jedol(a)</button>' : ''}</div>` : ''}
      ${cats.map(c => `<p class="shop-c">${c.ic} ${c.label}</p>` + c.items.map(i => `<div class="shop-i ${chk[i.key] ? 'done' : ''}" data-k="${h(i.key)}"><span class="bx">✓</span><span class="nm">${h(i.name)}</span><span class="q">${qty(i.g, i.name)}</span></div>`).join('')).join('')}
      ${all.length ? `<div class="shop-a"><button class="btn" id="shopClr">Všetko kúpené</button><button class="btn primary" id="shopSend">${navigator.share ? 'Poslať' : 'Kopírovať'}</button></div>` : ''}`;
    body.querySelector('[data-x]').onclick = () => bg.remove();
    body.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { days = Number(b.dataset.n); draw(); });
    body.querySelectorAll('.shop-i').forEach(el => el.onclick = () => {
      const c = ls.get(), k = el.dataset.k; if (c[k]) delete c[k]; else c[k] = 1; ls.set(c);
      el.classList.toggle('done', !!c[k]); if (navigator.vibrate) navigator.vibrate(8);
      const l = all.filter(i => !c[i.key]).length; const sub = body.querySelector('.shop-sub'); if (sub) sub.textContent = subTxt(l, all.length);
    });
    body.querySelector('#shopPlan')?.addEventListener('click', async () => { try { const m = await import('./meals.js'); bg.remove(); m.openPlans(); } catch (_) { ctx.toast('Jedálniček sa nepodarilo otvoriť', true); } });
    body.querySelector('#shopRecent')?.addEventListener('click', async e => {
      e.target.disabled = true;
      try { recent = await fetchRecent(); mode = 'recent'; draw(); try { window.fwTrack && window.fwTrack('shop_recent', { n: recent.length }); } catch (_) { } }
      catch (_) { ctx.toast('Zoznam sa nepodarilo načítať', true); e.target.disabled = false; }
    });
    body.querySelector('#shopClr')?.addEventListener('click', () => { const c = {}; all.forEach(i => { c[i.key] = 1; }); ls.set({ ...ls.get(), ...c }); draw(); });
    body.querySelector('#shopSend')?.addEventListener('click', async () => {
      const text = 'Nákupný zoznam (Fuelwind)\n' + cats.map(c => `\n${c.label}\n` + c.items.filter(i => !ls.get()[i.key]).map(i => `- ${i.name} ${qty(i.g, i.name)}`).join('\n')).filter(s => s.includes('- ')).join('\n');
      try {
        if (navigator.share) await navigator.share({ title: 'Nákupný zoznam', text });
        else { await navigator.clipboard.writeText(text); ctx.toast('Zoznam skopírovaný'); }
      } catch (e) { if (e?.name !== 'AbortError') ctx.toast('Nepodarilo sa odoslať', true); }
    });
  };
  draw();
}

// ---------- karta na obrazovke Dnes (len ak máš čo nakupovať) ----------
if (typeof document !== 'undefined') {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.getElementById('app');
  const seen = new WeakSet();
  let busy = false;
  const inject = async () => {
    if (busy || !root || !ctx.state?.profile) return;
    const meals = root.querySelector('.screen.td .meals');
    if (!meals || seen.has(meals) || root.querySelector('#fw-shop')) return;
    seen.add(meals); busy = true;
    try {
      const rows = await fetchRows(7);
      const n = build(rows).reduce((a, c) => a + c.items.length, 0);
      if (!n || !meals.isConnected || root.querySelector('#fw-shop')) return;
      const b = document.createElement('button'); b.id = 'fw-shop'; b.className = 'shop-card';
      b.innerHTML = `<span>🛒</span><div><b>Nákupný zoznam</b><small>${n} ${n === 1 ? 'surovina' : n < 5 ? 'suroviny' : 'surovín'} z tvojho plánu na ďalších 7 dní</small></div><i>›</i>`;
      b.onclick = () => openShopping(7);
      meals.after(b);
    } catch (_) { /* bez karty */ } finally { busy = false; }
  };
  if (root) new MutationObserver(() => inject()).observe(root, { childList: true, subtree: true });
}
