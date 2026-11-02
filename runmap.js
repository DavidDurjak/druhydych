// Beh: mapa (Leaflet z cdnjs + podklad OpenStreetMap, v tmavom režime prefarbený na tmavo). Načíta sa až keď treba mapu.
import { paceColors, heat } from './runlib.js';

let loading = null;
export function leaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (loading) return loading;
  loading = new Promise((ok, bad) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = () => ok(window.L); s.onerror = () => { loading = null; bad(new Error('Mapa sa nenačítala. Skontroluj internet.')); };
    document.head.appendChild(s);
  });
  return loading;
}
const isLight = () => { const t = document.documentElement.dataset.theme; return t === 'light' && !document.documentElement.hasAttribute('data-lc'); };
// podklad OpenStreetMap (bez kľúča); v tmavom režime ho prefarbíme filtrom na tmavú mapu
export function tiles(L) {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
}
function darkCss() {
  if (document.getElementById('gtMapCss')) return;
  const s = document.createElement('style'); s.id = 'gtMapCss'; s.dataset.fwLight = '';
  s.textContent = '.gt-map-dark .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.95) contrast(.9) saturate(.6)}.gt-map-dark.leaflet-container{background:#1b1f26}';
  document.head.appendChild(s);
}
// mapa do elementu; voliteľne trasa zafarbená podľa tempa
export async function mapIn(el, { path, colored = true, ghost = null, interactive = true, color = '#2BD67B' } = {}) {
  const L = await leaflet();
  if (!el.isConnected) return null;
  const m = L.map(el, { zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: false, touchZoom: interactive, doubleClickZoom: interactive, boxZoom: false, keyboard: false, tap: false });
  m.attributionControl.setPrefix(false);
  darkCss(); if (!isLight()) el.classList.add('gt-map-dark');
  tiles(L).addTo(m);
  const layers = {};
  if (ghost?.length > 1) layers.ghost = L.polyline(ghost.map(q => [q[0], q[1]]), { color: '#9AA4B2', weight: 6, opacity: .55, dashArray: '2 9', lineCap: 'round' }).addTo(m);
  if (path?.length > 1) {
    const ll = path.map(q => [q[0], q[1]]);
    L.polyline(ll, { color: '#000', weight: 9, opacity: .25, lineCap: 'round', lineJoin: 'round' }).addTo(m);
    if (colored && path[0].length > 2) {
      for (const s of paceColors(path)) L.polyline(ll.slice(s.from, s.to + 1), { color: heat(s.q), weight: 5.5, lineCap: 'round', lineJoin: 'round' }).addTo(m);
    } else L.polyline(ll, { color, weight: 5.5, lineCap: 'round', lineJoin: 'round' }).addTo(m);
    const dot = (p, c) => L.circleMarker(p, { radius: 7, color: '#fff', weight: 3, fillColor: c, fillOpacity: 1 }).addTo(m);
    dot(ll[0], '#2BD67B'); dot(ll[ll.length - 1], '#FF4D5E');
    m.fitBounds(L.latLngBounds(ll).pad(0.12));
  } else if (ghost?.length > 1) m.fitBounds(layers.ghost.getBounds().pad(0.12));
  else m.setView([48.72, 19.5], 7);
  setTimeout(() => m.invalidateSize(), 60);
  return m;
}
