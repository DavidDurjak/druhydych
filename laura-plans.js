// Hotové tréningové plány od trénerky Laury (v306). Dostane ich každý, kto nemá GainTrain Plus:
// plán sa vyberie podľa pohlavia, úrovne, cieľa, miesta cvičenia a počtu dní, ale neprispôsobuje sa výkonom
// a týždenne sa nevyvíja. Plán na mieru (workouts.js) je súčasťou Plus.
//
// Zápis: každý plán je text. Riadok "# Názov dňa" začína deň, ostatné riadky sú cviky:
//   "Názov cviku | 4x15,12,12,10"   série × opakovania (zoznam = opakovania po sériách)
//   "Názov | 3x1min"                výdrž (plank), "Aeróbna činnosť | 10min" jedna relácia
//   "Názov | 3x12 | poznámka"       poznámka sa zobrazí pod cvikom
// Hodnoty, ktoré v podkladoch chýbali alebo boli nejasné, sú doplnené a označené " ?" (check), aby ich Laura skontrolovala.

const PLANS = [];
const P = (sex, level, goal, place, days, schedule, text, note) => PLANS.push({ sex, level, goal, place, days, schedule, text, note });

// ---------- ZAČIATOČNÍK MUŽ · nabrať svaly · posilňovňa ----------
P('m', 'beginner', 'gain', 'gym', 3, 'Po, St, Pia', `
# Chrbát šírka, ramená, triceps
Sťahovanie kladky naširoko | 4x12,10,10,8
Príťahy na stroji široké | 3x12
Pullover | 4x15,12,12,10
Hyperextenzia na spodný chrbát | 3x12
Tlaky na ramená na multipresse | 4x12,10,10,8
Rozpažovanie na stroji | 3x12
Príťahy lana k brade | 4x12,10,10,8
Francúzsky tlak na triceps | 3x12
Sťahovanie kladky na triceps | 4x15,12,10,8
# Nohy, hrudník, brucho
Predkopávanie | 4x15,12,10,10
Drepy na multipresse | 3x12
Leg press | 4x12,10,10,8
Zakopávanie v sede | 4x12,10,10,8
Rumunský mŕtvy ťah | 3x12
Pec deck | 4x15,12,10,10
Tlaky na lavičke s jednoručkami | 3x12
Sklapačky rovné | 3x12
Dvíhanie nôh vo vise | 4x15,12,10,10
# Chrbát hĺbka, ramená, biceps
Príťahy na stroji v sede naúzko | 4x12,10,10,8
Sťahovanie kladky naúzko zhora | 3x12
Príťahy spodnej kladky naúzko | 4x12,10,10,8
Biceps s rovnou tyčou | 4x15,12,10,10
Biceps kladivový | 3x12
Tlaky na ramená s jednoručkami | 4x12,10,10,8
Predpažovanie | 3x12
Rozpažovanie s jednoručkami | 4x12,10,10,8
`);
P('m', 'beginner', 'gain', 'gym', 4, 'Po, St, Pia, Ne', `
# Predné stehná, ramená, brucho
Drepy s tyčou | 4x12,10,10,8
Predkopávanie | 3x12
Výpady | 4x12
Leg press naúzko | 4x12,10,10,8
Tlaky na ramená na multipresse | 4x12,10,10,8
Rozpažovanie na stroji | 3x12
Príťahy lana k brade | 4x12,10,10,8
Mohamedan (brucho) | 3x12
Sklapačky s vytáčaním | 4x15,12,10,10
# Chrbát šírka, spodný chrbát, triceps
Sťahovanie kladky naširoko | 4x12,10,10,8
Príťahy na stroji široké | 3x12
Pullover | 4x15,12,12,10
Príťahy jednoručiek na lavičke | 4x12
Hyperextenzia | 3x12
Francúzsky tlak na triceps | 3x12
Sťahovanie kladky na triceps | 4x15,12,10,8
# Zadné stehná, hrudník, brucho
Zakopávanie v stoji | 4x15,12,12,10
Hack drep | 3x12
Rumunský mŕtvy ťah | 4x12,10,10,8
Bulharský drep | 3x12 | každá noha
Pec deck | 4x15,12,12,10
Tlaky s jednoručkami | 3x12
Dvíhanie nôh vo vise | 4x15,12,12,10
Sklapačky rovné | 3x12
# Chrbát hĺbka, ramená, biceps
Predpažovanie s lanom | 4x15,12,10,10
Tlaky na ramená s jednoručkami | 3x12
Rozpažovanie s jednoručkami | 4x12,12,10,8
Príťahy lana k brade | 3x12
Príťahy na stroji v sede naúzko | 4x12,10,10,8
Sťahovanie kladky naúzko zhora | 3x12
Príťahy spodnej kladky naúzko | 4x12,10,10,8
Biceps s rovnou tyčou | 4x15,12,10,10
Biceps kladivový | 3x12
`);

