// Návyky: nikotín a alkohol. Zapísať jedným ťuknutím, séria dní, ušetrené peniaze, odolané chute, míľniky zdravia,
// SOS pri chuti (2 minúty dýchania) a prepojenie s kalóriami (každý drink je zároveň jedlo v denníku).
// Samo sa pripojí na obrazovku Dnes a do Profilu (bez zásahu do today.js). Obrazovka #/navyky je v app.js.
import * as db from './data.js';
import * as calc from './calc.js';
import { ctx } from './app.js';

const root = document.getElementById('app');
const $app = () => ctx.$app, st = () => ctx.state;
const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), sheet = (...a) => ctx.sheet(...a), nav = (...a) => ctx.nav(...a);
const num = v => Number(String(v ?? '').trim().replace(',', '.'));
const r0 = v => Math.round(Number(v) || 0);
const eur = v => (Math.round(v * 100) / 100).toLocaleString('sk-SK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
const pl = (n, a, b, c) => `${n} ${n === 1 ? a : n >= 2 && n <= 4 ? b : c}`;
const dkey = d => new Date(d).toLocaleDateString('sv-SE');

// ---------- definície ----------
export const KINDS = {
  nicotine: { icon: '🚭', title: 'Nikotín', sub: 'Cigarety, vape, nikotínové vrecúška, žuvací tabak' },
  alcohol: { icon: '🍺', title: 'Alkohol', sub: 'Pivo, víno, tvrdý alkohol, koktaily' },
};
// item: id, názov, jednotka v 1./2.-4./5.+ páde, predvolená cena (EUR za kus), kcal (alkohol), gramy (alkohol), ekvivalent štandardných nápojov
export const ITEMS = {
  nicotine: [
    { id: 'cig', n: 'Cigarety', u: ['cigareta', 'cigarety', 'cigariet', 'cigaretu'], cost: 0.3 },
    { id: 'vape', n: 'Vape', u: ['použitie', 'použitia', 'použití', 'použitie'], cost: 0.1 },
    { id: 'snus', n: 'Nikotínové vrecúška', u: ['vrecúško', 'vrecúška', 'vrecúšok', 'vrecúško'], cost: 0.3 },
    { id: 'chew', n: 'Žuvací tabak', u: ['dávka', 'dávky', 'dávok', 'dávku'], cost: 0.4 },
    { id: 'cigar', n: 'Cigary, fajka', u: ['cigara', 'cigary', 'cigár', 'cigaru'], cost: 2.5 },
  ],
  alcohol: [
    { id: 'beer', n: 'Pivo 0,5 l', u: ['pivo', 'pivá', 'pív', 'pivo'], cost: 2.2, kcal: 215, g: 500, c: 17 },
    { id: 'beer33', n: 'Pivo 0,33 l', u: ['pivo', 'pivá', 'pív', 'pivo'], cost: 1.8, kcal: 140, g: 330, c: 11 },
    { id: 'wine', n: 'Víno 2 dl', u: ['pohár', 'poháre', 'pohárov', 'pohár'], cost: 3, kcal: 160, g: 200, c: 4 },
    { id: 'spirit', n: 'Panák 4 cl', u: ['panák', 'panáky', 'panákov', 'panák'], cost: 2.5, kcal: 95, g: 40, c: 0 },
    { id: 'mixed', n: 'Koktail, long drink', u: ['drink', 'drinky', 'drinkov', 'drink'], cost: 5, kcal: 220, g: 300, c: 20 },
  ],
};
const item = (kind, id) => ITEMS[kind].find(i => i.id === id) || ITEMS[kind][0];
export const TRIGGERS = [['stress', '😤 Stres'], ['coffee', '☕ Káva'], ['social', '👥 Spoločnosť'], ['bored', '🥱 Nuda'], ['alcohol', '🍺 Pri pití'], ['meal', '🍽️ Po jedle'], ['habit', '🔁 Zo zvyku'], ['other', '• Iné']];
const TRIG = Object.fromEntries(TRIGGERS.map(([k, v]) => [k, v.replace(/^\S+ /, '')]));
const TRIG_FOR = { nicotine: ['stress', 'coffee', 'social', 'bored', 'alcohol', 'meal', 'habit', 'other'], alcohol: ['stress', 'social', 'bored', 'meal', 'habit', 'other'] };

// míľniky zdravia od posledného použitia (hodiny), s overenými faktami
const MILES = {
  nicotine: [
    [20 / 60, '20 minút', 'Pulz a tlak klesajú na normálnu hodnotu.'],
    [8, '8 hodín', 'Oxid uhoľnatý v krvi klesol na polovicu, kyslík stúpol.'],
    [24, '1 deň', 'Riziko infarktu začína klesať.'],
    [48, '2 dni', 'Nervové zakončenia sa regenerujú, chuť a čuch sa zlepšujú.'],
    [72, '3 dni', 'Nikotín je z tela von. Dýchanie je ľahšie, priedušky sa uvoľnili.'],
    [24 * 7, '1 týždeň', 'Najťažšia časť abstinenčných príznakov je za tebou.'],
    [24 * 14, '2 týždne', 'Krvný obeh a funkcia pľúc sa zlepšujú, cvičí sa ľahšie.'],
    [24 * 30, '1 mesiac', 'Kašeľ a zadýchavanie ustupujú, riasinky v pľúcach pracujú.'],
    [24 * 90, '3 mesiace', 'Funkcia pľúc stúpla až o 10 %.'],
    [24 * 365, '1 rok', 'Riziko srdcovej choroby kleslo na polovicu oproti fajčiarovi.'],
  ],
  alcohol: [
    [24, '1 deň', 'Telo doplnilo tekutiny, pečeň začala spracovávať to, čo zostalo.'],
    [72, '3 dni', 'Cukor v krvi sa stabilizuje, chute na sladké slabnú.'],
    [24 * 7, '1 týždeň', 'Hlbší spánok a viac REM fázy. Lepšia regenerácia po tréningu.'],
    [24 * 14, '2 týždne', 'Pečeň zhodila časť tuku, tlak klesá.'],
    [24 * 30, '1 mesiac', 'Viditeľne lepšia pleť, menej opuchov, nižší tlak, lepšia nálada.'],
    [24 * 90, '3 mesiace', 'Pečeň sa výrazne zregenerovala. Riziko rakoviny klesá.'],
    [24 * 365, '1 rok', 'Riziko srdcových a pečeňových ochorení kleslo na úroveň nepijúcich.'],
  ],
};

// ---------- dáta ----------
let cache = { uid: null, habits: null, logs: null, at: 0 };
export function forget() { cache = { uid: null, habits: null, logs: null, at: 0 }; }
const must = ({ data, error }) => { if (error) throw new Error(/relation|does not exist|schema cache/i.test(error.message) ? 'NOTABLE' : error.message); return data; };

export async function load(uid, force = false) {
  if (!force && cache.uid === uid && cache.habits && Date.now() - cache.at < 20000) return cache;
  const from = calc.addDays(calc.today(), -120);
  const habits = must(await db.sb.from('habits').select('*').eq('user_id', uid).order('created_at'));
  const logs = must(await db.sb.from('habit_logs').select('id,habit_id,date,at,qty,kind,item,trigger,kcal,food_log_id').eq('user_id', uid).gte('date', from).order('at'));
  cache = { uid, habits: habits || [], logs: logs || [], at: Date.now() };
  return cache;
}
export const activeHabits = () => (cache.habits || []).filter(x => x.active);

// ---------- výpočty ----------
export function stats(hb, logs) {
  const L = logs.filter(l => l.habit_id === hb.id);
  const use = L.filter(l => Number(l.qty) > 0), wins = L.filter(l => Number(l.qty) === 0);
  const today = calc.today();
  const todayQty = use.filter(l => l.date === today).reduce((a, l) => a + Number(l.qty), 0);
  const lastUse = use.length ? new Date(use[use.length - 1].at) : null;
  // od kedy čistý: posledné použitie, alebo začiatok režimu (quit_at / start)
  const since = lastUse || (hb.quit_at ? new Date(hb.quit_at) : new Date(hb.start_date + 'T00:00:00'));
  const cleanH = Math.max(0, (Date.now() - since.getTime()) / 36e5);
  const cleanDays = Math.floor(cleanH / 24);
  // dni od štartu a očakávaná spotreba podľa pôvodného množstva
  const days = Math.max(1, Math.floor((new Date(today + 'T00:00:00') - new Date(hb.start_date + 'T00:00:00')) / 864e5) + 1);
  const used = use.reduce((a, l) => a + Number(l.qty), 0);
  const base = Number(hb.baseline) || 0;
  const avoided = Math.max(0, base * days - used);
  const it = item(hb.kind, hb.sub);
  const saved = avoided * (Number(hb.unit_cost) || it.cost || 0);
  const kcalAvoided = hb.kind === 'alcohol' ? avoided * (it.kcal || 0) : 0;
  // séria dní: po sebe idúce dni (odzadu) bez použitia, od začiatku režimu
  const byDay = {}; use.forEach(l => { byDay[l.date] = (byDay[l.date] || 0) + Number(l.qty); });
  let streak = 0, best = 0, run = 0;
  for (let d = hb.start_date; d <= today; d = calc.addDays(d, 1)) {
    const ok = hb.mode === 'quit' ? !(byDay[d] > 0) : (byDay[d] || 0) <= (Number(hb.daily_limit) || 0);
    run = ok ? run + 1 : 0; best = Math.max(best, run);
  }
  streak = run;
  // tento týždeň (pondelok až dnes)
  const ws = calc.weekStart(today);
  const weekUse = use.filter(l => l.date >= ws);
  const weekQty = weekUse.reduce((a, l) => a + Number(l.qty), 0);
  const weekKcal = weekUse.reduce((a, l) => a + Number(l.kcal || 0), 0);
  // spúšťače za 30 dní (použitie aj odolané chute)
  const from30 = calc.addDays(today, -29);
  const trig = {}; L.filter(l => l.date >= from30 && l.trigger).forEach(l => { trig[l.trigger] = (trig[l.trigger] || 0) + 1; });
  const topTrig = Object.entries(trig).sort((a, b) => b[1] - a[1])[0] || null;
  const trigN = Object.values(trig).reduce((a, b) => a + b, 0);
  // míľniky
  const miles = MILES[hb.kind];
  const reached = miles.filter(m => cleanH >= m[0]);
  const next = miles.find(m => cleanH < m[0]) || null;
  return { todayQty, lastUse, since, cleanH, cleanDays, days, used, avoided, saved, kcalAvoided, streak, best, weekQty, weekKcal, wins: wins.length, winsToday: wins.filter(l => l.date === today).length, byDay, topTrig, trigN, trig, reached, next, item: it };
}

const sinceLbl = hrs => {
  if (hrs < 1) return `${Math.max(1, Math.floor(hrs * 60))} min`;
  if (hrs < 48) return `${Math.floor(hrs)} h`;
  const d = Math.floor(hrs / 24), hh = Math.floor(hrs % 24);
  return `${d} d${hh ? ` ${hh} h` : ''}`;
};
const unitOf = (it, n) => pl(n, it.u[0], it.u[1], it.u[2]);

// ---------- CSS ----------
const CSS = `
.hb{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:14px;position:relative;overflow:hidden}
.hb.clean{background:linear-gradient(135deg,#0f2a22 0%,#121a1f 70%);border-color:#1f5a45}
.hb h3{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:15px;margin-bottom:8px}
.hb h3 a{font-size:12px;font-weight:700}
.hb-main{display:flex;align-items:center;gap:14px}
.hb-big{font-size:40px;font-weight:800;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}
.hb-big small{font-size:13px;font-weight:600;color:var(--muted);letter-spacing:0;margin-left:6px}
.hb-sub{font-size:13px;color:var(--muted);line-height:1.4}
.hb-sub b{color:var(--text)}
.hb-bar{height:8px;border-radius:99px;background:var(--bg-2);overflow:hidden;margin:10px 0 4px}.hb-bar i{display:block;height:100%;border-radius:99px;background:#7CFFB2;transition:width .3s}
.hb-bar i.over{background:#FF5C7A}
.hb-bt{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.hb-bt .btn{padding:12px 8px;font-size:14.5px}
.hb-bt .win{background:rgba(124,255,178,.12);border-color:rgba(124,255,178,.45);color:#9dffc8}
.hb-bt .use{background:var(--bg-2)}
.hb-ch{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.hb-ch span{background:var(--bg-2);border-radius:99px;padding:4px 10px;font-size:12px;font-weight:600}
.hb-ch span b{color:var(--accent)}
.hb-mile{margin-top:10px;font-size:12.5px;color:var(--muted);display:flex;gap:8px;align-items:flex-start}
.hb-mile i{font-style:normal;flex:0 0 auto}
.hb-mile b{color:var(--text)}
.hb-ask p{font-size:13.5px;color:var(--muted);margin:4px 0 12px;line-height:1.4}
.hb-ask .x{position:absolute;top:8px;right:10px;border:0;background:none;color:var(--muted);font-size:22px;cursor:pointer}
.hbt{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}
.hbt button{border:1px solid var(--line);background:var(--bg-2);color:var(--text);border-radius:99px;padding:9px 13px;font-size:13.5px;font-weight:600;cursor:pointer}
.hbt button.on{border-color:var(--accent);background:rgba(124,255,178,.14)}
.hbk{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hbk button{text-align:left;border:1px solid var(--line);background:var(--bg-2);color:var(--text);border-radius:14px;padding:12px;cursor:pointer}
.hbk button b{display:block;font-size:14.5px}.hbk button small{display:block;color:var(--muted);font-size:12px;margin-top:2px}
.hbk button.on{border-color:var(--accent);background:rgba(124,255,178,.12)}
.hb-sos{text-align:center;padding:10px 0}
.hb-ring{width:150px;height:150px;border-radius:50%;margin:10px auto 14px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(124,255,178,.25),rgba(124,255,178,.05) 70%);transition:transform 4s ease-in-out}
.hb-ring.in{transform:scale(1.25)}.hb-ring.out{transform:scale(.85)}
.hb-ring b{font-size:22px}.hb-sos .ph{font-size:18px;font-weight:700;min-height:26px}.hb-sos .tt{font-size:40px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.hb-tips{text-align:left;font-size:13.5px;line-height:1.5;color:var(--muted);margin-top:10px}.hb-tips li{margin:6px 0}
.hb-warn{border-radius:14px;padding:12px 14px;margin:12px 0;font-size:13.5px;line-height:1.45;background:rgba(255,200,87,.12);border:1px solid rgba(255,200,87,.45)}
.hb-warn b{color:#FFC857}
.hb-danger{background:rgba(255,92,122,.12);border-color:rgba(255,92,122,.45)}.hb-danger b{color:#FF8FA4}
.hb-s .chart{width:100%;height:auto;display:block}
.hb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.hb-ml{margin:0;padding:0;list-style:none}.hb-ml li{display:flex;gap:10px;padding:9px 0;border-top:1px solid var(--line);font-size:13.5px;align-items:flex-start}
.hb-ml li:first-child{border-top:0}.hb-ml li i{font-style:normal;flex:0 0 22px;text-align:center}.hb-ml li.ok i{color:var(--accent)}.hb-ml li.todo{opacity:.55}
.hb-ml li b{display:block;font-size:13.5px}.hb-ml li span{color:var(--muted);font-size:12.5px;line-height:1.4}
.hb-log{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-top:1px solid var(--line);font-size:13.5px}
.hb-log:first-of-type{border-top:0}.hb-log small{color:var(--muted)}.hb-log .del{border:0;background:none;color:var(--muted);font-size:18px;cursor:pointer;padding:4px 6px}
.hb-log.win b{color:var(--accent)}
`;
if (!document.getElementById('hb-css')) { const el = document.createElement('style'); el.id = 'hb-css'; el.textContent = CSS; document.head.appendChild(el); }

// ---------- zápis ----------
async function addLog(hb, qty, extra = {}) {
  const uid = st().profile.id, now = new Date();
  const row = { user_id: uid, habit_id: hb.id, date: calc.today(), at: now.toISOString(), qty, kind: hb.kind, item: extra.item || hb.sub || null, trigger: extra.trigger || null, kcal: extra.kcal ?? null, note: extra.note || null };
  // alkohol je aj jedlo: zapíše sa do denníka s kalóriami, nech sedí denný súčet
  if (hb.kind === 'alcohol' && qty > 0 && extra.kcal) {
    try {
      const it = item('alcohol', extra.item || hb.sub);
      const hr = now.getHours(), meal = hr < 11 ? 'breakfast' : hr < 15 ? 'lunch' : hr < 21 ? 'dinner' : 'late';
      const f = await db.addFood({ user_id: uid, date: calc.today(), meal, name: `🍺 ${it.n}`, grams: it.g * qty, kcal: Math.round(extra.kcal), protein: 0, carbs: (it.c || 0) * qty, fat: 0, source: 'habit', portion: it.u[0], qty });
      row.food_log_id = f?.id || null;
    } catch (_) { /* denník jedla je bonus, zápis návyku ide ďalej */ }
  }
  must(await db.sb.from('habit_logs').insert(row));
  if (qty > 0 && hb.mode === 'quit') { await db.sb.from('habits').update({ quit_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', hb.id); }
  await load(uid, true);
}
async function delLog(l) {
  if (l.food_log_id) { try { await db.deleteFood(l.food_log_id); } catch (_) { /* mohol byť zmazaný ručne */ } }
  must(await db.sb.from('habit_logs').delete().eq('id', l.id));
  await load(st().profile.id, true);
}

// ---------- hárok: použitie (+1) ----------
export function openUse(hb, onDone) {
  const s = stats(hb, cache.logs || []);
  const it = s.item;
  const isAlc = hb.kind === 'alcohol';
  let trigger = null, pick = isAlc ? (hb.sub || 'beer') : null, qty = 1;
  const quit = hb.mode === 'quit';
  const bg = sheet(`<div class="row between"><h2>${isAlc ? 'Zapísať drink' : 'Zapísať ' + it.u[0].replace(/^./, c => c.toUpperCase())}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    ${quit && s.cleanH >= 24 ? `<div class="hb-warn"><b>Bez toho si ${sinceLbl(s.cleanH)}.</b> Ak to zapíšeš, séria sa začne odznova, ale celkový pokrok ostáva. Jedno zaváhanie nie je zlyhanie, je to dáta.</div>` : ''}
    ${isAlc ? `<p class="sec">Čo</p><div class="hbk">${ITEMS.alcohol.map(i => `<button data-i="${i.id}" class="${i.id === pick ? 'on' : ''}"><b>${i.n}</b><small>${i.kcal} kcal</small></button>`).join('')}</div>` : ''}
    <p class="sec">Koľko</p>
    <div class="qty"><button class="btn icon" data-d="-1">−</button><input class="input mono" id="hq" type="number" inputmode="numeric" min="1" value="1"><button class="btn icon" data-d="1">+</button></div>
    <p class="sec">Prečo (nepovinné, ale pomôže ti to)</p>
    <div class="hbt">${TRIGGERS.filter(([k]) => TRIG_FOR[hb.kind].includes(k)).map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('')}</div>
    <button class="btn primary" id="hsave">Zapísať</button>
    <p class="muted small center mt">${isAlc ? 'Drink sa zapíše aj do denníka jedla s kalóriami.' : quit ? 'Žiadne výčitky. Zapíš to a poď ďalej.' : 'Cieľ dnes: najviac ' + unitOf(it, Number(hb.daily_limit) || 0) + '.'}</p>`);
  const $ = x => bg.querySelector(x);
  $('[data-x]').onclick = () => bg.remove();
  bg.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { pick = b.dataset.i; bg.querySelectorAll('[data-i]').forEach(x => x.classList.toggle('on', x === b)); });
  bg.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { trigger = trigger === b.dataset.t ? null : b.dataset.t; bg.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x.dataset.t === trigger)); });
  bg.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { $('#hq').value = Math.max(1, Number($('#hq').value || 1) + Number(b.dataset.d)); });
  $('#hsave').onclick = async () => {
    qty = Math.max(1, Math.min(60, Number($('#hq').value) || 1));
    const btn = $('#hsave'); btn.disabled = true;
    try {
      const chosen = isAlc ? item('alcohol', pick) : it;
      await addLog(hb, qty, { item: chosen.id, trigger, kcal: isAlc ? chosen.kcal * qty : null });
      bg.remove();
      const s2 = stats(hb, cache.logs);
      if (hb.mode === 'reduce' && s2.todayQty > Number(hb.daily_limit)) toast(`Zapísané. Dnes ${unitOf(it, s2.todayQty)}, cieľ bol ${unitOf(it, Number(hb.daily_limit))}. Zajtra nanovo.`, true);
      else toast('Zapísané');
      onDone?.();
    } catch (e) { toast(e.message === 'NOTABLE' ? 'Režim Návyky sa ešte pripravuje.' : e.message, true); btn.disabled = false; }
  };
}

