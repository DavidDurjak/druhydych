// Novinky: krátke zhrnutia nových štúdií o tréningu, výžive a regenerácii.
// Server (news-fetch) ich stiahne a AI zhrnie, do appky sa dostanú až po schválení adminom.
import { sb } from './data.js';
import { isAdmin } from './admin.js';
import { ctx } from './app.js';
import './recap.js';

const h = (...a) => ctx.h(...a);
const CATS = [['all', 'Všetko'], ['training', 'Tréning'], ['nutrition', 'Výživa'], ['recovery', 'Regenerácia']];
const CAT = { training: 'Tréning', nutrition: 'Výživa', recovery: 'Regenerácia' };
const EVID = { human: 'Štúdia na ľuďoch', review: 'Súhrnná práca', opinion: 'Tlačová správa', animal: 'Štúdia' };
const SEEN = 'fw_news_seen';

const CSS = `
.nw-card{display:block;width:100%;text-align:left;font:inherit;color:var(--text);-webkit-appearance:none;appearance:none;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:14px 16px;margin-bottom:14px;cursor:pointer}
.nw-top{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);margin-bottom:6px}
.nw-top b{color:var(--accent);font-weight:700}
.nw-new{background:var(--accent);color:var(--accent-ink,#06140c);font-size:11px;font-weight:800;padding:2px 8px;border-radius:99px}
.nw-card h3{font-size:16px;line-height:1.3}
.nw-card p{font-size:13px;color:var(--muted);margin-top:4px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.nw-seg{display:flex;gap:6px;overflow-x:auto;margin:12px 0 4px;padding-bottom:2px}
.nw-seg button{-webkit-appearance:none;appearance:none;flex:0 0 auto;font:inherit;font-size:13px;color:var(--text);padding:8px 13px;border-radius:99px;border:1px solid var(--line);background:var(--bg-2);cursor:pointer}
.nw-seg button.on{border-color:var(--accent);background:rgba(124,255,178,.14);color:var(--accent);font-weight:700}
.nw-it{padding:14px 0;border-bottom:1px solid var(--line)}
.nw-it:last-child{border-bottom:0}
.nw-it h3{font-size:16px;line-height:1.3}
.nw-it .nw-s{font-size:14px;line-height:1.45;margin-top:6px}
.nw-it .nw-w{font-size:14px;line-height:1.45;margin-top:8px;padding:10px 12px;border-radius:14px;background:var(--bg-2)}
.nw-it .nw-w b{color:var(--accent)}
.nw-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:12px;color:var(--muted);margin-top:8px}
.nw-meta a{color:var(--accent);font-weight:700;text-decoration:none}
.nw-adm{margin-top:14px;padding:12px;border-radius:16px;border:1px dashed var(--accent)}
.nw-adm h4{font-size:14px;margin-bottom:2px}
.nw-act{display:flex;gap:8px;margin-top:10px}
.nw-act button{-webkit-appearance:none;appearance:none;flex:1;font:inherit;font-size:14px;font-weight:700;padding:10px;border-radius:12px;border:1px solid var(--line);background:var(--bg-2);color:var(--text);cursor:pointer}
.nw-act button.go{background:var(--accent);border-color:var(--accent);color:var(--accent-ink,#06140c)}
.nw-foot{font-size:12px;color:var(--muted);line-height:1.4;margin-top:14px}
`;
if (typeof document !== 'undefined' && !document.getElementById('nw-css')) { const s = document.createElement('style'); s.id = 'nw-css'; s.textContent = CSS; document.head.appendChild(s); }

let cache = null;
const seenId = () => { try { return Number(localStorage.getItem(SEEN) || 0); } catch (_) { return 0; } };
const markSeen = id => { try { localStorage.setItem(SEEN, String(id)); } catch (_) { } };

async function load() {
  const { data, error } = await sb.from('news').select('id,created_at,published_at,title,summary,why,category,evidence,source_name,source_url,status')
    .order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(60);
  if (error) throw error;
  cache = data || [];
  return cache;
}