// ---------- ZAČIATOČNÍK MUŽ · nabrať svaly · doma ----------
P('m', 'beginner', 'gain', 'home', 3, 'Po, St, Pia', `
# Chrbát, biceps, brucho
Príťahy s jednoručkami v predklone naúzko | 4x15,12,12,10
Príťahy s expanderom naširoko | 3x12
Príťahy jednoručiek v planku striedavo | 4x16 | každá ruka 8-krát
Kliky | 4x20
Biceps s expanderom kladivový | 4x15,12,12,10
Biceps s jednoručkami s vytáčaním | 4x15,12,12,10
Vytáčanie s jednoručkou do strán | 3x15 ?
Sklapačky rovné | 3x15 ?
Sklapačky šikmé | 3x15 ?
# Nohy, triceps
Rumunský mŕtvy ťah s jednoručkami | 4x15,12,12,10
Výpady s jednoručkami | 3x12 | každá noha 6-krát
Drepy s jednoručkami široké | 4x15,12,12,10
Bulharský drep s jednoručkou, opora o posteľ alebo lavičku | 3x10 | každá noha 10-krát
Francúzsky tlak s jednoručkami | 4x15,12,12,10
Tlaky s expanderom za hlavou | 3x12
# Ramená, brucho
Tlaky na ramená s jednoručkami | 4x15,12,12,10
Rozpažovanie s jednoručkami | 4x12,10,10,8
Príťahy s expanderom | 3x12
Predpažovanie s jednoručkami | 4x12,10,10,8
Plank | 1x1min
Skracovačky | 3x15
`);

// ---------- ZAČIATOČNÍK MUŽ · schudnúť · posilňovňa ----------
P('m', 'beginner', 'lose', 'gym', 3, 'Po, St, Pia + Ne aeróbna', `
# Chrbát šírka, ramená, triceps
Príťahy na stroji široké | 4x12
Sťahovanie širokej kladky pred seba | 4x15,12,12,10
Pullover s tyčou | 3x12 ?
Tlaky na ramená na multipresse | 3x12
Rozpažovanie | 4x15,12,12,10
Príťahy veľkej tyče k brade | 3x12
Triceps s lanom | 3x12
Francúzsky tlak | 3x15,12,10
Aeróbna činnosť | 10min
# Nohy, brucho, hrudník
Zakopávanie v sede | 4x15
Rumunský mŕtvy ťah | 3x15,12,10
Drepy s výskokom | 3x20
Predkopávanie | 3x15,12,10
Pec deck | 3x15
Tlaky s jednoručkami | 3x15,12,10
Skracovačky rovné | 3x20
Mountain climber | 3x20
# Chrbát hĺbka, ramená, biceps
Sťahovanie kladky naúzko | 3x15
Príťahy na lavičke s jednoručkami | 4x15,12,12,10
Príťahy úzkej kladky zospodu | 3x15
Hyperextenzia na spodný chrbát | 3x10
Tlaky s jednoručkami | 3x12
Predpažovanie | 4x15,12,12,10
Príťahy lana k čelu | 3x12
Biceps s lanom | 3x12
Biceps s veľkou tyčou | 4x15,12,10,10
Aeróbna činnosť | 10min
# Aeróbna aktivita
Aeróbna činnosť (beh, bicykel, prechádzka) | 25min
`);
P('m', 'beginner', 'lose', 'gym', 4, 'Po, Ut, Št, Pia + Ne aeróbna', `
# Chrbát šírka, ramená, triceps
Príťahy na stroji široké | 4x12
Sťahovanie širokej kladky pred seba | 4x15,12,12,10
Pullover s tyčou | 3x12 ?
Tlaky na ramená na multipresse | 3x12
Rozpažovanie | 4x15,12,12,10
Príťahy veľkej tyče k brade | 3x12
Triceps s lanom | 3x12
Francúzsky tlak | 3x15,12,10
Aeróbna činnosť | 10min
# Zadné stehná, hrudník, brucho
Zakopávanie | 4x20,15,12,12
Rumunský mŕtvy ťah | 3x12
Leg press široký | 3x15,12,10
Drep široký s výskokom | 3x20
Pec deck | 3x15,12,10
Tlaky na stroji | 3x15
Dvíhanie nôh vo vise | 3x20
Mountain climber | 3x20
# Chrbát hĺbka, ramená, biceps
Príťahy jednoručiek na lavičke | 3x12
Sťahovanie kladky naúzko | 4x15,12,10,10
Sťahovanie úzkej kladky zdola | 3x12
Rozpažovanie na stroji | 3x12
Tlaky s jednoručkami | 4x15,12,10,10
Predpažovanie | 3x12
Biceps s jednoručkami s vytáčaním | 3x12
Biceps s veľkou tyčou | 4x15,12,10,10
# Predné stehná, brucho
Hack drep | 3x12
Výpady | 3x12 | každá noha 6-krát
Drepy | 3x12
Predkopávanie | 4x12 ?
Skracovačky rovné | 3x20
Vytáčanie s jednoručkou | 3x20
Aeróbna činnosť | 10min
# Aeróbna aktivita
Aeróbna činnosť (beh, bicykel) | 25min
`);

