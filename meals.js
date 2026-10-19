// Hotové jedálničky: 3 štýly, 3 dni v rotácii, gramáž sa prepočíta na kalórie používateľa.
// Otvára sa z dlaždice v páse „Objav v appke“ na obrazovke Dnes (discover.js).
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';
import { renderToday } from './today.js';
import * as dx from './dxcore.js';
import { tagsOfAll, fit, DIETS } from './dietcore.js';

const root = document.getElementById('app');

// názov, kcal, bielkoviny, sacharidy, tuky na 100 g (orientačné hodnoty)
const F = {
  oats: ['Ovsené vločky', 372, 13.5, 59, 7], milk: ['Mlieko 1,5 %', 46, 3.4, 4.9, 1.5], banana: ['Banán', 89, 1.1, 23, 0.3], almonds: ['Mandle', 579, 21, 22, 50],
  skyr: ['Skyr', 63, 11, 4, 0.2], berries: ['Lesné ovocie', 50, 0.8, 11, 0.4], egg: ['Vajcia', 143, 12.6, 0.7, 9.5], bread: ['Celozrnný chlieb', 247, 13, 41, 3.4],
  tomato: ['Paradajky', 18, 0.9, 3.9, 0.2], pepper: ['Paprika', 31, 1, 6, 0.3], chicken: ['Kuracie prsia (surové)', 120, 22.5, 0, 2.6], rice: ['Ryža (suchá)', 360, 7, 79, 0.6],
  broccoli: ['Brokolica', 34, 2.8, 7, 0.4], oil: ['Olivový olej', 884, 0, 0, 100], cottage: ['Cottage syr', 98, 11, 3.4, 4.3], apple: ['Jablko', 52, 0.3, 14, 0.2],
  potato: ['Zemiaky', 77, 2, 17, 0.1], salmon: ['Losos', 208, 20, 0, 13], cucumber: ['Uhorka', 15, 0.7, 3.6, 0.1], ham: ['Morčacia šunka', 100, 18, 1, 3],
  pasta: ['Cestoviny (suché)', 350, 12, 72, 1.5], beef: ['Hovädzie mleté (chudé)', 137, 21, 0, 5], pb: ['Arašidové maslo', 588, 25, 20, 50], yogurt: ['Biely jogurt', 61, 3.5, 4.7, 3.3],
  tuna: ['Tuniak vo vlastnej šťave', 116, 26, 0, 1], sweet: ['Sladké zemiaky', 86, 1.6, 20, 0.1], zucchini: ['Cuketa', 17, 1.2, 3.1, 0.3], honey: ['Med', 304, 0.3, 82, 0],
  mushroom: ['Šampiňóny', 22, 3.1, 3.3, 0.3], whey: ['Srvátkový proteín', 400, 80, 8, 6], tofu: ['Tofu', 76, 8, 1.9, 4.8], lentils: ['Šošovica (suchá)', 353, 25, 60, 1.1],
  hummus: ['Hummus', 166, 8, 14, 9.6], quinoa: ['Quinoa (suchá)', 368, 14, 64, 6], spinach: ['Špenát', 23, 2.9, 3.6, 0.4], ricecake: ['Ryžové chlebíčky', 387, 8, 82, 2.8],
  mozz: ['Mozzarella light', 165, 24, 1, 7], carrot: ['Mrkva', 41, 0.9, 10, 0.2],
  soymilk: ['Sójový nápoj nesladený', 39, 3.3, 2.5, 1.9], tempeh: ['Tempeh', 193, 20, 9, 11], beans: ['Biela fazuľa (konzerva)', 95, 6.7, 17, 0.5], chickpeas: ['Cícer (konzerva)', 139, 7.2, 20, 2.6],
};
const ORDER = ['breakfast', 'brunch', 'lunch', 'afternoon', 'dinner'];
const MEAL_LABEL = { breakfast: 'Raňajky', brunch: 'Desiata', lunch: 'Obed', afternoon: 'Olovrant', dinner: 'Večera' };
const day = (b, br, l, a, d) => ({ breakfast: b, brunch: br, lunch: l, afternoon: a, dinner: d });

