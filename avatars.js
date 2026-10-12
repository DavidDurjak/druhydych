// Postavy pomocníka v štýle esports emblémov: pancier, hranaté tieňovanie, svietiace oči, kovový rám.
// Skladačka z vrstiev (typ, farba, žiara, výzbroj, ozdoba, znak, pozadie, rám). Čisté SVG bez obrázkov.
// avatarSvg(buddy, veľkosť, {anim, vb}) vráti SVG text. Hodnoty sa ukladajú ako texty (id) a indexy farieb.

export const ARMOR = ['#8A94A6', '#C9A24B', '#B3263E', '#6FB7D9', '#2F9E6B', '#7A4BC7', '#B57A4A', '#2A2F3A', '#E9EDF3', '#D9692B'];
export const ARMOR_N = ['Oceľ', 'Zlato', 'Karmín', 'Ľad', 'Smaragd', 'Fialová', 'Bronz', 'Onyx', 'Perla', 'Meď'];
export const GLOW = ['#35E0FF', '#5CFF9A', '#FF3B5C', '#FFB020', '#B86CFF', '#F2F7FF', '#FF4FD8', '#C6FF3D'];
export const SKIN = ['#F3CBA5', '#E0A878', '#C68642', '#8D5524'];
export const HAIRC = ['#2b1d14', '#6b4a2b', '#c9a24b', '#d9dde3', '#9b3b1e'];
export const BGC = ['#0E1420', '#1A0F1F', '#0D1F1A', '#201208', '#0A1A33', '#1F0D14', '#16181D', '#241B0A'];

export const ARCH = [['spartan', 'Legionár'], ['samurai', 'Samuraj'], ['ninja', 'Ninja'], ['wolf', 'Vlk'], ['lion', 'Lev'], ['astro', 'Astronaut'], ['cyborg', 'Kyborg'], ['viking', 'Viking']];
export const SHOULDERS = [['plates', 'Pláty'], ['spikes', 'Tŕne'], ['fur', 'Kožušina'], ['cape', 'Plášť'], ['none', 'Nič']];
export const CRESTS = [['none', 'Nič'], ['plume', 'Chochol'], ['horns', 'Rohy'], ['fin', 'Čepeľ'], ['wings', 'Krídla'], ['ring', 'Kruh']];
export const EMBLEMS = [['none', 'Nič'], ['bolt', 'Blesk'], ['flame', 'Plameň'], ['star', 'Hviezda'], ['dumbbell', 'Činka'], ['diamond', 'Diamant']];
export const MARKS = [['none', 'Nič'], ['claws', 'Pazúry'], ['scar', 'Jazva'], ['rune', 'Runa']];
export const BGS = [['aura', 'Žiara'], ['rays', 'Lúče'], ['hex', 'Sieť'], ['embers', 'Iskry'], ['slash', 'Rýchlosť'], ['plain', 'Tma']];
export const FRAMES = [['none', 'Bez rámu'], ['ring', 'Kruh'], ['hex', 'Šesťuholník'], ['shield', 'Štít']];

export const DEFAULT = { v: 2, name: 'Dych', a: 'spartan', c: 0, g: 0, sk: 1, hc: 1, sh: 'plates', cr: 'plume', em: 'bolt', mk: 'none', bs: 'aura', bg: 0, fr: 'ring' };

