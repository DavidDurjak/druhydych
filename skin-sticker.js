// Vzhľad „Nálepky“ (v305, nanovo): prémiové vinylové nálepky, nie detský zošit.
//   * povrch: matný tmavý ako veko notebooku (tmavý režim) alebo svetlý matný papier (svetlý režim), s jemným zrnom
//   * každá karta je nafúknutá lesklá nálepka: vyseknutý biely okraj, svetlo zhora, mäkký tieň pod ňou, jemný lesk
//   * kruh kalórií je holografická nálepka: fólia, ktorá mení farby (ružová, zlatá, tyrkysová, fialová) a leskne sa
//   * hlavné tlačidlá, aktívna položka v lište a plusko majú tú istú holografickú fóliu
//   * písmo: hrubý čistý Inter (ako na nálepkách značiek), nie zaoblené
//   * pár nálepiek je mierne natočených (séria dní, štítok Nové), hlavná karta má ohnutý rožtek
// Pravidlá obrazoviek (ktoré prvky sú karty, tlačidlá, prepínače) sú spoločné zo skin.js (RULES), tu sú farby a to, čím sa Nálepky líšia.

const F = `'Inter','Sora',system-ui,sans-serif`;
// holografická fólia: pastelová dúha, ktorá sa pri každom použití začína inde (pôsobí ako svetlo na fólii)
const HOLO = (deg = 135) => `linear-gradient(${deg}deg,#FFB3E6 0%,#FFE39A 26%,#A6F3F0 52%,#C8B6FF 78%,#FFB3E6 100%)`;
const HOLO_C = `conic-gradient(from -90deg,#FFB3E6,#FFE39A,#A6F3F0,#C8B6FF,#FFB3E6)`;
// zrno povrchu
const GRAIN = a => "url(\"data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${a} 0'/></filter><rect width='160' height='160' filter='url(#n)'/></svg>`) + "\")";

