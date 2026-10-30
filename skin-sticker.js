// Vzhľad „Nálepky“ (v301, nanovo): hravé farebné nálepky ako v Duolingu. Žiadne čierne ani biele obrysy.
// Každá karta má vlastnú farbu a hrubší spodný okraj v tmavšom odtieni tej istej farby, takže vyzerá ako nálepka
// alebo tlačidlo, ktoré sa dá zatlačiť. Farby z klasického vzhľadu (makrá, časti dňa, ikony) ostávajú, len sú výraznejšie.
// Písmo je zaoblené (na iPhone systémové SF Rounded, inde Nunito). Tlačidlá sa pri stlačení zatlačia dole.
// Pravidlá obrazoviek sú spoločné s Farebným vzhľadom (RULES zo skin.js), tu sú farby a to, čím sa Nálepky líšia.

const R = `ui-rounded,'SF Pro Rounded','Nunito','Sora',system-ui,sans-serif`;
const VARS = (S, D) => `
${S}{--bg:#EAFBF4;--bg-2:#DDF5EC;--card:#FFFFFF;--card-2:#F3FBF8;--line:rgba(16,40,32,.10);--text:#10201B;--muted:#5B6B66;
 --accent:#11A267;--accent-ink:#FFFFFF;--accent-2:#E8590C;--protein:#16B06E;--carbs:#2F80E8;--fat:#E0952E;--danger:#E2405A;--track:#E3EEEA;
 --ck-grad:linear-gradient(135deg,#7CFFB2 0%,#3EE6D0 55%,#5BB8FF 100%);
 --t1:#10201B;--t2:#2B3B36;--t3:#5B6B66;--tbg:#10201B;
 --edge:#CFE2DB;--amb:rgba(18,90,72,.16);--paper:#FFFFFF;--paper-2:#F3FBF8;
 --gl:#FFFFFF;--gl-in:#F2FAF7;--gl-hero:#FFFFFF;--gl-soft:#FFFFFF;--gl-b:0 solid transparent;
 --gl-sh:0 4px 0 var(--edge),0 14px 26px -18px var(--amb);--gl-sh2:0 6px 0 var(--edge),0 20px 34px -20px var(--amb);--gl-shin:inset 0 2px 0 rgba(16,40,32,.05);
 --well:#E6F2EE;--well-sh:inset 0 2px 0 rgba(16,40,32,.06);--seg-on:#FFFFFF;--seg-on-sh:0 3px 0 var(--edge);
 --mixb:#FFFFFF;--warm:#FFF2DE;--streak:#FFE9CC;--streak-t:#C2560C;--streak-e:#F2C48C;
 --dk:#FFFFFF;--dk-b:transparent;--pri:#5BE9A6;--pri-e:#1FAE70;--pri-t:#0B2A1C;--pos:#0E9A5E;--tde:#EEF9F5;
 --p-pro:#DDF8E9;--p-pro-e:#A2E2C0;--p-car:#E1EDFF;--p-car-e:#AAC6F2;--p-fat:#FFEDD6;--p-fat-e:#F0C891;--p-vio:#EEE7FF;--p-vio-e:#C9B8F5;--p-red:#FFE4E6;--p-red-e:#F5B3BC;
 --bgc:#C6F6E4;--bg1:radial-gradient(rgba(16,60,48,.06) 1.2px,transparent 1.6px) 0 0/18px 18px;--bg2:radial-gradient(70% 45% at 0% 0%,rgba(255,255,255,.75),rgba(255,255,255,0) 65%);
 --bg3:radial-gradient(90% 55% at 100% 105%,rgba(120,170,255,.35),rgba(120,170,255,0) 65%);--bg4:linear-gradient(168deg,#D9FFEE 0%,#B6F2E5 46%,#C4E2FF 100%);
 --ctr:#FFFFFF;--ctr2:#F3FBF8;--raw:#FFFFFF;--plate0:#F5FCF9;--plate1:#E8F4F0;--plate2:#D9EAE4;--plate-r:rgba(16,60,48,.10);--arc0:#3EE6A0;--arc1:#2BB6F0;
 --wc-line:#11A267;--wc-area:#3EE6D0;--wc-glow:none;--wc-tag:#5BE9A6;--wc-tag-t:#0B2A1C;color-scheme:light}
${D}{--bg:#111922;--bg-2:#16202B;--card:#1B2531;--card-2:#222E3C;--line:rgba(230,255,245,.08);--text:#EFFAF5;--muted:#9AAAB6;
 --accent:#6CF0AE;--accent-ink:#0B2A1C;--accent-2:#FFB45E;--protein:#5BE3A0;--carbs:#6BB0FF;--fat:#F2B26B;--danger:#FF6B80;--track:rgba(255,255,255,.08);
 --t1:#EFFAF5;--t2:#C7D3DC;--t3:#9AAAB6;--tbg:#EFFAF5;
 --edge:#0A1017;--amb:rgba(0,0,0,.55);--paper:#1B2531;--paper-2:#222E3C;
 --gl:#1B2531;--gl-in:#16202B;--gl-hero:#1D2836;--gl-soft:#222E3C;
 --gl-shin:inset 0 2px 0 rgba(0,0,0,.25);
 --well:#121A23;--well-sh:inset 0 2px 0 rgba(0,0,0,.35);--seg-on:#2A3747;--seg-on-sh:0 3px 0 #0A1017;
 --mixb:#1B2531;--warm:#2E2617;--streak:#3A2A16;--streak-t:#FFB45E;--streak-e:#21170A;
 --dk:#1B2531;--pri:#5BE9A6;--pri-e:#178F5B;--pri-t:#0B2A1C;--pos:#6CF0AE;--tde:#111922;
 --p-pro:#153526;--p-pro-e:#0A1F15;--p-car:#152B45;--p-car-e:#0A182A;--p-fat:#3A2A16;--p-fat-e:#21170A;--p-vio:#2A2342;--p-vio-e:#171226;--p-red:#3A1A22;--p-red-e:#220D12;
 --bgc:#0D141C;--bg1:radial-gradient(rgba(255,255,255,.035) 1.2px,transparent 1.6px) 0 0/18px 18px;--bg2:radial-gradient(70% 45% at 0% 0%,rgba(108,240,174,.12),rgba(108,240,174,0) 65%);
 --bg3:radial-gradient(90% 55% at 100% 105%,rgba(107,176,255,.16),rgba(107,176,255,0) 65%);--bg4:linear-gradient(168deg,#0F2320 0%,#0E1722 50%,#151B36 100%);
 --ctr:#1D2836;--ctr2:#222E3C;--raw:#1B2531;--plate0:#18222E;--plate1:#131C26;--plate2:#0E151D;--plate-r:rgba(255,255,255,.06);--arc0:#6CF0AE;--arc1:#5BB8FF;
 --wc-line:#6CF0AE;--wc-area:#3EE6D0;--wc-glow:none;--wc-tag:#5BE9A6;--wc-tag-t:#0B2A1C;color-scheme:dark}`;