export const PRESETS = [
  { n: 'Legionár', a: 'spartan', c: 0, g: 2, sh: 'plates', cr: 'plume', em: 'bolt', mk: 'none', bs: 'rays', bg: 5, fr: 'shield' },
  { n: 'Ronin', a: 'samurai', c: 2, g: 3, sh: 'spikes', cr: 'horns', em: 'flame', mk: 'none', bs: 'slash', bg: 1, fr: 'hex' },
  { n: 'Tieň', a: 'ninja', c: 7, g: 1, sh: 'none', cr: 'none', em: 'diamond', mk: 'none', bs: 'hex', bg: 2, fr: 'ring' },
  { n: 'Šedý vlk', a: 'wolf', c: 0, g: 0, sh: 'fur', cr: 'none', em: 'none', mk: 'claws', bs: 'aura', bg: 4, fr: 'ring' },
  { n: 'Lev', a: 'lion', c: 1, g: 3, sh: 'plates', cr: 'none', em: 'star', mk: 'scar', bs: 'embers', bg: 3, fr: 'shield' },
  { n: 'Orbit', a: 'astro', c: 8, g: 0, sh: 'plates', cr: 'ring', em: 'star', mk: 'none', bs: 'aura', bg: 0, fr: 'ring' },
  { n: 'Bot-7', a: 'cyborg', c: 7, g: 6, sh: 'spikes', cr: 'fin', em: 'bolt', mk: 'none', bs: 'hex', bg: 1, fr: 'hex' },
  { n: 'Ragnar', a: 'viking', c: 6, g: 5, sh: 'fur', cr: 'horns', em: 'dumbbell', mk: 'scar', bs: 'slash', bg: 6, fr: 'shield' },
  { n: 'Fénix', a: 'samurai', c: 9, g: 3, sh: 'cape', cr: 'wings', em: 'flame', mk: 'rune', bs: 'embers', bg: 7, fr: 'ring' },
  { n: 'Ľadový', a: 'spartan', c: 3, g: 5, sh: 'plates', cr: 'fin', em: 'diamond', mk: 'rune', bs: 'rays', bg: 4, fr: 'hex' },
  { n: 'Smaragd', a: 'wolf', c: 4, g: 1, sh: 'spikes', cr: 'none', em: 'bolt', mk: 'none', bs: 'hex', bg: 2, fr: 'shield' },
  { n: 'Zlatý', a: 'cyborg', c: 1, g: 4, sh: 'cape', cr: 'wings', em: 'star', mk: 'none', bs: 'aura', bg: 1, fr: 'ring' },
];

export function norm(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const b = r.v === 2 || r.a ? { ...DEFAULT, ...r } : { ...DEFAULT, name: r.name || 'Dych' }; // staré kreslené postavičky sa nahradia novými
  const ok = (list, v, d) => (list.some(x => x[0] === v) ? v : d);
  b.a = ok(ARCH, b.a, 'spartan'); b.sh = ok(SHOULDERS, b.sh, 'plates'); b.cr = ok(CRESTS, b.cr, 'none'); b.em = ok(EMBLEMS, b.em, 'none');
  b.mk = ok(MARKS, b.mk, 'none'); b.bs = ok(BGS, b.bs, 'aura'); b.fr = ok(FRAMES, b.fr, 'ring');
  const n = (v, len) => ((Number(v) || 0) % len + len) % len;
  b.c = n(b.c, ARMOR.length); b.g = n(b.g, GLOW.length); b.sk = n(b.sk, SKIN.length); b.hc = n(b.hc, HAIRC.length); b.bg = n(b.bg, BGC.length);
  return b;
}

export function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16), t = p < 0 ? 0 : 255, a = Math.min(1, Math.abs(p));
  const f = v => Math.round((t - v) * a + v);
  return '#' + [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}

const DARK = '#06080c';
const mir = inner => `<g transform="translate(100 0) scale(-1 1)">${inner}</g>`;
const star = (cx, cy, r) => {
  let p = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1); }
  return p + 'Z';
};
// plošky: ľavá polovica sa nakreslí svetlejšie, pravá (zrkadlo) tmavšie, takže vznikne hranatý 3D vzhľad
function facets(list, base, dk = 0.24) {
  const one = k => list.map(([d, tone]) => { const f = shade(base, tone - k); return `<path d="${d}" fill="${f}" stroke="${f}" stroke-width=".45" stroke-linejoin="round"/>`; }).join('');
  return one(0) + mir(one(dk));
}
const dark = list => list.map(d => `<path d="${d}" fill="${DARK}"/>`).join('') + mir(list.map(d => `<path d="${d}" fill="${DARK}"/>`).join(''));
const glowShape = (list, col) => `<g filter="url(#GF)">${list.map(d => `<path d="${d}" fill="${col}"/>`).join('')}${mir(list.map(d => `<path d="${d}" fill="${col}"/>`).join(''))}</g>`;
const edge = (d, glow) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8" stroke-linejoin="round" stroke-linecap="round"/>` + mir(`<path d="${d}" fill="none" stroke="${glow}" stroke-opacity=".75" stroke-width="1" stroke-linejoin="round" stroke-linecap="round"/>`);

