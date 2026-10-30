// Dáta receptov (vyše 3 MB, 196 súborov) sa načítajú až pri otvorení receptov. foods.js najprv zavolá loadRecipeData()
// a až potom načíta recipes.js, ktorý si dáta vezme odtiaľto. Vďaka tomu môže byť recipes.js súčasťou balíka gt.js
// a dáta ostávajú samostatné súbory v trvalej cache (sw.js), ktoré sa nesťahujú pri štarte appky.
export const D = {};
export const loadRecipeData = () => (D.p ||= Promise.all([import('./recipes.all.js'), import('./recipes.photos2.js')])
  .then(([all, ph]) => { D.all = all; D.ph = ph; })
  .catch(e => { D.p = null; throw e; }));
