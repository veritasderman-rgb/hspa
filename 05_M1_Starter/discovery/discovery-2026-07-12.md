# Discovery report — 2026-07-12

Běh denní rutiny. Ověřeno živě (WebFetch/WebSearch + PubMed MCP) proti primárním zdrojům.
Poslední discovery: 2026-07-11 (fallback-audit kyberbezpečnost). Pozn.: `mzcr.cz` → `mzd.gov.cz`.

## Nové indikátory / datasety
- [ ] (žádný nový dataset od 07-11)
- ÚZIS aktuality: nejnovější stále „Tuberkulóza v ČR v roce 2025" (26. 6.) a NRPATV
  (15. 6.) — obojí již pokryto / **není nové**. Žádná nová vlna od 07-11.
- OECD HAG 2025 + EU Country Health Profile 2025 zapracováno; Eurostat bez nové vlny.

## Nové legislativní normy / sněmovní tisky
- Bez nového strojově dohledatelného triggeru. `zakonyprolidi.cz/cs/aktualne` opět 403
  (WebFetch, infra — ne obsahová změna).

## Aktuální dění / kauzy s implikací pro zdravotnictví (primární TZ MZ)
- MZ tiskové zprávy — nejnovější stále **9. 7.** (půlroční bilance ministra Vojtěcha, už
  vyhodnoceno 07-11 jako roundup bez nového KPI). Bez nové TZ od 07-11.
- **TZ MZ 3. 7. 2026** — „představilo nový systém péče o pacienty se vzácnými
  onemocněními (SYPOVO), výsledkem je Národní strategie do 2035". **Ověřeno:** týká se
  tématu již pokrytého článkem `clanek-vzacna-onemocneni-strategie-2035.html`. Centrální
  claim článku („vláda schválila strategii **30. 3. 2026**") **potvrzen** křížově
  (WebSearch + mzd.gov.cz kategorie strategie); 3. 7. je jen veřejná prezentace výsledků
  projektu SYPOVO (běžel 1. 7. 2023 – 30. 6. 2026, 95 expertů, 20 analytických reportů
  pro ERN). Žádná nová centrální hodnota → **není ARTICLE-WRITE ani revizní trigger**;
  dřívější audit F1 (07-10) tohoto článku byl správný.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno tento běh (MCP `hlidac_statu` mimo scope této session; doplňkový kanál).

## Stav publikační fronty
- **22 draftů** (published: false). Fronta plná → nový článek by odporoval železnému
  pravidlu „lepší žádná změna než zbytečná".

## Datová integrita korpusu (kontrola při validaci)
- `npm run validate:all` **zelené** (1377 claims, všechny quotes doslovně dohledatelné).
  `npm test` — **787/787 pass**.

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- HOT (aktuální dění → nový článek): žádný způsobilý (bilance MZ roundup; strategie
  vzácných onemocnění již pokryta a její centrální claim potvrzen).
- WARM (revize kvůli nové primárně doložené události): žádný nový trigger.
- **COLD → FALLBACK-AUDIT**: nejstarší reviewed publikovaný článek je z 2026-05-16
  (kyberbezpečnost byla auditována 07-11) → další nejstarší je
  `clanek-onkologicky-koordinator-2026.html` (last_reviewed 2026-05-16, legislativa-
  a číslo-těžký; vysoká hodnota source-verifikace dle železného pravidla).
