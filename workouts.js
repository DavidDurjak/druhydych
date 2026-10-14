// Generátor tréningových plánov na mieru. Čistá logika bez závislostí.
//
// Z čoho vychádza (skrátene):
// - Objem je hlavný motor rastu svalov: rátame pracovné série na sval za týždeň. Prínos série klesa, preto nie je cieľom "čo najviac".
//   Začiatočník potrebuje okolo 6 až 10 sérií na sval, stredne pokročilý 10 až 16, pokročilý 14 až 22.
// - Každý sval aspoň 2× týždenne (rozloženie objemu do viacerých dní je pri rovnakom objeme mierne lepšie).
// - Séria sa berie blízko zlyhania (RIR = opakovania v rezerve). V bloku sa RIR znižuje z 3 na 1, na konci je deload.
// - Dvojitá progresia: najprv pridávaš opakovania v rozsahu, potom váhu.
// - Pri chudnutí: ťažké váhy zostávajú (ochrana svalov), objem sa zníži, kardio je nízkej intenzity.
// - Blok trvá 5 až 8 týždňov, posledný týždeň je deload (polovica sérií, rovnaké váhy, viac rezervy).
//   Základné cviky ostávajú, pomocné sa po každom bloku obmenia.

const L = (id, name, muscle, m, type, rr, eq, cue, extra = {}) => ({ id, name, muscle, m, type, rr, eq, cue, ...extra });

