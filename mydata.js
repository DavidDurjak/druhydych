// Moje dáta: stiahnutie všetkých vlastných údajov (JSON) a prehľadný denný CSV
import * as db from './data.js';

function save(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const cell = v => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

export async function exportMine(toast) {
  const { data, error } = await db.sb.rpc('export_my_data');
  if (error || !data) { toast(error?.message || 'Export sa nepodaril', true); return; }
  const day = new Date().toISOString().slice(0, 10);
  save(`druhy-dych-moje-data-${day}.json`, JSON.stringify(data, null, 2), 'application/json');
  // denník jedál ako CSV (otvoriteľný v Exceli)
  const rows = [['datum', 'jedlo', 'nazov', 'gramy', 'kcal', 'bielkoviny', 'sacharidy', 'tuky']];
  (data.food_logs || []).forEach(f => rows.push([f.date, f.meal, f.name, f.grams, f.kcal, f.protein, f.carbs, f.fat]));
  save(`druhy-dych-jedla-${day}.csv`, '﻿' + rows.map(r => r.map(cell).join(';')).join('\n'), 'text/csv');
  toast('Dáta stiahnuté');
}

// samo si pridá tlačidlo do Profilu (bez zásahu do app.js)
function toast(msg, err = false) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), err ? 4000 : 2200);
}
function inject() {
  const out = document.getElementById('out');
  if (!out || document.getElementById('mydata')) return;
  const b = document.createElement('button');
  b.className = 'btn mb'; b.id = 'mydata'; b.textContent = '⬇️ Stiahnuť moje dáta';
  b.onclick = async () => { b.disabled = true; try { await exportMine(toast); } finally { b.disabled = false; } };
  out.before(b);
}
const root = document.getElementById('app');
if (root) { new MutationObserver(inject).observe(root, { childList: true, subtree: true }); inject(); }