// ---------- hárok: SOS chuť (2 minúty dýchania, potom „odolal som“) ----------
const TIPS = {
  nicotine: ['Chuť trvá 3 až 5 minút. Nemusíš ju poraziť, stačí ju prečkať.', 'Napi sa vody alebo si daj žuvačku, ruky a ústa chcú niečo robiť.', 'Zmeň miesto: vstaň, prejdi sa, choď von bez cigariet.', 'Napíš si, čo ju spustilo. Spúšťače sa dajú obísť, keď ich poznáš.'],
  alcohol: ['Daj si nealko nápoj do rovnakého pohára. Ruka chce pohár, nie alkohol.', 'Chuť je vlna: stúpne, vrcholí a opadne. Trvá to pár minút.', 'Zjedz niečo s bielkovinami. Hlad sa často tvári ako chuť na pitie.', 'Napíš niekomu, kto o tvojom cieli vie. Jedna správa stačí.'],
};
export function openSOS(hb, onDone) {
  const it = stats(hb, cache.logs || []).item;
  let timer = null, step = 0, left = 120;
  const PH = [['Nádych', 4, 'in'], ['Zadrž', 4, 'hold'], ['Výdych', 6, 'out'], ['Pauza', 2, 'hold']];
  const bg = sheet(`<div class="row between"><h2>Mám chuť</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <div class="hb-sos"><p class="muted small">Dve minúty. Dýchaj podľa krúžku, chuť medzitým opadne.</p>
      <div class="hb-ring" id="ring"><b id="rt">4</b></div><div class="ph" id="ph">Nádych</div><div class="tt" id="tt">2:00</div>
      <button class="btn primary mt" id="win">Zvládol som to</button>
      <button class="btn ghost mt" id="skip">Dnes to nedám, zapísať ${it.u[3]}</button>
      <ul class="hb-tips">${TIPS[hb.kind].map(t => `<li>${t}</li>`).join('')}</ul>
      ${hb.kind === 'alcohol' ? '<p class="muted small mt">Ak máš triašku, potenie, zrýchlený pulz alebo zmätenosť, nie je to chuť, je to abstinenčný stav. Volaj lekára alebo 112.</p>' : ''}
    </div>`);
  const $ = x => bg.querySelector(x);
  const close = () => { clearInterval(timer); bg.remove(); };
  $('[data-x]').onclick = close;
  let phase = 0, pleft = PH[0][1];
  const ring = $('#ring');
  const tick = () => {
    left--; pleft--;
    if (pleft <= 0) { phase = (phase + 1) % PH.length; pleft = PH[phase][1]; }
    const [name, dur, cls] = PH[phase];
    $('#ph').textContent = name; $('#rt').textContent = pleft;
    ring.className = 'hb-ring ' + (cls === 'in' ? 'in' : cls === 'out' ? 'out' : ring.classList.contains('in') ? 'in' : 'out');
    $('#tt').textContent = `${Math.floor(Math.max(0, left) / 60)}:${String(Math.max(0, left) % 60).padStart(2, '0')}`;
    if (left <= 0) { clearInterval(timer); $('#ph').textContent = 'Hotovo. Ako sa cítiš?'; ring.className = 'hb-ring'; if (navigator.vibrate) navigator.vibrate([120, 60, 120]); }
  };
  ring.className = 'hb-ring in';
  timer = setInterval(tick, 1000);
  $('#win').onclick = async () => {
    clearInterval(timer);
    try { await addLog(hb, 0, { trigger: null }); close(); toast('Výhra zapísaná. Takto sa to robí.'); onDone?.(); }
    catch (e) { toast(e.message, true); }
  };
  $('#skip').onclick = () => { close(); openUse(hb, onDone); };
}

