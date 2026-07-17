# Discovery report — 2026-07-10

Běh denní rutiny. Ověřeno živě (WebFetch/WebSearch) proti primárním zdrojům.
Pozn.: doména `mzcr.cz` přesměrovává na `mzd.gov.cz`.

## Nové indikátory / datasety
- [ ] (žádný nový dataset od posledního běhu 07-09)
- ÚZIS aktuality: nejnovější stále „Tuberkulóza v ČR v roce 2025" (26. 6.), rozšíření
  NRPATV (15. 6.), čestné členství Duška/Hejduka (10. 6.). **Nic nového po 6. 6.**
- OECD Health at a Glance 2025 + EU Country Health Profile 2025 (publ. 12/2025) — již
  zapracováno; Eurostat bez nové vlny. **Není nové.**

## Nové legislativní normy / sněmovní tisky
- PSP `historie.sqw` bez strojově dohledatelného nového tisku k tématu (dynamická stránka).
- Legislativní newsletter MZ červenec 2026 pokrývá červen (4 předpisy MZ ve Sbírce,
  4 návrhy v PSP/Senátu) — již zaznamenáno v discovery 07-06/07-08/07-09. **Není nové.**

## Aktuální dění / kauzy s implikací pro zdravotnictví (primární TZ MZ)
- **NOVÉ (WARM): TZ MZ ČR z 9. 7. 2026** — „Ministr zdravotnictví Adam Vojtěch bilancuje
  první půlrok". Politická **bilance** (self-assessment) s vlastními čísly ministerstva:
  22/119 bodů Programového prohlášení splněno/fakticky dokončeno, 97 úkolů v procesu,
  1 200 léčivých přípravků nově předepisují praktici, 15 nových center duševního zdraví
  (min.) + 207 mil. Kč, 8 mld. Kč přerozděleno mezi ZP, 24 mld. Kč plánováno 2027–2028
  na platby za státní pojištěnce. Zdroj (HTTP 200): mzd.gov.cz/tiskove-centrum-mz/…
  ministr-zdravotnictvi-adam-vojtech-bilancuje-prvni-pulrok…
  **Povaha:** rámcová politická bilance, čísla jsou vlastní tvrzení MZ (ne nezávislá
  primární data). Většina dílčích faktů už zaznamenána v dřívějších TZ (převzetí agendy
  duševního zdraví 07-01, memorandum AI 07-08). → **Materiál pro Barometr politických
  prohlášení (BAR1–12), ne pro samostatný ARTICLE-WRITE.**
- Ostatní TZ MZ beze změny: 8. 7. (memorandum AI — pokryto revizí 07-09), 3. 7. (SYPOVO),
  1. 7. (agenda závislostí a duševního zdraví). Vše již pokryto.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna (OECD HAG 2025, ČSÚ, Eurostat — vše zapracováno).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno tento běh (MCP `hlidac_statu` mimo scope této session; doplňkový kanál).

## Datová integrita korpusu (kontrola při validaci)
- `npm run validate:all` **zelené** na vstupu (1377 claims, všechny quotes dohledatelné).
- `npm test` 568/578 — 10 pre-existing network-fetcher failures (csu, csu_sha, indiko,
  ingest-run-summary, puk, social-distribution, sukl, sukl_mr, uzis_nrpzs, uzis_nzis),
  bez souvislosti se změnou.
- **Nalezen cross-file drift** u `clanek-vyhnutelne-hospitalizace.html` (viz routing):
  audit 2026-05-15 aktualizoval HTML tělo na 592/473 a titulek „Téměř šest set…", ale
  `articles.json` `title`+`perex` a JSON-LD zůstaly na starých hodnotách (580/480,
  „Pět set osmdesát…"). Navíc dva databox údaje driftly od živého kontraktu.

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- HOT (nový článek): žádný způsobilý — jediná nová událost (bilance MZ) je politická
  self-assessment bez nezávislých primárních dat; fronta navíc plná (22 draftů).
- **FALLBACK-AUDIT:** nejstarší auditovaný článek `clanek-vyhnutelne-hospitalizace.html`
  (`last_reviewed: 2026-05-15`, 56 dní) → reověření zdrojů + oprava nalezeného driftu.

Fronta plná (22 draftů) + žádná způsobilá nová událost → nový článek by odporoval
železnému pravidlu. **FALLBACK-AUDIT** je správná cesta a přímo naplňuje důraz na
validaci a ověření zdrojů.