export const EXERCISES = Object.fromEntries([
  // hrudník
  L('bench', 'Bench press s činkou', 'hrudník', { chest: 1, triceps: 0.5, shoulders: 0.4 }, 'compound', 'H', 'gym', 'Lopatky stiahnuté k sebe, nohy pevne na zemi, činka klesa k spodnej časti hrudníka.', { sk: 0.6, u: 'upper' }),
  L('incline_db', 'Tlak s jednoručkami na šikmej lavici', 'hrudník', { chest: 1, triceps: 0.5, shoulders: 0.5 }, 'compound', 'M', 'gym', 'Lavica asi 30°, lakte šikmo od tela, dole pocíti natiahnutie hrudníka.', { sk: 0.22, u: 'upper' }),
  L('machine_chest', 'Tlak na stroji na hrudník', 'hrudník', { chest: 1, triceps: 0.5, shoulders: 0.3 }, 'compound', 'M', 'gym', 'Rukoväte v úrovni stredu hrudníka, plný rozsah bez pádu ramien dopredu.', { sk: 0.45 }),
  L('flye', 'Rozpažovanie na stroji (pec deck)', 'hrudník', { chest: 1 }, 'isolation', 'L', 'gym', 'Lakte mierne pokrčené, na konci pohybu hrudník stiahni, dole pomalý návrat.', { sk: 0.25 }),
  L('cable_flye', 'Rozpažovanie na kladkách zdola nahor', 'hrudník', { chest: 1 }, 'isolation', 'L', 'gym', 'Kladky nízko, ruky idú obľúkom k brade, na dne pocítiš natiahnutie.', { sk: 0.08 }),
  L('dip', 'Dipy na bradlách', 'hrudník', { chest: 1, triceps: 0.7, shoulders: 0.3 }, 'compound', 'M', 'gym', 'Mierny predklon, zostup pod kontrolou, pri bolesti ramena vymeň za stroj.', {}),
  L('pushup', 'Kliky', 'hrudník', { chest: 1, triceps: 0.5, shoulders: 0.3 }, 'compound', 'M', 'both', 'Telo v jednej línii, hrudník až k zemi. Ak je to ťažké, rob ich s rukami na vyššej opore.', {}),
  L('pushup_decline', 'Kliky s nohami na zvýšenej opore', 'hrudník', { chest: 1, triceps: 0.5, shoulders: 0.5 }, 'compound', 'M', 'home', 'Nohy na stoličke, telo rovné, hrudník až k zemi.', {}),
  L('db_bench', 'Tlak s jednoručkami na lavici alebo na podlahe', 'hrudník', { chest: 1, triceps: 0.5, shoulders: 0.4 }, 'compound', 'H', 'home', 'Lopatky stiahnuté, jednoručky klesajú pri hrudi, lakte šikmo od tela.', { sk: 0.22 }),
  L('db_flye', 'Rozpažovanie s jednoručkami', 'hrudník', { chest: 1 }, 'isolation', 'L', 'home', 'Ľahké váhy, lakte mierne pokrčené, dole pocítiš natiahnutie.', { sk: 0.08 }),
  // chrbát
  L('pullup', 'Zhyby (alebo s dopomocou)', 'chrbát', { back: 1, biceps: 0.4 }, 'compound', 'H', 'gym', 'Úchop o niečo širší ako ramená, ťahaj lakte dole k bokom, hrudník k tyči.', {}),
  L('latpull', 'Sťahovanie kladky k hrudníku', 'chrbát', { back: 1, biceps: 0.4 }, 'compound', 'H', 'gym', 'Mierne sa predkloň, ťahaj lakte dole a k bokom, tyč zastav tesne nad hrudníkom.', { sk: 0.55 }),
  L('latpull_neutral', 'Sťahovanie kladky neutrálnym úchopom', 'chrbát', { back: 1, biceps: 0.4 }, 'compound', 'M', 'gym', 'Úzky úchop dlaňami k sebe, lakte pri tele, plný rozsah až do natiahnutia.', { sk: 0.5 }),
  L('row_cable', 'Príťahy na spodnej kladke', 'chrbát', { back: 1, biceps: 0.4 }, 'compound', 'M', 'gym', 'Chrbát rovný, ťahaj lakte k bokom a stlač lopatky, bez hojdania trupu.', { sk: 0.5 }),
  L('row_chest', 'Príťahy s oporou hrude na stroji', 'chrbát', { back: 1, biceps: 0.4 }, 'compound', 'M', 'gym', 'Hrudník pevne na opore, ťahaj lakte dozadu, dole nechaj lopatky natiahnuť.', { sk: 0.45 }),
  L('row_db', 'Príťahy s jednoručkou', 'chrbát', { back: 1, biceps: 0.4 }, 'compound', 'M', 'both', 'Jedna ruka a koleno na lavici, lakte ťahaj k bedru, nekrúť trupom.', { sk: 0.22 }),
  L('row_bent', 'Príťahy s dvoma jednoručkami v predklone', 'chrbát', { back: 1, biceps: 0.4 }, 'compound', 'M', 'home', 'Predklon s rovným chrbtom, lakte ťahaj k bokom, hore stlač lopatky.', { sk: 0.18 }),
  L('row_bb', 'Príťahy s činkou v predklone', 'chrbát', { back: 1, biceps: 0.4 }, 'compound', 'H', 'gym', 'Trup takmer rovnobežne so zemou, činka k pupku, chrbát neguľovať.', { sk: 0.5 }),
  L('pullover_cable', 'Pullover na kladke (priame ruky)', 'chrbát', { back: 1 }, 'isolation', 'L', 'gym', 'Ruky takmer rovné, tlač kladku k stehnám, hore pocítiš natiahnutie lats.', { sk: 0.2 }),
  L('pullover_db', 'Pullover s jednoručkou', 'chrbát', { back: 1, chest: 0.3 }, 'isolation', 'L', 'home', 'Jednoručka za hlavu, lakte mierne pokrčené, dolu natiahni, hore k hrudi.', { sk: 0.2 }),
  // ramená
  L('ohp', 'Tlak nad hlavu s činkou', 'ramená', { shoulders: 1, triceps: 0.5 }, 'compound', 'H', 'gym', 'Zatni zadok a brucho, činka ide tesne pred tvárou, hore hlavu predsuň pod činku.', { sk: 0.35 }),
  L('db_ohp', 'Tlak s jednoručkami v sede', 'ramená', { shoulders: 1, triceps: 0.5 }, 'compound', 'M', 'both', 'Chrbát na opierke, jednoručky tlač mierne pred seba, nad hlavou nespájaj.', { sk: 0.14 }),
  L('machine_ohp', 'Tlak na ramená na stroji', 'ramená', { shoulders: 1, triceps: 0.5 }, 'compound', 'M', 'gym', 'Sedadlo nastav tak, aby rukoväte začínali v úrovni brady.', { sk: 0.3 }),
  L('pushup_pike', 'Pike kliky (zadok vysoko)', 'ramená', { shoulders: 1, triceps: 0.5 }, 'compound', 'M', 'home', 'Telo do tvaru V, hlava smeruje medzi ruky k podlahe.', {}),
  L('latraise', 'Upažovanie s jednoručkami', 'ramená', { shoulders: 1 }, 'isolation', 'X', 'both', 'Ľahké váhy, lakte mierne pokrčené, zdvihaj do výšky ramien, nehojdaj sa.', { sk: 0.06 }),
  L('cable_latraise', 'Upažovanie na kladke', 'ramená', { shoulders: 1 }, 'isolation', 'X', 'gym', 'Kladka nízko, ruka ide bokom do výšky ramena, ťah je plynulý aj dole.', { sk: 0.04 }),
  L('rear_fly', 'Zadné ramená na stroji (reverse pec deck)', 'zadné ramená', { reardelt: 1, back: 0.3 }, 'isolation', 'X', 'gym', 'Lakte vo výške ramien, ťahaj ich dozadu a bokom, lopatky len mierne.', { sk: 0.15 }),
  L('facepull', 'Face pull', 'zadné ramená', { reardelt: 1, back: 0.3 }, 'isolation', 'X', 'gym', 'Lano k tvári, lakte vysoko a von, na konci ruky roztiahni.', { sk: 0.12 }),
  L('rear_fly_db', 'Zadné ramená s jednoručkami v predklone', 'zadné ramená', { reardelt: 1, back: 0.3 }, 'isolation', 'X', 'home', 'Predklon, lakte mierne pokrčené, zdvihaj do strán.', { sk: 0.05 }),
  // biceps
  L('curl', 'Bicepsový zdvih s činkou', 'biceps', { biceps: 1 }, 'isolation', 'L', 'gym', 'Lakte pri tele, hore stlač biceps, dole pomaly a do plného natiahnutia.', { sk: 0.25 }),
  L('incline_curl', 'Bicepsový zdvih na šikmej lavici', 'biceps', { biceps: 1 }, 'isolation', 'L', 'gym', 'Lakte za telom, v dolnej polohe je biceps natiahnutý a práve tá poloha rastie najlepšie.', { sk: 0.1 }),
  L('cable_curl', 'Bicepsový zdvih na kladke', 'biceps', { biceps: 1 }, 'isolation', 'L', 'gym', 'Kladka dole, lakte nehybné, plynulý ťah aj pri návrate.', { sk: 0.2 }),
  L('hammer', 'Kladivový zdvih', 'biceps', { biceps: 1 }, 'isolation', 'L', 'both', 'Dlane k sebe, lakte pri tele, zdvihaj bez hojdania.', { sk: 0.1 }),
  L('curl_db', 'Bicepsový zdvih s jednoručkami', 'biceps', { biceps: 1 }, 'isolation', 'L', 'home', 'Lakte pri tele, hore dlane otoč k sebe, dole pomaly.', { sk: 0.1 }),
  // triceps
  L('triceps_push', 'Tricepsové sťahovanie kladky', 'triceps', { triceps: 1 }, 'isolation', 'L', 'gym', 'Lakte pri tele, plne vystri, hore sa nenadvihuj.', { sk: 0.25 }),
  L('oh_triceps', 'Tricepsový tlak nad hlavou (kladka alebo jednoručka)', 'triceps', { triceps: 1 }, 'isolation', 'L', 'gym', 'Lakte smerujú hore, dole natiahni triceps, hore plne vystri.', { sk: 0.15 }),
  L('skull', 'Francúzsky tlak', 'triceps', { triceps: 1 }, 'isolation', 'L', 'gym', 'Lakte pevne, činka klesa k čelu alebo za hlavu, tlač do plného vystretia.', { sk: 0.2 }),
  L('skull_db', 'Francúzsky tlak s jednoručkami', 'triceps', { triceps: 1 }, 'isolation', 'L', 'home', 'Ľahni si, lakte pevne, jednoručky klesajú k čelu.', { sk: 0.1 }),
  L('oh_triceps_db', 'Tricepsový tlak nad hlavou s jednoručkou', 'triceps', { triceps: 1 }, 'isolation', 'L', 'home', 'Lakte hore pri hlave, jednoručka klesa za hlavu a dole natiahne triceps.', { sk: 0.12 }),
  // kvadricepsy
  L('squat', 'Drep s činkou', 'nohy', { quads: 1, glutes: 0.6, hams: 0.2 }, 'compound', 'H', 'gym', 'Činka na chrbte, kolená v smere špičiek, drep do hĺbky, kde udržiš rovný chrbát.', { sk: 0.7, u: 'lower' }),
  L('hack', 'Hack drep na stroji', 'nohy', { quads: 1, glutes: 0.5 }, 'compound', 'H', 'gym', 'Chodidlá o niečo nižšie, kolená vpred, plná hĺbka bez odlepenia panvy.', { sk: 0.6 }),
  L('legpress', 'Leg press', 'nohy', { quads: 1, glutes: 0.5 }, 'compound', 'M', 'gym', 'Chodidlá v šírke ramien, spodok zastav, kým sa nezačne zakŕčať panva.', { sk: 1.0 }),
  L('goblet', 'Goblet drep s jednoručkou', 'nohy', { quads: 1, glutes: 0.5 }, 'compound', 'M', 'home', 'Jednoručku drž pri hrudi, hlboký drep, hrudník hore.', { sk: 0.25 }),
  L('split_squat', 'Bulharský drep (zadná noha na lavici)', 'nohy', { quads: 1, glutes: 0.8 }, 'compound', 'M', 'both', 'Dlhší krok vpred, trup mierne dopredu, kolenom dolu pod kontrolou.', { sk: 0.2 }),
  L('lunge', 'Výpady s jednoručkami', 'nohy', { quads: 1, glutes: 0.7 }, 'compound', 'M', 'both', 'Krok vpred, zostup kolenom k zemi, odraz cez celú prednú nohu.', { sk: 0.18 }),
  L('step_up', 'Výstupy na lavicu s jednoručkami', 'nohy', { quads: 1, glutes: 0.7 }, 'compound', 'M', 'both', 'Stúpaj hlavne prednou nohou, nepomáhaj si odrazom zadnej.', { sk: 0.18 }),
  L('legext', 'Predkopávanie na stroji', 'nohy', { quads: 1 }, 'isolation', 'L', 'gym', 'Stroj nastav tak, aby kolená boli na osi, hore chvíľu podrž.', { sk: 0.35 }),
  // zadná strana
  L('rdl', 'Rumunský mŕtvy ťah', 'zadná strana', { hams: 1, glutes: 0.7, back: 0.3 }, 'compound', 'M', 'gym', 'Panvu posúvać dozadu, chrbát rovný, hlavne zadné stehná natiahni, činka pri nohách.', { sk: 0.7, u: 'lower' }),
  L('db_rdl', 'Rumunský mŕtvy ťah s jednoručkami', 'zadná strana', { hams: 1, glutes: 0.7, back: 0.3 }, 'compound', 'M', 'both', 'Panvu posúvaj dozadu, jednoručky kľzu po stehnách, chrbát rovný.', { sk: 0.3 }),
  L('sl_rdl', 'Rumunský mŕtvy ťah na jednej nohe', 'zadná strana', { hams: 1, glutes: 0.8 }, 'compound', 'M', 'home', 'Stoj na jednej nohe, panvu posúvaj dozadu, zadná noha sa predĺžuje.', { sk: 0.15 }),
  L('deadlift', 'Mŕtvy ťah', 'zadná strana', { hams: 0.8, glutes: 0.8, back: 0.7, quads: 0.4 }, 'compound', 'H', 'gym', 'Činka pri holeniach, chrbát rovný, odtlač zem a až potom narovnaj bedrá.', { sk: 0.9 }),
  L('trapbar', 'Mŕtvy ťah s hex činkou', 'zadná strana', { hams: 0.6, glutes: 0.8, back: 0.6, quads: 0.7 }, 'compound', 'H', 'gym', 'Stoj uprostred činky, hrudník hore, odtlač zem, stoj rovno.', { sk: 0.8 }),
  L('legcurl_seated', 'Zakopávanie na stroji v sede', 'zadná strana', { hams: 1 }, 'isolation', 'L', 'gym', 'Sedíš s natiahnutým bedrom, zadné stehná sú dole natiahnuté a to je výhodné pre rast.', { sk: 0.3 }),
  L('legcurl', 'Zakopávanie na stroji v ľahu', 'zadná strana', { hams: 1 }, 'isolation', 'L', 'gym', 'Panvu drž na lavici, zdvíhaj pätami k zadku, dole pomaly.', { sk: 0.25 }),
  L('hamcurl_slider', 'Zakopávanie pätami po podlahe (uterák)', 'zadná strana', { hams: 1, glutes: 0.3 }, 'isolation', 'L', 'home', 'Ľahni si, päty na uteračku, bedrá hore a pomaly kľž pätami od seba a späť.', {}),
  // zadok
  L('hipthrust', 'Hip thrust', 'zadok', { glutes: 1, hams: 0.3 }, 'compound', 'M', 'gym', 'Lopatky na lavici, brada k hrudi, hore zadok stlač a nenakloň bedrá.', { sk: 0.8, u: 'lower' }),
  L('bridge', 'Glute bridge s jednoručkou', 'zadok', { glutes: 1, hams: 0.3 }, 'compound', 'M', 'both', 'Jednoručka na bedrách, hore zadok stlač a chvíľu podrž.', { sk: 0.3 }),
  L('bridge_1l', 'Glute bridge na jednej nohe', 'zadok', { glutes: 1, hams: 0.3 }, 'compound', 'M', 'home', 'Jedna noha vystretá, panva rovno, hore zadok stlač.', {}),
  // lýtka, core
  L('calf', 'Výpony v stoji', 'lýtka', { calves: 1 }, 'isolation', 'X', 'gym', 'Dole plné natiahnutie, hore sa postav na špičky, bez odrazu.', { sk: 0.5 }),
  L('calf_seated', 'Výpony v sede', 'lýtka', { calves: 1 }, 'isolation', 'X', 'gym', 'Pomalý pohyb, dole natiahni, hore pauza.', { sk: 0.3 }),
  L('calf_db', 'Výpony na schodíku s jednoručkou', 'lýtka', { calves: 1 }, 'isolation', 'X', 'home', 'Špičky na hrane schodíka, dole natiahni, hore sa postav na špičky.', { sk: 0.2 }),
  L('cable_crunch', 'Skracovačky na kladke', 'core', { core: 1 }, 'isolation', 'X', 'gym', 'Kľač, lano pri hlave, zaguľ chrbát a stiahni rebrá k panve.', { sk: 0.2 }),
  L('legraise', 'Zdvihy nôh vo vise', 'core', { core: 1 }, 'isolation', 'X', 'gym', 'Pokrčené kolená k hrudi, panvu zdvihni hore, bez hojdania.', {}),
  L('legraise_lying', 'Zdvihy nôh v ľahu', 'core', { core: 1 }, 'isolation', 'X', 'home', 'Driek pritlač k zemi, nohy dole len po hranicu, kde driek ostane na zemi.', {}),
  L('deadbug', 'Dead bug', 'core', { core: 1 }, 'isolation', 'X', 'both', 'Driek pritlačený k zemi, striedavo natiahni protiľahlú ruku a nohu.', {}),
  L('plank', 'Plank', 'core', { core: 1 }, 'isolation', 'T', 'both', 'Telo v jednej línii, zadok nepadá, brucho stiahnuté.', { time: true }),
  L('cardio', 'Kardio nízkej intenzity (chôdza do kopca alebo bicykel)', 'kardio', {}, 'cardio', 'T', 'both', 'Tempo, pri ktorom by si vedel hovoriť v celých vetách.', { time: true }),
].map(e => [e.id, e]));

