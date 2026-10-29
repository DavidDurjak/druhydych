// Vzhľad „Nálepky“: appka ako zošit s nálepkami. Každá karta je nálepka s hrubým obrysom a tvrdým posunutým tieňom,
// pozadie je farebný gradient z ikony s jemným rastrom bodiek ako na tlačenom papieri, čísla a nadpisy sú hrubé šikmé.
// Tlačidlá sa pri stlačení „zatlačia“ do papiera (tieň zmizne). Tmavá verzia: nálepky na tmavom papieri so svetlým obrysom.
// Pravidlá obrazoviek sú spoločné s Farebným vzhľadom (RULES zo skin.js), tu sú len farby a to, čím sa Nálepky líšia.

const INK = '#0D1117';
const VARS = (S, D) => `
${S}{--bg:#EEFBF6;--bg-2:#E3F6EF;--card:#FFFFFF;--card-2:#F2FBF7;--line:rgba(13,17,23,.14);--text:${INK};--muted:#4A5560;
 --accent:#0E8F5C;--accent-ink:#FFFFFF;--accent-2:#C2410C;--protein:#16A86A;--carbs:#2878D8;--fat:#D08A3E;--danger:#D92D4A;--track:#E2ECE9;
 --ck-grad:linear-gradient(135deg,#7CFFB2 0%,#3EE6D0 55%,#5BB8FF 100%);
 --t1:${INK};--t2:#26313B;--t3:#4A5560;--tbg:${INK};--ink:${INK};
 --o:${INK};--o-w:2.5px;--st:4px 4px 0 ${INK};--st2:6px 6px 0 ${INK};--st-s:2px 2px 0 ${INK};--paper:#FFFFFF;--paper-2:#F3FBF8;
 --gl:#FFFFFF;--gl-in:#F3FBF8;--gl-hero:#FFFFFF;--gl-soft:#FFFFFF;--gl-b:2.5px solid ${INK};
 --gl-sh:4px 4px 0 ${INK};--gl-sh2:6px 6px 0 ${INK};--gl-shin:none;
 --well:#E7F2EF;--well-sh:inset 0 0 0 2px ${INK};--seg-on:${INK};--seg-on-sh:none;
 --mixb:#FFFFFF;--warm:#FFF1DC;--streak:#FFF1DC;--streak-t:#C2410C;
 --dk:${INK};--dk-b:${INK};--pri:#7CFFB2;--pri-t:${INK};--pos:#0E8F5C;--tde:#F3FBF8;
 --p-pro:#DDFBEA;--p-car:#E1EEFF;--p-fat:#FFEEDA;
 --bgc:#63E4D4;--bg1:radial-gradient(rgba(13,17,23,.075) 1.1px,transparent 1.5px) 0 0/15px 15px;--bg2:radial-gradient(70% 40% at 0% 0%,rgba(255,255,255,.6),rgba(255,255,255,0) 65%);
 --bg3:radial-gradient(90% 50% at 100% 105%,rgba(70,120,255,.28),rgba(70,120,255,0) 65%);--bg4:linear-gradient(165deg,#A2FFCF 0%,#5EEBD9 48%,#70C4FF 100%);
 --ctr:#FFFFFF;--ctr2:#F3FBF8;--raw:#FFFFFF;color-scheme:light}
${D}{--bg:#121A24;--bg-2:#17202C;--card:#19232F;--card-2:#202C3A;--line:rgba(234,255,246,.14);--text:#F1FFF8;--muted:#A3B1BE;
 --accent:#7CFFB2;--accent-ink:${INK};--accent-2:#FFB45E;--protein:#5BE3A0;--carbs:#6BB0FF;--fat:#F2B26B;--danger:#FF6B80;--track:rgba(255,255,255,.1);
 --t1:#F1FFF8;--t2:#CAD6DF;--t3:#A3B1BE;--tbg:#F1FFF8;
 --o:#E6FFF3;--st:4px 4px 0 #000;--st2:6px 6px 0 #000;--st-s:2px 2px 0 #000;--paper:#19232F;--paper-2:#202C3A;
 --gl:#19232F;--gl-in:#202C3A;--gl-hero:#19232F;--gl-soft:#202C3A;--gl-b:2.5px solid #E6FFF3;
 --gl-sh:4px 4px 0 #000;--gl-sh2:6px 6px 0 #000;--gl-shin:none;
 --well:#0E151E;--well-sh:inset 0 0 0 2px #E6FFF3;--seg-on:#7CFFB2;--seg-on-sh:none;
 --mixb:#19232F;--warm:#2C2418;--streak:#2C2418;--streak-t:#FFB45E;
 --dk:#19232F;--dk-b:#E6FFF3;--pri:#7CFFB2;--pri-t:${INK};--pos:#7CFFB2;--tde:#121A24;
 --p-pro:#183327;--p-car:#172A40;--p-fat:#34281A;
 --bgc:#0C121A;--bg1:radial-gradient(rgba(255,255,255,.055) 1.1px,transparent 1.5px) 0 0/15px 15px;--bg2:radial-gradient(70% 40% at 0% 0%,rgba(124,255,178,.14),rgba(124,255,178,0) 65%);
 --bg3:radial-gradient(90% 50% at 100% 105%,rgba(91,184,255,.18),rgba(91,184,255,0) 65%);--bg4:linear-gradient(165deg,#0F1F1D 0%,#0D1520 50%,#111733 100%);
 --ctr:#19232F;--ctr2:#202C3A;--raw:#19232F;color-scheme:dark}`;