// ---------- ZAČIATOČNÍK MUŽ · schudnúť · doma ----------
P('m', 'beginner', 'lose', 'home', 3, 'Po, St, Pia + Ne aeróbna', `
# Chrbát, biceps, brucho
Príťahy s expanderom | 3x15
Kliky široké | 3x20
Príťahy s jednoručkami v predklone | 4x15,12,12,10
Biceps s expanderom kladivový | 3x12
Biceps s jednoručkami s vytáčaním | 4x15,12,12,10
Skracovačky rovné | 3x15
Skracovačky do strán | 3x15
# Nohy, triceps
Drepy s expanderom | 3x20
Rumunský mŕtvy ťah s jednoručkami | 3x12
Výpady na mieste s výskokom | 3x20
Bulharský drep o posteľ alebo lavičku s jednoručkami | 3x12
Tlaky za hlavou s expanderom | 3x12
Francúzsky tlak | 3x15,12,10
# Ramená, hrudník, brucho
Tlaky na ramená s jednoručkami | 3x15
Predpažovanie s expanderom | 4x15,12,12,10
Príťahy expanderu k brade | 3x15
Kliky | 3x20
Mountain climber | 3x20
Plank | 1x1min
# Aeróbna aktivita
Aeróbna činnosť (prechádzka, beh, bicykel) | 25min
`);

// ---------- ZAČIATOČNÍČKA ŽENA · nabrať svaly · posilňovňa ----------
P('f', 'beginner', 'gain', 'gym', 3, 'Po, St, Pia', `
# Zadné stehná, zadok, hrudník, brucho
Hip thrust | 4x15,12,12,10
Rumunský mŕtvy ťah | 3x12
Drepy široké s jednoručkou | 4x15,12,10,10
Leg press širší | 3x12
Abdukcia | 4x20
Pec deck | 4x15,12,10,8
Skracovačky rovné | 4x15
Dvíhanie nôh vo vise | 3x13 ?
# Chrbát, ramená, triceps
Sťahovanie kladky pred seba naširoko | 4x15,12,10,10
Príťahy na stroji naúzko | 3x12
Sťahovanie kladky naúzko zhora | 4x15,12,10,10
Pullover | 4x15
Tlaky na ramená s jednoručkami | 4x15,12,12,10
Rozpažovanie na stroji | 3x12
Príťahy veľkej činky k brade | 4x15,12,12,10
Sťahovanie lana na triceps | 4x12
# Predné stehná, brucho, biceps
Drepy na multipresse alebo s tyčou | 3x12
Výpady | 3x12 | každá noha 6-krát
Predkopávanie | 4x12,12,10,8
Bulharské drepy o lavičku s jednoručkami | 3x12
Biceps s veľkou činkou | 4x15,12,10,10
Sklapačky s vytáčaním | 4x15
Sklapačky rovné | 4x15
`);
P('f', 'beginner', 'gain', 'gym', 4, 'Po, St, Pia, Ne', `
# Predné stehná, ramená, brucho
Predkopávanie | 3x12
Drepy s tyčou | 4x15,12,12,10
Výpady na mieste | 3x12
Hack drep | 4x15,12,12,10
Addukcia (znožovanie) | 4x15
Tlaky na ramená s jednoručkami | 4x15,12,12,10
Rozpažovanie na stroji | 3x12
Príťahy veľkej činky k brade | 4x15,12,12,10
Sklapačky s vytáčaním | 4x15
Sklapačky rovné | 4x15
# Chrbát šírka, spodný chrbát, triceps
Sťahovanie kladky naširoko zhora | 4x12,10,10,8
Príťahy na stroji naširoko | 3x12
Pullover | 4x15,12,12,10
Hyperextenzia na spodný chrbát | 3x12
Triceps s lanom | 3x13 ?
Francúzsky tlak | 4x12,10,10 ?
# Zadné stehná, zadok, brucho, hrudník
Hip thrust | 4x15,12,12,10
Rumunský mŕtvy ťah s tyčou | 3x12
Široký drep | 4x15,12,12,10
Zakopávanie v sede | 3x12
Abdukcia | 4x20
Tlaky na lavičke s jednoručkami | 4x15,12,10,8
Dvíhanie nôh vo vise | 3x12
Sklapačky rovné | 3x20,15,10
# Chrbát hĺbka, ramená, biceps
Príťahy spodnej kladky naúzko | 4x15,12,12,10
Sťahovanie kladky naúzko | 3x12
Príťahy na lavičke v predklone | 4x15,12,12,10
Rozpažovanie s jednoručkami | 4x12,10,10,8
Tlaky na multipresse | 3x12
Predpažovanie s lanom | 4x12,10,10,8
Biceps s lanom | 4x15,12,12,10
Biceps s veľkou tyčou | 3x12
`);

// ---------- ZAČIATOČNÍČKA ŽENA · nabrať svaly · doma ----------
P('f', 'beginner', 'gain', 'home', 3, 'Po, St, Pia', `
# Nohy (hlavne stehná), brucho
Drepy s expanderom | 3x12
Výstupy na lavičku s jednoručkami | 4x12 | každá noha 6-krát
Rumunský mŕtvy ťah s expanderom alebo jednoručkami | 4x15,12,12,10
Výpady na mieste s jednoručkami | 3x12 | každá noha 6-krát
Skracovačky rovné | 3x12
Skracovačky do strán | 3x12
Dvíhanie nôh | 4x15,12,12,10
# Chrbát, ramená, biceps
Príťahy s gumou v predklone široké | 4x15,12,12,10
Príťahy jednoručiek naúzko | 3x12
Tlaky na ramená s jednoručkami | 4x12,10,10,8
Príťahy s expanderom k brade | 3x12
Rozpažovanie s jednoručkami | 4x12,10,10,8
Biceps s gumou kladivový | 3x12
Biceps s jednoručkami rovný | 4x15,12,10,10
# Zadok, hrudník, triceps, brucho
Hip thrust na jednej nohe s jednoručkou | 4x15,12,10,10 | každá noha
Bulharský drep o posteľ alebo lavičku | 3x12 | každá noha
Rumunský mŕtvy ťah | 4x12,10,10,8
Zanožovanie s gumou priamo | 4x20 ?
Kliky úzke | 4x15,12,10,10
Tricepsové tlaky s jednoručkou nad hlavou | 3x12
Francúzsky tlak s jednoručkami | 3x12,10,8
Sklapačky | 3x12
Plank | 1x1min
`);

