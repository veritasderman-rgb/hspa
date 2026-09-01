// Plní se Zdraví 2035? — tenký wrapper nad sdíleným rendererem stránek
// plnění strategií (src/strategie-plneni.js). Logika i CSS (.z35-*) jsou
// sdílené se stránkami plneni-*.html; tenhle soubor jen říká, který dataset
// a popisky stránka používá.

import './analytics.js';
import { initPlneni } from './strategie-plneni.js';

initPlneni({
  dataPath: 'data/zdravi2035-plneni.json',
  toolsKey: 'zdravi2035',
  targetLabel: 'Cíl 2035',
});
