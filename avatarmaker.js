// Profilová fotka (v312). Ťuknutím na koliesko v Profile sa otvorí okno s dvoma možnosťami:
//   * Nahrať fotku: galéria, fotoaparát alebo súbory (telefón ponúkne sám), posun a priblíženie v kruhu, zmenšenie na 512 px
//   * Avatar štúdio (avatarstudio.js): vlastný editor ako v Messengeri, avatara nakreslí AI z volieb, voliteľne podľa tvojej fotky
// Výsledok je vždy obrázok v priečinku avatars/<id>/<náhodný názov>.jpg (adresa sa nedá uhádnuť) a jeho adresa v profiles.avatar_url.
import { sb } from './data.js';
import { ctx } from './app.js';
import { avatarInner } from './avatarimg.js';

const CSS = `
.avm-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.avm-h h3{margin:0;font-size:22px;font-weight:800;letter-spacing:-.02em}
.avm-x{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--bg-2,var(--card-2));color:var(--text);font-size:22px;line-height:1;display:grid;place-items:center;cursor:pointer}
.avm-pv{display:grid;place-items:center;margin:4px 0 18px}
.avm-pv>div{width:136px;height:136px;border-radius:50%;overflow:hidden;display:grid;place-items:center;font-size:46px;font-weight:800;color:var(--accent);background:radial-gradient(120% 120% at 30% 15%,#2a3d34,#131b17);box-shadow:0 14px 34px -12px rgba(0,0,0,.55),0 0 0 4px var(--card-2),0 0 0 5px var(--line)}
.avm-pv>div>img{width:100%;height:100%;object-fit:cover}
.avm-opt{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:16px;margin-bottom:10px;border-radius:20px;border:1px solid var(--line);background:var(--card-2);color:var(--text);font:inherit;cursor:pointer}
.avm-opt>i{flex:none;width:48px;height:48px;border-radius:15px;display:grid;place-items:center;font-style:normal;font-size:24px;background:color-mix(in srgb,var(--accent) 16%,transparent)}
.avm-opt.pro>i{background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 40%,transparent),color-mix(in srgb,#8C8CFF 40%,transparent))}
.avm-opt div{flex:1;min-width:0}.avm-opt b{display:block;font-size:16px;font-weight:800}.avm-opt small{display:block;margin-top:3px;color:var(--muted);font-size:13px;line-height:1.4}
.avm-opt span{color:var(--muted);font-size:20px}
.avm-note{margin:4px 2px 0;color:var(--muted);font-size:12px;line-height:1.5}
.avm-rm{display:block;width:100%;margin-top:6px;padding:12px;border:0;background:none;color:var(--muted);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.avm-act{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.avm-act .btn{width:100%!important;min-width:0;margin:0!important}
.avm-crop{position:relative;width:100%;max-width:300px;aspect-ratio:1;margin:0 auto 12px;border-radius:24px;overflow:hidden;background:#000;touch-action:none;cursor:grab}
.avm-crop img{position:absolute;left:50%;top:50%;max-width:none;user-select:none;-webkit-user-drag:none;pointer-events:none;transform-origin:center}
.avm-crop::after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at center,transparent 0,transparent calc(50% - 1px),rgba(0,0,0,.55) 50%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)}
.avm-zoom{display:flex;align-items:center;gap:10px;margin:0 4px 6px;color:var(--muted);font-size:13px}.avm-zoom input{flex:1;accent-color:var(--accent)}
.avm-hint{text-align:center;color:var(--muted);font-size:12.5px;margin:0 0 4px}
`;
function css() { if (document.getElementById('avmCss')) return; const s = document.createElement('style'); s.id = 'avmCss'; s.textContent = CSS; document.head.appendChild(s); }
const initials = n => { const w = String(n || '').trim().split(/\s+/).filter(Boolean); return ((w[0]?.[0] || '?') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase(); };

async function saveProfile(patch) {
  const me = ctx.state.profile;
  const { data, error } = await sb.from('profiles').update(patch).eq('id', me.id).select().single();
  if (error) throw new Error(error.message);
  Object.assign(me, data || patch);
  try { window.dispatchEvent(new CustomEvent('fw-avatar', { detail: { avatar_url: me.avatar_url } })); } catch (_) { }
  return me;
}
const pathOf = url => { const m = /\/storage\/v1\/object\/public\/avatars\/(.+)$/.exec(url || ''); return m ? decodeURIComponent(m[1]) : null; };
async function removeOldPhoto(url) { const p = pathOf(url); if (p) { try { await sb.storage.from('avatars').remove([p]); } catch (_) { } } }

// nahrá hotový štvorcový obrázok (JPEG) ako profilovku; použije ho aj Avatar štúdio
export async function uploadAvatarBlob(blob) {
  const me = ctx.state.profile;
  const rnd = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '');
  const path = `${me.id}/${rnd}.jpg`;
  const up = await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' });
  if (up.error) throw up.error;
  const pub = sb.storage.from('avatars').getPublicUrl(path).data?.publicUrl;
  if (!pub) throw new Error('url');
  const old = me.avatar_url;
  await saveProfile({ avatar_url: pub });
  if (old && old !== pub) removeOldPhoto(old);
  return pub;
}
export const uploadErr = err => /bucket|not found|avatar_url|row-level|policy/i.test(err?.message || '') ? 'Profilové fotky ešte nie sú zapnuté na serveri' : 'Fotku sa nepodarilo nahrať. Skús to znova.';

