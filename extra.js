// Nové moduly (načítava ich searchux.js). Ďalšie funkcie pribúdajú sem, aby sa nemuselo meniť staršie súbory.
import './voice.js';
import './menuscan.js';
import './funnel.js';
import './langsync.js';
import './track.js';
import './liftpro.js';
// afterlog vypnuty na prianie Davida (veta po zapise jedla sa nezobrazuje); subor afterlog.js ostava, staci vratit import
// import './afterlog.js';
import './quickkcal.js';
import './coachmem.js';
import './underfed.js';
import './supers.js';
import './recipeimport.js';
import('./a11y.js').catch(() => { });
import('./googlesignin.js').catch(() => { });
import('./logoutfix.js').catch(() => { });
import('./rebrand.js').catch(() => { });
import('./onebar.js').catch(() => { });
import('./sleep.js').catch(() => { });
import('./touchfx.js').catch(() => { });
import('./diary.js').catch(() => { });
import('./weekly.js').catch(() => { });
