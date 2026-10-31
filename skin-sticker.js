// Vzhľad „Nálepky“ (v304, nanovo): hárok nálepiek z papiernictva. Úplne iný základ ako Cookie:
//   * podklad je matná lila (nie mätový gradient), v tmavom režime hlboké indigo
//   * karty sú biele matné nálepky s tvrdým tieňom šikmo doprava dole (ako keby ležali na papieri), bez skla, bez obrysov
//   * hlavná farba je slnečná žltá s tmavým písmom (Cookie má mätovú), k tomu koralová, mätová, nebeská a levanduľová ako ďalšie nálepky
//   * písmo je zaoblené (SF Rounded na iPhone, inde Nunito), nadpisy veľmi hrubé
//   * pár štítkov je mierne natočených (percento cieľa, séria, „Nové“), ako nalepené rukou
//   * kruh kalórií nie je sušienka, ale prstenec z 24 farebných dielikov, ktoré sa so zjedeným jedlom rozsvecujú
// Pravidlá obrazoviek (ktoré prvky sú karty, tlačidlá, prepínače) sú spoločné zo skin.js (RULES), tu sú farby a to, čím sa Nálepky líšia.

const R = `ui-rounded,'SF Pro Rounded','Nunito','Sora',system-ui,sans-serif`;
// tvrdý tieň nálepky: posunutý šikmo, bez rozmazania
const HARD = (c, d = 5) => `${d}px ${d}px 0 ${c}`;


