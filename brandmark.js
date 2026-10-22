// GainTrain značka: sušienka (kreslená v kóde) a logo so sušienkou a nápisom pre obrázky na zdieľanie (karta tréningu, týždeň).
import { WORDMARK } from './brand.js';

// Kotúčová sušienka (kotúč na činku z cesta, s čokoládou a odhryznutím). Kreslí sa v kóde, takže je ostrá v každej veľkosti.
// rot = natočenie (odhryznutie smeruje doprava hore pri 0). Triedy gt-bite / gt-crumb slúžia na animáciu.
export function cookie(id, rot = 15) {
  const r = 100, A = -0.25 * Math.PI, P = (a, k) => [Math.cos(a) * r * k, Math.sin(a) * r * k], f = n => n.toFixed(1);
  let d = '';
  for (let i = 0; i <= 120; i++) { const t = i / 120 * 2 * Math.PI, k = 1 + 0.018 * Math.sin(t * 6 + 0.7) + 0.012 * Math.sin(t * 11 + 2.1) + 0.006 * Math.sin(t * 19 + 1), [x, y] = P(t, k); d += (i ? 'L' : 'M') + f(x) + ' ' + f(y); }
  const bites = [[A, 1.02, 0.40], [A - 0.6, 1.12, 0.27], [A + 0.6, 1.12, 0.27]].map(([a, k, s]) => { const [x, y] = P(a, k); return `<circle class="gt-bite" cx="${f(x)}" cy="${f(y)}" r="${f(r * s)}" fill="black"/>`; }).join('');
  let body = `<path d="${d}Z" fill="url(#${id}g)"/><circle r="82" fill="none" stroke="#9A5B2C" stroke-width="5" opacity=".75"/><circle r="28" fill="none" stroke="#9A5B2C" stroke-width="6" opacity=".8"/>`;
  for (const a of [45, 135, 225]) {
    const t = a * Math.PI / 180, rr = 55, w = 0.34, x1 = f(Math.cos(t - w) * rr), y1 = Math.sin(t - w) * rr, x2 = f(Math.cos(t + w) * rr), y2 = Math.sin(t + w) * rr;
    body += `<path d="M${x1} ${f(y1)}A55 55 0 0 1 ${x2} ${f(y2)}" stroke="#7A4220" stroke-width="14" stroke-linecap="round" fill="none"/><path d="M${x1} ${f(y1 + 3)}A55 55 0 0 1 ${x2} ${f(y2 + 3)}" stroke="#F6C98F" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55"/>`;
  }
  const chip = 'M1 0Q.9.7.2.95Q-.6 1-.95.3Q-1.05-.5-.35-.9Q.5-1.05 1 0Z';
  body += [[-68, -5, 10, 10], [-5, -66, 9, 40], [0, 70, 9.5, -20], [66, 12, 8, 70], [-40, -30, 6.5, 15], [40, -32, 6, 30], [36, 70, 6, -35], [-64, 42, 5.5, 50], [12, 42, 5, 5], [-30, 12, 5, 25]].map(([x, y, s, ro]) => `<path transform="translate(${x} ${y}) rotate(${ro}) scale(${s})" d="${chip}" fill="#3A2214"/>`).join('');
  body += `<path d="${d}Z" fill="url(#${id}s)"/>`;
  const crumb = 'M1 .1L.55.9L-.5.8L-1-.05L-.35-.95L.6-.75Z';
  const crumbs = [[A + 0.02, 1.55, 8.5, 15], [A - 0.38, 1.5, 6, -30], [A + 0.42, 1.45, 5.5, 60], [A + 0.18, 1.85, 4, 10]].map(([a, k, s, ro], i) => { const [x, y] = P(a, k); return `<g class="gt-crumb" style="--i:${i}"><path transform="translate(${f(x)} ${f(y)}) rotate(${ro}) scale(${s})" d="${crumb}" fill="#D9955A"/></g>`; }).join('');
  return `<svg class="gt-cookie" viewBox="-170 -170 340 340" aria-hidden="true"><defs><radialGradient id="${id}g" cx="-30" cy="-35" r="140" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#F2BE7E"/><stop offset=".55" stop-color="#D9955A"/><stop offset="1" stop-color="#A9622F"/></radialGradient><radialGradient id="${id}s" cx="-40" cy="-50" r="90" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${id}m" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400"><rect x="-200" y="-200" width="400" height="400" fill="white"/>${bites}<circle r="17" fill="black"/></mask></defs><g transform="rotate(${rot})"><g mask="url(#${id}m)">${body}</g>${crumbs}</g></svg>`;
}

// logo (sušienka + nápis GAIN TRAIN) ako samostatné SVG: nápis má výšku 100 jednotiek
const LW = 1246, LH = 270;
export function lockupSvg(color = '#fff', id = 'gtx') {
  const ck = cookie(id, 15).replace('<svg class="gt-cookie"', '<svg x="-51" y="-85" width="270" height="270"').replace(' aria-hidden="true"', '');
  const wm = WORDMARK.replace(/^<svg[^>]*>/, '<svg x="205" y="0" width="1041" height="100" viewBox="31 -720 7865 752">').split('currentColor').join(color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -85 ${LW} ${LH}" width="${LW}" height="${LH}">${ck}${wm}</svg>`;
}
const cache = {};
// obrázok loga pripravený na kreslenie do canvasu (Promise)
export function logoImg(color = '#fff') {
  return cache[color] ||= new Promise(res => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = () => res(null);
    i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lockupSvg(color));
  });
}
const ready = {};
logoImg('#fff').then(i => { ready['#fff'] = i; });
// nakreslí logo do canvasu: x = ľavý okraj, baseline = spodok nápisu, size = veľkosť písma (výška nápisu je 0,72 z nej)
export function drawLogo(c, x, baseline, size, color = '#fff', img = ready[color]) {
  const th = size * .72;
  if (!img) { c.save(); c.font = `900 italic ${size}px system-ui, sans-serif`; c.fillStyle = color; c.textAlign = 'left'; c.fillText('GAIN TRAIN', x, baseline); c.restore(); return; }
  const h = th * LH / 100, w = h * LW / LH;
  c.drawImage(img, x, baseline - th - th * .85, w, h);
}
