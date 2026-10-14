// Kartička týždňa na zdieľanie: z obrazovky Týždenný report vyrobí peknú fotku (4:5) so skóre, sériou čísel a značkou Fuelwind.
// Pošle sa cez zdieľanie systému (Instagram, WhatsApp, správy) alebo sa uloží ako obrázok.
import { ctx } from './app.js';

const W = 1080, H = 1350;
const BG = '#0B0E12', MINT = '#7CFFB2', TEAL = '#3FD5C4', INK = '#F4F7FA', MUTED = '#8C97A6';
const FONT = (w, s) => `${w} ${s}px Sora, "SF Pro Display", system-ui, -apple-system, "Segoe UI", sans-serif`;
const FLAME = 'M13.4 2.6c.3 2.6 2.1 3.9 3.5 5.9 1.5 2.1 2.1 4.2 1.6 6.4-.7 3.1-3.4 5.2-6.5 5.2-3.3 0-5.9-2.4-5.9-5.6 0-2 .9-3.5 2.2-4.8.2 1.1.8 1.9 1.7 2.3-.4-2.9.5-5.9 3.4-11.4z';

const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

export function draw(d) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  // pozadie: tmavá plocha so zeleným svitom za skóre a jemnými čiarami vetra
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W / 2, 560, 40, W / 2, 560, 640);
  g.addColorStop(0, 'rgba(124,255,178,.22)'); g.addColorStop(.55, 'rgba(63,213,196,.07)'); g.addColorStop(1, 'rgba(11,14,18,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.lineCap = 'round';
  [[70, 200, 420, .10], [120, 262, 300, .07], [760, 205, 250, .08], [820, 262, 190, .06], [60, 880, 150, .05], [880, 860, 140, .05]].forEach(([x, y, l, a]) => {
    c.strokeStyle = `rgba(124,255,178,${a})`; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y); c.stroke();
  });

  // hlavička: plameň, názov, obdobie
  c.save(); c.translate(72, 74); c.scale(3.2, 3.2);
  c.fillStyle = 'rgba(124,255,178,.2)'; c.strokeStyle = MINT; c.lineWidth = 1.9; c.lineJoin = 'round';
  const p = new Path2D(FLAME); c.fill(p); c.stroke(p); c.restore();
  c.fillStyle = INK; c.font = FONT(800, 46); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  c.fillText('Fuelwind', 160, 120);
  c.fillStyle = MUTED; c.font = FONT(500, 30); c.textAlign = 'right';
  c.fillText(d.period, W - 72, 118);

  // prstenec so skóre
  const cx = W / 2, cy = 590, R = 270, sw = 38;
  c.lineWidth = sw; c.strokeStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
  const frac = Math.max(0, Math.min(1, d.score / 100));
  if (frac > 0) {
    const gr = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R); gr.addColorStop(0, TEAL); gr.addColorStop(1, MINT);
    c.strokeStyle = gr; c.shadowColor = 'rgba(124,255,178,.55)'; c.shadowBlur = 36;
    c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); c.stroke(); c.shadowBlur = 0;
  }
  c.fillStyle = INK; c.textAlign = 'center'; c.font = FONT(800, 250); c.fillText(String(d.score), cx, cy + 62);
  c.fillStyle = MUTED; c.font = FONT(600, 38); c.fillText('zo 100', cx, cy + 128);

  // verdikt a zmena oproti minulému týždňu
  c.fillStyle = INK; c.font = FONT(800, 72); c.fillText(d.verdict, cx, 1008 - 0);
  if (d.delta) {
    const up = /^\+/.test(d.delta), dn = /^[-−–]/.test(d.delta);
    const col = up ? MINT : dn ? '#FF8A7A' : MUTED;
    c.font = FONT(700, 32); const tw = c.measureText(d.delta).width, bw = tw + 56, bx = cx - bw / 2, by = 1036;
    rr(c, bx, by, bw, 60, 30); c.fillStyle = up ? 'rgba(124,255,178,.14)' : dn ? 'rgba(255,138,122,.14)' : 'rgba(255,255,255,.07)'; c.fill();
    c.fillStyle = col; c.fillText(d.delta, cx, by + 42);
  }

  // dlaždice s číslami
  const n = d.stats.length, gap = 20, pad = 72, tw = (W - pad * 2 - gap * (n - 1)) / n, ty = 1150, th = 128;
  d.stats.forEach((s, i) => {
    const x = pad + i * (tw + gap);
    rr(c, x, ty, tw, th, 26); c.fillStyle = 'rgba(255,255,255,.06)'; c.fill();
    rr(c, x + .5, ty + .5, tw - 1, th - 1, 26); c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = INK; c.font = FONT(800, 46); c.textAlign = 'center'; c.fillText(s.val, x + tw / 2, ty + 62);
    c.fillStyle = MUTED; c.font = FONT(500, 22); c.fillText(s.lbl, x + tw / 2, ty + 100);
  });
  // pätička
  c.fillStyle = 'rgba(140,151,166,.75)'; c.font = FONT(500, 26); c.textAlign = 'center';
  c.fillText((d.name ? d.name + ' · ' : '') + 'druhydych.vercel.app', cx, 1318);
  return cv;
}