// kresba na papieri (hviezdička, srdce, blesk, činka, bodka), veľmi jemne, ako potlač na hárku nálepiek
const DOODLE = c => "url(\"data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='168' height='168' viewBox='0 0 168 168' fill='none' stroke='${c}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
<path d='M24 18l3.4 7 7.6 1.1-5.5 5.4 1.3 7.6L24 35.5l-6.8 3.6 1.3-7.6L13 26.1l7.6-1.1z'/>
<path d='M108 44c-4-8-16-6-16 3 0 7 10 12 16 17 6-5 16-10 16-17 0-9-12-11-16-3z'/>
<path d='M60 104l-9 15h8l-3 13 11-17h-8z'/>
<path d='M118 120h22M114 114v12M144 114v12M110 116v8M148 116v8'/>
<circle cx='146' cy='34' r='4'/><circle cx='30' cy='140' r='3'/>
<path d='M70 60c3-5 9-5 11 0M64 70c6 4 14 4 20 0'/>
<path d='M140 78l2 5 5 .7-3.7 3.5.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.7-3.5 5-.7z'/>
</svg>`) + "\")";

const VARS = (S, D) => `
${S}{--bg:#F1ECFF;--bg-2:#E7E0FF;--card:#FFFFFF;--card-2:#F6F3FF;--line:rgba(32,26,61,.1);--text:#201A3D;--muted:#625C86;
 --accent:#E0A400;--accent-ink:#201A3D;--accent-2:#FF5E78;--protein:#1FC98F;--carbs:#3E9BFF;--fat:#FF9A3D;--danger:#F0405F;--track:#E4DEFA;
 --ink:#201A3D;--ink-2:#3B3463;--t1:#201A3D;--t2:#3B3463;--t3:#625C86;--tbg:#2A2350;
 --yel:#FFC83D;--yel-e:#D99E00;--cor:#FF6B85;--cor-e:#D4385A;--mint:#4FE3B0;--mint-e:#17B37F;--sky:#64B5FF;--sky-e:#2A7FD6;--lav:#B79CFF;--lav-e:#8460E6;--pea:#FFB37A;--pea-e:#E07C2A;
 --sh:rgba(32,26,61,.14);--sh-d:rgba(32,26,61,.22);--paper:#FFFFFF;--paper-2:#F6F3FF;--edge:#DCD5F5;
 --ck-grad:linear-gradient(135deg,#FFD66B,#FFC83D);
 --gl:#FFFFFF;--gl-in:#F6F3FF;--gl-hero:#FFFFFF;--gl-soft:#FFFFFF;--gl-b:0 solid transparent;
 --gl-sh:${HARD('var(--sh)')};--gl-sh2:${HARD('var(--sh)', 7)};--gl-shin:none;
 --well:#E7E0FF;--well-sh:none;--seg-on:#FFFFFF;--seg-on-sh:${HARD('var(--sh)', 3)};
 --mixb:#FFFFFF;--warm:#FFF1D1;--streak:#FFE7A3;--streak-t:#7A4D00;
 --dk:#201A3D;--dk-b:transparent;--pri:var(--yel);--pri-e:var(--yel-e);--pri-t:#201A3D;--pos:#0F9E6E;--tde:#F1ECFF;
 --p-pro:#DFFBF0;--p-pro-e:#8FE9C6;--p-car:#E1EFFF;--p-car-e:#9CC8FF;--p-fat:#FFEBD9;--p-fat-e:#FFC494;--p-vio:#EEE7FF;--p-vio-e:#CDB9FF;--p-red:#FFE3E8;--p-red-e:#FFA9B8;--p-yel:#FFF3C7;--p-yel-e:#FFD66B;
 --bgc:#F1ECFF;--bg1:${DOODLE('rgba(32,26,61,.075)')} 0 0/168px 168px;--bg2:radial-gradient(42% 30% at 92% 4%,rgba(255,107,133,.3),rgba(255,107,133,0) 70%),radial-gradient(38% 26% at 4% 38%,rgba(255,200,61,.34),rgba(255,200,61,0) 70%);
 --bg3:radial-gradient(48% 32% at 85% 96%,rgba(100,181,255,.36),rgba(100,181,255,0) 70%);--bg4:#F1ECFF;
 --ctr:#FFFFFF;--ctr2:#F6F3FF;--raw:#FFFFFF;--plate0:#FFFFFF;--plate1:#F6F3FF;--plate2:#E7E0FF;--plate-r:transparent;--arc0:#FFC83D;--arc1:#FF6B85;
 --wc-line:#8460E6;--wc-area:#B79CFF;--wc-glow:none;--wc-tag:#FFC83D;--wc-tag-t:#201A3D;color-scheme:light}
${D}{--bg:#17132B;--bg-2:#1E1838;--card:#262047;--card-2:#2F2856;--line:rgba(243,239,255,.08);--text:#F3EFFF;--muted:#A49DCB;
 --accent:#FFC83D;--accent-ink:#201A3D;--accent-2:#FF6B85;--protein:#4FE3B0;--carbs:#64B5FF;--fat:#FFB37A;--danger:#FF6B85;--track:#2F2856;
 --ink:#F3EFFF;--ink-2:#D3CCF2;--t1:#F3EFFF;--t2:#D3CCF2;--t3:#A49DCB;--tbg:#F3EFFF;
 --sh:rgba(0,0,0,.42);--sh-d:rgba(0,0,0,.6);--paper:#262047;--paper-2:#2F2856;--edge:#110D22;
 --gl:#262047;--gl-in:#2F2856;--gl-hero:#2A2350;--gl-soft:#2F2856;
 --well:#110D22;--seg-on:#3B3463;
 --mixb:#262047;--warm:#3A2F1C;--streak:#4A3A12;--streak-t:#FFD66B;
 --dk:#F3EFFF;--pos:#4FE3B0;--tde:#17132B;
 --p-pro:#163E33;--p-pro-e:#0C2A22;--p-car:#1A3352;--p-car-e:#0F2138;--p-fat:#4A2D14;--p-fat-e:#281607;--p-vio:#2F2558;--p-vio-e:#1C1538;--p-red:#4A2231;--p-red-e:#2E131E;--p-yel:#3D3520;--p-yel-e:#1F1A0C;
 --bgc:#17132B;--bg1:${DOODLE('rgba(243,239,255,.06)')} 0 0/168px 168px;--bg2:radial-gradient(42% 30% at 92% 4%,rgba(255,107,133,.18),rgba(255,107,133,0) 70%),radial-gradient(38% 26% at 4% 38%,rgba(255,200,61,.15),rgba(255,200,61,0) 70%);
 --bg3:radial-gradient(48% 32% at 85% 96%,rgba(100,181,255,.2),rgba(100,181,255,0) 70%);--bg4:#17132B;
 --ctr:#2A2350;--ctr2:#2F2856;--raw:#262047;--plate0:#2A2350;--plate1:#221C42;--plate2:#1A1535;--plate-r:transparent;--arc0:#FFC83D;--arc1:#FF6B85;
 --wc-line:#B79CFF;--wc-area:#8460E6;--wc-glow:none;--wc-tag:#FFC83D;--wc-tag-t:#201A3D;color-scheme:dark}`;

// farebná nálepka: pastelové pozadie, tvrdý tieň v sýtejšom odtieni tej istej farby
const tint = n => `background:var(--p-${n})!important;box-shadow:${HARD(`var(--p-${n}-e)`, 4)}!important`;
// plná sýta nálepka (žltá, koralová...) s tmavým písmom
const solid = n => `background:var(--${n})!important;color:#201A3D!important;box-shadow:${HARD(`var(--${n}-e)`, 4)}!important`;

const EXTRA = (S, D) => `
/* žiadne sklo, žiadne rozmazanie, žiadne obrysy: matná nálepka s tvrdým tieňom */
${S} #app *,${S} .sheet-bg *,${S} .qa-ov,${S} .tde-s,${S} .nav{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
${S} .card,${S} .mtile,${S} .ml,${S} .pg-card,${S} .tile,${S} .tip,${S} .shop-card,${S} .fr-card,${S} .rp-card,${S} .wc-card,${S} .qk-b,${S} .ci,${S} .ck-c{border-radius:26px!important}
${S} .ck-c.ck-in{background:var(--gl-in)!important;box-shadow:none!important}
${S} .hero-k,${S} .pfx-hero{border-radius:30px!important}
${S} .card.accent,${S} .rp-card{${tint('yel')}}

/* zaoblené hrubé písmo */
${S} body,${S} #app,${S} .sheet-bg,${S} .fnq,${S} .qa-ov{font-family:${R}}
${S} .screen h1,${S} .tdh-g,${S} .qa-h,${S} .fnq h1{font-family:${R};font-weight:900!important;letter-spacing:-.03em;color:var(--t1)!important}
${S} .screen h2,${S} .screen h3{font-family:${R};font-weight:800!important;letter-spacing:-.015em}
${S} .hk-c b,${S} .hk-eat b,${S} .mtile b,${S} .grid3 .stat b,${S} .ko-ring b,${S} .ko-kp b,${S} .mbp b{font-family:${R};font-weight:900!important;letter-spacing:-.03em}
${S} .pfx-gt,${S} .screen>.muted,${S} .screen>p.small,${S} .fwdk-h span,${S} .dc>h3+span{color:var(--tbg)!important}
${S} .screen>.muted,${S} .screen>p.small{opacity:.75}

/* hlavička Dnes: dátum ako biela nálepka, kalendár žltý, séria ako natočený žltý štítok */
${S} .tdh-cal,${S} .tdh-s{background:var(--gl)!important;border:0!important;box-shadow:${HARD('var(--sh)', 4)}!important}
${S} .tdh-cal .cal-ic{background:var(--yel)!important;box-shadow:0 2px 0 var(--yel-e)!important}
${S} .tdh-cal .cal-ic b{color:#201A3D!important}
${S} .tdh-streak{background:var(--yel)!important;border:0!important;color:#201A3D!important;box-shadow:${HARD('var(--yel-e)', 3)}!important;transform:rotate(3deg);font-weight:900}
${S} .tdh-streak *{color:#201A3D!important}

/* týždeň: splnený deň je žltá gulička, dnešok tmavá nálepka */
${S} .wk-d.hit .wk-r::before{background:var(--yel)!important;box-shadow:0 3px 0 var(--yel-e)!important}
${S} .wk-d.hit .wk-r b{color:#201A3D!important}
${S} .wk-d.now{background:var(--ink)!important;border-radius:16px;box-shadow:${HARD('var(--sh-d)', 3)}!important}
${D} .wk-d.now{background:var(--yel)!important;box-shadow:${HARD('rgba(0,0,0,.5)', 3)}!important}
${S} .wk-d.now .wk-l{color:var(--yel)!important}${S} .wk-d.now .wk-r b{color:#fff!important}
${D} .wk-d.now .wk-l,${D} .wk-d.now .wk-r b{color:#201A3D!important}
${S} .wk-d .wk-l{font-weight:800!important}

/* kruh kalórií: prstenec z farebných dielikov (kreslí ho skin.js podľa vzhľadu) */
${S} .hero-k{background:var(--gl-hero)!important}
${S} .ck-ring .st-back{fill:var(--paper)}${S} .ck-ring .st-back-sh{fill:var(--sh)}
${S} .ck-ring .st-track{stroke:var(--track)}${D} .ck-ring .st-track{stroke:#3B3463}
${S} .hk-c b{font-size:44px!important;color:var(--t1)!important}
${S} .hk-pc{${solid('yel')};border:0!important;font-weight:900!important;transform:rotate(-3deg);font-style:normal}
${S} .hero-k.over .hk-pc{${solid('cor')}}
${S} .hk-edit{background:var(--ink)!important;color:var(--yel)!important;border:0!important;box-shadow:${HARD('var(--sh-d)', 3)}!important;font-weight:800}
${D} .hk-edit{background:var(--yel)!important;color:#201A3D!important}

/* jedlá dňa pod kruhom: prázdne sú tiché, zjedené sú sýte nálepky svojej farby */
${S} .mbp{background:var(--gl-in)!important;border:0!important;box-shadow:none!important;color:var(--t3)!important}
${S} .mbp.on{background:color-mix(in srgb,var(--mc) 38%,#fff)!important;box-shadow:${HARD('color-mix(in srgb,var(--mc) 75%,#fff)', 3)}!important;color:#201A3D!important}
${S} .mbp.on *{color:#201A3D!important}
${D} .mbp.on{background:color-mix(in srgb,var(--mc) 55%,#fff)!important;box-shadow:${HARD('rgba(0,0,0,.4)', 3)}!important}
${S} .mbp.on::after{box-shadow:none!important}

/* makrá: tri pastelové nálepky s farebným tieňom */
${S} .hk-macros .mtile:nth-child(1),${S} .grid3 .stat:nth-child(1){${tint('pro')}}
${S} .hk-macros .mtile:nth-child(2),${S} .grid3 .stat:nth-child(2){${tint('car')}}
${S} .hk-macros .mtile:nth-child(3),${S} .grid3 .stat:nth-child(3){${tint('fat')}}
${S} .mt-b{background:rgba(255,255,255,.7)!important;box-shadow:none!important;height:10px!important;border-radius:6px!important}
${D} .mt-b{background:rgba(0,0,0,.3)!important}
${S} .mt-b i{border-radius:6px!important;box-shadow:none!important}
${S} .grid3 .stat::before{width:22px!important;height:6px!important;border-radius:4px!important;box-shadow:none!important}

/* tlačidlá: biele alebo žlté nálepky, pri stlačení sa pritlačia k papieru */
${S} .btn{border:0!important;background:var(--gl)!important;color:var(--t1)!important;box-shadow:${HARD('var(--sh)', 4)}!important;font-weight:800;transition:transform .08s,box-shadow .08s}
${D} .btn{background:var(--card-2)!important}
${S} .btn.primary{${solid('yel')}}
${S} .btn.danger{${solid('cor')}}
${S} .btn:active,${S} .fnq-cta:active,${S} .qa-b:active,${S} .gs-btn:active,${S} .tile:active,${S} .pfx-tiles>*:active{transform:translate(3px,3px)!important;box-shadow:1px 1px 0 var(--sh)!important}
${S} .btn.primary:active,${S} .fnq-cta:active{box-shadow:1px 1px 0 var(--yel-e)!important}
${S} .qa-fab:active{transform:translate(2px,2px)!important}
${S} .ml-add{border:0!important;background:var(--yel)!important;color:#201A3D!important;box-shadow:0 3px 0 var(--yel-e)!important}
${S} .chip,${S} .pill{border:0!important}

/* prepínače: vybraná voľba je vystúpená biela nálepka */
${S} .seg,${S} .pg-per{background:var(--well)!important;border:0!important;box-shadow:none!important}
${S} .seg .on,${S} .seg button.on,${S} .seg a.on,${S} .pg-per button.on{background:var(--seg-on)!important;color:var(--t1)!important;box-shadow:${HARD('var(--sh)', 3)}!important}
${S} .seg .on *,${S} .pg-per button.on *{color:var(--t1)!important}
${S} .pgx-per::before{background:var(--seg-on)!important;box-shadow:${HARD('var(--sh)', 3)}!important}
${S} #mealseg button.on{background:color-mix(in srgb,var(--mc) 38%,#fff)!important;color:#201A3D!important;box-shadow:${HARD('color-mix(in srgb,var(--mc) 75%,#fff)', 3)}!important}
${D} #mealseg button.on{background:color-mix(in srgb,var(--mc) 55%,#fff)!important;box-shadow:${HARD('rgba(0,0,0,.4)', 3)}!important}
${S} #mealseg button.on *{color:#201A3D!important}
${S} .lvl button{border:0!important;box-shadow:${HARD('var(--sh)', 4)}!important}
${S} .lvl button.on,${D} .lvl button.on{${solid('yel')};border:0!important}
${S} .lvl button.on *,${S} .lvl button.on small,${S} .lvl button.on .lv-t small{color:#201A3D!important}
${S} .lvl button.on .lv-ic{background:#201A3D!important;color:var(--yel)!important}

/* Jedlo: rýchle dlaždice, každá je iná pastelová nálepka, „Nové“ je natočený žltý štítok */
${S} .qa-b{border:0!important;font-weight:800!important;transition:transform .08s,box-shadow .08s}
${S} .qa-b:nth-child(4n+1){${tint('pro')}}${S} .qa-b:nth-child(4n+2){${tint('fat')}}${S} .qa-b:nth-child(4n+3){${tint('car')}}${S} .qa-b:nth-child(4n+4){${tint('vio')}}
${S} .qa-b b{color:var(--t1)!important}
${S} .qk-b:nth-child(4n+1){${tint('car')}}${S} .qk-b:nth-child(4n+2){${tint('fat')}}${S} .qk-b:nth-child(4n+3){${tint('pro')}}${S} .qk-b:nth-child(4n+4){${tint('vio')}}
${S} .qk-b span,${S} .qk-b b{color:var(--t1)!important;font-weight:800!important}
${S} .ms-entry em,${S} .frg-entry em,${S} .frg-entry>em,${S} .ms-entry>em{${solid('yel')};transform:rotate(-6deg);border-radius:10px!important;font-weight:900!important;box-shadow:2px 2px 0 var(--yel-e)!important}
${S} .ai-box{border:0!important;box-shadow:${HARD('var(--sh)')}!important;background:var(--gl)!important}
${S} .screen:has(#mealseg) .ai-box::before,${S} .screen:has(#mealseg) .ai-box::after{display:none!important}

/* Profil: hrdina ako biela nálepka, dlaždice v štyroch farbách, karta plánu žltá */
${S} .pfx-tiles>*:nth-child(1){${tint('car')}}${S} .pfx-tiles>*:nth-child(2){${tint('pro')}}${S} .pfx-tiles>*:nth-child(3){${tint('fat')}}${S} .pfx-tiles>*:nth-child(4){${tint('vio')}}
${S} .pfx-chip.lv{background:var(--yel)!important;color:#201A3D!important}
${S} .pfx-chip.fire{background:var(--cor)!important;color:#201A3D!important}
${S} .pfx-chip.fire *{color:#201A3D!important}
${S} .pfx-plan{${tint('yel')}}
${S} .pfx-xb{background:rgba(32,26,61,.1)!important}${D} .pfx-xb{background:rgba(0,0,0,.3)!important}
${S} .pfx-xb i{background:var(--yel)!important}
${S} .pfx-s{background:var(--gl)!important;border:0!important;box-shadow:${HARD('var(--sh)', 4)}!important}
${S} .gt-sub{border:0!important;background:var(--gl)!important;box-shadow:${HARD('var(--sh)', 4)}!important}
${S} .gt-sub i{background:var(--yel)!important;color:#201A3D!important}

/* tréneri a správy */
${S} .tr-perks,${S} .tr-card,${S} .tr-join.card,${S} .tr-req,${S} .tr-code,${S} .ah-demo{background:var(--gl)!important;border:0!important;box-shadow:var(--gl-sh)!important}
${S} .tr-perks>div+div{border-left-color:var(--line)!important}
${S} .tr-chip,${S} .pm-q button{background:var(--gl)!important;border:0!important;box-shadow:${HARD('var(--sh)', 3)}!important;color:var(--t1)!important;font-weight:800}
${S} .tr-chip.on{${solid('yel')}}
${S} .tr-emp{background:var(--gl-in)!important;border:2px dashed var(--edge)!important;box-shadow:none!important}
${S} .tr-tag{background:var(--gl-in)!important;box-shadow:none!important;color:var(--t2)!important}
${S} .tr-bub,${S} .pm-i{border:0!important;box-shadow:${HARD('var(--sh)', 3)}!important}
${S} .tr-bub.me{${solid('yel')}}
${S} .tr-bub.me small{color:#5E4300!important}

/* prihlásenie */
${S} .seg:has(+#authf)::before{background:var(--seg-on)!important;box-shadow:${HARD('var(--sh)', 3)}!important}
${S} .seg:has(+#authf) button.on{background:transparent!important;box-shadow:none!important}
${S} .gs-btn.gs-btn.gs-btn{background:#FFFFFF!important;color:#1F1F1F!important;border:0!important;box-shadow:${HARD('var(--sh)', 4)}!important;font-weight:800!important}
${D} .gs-btn.gs-btn.gs-btn{background:#2F2856!important;color:#F3EFFF!important}

/* polia: vpadnuté lila jamky, pri písaní žltý rámik */
${S} textarea,${S} .input{background-color:var(--well)!important;border:0!important;box-shadow:none!important;border-radius:16px;color:var(--t1)!important}
${S} textarea:focus,${S} .input:focus{box-shadow:inset 0 0 0 2.5px var(--yel)!important;outline:none}

/* spodná lišta: biela nálepka, aktívna položka je tmavý štvorček so žltou ikonou */
${S} .nav{background:var(--gl)!important;border:0!important;box-shadow:${HARD('var(--sh-d)', 5)}!important}
${D} .nav{background:#262047!important}
${S} .nav a{color:var(--t3)!important}
${S} .nav a.on{color:var(--t1)!important}
${S} .nav a.on .ic{background:var(--ink)!important;color:var(--yel)!important;box-shadow:2px 2px 0 var(--sh-d)!important;border-radius:12px!important}
${S} .nav a.on .ic svg{color:var(--yel)!important}
${D} .nav a.on .ic{background:var(--yel)!important;color:#201A3D!important}
${D} .nav a.on .ic svg{color:#201A3D!important}
${S} .qa-fab{background:var(--yel)!important;border:0!important;color:#201A3D!important;box-shadow:${HARD('var(--yel-e)', 5)},12px 14px 24px -12px var(--sh-d)!important}
${S} .qa-fab svg{color:#201A3D!important;stroke:#201A3D!important}
${S} .bd-fab{box-shadow:${HARD('var(--sh-d)', 4)}!important}

/* plusko */
${S} .qa-ov{background:var(--bg1),var(--bg2),var(--bg3),var(--bg4)!important}
${S} .qa-in .qa-m{background:color-mix(in srgb,var(--c,#FFC83D) 28%,var(--paper))!important;border:0!important;box-shadow:${HARD('color-mix(in srgb,var(--c,#FFC83D) 55%,var(--sh))', 4)}!important}
${S} .qa-in .fq,${S} .qa-in .qa-w,${S} .qa-in .qa-t:not(.qa-hero .qa-t){border:0!important;box-shadow:var(--gl-sh)!important}
${S} .qa-hero{background:color-mix(in srgb,var(--g1,#FFC83D) 42%,#fff)!important;color:#201A3D!important;border:0!important;box-shadow:${HARD('color-mix(in srgb,var(--g2,#FFC83D) 70%,#201A3D)', 6)}!important}
${S} .qa-hero::before,${S} .qa-hero::after{display:none!important}
${S} .qa-hero h2,${S} .qa-hero p{color:#201A3D!important}
${S} .qa-hero .qa-acts button{background:#fff!important;color:#201A3D!important;border:0!important;box-shadow:${HARD('var(--sh)', 3)}!important;font-weight:800}
${D} .qa-in .qa-m{background:color-mix(in srgb,var(--c,#FFC83D) 48%,#fff)!important;color:#201A3D!important;box-shadow:${HARD('rgba(0,0,0,.45)', 4)}!important}
${D} .qa-in .qa-m *{color:#201A3D!important}

/* grafy: levanduľová čiara, žltý štítok */
${S} svg.chart .trend{stroke:var(--wc-line)!important;filter:none!important}
${S} svg.chart .ck-area{fill:var(--wc-area)!important;opacity:.3}
${S} svg.chart .ck-end{stroke:var(--wc-line)!important;filter:none!important}
${S} svg.chart.wchart .raw{fill:var(--t3)!important;stroke:none!important;opacity:.35!important}
${S} svg.chart.wchart .wc-tag rect{filter:drop-shadow(2px 2px 0 var(--yel-e))}
${S} .pgx-line{stroke:var(--wc-line)!important;filter:none!important}
${S} .pgx-area{fill:var(--wc-area)!important;opacity:.3}
${S} .pgx-proj{stroke:var(--wc-line)!important}
${S} .pgx-rings,${S} .pgx-chart{--accent:#8460E6}
${D} .pgx-rings,${D} .pgx-chart{--accent:#B79CFF}

/* úvod a dotazník: biele nálepky, vybraná je žltá */
${S} .fnq-o,${S} .fnq-feats>div,${S} .fnq-nf,${S} .fnq-bigin label,${S} .fnq-yrs button,${S} .fnq-week i{border:0!important;box-shadow:${HARD('var(--sh)', 4)}!important}
${S} .fnq-o[aria-checked=true]{${solid('yel')}}
${S} .fnq-o.v2[aria-checked=true]{background:color-mix(in srgb,var(--c) 75%,#fff)!important;box-shadow:${HARD('color-mix(in srgb,var(--c) 70%,#201A3D)', 4)}!important}
${S} .fnq-o[aria-checked=true] *{color:#201A3D!important}
${S} .fnq-o .ic,${S} .fnq-feats .fi{background:var(--ink)!important;color:var(--yel)!important;box-shadow:none!important}
${D} .fnq-o .ic,${D} .fnq-feats .fi{background:var(--yel)!important;color:#201A3D!important}
${S} .fnq-feats>div:nth-child(6n+1){${tint('yel')}}${S} .fnq-feats>div:nth-child(6n+2){${tint('car')}}${S} .fnq-feats>div:nth-child(6n+3){${tint('red')}}${S} .fnq-feats>div:nth-child(6n+4){${tint('pro')}}${S} .fnq-feats>div:nth-child(6n+5){${tint('vio')}}${S} .fnq-feats>div:nth-child(6n+6){${tint('fat')}}
${S} .fnq-week i.on{background:var(--yel)!important;color:#201A3D!important}
${S} .fnq-cta{${solid('yel')};border:0!important;box-shadow:${HARD('var(--yel-e)', 5)}!important;font-weight:900!important}
${S} .fnq-bar{background:var(--well)!important;box-shadow:none!important}
${S} .fnq-bar i,${S} .fnq-bar b,${S} .fnq-bar>*{background:var(--yel)!important}

/* nadpisy ako nálepkový text so žltým posunutým tieňom */
${S} .screen h1,${S} .tdh-g{text-shadow:3px 3px 0 var(--yel)}
${D} .screen h1,${D} .tdh-g{text-shadow:3px 3px 0 rgba(255,200,61,.55)}
/* týždeň: každý deň je malá okrúhla nálepka */
${S} .wk-d:not(.hit):not(.now) .wk-r::before{content:'';position:absolute;inset:3px;border-radius:50%;z-index:0;background:var(--paper);box-shadow:2px 2px 0 var(--sh)}
${S} .wk-d.hit .wk-r::before{inset:3px!important;box-shadow:2px 2px 0 var(--yel-e)!important}
${S} .wk-d.now:not(.hit) .wk-r::before{box-shadow:none!important}
${S} .wk-d .wk-r svg{z-index:1}
${S} .wk-d.sel{background:none!important;box-shadow:none!important}
${S} .wk-d.sel.now{background:var(--ink)!important}${D} .wk-d.sel.now{background:var(--yel)!important}
/* makrá: pásik s pruhmi ako cukríková tyčinka */
${S} .mt-b i{background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.3) 0 5px,transparent 5px 10px)!important;box-shadow:none!important}
/* karty: tenký svetlý lem hore, ako lesk nálepky */
${S} .card,${S} .pg-card,${S} .tile,${S} .hero-k,${S} .pfx-hero{background-image:linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,0) 18px)!important}
${D} .card,${D} .pg-card,${D} .tile,${D} .hero-k,${D} .pfx-hero{background-image:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,0) 18px)!important}

/* Upraviť Dnes */
${S} .tde-r{border:0!important}
${S} .td-editlink{border:0!important;box-shadow:${HARD('var(--sh)', 3)}!important;background:var(--gl)!important}

/* Tréning: vybraná oblasť tela (tmavý režim) */
${D} #mseg button.on,${D} #mseg button.on *{color:var(--t1)!important}

/* Klienti (tréner) */
${S}:not([data-theme=dark]) .ko-c.warn .ko-id span{color:#7A4D00!important;background:#FFE7A3!important}

/* predplatné */
${S} .pw-hero{background:var(--gl)!important;border:0!important;box-shadow:var(--gl-sh2)!important}
${S} .pw-tag,${S} .pw-go,${S} .pw-plan .bd{${solid('yel')};border:0!important}
${S} .pw-plan{border-color:transparent!important;box-shadow:${HARD('var(--sh)', 4)}!important}
${S} .pw-plan[aria-checked=true]{${tint('yel')}}
${S} .pw-ben i{border:0!important;box-shadow:${HARD('var(--sh)', 3)}!important}
`;

// Kruh kalórií ako nálepka: hrubý žltý prstenec s tvrdým tieňom (ako vystrihnutá nálepka), ktorý sa plní tým, čo zješ.
// Na konci prstenca sedí malá nálepka smajlíka a putuje s ním. Výraz sa mení: na prázdno hladný, v polovici spokojný,
// pri cieli šťastný s lícami, po prekročení cieľa prejedený (prstenec sčervená). Číslo kalórií ostáva v strede.
const P = (r, a) => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)];
const f1 = v => v.toFixed(2);
let uid = 0;
function face(k, over) {
  // tvár: žltá nálepka s bielym lemom a tieňom; oči, ústa, líca podľa stavu
  const mouth = over ? `<path d="M-3.2,2.2q3.2,-2.4 6.4,0" fill="none" stroke="#5A3A00" stroke-width="1.1" stroke-linecap="round"/><path d="M-1.2,2.9q1.6,2.6 3.2,0.4" fill="#FF6B85"/>`
    : k < 0.3 ? `<path d="M-2.8,2.4h5.6" fill="none" stroke="#5A3A00" stroke-width="1.1" stroke-linecap="round"/>`
    : k < 0.7 ? `<path d="M-3,1.4q3,3.2 6,0" fill="none" stroke="#5A3A00" stroke-width="1.1" stroke-linecap="round"/>`
    : `<path d="M-3.4,0.9q3.4,5 6.8,0z" fill="#5A3A00"/><path d="M-1.6,2.6q1.6,1.6 3.2,0" fill="#FF8AA0"/>`;
  const eyes = over ? `<path d="M-3.6,-2.4l2,2m0,-2l-2,2M1.6,-2.4l2,2m0,-2l-2,2" fill="none" stroke="#5A3A00" stroke-width="1" stroke-linecap="round"/>`
    : k >= 0.7 ? `<path d="M-3.8,-1.2q1.3,-2.2 2.6,0M1.2,-1.2q1.3,-2.2 2.6,0" fill="none" stroke="#5A3A00" stroke-width="1.1" stroke-linecap="round"/>`
    : `<circle cx="-2.5" cy="-1.4" r=".95" fill="#5A3A00"/><circle cx="2.5" cy="-1.4" r=".95" fill="#5A3A00"/>`;
  const cheeks = k >= 0.7 || over ? `<circle cx="-4.6" cy="1" r="1.3" fill="#FF8AA0" opacity=".7"/><circle cx="4.6" cy="1" r="1.3" fill="#FF8AA0" opacity=".7"/>` : '';
  const star = (x, y, r, c) => `<path transform="translate(${x} ${y}) scale(${r})" d="M0,-1L.28,-.3 1,-.2 .45,.3 .6,1 0,.62 -.6,1 -.45,.3 -1,-.2 -.28,-.3Z" fill="${c}"/>`;
  const spark = k >= 0.999 && !over ? star(-11.5, -6, 2.4, '#FFC83D') + star(11, -8.5, 1.8, '#FF6B85') + star(9.5, 8, 1.5, '#4FE3B0') : '';
  return `<g transform="scale(1.12)"><circle r="8.6" fill="#201A3D" opacity=".2" cx="1.2" cy="1.4"/><circle r="8.6" fill="#fff"/><circle r="7.2" fill="${over ? '#FF9DAE' : '#FFC83D'}"/><circle r="7.2" fill="url(#stf)"/>${eyes}${mouth}${cheeks}</g>${spark}`;
}
export function stickerRingSvg(pct) {
  const k = Math.max(0, Math.min(1, pct / 100)), over = pct > 100.4, id = 'st' + (++uid);
  const R = 39.5, W = 9.5, a0 = -90, a1 = -90 + k * 360, full = k >= 0.999;
  const arc = (r, b0, b1) => { if (b1 - b0 >= 359.9) return `M${f1(r)},0A${r},${r} 0 1,1 ${f1(-r)},0A${r},${r} 0 1,1 ${f1(r)},0`; const [x0, y0] = P(r, b0), [x1, y1] = P(r, b1); return `M${f1(x0)},${f1(y0)}A${r},${r} 0 ${b1 - b0 > 180 ? 1 : 0},1 ${f1(x1)},${f1(y1)}`; };
  const col = over ? '#FF6B85' : '#FFC83D', colE = over ? '#C9405C' : '#D99E00';
  const [kx, ky] = P(R, full ? a0 : a1);
  const prog = k > 0.004 ? `<path d="${arc(R, a0, full ? a0 + 359.95 : a1)}" fill="none" stroke="${colE}" stroke-width="${W}" stroke-linecap="round" transform="translate(1.6 1.8)"/>
  <path d="${arc(R, a0, full ? a0 + 359.95 : a1)}" fill="none" stroke="${col}" stroke-width="${W}" stroke-linecap="round"/>
  <path d="${arc(R + 2.4, a0, full ? a0 + 359.95 : a1)}" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" opacity=".55"/>` : '';
  return `<svg class="ck-ring st-ring" viewBox="-50 -50 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="stf" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <circle class="st-back-sh" cx="2.6" cy="2.8" r="47.4"/>
  <circle class="st-back" r="47.4"/>
  <path d="${arc(R, 0, 359.95)}" class="st-track" fill="none" stroke-width="${W}" stroke-linecap="round"/>
  ${prog}
  <g transform="translate(${f1(kx)} ${f1(ky)})">${face(k, over)}</g>
 </svg>`;
}

export const stickerCss = RULES => {
  const S = 'html[data-skin=sticker]:root', D = 'html[data-skin=sticker][data-theme=dark]:root';
  return VARS(S, D) + RULES(S, D) + EXTRA(S, D);
};
export const STICKER_META = { light: '#F1ECFF', dark: '#17132B' };
// zaoblené písmo pre zariadenia bez SF Rounded (Android, počítač); na iPhone sa použije systémové
export const STICKER_FONT = 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap';
