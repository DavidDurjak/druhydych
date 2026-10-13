// Karty do zahraničia: krátky text v cudzom jazyku pre reštaurácie a núdzové situácie (celiakia, alergia, cukrovka).
import * as dx from './dxcore.js';
import { ctx } from './app.js';

const h = (...a) => ctx.h(...a), nav = (...a) => ctx.nav(...a);
const $app = () => ctx.$app;

const LANGS = [['en', 'English', '🇬🇧'], ['de', 'Deutsch', '🇩🇪'], ['it', 'Italiano', '🇮🇹'], ['es', 'Español', '🇪🇸'], ['fr', 'Français', '🇫🇷'], ['hu', 'Magyar', '🇭🇺'], ['pl', 'Polski', '🇵🇱'], ['cs', 'Čeština', '🇨🇿']];

const CELIAC = {
  en: 'I have coeliac disease. I must avoid gluten strictly: wheat, rye, barley, oats (unless certified gluten-free), spelt and anything made from them. Even small traces (crumbs, shared fryer oil, shared boards and utensils, flour in sauces) make me ill. Please check the ingredients with the kitchen. Thank you.',
  de: 'Ich habe Zöliakie. Ich muss strikt glutenfrei essen: kein Weizen, Roggen, Gerste, Hafer (außer zertifiziert glutenfrei), Dinkel oder daraus hergestellte Produkte. Schon kleine Spuren (Krümel, gemeinsames Frittieröl, gemeinsame Bretter und Besteck, Mehl in Soßen) machen mich krank. Bitte klären Sie die Zutaten mit der Küche. Vielen Dank.',
  it: 'Sono celiaco/a. Devo seguire una dieta rigorosamente senza glutine: niente frumento, segale, orzo, avena (se non certificata senza glutine), farro e derivati. Anche piccole tracce (briciole, olio di frittura condiviso, taglieri e utensili in comune, farina nelle salse) mi fanno male. Per favore controllate gli ingredienti con la cucina. Grazie.',
  es: 'Soy celíaco/a. Debo evitar el gluten de forma estricta: trigo, centeno, cebada, avena (salvo que esté certificada sin gluten), espelta y todos sus derivados. Incluso pequeñas trazas (migas, aceite de fritura compartido, tablas y utensilios compartidos, harina en las salsas) me sientan mal. Por favor, consulte los ingredientes con la cocina. Gracias.',
  fr: 'Je suis cœliaque. Je dois suivre un régime strictement sans gluten : pas de blé, seigle, orge, avoine (sauf si elle est certifiée sans gluten), épeautre ni leurs dérivés. Même de petites traces (miettes, huile de friture partagée, planches et ustensiles communs, farine dans les sauces) me rendent malade. Merci de vérifier les ingrédients avec la cuisine. Merci beaucoup.',
  hu: 'Cöliákiám van. Szigorúan gluténmentesen kell étkeznem: nem ehetek búzát, rozst, árpát, zabot (kivéve, ha tanúsítottan gluténmentes), tönkölyt, sem az ezekből készült termékeket. Már a nyomnyi mennyiség is (morzsák, közös sütőolaj, közös vágódeszka és evőeszköz, liszt a szószokban) betegséget okoz. Kérem, egyeztessenek a konyhával az összetevőkről. Köszönöm.',
  pl: 'Mam celiakię. Muszę ściśle unikać glutenu: pszenicy, żyta, jęczmienia, owsa (chyba że jest certyfikowany jako bezglutenowy), orkiszu i wszystkich ich pochodnych. Nawet śladowe ilości (okruszki, wspólny olej do smażenia, wspólne deski i sztućce, mąka w sosach) mi szkodzą. Proszę sprawdzić skład w kuchni. Dziękuję.',
  cs: 'Mám celiakii. Musím se přísně vyhýbat lepku: pšenici, žitu, ječmenu, ovsu (pokud není certifikovaný bez lepku), špaldě a všemu, co z nich vzniká. I drobné stopy (drobky, společný olej na smažení, společná prkénka a příbory, mouka v omáčkách) mi škodí. Prosím, ověřte složení s kuchyní. Děkuji.',
};
const DIABETES = {
  en: 'I have diabetes. If I am confused, sweaty, shaky or unwell, I may have low blood sugar. If I can swallow, give me sugar right away (juice, a sugary drink, sugar cubes or glucose tablets). If I am unconscious or cannot swallow, do not give me food or drink; call emergency services (112).',
  de: 'Ich habe Diabetes. Wenn ich verwirrt, verschwitzt, zittrig oder unwohl bin, könnte mein Blutzucker zu niedrig sein. Wenn ich schlucken kann, geben Sie mir sofort Zucker (Saft, ein gezuckertes Getränk, Zuckerwürfel oder Traubenzucker). Wenn ich bewusstlos bin oder nicht schlucken kann, geben Sie mir nichts zu essen oder zu trinken und rufen Sie den Notruf (112).',
  it: 'Ho il diabete. Se sono confuso/a, sudato/a, tremante o mi sento male, potrei avere la glicemia bassa. Se riesco a deglutire, datemi subito zucchero (succo, una bevanda zuccherata, zollette di zucchero o compresse di glucosio). Se sono incosciente o non riesco a deglutire, non datemi da mangiare né da bere e chiamate il numero di emergenza (112).',
  es: 'Tengo diabetes. Si estoy confundido/a, sudoroso/a, tembloroso/a o me encuentro mal, puede que tenga el azúcar bajo. Si puedo tragar, deme azúcar de inmediato (zumo, una bebida azucarada, terrones de azúcar o pastillas de glucosa). Si estoy inconsciente o no puedo tragar, no me dé nada de comer ni beber y llame a emergencias (112).',
  fr: 'J\'ai du diabète. Si je suis confus(e), en sueur, tremblant(e) ou si je me sens mal, ma glycémie est peut-être trop basse. Si je peux avaler, donnez-moi tout de suite du sucre (jus, boisson sucrée, sucre en morceaux ou comprimés de glucose). Si je suis inconscient(e) ou ne peux pas avaler, ne me donnez rien à manger ni à boire et appelez les secours (112).',
  hu: 'Cukorbeteg vagyok. Ha zavart, izzadt, remegő vagyok vagy rosszul érzem magam, lehet, hogy alacsony a vércukrom. Ha tudok nyelni, azonnal adjon cukrot (gyümölcslevet, cukros italt, kockacukrot vagy szőlőcukor tablettát). Ha eszméletlen vagyok vagy nem tudok nyelni, ne adjon enni vagy inni, hanem hívja a mentőket (112).',
  pl: 'Mam cukrzycę. Jeśli jestem splątany/a, spocony/a, drżę lub źle się czuję, może to być niski poziom cukru. Jeśli mogę przełykać, proszę natychmiast podać mi cukier (sok, słodki napój, kostki cukru lub tabletki z glukozą). Jeśli jestem nieprzytomny/a lub nie mogę przełykać, nie podawać jedzenia ani picia i zadzwonić po pogotowie (112).',
  cs: 'Mám cukrovku. Pokud jsem zmatený/á, zpocený/á, třesu se nebo je mi špatně, můžu mít nízkou hladinu cukru. Pokud mohu polykat, okamžitě mi dejte cukr (džus, slazený nápoj, kostky cukru nebo glukózové tablety). Pokud jsem v bezvědomí nebo nemohu polykat, nic mi nedávejte jíst ani pít a volejte záchranku (112).',
};
const ALLERGY = {
  en: 'I have a severe food allergy to: {L}. Even traces can cause a dangerous reaction. Please check all ingredients with the kitchen and avoid cross-contact (shared utensils, boards, oil). In an emergency call 112. Thank you.',
  de: 'Ich habe eine schwere Nahrungsmittelallergie gegen: {L}. Schon Spuren können eine gefährliche Reaktion auslösen. Bitte klären Sie alle Zutaten mit der Küche und vermeiden Sie Kreuzkontakt (gemeinsame Utensilien, Bretter, Öl). Im Notfall rufen Sie bitte 112. Vielen Dank.',
  it: 'Ho una grave allergia alimentare a: {L}. Anche tracce possono causare una reazione pericolosa. Per favore controllate tutti gli ingredienti con la cucina ed evitate la contaminazione crociata (utensili, taglieri e olio in comune). In caso di emergenza chiamate il 112. Grazie.',
  es: 'Tengo una alergia alimentaria grave a: {L}. Incluso las trazas pueden causar una reacción peligrosa. Por favor, consulte todos los ingredientes con la cocina y evite el contacto cruzado (utensilios, tablas y aceite compartidos). En caso de emergencia llame al 112. Gracias.',
  fr: 'J\'ai une allergie alimentaire grave à : {L}. Même des traces peuvent provoquer une réaction dangereuse. Merci de vérifier tous les ingrédients avec la cuisine et d\'éviter le contact croisé (ustensiles, planches et huile partagés). En cas d\'urgence, appelez le 112. Merci beaucoup.',
  hu: 'Súlyos ételallergiám van a következőkre: {L}. Már a nyomnyi mennyiség is veszélyes reakciót válthat ki. Kérem, egyeztessenek a konyhával az összetevőkről, és kerüljék a keresztszennyeződést (közös eszközök, vágódeszkák, olaj). Vészhelyzetben hívják a 112-t. Köszönöm.',
  pl: 'Mam ciężką alergię pokarmową na: {L}. Nawet śladowe ilości mogą wywołać groźną reakcję. Proszę sprawdzić wszystkie składniki w kuchni i unikać kontaktu krzyżowego (wspólne przybory, deski, olej). W razie nagłego wypadku proszę dzwonić pod 112. Dziękuję.',
  cs: 'Mám těžkou potravinovou alergii na: {L}. I stopové množství může vyvolat nebezpečnou reakci. Prosím, ověřte všechny složky s kuchyní a zabraňte křížové kontaminaci (společné náčiní, prkénka, olej). V případě nouze volejte 112. Děkuji.',
};
const AL = {
  gluten: { en: 'gluten (wheat, rye, barley, oats)', de: 'Gluten (Weizen, Roggen, Gerste, Hafer)', it: 'glutine', es: 'gluten', fr: 'gluten', hu: 'glutén', pl: 'gluten', cs: 'lepek' },
  milk: { en: 'milk', de: 'Milch', it: 'latte', es: 'leche', fr: 'lait', hu: 'tej', pl: 'mleko', cs: 'mléko' },
  egg: { en: 'eggs', de: 'Eier', it: 'uova', es: 'huevos', fr: 'œufs', hu: 'tojás', pl: 'jaja', cs: 'vejce' },
  peanut: { en: 'peanuts', de: 'Erdnüsse', it: 'arachidi', es: 'cacahuetes', fr: 'arachides', hu: 'földimogyoró', pl: 'orzeszki ziemne', cs: 'arašídy' },
  nuts: { en: 'tree nuts', de: 'Schalenfrüchte (Nüsse)', it: 'frutta a guscio', es: 'frutos de cáscara', fr: 'fruits à coque', hu: 'diófélék', pl: 'orzechy', cs: 'skořápkové plody (ořechy)' },
  soy: { en: 'soy', de: 'Soja', it: 'soia', es: 'soja', fr: 'soja', hu: 'szója', pl: 'soja', cs: 'sója' },
  fish: { en: 'fish', de: 'Fisch', it: 'pesce', es: 'pescado', fr: 'poisson', hu: 'hal', pl: 'ryby', cs: 'ryby' },
  crustaceans: { en: 'crustaceans', de: 'Krebstiere', it: 'crostacei', es: 'crustáceos', fr: 'crustacés', hu: 'rákfélék', pl: 'skorupiaki', cs: 'korýši' },
  molluscs: { en: 'molluscs', de: 'Weichtiere', it: 'molluschi', es: 'moluscos', fr: 'mollusques', hu: 'puhatestűek', pl: 'mięczaki', cs: 'měkkýši' },
  sesame: { en: 'sesame', de: 'Sesam', it: 'sesamo', es: 'sésamo', fr: 'sésame', hu: 'szezámmag', pl: 'sezam', cs: 'sezam' },
  celery: { en: 'celery', de: 'Sellerie', it: 'sedano', es: 'apio', fr: 'céleri', hu: 'zeller', pl: 'seler', cs: 'celer' },
  mustard: { en: 'mustard', de: 'Senf', it: 'senape', es: 'mostaza', fr: 'moutarde', hu: 'mustár', pl: 'gorczyca', cs: 'hořčice' },
  lupin: { en: 'lupin', de: 'Lupine', it: 'lupini', es: 'altramuces', fr: 'lupin', hu: 'csillagfürt', pl: 'łubin', cs: 'vlčí bob' },
  sulphites: { en: 'sulphites', de: 'Sulfite', it: 'solfiti', es: 'sulfitos', fr: 'sulfites', hu: 'szulfitok', pl: 'siarczyny', cs: 'siřičitany' },
};
const TITLE = { celiac: ['🌾', 'Celiakia'], allergy: ['🥜', 'Alergia'], diabetes: ['🩸', 'Cukrovka'] };

