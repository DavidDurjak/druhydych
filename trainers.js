// Tréneri a koučing na diaľku: katalóg trénerov, profil trénera, žiadosť o koučing, pozvanie kódom, správy, prehľad klientov.
// Tréner NIE JE rola 'coach' (tá vidí všetkých). Tréner vidí len klientov, ktorí jeho žiadosť/kód prijali (RLS: is_trainer_of, supabase/sql/trainers.sql).
// Vypnutie: odstrániť `import './trainers.js'` z app.js a skryť odkazy; databáza ostáva nedotknutá.
import { ctx } from './app.js';
import * as db from './data.js';

const $app = () => ctx.$app;
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toast = (...a) => ctx.toast(...a);
const nav = (...a) => ctx.nav(...a);
const me = () => ctx.state.profile;

export const SPECS = ['Naberanie svalov', 'Chudnutie', 'Silový tréning', 'Powerlifting', 'Kulturistika', 'Fitness a bikiny', 'Výživa', 'Rehabilitácia', 'Zdravý životný štýl', 'Po pôrode', 'Seniori'];

// ---------- dáta ----------
const sbq = () => db.sb;
const real = {
  async mine(uid) { const { data } = await sbq().from('trainer_profiles').select('*').eq('user_id', uid).maybeSingle(); return data || null; },
  async list() {
    const [p, st] = await Promise.all([sbq().from('trainer_profiles').select('*').eq('status', 'published').order('created_at', { ascending: false }), sbq().rpc('trainer_stats')]);
    if (p.error) throw p.error; const m = Object.fromEntries((st.data || []).map(x => [x.trainer_id, x]));
    return (p.data || []).map(t => ({ ...t, reviews: m[t.user_id]?.reviews || 0, avg: m[t.user_id] ? Number(m[t.user_id].avg_rating) : 0 }));
  },
  async reviews(tid) { const { data } = await sbq().from('trainer_reviews').select('*').eq('trainer_id', tid).order('created_at', { ascending: false }).limit(50); return data || []; },
  async addReview(tid, uid, name, rating, body) { const { error } = await sbq().from('trainer_reviews').upsert({ trainer_id: tid, client_id: uid, client_name: name, rating, body }, { onConflict: 'trainer_id,client_id' }); if (error) throw error; },
  async report(tid, uid, reason, note) { const { error } = await sbq().from('trainer_reports').insert({ trainer_id: tid, reporter_id: uid, reason, note }); if (error && error.code !== '23505') throw error; },
  async get(id) { const { data, error } = await sbq().from('trainer_profiles').select('*').eq('user_id', id).maybeSingle(); if (error) throw error; return data; },
  async app(uid) { const { data } = await sbq().from('trainer_applications').select('*').eq('user_id', uid).maybeSingle(); return data || null; },
  async saveApp(uid, note, proof_paths) { const { error } = await sbq().from('trainer_applications').upsert({ user_id: uid, note, proof_paths, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); if (error) throw error; },
  async save(row) { const { data, error } = await sbq().from('trainer_profiles').upsert(row, { onConflict: 'user_id' }).select().single(); if (error) throw error; return data; },
  async links(uid) { const { data, error } = await sbq().from('trainer_clients').select('*').or(`trainer_id.eq.${uid},client_id.eq.${uid}`).order('created_at', { ascending: false }); if (error) throw error; return data || []; },
  async request(tid, uid, name, goal, message) {
    const ex = await sbq().from('trainer_clients').select('id,status').eq('trainer_id', tid).eq('client_id', uid).maybeSingle();
    if (ex.data) { const { error } = await sbq().from('trainer_clients').update({ status: 'requested', message, client_name: name, client_goal: goal }).eq('id', ex.data.id); if (error) throw error; return; }
    const { error } = await sbq().from('trainer_clients').insert({ trainer_id: tid, client_id: uid, status: 'requested', source: 'catalog', client_name: name, client_goal: goal, message }); if (error) throw error;
  },
  async setLink(id, status) { const { error } = await sbq().from('trainer_clients').update({ status }).eq('id', id); if (error) throw error; },
  async byCode(code) { const { data, error } = await sbq().rpc('link_trainer_by_code', { code }); if (error) throw error; return data; },
  async upload(uid, blob) {
    const path = `${uid}/avatar-${Date.now()}.jpg`;
    const { error } = await sbq().storage.from('trainer-photos').upload(path, blob, { contentType: 'image/jpeg' }); if (error) throw error;
    return sbq().storage.from('trainer-photos').getPublicUrl(path).data.publicUrl;
  },
  async checkPhoto(blob) {
    const image = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(blob); });
    const { data, error } = await sbq().functions.invoke('trainer-photo-check', { body: { image } });
    if (error || !data) return { ok: true };
    return data;
  },
  async uploadProof(uid, blob) { const path = `${uid}/proof-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`; const { error } = await sbq().storage.from('trainer-proofs').upload(path, blob, { contentType: 'image/jpeg' }); if (error) throw error; return path; },
  async signed(paths) { const out = []; for (const p of paths || []) { const { data } = await sbq().storage.from('trainer-proofs').createSignedUrl(p, 3600); if (data?.signedUrl) out.push(data.signedUrl); } return out; },
  async pending() { const { data, error } = await sbq().from('trainer_profiles').select('*').eq('status', 'pending').order('updated_at', { ascending: true }); if (error) throw error; const ids = (data || []).map(x => x.user_id); const ap = ids.length ? (await sbq().from('trainer_applications').select('*').in('user_id', ids)).data || [] : []; const m = Object.fromEntries(ap.map(a => [a.user_id, a])); return (data || []).map(t => ({ ...t, application_note: m[t.user_id]?.note || null, proof_paths: m[t.user_id]?.proof_paths || [] })); },
  async decide(uid, ok, note) { const row = ok ? { status: 'published', approved: true, review_note: null } : { status: 'rejected', review_note: note || 'Žiadosť sme zamietli.' }; const { error } = await sbq().from('trainer_profiles').update(row).eq('user_id', uid); if (error) throw error; },
  async names(ids) { if (!ids.length) return {}; const { data } = await sbq().from('trainer_profiles').select('user_id,display_name,photo_url').in('user_id', ids); return Object.fromEntries((data || []).map(x => [x.user_id, x])); },
  async thread(uid, other) { const m = await db.listMessages(uid); return m.filter(x => x.from_user === other || x.to_user === other); },
};
const api = () => (typeof window !== 'undefined' && window.__trMock) || real;

export async function loadMine(uid) { return api().mine(uid); }