// ---------- ZAČIATOČNÍČKA ŽENA · schudnúť · posilňovňa ----------
P('f', 'beginner', 'lose', 'gym', 3, 'Po, St, Pia + Ne aeróbna', `
# Nohy, hrudník, brucho
Predkopávanie | 4x15,12,10,10
Drepy s výskokom | 3x15
Rumunský mŕtvy ťah | 4x15,12,10,10
Zakopávanie v sede | 4x15,12,10,10
Addukcia (znožovanie) | 4x20
Pec deck | 3x12
Skracovačky rovné | 3x12
Skracovačky s vytáčaním | 3x14 | do každej strany 7-krát
Aeróbna činnosť (pás, bicykel, schody) | 10min
# Chrbát, ramená, triceps
Sťahovanie širokej kladky | 3x15
Príťahy na stroji naúzko | 3x12
Pullover | 4x15,12,12,10
Tlaky na ramená s jednoručkami | 3x12
Rozpažovanie | 4x15,12,10,10
Príťahy veľkej činky k brade | 3x12
Tricepsové tlaky na kladke s tyčou | 3x12,10,8
# Zadok, biceps, brucho
Hip thrust | 4x15
Bulharské drepy | 3x12 | každá noha 6-krát
Výpady s výskokom na mieste | 3x12 | každá noha 6-krát
Abdukcia | 4x20
Biceps s rovnou tyčou | 3x10
Dvíhanie nôh vo vise | 3x12
Mountain climber | 3x20
Aeróbna činnosť | 10min
# Aeróbna aktivita
Aeróbna činnosť pomalým tempom | 25min
`);
P('f', 'beginner', 'lose', 'gym', 4, 'Po, Ut, Št, Pia + Ne aeróbna', `
# Predné stehná, biceps, brucho
Predkopávanie | 3x15 | po každej sérii 10 drepov
Výpady | 3x12 | každá noha 6-krát
Hack drep | 3x12
Addukcia | 4x20
Biceps kladivový s jednoručkami | 3x12
Sklapačky rovné | 3x15
Vytáčanie s jednoručkou | 3x20
# Chrbát šírka, ramená
Príťahy široké na stroji | 3x12
Sťahovanie širokej kladky | 4x15,12,12,10
Pullover s tyčou | 4x20
Tlaky na ramená na multipresse | 3x15,12,10
Rozpažovanie na stroji | 3x12
Predpažovanie | 3x15,12,10
Aeróbna činnosť podľa výberu | 10min
# Zadné stehná, zadok, hrudník, brucho
Zakopávanie v ľahu | 3x15
Rumunský mŕtvy ťah | 3x12,10,10
Hip thrust | 4x20
Abdukcia | 4x20,15,15,12
Drepy s výskokom, nohy široko | 3x15
Tlaky s jednoručkami | 3x12
Dvíhanie nôh vo vise | 3x12
Mountain climber | 3x20
# Chrbát hĺbka, ramená, triceps
Sťahovanie úzkej kladky zvrchu | 3x12
Sťahovanie úzkej kladky zdola | 3x12
Pullover s lanom | 3x20,15,12
Rozpažovanie s jednoručkami | 4x15,12,10,10
Príťahy veľkej činky k brade | 3x12
Tlaky s jednoručkami | 3x12
Francúzsky tlak | 3x15,12,10
Aeróbna činnosť | 10min
# Aeróbna aktivita
Aeróbna činnosť | 25min
`);

// ---------- ZAČIATOČNÍČKA ŽENA · schudnúť · doma ----------
P('f', 'beginner', 'lose', 'home', 3, 'Po, St, Pia + Ne aeróbna', `
# Nohy, hrudník, brucho
Drepy s výskokom | 4x15
Výpady na mieste | 3x12 | každá noha 6-krát
Rumunský mŕtvy ťah s jednoručkami | 4x12
Bulharský drep, jedna noha na posteli alebo lavičke | 3x12 | každá noha 6-krát
Kliky | 3x15
Skracovačky rovné | 3x15
Skracovačky s vytáčaním | 3x15
# Chrbát, ramená, triceps
Príťahy s jednoručkami v predklone | 3x12
Príťahy s expanderom široké | 3x15
Tlaky na ramená s jednoručkami | 3x12
Rozpažovanie s jednoručkami | 3x15,12,10
Príťahy expanderu k brade | 3x12
Triceps s jednoručkami za hlavou | 3x15,12,10
Beh ráno alebo večer | 20min
# Zadok, hrudník, biceps, brucho
Hip thrust | 4x20
Glute bridge s abdukciou hore | 4x15,12,10 ?
Zanožovanie s gumou priamo | 3x20
Zanožovanie s gumou šikmo | 3x20
Kliky | 3x12
Biceps kladivový s gumou | 3x15,12,10
Dvíhanie nôh (brucho) | 3x15
Príťahy nôh v ľahu (brucho) | 3x15
# Aeróbna aktivita
Aeróbna činnosť (beh, prechádzka) | 25min
`);