// ---- typy hláv: { back, head, top } ----
const HEAD = {
  spartan: k => ({
    top: 14, back: '',
    head: facets([
      ['M50 14 L36 17 L27 26 L24 40 L24 58 L28 70 L35 79 L44 82 L47 68 L50 64Z', 0],
      ['M50 14 L36 17 L28 25 L50 27Z', 0.3],
      ['M50 30 L31 33 L25 42 L38 44 L50 41Z', 0.12],
      ['M24 44 L24 58 L28 70 L35 79 L41 80 L38 62 L32 50Z', -0.2],
      ['M50 41 L46 44 L47 68 L50 64Z', 0.2],
      ['M35 79 L44 82 L47 74 L40 72Z', -0.32],
    ], k.A) + dark(['M32 47 L46 46 L46 52 L36 54 L32 52Z', 'M38 66 L46 65 L46 70 L40 71Z'])
      + glowShape(['M35 49 L45 48.4 L45 51 L37 52Z'], k.G) + edge('M50 14 L36 17 L27 26 L24 40 L24 58 L28 70 L35 79', k.G),
  }),
  samurai: k => ({
    top: 13, back: '',
    head: facets([
      ['M26 36 L14 46 L12 58 L24 56 L28 44Z', -0.25], ['M24 56 L12 58 L14 66 L26 62Z', -0.4],
      ['M50 13 L38 15 L29 22 L26 33 L50 31Z', 0.22], ['M26 33 L50 31 L50 37 L27 39Z', -0.1],
      ['M50 22 L36 24 L32 31 L50 29Z', 0.34],
      ['M30 48 L50 46 L50 77 L42 76 L34 66 L30 56Z', 0.02], ['M30 56 L34 66 L42 76 L40 62 L34 56Z', -0.22],
    ], k.A) + dark(['M28 38 L50 37 L50 48 L30 50Z', 'M38 64 L50 62 L50 64 L40 66Z', 'M37 70 L50 68 L50 70 L39 72Z'])
      + glowShape(['M31 44 L46 43 L46 46.6 L34 47.4Z'], k.G) + edge('M50 13 L38 15 L29 22 L26 33 L14 46 L12 58', k.G),
  }),
  ninja: k => ({
    top: 15, back: '',
    head: facets([
      ['M50 15 L35 19 L26 31 L24 48 L27 64 L35 74 L50 77Z', -0.05],
      ['M28 56 L50 52 L50 77 L35 74 L29 64Z', -0.24],
      ['M25 40 L50 38 L50 51 L27 52Z', -0.5],
      ['M24 34 L50 31 L50 38 L25 41Z', 0.04],
    ], k.A) + dark(['M30 43 L47 42 L47 48.4 L32 49Z'])
      + `<path d="M24 36 L50 33" stroke="${k.G}" stroke-opacity=".8" stroke-width="1.2"/>` + mir(`<path d="M24 36 L50 33" stroke="${k.G}" stroke-opacity=".8" stroke-width="1.2"/>`)
      + `<path d="M30 20 L40 30 M27 60 L40 66" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>`
      + glowShape(['M33 44.4 L45 43.8 L45 46.4 L35 47Z'], k.G) + edge('M50 15 L35 19 L26 31 L24 48 L27 64 L35 74', k.G),
  }),
  wolf: k => ({
    top: 6,
    back: facets([['M27 30 L24 6 L44 22Z', -0.08], ['M44 22 L24 6 L34 26Z', 0.12]], k.A) + `<path d="M30 25 L28 13 L38 21Z" fill="#1a0e12"/>` + mir(`<path d="M30 25 L28 13 L38 21Z" fill="#1a0e12"/>`),
    head: facets([
      ['M50 20 L38 24 L28 34 L50 40Z', 0.18], ['M28 34 L22 50 L26 60 L36 56 L40 44Z', -0.06],
      ['M22 50 L12 54 L21 58 L14 66 L26 64Z', 0.1], ['M28 34 L50 40 L50 50 L36 52 L30 46Z', -0.2],
      ['M50 50 L36 52 L33 62 L38 74 L50 80Z', 0.32], ['M38 74 L50 80 L50 85 L40 81Z', -0.12],
    ], k.A) + dark(['M50 62 L43 65 L46 70 L50 71Z']) + `<path d="M50 71 L50 76 M50 76 L44 79 M50 76 L56 79" stroke="${DARK}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`
      + glowShape(['M31 41 L43 45 L43 48 L33 45.6Z'], k.G) + edge('M50 20 L38 24 L28 34 L22 50 L26 60 L36 72', k.G),
  }),
  lion: k => {
    const tuft = i => {
      const a0 = Math.PI * 1.5 - i * (Math.PI * 1.1 / 14), a1 = a0 - 0.2, am = a0 - 0.1, r0 = 26, r1 = 41 + (i % 2) * 3;
      const p = (a, r) => `${(50 + r * Math.cos(a)).toFixed(1)} ${(50 + r * Math.sin(a)).toFixed(1)}`;
      return `M${p(a0, r0)} L${p(am, r1)} L${p(a1, r0)}Z`;
    };
    const ev = [], od = [];
    for (let i = 0; i < 15; i++) (i % 2 ? od : ev).push(tuft(i));
    return {
      top: 9,
      back: facets([[ev.join(''), -0.4], [od.join(''), -0.2]], k.A),
      head: facets([
        ['M50 24 C36 24 28 34 28 48 C28 62 36 78 50 80Z', 0.1], ['M50 36 L32 38 L30 44 L50 42Z', -0.14],
        ['M50 54 L40 56 L38 66 L44 74 L50 76Z', 0.36], ['M28 48 C28 62 36 78 50 80 L44 70 L34 58Z', -0.12],
      ], k.A) + dark(['M50 56 L45 58 L50 64Z']) + `<path d="M50 64 L50 70 M50 70 Q44 74 41 70 M50 70 Q56 74 59 70" stroke="${DARK}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`
        + glowShape(['M32 44.4 L46 43.4 L46 46.4 L34 47Z'], k.G) + edge('M50 24 C36 24 28 34 28 48 C28 62 36 78 50 80', k.G),
    };
  },
  astro: k => ({
    top: 16, back: `<path d="M50 20 V10" stroke="${shade(k.A, -0.4)}" stroke-width="2"/><circle cx="50" cy="9" r="2.6" fill="${k.G}" filter="url(#GF)"/>`,
    head: `<ellipse cx="50" cy="78" rx="21" ry="6.5" fill="${shade(k.A, -0.4)}"/><ellipse cx="50" cy="75" rx="21" ry="6" fill="${shade(k.A, -0.15)}"/>`
      + `<circle cx="22" cy="48" r="7" fill="${shade(k.A, -0.3)}"/><circle cx="78" cy="48" r="7" fill="${shade(k.A, -0.45)}"/><circle cx="22" cy="48" r="2.4" fill="${k.G}" filter="url(#GF)"/><circle cx="78" cy="48" r="2.4" fill="${k.G}" filter="url(#GF)"/>`
      + `<circle cx="50" cy="46" r="31" fill="url(#HG)"/><circle cx="50" cy="46" r="31" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>`
      + `<path d="M31 42 C31 31 39 28 50 28 C61 28 69 31 69 42 C69 57 60 64 50 64 C40 64 31 57 31 42Z" fill="url(#VG)" stroke="${shade(k.A, -0.5)}" stroke-width="1.6"/>`
      + `<path d="M35 37 C37 32 43 31 48 31 L41 56 C36 52 34 44 35 37Z" fill="#fff" opacity=".2"/><path d="M60 34 C64 36 66 40 66 44" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" fill="none" stroke-linecap="round"/>`
      + `<path d="${star(56, 50, 2.6)}" fill="${k.G}" opacity=".9" filter="url(#GF)"/><circle cx="44" cy="46" r="1" fill="#fff" opacity=".7"/><circle cx="52" cy="40" r=".8" fill="#fff" opacity=".6"/>`,
  }),
  cyborg: k => ({
    top: 15, back: '',
    head: facets([
      ['M50 15 L37 18 L28 27 L26 42 L28 58 L34 70 L42 76 L50 77Z', 0], ['M50 15 L37 18 L30 25 L50 28Z', 0.32],
      ['M28 58 L34 70 L42 76 L50 77 L50 66 L38 62Z', -0.28], ['M26 44 L19 46 L19 58 L27 58Z', -0.3],
      ['M50 28 L30 25 L28 32 L50 34Z', 0.1],
    ], k.A) + dark(['M27 41 L50 39 L50 50 L29 52Z', 'M38 66 L50 65 L50 67 L39 68Z', 'M39 70 L50 69 L50 71 L41 72Z'])
      + glowShape(['M30 44 L50 43 L50 47.4 L31 48.4Z'], k.G)
      + `<circle cx="62" cy="46.4" r="4.4" fill="${DARK}" stroke="${k.G}" stroke-width="1"/><circle cx="62" cy="46.4" r="2" fill="#fff" filter="url(#GF)"/>`
      + `<circle cx="21" cy="52" r="1.6" fill="${k.G}" filter="url(#GF)"/>` + `<path d="M30 52 L34 60 L40 60" stroke="${k.G}" stroke-opacity=".55" stroke-width=".8" fill="none"/>`
      + edge('M50 15 L37 18 L28 27 L26 42 L28 58 L34 70', k.G),
  }),
  viking: k => {
    const sk = k.S, hr = k.H;
    return {
      top: 14, back: '',
      head: facets([['M27 41 L50 41 L50 72 L44 74 L36 66 L30 54Z', 0], ['M28 42 L50 42 L50 46 L30 48Z', -0.28], ['M30 54 L36 66 L44 74 L40 60Z', -0.16], ['M50 46 L46 56 L50 58Z', 0.14]], sk, 0.2)
        + facets([['M27 50 L26 68 L32 82 L42 90 L50 95 L50 74 L44 74 L36 66 L30 54Z', 0], ['M30 62 L32 78 L40 86 L38 70Z', -0.2]], hr, 0.22)
        + facets([['M50 58 L40 60 L34 64 L44 62 L50 64Z', 0.05]], hr, 0.2)
        + `<path d="M34 72 L36 84 M40 74 L42 88" stroke="${shade(hr, 0.3)}" stroke-opacity=".5" stroke-width=".9"/>`
        + facets([['M50 14 L37 16 L28 24 L26 36 L50 36Z', 0.1], ['M26 36 L50 36 L50 41 L27 41Z', -0.12], ['M50 36 L47 36 L47 52 L50 57Z', 0.2], ['M37 16 L28 24 L26 36 L32 36 L36 22Z', 0.32]], k.A)
        + `<path d="M31 49 L43 48 L43 51 L33 52Z" fill="#14161b"/>` + mir(`<path d="M31 49 L43 48 L43 51 L33 52Z" fill="#14161b"/>`)
        + glowShape(['M36 49.4 L41 49.1 L41 50.7 L37 51Z'], k.G) + edge('M50 14 L37 16 L28 24 L26 36', k.G),
    };
  },
};