// ---------- hárok: nastavenie návyku ----------
export function openSetup(pre, onDone) {
  const edit = !!pre?.id;
  let kind = pre?.kind || null, sub = pre?.sub || null, mode = pre?.mode || 'quit';
  const vals = { base: pre?.baseline ?? '', lim: pre?.daily_limit ?? '', cost: pre?.unit_cost ?? null };
  const bg = sheet('');
  const box = bg.querySelector('.sheet');
  const close = () => bg.remove();
  const draw = () => {
    const its = kind ? ITEMS[kind] : [];
    const it = kind ? item(kind, sub) : null;
    box.innerHTML = `<div class="row between"><h2>${edit ? 'Upraviť návyk' : 'Nový návyk'}</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <p class="muted small mt mb">Appka zapisuje, počíta a drží ťa pri tom. Nie je to lekár ani liečba, pri ťažkej závislosti je lekár prvý krok.</p>
      <p class="sec">Čo chceš riešiť</p>
      <div class="hbk">${Object.entries(KINDS).map(([k, v]) => `<button data-k="${k}" class="${k === kind ? 'on' : ''}" ${edit ? 'disabled' : ''}><b>${v.icon} ${v.title}</b><small>${v.sub}</small></button>`).join('')}</div>
      ${kind ? `<p class="sec">${kind === 'nicotine' ? 'Forma' : 'Čo piješ najčastejšie'}</p><div class="hbt">${its.map(i => `<button data-s="${i.id}" class="${i.id === (sub || its[0].id) ? 'on' : ''}">${i.n}</button>`).join('')}</div>
      <p class="sec">Cieľ</p>
      <div class="seg mb" id="mode"><button data-m="quit" class="${mode === 'quit' ? 'on' : ''}">Skončiť úplne</button><button data-m="reduce" class="${mode === 'reduce' ? 'on' : ''}">Znížiť</button></div>
      <div class="grid2">
        <label class="field"><span>Koľko denne doteraz</span><input class="input" id="base" type="text" inputmode="decimal" autocomplete="off" placeholder="napr. 10" value="${vals.base}"></label>
        <label class="field" id="limWrap" style="${mode === 'reduce' ? '' : 'display:none'}"><span>Cieľ najviac denne</span><input class="input" id="lim" type="text" inputmode="decimal" autocomplete="off" placeholder="napr. 5" value="${vals.lim}"></label>
      </div>
      <label class="field"><span>Cena za 1 ${it.u[0]} (EUR)</span><input class="input" id="cost" type="text" inputmode="decimal" autocomplete="off" value="${vals.cost ?? it.cost}"></label>
      <p class="muted small">Z toho ti appka počíta ušetrené peniaze${kind === 'alcohol' ? ' a kalórie' : ''}.</p>
      <div id="warn"></div>
      <p class="err small" id="err"></p>
      <button class="btn primary mt" id="save">${edit ? 'Uložiť' : 'Začať dnes'}</button>
      ${edit ? '<button class="btn ghost mt" id="stop" style="color:var(--danger)">Ukončiť tento návyk</button>' : ''}` : ''}`;
    box.querySelector('[data-x]').onclick = close;
    const keep = () => { const b = box.querySelector('#base'), l = box.querySelector('#lim'); if (b) vals.base = b.value; if (l) vals.lim = l.value; };
    box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { keep(); kind = b.dataset.k; sub = ITEMS[kind][0].id; vals.cost = null; draw(); });
    box.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { keep(); sub = b.dataset.s; vals.cost = edit ? num(box.querySelector('#cost').value) : null; draw(); });
    box.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; box.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); box.querySelector('#limWrap').style.display = mode === 'reduce' ? '' : 'none'; warn(); });
    const warn = () => {
      const w = box.querySelector('#warn'); if (!w) return;
      const base = num(box.querySelector('#base')?.value) || 0;
      if (kind === 'alcohol' && base >= 4) w.innerHTML = `<div class="hb-warn hb-danger"><b>Dôležité.</b> Pri pravidelnom pití ${base} a viac nápojov denne môže byť náhle vysadenie nebezpečné (triaška, kŕče, delírium). Nekonči zo dňa na deň sám. Poraď sa s lekárom, znižuj postupne a appka ti s tým pomôže. Pri silnej triaške, zmätenosti alebo kŕčoch volaj 112.</div>`;
      else if (kind === 'nicotine' && base >= 20 && mode === 'quit') w.innerHTML = `<div class="hb-warn"><b>Tip.</b> Pri ${base} a viac denne výrazne pomáha nikotínová náhrada (náplasť, žuvačky, sprej), zdvojnásobuje šancu na úspech. Lekárnik ti poradí bez receptu.</div>`;
      else w.innerHTML = '';
    };
    box.querySelector('#base')?.addEventListener('input', warn); warn();
    box.querySelector('#save')?.addEventListener('click', async () => {
      const base = num(box.querySelector('#base').value), lim = num(box.querySelector('#lim').value), cost = num(box.querySelector('#cost').value);
      const err = box.querySelector('#err');
      if (!(base >= 0) || box.querySelector('#base').value === '') { err.textContent = 'Napíš, koľko denne doteraz (môže byť aj odhad).'; return; }
      if (mode === 'reduce' && !(lim >= 0 && box.querySelector('#lim').value !== '')) { err.textContent = 'Napíš cieľ, najviac koľko denne.'; return; }
      if (mode === 'reduce' && lim >= base && base > 0) { err.textContent = 'Cieľ má byť menší než doterajšie množstvo.'; return; }
      const uid = st().profile.id, now = new Date().toISOString();
      const row = { user_id: uid, kind, sub: sub || ITEMS[kind][0].id, mode, baseline: base, daily_limit: mode === 'reduce' ? lim : 0, unit_cost: cost >= 0 ? cost : null, active: true, updated_at: now };
      if (!edit) { row.start_date = calc.today(); row.quit_at = mode === 'quit' ? now : null; }
      box.querySelector('#save').disabled = true;
      try {
        if (edit) must(await db.sb.from('habits').update(row).eq('id', pre.id)); else must(await db.sb.from('habits').insert(row));
        await load(uid, true); close(); toast(edit ? 'Uložené' : 'Ideme na to. Každé ťuknutie sa počíta.'); onDone?.();
      } catch (e) { box.querySelector('#save').disabled = false; err.textContent = e.message === 'NOTABLE' ? 'Režim Návyky sa ešte pripravuje. Skús to o chvíľu.' : e.message; }
    });
    box.querySelector('#stop')?.addEventListener('click', async () => {
      if (!confirm('Ukončiť sledovanie tohto návyku? História ostane uložená.')) return;
      try { must(await db.sb.from('habits').update({ active: false, updated_at: new Date().toISOString() }).eq('id', pre.id)); await load(st().profile.id, true); close(); toast('Ukončené'); onDone?.(); } catch (e) { toast(e.message, true); }
    });
  };
  draw();
}

