// Vyhľadávanie jedál: zdrobneniny a hovorové názvy (vajíčka, syrík, maslíčko, hranolčeky...) sa preložia na základný tvar,
// ak náš zoznam nájde málo. Obalí volanie search_foods, bez zásahu do databázy a do foods.js.
import * as db from './data.js';

const ascii = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const SYN = {
  vajicko: ['vajce', 'vajcia'], vajicka: ['vajce', 'vajcia'], vajicek: ['vajce', 'vajcia'], vajco: ['vajce'], vajca: ['vajcia'],
  hranolceky: ['hranolky'], masliko: ['maslo'], maslicko: ['maslo'], kacka: ['kacica', 'kacacie'], kacacina: ['kacica'],
  kreatin: ['kreatin monohydrat'], kreatinu: ['kreatin'], protein: ['proteinovy', 'srvatkovy protein'], whey: ['srvatkovy protein'],
  zemiaky: ['zemiak'], zemiacik: ['zemiak'], rozok: ['rozok'], chlebik: ['chlieb'], chlebicek: ['chlieb'], sunkarik: ['sunka'],
};
export function variants(q) {
  const words = ascii(q).split(/[^a-z0-9]+/).filter(Boolean), out = new Set();
  words.forEach((w, i) => {
    const alts = new Set(SYN[w] || []);
    const m = w.match(/^(.{3,}?)(icek|icko|icka|icku|icky|ik|ika|iky|cek|cko|cka|cky|ko|ka)$/);
    if (m) { alts.add(m[1]); ['a', 'o', 'e'].forEach(e => alts.add(m[1] + e)); }
    alts.forEach(a => { const c = [...words]; c[i] = a; out.add(c.join(' ')); });
  });
  out.delete(words.join(' '));
  return [...out].slice(0, 6);
}

// obalí sa až keď je Supabase klient pripravený (knižnica sa načítava asynchrónne)
db.ready.then(() => {
  const sb = db.sb;
  if (sb.__sf) return;
  const orig = sb.rpc.bind(sb);
  sb.__sf = true;
  sb.rpc = (name, args, ...rest) => {
    if (name !== 'search_foods' || !args?.q) return orig(name, args, ...rest);
    return (async () => {
      const first = await orig(name, args, ...rest);
      if (first.error || (first.data || []).length >= 5) return first;
      const vs = variants(args.q);
      if (!vs.length) return first;
      const more = await Promise.all(vs.map(v => orig(name, { ...args, q: v }, ...rest).then(r => r.data || []).catch(() => [])));
      const seen = new Set((first.data || []).map(r => r.id)), data = [...(first.data || [])];
      for (const list of more) for (const r of list) if (!seen.has(r.id)) { seen.add(r.id); data.push(r); }
      return { ...first, data: data.slice(0, Math.min(Math.max(args.lim || 30, 1), 50)) };
    })();
  };
}).catch(() => { /* bez obalu funguje bežné vyhľadávanie */ });