export const MUSCLE_LABEL = { chest: 'Hrudník', back: 'Chrbát', shoulders: 'Ramená', reardelt: 'Zadné ramená', biceps: 'Biceps', triceps: 'Triceps', quads: 'Kvadricepsy', hams: 'Zadné stehná', glutes: 'Zadok', calves: 'Lýtka', core: 'Brucho' };

export const LEVELS = {
  beginner: { label: 'Začiatočník', desc: 'Do 6 mesiacov pravidelného cvičenia. Menej sérií, viac technikou a pomalý nárast váh.', blockWeeks: 8 },
  intermediate: { label: 'Stredne pokročilý', desc: '6 mesiacov až 2 roky pravidelného cvičenia. Dva tréningy na sval týždenne a rastúce objem v bloku.', blockWeeks: 6 },
  advanced: { label: 'Pokročilý', desc: 'Viac ako 2 roky poctivého cvičenia. Vyšší objem, bližšie k zlyhaniu a kratšie bloky.', blockWeeks: 5 },
  elite: { label: 'Elite', desc: 'Viac ako 4 roky cvičenia alebo príprava na súťaž. Najvyšší objem, 5 až 6 dní, špecializačné bloky na slabé partie a riadená únava.', blockWeeks: 8, minDays: 5 },
};
export const MIN_DAYS = { beginner: 2, intermediate: 2, advanced: 3, elite: 5 };
// Prioritné partie pre špecializačné bloky (úroveň Elite)
export const PRIORITY = { chest: ['Hrudník', ['chest']], back: ['Chrbát', ['back']], shoulders: ['Ramená', ['shoulders', 'reardelt']], arms: ['Ruky', ['biceps', 'triceps']], quads: ['Kvadricepsy', ['quads']], posterior: ['Zadok a zadné stehná', ['glutes', 'hams']], calves: ['Lýtka', ['calves']] };
export const EMPHASIS = { balanced: 'Vyvážene', upper: 'Horná časť tela', lower: 'Zadok a nohy' };