const cardHtml = (items, admin) => {
  const ok = items.filter(i => i.status === 'approved'), pend = items.filter(i => i.status === 'pending');
  const top = ok[0];
  if (!top && !(admin && pend.length)) return '';
  const isNew = top && top.id > seenId();
  if (!top) return `<button class="nw-card" data-nw><div class="nw-top"><b>Novinky</b><span class="nw-new">${pend.length} na schválenie</span></div><h3>Pozri, čo AI našla</h3></button>`;
  return `<button class="nw-card" data-nw><div class="nw-top"><b>Novinka</b><span>${h(CAT[top.category] || '')}</span>${isNew ? '<span class="nw-new">nové</span>' : ''}${admin && pend.length ? `<span class="nw-new">${pend.length} na schválenie</span>` : ''}</div><h3>${h(top.title)}</h3><p>${h(top.summary)}</p></button>`;
};

export function mountNews(root, anchorSel = '.rd-card') {
  const anchor = root.querySelector(anchorSel);
  if (!anchor) return;
  const slot = document.createElement('div'); slot.id = 'newsSlot';
  anchor.after(slot);
  let admin = false;
  const paint = items => {
    slot.innerHTML = cardHtml(items, admin);
    slot.querySelector('[data-nw]')?.addEventListener('click', () => openNews(items, admin, () => paint(cache || items)));
  };
  if (cache) paint(cache);
  Promise.all([load(), isAdmin().catch(() => false)]).then(([items, a]) => { admin = a; paint(items); }).catch(() => { });
}

function openNews(items, admin, onChange) {
  let tab = 'all';
  const bg = ctx.sheet('');
  const ok = () => cache.filter(i => i.status === 'approved');
  const itemHtml = (i, pending) => `<div class="nw-it" data-id="${i.id}">
      <h3>${h(i.title)}</h3>
      <p class="nw-s">${h(i.summary)}</p>
      ${i.why ? `<p class="nw-w"><b>Pre teba:</b> ${h(i.why)}</p>` : ''}
      <div class="nw-meta"><span>${h(CAT[i.category] || '')}</span><span>${h(EVID[i.evidence] || '')}</span><a href="${h(i.source_url)}" target="_blank" rel="noopener noreferrer">Zdroj: ${h(i.source_name)} ↗</a></div>
      ${pending ? `<div class="nw-act"><button data-no="${i.id}">Zahodiť</button><button class="go" data-yes="${i.id}">Pustiť do appky</button></div>` : ''}
    </div>`;
  const draw = () => {
    const list = ok().filter(i => tab === 'all' || i.category === tab);
    const pend = admin ? cache.filter(i => i.status === 'pending') : [];
    bg.querySelector('.sheet').innerHTML = `
      <div class="row between"><h2>Novinky</h2><button class="del" data-x aria-label="Zavrieť">×</button></div>
      <p class="muted small">Nové štúdie o tréningu, jedle a regenerácii, zhrnuté po slovensky.</p>
      ${pend.length ? `<div class="nw-adm"><h4>Na schválenie (${pend.length})</h4><p class="muted small">Vidíš to len ty. Skontroluj pravopis a či to dáva zmysel.</p>${pend.map(i => itemHtml(i, true)).join('')}</div>` : ''}
      <div class="nw-seg">${CATS.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${list.length ? list.map(i => itemHtml(i, false)).join('') : '<p class="muted mt">Zatiaľ tu nič nie je. Nové veci pribúdajú každý deň.</p>'}
      <p class="nw-foot">Zhrnutia píše AI z dostupných štúdií. Nie je to lekárska rada, presné údaje nájdeš v zdroji.</p>`;
    const S = bg.querySelector('.sheet');
    S.querySelector('[data-x]').onclick = () => { bg.remove(); onChange(); };
    S.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
    S.querySelectorAll('[data-yes]').forEach(b => b.onclick = () => decide(Number(b.dataset.yes), 'approved'));
    S.querySelectorAll('[data-no]').forEach(b => b.onclick = () => decide(Number(b.dataset.no), 'rejected'));
  };
  const decide = async (id, status) => {
    const patch = status === 'approved' ? { status, published_at: new Date().toISOString() } : { status };
    const { error } = await sb.from('news').update(patch).eq('id', id);
    if (error) { ctx.toast(error.message, true); return; }
    const it = cache.find(x => x.id === id); if (it) Object.assign(it, patch);
    draw();
  };
  const top = ok()[0]; if (top) markSeen(top.id);
  draw();
}