function torso(b, k) {
  const A = k.A;
  const base = facets([
    ['M50 76 L38 78 L33 86 L40 90 L50 91Z', -0.32],
    ['M38 78 L26 84 L18 100 L50 100 L50 91 L40 90 L33 86Z', -0.14],
    ['M44 92 L50 91 L50 100 L40 100Z', -0.28],
  ], A);
  let sh = '', back = '';
  const trim = `<path d="M9 98 L16 89 L26 88" stroke="${k.G}" stroke-opacity=".75" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const trimBoth = trim + mir(trim);
  if (b.sh === 'plates') sh = facets([['M26 84 L14 86 L7 96 L8 100 L22 100 L26 92Z', 0.12], ['M26 84 L14 86 L16 88.4 L26 87Z', 0.36], ['M22 100 L26 92 L30 100Z', -0.2]], A) + trimBoth;
  if (b.sh === 'spikes') sh = facets([['M26 84 L14 86 L7 96 L8 100 L22 100 L26 92Z', 0.12], ['M26 84 L14 86 L16 88.4 L26 87Z', 0.36], ['M17 86 L12 70 L24 84Z', 0.3], ['M10 92 L1 82 L14 90Z', 0.22]], A) + trimBoth;
  if (b.sh === 'fur') sh = facets([['M27 82 L14 86 L8 96 L12 94 L10 102 L16 98 L18 104 L22 98 L26 102 L28 92Z', 0.6], ['M27 82 L14 86 L16 90 L27 87Z', 0.8]], '#cfd6df', 0.2);
  if (b.sh === 'cape') back = `<path d="M30 78 L4 100 L96 100 L70 78Z" fill="${shade(k.G, -0.62)}"/><path d="M30 78 L4 100 L96 100 L70 78" fill="none" stroke="${k.G}" stroke-opacity=".5" stroke-width="1"/>`;
  return { back, front: base + sh };
}

const EMB = {
  bolt: 'M2 -6 L-4 1 L0 1 L-2 7 L4 -1 L0 -1Z', flame: 'M0 -7 C3 -3 5 -1 4 3 C3 6 -3 6 -4 3 C-5 0 -2 -2 -1 -5 C0 -4 1 -3 0 -7Z',
  star: star(0, 0, 6.5), dumbbell: 'M-7 -3.4 h2 v6.8 h-2z M-5 -1.2 h10 v2.4 h-10z M5 -3.4 h2 v6.8 h-2z', diamond: 'M0 -6.5 L5 0 L0 6.5 L-5 0Z',
};
const emblem = (id, g) => (id === 'none' ? '' : `<g transform="translate(50 90) scale(.8)" filter="url(#GF)"><path d="${EMB[id]}" fill="${g}"/></g>`);

function crest(id, top, k) {
  const dy = top - 15, c = k.G, bone = '#EDE3C8';
  let g = '';
  if (id === 'plume') g = facets([['M50 16 C42 14 34 8 30 -2 C40 2 46 8 50 10Z', 0.1], ['M50 10 C46 8 40 4 36 -4 C44 -2 48 2 50 4Z', 0.3]], shade(c, -0.35), 0.28);
  if (id === 'horns') g = facets([['M35 24 C27 22 21 14 22 4 C27 11 34 13 41 17Z', 0.1], ['M22 4 C21 14 27 22 35 24 L33 20 C28 18 24 12 22 4Z', -0.15]], bone, 0.3);
  if (id === 'fin') g = facets([['M50 18 L46 6 L50 -4Z', 0.2]], shade(c, -0.1), 0.35) + `<path d="M50 -4 L50 18" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>`;
  if (id === 'wings') g = facets([['M28 36 L14 26 L5 30 L16 36 L7 41 L19 44 L12 50 L28 46Z', 0.1], ['M28 36 L14 26 L16 32 L28 40Z', 0.3]], shade(c, -0.15), 0.3);
  return g ? `<g transform="translate(0 ${dy})">${g}</g>` : '';
}

const mark = (id, g) => {
  if (id === 'claws') return `<path d="M27 54 L34 72 M31 51 L38 69 M23 57 L30 74" stroke="#e24a4a" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".9"/>`;
  if (id === 'scar') return `<path d="M60 36 L67 58" stroke="#e8795e" stroke-width="1.8" stroke-linecap="round"/><path d="M58.5 43 l5 -2 M60 49 l5 -2 M62 55 l4 -1.6" stroke="#e8795e" stroke-width="1.2" stroke-linecap="round"/>`;
  if (id === 'rune') return `<g filter="url(#GF)"><path d="M50 22 l3.4 4.6 l-3.4 4.6 l-3.4 -4.6Z" fill="${g}"/></g>`;
  return '';
};

function background(b, k, id) {
  const col = BGC[b.bg], G = k.G;
  let s = `<rect width="100" height="100" fill="${col}"/>`;
  const au = o => `<rect width="100" height="100" fill="url(#${id}au)" opacity="${o}"/>`;
  if (b.bs === 'aura') s += au(1);
  if (b.bs === 'rays') { let w = ''; for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7, c = a + Math.PI / 14; w += `M50 52 L${(50 + 95 * Math.cos(a)).toFixed(1)} ${(52 + 95 * Math.sin(a)).toFixed(1)} L${(50 + 95 * Math.cos(c)).toFixed(1)} ${(52 + 95 * Math.sin(c)).toFixed(1)}Z`; } s += `<path d="${w}" fill="${G}" opacity=".13"/>` + au(0.7); }
  if (b.bs === 'hex') { let h = ''; for (let r = 0; r < 8; r++) for (let q = 0; q < 8; q++) { const x = q * 17.3 + (r % 2 ? 8.65 : 0) - 4, y = r * 15 - 4; h += `M${x} ${y - 10} l8.65 5 v10 l-8.65 5 l-8.65 -5 v-10Z`; } s += `<path d="${h}" fill="none" stroke="${G}" stroke-opacity=".16" stroke-width=".7"/>` + au(0.8); }
  if (b.bs === 'embers') { let d = ''; for (let i = 0; i < 26; i++) { const x = (i * 37 + 11) % 97, y = (i * 53 + 7) % 92, r = 0.5 + ((i * 7) % 5) * 0.35; d += `<circle cx="${x + 2}" cy="${y + 3}" r="${r.toFixed(2)}" fill="${G}" opacity="${(0.25 + ((i * 3) % 6) * 0.1).toFixed(2)}"/>`; } s += au(0.8) + d; }
  if (b.bs === 'slash') s += `<g stroke="${G}" stroke-opacity=".2" stroke-width="5">${[-10, 6, 22, 38, 54, 70, 86, 102].map(x => `<path d="M${x} 110 L${x + 55} -10"/>`).join('')}</g>` + au(0.6);
  s += `<rect width="100" height="100" fill="url(#${id}vg)"/>`;
  return s;
}

const FRAME_PATH = { ring: 'M50 3 a47 47 0 1 0 0.01 0Z', hex: 'M50 3 L90 26 L90 74 L50 97 L10 74 L10 26Z', shield: 'M12 8 L88 8 L88 52 C88 76 66 90 50 98 C34 90 12 76 12 52Z' };

let UID = 0;
export function avatarSvg(raw, size = 56, o = {}) {
  const b = norm(raw), id = 'av' + (++UID);
  const A = ARMOR[b.c], G = GLOW[b.g];
  const k = { A, G, S: SKIN[b.sk], H: HAIRC[b.hc] };
  const head = (HEAD[b.a] || HEAD.spartan)(k);
  const t = torso(b, k);
  const fp = FRAME_PATH[b.fr];
  const defs = `<defs>
    <filter id="${id}GF" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="${id}au" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="${G}" stop-opacity=".42"/><stop offset=".6" stop-color="${G}" stop-opacity=".08"/><stop offset="1" stop-color="${G}" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}vg" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
    <radialGradient id="${id}HG" cx=".36" cy=".28" r=".9"><stop offset="0" stop-color="${shade(A, 0.5)}"/><stop offset=".5" stop-color="${A}"/><stop offset="1" stop-color="${shade(A, -0.45)}"/></radialGradient>
    <linearGradient id="${id}VG" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${shade(G, -0.55)}"/><stop offset=".55" stop-color="#0a0f1a"/><stop offset="1" stop-color="${shade(G, -0.7)}"/></linearGradient>
    <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(A, 0.55)}"/><stop offset=".5" stop-color="${A}"/><stop offset="1" stop-color="${shade(A, -0.5)}"/></linearGradient>
    ${fp ? `<clipPath id="${id}c"><path d="${fp}"/></clipPath>` : ''}
  </defs>`;
  const ring = b.cr === 'ring' ? `<g filter="url(#GF)"><circle cx="50" cy="46" r="40" fill="none" stroke="${G}" stroke-width="1.8" stroke-opacity=".85" stroke-dasharray="40 6 2 6"/></g>` : '';
  let scene = `<g class="bd-fig" transform="translate(2 8) scale(.96)">${ring}${t.back}${head.back}${t.front}${head.head}${crest(b.cr, head.top, k)}${mark(b.mk, G)}${emblem(b.em, G)}</g>`;
  scene = background(b, k, id) + scene.replace(/url\(#GF\)/g, `url(#${id}GF)`).replace(/url\(#HG\)/g, `url(#${id}HG)`).replace(/url\(#VG\)/g, `url(#${id}VG)`);
  const frame = fp ? `<path d="${fp}" fill="none" stroke="url(#${id}m)" stroke-width="3.4" stroke-linejoin="round"/><path d="${fp}" fill="none" stroke="${G}" stroke-opacity=".55" stroke-width=".7" transform="translate(50 50) scale(.955) translate(-50 -50)"/>` : '';
  const body = fp ? `<g clip-path="url(#${id}c)">${scene}</g>${frame}` : scene;
  return `<svg class="bd-av${o.anim ? ' bd-anim' : ''}${fp ? ' bd-fr' : ''}" width="${size}" height="${size}" viewBox="${o.vb || '0 0 100 100'}" aria-hidden="true">${defs}${body}</svg>`;
}

export function randomBuddy(name) {
  const pick = a => a[Math.floor(Math.random() * a.length)][0];
  const n = m => Math.floor(Math.random() * m);
  return norm({ v: 2, name: name || 'Dych', a: pick(ARCH), c: n(ARMOR.length), g: n(GLOW.length), sk: n(SKIN.length), hc: n(HAIRC.length), sh: pick(SHOULDERS), cr: pick(CRESTS), em: pick(EMBLEMS), mk: pick(MARKS), bs: pick(BGS), bg: n(BGC.length), fr: pick(FRAMES) });
}
