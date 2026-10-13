// Vercel build: skopíruje appku do priečinka public/ a vygeneruje PNG ikony (192, 512) priamo z kódu.
// Kreslí to isté, čo icon.svg: tmavé pozadie + zelená vlna "druhého dychu" s bodkou na konci.
const fs = require('fs');
const zlib = require('zlib');

const BG = [11, 14, 18], FG = [124, 255, 178];
// Bézier krivky z icon.svg (súradnice v 512 mriežke)
const CURVES = [
  [[96, 300], [150, 300], [160, 190], [210, 190]],
  [[210, 190], [260, 190], [250, 330], [300, 330]],
  [[300, 330], [350, 330], [360, 220], [416, 220]],
];
function bez(p, t) {
  const u = 1 - t;
  return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
          u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]];
}
const PTS = [];
for (const c of CURVES) for (let i = 0; i <= 60; i++) PTS.push(bez(c, i / 60));

function distToPath(x, y) {
  let best = 1e9;
  for (let i = 1; i < PTS.length; i++) {
    const [ax, ay] = PTS[i - 1], [bx, by] = PTS[i];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx - x, py = ay + t * dy - y;
    best = Math.min(best, Math.sqrt(px * px + py * py));
  }
  return best;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const s = size / 512, half = 17, r = 26;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const X = (x + 0.5) / s, Y = (y + 0.5) / s;
      let d = distToPath(X, Y) - half;
      const ddx = X - 416, ddy = Y - 220; d = Math.min(d, Math.sqrt(ddx * ddx + ddy * ddy) - r);
      const a = Math.max(0, Math.min(1, 0.5 - d * s)); // anti-aliasing cez 1 px
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(BG[k] + (FG[k] - BG[k]) * a);
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const OUT = 'public';
const SKIP = new Set(['public', 'node_modules', '.git', '.vercel', 'supabase', 'build.js', 'vercel.json', 'package.json', 'package-lock.json', 'schema.sql', 'README.md']);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const f of fs.readdirSync('.')) {
  if (SKIP.has(f) || f.startsWith('.') || !fs.statSync(f).isFile()) continue;
  fs.copyFileSync(f, `${OUT}/${f}`);
}
for (const n of [192, 512]) fs.writeFileSync(`${OUT}/icon-${n}.png`, png(n));
// Supabase knižnica ako jeden ES modul z našej domény (rýchly štart, offline cache). Keď sa niečo nepodarí,
// appka si ju sama stiahne z CDN (data.js), takže nasadenie nikdy nespadne kvôli tomuto kroku.
try {
  const umd = fs.readFileSync(require.resolve('@supabase/supabase-js/dist/umd/supabase.js'), 'utf8');
  if (!/^var supabase=/.test(umd)) throw new Error('neočakávaný formát UMD');
  fs.mkdirSync(`${OUT}/vendor`, { recursive: true });
  fs.writeFileSync(`${OUT}/vendor/supabase.mjs`, umd + '\nexport const createClient = supabase.createClient;\nexport default supabase;\n');
  console.log('vendor ok: supabase-js', require('@supabase/supabase-js/package.json').version);
} catch (e) { console.warn('vendor preskočené:', e.message); }
console.log('build ok:', fs.readdirSync(OUT).join(', '));