const EXTRA = (S, D) => `
/* nálepky nemajú sklo: žiadne rozmazanie (aj rýchlejšie na starších telefónoch) */
${S} #app *,${S} .sheet-bg *,${S} .qa-ov,${S} .tde-s,${S} .nav{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
${S} .hero-k,${S} .pfx-hero{border-width:3px!important;border-radius:30px!important}
${S} .ck-c.ck-in{border-width:2px!important;box-shadow:none!important}

/* písmo: hrubé šikmé nadpisy a čísla, ako na nálepke */
${S} .screen h1,${S} .tdh-g,${S} .qa-h,${S} .fnq h1{font-family:'Inter','Sora',system-ui,sans-serif;font-weight:900!important;font-style:italic!important;letter-spacing:-.04em}
${S} .hk-c b,${S} .hk-eat b,${S} .mtile b,${S} .grid3 .stat b,${S} .ko-ring b,${S} .ko-kp b{font-weight:900!important;font-style:italic!important;letter-spacing:-.045em}

/* text priamo na pozadí: atrament, nie sivá */
${S} .screen>.muted,${S} .screen>p.small,${S} .pfx-gt,${S} .fwdk-h span{color:var(--tbg)!important;opacity:.82}

/* hlavička Dnes: malé nálepky, séria trochu nakrivo */
${S} .tdh-cal,${S} .tdh-s{border:2px solid var(--o)!important;box-shadow:var(--st-s)!important}
${S} .tdh-streak{border:2px solid var(--o)!important;box-shadow:var(--st-s)!important;transform:rotate(3deg)}
${S} .tdh-cal .cal-ic{background:${INK}!important;box-shadow:none!important}
${D} .tdh-cal .cal-ic{background:#7CFFB2!important}${D} .tdh-cal .cal-ic b{color:${INK}!important}

/* týždeň */
${S} .wk-d.hit .wk-r::before{background:#7CFFB2!important;box-shadow:inset 0 0 0 2.5px ${INK}!important}
${S} .wk-d.now{background:${INK}!important;box-shadow:var(--st-s)!important}
${D} .wk-d.now{background:#7CFFB2!important;box-shadow:2px 2px 0 #000!important}
${D} .wk-d.now .wk-l,${D} .wk-d.now .wk-r b{color:${INK}!important}
${S} .wk-d .wk-l{font-weight:800!important}

/* sušienka: obrys a tvrdý tieň ako nálepka */
${S} .ck-ring{filter:drop-shadow(3px 3px 0 ${INK})}
${D} .ck-ring{filter:drop-shadow(3px 3px 0 #000)}
${S} .ck-ring .ck-trail{stroke:var(--t1)!important;opacity:.55!important}
${S} .hk-pc{background:#7CFFB2!important;border:2px solid ${INK}!important;box-shadow:2px 2px 0 ${INK}!important;transform:rotate(-3deg);font-weight:800!important}
${S} .hero-k.over .hk-pc{background:#FFC2C2!important}
${S} .hk-edit{background:${INK}!important;color:#7CFFB2!important;border:2px solid ${INK}!important;box-shadow:none!important}
${D} .hk-edit{background:#7CFFB2!important;color:${INK}!important}

/* jedlá dňa: prázdne čiarkované, zjedené vyplnené farbou jedla */
${S} .mbp{background:transparent!important;box-shadow:none!important;border:2px dashed var(--o)!important;color:var(--t1)!important;opacity:.85}
${S} .mbp.on{background:color-mix(in srgb,var(--mc) 30%,var(--paper))!important;border:2px solid var(--o)!important;box-shadow:var(--st-s)!important;opacity:1}
${S} .mbp.on::after{box-shadow:none!important}

/* makrá: tri farebné nálepky */
${S} .hk-macros .mtile:nth-child(1){background:var(--p-pro)!important}
${S} .hk-macros .mtile:nth-child(2){background:var(--p-car)!important}
${S} .hk-macros .mtile:nth-child(3){background:var(--p-fat)!important}
${S} .mt-b{background:var(--paper)!important;box-shadow:inset 0 0 0 2px var(--o)!important;height:10px!important}
${S} .mt-b i{box-shadow:inset 0 0 0 2px var(--o)}

/* tlačidlá: pri stlačení sa zatlačia */
${S} .btn{border:2px solid var(--o)!important;box-shadow:3px 3px 0 var(--o)!important;font-weight:800}
${D} .btn{box-shadow:3px 3px 0 #000!important}
${S} .btn:active,${S} .qa-fab:active,${S} .fnq-cta:active{transform:translate(3px,3px)!important;box-shadow:0 0 0 transparent!important}
${S} .btn.primary{background:#7CFFB2!important;color:${INK}!important;border-color:${INK}!important}
${D} .btn.primary{border-color:#E6FFF3!important}
${S} .ml-add{border:2px solid ${INK}!important;box-shadow:2px 2px 0 ${INK}!important}

/* prepínače: vybraná voľba je plná nálepka */
${S} .seg,${S} .pg-per{background:var(--paper)!important;box-shadow:inset 0 0 0 2px var(--o),3px 3px 0 var(--o)!important}
${D} .seg,${D} .pg-per{box-shadow:inset 0 0 0 2px var(--o),3px 3px 0 #000!important}
${S} .seg .on,${S} .seg button.on,${S} .seg a.on,${S} .pg-per button.on{background:${INK}!important;color:#7CFFB2!important}
${S} .seg .on *,${S} .pg-per button.on *{color:#7CFFB2!important}
${D} .seg .on,${D} .seg button.on,${D} .seg a.on,${D} .pg-per button.on{background:#7CFFB2!important;color:${INK}!important}
${D} .seg .on *,${D} .pg-per button.on *{color:${INK}!important}
${S} .pgx-per::before{background:${INK}!important}${S} .pgx-per button.on,${S} .pgx-per button.on *{color:#7CFFB2!important;background:transparent!important}
${D} .pgx-per::before{background:#7CFFB2!important}${D} .pgx-per button.on,${D} .pgx-per button.on *{color:${INK}!important}
${S} .lvl button.on{background:${INK}!important;color:#fff!important;border-color:${INK}!important;box-shadow:4px 4px 0 #3EE6D0!important}
${D} .lvl button.on{background:#7CFFB2!important;color:${INK}!important;border-color:#E6FFF3!important;box-shadow:4px 4px 0 #000!important}
${D} .lvl button.on small,${D} .lvl button.on .lv-t small{color:#1E3A2D!important}
${S} .chip,${S} .pill{border:2px solid var(--o)!important}

/* rýchle dlaždice (Jedlo) */
${S} .qa-b{border:2px solid var(--o)!important;box-shadow:var(--st-s)!important}
/* tréneri: výhody, filtre, karty a prázdny stav */
${S} .tr-perks,${S} .tr-card,${S} .tr-join.card,${S} .tr-req,${S} .tr-code{background:var(--paper)!important;border:2.5px solid var(--o)!important;box-shadow:var(--gl-sh)!important}
${S} .tr-perks>div+div{border-left-color:var(--line)!important}
${S} .tr-perks svg{stroke:var(--accent)!important}
${S} .tr-chip{background:var(--paper)!important;border:2px solid var(--o)!important;box-shadow:var(--st-s)!important;color:var(--t1)!important}
${S} .tr-chip.on{background:#7CFFB2!important;color:${INK}!important}
${S} .tr-emp{background:var(--paper)!important;border:2.5px dashed var(--o)!important;box-shadow:none!important}
${S} .tr-tag{background:var(--paper-2)!important;box-shadow:inset 0 0 0 1.5px var(--o)!important;color:var(--t1)!important}
${S} .tr-bub{border:2px solid var(--o)!important;box-shadow:var(--st-s)!important}
${S} .tr-bub.me{background:#7CFFB2!important;color:${INK}!important}
${S} .tr-bub.me small{color:#1E3A2D!important}
/* Správy: navrhované otázky */
${S} .pm-q button{background:var(--paper)!important;border:2px solid var(--o)!important;box-shadow:var(--st-s)!important;color:var(--t1)!important;font-weight:700}
${S} .pm-i{border:2px solid var(--o)!important;box-shadow:var(--st-s)!important}
/* prihlásenie: posuvný výber Prihlásiť sa / Registrovať a tlačidlo Google */
${S} .seg:has(+#authf)::before{background:${INK}!important;box-shadow:none!important}
${D} .seg:has(+#authf)::before{background:#7CFFB2!important}
${S} .seg:has(+#authf) button.on{background:transparent!important}
${S} .gs-btn.gs-btn.gs-btn{background:#FFFFFF!important;color:${INK}!important;border:2px solid ${INK}!important;box-shadow:3px 3px 0 ${INK}!important;font-weight:800!important}
${D} .gs-btn.gs-btn.gs-btn{border-color:#E6FFF3!important;box-shadow:3px 3px 0 #000!important}
${S} .gs-btn:active{transform:translate(3px,3px);box-shadow:none!important}
${S} .ah-demo{background:var(--paper)!important;border:2.5px solid var(--o)!important;box-shadow:var(--gl-sh)!important}
/* polia */
${S} textarea,${S} .input{background-color:var(--paper)!important;border:2px solid var(--o)!important;box-shadow:none!important;border-radius:14px}
${S} textarea:focus,${S} .input:focus{box-shadow:3px 3px 0 #3EE6D0!important;outline:none}

/* spodná lišta: biela nálepka, aktívna ikona mätová */
${S} .nav{background:var(--paper)!important;border:2.5px solid var(--o)!important;box-shadow:4px 4px 0 var(--o)!important}
${D} .nav{box-shadow:4px 4px 0 #000!important}
${S} .nav a{color:var(--t3)!important}
${S} .nav a.on{color:var(--t1)!important}
${S} .nav a.on .ic{background:#7CFFB2!important;color:${INK}!important;box-shadow:inset 0 0 0 2px ${INK}!important}
${S} .qa-fab{background:#7CFFB2!important;border:2.5px solid ${INK}!important;box-shadow:4px 4px 0 ${INK}!important}
${D} .qa-fab{border-color:#E6FFF3!important;box-shadow:4px 4px 0 #000!important}
${S} .bd-fab{border-radius:50%!important;box-shadow:0 0 0 2.5px var(--o),3px 3px 0 2.5px var(--o)!important}

/* plusko */
${S} .qa-ov{background:var(--bg1),var(--bg3),var(--bg4)!important}
${S} .qa-in .qa-m{background:color-mix(in srgb,var(--c,#7CFFB2) 30%,var(--paper))!important;border:2.5px solid var(--o)!important;box-shadow:var(--gl-sh)!important}
${S} .qa-hero{border:3px solid ${INK}!important;box-shadow:6px 6px 0 ${INK}!important}

/* štatistiky: farebné nálepky so štítkom */
${S} .grid3 .stat:nth-child(1){background:var(--p-pro)!important}
${S} .grid3 .stat:nth-child(2){background:var(--p-car)!important}
${S} .grid3 .stat:nth-child(3){background:var(--p-fat)!important}
${S} .grid3 .stat::before{width:22px!important;height:7px!important;border-radius:4px!important;box-shadow:inset 0 0 0 1.5px var(--o)!important}

/* grafy: atramentová čiara, biele body s obrysom */
${S} svg.chart .trend{stroke:var(--t1)!important;stroke-width:3.6!important;filter:none!important}
${D} svg.chart .trend{stroke:#7CFFB2!important}
${S} svg.chart .raw{stroke:var(--t1)!important;stroke-width:1.6!important}
${S} svg.chart .ck-end{stroke:var(--t1)!important;filter:none!important}
${S} .pgx-line{stroke:var(--t1)!important;filter:none!important}
${D} .pgx-line{stroke:#7CFFB2!important}
${S} .pgx-rings,${S} .pgx-chart{--accent:#16A86A}

/* úvod, dotazník a prihlásenie */
${S} .fnq-o,${S} .fnq-feats>div,${S} .fnq-nf,${S} .fnq-bigin label,${S} .fnq-yrs button,${S} .fnq-week i{box-shadow:var(--st-s)!important;border:2px solid var(--o)!important}
${S} .fnq-o[aria-checked=true]{background:#7CFFB2!important;color:${INK}!important;box-shadow:4px 4px 0 var(--o)!important}
${D} .fnq-o[aria-checked=true]{box-shadow:4px 4px 0 #000!important}
${S} .fnq-o[aria-checked=true] *{color:${INK}!important}
${S} .fnq-o.v2[aria-checked=true]{background:color-mix(in srgb,var(--c) 35%,var(--paper))!important;box-shadow:4px 4px 0 var(--o)!important}
${S} .fnq-o.v2[aria-checked=true] *{color:var(--t1)!important}
${S} .fnq-o .ic,${S} .fnq-feats .fi{background:#7CFFB2!important;color:${INK}!important;box-shadow:inset 0 0 0 2px ${INK}!important}
${S} .fnq-cta{background:#7CFFB2!important;color:${INK}!important;border:2.5px solid ${INK}!important;box-shadow:4px 4px 0 ${INK}!important;font-weight:900!important}
${D} .fnq-cta{border-color:#E6FFF3!important;box-shadow:4px 4px 0 #000!important}
${S} .fnq-bar{box-shadow:inset 0 0 0 2px var(--o)!important}

/* Klienti (tréner) */
${S}:not([data-theme=dark]) .ko-c.warn .ko-id span{color:#9A4F07!important;background:#FFE7C7!important}
`;

export const stickerCss = RULES => {
  const S = 'html[data-skin=sticker]', D = 'html[data-skin=sticker][data-theme=dark]';
  return VARS(S, D) + RULES(S, D) + EXTRA(S, D);
};
export const STICKER_META = { light: '#9BFFCB', dark: '#0C121A' };
