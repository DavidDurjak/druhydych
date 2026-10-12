// Skener čiarových kódov na celú obrazovku: kamera, baterka, štvorcový rámček, čítanie len z rámčeka, zvuk pri úspechu
// Safari (iPhone) nemá vstavaný BarcodeDetector, preto načítame ponyfill (ZXing cez WebAssembly)
const BD_URL = 'https://cdn.jsdelivr.net/npm/barcode-detector@3.0.8/dist/es/ponyfill.min.js';
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
let Detector = null;

async function getDetector() {
  if (Detector) return Detector;
  if ('BarcodeDetector' in window) {
    try { const f = await window.BarcodeDetector.getSupportedFormats(); if (f.includes('ean_13')) return (Detector = window.BarcodeDetector); } catch (_) { }
  }
  const m = await import(BD_URL);
  return (Detector = m.BarcodeDetector);
}

const ICON_TORCH = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8v4l-2 3v13h-4V9L8 6z"/><path d="M12 13v2"/></svg>';
const ICON_KEY = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>';

// Vráti naskenovaný alebo ručne zadaný kód, alebo null pri zrušení
export function scanBarcode() {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.className = 'scanner';
    el.innerHTML = `
      <video playsinline muted autoplay></video>
      <div class="sc-shade"></div>
      <div class="sc-top">
        <button class="sc-btn sc-cancel" data-cancel>Zrušiť</button>
        <button class="sc-btn sc-round" data-torch hidden aria-label="Baterka">${ICON_TORCH}</button>
      </div>
      <h2 class="sc-title">Naskenuj čiarový kód</h2>
      <div class="sc-box"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><b class="sc-line"></b></div>
      <p class="sc-hint" data-hint>Spúšťam kameru…</p>
      <div class="sc-bottom">
        <div class="sc-manual" data-manual hidden><input class="input mono" inputmode="numeric" placeholder="Číslo pod čiarovým kódom" maxlength="14"><button class="btn sm primary" data-go>Hľadať</button></div>
        <button class="sc-btn sc-pill" data-type>${ICON_KEY}<span>Zadať kód ručne</span></button>
      </div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('no-scroll');

    const $ = s => el.querySelector(s);
    const video = $('video'), hint = $('[data-hint]'), torchBtn = $('[data-torch]');
    let stream = null, track = null, timer = null, closed = false, torch = false;
    let audio = null;
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { }

    const close = (code = null) => {
      if (closed) return; closed = true;
      clearTimeout(timer);
      if (track && torch) track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => { });
      if (stream) stream.getTracks().forEach(t => t.stop());
      document.documentElement.classList.remove('no-scroll');
      el.classList.add('out');
      setTimeout(() => el.remove(), 180);
      resolve(code);
    };
    const beep = () => {
      try {
        if (!audio) return;
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine'; o.frequency.value = 1320; g.gain.value = 0.08;
        o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.12);
      } catch (_) { }
      if (navigator.vibrate) navigator.vibrate(50);
    };
    const success = code => { beep(); el.classList.add('ok'); hint.textContent = code; setTimeout(() => close(code), 280); };

    $('[data-cancel]').onclick = () => close(null);
    $('[data-type]').onclick = () => { const m = $('[data-manual]'); m.hidden = false; m.querySelector('input').focus(); };
    const submitManual = () => { const v = $('[data-manual] input').value.replace(/\D/g, ''); if (v.length >= 6) close(v); else hint.textContent = 'Kód má mať aspoň 6 číslic'; };
    $('[data-go]').onclick = submitManual;
    $('[data-manual] input').addEventListener('keydown', e => { if (e.key === 'Enter') submitManual(); });
    torchBtn.onclick = async () => {
      if (!track) return;
      try { await track.applyConstraints({ advanced: [{ torch: !torch }] }); torch = !torch; torchBtn.classList.toggle('on', torch); }
      catch (_) { hint.textContent = 'Baterku sa nepodarilo zapnúť'; }
    };

    (async () => {
      const dP = getDetector(); dP.catch(() => { });
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      } catch (e) {
        hint.textContent = e && e.name === 'NotAllowedError' ? 'Prístup ku kamere je zamietnutý. Povoľ ho v Nastaveniach alebo zadaj kód ručne.' : 'Kamera sa nespustila. Zadaj kód ručne.';
        $('[data-manual]').hidden = false; return;
      }
      if (closed) { stream.getTracks().forEach(t => t.stop()); return; }
      track = stream.getVideoTracks()[0];
      try { const caps = track.getCapabilities ? track.getCapabilities() : {}; if (caps.torch) torchBtn.hidden = false; } catch (_) { }
      try { const caps = track.getCapabilities ? track.getCapabilities() : {}; if (caps.focusMode && caps.focusMode.includes('continuous')) track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => { }); } catch (_) { }
      video.srcObject = stream; await video.play().catch(() => { });

      let D;
      try { D = await dP; } catch (_) { hint.textContent = 'Čítačka sa nenačítala (slabý internet?). Zadaj kód ručne.'; $('[data-manual]').hidden = false; return; }
      if (closed) return;
      const det = new D({ formats: FORMATS });
      hint.textContent = 'Daj čiarový kód do rámčeka';

      // čítame len výrez v rámčeku: rýchlejšie a presnejšie (každý 3. pokus celý obraz ako poistka)
      const canvas = document.createElement('canvas'), ctx2 = canvas.getContext('2d', { willReadFrequently: true });
      const box = $('.sc-box');
      let last = '', hits = 0, n = 0;
      const crop = () => {
        const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return null;
        const r = video.getBoundingClientRect(), b = box.getBoundingClientRect();
        const scale = Math.max(r.width / vw, r.height / vh); // object-fit: cover
        const ox = (r.width - vw * scale) / 2, oy = (r.height - vh * scale) / 2;
        const pad = 0.15 * b.width;
        let sx = (b.left - r.left - ox - pad) / scale, sy = (b.top - r.top - oy - pad) / scale;
        let sw = (b.width + 2 * pad) / scale, sh = (b.height + 2 * pad) / scale;
        sx = Math.max(0, sx); sy = Math.max(0, sy); sw = Math.min(vw - sx, sw); sh = Math.min(vh - sy, sh);
        const k = Math.min(1, 900 / Math.max(sw, sh));
        canvas.width = Math.round(sw * k); canvas.height = Math.round(sh * k);
        ctx2.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        return canvas;
      };
      const tick = async () => {
        if (closed) return;
        try {
          if (video.readyState >= 2) {
            const src = (n++ % 3 === 2) ? video : (crop() || video);
            const codes = await det.detect(src);
            const c = codes.map(x => x.rawValue).find(v => /^[0-9]{6,14}$/.test(v));
            // rovnaký kód 2x po sebe = istota, že to nie je chybné čítanie
            if (c) { hits = c === last ? hits + 1 : 1; last = c; if (hits >= 2) return success(c); }
          }
        } catch (_) { }
        timer = setTimeout(tick, 90);
      };
      tick();
    })();
  });
}