// ---------- karta na obrazovke Dnes ----------
function cardHtml(hb) {
  const s = stats(hb, cache.logs);
  const it = s.item, quit = hb.mode === 'quit', K = KINDS[hb.kind];
  const lim = Number(hb.daily_limit) || 0;
  const clean = quit ? s.todayQty === 0 : s.todayQty <= lim;
  let main;
  if (quit) {
    main = `<div class="hb-main"><div class="hb-big">${s.cleanDays >= 1 ? s.cleanDays : sinceLbl(s.cleanH)}<small>${s.cleanDays >= 1 ? pl(s.cleanDays, 'deň', 'dni', 'dní').replace(/^\d+ /, '') + ' bez' : 'bez'}</small></div>
      <div class="hb-sub">${s.cleanDays >= 1 ? `<b>Čisto od ${calc.fmtDate(dkey(s.since))}</b><br>` : s.lastUse && s.cleanH < 24 ? `<b>Posledné dnes ${new Date(s.lastUse).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}. Odteraz sa počíta.</b><br>` : '<b>Prvý deň. Dnes rozhoduje.</b><br>'}${s.avoided > 0 ? `${r0(s.avoided)} ${it.u[2]} menej než predtým` : 'Každá odolaná chuť sa ráta'}</div></div>`;
  } else {
    const pct = lim ? Math.min(100, s.todayQty / lim * 100) : 0;
    main = `<div class="hb-main"><div class="hb-big">${s.todayQty}<small>z ${lim} ${it.u[2]} dnes</small></div>
      <div class="hb-sub">${s.streak >= 2 ? `<b>${pl(s.streak, 'deň', 'dni', 'dní')} v cieli</b><br>` : ''}${s.todayQty <= lim ? `Zostáva ${unitOf(it, Math.max(0, lim - s.todayQty))}` : `<b style="color:#FF8FA4">Nad cieľ o ${unitOf(it, s.todayQty - lim)}</b>`}</div></div>
      <div class="hb-bar"><i class="${s.todayQty > lim ? 'over' : ''}" style="width:${pct}%"></i></div>`;
  }
  const chips = [s.saved > 0 ? `💶 ušetrené <b>${eur(s.saved)}</b>` : '', s.wins ? `🛡️ odolané chute <b>${s.wins}</b>` : '', hb.kind === 'alcohol' && s.weekKcal ? `🔥 tento týždeň <b>${r0(s.weekKcal)} kcal</b> z pitia` : '', s.best >= 3 ? `🏆 najdlhšie <b>${pl(s.best, 'deň', 'dni', 'dní')}</b>` : ''].filter(Boolean);
  const mile = s.next ? `<div class="hb-mile"><i>⏳</i><span>Ďalší míľnik o <b>${sinceLbl(Math.max(0.02, s.next[0] - s.cleanH))}</b> (${s.next[1]}): ${s.next[2]}</span></div>` : s.reached.length ? `<div class="hb-mile"><i>🏅</i><span><b>${s.reached[s.reached.length - 1][1]}:</b> ${s.reached[s.reached.length - 1][2]}</span></div>` : '';
  return `<div class="hb ${clean && (quit ? s.cleanH >= 12 : true) ? 'clean' : ''}" data-hb="${hb.id}">
    <h3>${K.icon} ${K.title}${hb.sub ? ` · ${it.n}` : ''} <a href="#/navyky">Prehľad</a></h3>
    ${main}
    <div class="hb-bt"><button class="btn win" data-sos="${hb.id}">${hb.kind === 'nicotine' ? '🫁' : '🧘'} Mám chuť</button><button class="btn use" data-use="${hb.id}">＋ ${it.u[0].replace(/^./, c => c.toUpperCase())}</button></div>
    ${chips.length ? `<div class="hb-ch">${chips.map(c => `<span>${c}</span>`).join('')}</div>` : ''}
    ${mile}
  </div>`;
}
function bindCards(wrap, rerender) {
  wrap.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { const hb = cache.habits.find(x => x.id === Number(b.dataset.use)); if (hb) openUse(hb, rerender); });
  wrap.querySelectorAll('[data-sos]').forEach(b => b.onclick = () => { const hb = cache.habits.find(x => x.id === Number(b.dataset.sos)); if (hb) openSOS(hb, rerender); });
}

