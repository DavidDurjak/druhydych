// Pozvánka: QR kód v okne Kamaráti a odkaz na pozvánku pri zdieľaní kartičiek (tréning, týždeň)
import { ctx } from './app.js';

const link = () => { const c = ctx.state?.profile?.friend_code; return c ? `${location.origin}${location.pathname}#/kamarat/${c}` : ''; };

// zdieľanie obrázka (story) nesie aj odkaz, cez ktorý sa kamarát pridá k tebe
const orig = navigator.share && navigator.share.bind(navigator);
if (orig) {
  navigator.share = (d) => {
    try {
      const u = link();
      if (d && d.files && d.files.length && !d.url && u && !String(d.text || '').includes('#/kamarat/')) {
        d = { ...d, text: `${d.text ? d.text + '. ' : ''}Pridaj sa a porovnajme sa vo Fuelwind: ${u}` };
      }
    } catch (_) { /* zdieľanie ide ďalej bez odkazu */ }
    return orig(d);
  };
}

const st = document.createElement('style');
st.textContent = '.fr-btns{flex-wrap:wrap}.fr-btns #frShare,.fr-btns #frCopy{flex:1 1 calc(50% - 4px)!important;min-width:0}#frQr{flex:1 1 100%!important}';
document.head.appendChild(st);

function svgOf(m, px) {
  const pad = 2, n = m.length, t = n + pad * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) d += `M${c + pad} ${r + pad}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="QR kód pozvánky"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

function addQr() {
  const copy = document.querySelector('#frCopy');
  if (!copy || document.querySelector('#frQr')) return;
  const code = document.querySelector('.fr-code')?.textContent?.trim() || ctx.state?.profile?.friend_code;
  if (!code || code === '…') return;
  const u = `${location.origin}${location.pathname}#/kamarat/${code}`;
  const btn = document.createElement('button');
  btn.className = 'btn ghost'; btn.id = 'frQr'; btn.textContent = 'QR kód';
  const box = document.createElement('div');
  box.id = 'frQrBox'; box.hidden = true; box.style.cssText = 'text-align:center;margin-top:12px';
  copy.after(btn);
  copy.closest('.fr-box')?.appendChild(box);
  btn.onclick = async () => {
    if (!box.hidden) { box.hidden = true; return; }
    try {
      const { qrMatrix } = await import('./qr.js');
      box.innerHTML = svgOf(qrMatrix(u), 200) + '<small class="muted" style="display:block;margin-top:6px">Kamarát ho naskenuje fotoaparátom a pridá sa k tebe</small>';
      box.querySelector('svg').style.borderRadius = '12px';
      box.hidden = false;
    } catch (_) { ctx.toast('QR sa nepodarilo vytvoriť', true); }
  };
}
new MutationObserver(addQr).observe(document.body, { childList: true, subtree: true });
addQr();