// ---------- vzhľad ----------
const CSS = `
.tr-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.tr-top h1{margin:0}
.tr-sub{color:var(--muted);font-size:14px;margin:-6px 0 14px;line-height:1.45}
.tr-search{display:flex;gap:8px;margin-bottom:10px}
.tr-search .input{flex:1}
.tr-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;margin:0 -16px;padding-left:16px;padding-right:16px;scrollbar-width:none}
.tr-chips::-webkit-scrollbar{display:none}
.tr-chip{flex:none;padding:8px 14px;border-radius:99px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--text);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;white-space:nowrap}
.tr-chip.on{background:linear-gradient(135deg,#9DFFC8,#3FE0A8);color:#06140C;border-color:transparent}
.tr-card{display:flex;gap:14px;padding:14px;margin-bottom:12px;border-radius:22px;background:var(--card);border:1px solid var(--line);text-decoration:none;color:var(--text);position:relative;overflow:hidden;box-shadow:0 14px 34px -22px rgba(0,0,0,.8)}
.tr-card:active{transform:scale(.99)}
.tr-av{flex:none;width:76px;height:76px;border-radius:20px;background-size:cover;background-position:center;display:grid;place-items:center;font-size:26px;font-weight:800;color:rgba(255,255,255,.92);letter-spacing:-.02em;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
.tr-av.lg{width:104px;height:104px;border-radius:28px;font-size:36px}
.tr-body{min-width:0;flex:1;display:grid;gap:4px;align-content:start}
.tr-name{display:flex;align-items:center;gap:6px;font-size:17px;font-weight:800;letter-spacing:-.02em}
.tr-name svg{flex:none;width:17px;height:17px;fill:#5BB8FF}
.tr-li svg{width:15px;height:15px;fill:#5BB8FF;vertical-align:-3px;margin-left:2px}
.tr-hl{font-size:13.5px;color:var(--muted);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tr-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.tr-tag{padding:4px 9px;border-radius:99px;font-size:11.5px;font-weight:700;background:rgba(255,255,255,.07);color:var(--text)}
.tr-pf{display:block;margin-top:6px;padding:8px 12px;border-radius:12px;border:1px dashed rgba(255,255,255,.18);font-size:12.5px;font-weight:600;color:var(--muted);cursor:pointer}
.tr-pf.ok{border-style:solid;border-color:rgba(124,255,178,.4);color:#9DFFC8;background:rgba(124,255,178,.08)}
.tr-tag.g{background:rgba(124,255,178,.14);color:#9DFFC8}
.tr-join,.tr-join *{text-transform:none!important;letter-spacing:normal!important;font-family:inherit}
.tr-join{display:flex;align-items:center;gap:14px;text-decoration:none;color:var(--text)}
.tr-join .tx{flex:1;min-width:0}.tr-join b{display:block;font-size:15px;font-weight:800;line-height:1.25;color:var(--text)}
.tr-join small{display:block;color:var(--muted);font-size:12.5px;line-height:1.4;margin-top:2px;font-weight:500}
.tr-join .go{flex:none;white-space:nowrap;font-weight:800;font-size:13.5px;color:#9DFFC8}
.tr-join.card{padding:14px 16px;margin-top:6px;border-radius:20px;background:rgba(255,255,255,.035);border:1px solid var(--line)}
.tr-join.row{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.09)}
.tr-join:active{opacity:.7}
.tr-pill{flex:none;padding:8px 13px;border-radius:99px;border:1px solid rgba(124,255,178,.4);background:rgba(124,255,178,.1);color:#9DFFC8!important;font-size:12.5px;font-weight:800;text-decoration:none;white-space:nowrap;text-transform:none!important;letter-spacing:normal!important}
.tr-bad{border-color:#FF6B7A!important;box-shadow:0 0 0 3px rgba(255,107,122,.2)!important}
.tr-bad.tr-shake{animation:trshake .38s}
@keyframes trshake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
.tr-ferr{color:#FF8A96;font-size:12.5px;font-weight:700;margin:6px 2px 10px;line-height:1.35}
@media (prefers-reduced-motion:reduce){.tr-bad.tr-shake{animation:none}}
.tr-perks{display:grid;grid-template-columns:repeat(4,1fr);margin:4px 0 16px;padding:14px 4px;border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.tr-perks>div{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;padding:2px 6px;min-width:0}
.tr-perks>div+div{border-left:1px solid rgba(255,255,255,.08)}
.tr-perks svg{width:22px;height:22px;stroke:#9DFFC8;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;margin-bottom:4px}
.tr-perks b{font-size:11.5px;font-weight:800;line-height:1.2;color:var(--text)}
.tr-perks span{font-size:10.5px;line-height:1.25;color:var(--muted)}
.tr-search{position:relative}
.tr-search .input{padding-left:44px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238B95A5' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:15px center;background-size:19px}
.tr-card{display:block;padding:0;gap:0}
.tr-cov{position:relative;height:196px;background-size:cover;background-position:center 22%;display:flex;flex-direction:column;justify-content:space-between;padding:12px;overflow:hidden}
.tr-cov::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,12,16,.25) 0%,rgba(8,12,16,0) 32%,rgba(8,12,16,.86) 100%);pointer-events:none}
.tr-cov>*{position:relative;z-index:1}
.tr-cov .ini{position:absolute;z-index:0;left:0;right:0;top:34px;text-align:center;font-size:74px;font-weight:800;letter-spacing:-.04em;color:rgba(255,255,255,.2)}
.tr-cov.big{height:300px;border-radius:28px;margin-bottom:14px;padding:14px}
.tr-cov.big .ini{font-size:110px;top:60px}
.tr-ctop{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.tr-glass{display:inline-flex;align-items:center;gap:4px;padding:6px 11px;border-radius:99px;font-size:12px;font-weight:800;color:#fff;background:rgba(10,14,18,.5);border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.tr-glass.g{color:#9DFFC8}.tr-glass.y{color:#FFD27A}
.tr-cbot .tr-name{font-size:21px;color:#fff;text-shadow:0 1px 12px rgba(0,0,0,.5)}
.tr-cov.big .tr-cbot .tr-name{font-size:26px}
.tr-cbot .tr-loc{font-size:12.5px;color:rgba(255,255,255,.78);margin-top:2px;font-weight:600}
.tr-cbot .tr-sub2{font-size:14px;line-height:1.4;color:rgba(255,255,255,.86);margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tr-cb{display:grid;gap:9px;padding:13px 16px 16px}
.tr-cb .tr-hl{-webkit-line-clamp:2;font-size:14px;color:rgba(255,255,255,.78)}
.tr-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px}
.tr-foot .tr-price{margin:0;font-size:13px}
.tr-go{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#9DFFC8,#3FE0A8);color:#06140C;font-size:22px;font-weight:800;line-height:1;padding-bottom:2px}
.tr-emp{display:flex;flex-direction:column;align-items:center;text-align:center;padding:38px 24px;border-radius:26px;background:rgba(255,255,255,.035);border:1px dashed rgba(255,255,255,.16)}
.tr-emp .ic{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:rgba(124,255,178,.12);margin-bottom:14px}
.tr-emp .ic svg{width:30px;height:30px;stroke:#9DFFC8;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.tr-emp b{font-size:17px;margin-bottom:6px}.tr-emp span{color:var(--muted);font-size:14px;line-height:1.45;max-width:260px}
.tag-y-placeholder{}
.tr-tag.y{background:rgba(255,210,122,.16);color:#FFD27A}
.tr-tag.b{background:rgba(91,184,255,.14);color:#8CCBFF}
.tr-price{margin-top:6px;font-size:13px;color:var(--muted)}
.tr-price b{color:var(--text);font-size:15px}
.tr-win{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#FFD27A;font-weight:700;margin-top:2px}
.tr-hero{display:flex;gap:16px;align-items:center;margin-bottom:14px}
.tr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
.tr-stats div{padding:12px 6px;border-radius:16px;background:rgba(255,255,255,.05);text-align:center}
.tr-stats b{display:block;font-size:20px;font-weight:800;font-variant-numeric:tabular-nums}
.tr-stats span{font-size:11.5px;color:var(--muted)}
.tr-sec{margin-bottom:12px}
.tr-sec h3{margin:0 0 8px;font-size:15px}
.tr-call{position:fixed;inset:0;z-index:99999;background:#06090F;display:flex;flex-direction:column}
.tr-call-top{display:flex;align-items:center;justify-content:space-between;padding:calc(10px + env(safe-area-inset-top)) 14px 10px}
.tr-call iframe{flex:1;border:0;width:100%;background:#000}
.tr-danger{background:#E5484D!important;color:#fff!important;border-color:#E5484D!important;font-weight:800}
.tr-rev{overflow:hidden}
.tr-rev *{overflow-wrap:anywhere;word-break:break-word;min-width:0}
.tr-checks{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.tr-kv{padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}
.tr-kv>span{display:block;font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:4px}
.tr-kv>div{font-size:14.5px;line-height:1.45}
.tr-kv em{color:var(--muted);font-style:normal}
.tr-txt{white-space:pre-wrap}
.tr-lnk{color:#9DFFC8;text-decoration:underline;display:block}
.tr-arow{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:6px 0}
.tr-arow small{display:block;color:var(--muted)}
.tr-arow em{display:block;font-size:12px;color:#FFD27A}
.tr-pthumb{width:72px;height:72px;object-fit:cover;border-radius:12px;flex:none;display:block}
.tr-li{display:flex;gap:10px;align-items:baseline;padding:8px 0;border-top:1px solid rgba(255,255,255,.07);font-size:14px}
.tr-li:first-of-type{border-top:0}
.tr-li i{font-style:normal;color:var(--muted);font-size:12.5px;margin-left:auto;font-variant-numeric:tabular-nums;white-space:nowrap}
.tr-cta{position:sticky;bottom:calc(var(--nav-h,64px) + env(safe-area-inset-bottom) + 18px);z-index:20;margin-top:8px;padding:10px;border-radius:26px;background:rgba(20,26,33,.86);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.09);box-shadow:0 18px 40px -20px rgba(0,0,0,.9)}
.tr-cta .tr-note{text-align:center;margin:8px 0 0}
.tr-cta .btn{width:100%}
.tr-note{font-size:12.5px;color:var(--muted);line-height:1.45;margin:8px 2px 0}
.tr-req{display:flex;align-items:center;gap:12px;padding:12px;margin-bottom:10px;border-radius:18px;background:rgba(255,210,122,.08);border:1px solid rgba(255,210,122,.28)}
.tr-req b{display:block;font-size:15px}
.tr-req small{color:var(--muted);font-size:12.5px}
.tr-req .row2{display:flex;gap:8px;margin-left:auto}
.tr-top .row2{display:flex;gap:8px;align-items:center}
.tr-form label{display:block;margin-bottom:12px}
.tr-form label>span{display:block;font-size:12.5px;color:var(--muted);margin-bottom:5px;font-weight:600}
.tr-two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tr-code{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px;border-radius:18px;background:rgba(124,255,178,.08);border:1px dashed rgba(124,255,178,.45)}
.tr-code b{font-size:26px;letter-spacing:.14em;font-variant-numeric:tabular-nums}
.tr-me{margin-bottom:14px}
.tr-me .tr-card{margin-bottom:8px}
.tr-row{display:flex;gap:8px;flex-wrap:wrap}
.tr-chat{display:grid;gap:8px;margin-bottom:12px}
.tr-bub{max-width:82%;padding:10px 13px;border-radius:18px;font-size:14.5px;line-height:1.4;background:rgba(255,255,255,.07);justify-self:start;white-space:pre-wrap}
.tr-bub.me{justify-self:end;background:linear-gradient(135deg,#9DFFC8,#3FE0A8);color:#06140C}
.tr-bub small{display:block;opacity:.6;font-size:11px;margin-top:3px}
.tr-empty{padding:34px 18px;text-align:center;color:var(--muted);border:1.5px dashed rgba(255,255,255,.14);border-radius:22px}
.tr-empty b{display:block;color:var(--text);font-size:16px;margin-bottom:6px}
@media (max-width:360px){.tr-av{width:64px;height:64px}}
`;
if (typeof document !== 'undefined' && !document.getElementById('trcss')) { const s = document.createElement('style'); s.id = 'trcss'; s.textContent = CSS; document.head.appendChild(s); }

