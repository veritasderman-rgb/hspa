// Zápis generovaných JSON artefaktů bez zbytečného churnu.
//
// Proč: build:generated běží po každém merge, v denním cronu i lokálně.
// Kdyby se soubor přepsal vždy, měnilo by se u něj `generated_at` i tehdy,
// když je obsah bit po bitu stejný — a search-index.json má 3,5 MB. Dva PR,
// které jen „proběhly builderem“, se pak rozejdou na razítku, ne na obsahu.
//
// Pravidlo: razítko je metadata, ne obsah. Když se liší JEN ono, necháváme
// na disku původní soubor.
import fs from 'node:fs';

/**
 * Zapíše dokument, pokud se liší od toho na disku v čemkoli kromě `generated_at`.
 *
 * @param {string} filePath — absolutní cesta k výstupu
 * @param {object} doc — dokument s polem `generated_at`
 * @param {{pretty?: boolean}} [opts] — pretty = 2mezerové odsazení
 * @returns {boolean} true = zapsáno, false = obsah beze změny, soubor ponechán
 */
export function writeGeneratedJson(filePath, doc, { pretty = false } = {}) {
  const serialize = (value) => (pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value)) + '\n';

  if (fs.existsSync(filePath)) {
    try {
      const previous = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // Porovnáváme s razítkem převzatým ze staré verze — liší-li se pak už
      // nic, je nová verze obsahově totožná.
      if (serialize({ ...doc, generated_at: previous.generated_at }) === serialize(previous)) {
        return false;
      }
    } catch {
      // Nečitelný nebo poškozený soubor — přepiš.
    }
  }

  fs.writeFileSync(filePath, serialize(doc), 'utf8');
  return true;
}