const VARS = (S, D) => `
${S}{--bg:#ECEBEF;--bg-2:#E2E1E7;--card:#FFFFFF;--card-2:#F4F3F8;--line:rgba(20,18,30,.1);--text:#15131E;--muted:#6A6880;
 --accent:#C94DA8;--accent-ink:#15131E;--accent-2:#F08A3C;--protein:#17B978;--carbs:#2F7FF0;--fat:#F0A030;--danger:#E8405A;--track:#DDDBE4;
 --ink:#15131E;--t1:#15131E;--t2:#2E2B3F;--t3:#6A6880;--tbg:#2E2B3F;
 --paper:#FFFFFF;--paper-2:#F4F3F8;--cut:#FFFFFF;--sh:rgba(20,18,30,.18);--sh-d:rgba(20,18,30,.3);
 --puff:inset 0 2px 0 rgba(255,255,255,1),inset 0 -8px 14px rgba(20,18,30,.06),0 0 0 2.5px #FFFFFF,0 10px 22px -10px var(--sh-d),0 3px 6px -3px var(--sh);
 --puff2:inset 0 2px 0 rgba(255,255,255,1),inset 0 -12px 20px rgba(20,18,30,.07),0 0 0 3px #FFFFFF,0 18px 34px -16px var(--sh-d),0 4px 8px -4px var(--sh);
 --puffin:inset 0 1px 0 rgba(255,255,255,1),inset 0 -5px 10px rgba(20,18,30,.05),0 0 0 2px #FFFFFF,0 5px 10px -6px var(--sh);
 --ck-grad:${HOLO()};--holo:${HOLO()};--holo-t:#15131E;--holo-e:rgba(20,18,30,.25);
 --gl:#FFFFFF;--gl-in:#F4F3F8;--gl-hero:#FFFFFF;--gl-soft:#FFFFFF;--gl-b:0 solid transparent;--gl-sh:var(--puff);--gl-sh2:var(--puff2);--gl-shin:var(--puffin);
 --well:#DDDBE4;--well-sh:inset 0 2px 4px rgba(20,18,30,.1);--seg-on:#FFFFFF;--seg-on-sh:inset 0 1px 0 #fff,0 0 0 2px #fff,0 4px 10px -4px var(--sh-d);
 --mixb:#FFFFFF;--warm:#FFF3E2;--streak:${HOLO(160)};--streak-t:#15131E;
 --dk:#15131E;--dk-b:transparent;--pri:var(--holo);--pri-t:#15131E;--pos:#0E9A62;--tde:#ECEBEF;
 --bgc:#ECEBEF;--bg1:${GRAIN(.07)} 0 0/160px 160px;--bg2:radial-gradient(60% 40% at 100% 0%,rgba(255,179,230,.25),transparent 70%);--bg3:radial-gradient(60% 40% at 0% 100%,rgba(166,243,240,.28),transparent 70%);--bg4:#ECEBEF;
 --ctr:#FFFFFF;--ctr2:#F4F3F8;--raw:#FFFFFF;--plate0:#FFFFFF;--plate1:#F4F3F8;--plate2:#E2E1E7;--plate-r:transparent;--arc0:#FFB3E6;--arc1:#C8B6FF;
 --wc-line:#C94DA8;--wc-area:#FFB3E6;--wc-glow:none;--wc-tag:#15131E;--wc-tag-t:#fff;color-scheme:light}
${D}{--bg:#131318;--bg-2:#1A1A21;--card:#F7F6FA;--card-2:#ECEBF2;--line:rgba(20,18,30,.1);--text:#15131E;--muted:#6A6880;
 --accent:#FFB3E6;--accent-ink:#15131E;--accent-2:#FFC98A;--protein:#2ED38F;--carbs:#4D93FF;--fat:#FFB347;--danger:#FF5C78;--track:#DDDBE4;
 --ink:#15131E;--t1:#15131E;--t2:#2E2B3F;--t3:#6A6880;--tbg:#F2F0F7;
 --paper:#F7F6FA;--paper-2:#ECEBF2;--cut:#FFFFFF;--sh:rgba(0,0,0,.5);--sh-d:rgba(0,0,0,.7);
 --gl:#F7F6FA;--gl-in:#ECEBF2;--gl-hero:#FAF9FC;--gl-soft:#F7F6FA;
 --well:#DDDBE4;--seg-on:#FFFFFF;
 --mixb:#F7F6FA;--warm:#FFF3E2;
 --dk:#15131E;--pos:#0E9A62;--tde:#131318;
 --bgc:#131318;--bg1:${GRAIN(.09)} 0 0/160px 160px;--bg2:radial-gradient(60% 40% at 100% 0%,rgba(255,179,230,.12),transparent 70%);--bg3:radial-gradient(60% 40% at 0% 100%,rgba(166,243,240,.12),transparent 70%);--bg4:#131318;
 --ctr:#FFFFFF;--ctr2:#ECEBF2;--raw:#F7F6FA;--plate0:#F7F6FA;--plate1:#ECEBF2;--plate2:#DDDBE4;--plate-r:transparent;
 --wc-line:#C94DA8;--wc-area:#FFB3E6;--wc-glow:none;--wc-tag:#15131E;--wc-tag-t:#fff;color-scheme:dark}`;

// farebná nafúknutá nálepka (n = pro, car, fat, vio, red)
const COLS = { pro: ['#DFF8EB', '#17B978'], car: ['#E2EDFF', '#2F7FF0'], fat: ['#FFEEDC', '#F0A030'], vio: ['#EEE8FF', '#8B6CF0'], red: ['#FFE4E9', '#E8405A'] };
const puff = (bg, edge = 'rgba(20,18,30,.08)') => `background:${bg}!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.95),inset 0 -8px 14px ${edge},0 0 0 2.5px #fff,0 10px 22px -10px var(--sh-d),0 3px 6px -3px var(--sh)!important`;
const tint = n => puff(`linear-gradient(180deg,#fff 0%,${COLS[n][0]} 100%)`, `color-mix(in srgb,${COLS[n][1]} 18%,transparent)`);
const holo = (deg = 135) => `background:${HOLO(deg)}!important;color:#15131E!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.9),inset 0 -8px 14px rgba(20,18,30,.1),0 0 0 2.5px #fff,0 10px 22px -10px var(--sh-d),0 3px 6px -3px var(--sh)!important`;
// lesk cez nálepku: jemný biely pás zhora zľava
const GLOSS = `linear-gradient(165deg,rgba(255,255,255,.75) 0%,rgba(255,255,255,0) 38%)`;