export async function renderCards() {
  await dx.ensure(ctx.state.profile.id);
  const c = dx.cfg();
  const kinds = ['celiac', 'allergy', 'diabetes'];
  let kind = kinds.find(k => c.modes.includes(k)) || 'celiac', lang = 'en';
  if (kind === 'allergy' && !c.allergens.length) kind = c.modes.includes('celiac') ? 'celiac' : c.modes.includes('diabetes') ? 'diabetes' : 'celiac';
  const text = () => {
    if (kind === 'celiac') return CELIAC[lang];
    if (kind === 'diabetes') return DIABETES[lang];
    const list = (c.allergens.length ? c.allergens : ['peanut']).map(k => AL[k][lang]).join(', ');
    return ALLERGY[lang].replace('{L}', list);
  };
  const draw = () => {
    $app().innerHTML = `<div class="screen">
      <div class="topbar"><h1>Karty do zahraničia</h1></div>
      <p class="muted mb">Ukáž kartu čašníkovi alebo kuchárovi. Je vždy v cudzom jazyku, a keď sa niečo stane, vie, čo robiť.</p>
      <div class="seg mb" id="kk">${kinds.map(k => `<button data-k="${k}" class="${k === kind ? 'on' : ''}">${TITLE[k][0]} ${TITLE[k][1]}</button>`).join('')}</div>
      <div class="dxl" id="ll">${LANGS.map(([k, n, f]) => `<button data-l="${k}" class="${k === lang ? 'on' : ''}">${f} ${n}</button>`).join('')}</div>
      ${kind === 'allergy' && !c.allergens.length ? `<div class="card"><p class="mb">Najprv si vyber alergény v nastaveniach.</p><a class="btn primary" href="#/rezim">Nastaviť alergény</a></div>` : `
      <div class="dxc" id="cd"><div class="dxc-h">${TITLE[kind][0]} ${LANGS.find(l => l[0] === lang)[1]}</div><p>${h(text())}</p></div>
      <button class="btn primary mt" id="fs">Zobraziť na celú obrazovku</button>`}
      ${kind === 'celiac' ? `<p class="muted small mt">Tip: v reštaurácii sa spýtaj aj na spoločný olej na vyprážanie a na to, či majú samostatné dosky a náradie.</p>` : ''}
    </div>${nav('#/profil')}`;
    $app().querySelectorAll('[data-k]').forEach(b => b.onclick = () => { kind = b.dataset.k; draw(); });
    $app().querySelectorAll('[data-l]').forEach(b => b.onclick = () => { lang = b.dataset.l; draw(); });
    $app().querySelector('#fs')?.addEventListener('click', () => {
      const o = document.createElement('div'); o.className = 'dxfs';
      o.innerHTML = `<button class="dxfs-x" aria-label="Zavrieť">×</button><div class="dxfs-t">${h(text())}</div>`;
      o.onclick = () => o.remove(); document.body.appendChild(o);
    });
  };
  draw();
}

const CSS = `
.dxl{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:12px;-webkit-overflow-scrolling:touch}
.dxl button{flex:0 0 auto;border:1px solid var(--line);background:var(--bg-2);color:var(--text);border-radius:99px;padding:8px 14px;font-size:13.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.dxl button.on{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.dxc{background:#fff;color:#111;border-radius:18px;padding:20px}.dxc-h{font-size:12px;font-weight:700;color:#666;margin-bottom:10px}.dxc p{font-size:19px;line-height:1.45;margin:0}
.dxfs{position:fixed;inset:0;z-index:60;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;padding:28px 24px;overflow:auto}
.dxfs-t{font-size:clamp(22px,6vw,34px);line-height:1.4;max-width:640px;font-weight:600}
.dxfs-x{position:fixed;top:calc(env(safe-area-inset-top) + 12px);right:16px;border:0;background:#eee;color:#111;width:44px;height:44px;border-radius:50%;font-size:26px;cursor:pointer}
`;
if (!document.getElementById('dx-cards-css')) { const el = document.createElement('style'); el.id = 'dx-cards-css'; el.textContent = CSS; document.head.appendChild(el); }