const GRAD = [['#2E8B6A', '#1D4E5E'], ['#6A5ACD', '#2D2A6B'], ['#C76B3B', '#6B2D2D'], ['#3B82C7', '#1F3A66'], ['#B5497C', '#4C2150'], ['#8A9A2B', '#3C4A1A']];
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const avatar = (t, lg) => {
  if (t.photo_url) return `<div class="tr-av${lg ? ' lg' : ''}" style="background-image:url('${h(t.photo_url)}')" role="img" aria-label="${h(t.display_name)}"></div>`;
  const g = GRAD[hash(t.display_name || t.user_id) % GRAD.length];
  return `<div class="tr-av${lg ? ' lg' : ''}" style="background:linear-gradient(135deg,${g[0]},${g[1]})">${h(initials(t.display_name))}</div>`;
};
const CHECK = '<svg viewBox="0 0 24 24" aria-label="Overený tréner"><path d="M12 1.8l2.6 1.9 3.2-.2 1 3 2.7 1.8-.9 3.1.9 3.1-2.7 1.8-1 3-3.2-.2L12 22.2l-2.6-1.9-3.2.2-1-3-2.7-1.8.9-3.1-.9-3.1 2.7-1.8 1-3 3.2.2z"/><path d="M8 12.3l2.7 2.7L16.2 9.5" fill="none" stroke="#06140C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const price = t => t.price_from != null ? `<div class="tr-price">od <b>${Number(t.price_from).toLocaleString('sk-SK')} €</b> / mesiac${t.price_note ? ` · ${h(t.price_note)}` : ''}</div>` : '<div class="tr-price">Cena po dohode</div>';
const best = t => (t.achievements || [])[0];
const trusted = t => t.verified || (t.reviews >= 3 && t.avg >= 4.5);
const score = t => (t.verified ? 100 : 0) + (t.reviews ? t.avg * 10 + Math.min(t.reviews, 20) : 0);
const stars = t => t.reviews ? `<span class="tr-tag y">★ ${t.avg.toFixed(1).replace('.', ',')} (${t.reviews})</span>` : '<span class="tr-tag">Nový</span>';
const fmtDate = d => new Date(d).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

const priceShort = t => t.price_from != null ? `<div class="tr-price">od <b>${Number(t.price_from).toLocaleString('sk-SK')} €</b> / mesiac</div>` : '<div class="tr-price">Cena po dohode</div>';
const ratingGlass = t => t.reviews ? `<span class="tr-glass y">★ ${t.avg.toFixed(1).replace('.', ',')} <span style="opacity:.7;font-weight:600">(${t.reviews})</span></span>` : '<span class="tr-glass">Nový</span>';
function cover(t, big, sub) {
  const g = GRAD[hash(t.display_name || t.user_id) % GRAD.length];
  const bg = t.photo_url ? `background-image:url('${h(t.photo_url)}')` : `background:linear-gradient(150deg,${g[0]},${g[1]})`;
  const mode = t.online ? '<span class="tr-glass g">Online</span>' : '<span class="tr-glass">Osobne</span>';
  return `<div class="tr-cov${big ? ' big' : ''}" style="${bg}">${t.photo_url ? '' : `<span class="ini">${h(initials(t.display_name))}</span>`}
    <div class="tr-ctop">${mode}${ratingGlass(t)}</div>
    <div class="tr-cbot"><div class="tr-name">${h(t.display_name)}${trusted(t) ? CHECK : ''}</div>${t.city ? `<div class="tr-loc">${h(t.city)}${t.in_person && t.online ? ' · aj osobne' : ''}</div>` : ''}${sub ? `<div class="tr-sub2">${h(sub)}</div>` : ''}</div></div>`;
}
function card(t) {
  const a = best(t);
  return `<a class="tr-card" href="#/trener/${t.user_id}">${cover(t)}<div class="tr-cb">
    <div class="tr-hl">${h(t.headline || '')}</div>
    ${a ? `<div class="tr-win">🏆 ${h(a.title)}${a.year ? ` · ${h(a.year)}` : ''}</div>` : ''}
    <div class="tr-meta" style="margin:0">${(t.specialties || []).slice(0, 3).map(s => `<span class="tr-tag b">${h(s)}</span>`).join('')}</div>
    <div class="tr-foot">${priceShort(t)}<span class="tr-go" aria-hidden="true">›</span></div></div></a>`;
}

function joinBanner(kind) {
  const own = ctx.state.trainer; const cl = `tr-join ${kind || 'card'}`;
  if (own?.approved) return '';
  if (own?.status === 'pending') return `<a class="${cl}" href="#/trener-profil"><div class="tx"><b>Tvoja žiadosť sa kontroluje</b><small>Ozveme sa ti tu v appke.</small></div><span class="go">Otvoriť ›</span></a>`;
  if (own?.status === 'rejected') return `<a class="${cl}" href="#/trener-profil"><div class="tx"><b>Žiadosť sme zamietli</b><small>Pozri dôvod a pošli ju znova.</small></div><span class="go">Otvoriť ›</span></a>`;
  return `<a class="${cl}" href="#/trener-profil"><div class="tx"><b>Si tréner?</b><small>Získaj klientov online cez GainTrain.</small></div><span class="go">Stať sa trénerom ›</span></a>`;
}

function joinPill() {
  const own = ctx.state.trainer;
  if (own?.approved) return '';
  const t = own?.status === 'pending' ? 'Žiadosť sa kontroluje' : own?.status === 'rejected' ? 'Žiadosť zamietnutá' : 'Si tréner?';
  return `<a class="tr-pill" href="#/trener-profil">${t}</a>`;
}

