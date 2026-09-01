// Společný vstupní bod stránek plneni-*.html („Plní se …?").
// Konfigurace jde z data-atributů na <body>:
//   data-plneni-data   — cesta k datasetu (např. data/plneni-onko-2030.json)
//   data-plneni-tools  — klíč pro related-tools blok (volitelný)
//   data-plneni-target — popisek cílového sloupce (např. „Cíl 2030")
// Renderer i CSS (.z35-*) jsou sdílené se zdravi-2035.html.

import './analytics.js';
import { initPlneni } from './strategie-plneni.js';

const ds = document.body?.dataset ?? {};
initPlneni({
  dataPath: ds.plneniData,
  toolsKey: ds.plneniTools ?? 'zdravi2035',
  targetLabel: ds.plneniTarget ?? 'Cíl',
});