const PLANS = [
  { id: 'bal', icon: '🍽️', name: 'Vyvážený', desc: 'Klasika: mäso, ryba, vajcia, príloha a zelenina.', days: [
    day('oats:70 milk:200 banana:100 almonds:10', 'skyr:150 berries:80', 'chicken:150 rice:80 broccoli:150 oil:10', 'bread:60 ham:50 cucumber:100', 'salmon:140 potato:250 tomato:150 oil:8'),
    day('egg:150 bread:80 tomato:100 pepper:80', 'banana:120 pb:15', 'pasta:90 beef:120 tomato:200 oil:8', 'yogurt:200 oats:30', 'tuna:130 bread:70 cucumber:150 pepper:100 oil:5'),
    day('yogurt:200 oats:60 berries:80 honey:10', 'apple:150 almonds:20', 'chicken:150 sweet:250 zucchini:150 oil:10', 'skyr:150 banana:100', 'egg:120 mushroom:150 bread:70 tomato:100 oil:5'),
  ] },
  { id: 'pro', icon: '💪', name: 'Vysoký proteín', desc: 'Bielkoviny ku každému jedlu. Pre tréning a redukciu.', days: [
    day('egg:150 oats:50 skyr:100 berries:60', 'skyr:200 whey:25', 'chicken:200 rice:70 broccoli:200 oil:8', 'cottage:150 apple:120', 'salmon:150 sweet:200 spinach:100 oil:5'),
    day('skyr:250 oats:50 banana:100 almonds:10', 'ham:60 bread:50 cucumber:100', 'beef:150 potato:300 tomato:150 oil:8', 'whey:30 milk:250', 'chicken:180 rice:60 pepper:150 zucchini:150 oil:8'),
    day('egg:200 bread:70 tomato:100', 'cottage:150 berries:80 honey:8', 'tuna:150 pasta:80 tomato:200 oil:8', 'skyr:200 apple:120', 'chicken:180 quinoa:60 broccoli:200 oil:8'),
  ] },
  { id: 'veg', icon: '🌱', name: 'Bez mäsa', desc: 'Vajcia, mliečne výrobky, strukoviny a tofu.', days: [
    day('oats:70 milk:200 banana:100 pb:15', 'skyr:150 berries:80', 'lentils:80 rice:40 carrot:100 spinach:100 oil:8', 'hummus:60 bread:60 cucumber:100', 'tofu:180 quinoa:60 broccoli:200 oil:8'),
    day('egg:150 bread:80 tomato:100 spinach:50', 'apple:150 almonds:20', 'pasta:90 mozz:60 tomato:200 zucchini:100 oil:8', 'yogurt:200 oats:30 honey:8', 'egg:120 potato:250 mushroom:150 oil:6'),
    day('skyr:200 oats:60 berries:80', 'banana:120 pb:15', 'tofu:150 rice:70 pepper:150 broccoli:150 oil:8', 'cottage:150 cucumber:100 ricecake:20', 'lentils:70 sweet:200 spinach:100 yogurt:50 oil:6'),
  ] },
  { id: 'vegan', icon: '🌱', name: 'Vegánsky', desc: 'Bez živočíšnych produktov: strukoviny, tofu, tempeh, ovsené vločky a zelenina.', days: [
    day('oats:70 soymilk:250 banana:100 almonds:15', 'apple:150 pb:20', 'lentils:80 rice:50 carrot:100 spinach:100 oil:8', 'hummus:70 bread:60 cucumber:100', 'tofu:180 quinoa:60 broccoli:200 oil:8'),
    day('oats:60 soymilk:250 berries:100 pb:15', 'banana:120 almonds:20', 'chickpeas:200 rice:60 tomato:200 zucchini:100 oil:8', 'ricecake:30 pb:20 apple:100', 'tempeh:150 potato:250 mushroom:150 oil:8'),
    day('bread:90 hummus:70 tomato:100 spinach:50', 'berries:100 almonds:20 banana:100', 'beans:200 sweet:250 pepper:100 oil:8', 'soymilk:250 oats:30', 'tofu:150 rice:70 pepper:150 broccoli:150 oil:8'),
  ] },
  { id: 'pesc', icon: '🐟', name: 'Ryby, bez mäsa', desc: 'Losos, tuniak, vajcia a mliečne výrobky. Bez hydiny a červeného mäsa.', days: [
    day('oats:70 milk:200 banana:100 almonds:10', 'skyr:150 berries:80', 'salmon:150 rice:70 broccoli:150 oil:8', 'bread:60 tuna:60 cucumber:100', 'egg:120 potato:250 mushroom:150 oil:6'),
    day('egg:150 bread:80 tomato:100 pepper:80', 'banana:120 pb:15', 'pasta:90 tuna:120 tomato:200 oil:8', 'yogurt:200 oats:30', 'salmon:140 sweet:200 spinach:100 oil:6'),
    day('skyr:250 oats:50 berries:80', 'apple:150 almonds:20', 'tuna:150 rice:70 pepper:150 zucchini:100 oil:8', 'cottage:150 cucumber:100 ricecake:20', 'salmon:130 quinoa:60 broccoli:200 oil:8'),
  ] },
  { id: 'gf', icon: '🌾', name: 'Bez lepku', desc: 'Bez pšenice, raže, jačmeňa a ovsa: ryža, zemiaky, quinoa, vajcia, mäso a ryby.', days: [
    day('egg:150 potato:150 tomato:100 pepper:80 oil:5', 'yogurt:200 banana:100 berries:60', 'chicken:150 rice:80 broccoli:150 oil:10', 'ricecake:30 cottage:100 cucumber:100', 'salmon:140 potato:250 spinach:100 oil:8'),
    day('yogurt:250 berries:100 almonds:15 honey:10', 'apple:150 pb:20', 'beef:130 rice:80 tomato:200 zucchini:100 oil:8', 'hummus:60 ricecake:30 cucumber:100 carrot:80', 'tuna:130 potato:250 pepper:100 oil:8'),
    day('egg:200 tomato:150 mushroom:100 oil:6', 'skyr:200 banana:100', 'chicken:170 quinoa:70 zucchini:150 oil:8', 'cottage:150 apple:120', 'salmon:140 sweet:200 broccoli:150 oil:6'),
  ] },
];

