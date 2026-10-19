// AI v jazyku používateľa: ku každnému volaniu AI funkcií (kouč, zápis jedla, skenery, analýza postavy) appka pridá jazyk,
// v ktorom ju človek používa. Funkcie podľa neho odpovedajú rovno v tom jazyku, bez dodatočného prekladu.
import * as db from './data.js';
import { currentLang } from './i18n.js';
import * as dx from './dxcore.js';

// stručné zhrnutie diét a režimov používateľa pre AI (bez zdravotných hodnôt)
const dietInfo = () => { try { const c = dx.cfg(); if (!c?.consent) return null; const o = { diets: c.diets || [], modes: c.modes || [], allergens: c.allergens || [] }; return (o.diets.length || o.modes.length) ? o : null; } catch (_) { return null; } };

const AI = new Set(['coach-chat', 'ai-log', 'label-scan', 'machine-scan', 'physique-ai']);
db.ready.then(() => {
  // sb.functions je v supabase-js getter, ktorý vždy vytvorí nového klienta, preto sa upraví spoločný prototyp;
  // ak je to obyčajný stály objekt, upraví sa priamo on
  const f = db.sb?.functions; if (!f) return;
  const proto = Object.getPrototypeOf(f);
  const target = proto && proto !== Object.prototype && typeof proto.invoke === 'function' ? proto : (db.sb.functions === f && typeof f.invoke === 'function' ? f : null);
  if (!target || target.__lang) return; target.__lang = true;
  const orig = target.invoke;
  target.invoke = function (name, opts = {}) {
    const b = opts?.body;
    if (AI.has(name) && b && typeof b === 'object' && !(b instanceof FormData) && !(b instanceof Blob) && !b.lang) opts = { ...opts, body: { ...b, lang: currentLang(), ...(dietInfo() && !b.diet ? { diet: dietInfo() } : {}) } };
    return orig.call(this, name, opts);
  };
}).catch(() => { });