const EXTRA = (S, D) => `
/* bez skla a rozmazania: každá karta je nafúknutá lesklá nálepka s vyseknutým bielym okrajom */
${S} #app *,${S} .sheet-bg *,${S} .qa-ov,${S} .tde-s,${S} .nav{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
${S} .card,${S} .mtile,${S} .ml,${S} .pg-card,${S} .tile,${S} .tip,${S} .shop-card,${S} .fr-card,${S} .rp-card,${S} .wc-card,${S} .qk-b,${S} .ci,${S} .ck-c{border-radius:24px!important}
${S} .card,${S} .pg-card,${S} .tile,${S} .shop-card,${S} .fr-card,${S} .rp-card,${S} .wc-card,${S} .ck-c.ck-l,${S} .pfx-tiles>*,${S} .pfx-plan,${S} .tr-card,${S} .tr-perks{background-image:${GLOSS}!important}
${S} .ck-c.ck-in{background:var(--gl-in)!important;box-shadow:var(--puffin)!important}
${S} .hero-k,${S} .pfx-hero{border-radius:30px!important;position:relative;background-image:${GLOSS}!important}
/* ohnutý rožtek hlavnej karty: nálepka, ktorá sa dá odlepiť */
${S} .hero-k::after{content:'';display:block!important;position:absolute;right:0;bottom:0;width:34px;height:34px;border-radius:0 0 30px 0;
 background:linear-gradient(225deg,var(--bgc) 0 48%,#D9D7E0 50%,#fff 62%,#F1F0F5 100%)!important;box-shadow:-4px -4px 10px -4px rgba(20,18,30,.3)!important;opacity:1!important;filter:none!important;animation:none!important;transform:none!important;pointer-events:none}
${S} .card.accent,${S} .rp-card{background:#fff!important}

/* písmo: hrubý čistý Inter ako na nálepkách značiek */
${S} .screen h1,${S} .tdh-g,${S} .qa-h,${S} .fnq h1{font-family:${F};font-weight:900!important;letter-spacing:-.035em;color:var(--tbg)!important}
${S} .screen h2,${S} .screen h3{font-family:${F};font-weight:800!important;letter-spacing:-.02em}
${S} .hk-c b,${S} .hk-eat b,${S} .mtile b,${S} .grid3 .stat b,${S} .ko-ring b,${S} .ko-kp b,${S} .mbp b{font-family:${F};font-weight:900!important;letter-spacing:-.045em}
${S} .pfx-gt,${S} .screen>.muted,${S} .screen>p.small,${S} .fwdk-h span,${S} .dc>h3+span,${S} .topbar .date{color:var(--tbg)!important}
${S} .screen>.muted,${S} .screen>p.small{opacity:.7}
${D} .screen>.muted,${D} .screen>p.small,${D} .pfx-gt{color:#B9B6CC!important;opacity:1}
${D} .tdh-edit{color:#F2F0F7!important}
/* v tmavom režime je text priamo na pozadí svetlý; karty majú vlastnú (tmavú) farbu písma */
${D} #app .screen,${D} .fnq,${D} .qa-ov,${D} .tde-s,${D} .pw{color:#F2F0F7}
${D} .screen h2,${D} .screen h3,${D} .screen h4{color:inherit}
${D} .screen .field>span,${D} .screen>.field>span,${D} .screen>form>.field>span{color:#B9B6CC!important}
${S} .tr-emp{color:var(--t1)!important}
${S} .topbar .btn.icon{color:var(--t1)!important}

/* hlavička Dnes: dátum a séria ako malé nálepky, séria holografická a natočená */
${S} .tdh-cal,${S} .tdh-s{background:var(--gl)!important;border:0!important;box-shadow:var(--puffin)!important;color:var(--t1)!important}
${S} .tdh-cal .cal-ic{background:var(--ink)!important;box-shadow:none!important}
${S} .tdh-cal .cal-ic b{color:#fff!important}
${S} .tdh-streak{${holo(160)};border:0!important;transform:rotate(2.5deg);font-weight:900}
${S} .tdh-streak *{color:#15131E!important}

/* týždeň: dni ako malé okrúhle nálepky, splnený deň holografický, dnešok tmavý */
${S} .wk-d .wk-l{color:var(--tbg)!important;font-weight:700}
${D} .wk-d .wk-l{color:#B9B6CC!important}
${S} .wk-d:not(.hit):not(.now) .wk-r::before{content:'';position:absolute;inset:3px;border-radius:50%;z-index:0;background:var(--paper);box-shadow:0 0 0 2px #fff,0 4px 8px -3px var(--sh-d)}
${S} .wk-d.hit .wk-r::before{inset:3px!important;background:${HOLO_C}!important;box-shadow:0 0 0 2px #fff,0 4px 8px -3px var(--sh-d)!important}
${S} .wk-d.hit .wk-r b{color:#15131E!important}
${S} .wk-d .wk-r b{color:#15131E!important}
${S} .wk-d.now{background:var(--ink)!important;border-radius:16px;box-shadow:0 0 0 2px #fff,0 8px 16px -6px var(--sh-d)!important}
${S} .wk-d.now .wk-l{color:#FFB3E6!important}${S} .wk-d.now:not(.hit) .wk-r b{color:#fff!important}
${S} .wk-d.now:not(.hit) .wk-r::before{box-shadow:none!important}
${S} .wk-d.sel{background:none!important;box-shadow:none!important}${S} .wk-d.sel.now{background:var(--ink)!important}
${S} .wk-d .wk-r svg{z-index:1}

/* kruh kalórií: holografická nálepka (kreslí skin.js) */
${S} .ck-ring .st-back{fill:var(--paper)}${S} .ck-ring .st-cut{fill:#fff}
${S} .ck-ring .st-track{stroke:var(--track)}
${S} .hk-c b{font-size:44px!important;color:var(--t1)!important}
${S} .hk-c span{color:var(--t3)!important;font-weight:600}
${S} .hk-pc{${holo(120)};border:0!important;font-weight:900!important;font-style:normal}
${S} .hero-k.over .hk-pc{background:linear-gradient(135deg,#FF9DB0,#FF6B85)!important}
${S} .hk-edit{background:var(--ink)!important;color:#fff!important;border:0!important;box-shadow:0 0 0 2px #fff,0 6px 12px -5px var(--sh-d)!important;font-weight:800}

/* jedlá dňa: zapísané sú lesklé nálepky vo farbe jedla */
${S} .mbp{background:var(--gl-in)!important;border:0!important;box-shadow:inset 0 1px 0 #fff,0 0 0 2px #fff!important;color:var(--t3)!important}
${S} .mbp.on{${puff('linear-gradient(180deg,color-mix(in srgb,var(--mc) 30%,#fff),color-mix(in srgb,var(--mc) 62%,#fff))', 'color-mix(in srgb,var(--mc) 35%,transparent)')};color:#15131E!important}
${S} .mbp.on *{color:#15131E!important}
${S} .mbp.on::after{box-shadow:none!important}

/* makrá: tri nafúknuté nálepky, pásik ako lesklá tyčinka */
${S} .hk-macros .mtile:nth-child(1),${S} .grid3 .stat:nth-child(1){${tint('pro')}}
${S} .hk-macros .mtile:nth-child(2),${S} .grid3 .stat:nth-child(2){${tint('car')}}
${S} .hk-macros .mtile:nth-child(3),${S} .grid3 .stat:nth-child(3){${tint('fat')}}
${S} .mt-b{background:rgba(20,18,30,.08)!important;box-shadow:inset 0 1px 2px rgba(20,18,30,.12)!important;height:9px!important;border-radius:6px!important}
${S} .mt-b i{border-radius:6px!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.55),inset 0 -2px 0 rgba(0,0,0,.12)!important}
${S} .grid3 .stat::before{width:22px!important;height:6px!important;border-radius:4px!important;box-shadow:none!important}

/* tlačidlá: biele nálepky, hlavné holografické; pri stlačení sa pritlačia */
${S} .btn{border:0!important;background:var(--gl)!important;color:var(--t1)!important;box-shadow:var(--puffin)!important;font-weight:800;transition:transform .08s}
${S} .btn.primary{${holo()}}
${S} .btn.danger{${puff('linear-gradient(180deg,#FFE4E9,#FFC9D2)', 'rgba(232,64,90,.2)')};color:#8E1F33!important}
${S} .btn:active,${S} .fnq-cta:active,${S} .qa-b:active,${S} .gs-btn:active,${S} .tile:active,${S} .pfx-tiles>*:active{transform:scale(.97)!important}
${S} .ml-add{border:0!important;background:var(--ink)!important;color:#fff!important;box-shadow:0 0 0 2px #fff!important}
${S} .chip,${S} .pill{border:0!important}

/* prepínače: vybraná voľba je vystúpená biela nálepka */
${S} .seg,${S} .pg-per{background:var(--well)!important;border:0!important;box-shadow:var(--well-sh)!important}
${D} .seg,${D} .pg-per{background:#1F1F27!important}${D} .seg button,${D} .seg a,${D} .pg-per button{color:#B9B6CC!important}
${S} .seg .on,${S} .seg button.on,${S} .seg a.on,${S} .pg-per button.on{background:var(--seg-on)!important;color:var(--t1)!important;box-shadow:var(--seg-on-sh)!important}
${S} .seg .on *,${S} .pg-per button.on *{color:var(--t1)!important}
${S} .pgx-per::before{background:var(--seg-on)!important;box-shadow:var(--seg-on-sh)!important}
${S} #mealseg button.on{${puff('linear-gradient(180deg,color-mix(in srgb,var(--mc) 30%,#fff),color-mix(in srgb,var(--mc) 62%,#fff))', 'color-mix(in srgb,var(--mc) 35%,transparent)')};color:#15131E!important}
${S} #mealseg button.on *{color:#15131E!important}
${S} .lvl button{border:0!important;box-shadow:var(--puff)!important;background-image:${GLOSS}!important}
${S} .lvl button.on,${D} .lvl button.on{${holo()};border:0!important}
${S} .lvl button.on *,${S} .lvl button.on small,${S} .lvl button.on .lv-t small{color:#15131E!important}
${S} .lvl button.on .lv-ic{background:#15131E!important;color:#fff!important}

/* Jedlo: rýchle dlaždice ako farebné nálepky, „Nové“ je natočený holografický štítok */
${S} .qa-b{border:0!important;font-weight:800!important;transition:transform .08s}
${S} .qa-b:nth-child(4n+1){${tint('pro')}}${S} .qa-b:nth-child(4n+2){${tint('fat')}}${S} .qa-b:nth-child(4n+3){${tint('car')}}${S} .qa-b:nth-child(4n+4){${tint('vio')}}
${S} .qa-b b{color:var(--t1)!important}
${S} .qk-b:nth-child(4n+1){${tint('car')}}${S} .qk-b:nth-child(4n+2){${tint('fat')}}${S} .qk-b:nth-child(4n+3){${tint('pro')}}${S} .qk-b:nth-child(4n+4){${tint('vio')}}
${S} .qk-b span,${S} .qk-b b{color:var(--t1)!important;font-weight:800!important}
${S} .ms-entry em,${S} .frg-entry em,${S} .frg-entry>em,${S} .ms-entry>em{${holo(160)};transform:rotate(-5deg);border-radius:9px!important;font-weight:900!important}
${S} .ai-box{border:0!important;box-shadow:var(--puff)!important;background:var(--gl)!important;background-image:${GLOSS}!important}
${S} .screen:has(#mealseg) .ai-box::before,${S} .screen:has(#mealseg) .ai-box::after{display:none!important}

/* Profil */
${S} .pfx-tiles>*:nth-child(1){${tint('vio')}}${S} .pfx-tiles>*:nth-child(2){${tint('pro')}}${S} .pfx-tiles>*:nth-child(3){${tint('fat')}}${S} .pfx-tiles>*:nth-child(4){${tint('car')}}
${S} .pfx-chip.lv{${holo(160)}}
${S} .pfx-chip.fire{background:var(--ink)!important;color:#fff!important}${S} .pfx-chip.fire *{color:#fff!important}
${S} .pfx-xb{background:rgba(20,18,30,.1)!important}
${S} .pfx-xb i{background:${HOLO(90)}!important}
${S} .pfx-s{background:var(--gl)!important;border:0!important;box-shadow:var(--puffin)!important}
${S} .gt-sub{border:0!important;background:var(--gl)!important;box-shadow:var(--puff)!important}
${S} .gt-sub i{${holo()}}

/* tréneri a správy */
${S} .tr-perks,${S} .tr-card,${S} .tr-join.card,${S} .tr-req,${S} .tr-code,${S} .ah-demo{background:var(--gl)!important;border:0!important;box-shadow:var(--puff)!important}
${S} .tr-perks>div+div{border-left-color:var(--line)!important}
${S} .tr-chip,${S} .pm-q button{background:var(--gl)!important;border:0!important;box-shadow:var(--puffin)!important;color:var(--t1)!important;font-weight:800}
${S} .tr-chip.on{${holo()}}
${S} .tr-emp{background:var(--gl-in)!important;border:2px dashed var(--track)!important;box-shadow:none!important}
${S} .tr-tag{background:var(--gl-in)!important;box-shadow:none!important;color:var(--t2)!important}
${S} .tr-bub,${S} .pm-i{border:0!important;box-shadow:var(--puffin)!important}
${S} .tr-bub.me{${holo()}}
${S} .tr-bub.me small{color:#4A3F55!important}
${D} .tr-h1,${D} .tr-sub{color:#F2F0F7!important}

/* prihlásenie */
${S} .seg:has(+#authf)::before{background:var(--seg-on)!important;box-shadow:var(--seg-on-sh)!important}
${S} .seg:has(+#authf) button.on{background:transparent!important;box-shadow:none!important}
${S} .gs-btn.gs-btn.gs-btn{background:#FFFFFF!important;color:#1F1F1F!important;border:0!important;box-shadow:var(--puffin)!important;font-weight:800!important}

/* polia: vpadnuté jamky, pri písaní holografický rámik */
${S} textarea,${S} .input{background-color:var(--gl-in)!important;border:0!important;box-shadow:inset 0 2px 4px rgba(20,18,30,.1)!important;border-radius:16px;color:var(--t1)!important}
${S} textarea:focus,${S} .input:focus{box-shadow:inset 0 0 0 2px #C94DA8!important;outline:none}

/* spodná lišta: tmavá nálepka s bielym vysekom, aktívna položka holografická */
${S} .nav{background:var(--ink)!important;border:0!important;box-shadow:0 0 0 2.5px #fff,0 16px 30px -14px var(--sh-d)!important}
${S} .nav a{color:#8F8CA6!important}
${S} .nav a.on{color:#fff!important}
${S} .nav a.on .ic{background:${HOLO()}!important;color:#15131E!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)!important;border-radius:12px!important}
${S} .nav a.on .ic svg{color:#15131E!important}
${S} .qa-fab{${holo(150)};border:0!important;box-shadow:inset 0 2px 0 rgba(255,255,255,.9),0 0 0 2.5px #fff,0 16px 28px -10px var(--sh-d)!important}
${S} .qa-fab svg{color:#15131E!important;stroke:#15131E!important}
${S} .bd-fab{box-shadow:0 0 0 2.5px #fff,0 12px 22px -10px var(--sh-d)!important}

/* plusko */
${S} .qa-ov{background:var(--bg1),var(--bg2),var(--bg3),var(--bg4)!important}
${S} .qa-h,${S} .qa-lb{color:var(--tbg)!important}
${S} .qa-hero.qa-hero.qa-hero{background-color:#fff!important;background-image:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.7)),${HOLO(150)}!important;color:#15131E!important;border:0!important;box-shadow:var(--puff2)!important}
${S} .qa-hero::before,${S} .qa-hero::after{display:none!important}
${S} .qa-hero h2,${S} .qa-hero p{color:#15131E!important}
${S} .qa-hero .qa-acts button{background:#fff!important;color:#15131E!important;border:0!important;box-shadow:var(--puffin)!important;font-weight:800}
${S} .qa-in .qa-m{${puff('linear-gradient(180deg,color-mix(in srgb,var(--c,#FFB3E6) 28%,#fff),color-mix(in srgb,var(--c,#FFB3E6) 58%,#fff))', 'color-mix(in srgb,var(--c,#FFB3E6) 35%,transparent)')};color:#15131E!important}
${S} .qa-in .qa-m *{color:#15131E!important}
${S} .qa-in .fq,${S} .qa-in .qa-w,${S} .qa-in .qa-t:not(.qa-hero .qa-t){border:0!important;box-shadow:var(--puff)!important;background:var(--gl)!important;color:var(--t1)!important}

/* grafy */
${S} svg.chart .trend{stroke:var(--wc-line)!important;filter:none!important}
${S} svg.chart .ck-area{fill:var(--wc-area)!important;opacity:.35}
${S} svg.chart .ck-end{stroke:var(--wc-line)!important;filter:none!important}
${S} svg.chart.wchart .raw{fill:var(--t3)!important;stroke:none!important;opacity:.35!important}
${S} .pgx-line{stroke:var(--wc-line)!important;filter:none!important}
${S} .pgx-area{fill:var(--wc-area)!important;opacity:.35}
${S} .pgx-proj{stroke:var(--wc-line)!important}
${S} .pgx-rings,${S} .pgx-chart{--accent:#C94DA8}

/* úvod a dotazník: biele nálepky, vybraná holografická */
${S} .fnq{color:var(--tbg)!important}
${S} .fnq-sub{color:var(--t3)!important}${D} .fnq-sub{color:#B9B6CC!important}
${S} .fnq-o,${S} .fnq-feats>div,${S} .fnq-nf,${S} .fnq-bigin label,${S} .fnq-yrs button,${S} .fnq-week i{border:0!important;box-shadow:var(--puff)!important;color:var(--t1)!important;background-image:${GLOSS}!important}
${S} .fnq-o[aria-checked=true]{${holo()}}
${S} .fnq-o.v2[aria-checked=true]{${puff('linear-gradient(180deg,color-mix(in srgb,var(--c) 30%,#fff),color-mix(in srgb,var(--c) 62%,#fff))', 'color-mix(in srgb,var(--c) 35%,transparent)')}}
${S} .fnq-o[aria-checked=true] *{color:#15131E!important}
${S} .fnq-o .ic,${S} .fnq-feats .fi{background:var(--ink)!important;color:#fff!important;box-shadow:none!important}
${S} .fnq-feats>div:nth-child(6n+1){${tint('vio')}}${S} .fnq-feats>div:nth-child(6n+2){${tint('car')}}${S} .fnq-feats>div:nth-child(6n+3){${tint('red')}}${S} .fnq-feats>div:nth-child(6n+4){${tint('pro')}}${S} .fnq-feats>div:nth-child(6n+5){${tint('fat')}}${S} .fnq-feats>div:nth-child(6n+6){${tint('vio')}}
${S} .fnq-week i.on{background:${HOLO()}!important;color:#15131E!important}
${S} .fnq-cta{${holo()};border:0!important;font-weight:900!important}
${S} .fnq-bar{background:var(--well)!important;box-shadow:none!important}${D} .fnq-bar{background:#2A2A33!important}
${S} .fnq-bar i,${S} .fnq-bar b,${S} .fnq-bar>*{background:${HOLO(90)}!important}
${S} .fnq-link{color:var(--tbg)!important}${S} .fnq-link b{color:var(--tbg)!important}${S} .fnq-back{color:var(--tbg)!important}

/* spodné panely: matný nepriesvitný podklad, biely vysek hore ako nálepka */
${S} .sheet-bg{background:rgba(0,0,0,.65)!important}
${S} .sheet{background:var(--paper)!important;color:var(--t1)!important;border-top:2.5px solid #fff!important;border-radius:26px 26px 0 0!important;box-shadow:0 -20px 50px -20px rgba(0,0,0,.7)!important}
${S} .sheet .ck-c,${S} .sheet .card{box-shadow:var(--puffin)!important}
/* recepty: polia a štítky na bielom paneli */
${S} .rh .rh-q,${S} .sheet .input,${S} .sheet textarea{background:var(--gl-in)!important;color:var(--t1)!important}
${S} .rh .rh-cats button.on{background:var(--ink)!important;color:#fff!important;border-color:var(--ink)!important}
${S} .rh .rh-cuis button.on,${S} .rh .rh-sort button.on{background:${HOLO(120)}!important;color:#15131E!important;box-shadow:none!important}
${S} .rh .rh-sort button,${S} .rh .rh-chips span{background:var(--gl-in)!important;color:var(--t2)!important}
${S} .rh .ri-btn,${S} .ri-btn{color:var(--t1)!important;border-color:var(--track)!important}
${S} .rh .rh-cats button{color:var(--t2)!important}
${S} .sheet .del,${S} .sheet [data-x]{background:var(--gl-in)!important;color:var(--t1)!important;border:0!important}
/* Upraviť Dnes */
${S} .tde-r{border:0!important}
${S} .td-editlink{border:0!important;box-shadow:var(--puffin)!important;background:var(--gl)!important}
${D} .tde-h,${D} .tde-s h2{color:#F2F0F7!important}

/* Tréning: vybraná oblasť tela */
${S} #mseg button.on,${S} #mseg button.on *{color:var(--t1)!important}

/* Klienti (tréner) */
${S} .ko-c.warn .ko-id span{color:#8E4B00!important;background:#FFE8CC!important}

/* predplatné */
${S} .pw{color:var(--tbg)!important}
${S} .pw-hero{background:var(--gl)!important;border:0!important;box-shadow:var(--puff2)!important;color:var(--t1)!important}
${S} .pw-tag,${S} .pw-go,${S} .pw-plan .bd{${holo()};border:0!important}
${S} .pw-plan{border-color:transparent!important;box-shadow:var(--puff)!important;background:var(--gl)!important;color:var(--t1)!important}
${S} .pw-plan[aria-checked=true]{${holo()}}
${S} .pw-ben i{border:0!important;box-shadow:var(--puffin)!important;background:var(--gl)!important}
${D} .pw-ben b{color:#F2F0F7!important}${D} .pw-ben small{color:#B9B6CC!important}
`;