// údaje berieme priamo z vykreslenej obrazovky reportu, aby karta vždy sedela s tým, čo človek vidí
function read(root) {
  const t = s => root.querySelector(s)?.textContent.trim() || '';
  const score = Number(root.querySelector('[data-count]')?.dataset.count ?? t('[data-count]')) || 0;
  const stats = [];
  const want = ['dní so zápisom', 'dní v cieli kcal', 'tréningy', 'bielkoviny / deň', 'krokov / deň'];
  const all = [...root.querySelectorAll('.rp-s')].map(el => ({ lbl: el.querySelector('small')?.textContent.trim() || '', val: el.querySelector('b')?.textContent.trim() || '' }));
  for (const w of want) { const s = all.find(x => x.lbl === w); if (s && s.val && s.val !== '–') stats.push(s); if (stats.length === 4) break; }
  const period = t('.topbar p').replace(/\s*·.*$/, '').replace(/\s+až\s+/, ' – ');
  const delta = t('.rp-delta');
  return { score, verdict: t('.rp-hero h2') || 'Môj týždeň', delta: /^[+\-−–]/.test(delta) ? delta.replace(/\s*oproti minulému týždňu.*$/, ' oproti minulému týždňu') : '', stats, period, name: (ctx.state?.profile?.name || '').split(' ')[0] };
}

async function open(root) {
  const d = read(root);
  try { await Promise.race([document.fonts.load('800 80px Sora'), new Promise(r => setTimeout(r, 1200))]); } catch (_) { /* použije sa náhradné písmo */ }
  const cv = draw(d);
  const url = cv.toDataURL('image/png');
  const bg = ctx.sheet(`<div class="row between"><h3>Kartička týždňa</h3><button class="del" data-x aria-label="Zavrieť">×</button></div>
    <img src="${url}" alt="Kartička týždňa so skóre ${d.score} zo 100" style="width:100%;border-radius:18px;margin-top:10px;display:block">
    <div class="row mt" style="gap:8px"><button class="btn" id="scSave" style="flex:1">Uložiť</button><button class="btn primary" id="scShare" style="flex:1">${navigator.canShare ? 'Zdieľať' : 'Stiahnuť'}</button></div>`);
  bg.querySelector('[data-x]').onclick = () => bg.remove();
  const blob = () => new Promise(r => cv.toBlob(r, 'image/png'));
  const save = async () => { const b = await blob(), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'fuelwind-tyzden.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  bg.querySelector('#scSave').onclick = save;
  bg.querySelector('#scShare').onclick = async () => {
    try {
      const b = await blob(), f = new File([b], 'fuelwind-tyzden.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: 'Fuelwind', text: `Môj týždeň s Fuelwind: ${d.score}/100` });
      else await save();
    } catch (e) { if (e?.name !== 'AbortError') ctx.toast('Nepodarilo sa zdieľať', true); }
  };
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('app');
  const enhance = () => {
    const sc = root?.querySelector('.screen.rp');
    if (!sc || sc.dataset.sc || !sc.querySelector('[data-count], .rp-hero')) return;
    if (!sc.querySelector('a.btn.ghost[href="#/pokrok"]')) return; // len vlastný report, nie pohľad kouča
    sc.dataset.sc = '1';
    const old = sc.querySelector('#share');
    const b = document.createElement('button'); b.className = 'btn primary mb'; b.id = 'shareCard'; b.textContent = 'Zdieľať kartičku';
    b.onclick = () => open(sc);
    if (old) old.replaceWith(b); else sc.querySelector('a.btn.ghost[href="#/pokrok"]').before(b);
  };
  if (root) new MutationObserver(enhance).observe(root, { childList: true, subtree: true });
}