// farebná nálepka: pozadie + spodný okraj v tmavšom odtieni (n = pro, car, fat, vio, red)
const tint = n => `background:var(--p-${n})!important;box-shadow:0 4px 0 var(--p-${n}-e),0 14px 26px -18px var(--amb)!important`;

const EXTRA = (S, D) => `
/* nálepky nemajú sklo ani obrysy */
${S} #app *,${S} .sheet-bg *,${S} .qa-ov,${S} .tde-s,${S} .nav{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
${S} .card,${S} .mtile,${S} .ml,${S} .pg-card,${S} .tile,${S} .tip,${S} .shop-card,${S} .fr-card,${S} .rp-card,${S} .wc-card,${S} .qk-b,${S} .ci{border-radius:24px!important}
${S} .hero-k,${S} .pfx-hero{border-radius:32px!important}

/* zaoblené písmo ako na nálepke */
${S} body,${S} #app,${S} .sheet-bg,${S} .fnq,${S} .qa-ov{font-family:${R}}
${S} .screen h1,${S} .tdh-g,${S} .qa-h,${S} .fnq h1{font-family:${R};font-weight:900!important;letter-spacing:-.025em}
${S} .screen h2,${S} .screen h3{font-family:${R};font-weight:800!important;letter-spacing:-.01em}
${S} .hk-c b,${S} .hk-eat b,${S} .mtile b,${S} .grid3 .stat b,${S} .ko-ring b,${S} .ko-kp b,${S} .mbp b{font-family:${R};font-weight:900!important;letter-spacing:-.03em}
${S} .screen>.muted,${S} .screen>p.small,${S} .pfx-gt,${S} .fwdk-h span{color:var(--tbg)!important;opacity:.78}

/* hlavička Dnes */
${S} .tdh-cal,${S} .tdh-s{background:var(--gl)!important;border:0!important;box-shadow:0 3px 0 var(--edge)!important}
${S} .tdh-cal .cal-ic{background:linear-gradient(160deg,#5BE9A6,#2BC7B8)!important;box-shadow:0 2px 0 #1FAE70!important}
${S} .tdh-cal .cal-ic b{color:#0B2A1C!important}
${S} .tdh-streak{background:var(--streak)!important;border:0!important;color:var(--streak-t)!important;box-shadow:0 3px 0 var(--streak-e)!important}

/* týždeň: splnený deň je mätová gulička, dnešok tmavá pilulka */
${S} .wk-d.hit .wk-r::before{background:linear-gradient(160deg,#7CFFB2,#3EE6C0)!important;box-shadow:0 3px 0 #1FAE70!important}
${S} .wk-d.hit .wk-r b{color:#0B2A1C!important}
${S} .wk-d.now{background:#10201B!important;border-radius:18px;box-shadow:0 4px 0 #000!important}
${D} .wk-d.now{background:#2A3747!important;box-shadow:0 4px 0 #0A1017!important}
${S} .wk-d.now .wk-l{color:#7CFFB2!important}${S} .wk-d.now .wk-r b{color:#fff!important}
${S} .wk-d .wk-l{font-weight:800!important}

/* kruh kalórií: sušienka na tanieri */
${S} .hero-k{background:linear-gradient(180deg,#FFFFFF 0%,#F4FCF9 100%)!important}
${D} .hero-k{background:linear-gradient(180deg,#1F2B39 0%,#1A2430 100%)!important}
${S} .hk-pc{background:linear-gradient(135deg,#7CFFB2,#3EE6D0)!important;color:#0B2A1C!important;border:0!important;box-shadow:0 3px 0 #1FAE70!important;font-weight:900!important}
${S} .hero-k.over .hk-pc{background:linear-gradient(135deg,#FFD0D0,#FF9E9E)!important;box-shadow:0 3px 0 #D9576B!important}
${S} .hk-edit{background:#10201B!important;color:#7CFFB2!important;border:0!important;box-shadow:0 3px 0 #000!important}
${D} .hk-edit{background:#5BE9A6!important;color:#0B2A1C!important;box-shadow:0 3px 0 #178F5B!important}

/* jedlá dňa: prázdne sú tiché, zjedené majú farbu svojej časti dňa */
${S} .mbp{background:var(--gl-in)!important;border:0!important;box-shadow:0 3px 0 var(--edge)!important;color:var(--t3)!important}
${S} .mbp.on{background:color-mix(in srgb,var(--mc) 26%,var(--paper))!important;box-shadow:0 4px 0 color-mix(in srgb,var(--mc) 55%,var(--edge))!important;color:var(--t1)!important}
${D} .mbp.on{background:color-mix(in srgb,var(--mc) 30%,var(--paper))!important;box-shadow:0 4px 0 color-mix(in srgb,var(--mc) 30%,#000)!important}
${S} .mbp.on::after{box-shadow:none!important}

/* makrá: tri farebné nálepky, pásik ako koľajnička */
${S} .hk-macros .mtile:nth-child(1),${S} .grid3 .stat:nth-child(1){${tint('pro')}}
${S} .hk-macros .mtile:nth-child(2),${S} .grid3 .stat:nth-child(2){${tint('car')}}
${S} .hk-macros .mtile:nth-child(3),${S} .grid3 .stat:nth-child(3){${tint('fat')}}
${S} .mt-b{background:rgba(255,255,255,.75)!important;box-shadow:inset 0 2px 0 rgba(16,40,32,.08)!important;height:10px!important;border-radius:6px!important}
${D} .mt-b{background:rgba(0,0,0,.28)!important;box-shadow:inset 0 2px 0 rgba(0,0,0,.3)!important}
${S} .mt-b i{border-radius:6px!important;box-shadow:inset 0 -2px 0 rgba(0,0,0,.14)!important}
${S} .grid3 .stat::before{width:20px!important;height:6px!important;border-radius:4px!important;box-shadow:none!important}

/* tlačidlá: hrubší spodok, pri stlačení sa zatlačia */
${S} .btn{border:0!important;background:var(--gl)!important;color:var(--t1)!important;box-shadow:0 4px 0 var(--edge)!important;font-weight:800;transition:transform .08s,box-shadow .08s}
${D} .btn{background:var(--card-2)!important}
${S} .btn.primary{background:var(--pri)!important;color:var(--pri-t)!important;box-shadow:0 4px 0 var(--pri-e)!important}
${S} .btn:active,${S} .fnq-cta:active,${S} .qa-b:active,${S} .gs-btn:active{transform:translateY(3px)!important;box-shadow:0 1px 0 var(--edge)!important}
${S} .btn.primary:active,${S} .fnq-cta:active{box-shadow:0 1px 0 var(--pri-e)!important}
${S} .qa-fab:active{transform:translateY(3px)!important}
${S} .ml-add{border:0!important;box-shadow:0 3px 0 var(--edge)!important}
${S} .chip,${S} .pill{border:0!important}

/* prepínače: vybraná voľba je vystúpená nálepka */
${S} .seg,${S} .pg-per{background:var(--well)!important;border:0!important;box-shadow:var(--well-sh)!important}
${S} .seg .on,${S} .seg button.on,${S} .seg a.on,${S} .pg-per button.on{background:var(--seg-on)!important;color:var(--t1)!important;box-shadow:var(--seg-on-sh)!important}
${S} .seg .on *,${S} .pg-per button.on *{color:var(--t1)!important}
${S} .pgx-per::before{background:var(--seg-on)!important;box-shadow:var(--seg-on-sh)!important}
${S} #mealseg button.on{background:color-mix(in srgb,var(--mc) 30%,var(--paper))!important;color:var(--t1)!important;box-shadow:0 4px 0 color-mix(in srgb,var(--mc) 55%,var(--edge))!important}
${D} #mealseg button.on{box-shadow:0 4px 0 color-mix(in srgb,var(--mc) 30%,#000)!important}
${S} #mealseg button.on *{color:var(--t1)!important}
${S} .lvl button{border:0!important;box-shadow:0 4px 0 var(--edge)!important}
${S} .lvl button.on{background:var(--p-pro)!important;color:var(--t1)!important;box-shadow:0 4px 0 var(--pro-e,var(--p-pro-e)),0 0 0 2px #2FD38A inset!important}
${S} .lvl button.on small,${S} .lvl button.on .lv-t small{color:var(--t3)!important}

/* Jedlo: rýchle dlaždice, každá vo svojej farbe */
${S} .qa-b{border:0!important;font-weight:800!important;transition:transform .08s,box-shadow .08s}
${S} .qa-b:nth-child(4n+1){${tint('pro')}}${S} .qa-b:nth-child(4n+2){${tint('fat')}}${S} .qa-b:nth-child(4n+3){${tint('car')}}${S} .qa-b:nth-child(4n+4){${tint('vio')}}
${S} .qa-b b{color:var(--t1)!important}
${S} .qk-b:nth-child(4n+1){${tint('car')}}${S} .qk-b:nth-child(4n+2){${tint('fat')}}${S} .qk-b:nth-child(4n+3){${tint('pro')}}${S} .qk-b:nth-child(4n+4){${tint('vio')}}
${S} .qk-b span,${S} .qk-b b{color:var(--t1)!important;font-weight:800!important}

/* tréneri a správy */
${S} .tr-perks,${S} .tr-card,${S} .tr-join.card,${S} .tr-req,${S} .tr-code,${S} .ah-demo{background:var(--gl)!important;border:0!important;box-shadow:var(--gl-sh)!important}
${S} .tr-perks>div+div{border-left-color:var(--line)!important}
${S} .tr-chip,${S} .pm-q button{background:var(--gl)!important;border:0!important;box-shadow:0 3px 0 var(--edge)!important;color:var(--t1)!important;font-weight:800}
${S} .tr-chip.on{background:var(--pri)!important;color:var(--pri-t)!important;box-shadow:0 3px 0 var(--pri-e)!important}
${S} .tr-emp{background:var(--gl-in)!important;border:2px dashed var(--edge)!important;box-shadow:none!important}
${S} .tr-tag{background:var(--gl-in)!important;box-shadow:none!important;color:var(--t2)!important}
${S} .tr-bub,${S} .pm-i{border:0!important;box-shadow:0 3px 0 var(--edge)!important}
${S} .tr-bub.me{background:var(--pri)!important;color:var(--pri-t)!important;box-shadow:0 3px 0 var(--pri-e)!important}
${S} .tr-bub.me small{color:#1E4A33!important}

/* prihlásenie */
${S} .seg:has(+#authf)::before{background:var(--seg-on)!important;box-shadow:var(--seg-on-sh)!important}
${S} .seg:has(+#authf) button.on{background:transparent!important;box-shadow:none!important}
${S} .gs-btn.gs-btn.gs-btn{background:#FFFFFF!important;color:#1F1F1F!important;border:0!important;box-shadow:0 4px 0 #CFD8D5!important;font-weight:800!important}
${D} .gs-btn.gs-btn.gs-btn{background:#222E3C!important;color:#EFFAF5!important;box-shadow:0 4px 0 #0A1017!important}

/* polia: mäkké vpadnuté jamky */
${S} textarea,${S} .input{background-color:var(--gl-in)!important;border:0!important;box-shadow:inset 0 2px 0 rgba(16,40,32,.07),inset 0 0 0 1.5px var(--line)!important;border-radius:16px}
${D} textarea,${D} .input{box-shadow:inset 0 2px 0 rgba(0,0,0,.35),inset 0 0 0 1.5px var(--line)!important}
${S} textarea:focus,${S} .input:focus{box-shadow:inset 0 0 0 2px #2FD38A!important;outline:none}

/* spodná lišta: biela nálepka, aktívna ikona v mätovej guličke */
${S} .nav{background:var(--gl)!important;border:0!important;box-shadow:0 5px 0 var(--edge),0 18px 34px -16px var(--amb)!important}
${D} .nav{background:#1E2936!important}
${S} .nav a{color:var(--t3)!important}
${S} .nav a.on{color:var(--t1)!important}
${S} .nav a.on .ic{background:linear-gradient(160deg,#7CFFB2,#3EE6C0)!important;color:#0B2A1C!important;box-shadow:0 3px 0 #1FAE70!important}
${S} .nav a.on .ic svg{color:#0B2A1C!important}
${S} .qa-fab{background:linear-gradient(160deg,#7CFFB2,#3EE6C0)!important;border:0!important;color:#0B2A1C!important;box-shadow:0 5px 0 #1FAE70,0 16px 28px -12px rgba(20,140,100,.55)!important}
${D} .qa-fab{box-shadow:0 5px 0 #178F5B,0 16px 28px -12px rgba(0,0,0,.7)!important}
${S} .bd-fab{box-shadow:0 4px 0 var(--edge),0 12px 22px -12px var(--amb)!important}

/* plusko */
${S} .qa-in .qa-m{background:color-mix(in srgb,var(--c,#7CFFB2) 24%,var(--paper))!important;border:0!important;box-shadow:0 4px 0 color-mix(in srgb,var(--c,#7CFFB2) 50%,var(--edge))!important}
${S} .qa-in .fq,${S} .qa-in .qa-w,${S} .qa-in .qa-t:not(.qa-hero .qa-t){border:0!important}
${S} .qa-hero{box-shadow:0 6px 0 rgba(40,20,110,.45),0 24px 44px -24px rgba(40,20,110,.6)!important}

/* grafy */
${S} svg.chart.wchart .raw{fill:var(--t3)!important;stroke:none!important;opacity:.35!important}
${S} svg.chart.wchart .wc-tag rect{filter:drop-shadow(0 2px 0 #1FAE70)}
${S} .pgx-line{stroke:#11A267!important;filter:none!important}
${D} .pgx-line{stroke:#6CF0AE!important}
${S} .pgx-rings,${S} .pgx-chart{--accent:#11A267}
${D} .pgx-rings,${D} .pgx-chart{--accent:#6CF0AE}

/* úvod a dotazník */
${S} .fnq-o,${S} .fnq-feats>div,${S} .fnq-nf,${S} .fnq-bigin label,${S} .fnq-yrs button,${S} .fnq-week i{border:0!important;box-shadow:0 4px 0 var(--edge)!important}
${S} .fnq-o[aria-checked=true]{background:var(--p-pro)!important;color:var(--t1)!important;box-shadow:0 4px 0 #2FD38A,inset 0 0 0 2px #2FD38A!important}
${S} .fnq-o.v2[aria-checked=true]{background:color-mix(in srgb,var(--c) 22%,var(--paper))!important;box-shadow:0 4px 0 var(--c),inset 0 0 0 2px var(--c)!important}
${S} .fnq-o[aria-checked=true] *{color:var(--t1)!important}
${S} .fnq-o .ic,${S} .fnq-feats .fi{background:linear-gradient(160deg,#7CFFB2,#3EE6C0)!important;color:#0B2A1C!important;box-shadow:0 2px 0 #1FAE70!important}
${S} .fnq-feats>div:nth-child(6n+1){${tint('pro')}}${S} .fnq-feats>div:nth-child(6n+2){${tint('car')}}${S} .fnq-feats>div:nth-child(6n+3){${tint('fat')}}${S} .fnq-feats>div:nth-child(6n+4){${tint('vio')}}${S} .fnq-feats>div:nth-child(6n+5){${tint('red')}}${S} .fnq-feats>div:nth-child(6n+6){${tint('pro')}}
${S} .fnq-cta{background:var(--pri)!important;color:var(--pri-t)!important;border:0!important;box-shadow:0 5px 0 var(--pri-e)!important;font-weight:900!important}
${S} .fnq-bar{box-shadow:var(--well-sh)!important}
${S} .fnq-bar i,${S} .fnq-bar b,${S} .fnq-bar>*{background:linear-gradient(90deg,#5BE9A6,#2BC7B8)!important}

/* Upraviť Dnes */
${S} .tde-r{border:0!important}
${S} .td-editlink{border:0!important;box-shadow:0 3px 0 var(--edge)!important;background:var(--gl)!important}

/* Tréning: vybraná oblasť tela (tmavý režim) */
${D} #mseg button.on,${D} #mseg button.on *{color:var(--t1)!important}

/* Klienti (tréner) */
${S}:not([data-theme=dark]) .ko-c.warn .ko-id span{color:#9A4F07!important;background:#FFE7C7!important}
`;

export const stickerCss = RULES => {
  const S = 'html[data-skin=sticker]:root', D = 'html[data-skin=sticker][data-theme=dark]:root';
  return VARS(S, D) + RULES(S, D) + EXTRA(S, D);
};
export const STICKER_META = { light: '#CFF8E8', dark: '#0D141C' };
// zaoblené písmo pre zariadenia bez SF Rounded (Android, počítač); na iPhone sa použije systémové
export const STICKER_FONT = 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap';