export function openAvatar() {
  css();
  const me = ctx.state?.profile; if (!me) return;
  const h = s => ctx.h(s);
  const bg = ctx.sheet('<div id="avmBody"></div>');
  const body = bg.querySelector('#avmBody');
  const close = () => bg.remove();

  const draw = () => {
    body.innerHTML = `<div class="avm-h"><h3>Profilová fotka</h3><button class="avm-x" data-x aria-label="Zavrieť">×</button></div>
      <div class="avm-pv"><div>${avatarInner(me, 136) || h(initials(me.name))}</div></div>
      <button class="avm-opt" type="button" data-pick><i>📷</i><div><b>Nahrať fotku</b><small>Z galérie, fotoaparátu alebo súborov</small></div><span>›</span></button>
      <button class="avm-opt pro" type="button" data-studio><i>✨</i><div><b>Vytvoriť avatara</b><small>Realistický avatar podľa teba: pleť, vlasy, brada, oblečenie aj pozadie</small></div><span>›</span></button>
      ${me.avatar_url ? '<button class="avm-rm" type="button" data-rm>Odstrániť fotku</button>' : ''}
      <input type="file" accept="image/*" data-file hidden>`;
    body.querySelector('[data-x]').onclick = close;
    const file = body.querySelector('[data-file]');
    body.querySelector('[data-pick]').onclick = () => file.click();
    file.onchange = () => { const f = file.files?.[0]; if (f) cropper(f); };
    body.querySelector('[data-studio]').onclick = async () => {
      close();
      try { (await import('./avatarstudio.js')).openAvatarStudio(); } catch (_) { ctx.toast('Avatar štúdio sa nepodarilo otvoriť', true); }
    };
    body.querySelector('[data-rm]')?.addEventListener('click', async () => {
      try { const old = me.avatar_url; await saveProfile({ avatar_url: null }); if (old) removeOldPhoto(old); ctx.toast('Fotka odstránená'); close(); }
      catch (_) { ctx.toast('Nepodarilo sa uložiť', true); }
    });
  };

  // ---------- orez fotky ----------
  const cropper = (f) => {
    if (!/^image\//.test(f.type || 'image/') || f.size > 25e6) { ctx.toast('Vyber obrázok do 25 MB', true); return; }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      let z = 1, x = 0, y = 0;
      body.innerHTML = `<div class="avm-h"><h3>Uprav fotku</h3><button class="avm-x" data-back aria-label="Späť">×</button></div>
        <div class="avm-crop" data-c><img src="${url}" alt=""></div>
        <p class="avm-hint">Posuň fotku prstom, priblíž posuvníkom</p>
        <label class="avm-zoom"><span>−</span><input type="range" min="1" max="3" step="0.01" value="1" aria-label="Priblíženie"><span>+</span></label>
        <div class="avm-act"><button class="btn ghost" type="button" data-back2>Iná fotka</button><button class="btn primary" type="button" data-up>Použiť fotku</button></div>`;
      const box = body.querySelector('[data-c]'), el = box.querySelector('img'), rng = body.querySelector('input[type=range]');
      const W = () => box.clientWidth;
      const base = () => W() / Math.min(img.naturalWidth, img.naturalHeight); // obrázok vždy pokryje celý štvorec
      const clamp = () => { const s = base() * z, mx = Math.max(0, (img.naturalWidth * s - W()) / 2), my = Math.max(0, (img.naturalHeight * s - W()) / 2); x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y)); };
      const paint = () => { clamp(); const s = base() * z; el.style.width = img.naturalWidth + 'px'; el.style.height = img.naturalHeight + 'px'; el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${s})`; };
      paint();
      let drag = null;
      box.addEventListener('pointerdown', e => { drag = { px: e.clientX, py: e.clientY, x, y }; box.setPointerCapture(e.pointerId); });
      box.addEventListener('pointermove', e => { if (!drag) return; x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; paint(); });
      const end = () => { drag = null; }; box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
      rng.oninput = () => { z = Number(rng.value); paint(); };
      body.querySelector('[data-back]').onclick = () => { URL.revokeObjectURL(url); draw(); };
      body.querySelector('[data-back2]').onclick = () => { URL.revokeObjectURL(url); draw(); body.querySelector('[data-file]')?.click(); };
      body.querySelector('[data-up]').onclick = async e => {
        const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Nahrávam…';
        try {
          const N = 512, cv = document.createElement('canvas'); cv.width = N; cv.height = N;
          const g = cv.getContext('2d'); const s = base() * z, k = N / W();
          g.fillStyle = '#fff'; g.fillRect(0, 0, N, N);
          g.translate(N / 2 + x * k, N / 2 + y * k); g.scale(s * k, s * k); g.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.86));
          if (!blob) throw new Error('blob');
          await uploadAvatarBlob(blob);
          URL.revokeObjectURL(url); ctx.toast('Fotka uložená'); close();
        } catch (err) { ctx.toast(uploadErr(err), true); btn.disabled = false; btn.textContent = 'Použiť fotku'; }
      };
    };
    img.onerror = () => { URL.revokeObjectURL(url); ctx.toast('Tento obrázok sa nedá otvoriť. Skús inú fotku.', true); };
    img.src = url;
  };
  draw();
}
try { window.fwAvatar = openAvatar; } catch (_) { }