let busy = false;
const seen = new WeakSet();
async function inject() {
  if (busy || !root || !ctx.state?.profile) return;
  const uid = ctx.state.profile.id;
  // odkaz v Profile
  const link = root.querySelector('.screen a.btn[href="#/ciele"]');
  if (link && !root.querySelector('#hblink')) {
    const a = document.createElement('a'); a.id = 'hblink'; a.className = 'btn mb'; a.href = '#/navyky'; a.textContent = '🚭 Návyky: nikotín a alkohol';
    (root.querySelector('#dxlink') || link).after(a);
  }
  const meals = root.querySelector('.screen.td .meals');
  if (!meals || root.querySelector('#hbdash') || ctx.state.date !== calc.today() || seen.has(meals)) return;
  // každú vykreslenú obrazovku skontroluje len raz (inak by pri každej zmene na stránke znova volal databázu)
  seen.add(meals);
  busy = true;
  try {
    let c;
    try { c = await load(uid); } catch (e) { if (e.message === 'NOTABLE') return; throw e; }
    const m = root.querySelector('.screen.td .meals');
    if (!m || root.querySelector('#hbdash')) return;
    const hbs = activeHabits();
    // bez návyku nič; ponuka je dlaždica v páse „Objav v appke“ (discover.js)
    if (!hbs.length) return;
    const wrap = document.createElement('section'); wrap.id = 'hbdash'; wrap.innerHTML = hbs.map(cardHtml).join('');
    // pod jedlami: najprv zápis jedla, potom návyky
    (root.querySelector('.screen.td #fw-discover') || root.querySelector('.screen.td details.an') || m).after(wrap);
    const rerender = async () => { await load(uid, true); const w = root.querySelector('#hbdash'); if (!w) return; w.innerHTML = activeHabits().map(cardHtml).join(''); bindCards(w, rerender); };
    bindCards(wrap, rerender);
  } catch (_) { /* nepodstatné */ } finally { busy = false; }
}
// prvé spustenie až po dokončení app.js (tento modul načítava priamo app.js, ctx ešte nemusí existovať)
if (root) { new MutationObserver(inject).observe(root, { childList: true, subtree: true }); setTimeout(inject, 0); }

