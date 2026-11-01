// Realistický 3D avatar cez Avaturn (v312). Editor beží na celej obrazovke v okne Avaturnu (náš projekt davidd171.avaturn.dev):
// človek sa odfotí alebo vyberie hotovú postavu a upraví vlasy, oblečenie, okuliare a topánky. Po „Next“ dostaneme 3D model (GLB),
// z ktorého v telefóne vykreslíme portrét hlavy a ramien (512 × 512) a uložíme ho ako profilovku. Samotný 3D model neukladáme.
// Knižnice (Avaturn SDK, three.js) sa načítajú až pri otvorení editora, appku pri štarte nespomaľujú.
import { ctx } from './app.js';
import { uploadAvatarBlob, uploadErr } from './avatarmaker.js';

const SUB = 'davidd171';
const SDK = 'https://cdn.jsdelivr.net/npm/@avaturn/sdk@1.1.4/+esm';
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js/+esm';

const CSS = `
.avt{position:fixed;inset:0;z-index:90;display:flex;flex-direction:column;background:#0B0E13;color:#fff;animation:avtIn .25s ease both}
@keyframes avtIn{from{opacity:0}to{opacity:1}}
.avt-top{flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(env(safe-area-inset-top) + 10px) 14px 10px}
.avt-top b{font-size:16px;font-weight:800}
.avt-top button{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;font:inherit;font-size:22px;line-height:1;cursor:pointer}
.avt-box{position:relative;flex:1;min-height:0}
.avt-box iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.avt-msg{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;background:#0B0E13;z-index:2}
.avt-msg div{max-width:300px}.avt-msg p{margin:10px 0 0;color:rgba(255,255,255,.7);font-size:14px;line-height:1.5}
.avt-spin{width:42px;height:42px;margin:0 auto;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:var(--accent,#7CFFB2);animation:avtSp 1s linear infinite}
@keyframes avtSp{to{transform:rotate(360deg)}}
.avt-msg img{width:150px;height:150px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px rgba(255,255,255,.12)}
.avt-msg .btn{margin-top:16px}
@media (prefers-reduced-motion:reduce){.avt,.avt-spin{animation:none}}
`;