// ---------- katalóg ----------
export async function renderCatalog() {
  $app().innerHTML = `<div class="screen"><div class="tr-top"><h1>Tréneri</h1></div><div class="spinner"></div></div>${nav('#/treneri')}`;
  const [list0, links] = await Promise.all([api().list(), api().links(me().id).catch(() => [])]);
  const list = list0.map(t => ({ reviews: 0, avg: 0, ...t })).sort((a, b) => score(b) - score(a));
  const mine = links.find(l => l.client_id === me().id && l.status === 'active');
  let q = '', spec = '', online = false, city = '';
  const cities = Object.entries(list.reduce((m, t) => { const c = (t.city || '').trim(); if (c) m[c] = (m[c] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
  const draw = () => {
    const f = list.filter(t => t.user_id !== me().id
      && (!q || `${t.display_name} ${t.headline || ''} ${t.city || ''} ${(t.specialties || []).join(' ')}`.toLowerCase().includes(q))
      && (!spec || (t.specialties || []).includes(spec)) && (!online || t.online) && (!city || (t.city || '').trim() === city));
    $app().querySelector('#trList').innerHTML = f.length ? f.map(card).join('')
      : `<div class="tr-emp"><div class="ic"><svg viewBox="0 0 24 24">${list.length ? '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>' : '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 5.5a3 3 0 010 5.5M19 14.5c1.5.8 2.5 2.4 2.5 4.5"/>'}</svg></div><b>${list.length ? 'Nič sme nenašli' : 'Prví tréneri už čoskoro'}</b><span>${list.length ? 'Skús zmeniť filter alebo hľadaný text.' : 'Práve pridávame prvých trénerov. Pozri sa o chvíľu znova.'}</span></div>`;
  };
  $app().innerHTML = `<div class="screen">
    <div class="tr-top"><h1>Tréneri</h1>${joinPill()}</div>
    <p class="tr-sub">${mine ? 'Už máš trénera. Tu nájdeš ďalších.' : 'Online koučing od trénerov, ktorých sme skontrolovali.'}</p>
    <div class="tr-perks">
      <div><svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4.5h6M9 11l2 2 4-4M9 17h6"/></svg><b>Tvoj plán</b><span>tréning a jedlo</span></div>
      <div><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/></svg><b>Check-iny</b><span>každý týždeň</span></div>
      <div><svg viewBox="0 0 24 24"><rect x="3" y="6" width="12" height="12" rx="3"/><path d="M15 10.5l6-3.5v10l-6-3.5"/></svg><b>Videohovory</b><span>online s trénerom</span></div>
      <div><svg viewBox="0 0 24 24"><path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2h-7l-5 4v-4H5a2 2 0 01-2-2V7a2 2 0 012-2z"/></svg><b>Priamy chat</b><span>kedykoľvek</span></div>
    </div>
    <div class="tr-search"><input class="input" id="trQ" placeholder="Meno, mesto alebo cieľ" autocomplete="off"></div>
    <div class="tr-chips" id="trChips"><button class="tr-chip" data-o="1">Online</button>${cities.map(c => `<button class="tr-chip notranslate" translate="no" data-c="${h(c)}">📍 ${h(c)}</button>`).join('')}${SPECS.map(s => `<button class="tr-chip" data-s="${h(s)}">${h(s)}</button>`).join('')}</div>
    <div id="trList"></div></div>${nav('#/treneri')}`;
  draw();
  const root = $app();
  root.querySelector('#trQ').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); draw(); });
  root.querySelector('#trChips').addEventListener('click', e => {
    const b = e.target.closest('.tr-chip'); if (!b) return;
    if (b.dataset.o) { online = !online; b.classList.toggle('on', online); return draw(); }
    if (b.dataset.c) { const on = !b.classList.contains('on'); root.querySelectorAll('.tr-chip[data-c]').forEach(x => x.classList.remove('on')); b.classList.toggle('on', on); city = on ? b.dataset.c : ''; return draw(); }
    const on = !b.classList.contains('on'); root.querySelectorAll('.tr-chip[data-s]').forEach(x => x.classList.remove('on'));
    b.classList.toggle('on', on); spec = on ? b.dataset.s : ''; draw();
  });
}

// ---------- profil trénera (pre klienta) ----------
export async function renderTrainer(id) {
  $app().innerHTML = `<div class="screen"><div class="spinner"></div></div>${nav('#/treneri')}`;
  const [t0, links, revs] = await Promise.all([api().get(id), api().links(me().id).catch(() => []), api().reviews(id).catch(() => [])]);
  const t = t0 && { ...t0, reviews: revs.length, avg: revs.length ? revs.reduce((a, r) => a + r.rating, 0) / revs.length : 0 };
  if (!t) { $app().innerHTML = `<div class="screen"><div class="tr-empty"><b>Tréner sa nenašiel</b><a class="btn sm" href="#/treneri">Späť na trénerov</a></div></div>${nav('#/treneri')}`; return; }
  const link = links.find(l => l.trainer_id === id && l.client_id === me().id);
  const own = t.user_id === me().id;
  const canReview = !own && link?.accepted_at && Date.now() - new Date(link.accepted_at).getTime() >= 7 * 864e5;
  const myRev = revs.find(r => r.client_id === me().id);
  const cta = () => {
    if (own) return `<a class="btn" href="#/trener-profil">Upraviť môj profil</a>`;
    if (link?.status === 'active') return `<div class="tr-row"><a class="btn primary" style="flex:1" href="#/chat/${id}">Napísať trénerovi</a></div><p class="tr-note">Toto je tvoj tréner. Vidí tvoje jedlo, tréningy, váhu a check-iny.</p>`;
    if (link?.status === 'requested') return `<button class="btn" disabled style="width:100%">Žiadosť odoslaná</button><p class="tr-note">Tréner ti odpovie tu v appke. <a href="#" id="trCancel">Zrušiť žiadosť</a></p>`;
    return `<button class="btn primary" id="trAsk">Požiadať o koučing</button><p class="tr-note">Nič neplatíš teraz. Najprv sa tréner a ty dohodnete.</p>`;
  };
  $app().innerHTML = `<div class="screen">
    <div class="tr-top"><a class="btn sm ghost" href="#/treneri">←</a><span></span></div>
    ${cover(t, true, t.headline)}
    <div class="tr-stats"><div><b>${t.experience_years ?? '–'}</b><span>rokov praxe</span></div><div><b>${t.reviews ? '★ ' + t.avg.toFixed(1).replace('.', ',') : 'Nový'}</b><span>hodnotenie</span></div><div><b>${t.reviews}</b><span>recenzií</span></div></div>
    ${t.bio ? `<div class="card tr-sec"><h3>O mne</h3><p style="margin:0;line-height:1.5;white-space:pre-wrap">${h(t.bio)}</p></div>` : ''}
    ${(t.specialties || []).length ? `<div class="card tr-sec"><h3>Špecializácia</h3><div class="tr-meta" style="margin:0">${t.specialties.map(s => `<span class="tr-tag b">${h(s)}</span>`).join('')}</div></div>` : ''}
    ${(t.credentials || []).length ? `<div class="card tr-sec"><h3>Vzdelanie a certifikáty</h3>${t.credentials.map(c => `<div class="tr-li"><span>${h(c.title)}${c.proof ? ' ' + CHECK : ''}${c.place ? `<br><small class="muted">${h(c.place)}</small>` : ''}</span><i>${h(c.year || '')}</i></div>`).join('')}</div>` : ''}
    ${(t.achievements || []).length ? `<div class="card tr-sec"><h3>Súťaže a úspechy</h3>${t.achievements.map(c => `<div class="tr-li"><span>🏆 ${h(c.title)}${c.proof ? ' ' + CHECK : ''}</span><i>${h(c.year || '')}</i></div>`).join('')}</div>` : ''}
    <div class="card tr-sec"><h3>Cena</h3>${price(t).replace('class="tr-price"', 'style="margin:0"')}<p class="tr-note" style="margin-top:6px">Jazyky: ${(t.languages || ['sk']).map(l => ({ sk: 'slovenčina', cs: 'čeština', en: 'angličtina', hu: 'maďarčina', de: 'nemčina' }[l] || l)).join(', ')}</p></div>
    <div class="card tr-sec"><h3>Hodnotenia klientov</h3>${revs.length ? revs.slice(0, 10).map(r => `<div class="tr-li" style="display:block"><b>${'★'.repeat(r.rating)}<span style="opacity:.25">${'★'.repeat(5 - r.rating)}</span></b> <small class="muted">${h(r.client_name || 'Klient')}</small>${r.body ? `<div style="margin-top:3px;line-height:1.45">${h(r.body)}</div>` : ''}</div>`).join('') : '<p class="tr-note" style="margin:0">Zatiaľ bez hodnotení. Hodnotiť môžu len klienti po aspoň 7 dňoch spolupráce.</p>'}${canReview ? `<button class="btn sm" id="trRate" style="margin-top:10px">${myRev ? 'Upraviť moje hodnotenie' : 'Ohodnotiť trénera'}</button>` : ''}</div>
    ${own ? '' : '<p class="tr-note" style="text-align:center"><a href="#" id="trReport">Nahlásiť profil</a></p>'}
    <div class="tr-cta" id="trCta">${cta()}</div></div>${nav('#/treneri')}`;
  const root = $app();
  root.querySelector('#trAsk')?.addEventListener('click', () => {
    const bg = ctx.sheet(`<h2 style="margin-top:0">Požiadať o koučing</h2>
      <p class="tr-note" style="margin:0 0 12px">Napíš ${h(t.display_name.split(' ')[0])} pár slov o sebe a cieli. Žiadosť uvidí len tréner.</p>
      <textarea class="input" id="trMsg" rows="4" maxlength="500" placeholder="Napr. chcem pribrať 5 kg, trénujem 4x týždenne, ale neviem, ako jesť."></textarea>
      <div class="card" style="margin:12px 0;padding:12px"><b style="font-size:14px">Čo tréner uvidí, keď žiadosť prijme</b><p class="tr-note" style="margin:6px 0 0">Tvoje jedlo, tréningy, váhu a check-iny. Súhlas môžeš kedykoľvek zrušiť v Profile.</p></div>
      <button class="btn primary" id="trSend" style="width:100%">Odoslať žiadosť</button>`);
    bg.querySelector('#trSend').onclick = async e => {
      e.target.disabled = true;
      try { await api().request(id, me().id, me().name, me().goal || null, bg.querySelector('#trMsg').value.trim() || null); bg.remove(); toast('Žiadosť odoslaná'); renderTrainer(id); }
      catch (err) { toast(err.message || 'Nepodarilo sa odoslať', true); e.target.disabled = false; }
    };
  });
  root.querySelector('#trRate')?.addEventListener('click', () => {
    let rating = myRev?.rating || 0;
    const bg = ctx.sheet(`<h2 style="margin-top:0">Ako sa ti s trénerom pracuje?</h2>
      <div id="trStars" style="display:flex;gap:6px;font-size:34px;margin:6px 0 12px">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-i="${i}" style="background:none;border:0;font-size:inherit;cursor:pointer;color:#FFD27A;padding:0">${i <= rating ? '★' : '☆'}</button>`).join('')}</div>
      <textarea class="input" id="trTxt" rows="3" maxlength="500" placeholder="Pár viet pre ostatných (nepovinné)">${h(myRev?.body || '')}</textarea>
      <button class="btn primary" id="trRateSend" style="width:100%;margin-top:12px">Odoslať</button>`);
    bg.querySelector('#trStars').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; rating = +b.dataset.i; bg.querySelectorAll('#trStars button').forEach(x => x.textContent = +x.dataset.i <= rating ? '★' : '☆'); };
    bg.querySelector('#trRateSend').onclick = async e => {
      if (!rating) return toast('Vyber počet hviezdičiek', true);
      e.target.disabled = true;
      try { await api().addReview(id, me().id, me().name, rating, bg.querySelector('#trTxt').value.trim() || null); bg.remove(); toast('Ďakujeme za hodnotenie'); renderTrainer(id); }
      catch (err) { toast(err.message || 'Nepodarilo sa odoslať', true); e.target.disabled = false; }
    };
  });
  root.querySelector('#trReport')?.addEventListener('click', e => {
    e.preventDefault();
    const bg = ctx.sheet(`<h2 style="margin-top:0">Nahlásiť profil</h2><p class="tr-note" style="margin:0 0 12px">Čo je s profilom v neporiadku? Pri viacerých nahláseniach sa profil automaticky skryje.</p>
      ${[['fake', 'Falošný alebo nie je reálny tréner'], ['spam', 'Spam alebo reklama'], ['unsafe', 'Nebezpečné rady'], ['other', 'Iný dôvod']].map(([k, l]) => `<button class="btn" data-r="${k}" style="width:100%;margin-bottom:8px;text-align:left">${l}</button>`).join('')}`);
    bg.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-r]'); if (!b) return;
      try { await api().report(id, me().id, b.dataset.r, null); bg.remove(); toast('Ďakujeme, nahlásenie sme prijali'); } catch (err) { toast(err.message || 'Nepodarilo sa odoslať', true); }
    });
  });
  root.querySelector('#trCancel')?.addEventListener('click', async e => { e.preventDefault(); try { await api().setLink(link.id, 'ended'); toast('Žiadosť zrušená'); renderTrainer(id); } catch (err) { toast(err.message, true); } });
}

// ---------- vlastný profil trénera ----------
const rowHtml = (kind, r = {}) => `<div data-row="${kind}" data-proof="${h(r.proof || '')}" style="margin-bottom:12px"><div class="tr-two" style="grid-template-columns:1fr 84px 38px"><input class="input" data-f="title" placeholder="${kind === 'cred' ? 'Napr. Kondičný tréner, FTVŠ UK' : 'Napr. 1. miesto, Slovenský pohár'}" value="${h(r.title || '')}"><input class="input" data-f="year" inputmode="numeric" placeholder="Rok" value="${h(r.year || '')}"><button type="button" class="btn sm ghost" data-del aria-label="Odstrániť">×</button></div><label class="tr-pf${r.proof ? ' ok' : ''}" data-pf>${r.proof ? '✓ Doklad nahraný (vidí len správca)' : '+ Fotka dokladu, diplomu alebo výsledkov (vidí len správca)'}<input type="file" accept="image/*" data-proofin hidden></label></div>`;
export async function renderTrainerEdit() {
  const cur0 = await api().mine(me().id);
  const appRow = cur0 && !cur0.approved ? await api().app(me().id).catch(() => null) : null;
  const cur = cur0 && { ...cur0, application_note: appRow?.note || cur0.application_note || null, proof_paths: appRow?.proof_paths || cur0.proof_paths || [] };
  const t = cur || { display_name: me().name || '', specialties: [], languages: ['sk'], credentials: [], achievements: [], online: true, in_person: false, status: 'draft' };
  $app().innerHTML = `<div class="screen tr-form">
    <div class="tr-top"><h1>${cur ? 'Môj profil trénera' : 'Staň sa trénerom'}</h1><a class="btn sm ghost" href="#/profil">←</a></div>
    ${cur?.status === 'pending' ? '<div class="tr-req" style="display:block"><b>Žiadosť sa kontroluje</b><small>Ozveme sa ti tu v appke. Dovtedy ťa klienti v katalógu nevidia.</small></div>' : ''}
    ${cur?.status === 'rejected' ? `<div class="tr-req" style="display:block;background:rgba(255,120,120,.08);border-color:rgba(255,120,120,.35)"><b>Žiadosť sme zamietli</b><small>${h(cur.review_note || '')} Uprav profil a pošli ju znova.</small></div>` : ''}
    <p class="tr-sub">${cur ? (cur.approved ? 'Takto ťa uvidia klienti v katalógu.' : 'Doplň profil a pošli ho na schválenie.') : 'Vytvor si profil. Potrebuješ fotku, krátky popis, pár viet o sebe a špecializáciu. Certifikát nie je povinný, dôveru si buduješ hodnoteniami klientov.'}</p>
    <div class="card" style="text-align:center"><div id="trPh" style="display:flex;justify-content:center;margin-bottom:10px">${avatar(t, true)}</div><label class="btn sm ghost" style="cursor:pointer">Nahrať fotku<input type="file" id="trFile" accept="image/*" hidden></label></div>
    <div class="card mt">
      <div class="tr-two"><label><span>Meno</span><input class="input" id="f_fn" maxlength="30" autocomplete="given-name" value="${h((t.display_name || '').split(' ')[0])}"></label><label><span>Priezvisko</span><input class="input" id="f_ln" maxlength="30" autocomplete="family-name" value="${h((t.display_name || '').split(' ').slice(1).join(' '))}"></label></div>
      <label><span>Jedna veta pre klientov</span><small class="muted" style="display:block;margin:-2px 0 6px">Zobrazí sa v zozname trénerov pri tvojej fotke.</small><input class="input" id="f_hl" maxlength="90" placeholder="Napr. Naberanie svalov pre začiatočníkov bez stresu" value="${h(t.headline || '')}"></label>
      <div class="tr-two"><label><span>Mesto</span><input class="input" id="f_city" maxlength="60" value="${h(t.city || '')}"></label><label><span>Rokov praxe</span><input class="input" id="f_exp" inputmode="numeric" value="${t.experience_years ?? ''}"></label></div>
      <label><span>Viac o tebe</span><small class="muted" style="display:block;margin:-2px 0 6px">Zobrazí sa na tvojom profile. Napíš, ako trénuješ a s kým pracuješ najradšej.</small><textarea class="input" id="f_bio" rows="5" maxlength="1200" placeholder="Ako pracuješ, s kým pracuješ najradšej, čo klient dostane.">${h(t.bio || '')}</textarea></label>
    </div>
    <div class="card mt"><h3 style="margin-top:0">Špecializácia</h3><div class="tr-meta" id="f_specs" style="margin:0">${SPECS.map(s => `<button type="button" class="tr-chip${(t.specialties || []).includes(s) ? ' on' : ''}" data-s="${h(s)}">${h(s)}</button>`).join('')}</div></div>
    <div class="card mt"><h3 style="margin-top:0">Vzdelanie a certifikáty</h3><p class="tr-note" style="margin:0 0 10px">Uveď len to, čo vieš doložiť. Ku každému riadku nahraj fotku diplomu, certifikátu alebo výsledkovej listiny. Klienti ju neuvidia, len my, a riadok dostane značku overenia. Nemáš certifikát? Nechaj to prázdne a pridaj Instagram.</p><div id="f_cred">${(t.credentials || []).map(r => rowHtml('cred', r)).join('')}</div><button type="button" class="btn sm ghost" id="addCred">+ Pridať</button></div>
    <div class="card mt"><h3 style="margin-top:0">Súťaže a úspechy</h3><p class="tr-note" style="margin:0 0 10px">Aj tu platí: každý riadok potrebuje doklad, napríklad fotku diplomu alebo výsledkovej listiny.</p><div id="f_ach">${(t.achievements || []).map(r => rowHtml('ach', r)).join('')}</div><button type="button" class="btn sm ghost" id="addAch">+ Pridať</button></div>
    <div class="card mt">
      <div class="tr-two"><label><span>Cena od (€ / mesiac)</span><input class="input" id="f_price" inputmode="decimal" value="${t.price_from ?? ''}"></label><label><span>Poznámka k cene</span><input class="input" id="f_pn" maxlength="120" placeholder="Napr. plán + týždenné check-iny" value="${h(t.price_note || '')}"></label></div>
      <div class="tr-row"><button type="button" class="tr-chip${t.online ? ' on' : ''}" id="f_online">Online</button><button type="button" class="tr-chip${t.in_person ? ' on' : ''}" id="f_inp">Aj osobne</button></div>
    </div>
    ${cur?.approved ? '' : `<div class="card mt"><h3 style="margin-top:0">Overenie</h3><p class="tr-note" style="margin:0 0 10px">Aby v katalógu neboli náhodní ľudia, každý nový tréner prejde kontrolou. Certifikát nie je povinný. Stačí jedno z dvoch: odkaz na tvoj Instagram alebo web, alebo fotka dokladu pri certifikáte či úspechu vyššie.</p>
      <label><span>Instagram alebo web</span><input class="input" id="f_soc" maxlength="200" placeholder="@tvojemeno alebo instagram.com/tvojemeno" value="${h(t.social_url || '')}"></label>
      <label><span>Ako a koho trénuješ? (vidíme len my)</span><textarea class="input" id="f_app" rows="4" maxlength="800" placeholder="Koľko rokov, s akými klientmi, aké výsledky si dosiahol.">${h(t.application_note || '')}</textarea></label>
</div>`}
    ${cur ? `<div class="tr-code mt"><div><small class="muted">Kód pre tvojich klientov</small><br><b>${h(cur.invite_code)}</b></div><button type="button" class="btn sm" id="trCopy">Kopírovať</button></div><p class="tr-note">Klient ho zadá v Profile v sekcii Tréner. Klienti z tvojej siete sú pre teba zadarmo.</p>` : ''}
    <div class="tr-row mt"><button class="btn primary" id="trSave" style="flex:1">${cur?.status === 'published' ? 'Uložiť zmeny' : cur?.approved ? 'Zverejniť profil' : cur?.status === 'pending' ? 'Uložiť a poslať znova' : 'Odoslať na schválenie'}</button>${cur?.status === 'published' ? '<button class="btn" id="trHide">Skryť z katalógu</button>' : ''}</div>
  </div>${nav('#/profil')}`;
  const root = $app(); let photo = t.photo_url || null, blob = null; 
  const legacy = (t.proof_paths || []).filter(p => !(t.credentials || []).concat(t.achievements || []).some(r => r.proof === p));
  const onProof = async e => { const inp = e.target.closest('[data-proofin]'); if (!inp) return; const f = inp.files?.[0]; if (!f) return; const row = inp.closest('[data-row]'), lab = inp.closest('[data-pf]'); lab.firstChild.textContent = 'Nahrávam…';
    try { const b = await shrink(f, 1400); row.dataset.proof = await api().uploadProof(me().id, b); lab.classList.add('ok'); lab.firstChild.textContent = '✓ Doklad nahraný (vidí len správca)'; clearErr('proof'); }
    catch (err) { lab.firstChild.textContent = '+ Fotka dokladu, diplomu alebo výsledkov (vidí len správca)'; toast(err.message || 'Fotku sa nepodarilo nahrať', true); } inp.value = ''; };
  root.querySelector('#f_cred').addEventListener('change', onProof); root.querySelector('#f_ach').addEventListener('change', onProof);
  const bind = c => c.addEventListener('click', e => { if (e.target.closest('[data-del]')) e.target.closest('[data-row]').remove(); });
  bind(root.querySelector('#f_cred')); bind(root.querySelector('#f_ach'));
  root.querySelector('#addCred').onclick = () => root.querySelector('#f_cred').insertAdjacentHTML('beforeend', rowHtml('cred'));
  root.querySelector('#addAch').onclick = () => root.querySelector('#f_ach').insertAdjacentHTML('beforeend', rowHtml('ach'));
  root.querySelector('#f_specs').addEventListener('click', e => e.target.closest('.tr-chip')?.classList.toggle('on'));
  root.querySelector('#f_online').onclick = e => e.target.classList.toggle('on');
  root.querySelector('#f_inp').onclick = e => e.target.classList.toggle('on');
  root.querySelector('#trCopy')?.addEventListener('click', () => { navigator.clipboard?.writeText(cur.invite_code); toast('Kód skopírovaný'); });
  root.querySelector('#trFile').onchange = async e => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    const card = root.querySelector('#trPh').closest('.card'), lab = card.querySelector('label'), lt = lab.firstChild;
    const clearE = () => { card.classList.remove('tr-bad', 'tr-shake'); const fe = card.nextElementSibling; if (fe?.classList.contains('tr-ferr')) fe.remove(); };
    const fail = msg => { clearE(); card.classList.add('tr-bad'); card.insertAdjacentHTML('afterend', `<div class="tr-ferr">${h(msg)}</div>`); void card.offsetWidth; card.classList.add('tr-shake'); };
    const oldTxt = lt.textContent; lt.textContent = 'Kontrolujem fotku…'; lab.style.pointerEvents = 'none'; lab.style.opacity = '.6';
    try {
      const b = await shrink(f, 720);
      const w = await photoWeak(b);
      if (w) { fail(w); return; }
      let ai = { ok: true };
      try { ai = await api().checkPhoto(b); } catch { ai = { ok: true }; }
      if (!ai.ok) { fail(ai.reason || 'Nahraj fotku, na ktorej je dobre vidieť tvoju tvár (môže byť aj celá postava).'); return; }
      blob = b; clearE(); const u = URL.createObjectURL(b);
      root.querySelector('#trPh').innerHTML = `<div class="tr-av lg" style="background-image:url('${u}')"></div>`;
      toast('Fotka je v poriadku');
    } catch { fail('Fotku sa nepodarilo načítať. Skús inú.'); }
    finally { lt.textContent = oldTxt.includes('Nahrať') ? 'Zmeniť fotku' : oldTxt; lab.style.pointerEvents = ''; lab.style.opacity = ''; if (blob || photo) lt.textContent = 'Zmeniť fotku'; }
  };
  const rows = id => [...root.querySelectorAll(`#${id} [data-row]`)].map(r => ({ title: r.querySelector('[data-f=title]').value.trim(), year: r.querySelector('[data-f=year]').value.trim(), ...(r.dataset.proof ? { proof: r.dataset.proof } : {}) })).filter(x => x.title);
  const clearErr = g => root.querySelectorAll('.tr-bad').forEach(el => { if (g && el.dataset.g !== g) return; el.classList.remove('tr-bad', 'tr-shake'); const n = el.nextElementSibling; if (n?.classList.contains('tr-ferr')) n.remove(); });
  const mark = (el, msg, g) => { el.classList.add('tr-bad', 'tr-shake'); if (g) el.dataset.g = g; if (msg) { const m = document.createElement('div'); m.className = 'tr-ferr'; m.textContent = msg; el.insertAdjacentElement('afterend', m); } };
  root.addEventListener('input', e => { const el = e.target.closest?.('.tr-bad'); if (!el) return; if (el.dataset.g) clearErr(el.dataset.g); else { el.classList.remove('tr-bad', 'tr-shake'); const n = el.nextElementSibling; if (n?.classList.contains('tr-ferr')) n.remove(); } });
  root.addEventListener('click', e => { const el = e.target.closest?.('.card.tr-bad'); if (el) { el.classList.remove('tr-bad', 'tr-shake'); const n = el.nextElementSibling; if (n?.classList.contains('tr-ferr')) n.remove(); } });
  const socRaw = () => root.querySelector('#f_soc')?.value.trim() || '';
  const rowProofs = () => [...root.querySelectorAll('#f_cred [data-row],#f_ach [data-row]')].filter(r => r.querySelector('[data-f=title]').value.trim()).map(r => r.dataset.proof).filter(Boolean);
  const save = async status => {
    clearErr();
    const fn = root.querySelector('#f_fn').value.trim(), ln = root.querySelector('#f_ln').value.trim(), name = `${fn} ${ln}`.trim();
    const specs = [...root.querySelectorAll('#f_specs .tr-chip.on')].map(x => x.dataset.s);
    const bad = [];
    const need = status === 'published';
    const soc = normSocial(socRaw());
    // každé uvedené vzdelanie či úspech musí mať doklad, inak ho treba zmazať
    root.querySelectorAll('#f_cred [data-row],#f_ach [data-row]').forEach(r => { if (r.querySelector('[data-f=title]').value.trim() && !r.dataset.proof) bad.push([r.querySelector('[data-pf]'), 'Pridaj fotku dokladu k tomuto riadku, alebo ho odstráň (×). Bez dokladu ho neprijmeme.']); });
    if (!cur?.approved && soc.err) bad.push([root.querySelector('#f_soc'), soc.err, 'proof']);
    if (!photo && !blob && need) bad.push([root.querySelector('#trPh').closest('.card'), 'Nahraj svoju fotku. Klienti si vyberajú podľa tváre.']);
    if (fn.length < 2) bad.push([root.querySelector('#f_fn'), 'Dopíš meno.']);
    if (ln.length < 2) bad.push([root.querySelector('#f_ln'), 'Dopíš priezvisko. Klienti dôverujú tým, čo sa predstavia celým menom.']);
    if (need && root.querySelector('#f_hl').value.trim().length < 8) bad.push([root.querySelector('#f_hl'), 'Napíš krátky popis, aspoň 8 znakov.']);
    if (need && root.querySelector('#f_bio').value.trim().length < 40) bad.push([root.querySelector('#f_bio'), 'Napíš o sebe aspoň 40 znakov.']);
    if (need && !specs.length) bad.push([root.querySelector('#f_specs').closest('.card'), 'Vyber aspoň jednu špecializáciu.']);
    if (need && !cur?.approved) {
      if (!rowProofs().length && !socRaw()) bad.push([root.querySelector('#f_soc'), 'Pridaj odkaz na Instagram alebo web, alebo fotku dokladu pri certifikáte či úspechu.', 'proof']);
      if ((root.querySelector('#f_app')?.value.trim().length || 0) < 30) bad.push([root.querySelector('#f_app'), 'Napíš aspoň 30 znakov o tom, ako a koho trénuješ.']);
    }
    if (bad.length) {
      bad.forEach(([el, msg, g]) => mark(el, msg, g));
      const first = bad.map(x => x[0]).sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top)[0];
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (first.matches?.('input,textarea')) setTimeout(() => first.focus({ preventScroll: true }), 380);
      return;
    }
    const btn = root.querySelector('#trSave'); btn.disabled = true;
    try {
      if (blob) photo = await api().upload(me().id, blob);
      const num = v => { const n = Number(String(v).replace(',', '.')); return v !== '' && isFinite(n) ? n : null; };
      if (!cur?.approved) await api().saveApp(me().id, root.querySelector('#f_app')?.value.trim() || null, [...new Set([...legacy, ...rowProofs()])]);
      const saved = await api().save({ user_id: me().id, display_name: name, headline: root.querySelector('#f_hl').value.trim() || null, bio: root.querySelector('#f_bio').value.trim() || null,
        city: root.querySelector('#f_city').value.trim() || null, photo_url: photo, specialties: specs, credentials: rows('f_cred'), achievements: rows('f_ach'),
        experience_years: num(root.querySelector('#f_exp').value), online: root.querySelector('#f_online').classList.contains('on'), in_person: root.querySelector('#f_inp').classList.contains('on'),
        price_from: num(root.querySelector('#f_price').value), price_note: root.querySelector('#f_pn').value.trim() || null, status,
        ...(cur?.approved ? {} : { social_url: soc.url || null }) });
      ctx.state.trainer = saved; try { localStorage.setItem('fw_tr_' + me().id, JSON.stringify(saved)); } catch (_) { /* nič */ }
      toast(saved.status === 'pending' ? 'Žiadosť odoslaná. Ozveme sa ti.' : status === 'published' ? 'Profil je v katalógu' : 'Uložené'); location.hash = saved.status === 'published' ? `#/trener/${me().id}` : '#/profil';
    } catch (err) { toast(err.message || 'Nepodarilo sa uložiť', true); btn.disabled = false; }
  };
  root.querySelector('#trSave').onclick = () => save('published');
  root.querySelector('#trHide')?.addEventListener('click', () => save('hidden'));
}
export async function renderTrainerApps() {
  $app().innerHTML = `<div class="screen"><div class="tr-top"><h1>Žiadosti trénerov</h1><a class="btn sm ghost" href="#/profil">←</a></div><div class="spinner"></div></div>${nav('#/profil')}`;
  const list = await api().pending().catch(() => []);
  const items = await Promise.all(list.map(async t => {
    const rowPaths = [...(t.credentials || []), ...(t.achievements || [])].map(r => r.proof).filter(Boolean);
    const all = [...new Set([...(t.proof_paths || []), ...rowPaths])];
    const url = {}; await Promise.all(all.map(async p => { url[p] = (await api().signed([p]).catch(() => []))[0] || ''; }));
    return { t, url, loose: (t.proof_paths || []).filter(p => !rowPaths.includes(p)) };
  }));
  const kv = (k, v) => v ? `<div class="tr-kv"><span>${k}</span><div>${v}</div></div>` : '';
  const ph = u => u ? `<a href="${h(u)}" target="_blank" rel="noopener"><img class="tr-pthumb" src="${h(u)}" alt="Doklad"></a>` : '';
  const rowsHtml = (arr, url, ic) => (arr || []).map(c => `<div class="tr-arow"><div><b>${ic}${h(c.title)}</b>${c.year ? `<small>${h(c.year)}</small>` : ''}${c.proof ? '' : '<em>bez dokladu</em>'}</div>${c.proof ? ph(url[c.proof]) : ''}</div>`).join('');
  const ago = d => { if (!d || isNaN(new Date(d))) return 'nedávno'; const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000)); return m < 60 ? `pred ${m} min` : m < 1440 ? `pred ${Math.round(m / 60)} h` : `pred ${Math.round(m / 1440)} d`; };
  const lang = { sk: 'slovenčina', cs: 'čeština', en: 'angličtina', de: 'nemčina', hu: 'maďarčina', pl: 'poľština', uk: 'ukrajinčina' };
  $app().innerHTML = `<div class="screen"><div class="tr-top"><h1>Žiadosti trénerov</h1><a class="btn sm ghost" href="#/profil">←</a></div>
    ${items.length ? items.map(({ t, url, loose }) => {
      const nProof = Object.values(url).filter(Boolean).length;
      return `<div class="card tr-sec tr-rev" data-u="${t.user_id}">
      <div class="tr-hero" style="margin-bottom:12px">${avatar(t)}<div class="tr-body"><div class="tr-name">${h(t.display_name)}</div><div class="tr-hl">${h(t.headline || '-')}</div><small class="muted">Odoslané ${ago(t.updated_at)}</small></div></div>
      <div class="tr-checks"><span class="tr-tag ${t.social_url ? 'g' : 'y'}">${t.social_url ? '✓ Odkaz' : '✗ Bez odkazu'}</span><span class="tr-tag ${nProof ? 'g' : 'y'}">${nProof ? `✓ ${nProof} ${nProof === 1 ? 'doklad' : 'dokladov'}` : '✗ Bez dokladov'}</span><span class="tr-tag ${(t.application_note || '').length >= 30 ? 'g' : 'y'}">${(t.application_note || '').length >= 30 ? '✓ Popis praxe' : '✗ Krátky popis praxe'}</span></div>
      ${kv('Mesto', h(t.city || '-'))}${kv('Roky praxe', t.experience_years != null ? h(t.experience_years) : '-')}
      ${kv('Cena', t.price_from != null ? `od ${h(Number(t.price_from).toLocaleString('sk-SK'))} € / mesiac${t.price_note ? `<br><small class="muted">${h(t.price_note)}</small>` : ''}` : '-')}
      ${kv('Formát', [t.online ? 'Online' : '', t.in_person ? 'Osobne' : ''].filter(Boolean).join(', ') || '-')}
      ${kv('Jazyky', (t.languages || []).map(l => h(lang[l] || l)).join(', ') || '-')}
      ${kv('Špecializácie', (t.specialties || []).map(x => `<span class="tr-tag b">${h(x)}</span>`).join(' ') || '-')}
      ${kv('O mne (verejné)', `<div class="tr-txt">${h(t.bio || '-')}</div>`)}
      ${kv('Prax (vidíme len my)', `<div class="tr-txt">${h(t.application_note || '-')}</div>`)}
      ${kv('Instagram / web', t.social_url ? `<a class="tr-lnk" href="${h(t.social_url)}" target="_blank" rel="noopener">${h(t.social_url)}</a><a class="btn sm ghost" href="${h(t.social_url)}" target="_blank" rel="noopener" style="margin-top:8px;display:inline-flex">Otvoriť odkaz</a>` : '<em>nezadaný</em>')}
      ${(t.credentials || []).length ? kv('Vzdelanie a certifikáty', rowsHtml(t.credentials, url, '')) : ''}
      ${(t.achievements || []).length ? kv('Súťaže a úspechy', rowsHtml(t.achievements, url, '🏆 ')) : ''}
      ${loose.length ? kv('Ďalšie doklady', `<div class="tr-row">${loose.map(p => ph(url[p])).join('')}</div>`) : ''}
      <div class="tr-row mt"><button class="btn primary" data-ok style="flex:1">Schváliť</button><button class="btn tr-danger" data-no>Zamietnuť</button></div></div>`; }).join('') : '<div class="tr-empty"><b>Žiadne žiadosti</b>Keď sa niekto prihlási za trénera, uvidíš ho tu.</div>'}</div>${nav('#/profil')}`;
  const rootEl = $app(); if (rootEl._trApps) rootEl.removeEventListener('click', rootEl._trApps);
  rootEl._trApps = async e => {
    const card = e.target.closest('[data-u]'); const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]'); if (!card || (!ok && !no)) return;
    const uid = card.dataset.u;
    try {
      if (ok) await api().decide(uid, true);
      else {
        const bg = ctx.sheet(`<h2 style="margin-top:0">Dôvod zamietnutia</h2><p class="tr-note" style="margin:0 0 10px">Uvidí ho tréner.</p><textarea class="input" id="trWhy" rows="3" maxlength="300">Chýba dôkaz, že trénuješ. Pridaj certifikát, výsledky alebo odkaz na svoju prácu.</textarea><button class="btn tr-danger mt" id="trWhyGo" style="width:100%">Zamietnuť</button>`);
        bg.querySelector('#trWhyGo').onclick = async () => { try { await api().decide(uid, false, bg.querySelector('#trWhy').value.trim()); bg.remove(); toast('Žiadosť zamietnutá'); renderTrainerApps(); } catch (err) { toast(err.message || 'Nepodarilo sa', true); } };
        return;
      }
      toast('Tréner schválený'); renderTrainerApps();
    } catch (err) { toast(err.message || 'Nepodarilo sa', true); }
  };
  rootEl.addEventListener('click', rootEl._trApps);
}
// lokálna kontrola: čierna/prázdna/jednofarebná alebo príliš malá fotka
// Instagram (@meno, instagram.com/meno) alebo web; náhodné písmená odmietne
function normSocial(v) {
  v = (v || '').trim(); if (!v) return { url: '' };
  const bad = { err: 'Zadaj @meno alebo odkaz, napr. instagram.com/tvojemeno alebo tvoj web.' };
  if (/^@[A-Za-z0-9._]{2,30}$/.test(v)) return { url: 'https://instagram.com/' + v.slice(1) };
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(u.hostname)) return bad;
    if (/(^|\.)instagram\.com$/i.test(u.hostname) && !/^\/[A-Za-z0-9._]{2,30}\/?/.test(u.pathname)) return { err: 'Doplň svoje meno, napr. instagram.com/tvojemeno.' };
    return { url: u.href.slice(0, 200) };
  } catch { return bad; }
}
async function photoWeak(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    if (Math.min(img.width, img.height) < 240) return 'Fotka je príliš malá. Nahraj väčšiu fotku, na ktorej je vidieť tvoju tvár.';
    const c = document.createElement('canvas'); c.width = 48; c.height = 48; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data; let s = 0, s2 = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; s += l; s2 += l * l; }
    const m = s / n, sd = Math.sqrt(Math.max(0, s2 / n - m * m));
    if (m < 22 || sd < 12) return 'Táto fotka je čierna alebo prázdna. Nahraj fotku, na ktorej je vidieť tvoju tvár (môže byť aj celá postava).';
    return '';
  } catch { return ''; } finally { URL.revokeObjectURL(url); }
}
async function shrink(file, max) {
  const url = URL.createObjectURL(file); const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
  const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.86));
}