// ---------- POKROČILÝ MUŽ · nabrať svaly · posilňovňa ----------
P('m', 'advanced', 'gain', 'gym', 4, 'Po, St, Pia, Ne', `
# Chrbát šírka, ramená, biceps
Príťahy veľkej činky k pásu | 4x12
Sťahovanie širokej kladky | 3x15,12,10
Príťahy široké na stroji | 3x12
Tlaky na ramená na multipresse | 4x15,12,12,10
Rozpažovanie na stroji | 3x12
Príťahy k brade | 4x15,12,12,10
Opačný pec deck | 3x12
Biceps kladivový s lanom | 4x15,12,10,10
Biceps s tyčou | 3x12
# Nohy celé, brucho
Hack drep | 4x15,12,12,10
Výpady | 3x12 | každá noha 6-krát
Leg press naširoko | 4x15,12,10,10
Predkopávanie | 3x12
Zakopávanie v sede | 4x15,12,12,10
Lýtka | 4x15,12,12,10
Dvíhanie nôh vo vise | 3x15
Mohamedan (brucho) | 3x20
# Chrbát hĺbka, ramená
Príťahy na stroji naúzko | 3x12
Sťahovanie kladky pred seba | 4x15,12,12,10
Príťahy jednoručiek na lavičke | 3x12 | každá ruka
Pullover s lanom | 3x12 ?
Predpažovanie s lanom | 3x12
Zadné ramená, upažovanie v predklone | 4x15,12,12,10
Tlaky s jednoručkami | 3x12
# Hrudník, triceps, brucho
Pec deck | 3x12
Tlaky pred seba na stroji v sede | 4x15,12,12,10
Tlaky na šikmej lavičke | 3x12
Kliky | 3x20
Francúzsky tlak | 3x12
Triceps s lanom | 4x15,12,12,10
Skracovačky rovné | 3x15
Skracovačky do strán | 3x20
`);
P('m', 'advanced', 'gain', 'gym', 5, 'Po, Ut, Št, Pia, Ne', `
# Chrbát šírka, ramená, biceps
Príťahy veľkej činky k pásu | 4x12
Sťahovanie širokej kladky | 3x15,12,10
Príťahy široké na stroji | 3x12
Tlaky na ramená na multipresse | 4x15,12,12,10
Rozpažovanie na stroji | 3x12
Príťahy k brade | 4x15,12,12,10
Opačný pec deck | 3x12
Biceps kladivový s lanom | 4x15,12,10,10
Biceps s tyčou | 3x12
# Predné stehná, brucho
Predkopávanie | 3x12
Hack drep | 4x15,12,12,10
Výpady na mieste na multipresse | 3x10 | každá noha
Drep s tyčou | 4x15,12,12,10
Lýtka | 3x12
Skracovačky rovné | 3x12
Mohamedan (brucho) | 3x20
Dvíhanie nôh vo vise | 3x12
# Chrbát hĺbka, ramená
Príťahy na stroji naúzko | 3x12
Sťahovanie kladky pred seba | 4x15,12,12,10
Príťahy jednoručiek na lavičke | 3x12 | každá ruka
Pullover s lanom | 3x12 ?
Predpažovanie s lanom | 3x12
Zadné ramená, upažovanie v predklone | 4x15,12,12,10
Tlaky s jednoručkami | 3x12
# Zadné stehná, brucho
Rumunský mŕtvy ťah | 4x15,12,12,10
Drepy na multipresse široké | 3x12
Bulharský drep na multipresse | 3x10 | každá noha
Leg press | 4x15,12,12,10
Zakopávanie v stoji | 3x12
Skracovačky s vytáčaním | 3x20
Skracovačky rovné | 3x15
# Hrudník, triceps
Pec deck | 3x12
Tlaky pred seba na stroji v sede | 4x15,12,12,10
Tlaky na šikmej lavičke | 3x12
Kliky | 3x20
Francúzsky tlak | 3x12
Triceps s lanom | 4x15,12,12,10
`);