const parse = s => s.split(' ').map(t => { const [k, g] = t.split(':'); return { k, g: Number(g) }; });
// vhodnosť jedálnička pre diéty a zdravotné režimy používateľa (podľa surovín všetkých dní)
const planTags = pl => { const names = new Set(); pl.days.forEach(d => ORDER.forEach(m => parse(d[m]).forEach(i => names.add(F[i.k][0])))); return tagsOfAll([...names]); };
const planFit = pl => { const c = dx.cfg(); const pref = { diets: c.diets || [], modes: (c.modes || []).filter(m => m === 'celiac' || m === 'lactose' || m === 'allergy'), allergens: c.allergens || [] }; if (!pref.diets.length && !pref.modes.length) return null; return fit(planTags(pl), pref); };
const nutr = (k, g) => { const f = F[k], x = g / 100; return { kcal: f[1] * x, protein: f[2] * x, carbs: f[3] * x, fat: f[4] * x }; };
const r1 = v => Math.round(v * 10) / 10;
const snap = g => Math.max(5, Math.round(g / 5) * 5);

// jeden deň prepočítaný na cieľ používateľa
function scaledDay(d, targetKcal) {
  const base = ORDER.reduce((a, m) => a + parse(d[m]).reduce((s, i) => s + nutr(i.k, i.g).kcal, 0), 0);
  const k = Math.min(1.8, Math.max(0.6, targetKcal / base));
  const meals = ORDER.map(m => ({ meal: m, items: parse(d[m]).map(i => { const g = snap(i.g * k); return { k: i.k, g, ...nutr(i.k, g) }; }) }));
  const total = meals.flatMap(m => m.items).reduce((a, i) => ({ kcal: a.kcal + i.kcal, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return { meals, total };
}

const CSS = `.pl-b{display:inline-block;margin-top:5px;font-style:normal;font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:99px}.pl-b.ok{background:rgba(124,255,178,.16);color:#7CFFB2}.pl-b.warn{background:rgba(255,200,87,.16);color:#FFC857}.pl-b.bad{background:rgba(255,92,122,.16);color:#FF8FA4}html[data-theme=light] .pl-b.ok{color:#0b7a46}html[data-theme=light] .pl-b.warn{color:#8a5a00}html[data-theme=light] .pl-b.bad{color:#c02448}
.plan-card{-webkit-appearance:none;appearance:none;display:flex;align-items:center;gap:12px;width:100%;text-align:left;margin:0 0 14px;padding:12px 14px;border-radius:18px;border:1px solid var(--line,#232a33);background:var(--card,#151a21);color:var(--text,#fff);font:inherit;cursor:pointer}
.plan-card:active{transform:scale(.985)}
.pc-i{font-size:24px}.pc-t{flex:1;display:flex;flex-direction:column;gap:2px}.pc-t b{font-size:15px}.pc-t small{font-size:12.5px;color:var(--muted)}.plan-card>i{font-style:normal;color:var(--muted);font-size:20px}
.pl-lead{font-size:13px;color:var(--muted);margin:6px 0 14px;line-height:1.45}
.pl{border:1px solid var(--line,#232a33);background:var(--card-2,#1b212a);border-radius:16px;padding:12px 14px;margin-bottom:10px;cursor:pointer}
.pl.on{border-color:var(--accent,#7cffb2);box-shadow:inset 0 0 0 1px var(--accent,#7cffb2)}
.pl-h{display:flex;align-items:center;gap:10px}.pl-h span{font-size:22px}.pl-h b{font-size:15px}.pl-h small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.pl-m{font-size:12.5px;color:var(--muted);margin:8px 0 0}
.pl details{margin-top:8px}.pl summary{font-size:12.5px;color:var(--accent,#7cffb2);cursor:pointer}
.pl-d{font-size:12.5px;line-height:1.5;margin-top:6px;color:var(--text,#fff)}.pl-d div{display:flex;gap:10px;margin-bottom:3px}.pl-d b{flex:0 0 66px;color:var(--muted);font-weight:600}
.pl-o{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 14px}
.pl-o button{-webkit-appearance:none;appearance:none;border:1px solid var(--line,#232a33);background:var(--card-2,#1b212a);color:var(--text,#fff);border-radius:99px;padding:8px 14px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}
.pl-o button.on{background:var(--accent,#7cffb2);color:var(--accent-ink,#0b0e12);border-color:var(--accent,#7cffb2)}
.pl-s{font-size:12.5px;color:var(--muted);margin:0 0 4px}
.pl-n{font-size:11.5px;color:var(--muted);margin:10px 0 0;line-height:1.4}`;
if (!document.getElementById('plan-css')) { const s = document.createElement('style'); s.id = 'plan-css'; s.textContent = CSS; document.head.appendChild(s); }

const DNI = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
const plural = n => n === 1 ? 'deň' : n < 5 ? 'dni' : 'dní';

export function openPlans() {
  const p = ctx.state.profile, uid = p.id, target = p.target_kcal || 2000, t = calc.today();
  const nextMon = calc.addDays(calc.weekStart(t), 7);
  const starts = [[t, 'Dnes'], [calc.addDays(t, 1), 'Zajtra'], [nextMon, 'Od pondelka']];
  const fits = Object.fromEntries(PLANS.map(pl => [pl.id, planFit(pl)]));
  const order = [...PLANS].sort((a, b) => (fits[a.id] ? (fits[a.id].level === 'ok' ? 0 : fits[a.id].level === 'warn' ? 1 : 2) : 0) - (fits[b.id] ? (fits[b.id].level === 'ok' ? 0 : fits[b.id].level === 'warn' ? 1 : 2) : 0));
  let plan = order[0].id, start = starts[1][0], len = 7;
  const bg = ctx.sheet(`<h3>Hotový jedálniček</h3>
    <p class="pl-lead">Vyber štýl. Gramáže sa prepočítajú na tvojich ${target} kcal a jedlá sa zapíšu do plánovača. Potom ich môžeš ľubovoľne upraviť.</p>
    <div id="plList"></div>
    <p class="pl-s">Odkedy</p><div class="pl-o" id="plStart">${starts.map(([d, l], i) => `<button data-s="${d}" class="${i === 1 ? 'on' : ''}">${l}</button>`).join('')}</div>
    <p class="pl-s">Na koľko dní</p><div class="pl-o" id="plLen">${[3, 7, 14].map(n => `<button data-n="${n}" class="${n === 7 ? 'on' : ''}">${n} ${plural(n)}</button>`).join('')}</div>
    <button class="btn primary" id="plGo">Naplánovať</button>
    <p class="pl-n">Hodnoty sú orientačné. Ide o štartovací bod, nie o lekársku diétu. Pri alergiách alebo ochoreniach si jedlá skontroluj, vhodnosť sa posudzuje len podľa názvov surovín. Dni, kde už máš zapísané jedlo, sa preskočia.</p>`);
  const list = bg.querySelector('#plList');
  const badge = f => !f ? '' : f.level === 'ok' ? '<em class="pl-b ok">Vhodné pre teba</em>' : f.level === 'warn' ? `<em class="pl-b warn">Over: ${[...new Set(f.items.map(i => i.why))].join(', ')}</em>` : `<em class="pl-b bad">Nesedí: ${[...new Set(f.items.map(i => i.why))].join(', ')}</em>`;
  const drawList = () => {
    list.innerHTML = order.map(pl => {
      const sd = scaledDay(pl.days[0], target), t0 = sd.total;
      return `<div class="pl ${pl.id === plan ? 'on' : ''}" data-p="${pl.id}"><div class="pl-h"><span>${pl.icon}</span><div><b>${pl.name}</b><small>${pl.desc}</small>${badge(fits[pl.id])}</div></div>
        <p class="pl-m">≈ ${Math.round(t0.kcal)} kcal · B ${Math.round(t0.protein)} g · S ${Math.round(t0.carbs)} g · T ${Math.round(t0.fat)} g denne</p>
        <details><summary>Ukážka dňa</summary><div class="pl-d">${sd.meals.map(m => `<div><b>${MEAL_LABEL[m.meal]}</b><span>${m.items.map(i => `${F[i.k][0]} ${i.g} g`).join(', ')}</span></div>`).join('')}</div></details></div>`;
    }).join('');
    list.querySelectorAll('[data-p]').forEach(el => el.onclick = e => { if (e.target.closest('details')) return; plan = el.dataset.p; drawList(); });
  };
  drawList();
  bg.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { start = b.dataset.s; bg.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('on', x === b)); });
  bg.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { len = Number(b.dataset.n); bg.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x === b)); });
  bg.querySelector('#plGo').onclick = async () => {
    const btn = bg.querySelector('#plGo'); btn.disabled = true;
    try {
      const pl = PLANS.find(x => x.id === plan), end = calc.addDays(start, len - 1);
      const existing = await db.foodByDay(uid, start, end);
      const rows = []; let used = 0, skipped = 0;
      for (let i = 0; i < len; i++) {
        const date = calc.addDays(start, i);
        if (existing[date]) { skipped++; continue; }
        const sd = scaledDay(pl.days[i % pl.days.length], target); used++;
        sd.meals.forEach(m => m.items.forEach(it => rows.push({ user_id: uid, date, meal: m.meal, name: F[it.k][0], grams: it.g, kcal: Math.round(it.kcal), protein: r1(it.protein), carbs: r1(it.carbs), fat: r1(it.fat), source: 'plan' })));
      }
      if (!rows.length) { btn.disabled = false; return ctx.toast('V týchto dňoch už máš zapísané jedlo', true); }
      const { error } = await db.sb.from('food_logs').insert(rows);
      if (error) throw new Error(error.message);
      bg.remove();
      ctx.toast(`Naplánované: ${used} ${plural(used)}${skipped ? `, preskočené ${skipped}` : ''}`);
      ctx.state.date = start; renderToday();
    } catch (e) { ctx.toast(e.message, true); btn.disabled = false; }
  };
}

// karta Hotový jedálniček je teraz dlaždica v páse „Objav v appke“ (discover.js) pod jedlami
