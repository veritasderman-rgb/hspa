// Sdílené řazení částek Věstníku MZ pro buildery (build-vestniky-vazby.js,
// ingest/ppo/build-web.js mergeVestnik).
//
// Chronologii nese rok + číslo částky — c.datum je u starých ročníků datum
// migrace na web MZ, ne datum vydání. Číslo částky ale platí jen UVNITŘ jedné
// řady: od roku 2025 vychází vedle hlavní řady i samostatně číslovaný
// „Věstník NIKEZ", takže NIKEZ 4/2025 (prosinec) není starší než Věstník
// 17/2025 (říjen). Mezi řadami proto rozhoduje datum — v ročnících, kde
// souběh řad existuje (2025+), už je datum spolehlivé datum vydání.

/** Řada částky podle titulu: 'nikez' pro Věstník NIKEZ, jinak 'mz'. */
export function serieVestniku(titul) {
  return /\bNIKEZ\b/i.test(titul ?? '') ? 'nikez' : 'mz';
}

/** Komparátor částek: nejnovější první. Vstupy nesou rok, cislo, titul
 *  a (pro srovnání napříč řadami) datum. */
export function cmpCastkyDesc(a, b) {
  if ((b.rok ?? 0) !== (a.rok ?? 0)) return (b.rok ?? 0) - (a.rok ?? 0);
  if (serieVestniku(a.titul) !== serieVestniku(b.titul)) {
    return String(b.datum ?? '').localeCompare(String(a.datum ?? ''));
  }
  return (b.cislo ?? 0) - (a.cislo ?? 0);
}