// Sloty: ktorý sval, aká rola a z akých cvikov sa vyberá (poradie = priorita, ďalšie sa striedajú po blokoch).
const S = (m, role, c) => ({ m, role, c });
const SLOTS = {
  gym: {
    c_main: S('chest', 'main', ['bench', 'incline_db', 'machine_chest']),
    c_inc: S('chest', 'sec', ['incline_db', 'machine_chest', 'dip', 'bench']),
    c_iso: S('chest', 'iso', ['flye', 'cable_flye']),
    b_vert: S('back', 'main', ['latpull', 'pullup', 'latpull_neutral']),
    b_row: S('back', 'sec', ['row_cable', 'row_chest', 'row_bb', 'row_db']),
    b_row2: S('back', 'sec', ['row_chest', 'row_db', 'row_cable', 'row_bb']),
    b_iso: S('back', 'iso', ['pullover_cable']),
    s_press: S('shoulders', 'sec', ['db_ohp', 'machine_ohp', 'ohp']),
    s_lat: S('shoulders', 'iso', ['latraise', 'cable_latraise']),
    s_rear: S('reardelt', 'iso', ['rear_fly', 'facepull']),
    bi: S('biceps', 'iso', ['curl', 'incline_curl', 'cable_curl']),
    bi2: S('biceps', 'iso', ['incline_curl', 'hammer', 'cable_curl']),
    tri: S('triceps', 'iso', ['triceps_push', 'skull']),
    tri_long: S('triceps', 'iso', ['oh_triceps', 'skull']),
    q_main: S('quads', 'main', ['squat', 'hack', 'legpress']),
    q_sec: S('quads', 'sec', ['legpress', 'split_squat', 'hack', 'lunge']),
    q_iso: S('quads', 'iso', ['legext']),
    h_main: S('hams', 'main', ['rdl', 'db_rdl']),
    h_iso: S('hams', 'iso', ['legcurl_seated', 'legcurl']),
    g_main: S('glutes', 'main', ['hipthrust', 'bridge']),
    g_sec: S('glutes', 'sec', ['split_squat', 'step_up', 'lunge']),
    calf: S('calves', 'iso', ['calf']),
    abs: S('core', 'iso', ['cable_crunch', 'legraise', 'plank']),
  },
  home: {
    c_main: S('chest', 'main', ['db_bench', 'pushup']),
    c_inc: S('chest', 'sec', ['pushup_decline', 'pushup', 'db_bench']),
    c_iso: S('chest', 'iso', ['db_flye']),
    b_vert: S('back', 'main', ['row_db', 'row_bent']),
    b_row: S('back', 'sec', ['row_bent', 'row_db']),
    b_row2: S('back', 'sec', ['row_db', 'row_bent']),
    b_iso: S('back', 'iso', ['pullover_db']),
    s_press: S('shoulders', 'sec', ['db_ohp', 'pushup_pike']),
    s_lat: S('shoulders', 'iso', ['latraise']),
    s_rear: S('reardelt', 'iso', ['rear_fly_db']),
    bi: S('biceps', 'iso', ['curl_db', 'hammer']),
    bi2: S('biceps', 'iso', ['hammer', 'curl_db']),
    tri: S('triceps', 'iso', ['skull_db', 'oh_triceps_db']),
    tri_long: S('triceps', 'iso', ['oh_triceps_db', 'skull_db']),
    q_main: S('quads', 'main', ['goblet', 'split_squat']),
    q_sec: S('quads', 'sec', ['split_squat', 'lunge', 'step_up']),
    q_iso: S('quads', 'iso', ['step_up', 'lunge']),
    h_main: S('hams', 'main', ['db_rdl', 'sl_rdl']),
    h_iso: S('hams', 'iso', ['hamcurl_slider', 'sl_rdl']),
    g_main: S('glutes', 'main', ['bridge_1l', 'bridge']),
    g_sec: S('glutes', 'sec', ['step_up', 'lunge']),
    calf: S('calves', 'iso', ['calf_db']),
    abs: S('core', 'iso', ['plank', 'deadbug', 'legraise_lying']),
  },
};