// ---------- POKROČILÝ MUŽ · schudnúť · posilňovňa ----------
P('m', 'advanced', 'lose', 'gym', 5, 'Po, Ut, Št, Pia + Ne aeróbna', `
# Nohy, brucho
Drepy s výskokom s loptou so záťažou | 4x20
Výpady na multipresse striedavo | 3x20
Hack drep | 3x15,12,10
Predkopávanie | 4x20,15,15,12
Zakopávanie v stoji | 4x20,15,15,12
Mohamedan (brucho) | 3x20
Skracovačky rovné | 3x15
Aeróbna činnosť | 15min
# Chrbát, ramená, triceps
Sťahovanie širokej kladky | 3x15
Príťahy veľkej činky k pásu | 4x15,12,12,10
Príťahy úzkej spodnej kladky | 3x15
Pullover s tyčou | 4x20
Tlaky na ramená na multipresse | 3x15
Rozpažovanie na stroji | 4x15,12,12,10
Predpažovanie s lanom | 3x15
Príťahy k brade s tyčou | 3x15
Triceps na kladke s tyčou | 3x15
Francúzsky tlak | 3x15,12,10
Aeróbna činnosť | 15min
# Hrudník, biceps, brucho
Pec deck | 3x15
Tlaky v sede úzke | 3x15
Tlaky na lavičke široké | 3x15
Kliky | 4x20
Biceps rovný s osovou tyčou | 3x20,15,12
Biceps kladivový | 3x15
Sviečka (brucho) | 3x20
Dvíhanie nôh vo vise so záťažou | 3x20
Aeróbna činnosť | 15min
# Celé telo
Drepy s jednoručkami a tlaky na ramená v stoji | 3x15
Predkopávanie | 3x20,15,12
Sťahovanie širokej kladky | 3x12
Rozpažovanie a predpažovanie | 3x12 | 6-krát rozpažovanie, 6-krát predpažovanie
Príťahy úzke na stroji | 3x12
# Aeróbna aktivita
Aeróbna činnosť podľa vlastného výberu | 30min
`);

// ---------- POKROČILÁ ŽENA · nabrať svaly · posilňovňa ----------
P('f', 'advanced', 'gain', 'gym', 4, 'Po, St, Pia, Ne', `
# Zadok, zadné stehná, brucho
Zakopávanie v ľahu | 4x12,10,10,8
Rumunský mŕtvy ťah na multipresse | 4x12,10,10,8
Hip thrust | 4x12,10,10,8
Bulharské drepy | 3x10 | každá noha
Káblové zakopávanie priame | 3x12 | každá noha
Abdukcia | 4x15,12,12,10
Skracovačky rovné | 3x15 | brucho kruhovo: tri cviky za sebou, pauza až po celom kole
Skracovačky šikmé | 3x15
Dvíhanie nôh v ľahu | 3x10
# Chrbát šírka, ramená, biceps
Veslovanie zo spodnej kladky široké | 3x12
Sťahovanie širokej kladky | 4x12,10,10,8
Pullover s tyčou | 4x15,12,10,10
Tlaky s jednoručkami | 4x15,12,12,10
Rozpažovanie na stroji | 3x12
Opačný pec deck | 4x12,10,10,8
Biceps rovný na stroji, lakte opreté | 4x12,10,10,8
Biceps kladivový s jednoručkami | 3x10
# Predné stehná, hrudník, brucho
Predkopávanie | 4x12,12,10,10
Hack drep | 4x12,12,10,10
Výpady s jednoručkami | 3x12 | každá noha 6-krát
Drepy na multipresse | 4x12,12,10,10
Addukcia | 4x15
Lýtka | 3x12
Pec deck | 4x12
Tlaky na stroji v sede pred seba | 4x12,12,10,10
Dvíhanie nôh vo vise | 3x12
Mountain climber | 3x20
Plank | 1x1min
# Chrbát hĺbka, ramená, triceps
Príťahy na stroji naúzko | 3x12
Sťahovanie úzkej kladky | 4x12,10,10,8
Kliky úzke | 3x10
Predpažovanie s lanom | 4x12,10,10,8
Príťahy veľkej činky k brade | 3x12
Tlaky na multipresse | 4x15,12,12,10
Triceps s lanom | 3x12
Francúzsky tlak | 3x12,10,8
`);
P('f', 'advanced', 'gain', 'gym', 5, 'Po, Ut, Št, Pia, Ne', `
# Predné stehná, ramená, brucho
Predkopávanie | 3x12
Drepy s tyčou | 4x12,10,10,8
Leg press | 3x12
Lýtka | 4x15,12,10,10
Tlaky s jednoručkami | 3x12
Rozpažovanie na stroji | 4x12,12,10,10
Predpažovanie s lanom | 3x12
Skracovačky rovné | 3x15
Skracovačky šikmé | 3x15
Dvíhanie nôh vo vise | 3x15
# Chrbát hĺbka, spodný chrbát, triceps
Príťahy na stroji naúzko | 3x12
Sťahovanie kladky naúzko | 4x15,12,12,10
Príťahy spodnej kladky naúzko | 3x12
Pullover | 4x15
Hyperextenzia s kotúčom na spodný chrbát | 3x10
Francúzsky tlak | 4x12
# Zadok, brucho
Bulharský drep na multipresse | 4x10 | každá noha
Hip thrust | 4x20,15,12,10
Rumunský mŕtvy ťah s tyčou | 3x10
Abdukcia | 4x20
Káblové zakopávanie priame | 3x15,12,10 | každá noha
Mohamedan (brucho) | 3x10
Príťahy nôh na lavičke | 3x10
Sviečka | 3x10
# Chrbát šírka, ramená, biceps
Sťahovanie kladky naširoko | 3x15,12,10
Príťahy veľkej činky k pásu | 4x15,12,12,10
Pullover s tyčou | 3x15 | s tyčou, nie s lanom
Rozpažovanie s jednoručkami | 3x12
Opačný pec deck na ramená | 4x15
Príťahy k brade | 4x15,12,10,10
Biceps s jednoručkami s vytáčaním | 3x12
# Zadné stehná, hrudník, brucho
Zakopávanie v sede | 4x15,12,12,10
Výpady s jednoručkami | 3x12 | každá noha 6-krát
Leg press naúzko | 4x15,12,10,10
Sumo drep | 4x12
Tlaky s jednoručkami | 3x12
Pec deck | 3x12
Skracovačky rovné | 3x15
Vytáčanie s jednoručkou | 3x20
`);

