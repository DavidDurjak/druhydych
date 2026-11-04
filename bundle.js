// Rýchly štart (v300): pri nasadení sa všetky moduly appky zbalia do jedného zmenšeného súboru gt.js.
// Predtým telefón pri prvom otvorení sťahoval a spracúval vyše 130 samostatných súborov (1,9 MB s komentármi),
// teraz je to jeden súbor bez komentárov a medzier. Poradie spúšťania modulov ostáva presne také, ako bolo v index.html
// (jeden vstup, ktorý ich importuje za sebou), takže sa správanie appky nemení.
// Mimo balíka ostávajú: knižnica Supabase (vendor/), dátové súbory receptov (vlastná trvalá cache v sw.js), demo-boot.js
// a samostatné súbory bez importov, ktoré sa načítavajú až keď treba (napr. postava pre kartu tréningu, QR kód, ukážka).
// Keď sa čokoľvek nepodarí, funkcia vráti false a appka sa nasadí po starom (samostatné súbory + modulepreload).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = async function bundle(OUT) {
  let esbuild;
  try { esbuild = require('esbuild'); } catch (e) { console.warn('balík preskočený: esbuild nie je nainštalovaný'); return false; }
  const idxPath = path.join(OUT, 'index.html');
  let html = fs.readFileSync(idxPath, 'utf8');
  const TAG = /[ \t]*<script type="module" src="([^"?]+)"><\/script>\n?/g;
  const roots = [...html.matchAll(TAG)].map(m => m[1]);
  if (!roots.length) { console.warn('balík preskočený: v index.html nie sú moduly'); return false; }
  const entry = path.join(OUT, '__entry.js');
  fs.writeFileSync(entry, roots.map(r => `import './${r}';`).join('\n') + '\n');
  try {
    // recepty (dáta) a Supabase ostávajú samostatné súbory, cesty sa nechajú tak, ako sú (gt.js leží v tom istom priečinku).
    // Väčší súbor (nad 15 kB) načítaný až neskôr (dynamický import), ktorý sám nič neimportuje, tiež ostáva samostatný: nemá žiadny
    // spoločný stav s appkou, takže sa správa rovnako, a do štartu sa nesťahuje. Malé súbory sú v balíku (načítavajú sa hneď pri štarte).
    const lone = f => { try { const src = fs.readFileSync(path.join(OUT, f), 'utf8'); return src.length > 15000 && !/(^|[;\n])\s*(import|export)\b[^\n]*\bfrom\s*['"]|(^|[;\n])\s*import\s*['"]/.test(src); } catch (_) { return false; } };
    const keep = { name: 'keep', setup(b) { b.onResolve({ filter: /^\.\// }, a => {
      if (/^\.\/(vendor\/|recipes\.[^/]+\.js$)/.test(a.path) && a.path !== './recipes.js') return { path: a.path, external: true };
      if (a.kind === 'dynamic-import' && /^\.\/[\w.-]+\.js$/.test(a.path) && lone(a.path.slice(2))) return { path: a.path, external: true };
      return undefined;
    }); } };
    const res = await esbuild.build({
      // v331: rozdelenie na časti. Moduly načítané až keď treba (import()) idú do vlastných súborov v chunks/,
      // takže telefón pri štarte stiahne a spracuje len jadro; zvyšok sa dotiahne na pozadí alebo pri otvorení funkcie
      entryPoints: { gt: './__entry.js' }, bundle: true, format: 'esm', splitting: true, write: false,
      outdir: path.resolve(OUT), entryNames: '[name]', chunkNames: 'chunks/[name]-[hash]', absWorkingDir: path.resolve(OUT),
      metafile: true, minify: true, sourcemap: 'external', sourcesContent: false, keepNames: true, legalComments: 'none', target: 'esnext', charset: 'utf8',
      plugins: [keep], logLevel: 'warning', logOverride: { 'duplicate-object-key': 'silent' },
    });
    const isEntry = f => path.basename(f.path) === 'gt.js';
    const code = res.outputFiles.find(isEntry).text;
    const map = res.outputFiles.find(f => path.basename(f.path) === 'gt.js.map')?.text;
    const chunks = res.outputFiles.filter(f => !isEntry(f) && f.path.includes(`${path.sep}chunks${path.sep}`)); // mapa riadkov: z hlásenia chyby (gt.js:1:48211) sa dá zistiť pôvodný súbor a riadok; prehliadač ju nesťahuje
    const hash = crypto.createHash('sha1').update(code).digest('hex').slice(0, 10);

    // index.html: namiesto 17 skriptov a ~110 modulepreload jeden skript (stiahne sa hneď v hlavičke, spustí sa na tom istom mieste ako predtým)
    let first = true;
    html = html.replace(TAG, () => { if (!first) return ''; first = false; return `  <script type="module" src="gt.js?v=${hash}"></script>\n`; });
    html = html.replace(/[ \t]*<link rel="modulepreload" href="(?!vendor\/)[^"]+">\n?/g, '');
    html = html.replace('<link rel="modulepreload" href="vendor/supabase.mjs">', `<link rel="modulepreload" href="gt.js?v=${hash}">\n  <link rel="modulepreload" href="vendor/supabase.mjs">`);
    // štýly z hlavičky: 11 súborov sa spojí do jedného gt.css v tom istom poradí (poradie rozhoduje, ktoré pravidlo vyhrá);
    // odstránia sa len komentáre a medzery, pravidlá sa nemenia
    const CSS_TAG = /[ \t]*<link rel="stylesheet" href="([\w.-]+\.css)">\n?/g;
    const sheets = [...html.matchAll(CSS_TAG)].map(x => x[1]);
    let cssHash = '';
    const out = {};
    if (sheets.length > 1) {
      let css = '';
      for (const f of sheets) css += (await esbuild.transform(fs.readFileSync(path.join(OUT, f), 'utf8'), { loader: 'css', minifyWhitespace: true, logLevel: 'silent' })).code + '\n';
      cssHash = crypto.createHash('sha1').update(css).digest('hex').slice(0, 10);
      out.css = css;
      let firstCss = true;
      html = html.replace(CSS_TAG, () => { if (!firstCss) return ''; firstCss = false; return `  <link rel="stylesheet" href="gt.css?v=${cssHash}">\n`; });
    }

    // sw.js: predcachuje sa balík namiesto zbalených súborov; verzia cache sa mení s obsahom balíka, takže sa nikdy nezabudne zvýšiť
    const swPath = path.join(OUT, 'sw.js');
    let sw = fs.readFileSync(swPath, 'utf8');
    const m = sw.match(/const ASSETS = \[([^\]]*)\];/);
    if (!m) throw new Error('sw.js: nenašiel som ASSETS');
    const inBundle = new Set(Object.keys(res.metafile.inputs).map(f => f.replace(/^\.\//, '')));
    const list = m[1].split(',').map(s => s.trim()).filter(Boolean).filter(s => { const f = s.replace(/^'\.\/|'$/g, ''); return !inBundle.has(f) && !(cssHash && sheets.includes(f)); });
    list.splice(2, 0, `'./gt.js?v=${hash}'`, ...(cssHash ? [`'./gt.css?v=${cssHash}'`] : []));
    // časti appky sa predcachujú tiež (po inštalácii fungujú aj offline), sťahujú sa však až po štarte, nie pred ním
    chunks.filter(f => f.path.endsWith('.js')).forEach(f => list.push(`'./chunks/${path.basename(f.path)}'`));
    // knižnica Supabase sa predcachuje tiež (appka sa tak otvorí aj offline hneď po aktualizácii), len ak pri nasadení naozaj vznikla
    if (fs.existsSync(path.join(OUT, 'vendor/supabase.mjs')) && !list.includes("'./vendor/supabase.mjs'")) list.splice(3, 0, "'./vendor/supabase.mjs'");
    sw = sw.replace(m[0], `const ASSETS = [${list.join(', ')}];`).replace(/const CACHE = '([^']+)';/, (_, c) => `const CACHE = '${c}-${hash}${cssHash.slice(0, 4)}';`);
    // všetko sa zapíše až na konci, keď je hotové: pri chybe ostane public/ presne taký, aký bol (záložný spôsob v build.js)
    fs.writeFileSync(path.join(OUT, 'gt.js'), code);
    fs.rmSync(path.join(OUT, 'chunks'), { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'chunks'), { recursive: true });
    // samostatné súbory (recepty, vendor) majú v kóde cestu "./x.js", ktorá platí pre gt.js; z chunks/ treba "../x.js" (inak 404 a recepty sa nenačítajú)
    for (const f of chunks) {
      let buf = f.contents;
      if (f.path.endsWith('.js')) {
        const txt = Buffer.from(buf).toString('utf8').replace(/(["'])\.\/((?:vendor\/)?[\w.\-]+\.(?:js|mjs))\1/g, (m, q, name) =>
          !fs.existsSync(path.join(OUT, 'chunks', name)) && !chunks.some(c => path.basename(c.path) === name) && fs.existsSync(path.join(OUT, name)) ? `${q}../${name}${q}` : m);
        buf = Buffer.from(txt, 'utf8');
      }
      fs.writeFileSync(path.join(OUT, 'chunks', path.basename(f.path)), buf);
    }
    if (map) fs.writeFileSync(path.join(OUT, 'gt.js.map'), map);
    if (out.css) fs.writeFileSync(path.join(OUT, 'gt.css'), out.css);
    fs.writeFileSync(swPath, sw);
    fs.writeFileSync(idxPath, html);
    const chunkKb = chunks.filter(f => f.path.endsWith('.js')).reduce((a, f) => a + f.contents.length, 0) / 1024;
    console.log(`balík ok: gt.js ${(Buffer.byteLength(code) / 1024).toFixed(0)} kB pri štarte, ${chunks.filter(f => f.path.endsWith('.js')).length} častí na neskôr (${chunkKb.toFixed(0)} kB), ${inBundle.size} modulov, ${list.length} súborov v cache`);
    return true;
  } catch (e) {
    console.warn('balík preskočený:', String(e && e.message || e).slice(0, 500));
    return false;
  } finally { try { fs.rmSync(entry, { force: true }); } catch (_) { } }
};