// Denné šablóny: zoznam slotov. "+1" posunie výber cviku na ďalší v poradí (aby sa nezopakoval ten istý).
const FB_A = ['q_main', 'c_main', 'b_row', 's_press', 'h_iso', 'bi', 'abs'];
const FB_B = ['h_main', 'c_inc', 'b_vert', 'q_sec', 's_lat', 'tri', 'calf'];
const FB_C = ['q_sec+1', 'c_main+1', 'b_row2', 's_rear', 'g_main', 'bi2', 'abs+1'];
const UP_1 = ['c_main', 'b_vert', 's_press', 'b_row', 'c_iso', 'bi', 'tri'];
const UP_2 = ['b_vert+1', 'c_inc', 'b_row2', 's_lat', 's_rear', 'bi2', 'tri_long'];
const LOW_1 = ['q_main', 'h_main', 'q_sec', 'h_iso', 'calf', 'abs'];
const LOW_2 = ['g_main', 'q_sec+1', 'h_iso+1', 'q_iso', 'calf+1', 'abs+1'];
const SPLITS = {
  2: { name: 'Celé telo 2×', days: [{ n: 'Celé telo A', s: ['q_main', 'c_main', 'b_row', 's_lat', 'h_iso', 'abs'] }, { n: 'Celé telo B', s: ['h_main', 'c_inc', 'b_vert', 'q_sec', 'bi', 'tri'] }] },
  3: { name: 'Celé telo 3×', days: [{ n: 'Celé telo A', s: FB_A }, { n: 'Celé telo B', s: FB_B }, { n: 'Celé telo C', s: FB_C }] },
  '3u': { name: 'Horná, dolná, celé telo', days: [{ n: 'Horná časť', s: UP_1 }, { n: 'Dolná časť', s: ['q_main', 'h_main', 'q_sec', 'h_iso', 'calf', 'abs'] }, { n: 'Celé telo', s: ['c_inc', 'b_row2', 'g_main', 's_lat', 's_rear', 'tri_long', 'bi2'] }] },
  4: { name: 'Horná a dolná 2×', days: [{ n: 'Horná A (tlaky)', s: UP_1 }, { n: 'Dolná A (drep)', s: LOW_1 }, { n: 'Horná B (ťahy)', s: UP_2 }, { n: 'Dolná B (zadok)', s: LOW_2 }] },
  5: { name: 'Horná, dolná, tlaky, ťahy, nohy', days: [
    { n: 'Horná časť', s: UP_1 },
    { n: 'Dolná časť', s: ['q_main', 'h_main', 'q_iso', 'h_iso', 'calf'] },
    { n: 'Tlaky (hrudník, ramená, triceps)', s: ['c_inc', 's_press', 'c_iso', 's_lat', 'tri_long', 'tri'] },
    { n: 'Ťahy (chrbát, biceps)', s: ['b_row2', 'b_vert+1', 's_rear', 'b_iso', 'bi2', 'bi'] },
    { n: 'Nohy a zadok', s: ['g_main', 'q_sec+1', 'q_iso', 'h_iso+1', 'calf+1', 'abs'] }] },
  6: { name: 'Tlaky, ťahy, nohy 2×', days: [
    { n: 'Tlaky A', s: ['c_main', 's_press', 'c_inc', 's_lat', 'tri'] },
    { n: 'Ťahy A', s: ['b_vert', 'b_row', 's_rear', 'bi', 'bi2', 'abs'] },
    { n: 'Nohy A', s: ['q_main', 'h_main', 'q_iso', 'h_iso', 'calf', 'abs+1'] },
    { n: 'Tlaky B', s: ['c_inc+1', 's_press+1', 'c_iso', 's_lat+1', 'tri_long'] },
    { n: 'Ťahy B', s: ['b_vert+1', 'b_row2', 'b_iso', 's_rear+1', 'bi+1', 'bi2+1'] },
    { n: 'Nohy B', s: ['g_main', 'q_sec', 'h_iso+1', 'q_iso', 'calf+1', 'abs+2'] }] },
};

