// Regeneruje tracker.md z portálových dat + vysledky.jsonl.
// Spouštěj po každé dávce: node data-verifikace/gen-tracker.js
const fs = require('fs');
const DIR = __dirname;
const portal = JSON.parse(fs.readFileSync(DIR + '/nzip-cache/portal-dohodovaci-rizeni.json', 'utf8'));
const dimLabel = {};
portal.dimensions.forEach((d) => (dimLabel[d.id] = d.label));

const results = {};
const jsonlPath = DIR + '/vysledky.jsonl';
if (fs.existsSync(jsonlPath)) {
  for (const line of fs.readFileSync(jsonlPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    results[r.id] = r; // poslední výskyt vyhrává
  }
}

const cnt = { TODO: 0, PASS: 0, FAIL: 0, BLOCKED: 0 };
const rows = portal.datasets.map((x, i) => {
  const h = x.headline || {};
  const hp = ((h.value != null ? h.value : '?') + ' ' + (h.unit || '') + (h.year ? ' (' + h.year + ')' : '')).trim();
  const r = results[x.id];
  const status = r ? r.status : 'TODO';
  cnt[status] = (cnt[status] || 0) + 1;
  const url = (x.source && x.source.latest_file) || '';
  return `| ${i + 1} | ${x.id} | ${x.dimension} ${dimLabel[x.dimension] || ''} | ${status} | ${hp} | ${r ? (r.hodnota_nzip ?? '') : ''} | ${r ? (r.list_bunka ?? '') : ''} | ${r ? (r.poznamka ?? '') : ''} |`;
});

let t = '# Tracker verifikace — /dohodovaci-rizeni vs. NZIP XLS\n\n';
t += '> Portálová data: `data/dohodovaci-rizeni.json` z produkce https://www.hspa-cesko.cz/dohodovaci-rizeni\n';
t += '> (soubor není v repu — produkce je před repozitářem). Snapshot: `nzip-cache/portal-dohodovaci-rizeni.json`.\n';
t += '> XLSX zdroj každé sady = `source.latest_file`, viz `nzip-mapovani.md`. Verifikace je READ-ONLY.\n\n';
t += `Stav: **${cnt.PASS} / 44 PASS** · TODO ${cnt.TODO} · PASS ${cnt.PASS} · FAIL ${cnt.FAIL} · BLOCKED ${cnt.BLOCKED}\n\n`;
t += '| # | id | dimenze | status | hodnota_portal | hodnota_nzip | list+buňka | poznámka |\n';
t += '|---|---|---|---|---|---|---|---|\n';
t += rows.join('\n') + '\n';
fs.writeFileSync(DIR + '/tracker.md', t);
console.log(`tracker.md: PASS ${cnt.PASS} / FAIL ${cnt.FAIL} / BLOCKED ${cnt.BLOCKED} / TODO ${cnt.TODO}`);
