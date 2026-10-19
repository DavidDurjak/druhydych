// Zdravie a diéta: zapnutie režimov (cukrovka, celiakia, laktóza, alergie, vysoký tlak) a ich nastavenie.
import * as dx from './dxcore.js';
import { DIETS, DIET_KEYS } from './dietcore.js';
import { ctx } from './app.js';

const h = (...a) => ctx.h(...a), toast = (...a) => ctx.toast(...a), nav = (...a) => ctx.nav(...a);
const $app = () => ctx.$app;

const INFO = {
  celiac: ['Bezlepková diéta: čo vedieť', `<p><b>Na obale hľadaj</b> prečiarknutý klas alebo text „bez lepku“. Takéto potraviny majú najviac 20 mg lepku na kg. Alergény sú v zložení vyznačené tučným písmom (pšenica, raž, jačmeň, ovos).</p>
    <p><b>Skryté zdroje lepku:</b> sójová omáčka, slad, zápražka a zahusťovadlá v omáčkach a polievkach, údeniny a párky, instantné polievky a korenie, oblátky, pivo.</p>
    <p><b>Ovos</b> je bez lepku len vtedy, ak je certifikovaný. Bežný býva kontaminovaný pšenicou.</p>
    <p><b>V reštaurácii</b> sa pýtaj na spoločný olej na vyprážanie, spoločné dosky a obaly. Na cestách ti pomôže karta v cudzom jazyku.</p>`],
  diabetes: ['Cukrovka: ako to appka počíta', `<p><b>SJ (sacharidová jednotka)</b> je množstvo sacharidov, ktoré si nastavíš na 10 alebo 12 g. Rožok s 28 g sacharidov je pri 10 g približne 2,8 SJ.</p>
    <p><b>GI</b> (glykemický index) ukazuje, ako rýchlo sacharidy zdvihnú cukor. <b>GZ</b> (glykemická záťaž) je GI krát množstvo sacharidov, takže zohľadňuje aj porciu. Obe hodnoty sú orientačné a u každého človeka sú trochu iné.</p>
    <p><b>Pravidlo 15</b> pri nízkom cukre: 15 g rýchlych sacharidov, 15 minút čakať, znova zmerať. Tlačidlo „Mám nízky cukor“ ťa tým prevedie.</p>
    <p><b>Čo appka nerobí:</b> nepočíta dávky inzulínu ani liekov a nenahrádza lekára. Cieľový rozsah si nastav podľa svojho diabetológa.</p>`],
  lactose: ['Intolerancia laktózy: čo vedieť', `<p><b>Veľa laktózy</b> majú mlieko, jogurty, tvaroh, smotana a čerstvé syry. <b>Málo</b> majú dlho zrejúce syry (eidam, gouda, parmezán), maslo a niektoré fermentované výrobky. Znášanlivosť je individuálna.</p>
    <p><b>Bez laktózy</b> sú rastlinné nápoje a mliečne výrobky označené „bez laktózy“. Laktáza v tabletkách pomáha pri občasnom jedle s laktózou.</p>
    <p>Intolerancia laktózy nie je alergia na mliečnu bielkovinu. Ak máš alergiu na mlieko, zapni si režim Alergia.</p>`],
  allergy: ['Alergia: dôležité upozornenie', `<p>Zoznam alergénov čerpáme z údajov výrobcov a databázy Open Food Facts. Údaje môžu byť neúplné alebo zastarané, preto pri alergii <b>vždy skontroluj aktuálny obal</b>.</p>
    <p>Jedlá, pri ktorých zloženie nepoznáme, sú označené sivým otáznikom. Nepovažuj ich za bezpečné.</p>
    <p>Pri ťažkej reakcii (opuch hrdla, dýchavičnosť, slabosť) volaj <b>112</b> a použi adrenalínový autoinjektor, ak ho máš predpísaný.</p>`],
  vegan: ['Vegánska strava: na čo si dať pozor', `<p><b>Vitamín B12</b> sa v rastlinách prakticky nenachádza. Vegáni ho zvyčajne užívajú ako doplnok alebo z obohatených potravín.</p>
    <p><b>Zvyčajne treba sledovať aj</b> železo, jód, vápnik, vitamín D a omega-3. Kvalitné bielkoviny dáva tofu, tempeh, strukoviny, seitan a sójové výrobky.</p>
    <p>Appka ti vie označiť jedlá s mäsom, rybami, mliekom, vajcami a medom podľa názvu a zloženia. Nenahrádza dietológa, najmä pri tehotenstve, v detstve a pri chorobe sa poraď s lekárom.</p>`],
  halal: ['Halal a kosher: čo appka vie', `<p>Appka označí bravčové mäso, alkohol a morské plody (kosher) podľa názvu jedla a zloženia.</p>
    <p><b>Nevie overiť</b>, či je mäso porazené podľa pravidiel ani či má prevádzka certifikát. Ten si over u predajcu alebo na obale.</p>`],
  salt: ['Vysoký tlak: soľ', `<p>Odporúčaný denný strop je približne <b>5 g soli</b>, čo je jedna čajová lyžička. Soľ vypočítaš zo sodíka: sodík × 2,5.</p>
    <p>Najviac soli skrýva pečivo, údeniny, syry, polievky z balíčka, koreniace zmesi a hotové jedlá, nie len soľnnička.</p>
    <p>Jedlá s viac ako 1,5 g soli na 100 g označujeme ako veľmi slané.</p>`],
};