const REPS = { H: { b: '8-10', x: '6-8' }, M: { b: '10-12', x: '8-12' }, L: { b: '10-15', x: '10-15' }, X: { b: '12-20', x: '12-20' } };
const REST = { H: 180, M: 120, L: 90, X: 60 };
const BASE_SETS = { beginner: { main: 3, sec: 2, iso: 2 }, intermediate: { main: 3, sec: 3, iso: 3 }, advanced: { main: 4, sec: 3, iso: 3 }, elite: { main: 4, sec: 4, iso: 3 } };
// RIR podľa týždňa v bloku (posledný je deload) a prírastok sérií (hlavné cviky len polovica prírastku)
const RIR = { beginner: [3, 3, 3, 2, 2, 2, 2, 4], intermediate: [3, 2, 2, 1, 1, 4], advanced: [3, 2, 1, 1, 4], elite: [3, 2, 2, 1, 1, 1, 1, 4] };
const RAMP = { beginner: [0, 0, 0, 1, 1, 1, 1, 0], intermediate: [0, 0, 1, 1, 2, 0], advanced: [0, 1, 1, 2, 0], elite: [0, 0, 1, 1, 1, 2, 2, 0] };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r25 = v => Math.max(5, Math.round(v / 2.5) * 2.5);

export function recommendLevel(monthsTraining) {
  const m = Number(monthsTraining);
  if (!(m >= 0)) return 'beginner';
  return m < 6 ? 'beginner' : m < 24 ? 'intermediate' : 'advanced';
}

function age(birthYear) { const y = Number(birthYear); return y > 1900 ? new Date().getFullYear() - y : null; }