// ---------- POKROČILÁ ŽENA · schudnúť · posilňovňa ----------
P('f', 'advanced', 'lose', 'gym', 5, 'Po, Ut, Št, Pia + Ne aeróbna', `
# Predné stehná, ramená, brucho
Predkopávanie | 3x20,15,12
Leg press | 3x12
Drepy s výskokom s loptou v rukách | 3x15
Výpady došikma striedavo s jednoručkami | 3x10
Addukcia (znožovanie) | 3x20
Tlaky na ramená s jednoručkami | 3x12
Rozpažovanie | 3x15,12,10
Pec deck na zadné ramená | 3x10
Skracovačky rovné | 3x20
Skracovačky šikmé | 3x20
Dvíhanie nôh v ľahu | 3x10
Aeróbna činnosť | 10min
# Chrbát, triceps, biceps
Sťahovanie úzkej kladky | 3x12
Príťahy na stroji široké | 3x12
Pullover s lanom | 3x20
Veslovanie, príťahy kladky široké | 3x12
Sťahovanie lana na triceps | 3x15
Biceps kladivový s lanom | 3x15
Aeróbna činnosť | 10min
# Zadné stehná, zadok, brucho
Zakopávanie v ľahu | 3x20,15,12
Rumunský mŕtvy ťah s jednoručkami | 3x12
Široký drep s výskokom | 3x15
Hip thrust s ľahkou váhou | 3x20 | hneď po ňom zakopávanie v stoji na kladke 3x10
Zakopávanie v stoji na kladke (zadok) | 3x10
Glute bridge so závažím, výdrž | 3x1min ?
Dvíhanie nôh vo vise | 3x20
Sklapačky na lavičke | 3x10
Aeróbna činnosť | 10min
# Hrudník, ramená
Tlaky na ramená na multipresse | 3x12
Predpažovanie a rozpažovanie | 3x10 | 10 predpažovaní + 10 rozpažovaní
Príťahy veľkej činky | 3x12
Pec deck | 3x12
Tlaky na stroji v sede | 3x12
Kliky | 3x10
Aeróbna činnosť | 10min
# Aeróbna aktivita
Aeróbna činnosť podľa vlastného výberu | 30min
`);

// ---------- parser ----------
const MUSCLE = [
  [/aer[oó]b|beh\b|bicykel|prech[aá]dzk/i, 'kardio'],
  [/zakop|rumunsk|zadn[eé] stehn/i, 'zadné stehná'],
  [/hip thrust|glute|abduk|zano[zž]ov|zadok|sumo/i, 'zadok'],
  [/drep|predkop|hack|leg press|v[yý]pad|v[yý]stup|adduk|zno[zž]ov|nohy/i, 'nohy'],
  [/l[yý]tk/i, 'lýtka'],
  [/pr[ií][tť]ahy jednoru[cč]iek v planku/i, 'chrbát'],
  [/zadn[eé] ramen|upa[zž]ov|opa[cč]n[yý] pec/i, 'zadné ramená'],
  [/klik|pec deck|tlaky na lavi|tlaky na stroji|tlaky pred seba|tlaky v sede|tlaky na [sš]ikmej|hrudn/i, 'hrudník'],
  [/ramen|rozpa[zž]|predpa[zž]|k brade|k [cč]elu/i, 'ramená'],
  [/biceps/i, 'biceps'],
  [/triceps|franc[uú]z|za hlavou/i, 'triceps'],
  [/skracova|brucho|plank|sklapa|dv[ií]hanie n[oô]h|mountain|svie[cč]ka|mohamedan|vyt[aá][cč]anie|pr[ií][tť]ahy n[oô]h/i, 'brucho'],
  [/kladk|pr[ií][tť]ah|pullover|hyperext|veslo|chrb[aá]t/i, 'chrbát'],
];
// "Tlaky s jednoručkami" sú u Laury raz na hrudník, raz na ramená: rozhodne názov dňa
const MKEY = { 'kardio': 'cardio', 'zadné stehná': 'hams', 'zadok': 'glutes', 'nohy': 'quads', 'lýtka': 'calves', 'hrudník': 'chest', 'zadné ramená': 'reardelt', 'ramená': 'shoulders', 'biceps': 'biceps', 'triceps': 'triceps', 'brucho': 'core', 'chrbát': 'back' };
const muscleOf = (n, dayName = '') => (MUSCLE.find(([re]) => re.test(n)) || [0, /hrudn/i.test(dayName) ? 'hrudník' : 'ramená'])[1];
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function parse(text) {
  const days = []; let cur = null; let dayNo = 0;
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    if (line.startsWith('#')) { cur = { day: ++dayNo, name: line.slice(1).trim(), exercises: [] }; days.push(cur); return; }
    if (!cur) return;
    const parts = line.split('|').map(s => s.trim());
    let name = parts[0]; let vol = parts[1] || ''; const note = parts[2] || '';
    let check = false;
    if (/\?$/.test(vol)) { check = true; vol = vol.replace(/\s*\?$/, ''); }
    const used = new Set(cur.exercises.map(e => e.id));
    let id = 'l_' + slug(name); let k = 2; while (used.has(id)) id = 'l_' + slug(name) + '_' + k++;
    const base = { id, name, muscle: muscleOf(name, cur.name), role: 'tmpl', rir: null, rest: null, cue: null, note: note || null, check };
    base.mk = MKEY[base.muscle] || 'core';
    let m;
    if ((m = vol.match(/^(\d+)\s*x\s*(\d+)\s*min$/i))) { cur.exercises.push({ ...base, sets: Number(m[1]), reps: null, seconds: Number(m[2]) * 60 }); return; }
    if ((m = vol.match(/^(\d+)\s*min$/i))) { cur.exercises.push({ ...base, muscle: 'kardio', mk: 'cardio', role: 'cardio', sets: 1, reps: null, seconds: Number(m[1]) * 60 }); return; }
    if ((m = vol.match(/^(\d+)\s*x\s*([\d,\s]+)$/i))) {
      const sets = Number(m[1]); let list = m[2].split(',').map(s => Number(s.trim())).filter(n => n > 0);
      if (list.length > 1 && list.length < sets) { while (list.length < sets) list.push(list[list.length - 1]); base.check = true; }
      if (list.length > sets) list = list.slice(0, sets);
      const same = list.every(v => v === list[0]);
      cur.exercises.push({ ...base, sets, reps: same ? String(list[0]) : list.join('/'), repsBySet: same ? null : list, seconds: null });
      return;
    }
    cur.exercises.push({ ...base, sets: 3, reps: '12', seconds: null, check: true });
  });
  return days;
}

