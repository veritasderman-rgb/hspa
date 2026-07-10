# Link-audit — položky k redakčnímu dohledání (2026-07-10)

Kompletní sweep externích odkazů (články, `data/*.json`, nečlánkové stránky,
`indicators/*.json`, manifest) opravil ~44 mrtvých odkazů automaticky tam, kde
existovala **obsahově ekvivalentní** náhrada (migrace domén, přesunuté cesty,
opravená ID). Viz commity „fix(redakce/data/web): … link-audit".

Následující položky **nebyly automaticky opraveny** záměrně: cílový konkrétní
dokument zanikl a existuje jen obecný rozcestník. Nahradit specifickou citaci
generickým hubem by na webu s ověřeným korpusem tvrzení (`claims.json`, 1377
tvrzení, drift-check) **degradovalo integritu citace** — čtenář/fact-checker by
u konkrétního tvrzení nenašel konkrétní zdroj. Patří proto k ručnímu dohledání
správného aktuálního zdroje, případně k úpravě textu citace.

Většina výskytů je v `data/explainers.json` (zdroj: `grep -n "<URL>" data/explainers.json`).

| Mrtvý odkaz (404/retired) | Nejbližší kandidát (ověř + případně uprav text) | Poznámka |
|---|---|---|
| `who.int/publications/i/item/9789289051996` | — (žádná shoda WHO/IRIS) | ISBN/ID pravděpodobně chybné/retired; dohledat správnou publikaci |
| `who.int/initiatives/critical-medicines` | `who.int/initiatives` | „Critical Medicines" je iniciativa EU (Alliance/Act), ne WHO — ověřit záměr citace |
| `who.int/europe/news-room/fact-sheets/item/improving-vaccine-uptake-through-pharmacy-services` | `who.int/europe/news-room/fact-sheets` | fact sheet s tímto názvem v indexu není |
| `eu-patient.eu/…/epf-toolkit-patient-involvement.pdf` | `eu-patient.eu/…/patient-empowerment---toolkit.pdf` | jiný (novější) toolkit; text možná uvést obecněji |
| `sundhed.dk/…/sygdomme-og-organer/dansk-apopleksi-register` | `sundhed.dk/…/hjerte-kar-sygdomme/` | stránka stroke-registru zanikla; nabízí se kardiovask. kategorie |
| `uzis.cz/…narodni-registr-cekacich-dob` | `uzis.cz/…narodni-zdravotni-registry` | registr pod tímto názvem neexistuje; čekací doby → eObjednávky (2027) |
| `uzis.cz/…narodni-cerebrovaskularni-registr` | `ikta.cz` | registr provozován externě (IKTA), ne na uzis.cz |
| `uzis.cz/…siet-zdravotnickych-zarizeni` + `…/sit-zdravotnickych-zarizeni-2024.pdf` | `nrpzs.uzis.cz` | publikace ukončena 2013; živý ekvivalent je registr NRPZS |
| `nku.cz/cz/kontrola/kontrolni-akce-2018` | `nku.cz/scripts/rka/prehled-kontrol.asp` | statická stránka roku neexistuje; jen vyhledávač kontrol |
| `ochrance.cz/aktualne/souhrnna-zprava-2023/` | `ochrance.cz/dokument/zpravy_pro_poslaneckou_snemovnu_2023/` | souhrnná zpráva 2023 (sněmovní tisk 665) |
| `lkcr.cz/aktuality-242.html` | `lkcr.cz/aktuality` | číselné ID článků zrušeno; konkrétní článek nedohledatelný |
| `agel.cz/o-nas/vyrocni-zpravy.html` | `agel.cz` | skupinová výroční zpráva na webu není; jen dceřiné subjekty |
| `asociacekraju.cz/aktuality/zdravotnictvi` + `…/temata/zdravotnictvi/` | `asociacekraju.cz` | web přepracován, sekce zdravotnictví nemá vlastní URL |
| `zdravotnickydenik.cz/2023/11/decin-porodni-sala-novorozenecke-oddeleni/` | — | skutečné 404, archiv článku nenalezen |
| `haiweb.org/publication/patient-organisation-funding/` | `haiweb.org/corporate-funding-linked-to-eu-patient-consumer-groups-policy/` | tématicky odpovídající živá stránka HAI Europe |
| `mzd.gov.cz/narodni-referencni-centra/` | `mzd.gov.cz/seznam-narodnich-referencnich-laboratori/` | pozor: „centra" vs. „laboratoře" — sémantický posun, ověřit záměr |

**Živé, ale bot-blokované (curl 403/466/502/000) — NEopravovat, jsou v pořádku:**
OECD (`oecd.org` 403 Akamai), `szpcr.cz`/`azzs.cz`/`czech-neuro.cz` (466 WAF),
`szu.gov.cz` (502 v sandboxu), `strokeaudit.org`/`mobilnihospic.cz`/`dent.cz`
(503), a všechny gov subdomény `*.uzis.cz`/`*.mzcr.cz`/`*.gov.cz` (000 =
egress-block sandboxu). Ověřeno přes WebFetch/WebSearch jako živé.
