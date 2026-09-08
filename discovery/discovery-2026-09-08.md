# Discovery report — 2026-09-08

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, fáze 1). Každý nález níž má odkaz na
primární strojově dohledatelný zdroj a byl **dnes** ověřen přímo proti API / webu /
PDF daného zdroje — ne převzat z paměti modelu, z backlogu ani z předchozího
discovery reportu.

## Nové indikátory / datasety

- [ ] **ÚZIS — aktuality** (<https://www.uzis.cz/index.php?pg=aktuality>): beze změny,
  poslední věcná položka je pořád **14. 8. 2026** („Vysoké teploty a mortalita“).
  Žádná nová vlna NRPZS, NOR, NRH ani NRZP.
- [ ] **NZIP — datové zpravodajství** (<https://www.nzip.cz/modul/datove-zpravodajstvi>,
  ověřeno 8. 9. 2026): nejnovější položka je stále „Vysoké teploty a mortalita“
  (`/data/2833`), tedy tatáž vlna jako u ÚZIS. Nic nového. (Pozn.: `nzip.cz/data`
  vrací HTTP 404 / redirect smyčku — funkční kanál je `modul/datove-zpravodajstvi`.)
- [X] **ECDC Surveillance Atlas — EARS-Net, kombinovaná rezistence.** Ne nová vlna,
  ale **doposud nenapojená populace** v datasetu, který dashboard už čte. Čtyři
  measure kódy ověřeny dnes nezávisle proti metadatovému endpointu
  `GetIndicatorMeasuresForHealthTopicAndDataset?healthTopicId=4&datasetId=27`
  (152 measures, mapování ID → kód sedí 1 : 1):
  `KLEPNE.COMBINED.R.PROPORTION` = 1146375, `ESCCOL.COMBINED.R.PROPORTION` = 1146444,
  `PSEAER.COMBINED.R.PROPORTION` = 1146551, `ACISPP.COMBINED.R.PROPORTION` = 1146403.
  → viz „Doporučení pro routing“, větev INDICATOR-ADD.
- [ ] **OECD** (<https://www.oecd.org/en/topics/health.html>): stránka vrací HTTP 403
  pro strojový dotaz; kontrola dnes **neproběhla**. Health at a Glance 2026 se
  očekává až 11/2026, riziko zmeškané vlny je proto nízké — ale zaznamenávám to
  jako neověřený kanál, ne jako „nic nového“.

## Nové legislativní normy / sněmovní tisky

- **Sněmovní tisk 235** (novela zákona o pojistném na veřejné zdravotní pojištění —
  valorizace platby za státní pojištěnce). Ověřeno dnes na
  <https://www.psp.cz/sqw/historie.sqw?o=10&T=235>: usnesení garančního výboru pro
  zdravotnictví (tisk 235/1) ze **4. 9. 2026**, bod zařazen na **30. schůzi od
  8. 9. 2026** (2. čtení). K okamžiku běhu rutiny výsledek 2. čtení **není znám** —
  článek `clanek-valorizace-statni-pojistenci-2027` byl naposled revidován 5. 9.
  a věcně platí. **Přenáším jako WARM na zítřejší běh**, kdy bude stenozáznam.
- Žádná nová norma v gesci MZ ČR vyhlášená ve Sbírce od 5. 9. 2026. **Kanál ověřen
  jen částečně**: `zakonyprolidi.cz/cs/aktualne` vrací pro strojový dotaz HTTP 403
  a `e-sbirka.gov.cz` je SPA bez serverem renderovaného výpisu. Kontrolu Sbírky
  proto dnes nelze označit za úplnou.
- **Věstník MZ ČR** (<https://mzd.gov.cz/vestniky/>): poslední částky jsou
  **10/2026 (20. 8. 2026, „Seznam esenciálních antiinfektiv (SEAI) 2026“)** a
  **NIKEZ 1/2026 (10. 8. 2026)**. Obě jsou v korpusu pokryté
  (`clanek-esencialni-antiinfektiva`, resp. `discovery/data-frame-nikez-vestnik-1-2026.md`).
  Od 20. 8. žádná nová částka.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **MZ ČR, 7. 9. 2026** — „Cestovatelé by ani na podzim neměli podceňovat ochranu
  před komáry“. Osvětová zpráva bez datového výstupu. **COLD.**
- **MZ ČR, 4. 9. 2026** — dárcovství krve ve Strakově akademii. Osvěta. COLD.
- **MZ ČR, 3. 9. 2026** — EZKarta nové generace. Pokryto `clanek-ezkarta-nova-generace`.
- **WHO Europe** (1.–4. 9. 2026): čtyři položky — humanitární sklady na Ukrajině,
  lesní požáry a klima, nový zástupce WHO v Ukrajině, správa AI ve zdravotnictví.
  Žádná se zdravotnickým řezem pro ČR. COLD.
- **NÚKIB** (1. a 4. 9. 2026): dvě aktuality (ruští aktéři a Signal; Festival
  bezpečného internetu). Nic ke zdravotnictví ani NIS2. COLD.
- **ČSÚ** (<https://csu.gov.cz/aktuality>, ověřeno dnes): od 25. 8. žádná publikace
  k demografii, úmrtnosti, projekcím ani zdraví — jen trh práce, ekonomika,
  cestovní ruch, vzdělávání a volby. COLD.
- **SÚKL**: kanál dnes **neověřen**. `sukl.gov.cz/aktuality/` se renderuje až
  v prohlížeči (prázdné tělo pro strojový dotaz) a `opendata.sukl.cz` vrátil
  HTTP 503. Kontrola registru výpadků se přenáší na zítřek.
- **VZP**: výpis tiskových zpráv se rovněž renderuje klientsky; z indexovaného
  obsahu nevyplývá žádná nová finanční publikace od 20. 8. 2026. Kanál ověřen
  jen částečně.

## Aktualizace existujících dat (vlna)

- **Eurostat** — RSS `statistics-update.rss` (staženo dnes, 1 649 položek):
  z toho 29 zdravotních / demografických. Poslední zdravotní vlna je celá rodina
  `HLTH_SHA11_*` s časovým razítkem **2026-09-02T23:00:00+0200** — tu už
  **zpracoval běh 5. 9.** (revize `clanek-financovani-sha`). Ověřeno dnes znovu
  proti API, že se od té doby nic nezměnilo a že rozpad HC/HP za rok 2024 pořád
  není publikován (existuje jen agregát `TOT_HC` = 681 475 mil. Kč a rozpad HF).
  Od 3. 9. přibyly jen `DEMO_*` datasety (plodnost, narození) — bez řezu do
  zdravotního systému.
- **Kontrola driftu vlastních indikátorů proti čerstvé vlně (nad rámec zadání):**
  `vydaje_sprava_systemu_pct` (HC7 2023 = 1,91 %) a `vydaje_prevence_pct`
  (HC6 2023 = 2,74 %) přepočteny z `hlth_sha11_hc` unit `PC_CHE` — **shoda na
  setiny, žádný drift.**

## Recenzovaná literatura (PubMed / Consensus)

Dotaz PubMed spuštěn dnes přes MCP `PubMed` (`search_articles`, afiliační i
title/abstract filtr na ČR, `edat` 2026/09/05–2026/09/08): **10 záznamů**, z toho
devět bez systémové relevance (analytická chemie, PFAS v odpadní vodě, kazuistiky,
metodické přehledy).

- **PMID 42702336** · DOI [10.1016/j.jcpo.2026.100806](https://doi.org/10.1016/j.jcpo.2026.100806)
  — Bencina G, Bencina B. *Diverging Trends in Premature Mortality and Productivity
  Losses of Lung and Pancreatic Cancer in Central and Eastern Europe, 2010–2021.*
  J Cancer Policy 2026:100806 (publ. 6. 9. 2026). Devět zemí SVE včetně ČR, data
  WHO GBD, human-capital approach. YLL na karcinom plic v regionu klesly
  1 694 868 → 1 472 743, u pankreatu naopak vzrostly 375 802 → 395 652; ztráta
  produktivity u plic 6,37 → 4,33 mld. €, u pankreatu stabilně ~1,29–1,21 mld. €.
  **Zdrojová výhrada:** abstrakt nese jen regionální agregáty — **žádnou hodnotu
  za ČR** —, takže z něj podle železného pravidla nelze psát české číslo; plný
  text je za paywallem Elsevieru. **Druhá výhrada:** korespondenční adresa prvního
  autora je `@lilly.com`, ač afiliace uvádí University of Zagreb — při případném
  použití je nutné to uvést. Vedu jako **WARM kandidát na později**, ne jako
  dnešní spouštěč.

Consensus dnes nevolán — nevznikl žádný text s tvrzením o účinnosti, riziku nebo
dopadu, který by bylo třeba konfrontovat se souhrnem literatury.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

Všechny tři dotazy spuštěny **8. 9. 2026** přes MCP `hlidac-statu`
(<https://www.hlidacstatu.cz>).

- **VeKLEP** (31 záznamů s úpravou od 1. 9.): **ani jeden nový materiál v gesci
  MZ ČR.** Jediný zdravotnický materiál ministerstva — novela zákona č. 167/1998 Sb.,
  o návykových látkách (`KORNDVEC8EF8`, poslední úprava 1. 9. 2026) — je beze změny
  fáze proti běhu 6. 9. Za pozornost stojí **návrh zákona o státním rozpočtu ČR na
  rok 2027** (`KORNDXGKDRP9`, MF, autorizace 31. 8., poslední úprava 1. 9. 2026):
  nese kapitolu 335 a platbu za státní pojištěnce, tedy tutéž věc jako sněmovní
  tisk 235. Vedu jako **WARM kandidát** — rozpočtovou dokumentaci je nutné otevřít
  a ověřit, což je práce na samostatný běh, ne dnešní vedlejší úkol.
  <https://odok.cz/portal/veklep/material/KORNDXGKDRP9/>
- **Registr smluv** (kategorie `zdrav`, od 1. 9. 2026): **176 smluv v objemu
  42,87 mil. Kč.** Největší položky jsou rutinní: konsignační sklad
  Centra kardiovaskulární a transplantační chirurgie Brno s Medtronic Czechia
  (3,74 mil. Kč, 4. 9.), objednávky léčiv FN Ostrava / FN Olomouc / KZ a.s.
  Žádná smlouva těsně pod limitem ZZVZ, žádná mimořádná co do objemu.
  Jediný záznam s příznakem „Vážný nedostatek“ je dodávka radiofarmak
  ÚJV Řež → FN Ostrava za 0,64 mil. Kč — objemem pod prahem zpravodajské
  relevance. **Žádný kandidát na článek.**
- **ÚOHS**: **žádné nové rozhodnutí** s účastníkem ze zdravotnictví od 25. 8. 2026.

## Ověřovna Barometru — kandidáti

- (žádný nový kvantitativní výrok politika o zdravotnictví, který by šlo
  konfrontovat s indikátory dashboardu)

## Stav evergreen backlogu

`data/article-backlog.json`: **18 položek, z toho 15 `done`, 1 `skipped`, 2
`indicator-add` — a nula `ready`.** Fronta evergreen námětů je tedy vyčerpaná.
Podle PROMPT_DAILY_ROUTINE.md (FÁZE 2, bod 5 výběru) je to explicitní **signál
doplnit frontu o nové náměty**; dnešní běh to bere jako vedlejší úkol.

## Doporučení pro routing fáze

- **HOT (reaktivní):** žádný. Tři tiskovky MZ z 3.–7. 9. jsou osvěta nebo už mají
  vlastní článek; WHO, NÚKIB, ČSÚ, ÚOHS i Registr smluv jsou bez nálezu.
- **HOT (nový indikátor):** **kombinovaná rezistence** — čtyři measures EARS-Net
  ověřené dnes proti metadatům Atlasu i proti čitatelům/jmenovatelům
  (`R.COUNT / COUNT` sedí na desetinu procenta u všech čtyř) a definice i
  benchmark EU/EEA doslova ověřené v PDF ECDC AER 2024. → **INDICATOR-ADD.**
- **WARM (na zítřek):** (1) výsledek 2. čtení sněmovního tisku 235 na 30. schůzi;
  (2) rozpočtová dokumentace ke kapitole zdravotnictví v návrhu státního rozpočtu
  2027 (VeKLEP `KORNDXGKDRP9`); (3) J Cancer Policy 2026 (PMID 42702336) — jen
  pokud se podaří získat hodnoty za ČR z plného textu.
- **COLD:** VeKLEP (MZ), Registr smluv, ÚOHS, WHO, NÚKIB, ČSÚ bez nálezu.
- **EVERGREEN:** fronta prázdná → doplnit.
- **Uzavřeno z předchozích běhů:** WARM „doplnit DOI k `clanek-prostata-screening-pilot`“
  je **bezpředmětný** — článek DOI `10.1016/j.euros.2026.07.003`, PMID 42564931
  i PMC13445362 už nese (ověřeno dnes v PubMed: Eur Urol Open Sci 2026;91:41–48,
  publ. 25. 7. 2026, autoři i stránkování sedí). Vyřazuji z fronty přenášených úkolů.

## Kanály, které dnes nešlo ověřit (transparentně)

| Kanál | Důvod |
|---|---|
| Sbírka zákonů (zakonyprolidi.cz) | HTTP 403 pro strojový dotaz |
| Sbírka zákonů (e-sbirka.gov.cz) | SPA bez serverem renderovaného výpisu |
| SÚKL — aktuality a registr výpadků | klientský rendering / HTTP 503 na opendata |
| OECD — health topics | HTTP 403 |
| VZP — tiskové zprávy | klientský rendering (ověřeno jen přes index vyhledávače) |