export const LAURA = { name: 'Laura', title: 'trénerka Laura', gen: 'trénerky Laury' };
export const TLEVELS = {
  beginner: { label: 'Začiatočník', desc: 'Do roka pravidelného cvičenia alebo po dlhšej pauze.' },
  advanced: { label: 'Pokročilý', desc: 'Viac ako rok pravidelného cvičenia, poznáš techniku základných cvikov.' },
};
export const GOAL_TXT = { lose: 'schudnúť', gain: 'nabrať svaly' };

export const templateLevel = l => (l === 'beginner' ? 'beginner' : l ? 'advanced' : 'beginner');
export const templateGoal = g => (g === 'lose' ? 'lose' : 'gain');

// Všetky varianty pre zadané pohlavie, úroveň, cieľ a miesto; ak pokročilý nemá domácu verziu, dostane začiatočnícku (fallback)
export function templateOptions({ sex, level, goal, place }) {
  const s = sex === 'f' ? 'f' : 'm', lv = templateLevel(level), g = templateGoal(goal), pl = place === 'home' ? 'home' : 'gym';
  let list = PLANS.filter(p => p.sex === s && p.goal === g && p.place === pl && p.level === lv);
  let fallback = null;
  if (!list.length && lv === 'advanced') { list = PLANS.filter(p => p.sex === s && p.goal === g && p.place === pl && p.level === 'beginner'); fallback = 'level'; }
  if (!list.length) { list = PLANS.filter(p => p.sex === s && p.goal === g && p.level === lv); fallback = 'place'; }
  if (!list.length) list = PLANS.filter(p => p.sex === s && p.goal === g);
  return { list: list.slice().sort((a, b) => a.days - b.days), fallback };
}

export function buildTemplate(params = {}) {
  const { list, fallback } = templateOptions(params);
  if (!list.length) return null;
  const want = Number(params.days) || 3;
  const t = list.slice().sort((a, b) => Math.abs(a.days - want) - Math.abs(b.days - want) || a.days - b.days)[0];
  const days = parse(t.text);
  const strength = days.filter(d => d.exercises.some(e => e.role !== 'cardio')).length;
  const aerobicDay = days.length > strength;
  const name = `${t.days}× týždenne · ${TLEVELS[t.level].label.toLowerCase()} · ${GOAL_TXT[t.goal]}`;
  return {
    name, days,
    meta: {
      v: 3, template: true, author: LAURA.name,
      params: { sex: t.sex, level: t.level, goal: t.goal, place: t.place, days: t.days },
      schedule: t.schedule, aerobicDay, fallback,
      note: t.place === 'home' ? 'Plán na cvičenie doma: stačia jednoručky, expander alebo guma a posteľ či lavička.' : null,
    },
  };
}

// Pre kontrolu obsahu (skript aj admin): všetky plány a položky označené na kontrolu
export function allTemplates() { return PLANS.map(t => ({ ...t, parsed: parse(t.text) })); }
export function checkList() {
  const out = [];
  PLANS.forEach(t => parse(t.text).forEach(d => d.exercises.forEach(e => { if (e.check) out.push({ plan: `${t.sex === 'f' ? 'žena' : 'muž'} · ${TLEVELS[t.level].label.toLowerCase()} · ${GOAL_TXT[t.goal]} · ${t.place === 'home' ? 'doma' : 'fitko'} · ${t.days}×`, day: d.name, exercise: e.name, value: e.reps ? `${e.sets}×${e.reps}` : `${e.sets}×${e.seconds / 60} min` }); })));
  return out;
}