// Hlavná funkcia. params: goal, days, level, equipment ('gym'|'home'), emphasis, sex, birthYear, heightCm, weightKg; block (0..), week (1..)
export function generatePlan(p = {}) {
  const goal = ['lose', 'maintain', 'gain'].includes(p.goal) ? p.goal : 'maintain';
  const level = LEVELS[p.level] ? p.level : 'beginner';
  const equipment = p.equipment === 'home' || p.gym === false ? 'home' : 'gym';
  const days = clamp(Math.round(Number(p.days) || 3), MIN_DAYS[level], 6);
  const sex = p.sex === 'f' ? 'f' : 'm';
  const emphasis = EMPHASIS[p.emphasis] ? p.emphasis : (sex === 'f' ? 'lower' : 'balanced');
  const years = age(p.birthYear);
  const heightCm = Number(p.heightCm) || 0, weightKg = Number(p.weightKg) || 0;
  const bmi = heightCm && weightKg ? weightKg / ((heightCm / 100) ** 2) : 0;
  const tall = (sex === 'm' && heightCm >= 190) || (sex === 'f' && heightCm >= 180);
  const older = years != null && years >= 45;
  const block = Math.max(0, Number(p.block) || 0);
  const mesoWeeks = LEVELS[level].blockWeeks;
  const week = clamp(Math.round(Number(p.week) || 1), 1, mesoWeeks);
  const deload = week === mesoWeeks;
  const pool = SLOTS[equipment];
  const swaps = p.swaps && typeof p.swaps === 'object' ? p.swaps : {};
  const priority = level === 'elite' ? (Array.isArray(p.priority) ? p.priority.filter(k => PRIORITY[k]).slice(0, 2) : []) : [];
  const specOn = level === 'elite' && priority.length > 0 && block % 2 === 1;
  const prioM = new Set(priority.flatMap(k => PRIORITY[k][1]));

  const splitKey = days === 3 && level !== 'beginner' ? '3u' : days;
  const split = SPLITS[splitKey];

  const isBeg = level === 'beginner';
  const ramp = RAMP[level][week - 1] || 0;
  const rampCap = goal === 'gain' && !older ? 2 : 1;
  const upperM = new Set(['chest', 'back', 'shoulders', 'reardelt', 'biceps', 'triceps']);
  const lowerM = new Set(['quads', 'hams', 'glutes']);

  // špecializačný blok: prioritné svaly dostanú extra cviky v dňoch, kde sa už trenúu (cieľ 20 až 28 sérií týždňe)
  const EXTRA = { chest: ['c_iso', 'c_inc+1'], back: ['b_iso', 'b_row2+1'], shoulders: ['s_lat+1', 's_rear+1'], reardelt: [], biceps: ['bi2', 'bi+1'], triceps: ['tri_long', 'tri+1'], quads: ['q_iso', 'q_sec+1'], hams: ['h_iso+1', 'h_main+1'], glutes: ['g_sec', 'g_main+1'], calves: ['calf+1'] };
  const daySlots = split.days.map(d => d.s.slice());
  if (specOn) {
    prioM.forEach(m => {
      const dayIdx = split.days.map((d, i) => i).filter(i => daySlots[i].some(ref => pool[ref.split('+')[0]]?.m === m));
      (EXTRA[m] || []).slice(0, prioM.size === 1 && m !== 'back' ? 2 : 1).forEach((ref, k) => { const i = dayIdx[k % Math.max(1, dayIdx.length)]; if (i != null && pool[ref.split('+')[0]]) daySlots[i].push(ref); });
    });
  }
  const plan = split.days.map((d, di) => {
    const used = new Set();
    const exercises = [];
    daySlots[di].forEach(ref => {
      const [key, offS] = ref.split('+');
      const slot = pool[key];
      if (!slot) return;
      let cands = slot.c.slice();
      if (tall && equipment === 'gym') {
        if (key === 'q_main') cands = ['hack', 'legpress', 'squat'];
        if (key === 'h_main') cands = ['rdl', 'db_rdl'];
      }
      if (equipment === 'gym' && key === 'c_inc' && bmi >= 32) cands = ['machine_chest', 'incline_db'];
      if (equipment === 'gym' && key === 'b_vert' && bmi >= 32) cands = ['latpull', 'latpull_neutral'];
      const mainRot = isBeg ? 0 : Math.floor(block / 2);
      const accRot = isBeg ? Math.floor(block / 2) : block;
      let idx = (Number(offS) || 0) + (slot.role === 'main' ? mainRot : accRot);
      let id = null;
      for (let t = 0; t < cands.length; t++) {
        const c = cands[(idx + t) % cands.length];
        if (!used.has(c)) { id = c; break; }
      }
      if (!id) return;
      const orig = id;
      if (swaps[id] && EXERCISES[swaps[id]] && !used.has(swaps[id])) id = swaps[id];
      used.add(id);
      const ex = EXERCISES[id];
      // sety
      let sets = BASE_SETS[level][slot.role];
      if (goal === 'lose' && slot.role === 'iso' && level !== 'elite') sets = Math.max(2, sets - (level === 'beginner' ? 0 : 1));
      if (specOn && prioM.has(slot.m) && prioM.size <= 2 && slot.m !== 'back') sets += 1;
      if (specOn && !prioM.has(slot.m) && slot.role === 'iso') sets = Math.max(2, sets - 1);
      if (emphasis === 'upper' && upperM.has(slot.m)) sets += 1;
      if (emphasis === 'lower' && lowerM.has(slot.m)) sets += 1;
      if (emphasis === 'upper' && (slot.m === 'quads' || slot.m === 'hams') && slot.role !== 'main') sets = Math.max(2, sets - 0);
      if (ex.rr === 'T') sets = 3;
      const rampNow = slot.role === 'main' ? Math.min(Math.ceil(ramp / 2), 1) : Math.min(ramp, rampCap);
      if (deload) sets = sets <= 2 ? 1 : Math.ceil(sets / 2);
      else sets += (goal === 'gain' || ramp === 0) ? rampNow : Math.min(rampNow, 1);
      sets = clamp(sets, 1, 5);
      // opakovania, rezerva, pauza
      const rr = ex.rr;
      const reps = ex.time ? null : REPS[rr][isBeg ? 'b' : 'x'];
      let rir = RIR[level][week - 1];
      if (!deload && ex.type === 'isolation') rir = Math.max(0, rir - 1);
      if (older && !deload) rir = Math.min(4, rir + 1);
      const rest = REST[rr] || 60;
      const o = { id, orig, name: ex.name, muscle: ex.muscle, sets, reps, seconds: ex.id === 'cardio' ? 1200 : (ex.time ? 45 : null), rir: ex.time ? null : rir, rest: ex.time ? null : (isBeg && rr === 'H' ? 150 : rest), cue: ex.cue, role: slot.role };
      if (ex.sk && weightKg > 0 && !ex.time) {
        const bodyF = ex.u === 'lower' ? (sex === 'f' ? 0.75 : 1) : (sex === 'f' ? 0.55 : 1);
        o.startKg = r25(weightKg * ex.sk * bodyF * (isBeg ? 0.75 : 1));
      }
      exercises.push(o);
    });
    return { day: di + 1, name: d.n, exercises };
  });

  // kardio podľa cieľa: pri chudnutí 2 až 3 ľahké relácie, nikdy tesne pred ťažkým dňom nôh
  let cardioSessions = 0;
  if (goal === 'lose') cardioSessions = level === 'elite' ? 2 : (bmi >= 27 ? 3 : 2);
  else if (goal === 'maintain') cardioSessions = 1;
  if (cardioSessions) {
    const hasHeavyLegs = d => d.exercises.some(e => e.id === 'squat' || e.id === 'hack' || e.id === 'goblet' || e.id === 'rdl' || e.id === 'db_rdl');
    const order = plan.map((d, i) => i).sort((a, b) => Number(hasHeavyLegs(plan[a])) - Number(hasHeavyLegs(plan[b])) || a - b);
    order.slice(0, Math.min(cardioSessions, plan.length)).forEach(i => plan[i].exercises.push({ id: 'cardio', name: EXERCISES.cardio.name, muscle: 'kardio', sets: 1, reps: null, seconds: (isBeg ? 900 : 1200) + (bmi >= 27 ? 300 : 0), rir: null, rest: null, cue: EXERCISES.cardio.cue, role: 'cardio' }));
  }

  const vol = weeklyVolume(plan);
  const meta = {
    v: 2, params: { goal, days, level, equipment, emphasis, sex, birthYear: p.birthYear || null, heightCm: heightCm || null, weightKg: weightKg || null, priority, swaps, contestDate: /^\d{4}-\d{2}-\d{2}$/.test(p.contestDate || '') ? p.contestDate : null },
    spec: specOn,
    block, week, mesoWeeks, deload, rir: RIR[level][week - 1], split: split.name, volume: vol,
    why: explain({ goal, level, equipment, emphasis, days, sex, bmi, tall, older, split: split.name, mesoWeeks, cardioSessions, specOn, priority }),
    progression: 'Dvojitá progresia: keď zvládneš všetky série na hornej hranici rozsahu opakovaní a stále ti ostane predpísaná rezerva, pridaj nabudúce váhu (horná časť tela približne 2,5 kg, nohy približne 5 kg, jednoručky 1 až 2 kg). Ak spadneš pod spodnú hranicu, váhu zníž.',
    warmup: 'Pred tréningom 5 minút ľahkého pohybu a pri prvom cviku 2 prípravné série: približne 50 % a 75 % pracovnej váhy (pár opakovaní).',
    stepsGoal: goal === 'lose' ? 9000 : 7000,
  };
  return { name: `${days}× týždenne · ${LEVELS[level].label.toLowerCase()} · ${goal === 'lose' ? 'chudnutie' : goal === 'gain' ? 'naberanie' : 'udržiavanie'}`, days: plan, meta };
}