// portrét z 3D modelu: kamera na hlavu a ramená, mäkké svetlo, pozadie v farbách appky
async function portrait(glbUrl) {
  const THREE = await import(THREE_URL);
  const { GLTFLoader } = await import(GLTF_URL);
  const gltf = await new GLTFLoader().loadAsync(glbUrl);
  const model = gltf.scene;
  const N = 512;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(N, N, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.add(model);
  model.updateMatrixWorld(true);
  // hlava: kosť "Head" (bežná pri Avaturn/Mixamo kostre), inak horná časť modelu
  let head = null;
  model.traverse(o => { if (!head && o.isBone && /(^|[:_])head$/i.test(o.name)) head = o; });
  const box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
  const hp = new THREE.Vector3();
  if (head) head.getWorldPosition(hp); else hp.set((box.min.x + box.max.x) / 2, box.max.y - size.y * 0.08, (box.min.z + box.max.z) / 2);
  const target = new THREE.Vector3(hp.x, hp.y - size.y * 0.03, hp.z);
  // smer tváre: glTF postavy pozerajú do +Z
  const cam = new THREE.PerspectiveCamera(24, 1, 0.05, 50);
  const frame = size.y * 0.30; // výška záberu: hlava a ramená
  const dist = frame / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
  cam.position.set(target.x, target.y + size.y * 0.01, target.z + dist);
  cam.lookAt(target);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(target.x + 1.2, target.y + 1.4, target.z + 2); scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfd9ff, 0.8); fill.position.set(target.x - 1.5, target.y + 0.4, target.z + 1.2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4); rim.position.set(target.x, target.y + 1, target.z - 2); scene.add(rim);
  renderer.render(scene, cam);
  // zloženie: farebné pozadie + avatar
  const out = document.createElement('canvas'); out.width = N; out.height = N;
  const g = out.getContext('2d');
  const gr = g.createLinearGradient(0, 0, N, N); gr.addColorStop(0, '#2A3B52'); gr.addColorStop(1, '#141A24'); g.fillStyle = gr; g.fillRect(0, 0, N, N);
  const glow = g.createRadialGradient(N * 0.5, N * 0.38, 10, N * 0.5, N * 0.45, N * 0.6); glow.addColorStop(0, 'rgba(124,255,178,.30)'); glow.addColorStop(1, 'rgba(124,255,178,0)'); g.fillStyle = glow; g.fillRect(0, 0, N, N);
  g.drawImage(renderer.domElement, 0, 0, N, N);
  renderer.dispose(); scene.traverse(o => { o.geometry?.dispose?.(); [].concat(o.material || []).forEach(m => { Object.values(m || {}).forEach(v => v?.isTexture && v.dispose()); m?.dispose?.(); }); });
  return new Promise((res, rej) => out.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/jpeg', 0.9));
}

export async function openAvaturn() {
  if (document.querySelector('.avt')) return;
  if (!document.getElementById('avtCss')) { const s = document.createElement('style'); s.id = 'avtCss'; s.textContent = CSS; document.head.appendChild(s); }
  const el = document.createElement('div'); el.className = 'avt'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Realistický 3D avatar');
  el.innerHTML = `<div class="avt-top"><b>3D avatar</b><button type="button" data-x aria-label="Zavrieť">×</button></div>
    <div class="avt-box"><div class="avt-msg" data-msg><div><div class="avt-spin"></div><p>Otváram editor avatara…</p></div></div></div>`;
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  const box = el.querySelector('.avt-box'), msg = el.querySelector('[data-msg]');
  let sdk = null, done = false;
  const close = () => { try { sdk?.destroy(); } catch (_) { } el.remove(); document.body.style.overflow = ''; };
  el.querySelector('[data-x]').onclick = close;
  const show = (html) => { msg.hidden = false; msg.innerHTML = `<div>${html}</div>`; };
  try {
    const { AvaturnSDK } = await import(SDK);
    if (!el.isConnected) return;
    // povolenie fotoaparátu pre selfie: iframe dostane allow ešte pred vložením do stránky
    const orig = box.appendChild.bind(box);
    box.appendChild = node => { if (node && node.tagName === 'IFRAME') { node.allow = 'camera *; microphone *; clipboard-write *; fullscreen *'; node.setAttribute('allowfullscreen', ''); } return orig(node); };
    sdk = new AvaturnSDK();
    await sdk.init(box, { url: `https://${SUB}.avaturn.dev` });
    msg.hidden = true;
    sdk.on('export', async data => {
      if (done) return; done = true;
      show('<div class="avt-spin"></div><p>Robím z avatara profilovku…</p>');
      try {
        const blob = await portrait(data.url);
        const url = await uploadAvatarBlob(blob);
        show(`<img src="${url}" alt=""><p>Hotovo, toto je tvoja nová profilovka.</p><button class="btn primary" type="button" data-ok>Super</button>`);
        msg.querySelector('[data-ok]').onclick = close;
        try { navigator.vibrate?.([20, 40, 20]); } catch (_) { }
      } catch (err) {
        done = false;
        show(`<p>${ctx.h(/bucket|policy|avatar_url|row-level|not found/i.test(err?.message || '') ? uploadErr(err) : 'Z avatara sa nepodarilo spraviť profilovku. Skús to znova.')}</p><button class="btn primary" type="button" data-again>Späť do editora</button>`);
        msg.querySelector('[data-again]').onclick = () => { msg.hidden = true; };
      }
    });
  } catch (err) {
    show('<p>Editor avatara sa nepodarilo načítať. Skontroluj internet a skús to znova.</p><button class="btn primary" type="button" data-close>Zavrieť</button>');
    msg.querySelector('[data-close]').onclick = close;
  }
}