// Kruh kalórií ako holografická nálepka: biely vyseknutý okraj, mäkký tieň pod nálepkou, prstenec z fólie, ktorá mení farby
// (ružová, zlatá, tyrkysová, fialová), s leskom zhora. Zjedená časť je fólia, zvyšok matná dráha. Na konci malý lesklý bod.
const P = (r, a) => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)];
const f1 = v => v.toFixed(2);
let uid = 0;
const HSTOPS = [['#FFB3E6', 0], ['#FFE39A', .25], ['#A6F3F0', .5], ['#C8B6FF', .75], ['#FFB3E6', 1]];
const colAt = t => { for (let i = 1; i < HSTOPS.length; i++) if (t <= HSTOPS[i][1]) { const [c0, t0] = HSTOPS[i - 1], [c1, t1] = HSTOPS[i], u = (t - t0) / (t1 - t0); const h = c => [1, 3, 5].map(j => parseInt(c.slice(j, j + 2), 16)); const A = h(c0), B = h(c1); return `rgb(${A.map((v, j) => Math.round(v + (B[j] - v) * u)).join(',')})`; } return HSTOPS[0][0]; };
export function stickerRingSvg(pct) {
  const k = Math.max(0, Math.min(1, pct / 100)), over = pct > 100.4, full = k >= 0.999, id = 'st' + (++uid);
  const R = 40, W = 9.2, a0 = -90, a1 = -90 + k * 360;
  // fólia: oblúk sa skladá zo 72 krátkych dielikov, každý má svoju farbu z dúhy (SVG nemá kužeľový prechod)
  const segs = []; const n = Math.max(1, Math.round(k * 72));
  for (let i = 0; i < n; i++) {
    const s0 = a0 + (i / 72) * 360, s1 = Math.min(a1, s0 + 360 / 72 + 0.6), [x0, y0] = P(R, s0), [x1, y1] = P(R, s1);
    if (s1 <= s0) break;
    segs.push(`<path d="M${f1(x0)},${f1(y0)}A${R},${R} 0 0,1 ${f1(x1)},${f1(y1)}" stroke="${over ? (i % 2 ? '#FF6B85' : '#FF9DB0') : colAt(i / 72)}" stroke-width="${W}" fill="none"/>`);
  }
  const cap = (a, c) => { const [x, y] = P(R, a); return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${W / 2}" fill="${c}"/>`; };
  const [ex, ey] = P(R, full ? a0 : a1);
  const arc = (r, b0, b1) => { const [x0, y0] = P(r, b0), [x1, y1] = P(r, b1); return `M${f1(x0)},${f1(y0)}A${r},${r} 0 ${b1 - b0 > 180 ? 1 : 0},1 ${f1(x1)},${f1(y1)}`; };
  return `<svg class="ck-ring st-ring" viewBox="-50 -50 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
   <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
   <filter id="${id}s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="3.2" flood-color="#000" flood-opacity=".35"/></filter>
  </defs>
  <g filter="url(#${id}s)"><circle class="st-cut" r="48.2"/></g>
  <circle class="st-back" r="45.6"/>
  <circle r="45.6" fill="url(#${id}g)"/>
  <circle class="st-track" r="${R}" fill="none" stroke-width="${W}"/>
  ${k > 0.004 ? `<g>${cap(a0, over ? '#FF9DB0' : '#FFB3E6')}${segs.join('')}${cap(full ? a0 : a1, over ? '#FF6B85' : colAt(k))}</g>
  <path d="${full ? arc(R, -90, 269.9) : arc(R, a0, a1)}" fill="none" stroke="#fff" stroke-width="${W}" stroke-linecap="round" opacity=".35" transform="translate(-1.2 -1.6)" style="mix-blend-mode:screen"/>
  <path d="${full ? arc(R + 2.2, -90, 269.9) : arc(R + 2.2, a0, a1)}" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".7"/>
  <circle cx="${f1(ex)}" cy="${f1(ey)}" r="3.4" fill="#fff"/><circle cx="${f1(ex)}" cy="${f1(ey)}" r="1.6" fill="#15131E"/>` : ''}
  <circle r="${R - W / 2 - 1.6}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".9"/>
 </svg>`;
}
// náhľad do výberu vzhľadu: holografická nálepka s bielym okrajom
export const holoIconSvg = () => stickerRingSvg(68).replace('class="ck-ring st-ring"', 'class="sk-holo"');

export const stickerCss = RULES => {
  const S = 'html[data-skin=sticker]:root', D = 'html[data-skin=sticker][data-theme=dark]:root';
  return VARS(S, D) + RULES(S, D) + EXTRA(S, D);
};
export const STICKER_META = { light: '#ECEBEF', dark: '#131318' };
export const STICKER_FONT = 'https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&display=swap';
