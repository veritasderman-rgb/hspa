// Stránka „Vedra a zdraví" (vedra.html).
//
// Obsah stránky je záměrně celý statický v HTML — je to servisní text, který
// má být čitelný i bez JS, z tisku a z cache. Tenhle modul proto jen doplní
// sdílený chrome (navigace, datum v masthead), stejně jako ostatní sekční
// stránky.

import { renderModuleNav, renderMastheadDate } from './page-shared.js';

function init() {
  if (typeof window === 'undefined') return;
  renderModuleNav();
  renderMastheadDate();
}

init();
