// Profilová fotka (v312): fotka z galérie alebo realistický 3D avatar z Avaturnu, oboje uložené ako obrázok v priečinku avatars.
// Keď fotka nie je, zobrazia sa farebné iniciály (rieši volajúci).
const OK = /^https:\/\/uxzwqyjbzkcveoxsdqdv\.supabase\.co\/storage\/v1\/object\/public\/avatars\//;
export function avatarInner(p = {}, size = 40) {
  const u = p && p.avatar_url;
  if (!u || !OK.test(u)) return null;
  return `<img src="${String(u).replace(/"/g, '&quot;')}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block">`;
}