// ---------- obrazovka #/navyky ----------
function chart(hb, s) {
  const W = 520, H = 150, pl = 6, pb = 20, days = 30, from = calc.addDays(calc.today(), -days + 1);
  const lim = hb.mode === 'quit' ? 0 : Number(hb.daily_limit) || 0;
  const vals = Array.from({ length: days }, (_, i) => { const d = calc.addDays(from, i); return { d, v: s.byDay[d] || 0, pre: d < hb.start_date }; });
  const max = Math.max(1, lim, ...vals.map(x => x.v), Number(hb.baseline) || 0);
  const bw = (W - pl * 2) / days;
  const y = v => H - pb - (v / max) * (H - pb - 10);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Posledných 30 dní">
    ${hb.baseline ? `<line x1="${pl}" x2="${W - pl}" y1="${y(Number(hb.baseline))}" y2="${y(Number(hb.baseline))}" stroke="#8A94A6" stroke-dasharray="4 4"/><text x="${W - pl}" y="${y(Number(hb.baseline)) - 4}" font-size="10" fill="#8A94A6" text-anchor="end">predtým ${hb.baseline}</text>` : ''}
    ${lim ? `<line x1="${pl}" x2="${W - pl}" y1="${y(lim)}" y2="${y(lim)}" stroke="#7CFFB2" stroke-dasharray="4 4"/><text x="${pl}" y="${y(lim) - 4}" font-size="10" fill="#7CFFB2">cieľ ${lim}</text>` : ''}
    ${vals.map((x, i) => x.pre ? '' : `<rect x="${pl + i * bw + 1}" y="${x.v ? y(x.v) : H - pb - 3}" width="${bw - 2}" height="${x.v ? H - pb - y(x.v) : 3}" rx="2" fill="${x.v > lim ? '#FF5C7A' : x.v ? '#FFC857' : '#7CFFB2'}" opacity="${x.v ? '.95' : '.8'}"/>`).join('')}
    <text x="${pl}" y="${H - 5}" font-size="11" fill="#8A94A6">${calc.fmtDate(from)}</text><text x="${W - pl}" y="${H - 5}" font-size="11" fill="#8A94A6" text-anchor="end">dnes</text>
  </svg>`;
}

export async function renderHabits() {
  const uid = st().profile.id;
  $app().innerHTML = `<div class="screen"><div class="topbar"><h1>Návyky</h1></div><div class="spinner"></div></div>${nav('#/')}`;
  try { await load(uid, true); } catch (e) {
    $app().innerHTML = `<div class="screen"><div class="topbar"><h1>Návyky</h1></div><div class="card"><p class="muted">${e.message === 'NOTABLE' ? 'Režim Návyky sa ešte pripravuje. Skús to o chvíľu.' : h(e.message)}</p></div></div>${nav('#/')}`; return;
  }
  const hbs = activeHabits();
  const draw = () => {
    const blocks = hbs.map(hb => {
      const s = stats(hb, cache.logs), it = s.item, K = KINDS[hb.kind], quit = hb.mode === 'quit';
      const recent = cache.logs.filter(l => l.habit_id === hb.id).slice(-12).reverse();
      const trigRows = s.trigN ? Object.entries(s.trig).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `<div class="hb-log"><span>${TRIG[k] || k}</span><small>${Math.round(n / s.trigN * 100)} %</small></div>`).join('') : '<p class="empty">Pri zápise vyber, čo chuť spustilo, a tu uvidíš, čo ťa najviac ťahá.</p>';
      return `<section class="hb-s">
        ${cardHtml(hb)}
        <div class="card"><div class="hb-grid">
          <div class="stat"><b class="mono">${quit ? s.cleanDays : s.streak}</b><span>${quit ? 'dní bez' : 'dní v cieli'}</span></div>
          <div class="stat"><b class="mono">${s.best}</b><span>najdlhšia séria</span></div>
          <div class="stat"><b class="mono">${s.wins}</b><span>odolané chute</span></div>
          <div class="stat"><b class="mono">${r0(s.avoided)}</b><span>${it.u[2]} menej</span></div>
          <div class="stat"><b class="mono">${eur(s.saved)}</b><span>ušetrené</span></div>
          <div class="stat"><b class="mono">${hb.kind === 'alcohol' ? r0(s.kcalAvoided).toLocaleString('sk-SK') : s.days}</b><span>${hb.kind === 'alcohol' ? 'kcal nevypitých' : 'dní v programe'}</span></div>
        </div></div>
        <div class="card"><h3 class="mb">Posledných 30 dní</h3>${chart(hb, s)}<p class="muted small mt">${quit ? 'Zelené dni sú čisté. Jeden červený deň sériu preruší, celkový počet dní ostáva.' : 'Zelené dni sú v cieli, červené nad cieľom. Čiara je tvoj limit.'}</p></div>
        <div class="card"><h3 class="mb">Čo ťa najviac ťahá</h3>${trigRows}${s.topTrig ? `<p class="muted small mt">Najčastejšie: <b style="color:var(--text)">${TRIG[s.topTrig[0]]}</b>. ${({ stress: 'Pri strese pomôže 2-minútové dýchanie alebo krátka prechádzka, nie cigareta.', coffee: 'Zmeň rituál: káva v inej miestnosti alebo čaj, prvé dni to rozbije spojenie.', social: 'Povedz ľuďom dopredu, že nefajčíš alebo nepiješ. Väčšina to rešpektuje.', bored: 'Nuda chce ruky a ústa. Žuvačka, voda, 10 drepov.', alcohol: 'Pri pití je najťažšie odolať. Na prvé týždne zváž večer bez alkoholu.', meal: 'Po jedle vstaň od stola a umy zuby. Chuť po jedle trvá pár minút.', habit: 'Zo zvyku znamená bez chuti. Len si to všimni a prejdi okolo.', other: 'Zapisuj si spúšťače, po týždni uvidíš vzorec.' })[s.topTrig[0]] || ''}</p>` : ''}</div>
        <div class="card"><h3 class="mb">Míľniky zdravia</h3><ul class="hb-ml">${MILES[hb.kind].map(m => `<li class="${s.cleanH >= m[0] ? 'ok' : 'todo'}"><i>${s.cleanH >= m[0] ? '✓' : '○'}</i><div><b>${m[1]}</b><span>${m[2]}</span></div></li>`).join('')}</ul></div>
        <div class="card"><h3 class="mb">Posledné zápisy</h3>${recent.length ? recent.map(l => `<div class="hb-log ${Number(l.qty) === 0 ? 'win' : ''}"><div><b>${Number(l.qty) === 0 ? '🛡️ Odolaná chuť' : `${l.qty} × ${item(hb.kind, l.item).n}`}</b><br><small>${calc.fmtDate(l.date)} ${new Date(l.at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}${l.trigger ? ' · ' + TRIG[l.trigger] : ''}${l.kcal ? ' · ' + r0(l.kcal) + ' kcal' : ''}</small></div><button class="del" data-del="${l.id}" aria-label="Zmazať">×</button></div>`).join('') : '<p class="empty">Zatiaľ žiadne zápisy.</p>'}</div>
        <button class="btn mb" data-edit="${hb.id}">Upraviť nastavenie</button>
      </section>`;
    }).join('');
    $app().innerHTML = `<div class="screen">
      <div class="topbar"><h1>Návyky</h1><a class="chip" href="#/profil">Späť</a></div>
      ${hbs.length ? blocks : `<div class="card"><h3>Nikotín alebo alkohol</h3><p class="muted small mt">Jedno ťuknutie na zápis, séria dní, ušetrené peniaze, pomoc pri chuti. Kouč Gust to vidí v súvislostiach s jedlom, spánkom a váhou a vie, že po skončení s fajčením sa priberá, a ustráži to.</p></div>`}
      ${hbs.length < 2 ? '<button class="btn primary mb" id="hbadd">＋ Pridať návyk</button>' : ''}
      <p class="muted small center">Fuelwind nie je zdravotnícka pomôcka a nenahrádza lekára. Pri silnej závislosti na alkohole nekonči náhle bez lekára.</p>
    </div>${nav('#/')}`;
    const R = $app();
    bindCards(R, async () => { await load(uid, true); draw(); });
    R.querySelector('#hbadd')?.addEventListener('click', () => openSetup(null, async () => { await load(uid, true); hbs.splice(0, hbs.length, ...activeHabits()); draw(); }));
    R.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { const hb = cache.habits.find(x => x.id === Number(b.dataset.edit)); openSetup(hb, async () => { await load(uid, true); hbs.splice(0, hbs.length, ...activeHabits()); draw(); }); });
    R.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const l = cache.logs.find(x => x.id === Number(b.dataset.del)); if (!l) return; try { await delLog(l); draw(); } catch (e) { toast(e.message, true); } });
  };
  draw();
}