// ---------- prehľad klientov: žiadosti (hore v obrazovke Kouč) ----------
export async function requestsHtml() {
  const links = await api().links(me().id).catch(() => []);
  const req = links.filter(l => l.trainer_id === me().id && l.status === 'requested');
  if (!req.length) return '';
  return req.map(l => `<div class="tr-req" data-l="${l.id}"><div><b>${h(l.client_name || 'Nový klient')}</b><small>${h(l.message || 'Žiada o koučing')}</small></div><div class="row2"><button class="btn sm primary" data-act="active">Prijať</button><button class="btn sm ghost" data-act="declined">Odmietnuť</button></div></div>`).join('');
}
// delegované, lebo kouc2.js po vykreslení prestavia obrazovku (priame onclick by sa stratili)
if (typeof document !== 'undefined') document.addEventListener('click', async e => {
  const b = e.target.closest('.tr-req [data-act]'); if (!b || b.disabled) return;
  b.disabled = true;
  try { await api().setLink(b.closest('.tr-req').dataset.l, b.dataset.act); toast(b.dataset.act === 'active' ? 'Klient pridaný' : 'Žiadosť odmietnutá'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  catch (err) { toast(err.message || 'Nepodarilo sa', true); b.disabled = false; }
});
export async function trainerCodeHtml() {
  const t = ctx.state.trainer; if (!t) return '';
  return `<div class="tr-code" style="margin-bottom:12px"><div><small class="muted">Tvoj kód pre klientov</small><br><b>${h(t.invite_code)}</b></div><a class="btn sm" href="#/trener-profil">Môj profil</a></div>`;
}

// ---------- správy tréner a klient ----------
// videohovor (Daily): súkromná miestnosť pre dvojicu tréner a klient, otvorí sa priamo v appke
async function startCall(otherId, uid) {
  const { data, error } = await db.sb.functions.invoke('daily-room', { body: { other: otherId } });
  let msg = data?.error; if (!msg && error?.context?.json) msg = (await error.context.json().catch(() => null))?.error;
  if (error || !data?.url) throw new Error(msg || 'Videohovor sa nepodarilo spustiť');
  document.getElementById('trCallBox')?.remove();
  const box = document.createElement('div'); box.id = 'trCallBox'; box.className = 'tr-call';
  box.innerHTML = `<div class="tr-call-top"><b>Videohovor</b><button type="button" class="btn sm ghost" id="trCallEnd">Ukončiť</button></div><iframe allow="camera; microphone; fullscreen; display-capture; autoplay" src="${h(data.url)}?t=${encodeURIComponent(data.token)}"></iframe>`;
  document.body.appendChild(box);
  box.querySelector('#trCallEnd').onclick = () => box.remove();
  db.sendMessage(uid, otherId, '📹 Videohovor začal. Pripoj sa cez tlačidlo Videohovor hore.').catch(() => { });
}
export async function renderChat(otherId) {
  const uid = me().id;
  $app().innerHTML = `<div class="screen"><div class="spinner"></div></div>${nav('#/profil')}`;
  const [msgs, names] = await Promise.all([api().thread(uid, otherId), api().names([otherId])]);
  const title = names[otherId]?.display_name || (await db.sb.from('trainer_clients').select('client_name').eq('client_id', otherId).eq('trainer_id', uid).maybeSingle().then(r => r.data?.client_name).catch(() => null)) || 'Správy';
  await db.markRead(msgs.filter(m => m.to_user === uid && !m.read_at).map(m => m.id)).catch(() => { });
  $app().innerHTML = `<div class="screen"><div class="tr-top"><h1>${h(title)}</h1><div class="row2"><button class="btn sm primary" id="trCall" type="button">Videohovor</button><a class="btn sm ghost" href="${ctx.state.trainer && ctx.state.trainer.user_id === uid ? '#/kouc' : '#/profil'}">←</a></div></div>
    <div class="tr-chat">${msgs.length ? msgs.map(m => `<div class="tr-bub${m.from_user === uid ? ' me' : ''}">${h(m.body)}<small>${fmtDate(m.created_at)}</small></div>`).join('') : '<div class="tr-empty"><b>Zatiaľ nič</b>Napíš prvú správu.</div>'}</div>
    <form id="trF" class="card"><textarea class="input" name="b" rows="2" maxlength="1000" placeholder="Napíš správu"></textarea><button class="btn sm primary mt" type="submit">Odoslať</button></form></div>${nav('#/profil')}`;
  $app().querySelector('#trCall').onclick = async e => {
    const btn = e.currentTarget; btn.disabled = true; const t0 = btn.textContent; btn.textContent = 'Pripájam…';
    try { await startCall(otherId, uid); } catch (err) { toast(err.message || 'Videohovor sa nepodarilo spustiť', true); }
    btn.disabled = false; btn.textContent = t0;
  };
  $app().querySelector('#trF').addEventListener('submit', async e => {
    e.preventDefault(); const body = new FormData(e.target).get('b').trim(); if (!body) return;
    try { await db.sendMessage(uid, otherId, body); renderChat(otherId); } catch (err) { toast(err.message || 'Nepodarilo sa odoslať', true); }
  });
}

// ---------- karta "Tréner" v Profile ----------
async function profileCard() {
  const links = await api().links(me().id).catch(() => []);
  const active = links.find(l => l.client_id === me().id && l.status === 'active');
  const pend = links.find(l => l.client_id === me().id && l.status === 'requested');
  const t = active ? await api().get(active.trainer_id).catch(() => null) : null;
  const own = ctx.state.trainer;
  const clientPart = active && t
    ? `<a class="tr-card" href="#/trener/${t.user_id}">${avatar(t)}<div class="tr-body"><small class="muted">Môj tréner</small><div class="tr-name">${h(t.display_name)}${t.verified ? CHECK : ''}</div><div class="tr-hl">${h(t.headline || '')}</div></div></a>
       <div class="tr-row"><a class="btn sm primary" href="#/chat/${t.user_id}">Správy</a><button class="btn sm ghost" id="trEnd">Ukončiť spoluprácu</button></div>`
    : `<h3 style="margin:0 0 4px">Tréner</h3><p class="tr-note" style="margin:0 0 10px">${pend ? 'Čaká sa na odpoveď trénera.' : 'Vyber si trénera, ktorý ťa povedie online, alebo zadaj kód od svojho trénera.'}</p>
       <div class="tr-row"><a class="btn sm primary" href="#/treneri">Nájsť trénera</a><button class="btn sm ghost" id="trCode">Mám kód</button></div>`;
  const ownPart = own?.approved ? `<div class="tr-row" style="margin-top:10px"><a class="btn sm" href="#/kouc">Moji klienti</a><a class="btn sm ghost" href="#/trener-profil">Môj trénerský profil</a></div>`
    : '';
  const nApps = ctx.state.profile?.role === 'coach' ? (await api().pending().catch(() => [])).length : 0;
  const st = own?.status === 'pending' ? '<p class="tr-note" style="margin-top:8px">Tvoja žiadosť o trénerský profil sa kontroluje.</p>' : own?.status === 'rejected' ? '<p class="tr-note" style="margin-top:8px">Tvoju žiadosť sme zamietli. Otvor profil a pozri dôvod.</p>' : '';
  const adm = ctx.state.profile?.role === 'coach' ? `<div class="tr-row" style="margin-top:10px"><a class="btn sm ${nApps ? 'primary' : 'ghost'}" href="#/treneri-ziadosti">Žiadosti trénerov${nApps ? ` (${nApps})` : ''}</a></div>` : '';
  return `<div class="card tr-me" id="trCard">${clientPart}${ownPart}${own?.approved ? '' : joinBanner('row')}${adm}</div>`;
}
async function mountProfile() {
  if ((location.hash || '#/').split('?')[0] !== '#/profil') return;
  const scr = $app()?.querySelector('.screen'); if (!scr || scr.querySelector('#trCard') || scr.dataset.trBusy) return;
  scr.dataset.trBusy = '1';
  try {
    const html = await profileCard();
    if (!scr.isConnected || scr.querySelector('#trCard')) return;
    const h1 = scr.querySelector('h1'); (h1 || scr).insertAdjacentHTML(h1 ? 'afterend' : 'afterbegin', html);
    const c = scr.querySelector('#trCard');
    c.querySelector('#trCode')?.addEventListener('click', () => {
      const bg = ctx.sheet(`<h2 style="margin-top:0">Kód od trénera</h2><p class="tr-note" style="margin:0 0 12px">Tréner uvidí tvoje jedlo, tréningy, váhu a check-iny. Súhlas môžeš kedykoľvek zrušiť.</p><input class="input" id="trC" maxlength="10" placeholder="Napr. 4F7A2C" style="text-transform:uppercase;letter-spacing:.14em;font-size:20px;text-align:center"><button class="btn primary mt" id="trGo" style="width:100%">Pripojiť sa</button>`);
      bg.querySelector('#trGo').onclick = async e => { e.target.disabled = true; try { await api().byCode(bg.querySelector('#trC').value); bg.remove(); toast('Pripojený k trénerovi'); location.hash = '#/profil'; window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (err) { toast(err.message || 'Kód sa nenašiel', true); e.target.disabled = false; } };
    });
    c.querySelector('#trEnd')?.addEventListener('click', () => {
      const bg = ctx.sheet(`<h2 style="margin-top:0">Ukončiť spoluprácu?</h2><p class="tr-note" style="margin:0 0 12px">Tréner prestane vidieť tvoje jedlo a tréningy. Staré správy ostanú.</p><div class="tr-row"><button class="btn primary" id="trY" style="flex:1">Ukončiť</button><button class="btn" id="trN">Nechať</button></div>`);
      bg.querySelector('#trN').onclick = () => bg.remove();
      bg.querySelector('#trY').onclick = async () => { try { const l = (await api().links(me().id)).find(x => x.client_id === me().id && x.status === 'active'); await api().setLink(l.id, 'ended'); bg.remove(); toast('Spolupráca ukončená'); location.hash = '#/'; setTimeout(() => location.hash = '#/profil', 30); } catch (err) { toast(err.message, true); } };
    });
  } catch (_) { } finally { delete scr.dataset.trBusy; }
}
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') new MutationObserver(() => mountProfile()).observe(document.documentElement, { childList: true, subtree: true });