// Pracovné série na sval za týždeň: priame 1, výrazné nepriame 0,5, slabšie nepriame sa nepočítajú (Pelland 2025, zlomková metóda)
export function weeklyVolume(daysPlan) {
  const v = {};
  (daysPlan || []).forEach(d => (d.exercises || []).forEach(e => {
    const ex = EXERCISES[e.id]; if (!ex || e.role === 'cardio') return;
    Object.entries(ex.m).forEach(([k, wt]) => { const f = wt >= 1 ? 1 : wt >= 0.5 ? 0.5 : 0; if (f) v[k] = (v[k] || 0) + e.sets * f; });
  }));
  Object.keys(v).forEach(k => { v[k] = Math.round(v[k] * 2) / 2; });
  return v;
}

function explain(c) {
  const out = [];
  out.push(`Rozdelenie "${c.split}" rozloží týždenný objem do viacerých dní. Viac než okolo 11 sérií na jeden sval v jednom tréningu už prináša málo, preto každý sval tréneme 2× až 3× týždenne.`);
  out.push(c.level === 'beginner'
    ? 'Ako začiatočník rastieš už z malého objemu (minimum na rast je okolo 4 sérií na sval týždenne). Preto je plán krátky a dôležitejšia než množstvo je technika a pravidelnosť.'
    : c.level === 'intermediate'
      ? 'Pri stredne pokročilej úrovni sa pracuje s 10 až 20 sériami na sval týždenne. Objem v bloku postupne rastie, aby si sa na začiatku nezlomil a na konci mal čo pridavať.'
      : c.level === 'advanced'
        ? 'Pokročilý potrebuje vyšší objem a presnejšie riadenie únavy. Preto je blok kratší a pomocné cviky sa po každom bloku obmenia.'
        : 'ÚroveE0 Elite striedavo beží vyvážený blok (10 až 20 sérií na sval) a špecializačný blok (20 až 30 sérií na 1 až 2 prioritné partie a 5 až 15 na ostatné). Vychádza to z odporúčaní pre pokročilých.');
  if (c.specOn) out.push(`Práve beží špecializačný blok. Prioritné partie (${c.priority.map(k => PRIORITY[k][0].toLowerCase()).join(', ')}) majú viac sérií a extra cviky, ostatné svaly dostávajú udržiavací objem. Pozor na regeneráciu: spánok a kalorický príjem sú tu zásadné.`);
  if (c.level === 'elite' && !c.specOn) out.push('Práve beží vyvážený blok, v ktorom sa všetky svaly trénujú rovnako. Nasledujúce blok bude špecializačný na vybrané partie.');
  out.push('Série nepotrebuješ ťahať do úplného zlyhania. Meta-analýza z roku 2023 nenašla, že zlyhanie prináša viac svalu než ukončenie s malým zostávajúcim opakovaním. Preto je úroveň úsilia riadená rezervou (RIR) a zlyhanie sa hodí hlavne pri izolácii.');
  if (c.goal === 'lose') out.push(c.level === 'elite'
    ? `Pri chudnutí (príprava na súťaž) objem neznižujeme, pretože sval sa pri deficite chráni práve ťažkou prácou. Kardio je len ${c.cardioSessions}× nízkej intenzity, aby nebránilo regenerácii.`
    : `Pri chudnutí držíme ťažké váhy na základných cvikoch a objem pomocných cvikov je o niečo nižší, lebo pri deficite sa horšie regeneruje. Pridali sme ${c.cardioSessions}× ľahké kardio.`);
  if (c.goal === 'gain') out.push('Pri naberaní máš plný objem a postupný nárast sérií v bloku. Pridávaj váhu, keď zvládneš hornú hranicu opakovaní, a jedz v mierom prebytku.');
  if (c.goal === 'maintain') out.push('Pri udržiavaní je objem stredný. Cieľom je pomaly pridávať váhu a udržať svaly.');
  if (c.emphasis === 'lower') out.push('Dôraz máš na zadok a nohy: tieto svaly dostávajú viac sérií a cviky, ktoré ich zaťažujú v natiahnutej polohe (rumunský ťah, hip thrust, bulharský drep).');
  if (c.emphasis === 'upper') out.push('Dôraz máš na hornú časť tela: hrudník, chrbát, ramená a ruky majú o niečo viac sérií.');
  if (c.tall) out.push('Pri vysokej postave býva klasický drep s činkou technicky náročnejší, preto je základ hack drep alebo leg press. Je to praktická voľba, nie pravidlo: ak ti drep s činkou ide, môžeš cvik vymeniť späť.');
  if (c.bmi >= 32) out.push('Pri vyššej hmotnosti sme pri tlakoch aj ťahoch zvolili stabilnejšie stroje a kardio je nízkonárazové (chôdza do kopca, bicykel).');
  if (c.older) out.push('Vzhľadom na vek nechávaš o jedno opakovanie viac v rezerve a dôraz je na kontrolovanú techniku.');
  if (c.equipment === 'home') out.push('Plán je na cvičenie doma s jednoručkami. Ak máš hrazdu, zhyby sú skvelý doplnok na chrbát.');
  out.push(`Blok trvá ${c.mesoWeeks} týždňov. Posledný týždeň je odporúčaný deload (polovica sérií, rovnaké váhy, viac rezervy). Plánovaný deload rast svalov sám nezvýši (štúdia ukázala rovnaký rast ako bez pauzy), pomáha hlavne regenerácii. Preto ho môžeš pri dobrom pocite preskočiť alebo si ho dať skôr, ak si vyčerpaný. Pomocné cviky sa po bloku obmenia, základné ostanú, aby sa dal ďalej pridávať váha.`);
  return out;
}