export async function renderDiet() {
  const uid = ctx.state.profile.id;
  await dx.ensure(uid);
  let s = JSON.parse(JSON.stringify(dx.cfg()));
  const u = () => s.unit;

  const draw = () => {
    const on = m => s.modes.includes(m);
    const hasD = k => s.diets.includes(k);
    $app().innerHTML = `<div class="screen dxs-screen">
      <div class="topbar"><h1>Zdravie a diéta</h1></div>
      <p class="muted mb">Nastav, ako sa stravuješ a čo musíš strážiť. Appka potom označuje jedlá aj recepty, stráži tvoje limity a ukáže len to, čo potrebuješ.</p>
      <h3 class="dxh2">Ako sa stravuješ</h3>
      <div class="dxd">${DIET_KEYS.map(k => `<button class="dxdt ${hasD(k) ? 'on' : ''}" data-d="${k}" aria-pressed="${hasD(k)}"><span class="dxdi">${DIETS[k].icon}</span><b>${DIETS[k].title}</b><small>${DIETS[k].sub}</small></button>`).join('')}</div>
      <h3 class="dxh2">Zdravie</h3>
      ${Object.entries(dx.MODES).map(([k, m]) => `<button class="dxm ${on(k) ? 'on' : ''}" data-m="${k}" aria-pressed="${on(k)}"><span class="dxm-i">${m.icon}</span><span class="dxm-t"><b>${m.title}</b><small>${m.sub}</small></span><span class="dxm-s"></span></button>`).join('')}
      ${on('diabetes') ? `<div class="card mt">
        <h3 class="mb">Cukrovka</h3>
        <label class="field"><span>Typ</span><select class="input" id="dt">${Object.entries(dx.DTYPES).map(([k, v]) => `<option value="${k}" ${s.dtype === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        <div class="seg mb" id="un"><button data-u="mmol" class="${u() === 'mmol' ? 'on' : ''}">mmol/l</button><button data-u="mgdl" class="${u() === 'mgdl' ? 'on' : ''}">mg/dl</button></div>
        <div class="grid2">
          <label class="field"><span>Nízky cukor pod (${dx.unitLbl(u())})</span><input class="input" id="lo" type="text" inputmode="decimal" value="${dx.fmtG(s.lo, u()).replace(',', '.')}"></label>
          <label class="field"><span>Dobrý rozsah do (${dx.unitLbl(u())})</span><input class="input" id="hi" type="text" inputmode="decimal" value="${dx.fmtG(s.hi, u()).replace(',', '.')}"></label>
        </div>
        <p class="muted small mb">Predvolené hodnoty sú podľa bežných odporúčaní. Presné ciele ti určí tvoj lekár, podľa nich ich uprav.</p>
        <p class="small mb"><b>Veľkosť sacharidovej jednotky</b></p>
        <div class="seg mb" id="sj"><button data-s="10" class="${s.sj === 10 ? 'on' : ''}">10 g</button><button data-s="12" class="${s.sj === 12 ? 'on' : ''}">12 g</button></div>
        <label class="field"><span>Cieľ sacharidov na jedlo v gramoch (nepovinné)</span><input class="input" id="mc" type="text" inputmode="numeric" placeholder="napr. 45" value="${s.mealCarb || ''}"></label>
        <label class="row small" style="gap:10px"><input type="checkbox" id="ins" ${s.insulin ? 'checked' : ''}> Zapisujem inzulín (pridá políčko do denníka cukru)</label>
        ${on('diabetes') ? `<a class="btn mt" href="#/cukor">🩸 Otvoriť denník cukru</a>` : ''}
      </div>` : ''}
      ${on('allergy') ? `<div class="card mt"><h3 class="mb">Tvoje alergény</h3><div class="dxal">${dx.ALLERGENS.map(([k, l]) => `<button type="button" data-a="${k}" class="${s.allergens.includes(k) ? 'on' : ''}">${l}</button>`).join('')}</div></div>` : ''}
      ${(s.diets.length || s.modes.some(m => ['celiac', 'lactose', 'allergy'].includes(m))) ? `<label class="card row small" style="gap:12px;align-items:flex-start"><input type="checkbox" id="hide" ${s.hide ? 'checked' : ''} style="margin-top:3px"><span><b>Skryť nevhodné jedlá vo vyhľadávaní</b><br><span class="muted">Jedlá a recepty, ktoré nesedia k tvojmu stravovaniu, lepku, laktóze alebo alergénom, sa nebudú zobrazovať. Vždy ich môžeš zobraziť jedným ťuknutím.</span></span></label>` : ''}
      ${s.modes.length ? `<a class="btn mb" href="#/karta">🌍 Karty do zahraničia (lepok, alergie, cukrovka)</a>` : ''}
      ${(s.modes.length || s.diets.length) ? `<div class="card"><label class="row small" style="gap:12px;align-items:flex-start"><input type="checkbox" id="cons" ${s.consent ? 'checked' : ''} style="margin-top:3px"><span>Súhlasím, aby Fuelwind ukladal údaje o mojom zdraví a stravovaní (zapnuté režimy, diéty, glykémiu) na účely týchto funkcií. Diéty môžu prezrádzať aj náboženské alebo etické presvedčenie, preto tento súhlas potrebujem. Údaje vidím len ja, nevidí ich ani kouč. Súhlas môžem kedykoľvek odvolať vypnutím režimov a diét a zmazaním meraní.</span></label></div>` : ''}
      <button class="btn primary mb" id="save">Uložiť</button>
      ${[...s.diets.map(d => d === 'vegan' ? 'vegan' : (d === 'halal' || d === 'kosher') ? 'halal' : null), ...s.modes].filter((m, i, a) => m && INFO[m] && a.indexOf(m) === i).map(m => `<details class="dxi"><summary>${INFO[m][0]}</summary>${INFO[m][1]}</details>`).join('')}
      <p class="muted small center mt">Fuelwind nie je zdravotnícka pomôcka a nenahrádza lekára ani dietológa. Údaje o lepku, laktóze a alergénoch pochádzajú od výrobcov a z databázy Open Food Facts a môžu byť neúplné. Pri celiakii a alergii vždy over aktuálny obal.</p>
    </div>${nav('#/profil')}`;
    bind();
  };

  const bind = () => {
    const $ = x => $app().querySelector(x);
    $app().querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const k = b.dataset.d; readInputs();
      const food = ['vegetarian', 'vegan', 'pescatarian'];
      if (s.diets.includes(k)) s.diets = s.diets.filter(x => x !== k);
      else s.diets = [...s.diets.filter(x => !(food.includes(k) && food.includes(x))), k];
      draw();
    });
    $app().querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      const m = b.dataset.m; readInputs();
      s.modes = s.modes.includes(m) ? s.modes.filter(x => x !== m) : [...s.modes, m];
      if (m === 'diabetes' && s.modes.includes('diabetes')) applyType(s.dtype);
      draw();
    });
    $('#dt') && ($('#dt').onchange = e => { readInputs(); s.dtype = e.target.value; applyType(s.dtype); draw(); });
    $('#un') && $('#un').querySelectorAll('[data-u]').forEach(b => b.onclick = () => { readInputs(); s.unit = b.dataset.u; draw(); });
    $('#sj') && $('#sj').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { readInputs(); s.sj = Number(b.dataset.s); draw(); });
    $app().querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const k = b.dataset.a; s.allergens = s.allergens.includes(k) ? s.allergens.filter(x => x !== k) : [...s.allergens, k]; b.classList.toggle('on'); });
    $('#save').onclick = save;
  };
  const applyType = t => { const d = dx.DTYPES[t]; if (!d) return; s.lo = d.lo; s.hi = d.hi; s.fast = d.fast; s.insulin = d.insulin; };
  const readInputs = () => {
    const $ = x => $app().querySelector(x);
    const num = el => { const n = Number(String(el.value).replace(',', '.')); return isFinite(n) && n > 0 ? n : null; };
    if ($('#lo')) { const lo = num($('#lo')), hi = num($('#hi')); if (lo) s.lo = dx.fromUnit(lo, u()); if (hi) s.hi = dx.fromUnit(hi, u()); }
    if ($('#mc')) { const m = num($('#mc')); s.mealCarb = m ? Math.round(m) : null; }
    if ($('#ins')) s.insulin = $('#ins').checked;
    if ($('#hide')) s.hide = $('#hide').checked;
    if ($('#cons')) s.consent = $('#cons').checked ? (s.consent || new Date().toISOString()) : null;
  };
  const save = async () => {
    readInputs();
    if ((s.modes.length || s.diets.length) && !s.consent) { toast('Bez súhlasu so spracovaním údajov o zdraví a stravovaní to uložiť nemôžem', true); return; }
    if (s.modes.includes('diabetes') && !(s.lo > 0 && s.hi > s.lo)) { toast('Skontroluj cieľový rozsah: horná hranica musí byť vyššia ako dolná', true); return; }
    if (s.modes.includes('allergy') && !s.allergens.length) { toast('Vyber aspoň jeden alergén', true); return; }
    const btn = $app().querySelector('#save'); btn.disabled = true;
    try {
      await dx.saveCfg(ctx.state.profile.id, s);
      toast((s.modes.length || s.diets.length) ? 'Uložené. Jedlá a recepty sú teraz prispôsobené tebe.' : 'Uložené');
      location.hash = '#/';
    } catch (e) { toast(e.message, true); btn.disabled = false; }
  };
  draw();
}

const CSS = `
.dxh2{margin:18px 2px 10px;font-size:15px;font-weight:700;letter-spacing:-.01em}
.dxd{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px}
.dxdt{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;min-height:104px;padding:13px 13px 12px;border-radius:18px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font:inherit;cursor:pointer;transition:border-color .18s,background .18s,transform .12s,box-shadow .18s;-webkit-tap-highlight-color:transparent}
.dxdt:active{transform:scale(.975)}
.dxdt .dxdi{font-size:24px;line-height:1;margin-bottom:4px}
.dxdt b{font-size:15px;letter-spacing:-.01em}
.dxdt small{font-size:12px;line-height:1.35;color:var(--muted)}
.dxdt.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 13%,var(--card));box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 16%,transparent)}
.dxdt.on::after{content:'';position:absolute;top:11px;right:11px;width:18px;height:18px;border-radius:50%;background:var(--accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2306261a' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/12px no-repeat}
@media (prefers-reduced-motion:reduce){.dxdt{transition:none}}
.dxm{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:10px;cursor:pointer;color:inherit}
.dxm.on{border-color:var(--accent);background:linear-gradient(135deg,rgba(124,255,178,.10),rgba(124,255,178,.02))}
.dxm-i{font-size:26px;flex:0 0 34px;text-align:center}.dxm-t{flex:1;min-width:0}.dxm-t b{display:block;font-size:15.5px}.dxm-t small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px;line-height:1.35}
.dxm-s{flex:0 0 46px;height:28px;border-radius:99px;background:var(--bg-2);border:1px solid var(--line);position:relative;transition:background .2s}
.dxm-s::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:var(--muted);transition:transform .2s,background .2s}
.dxm.on .dxm-s{background:var(--accent);border-color:var(--accent)}.dxm.on .dxm-s::after{transform:translateX(18px);background:var(--accent-ink)}
.dxal{display:flex;flex-wrap:wrap;gap:8px}.dxal button{border:1px solid var(--line);background:var(--bg-2);color:var(--text);border-radius:99px;padding:8px 14px;font-size:13.5px;font-weight:600;cursor:pointer}
.dxal button.on{background:rgba(255,92,122,.16);border-color:#FF5C7A;color:#FF8FA4}
.dxi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:8px;font-size:13.5px;line-height:1.5}
.dxi summary{cursor:pointer;font-weight:700}.dxi p{margin:10px 0 0;color:var(--muted)}.dxi p b{color:var(--text)}
`;
if (!document.getElementById('dx-diet-css')) { const el = document.createElement('style'); el.id = 'dx-diet-css'; el.textContent = CSS; document.head.appendChild(el); }
