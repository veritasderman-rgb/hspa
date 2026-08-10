# Discovery report — 2026-08-10

## Nové indikátory / datasety
- [X] **PubMed/MEDLINE — první výsledky českého pilotu screeningu karcinomu
  prostaty**: Koudelková M, Hejcmanová K, … Dušek L, Májek O. *Implementation
  and First Results of the Czech Nationwide Prostate Cancer Screening Pilot
  Program.* Eur Urol Open Sci 2026;91:41–48, publ. 25. 7. 2026, do PubMed
  vstoupilo v posledních dnech (EDAT okno 25. 7.–10. 8.). PMID 42564931,
  PMC13445362 (open access — plný text stažen a vytěžen 10. 8. 2026),
  DOI 10.1016/j.euros.2026.07.003. Autoři: Národní screeningové centrum ÚZIS
  + IBA MU + ČUS + Sahlgrenska. Klíčová čísla (ověřeno z plného textu):
  150 498 mužů 50–69 zapojeno v roce 2024 (3 291 PL + 89 urologů); PSA výsledek
  u 146 109; 8,8 % PSA ≥ 3,0 µg/l; 67,2 % z nich na urologii do 6 měsíců;
  dvouleté pokrytí PSA testováním 47,4 % (2023) → 53,3 % (2024), +5,9 p. b.
  proti průměru +0,77 p. b./rok v letech 2011–2023; MRI před biopsií 28,0 %
  → 38,3 % (+10,3 p. b., 95% CI 8,3–12,2). Dataset studie na Zenodo.
  **Korpus prostatu nepokrývá vůbec** (0 článků, žádný indikátor) — přitom
  rodina screeningových indikátorů existuje (cervix 65,7 %, mamograf 54,5 %,
  kolorektum 31,1 %, plíce 2,7 %). → INDICATOR-ADD + ARTICLE-WRITE kandidát.

## Nové legislativní normy / sněmovní tisky
- (nezjistitelné live) — zakonyprolidi.cz/cs/aktualne HTTP 403 přes proxy
  (shodně s běhy 08-01…08-09); psp.cz/sqw/historie.sqw vrací „Sněmovní tisk
  nebyl nalezen" (jen navigace). Sekundární sken (WebSearch) nezachytil žádnou
  novou normu v gesci MZ ČR z 8.–10. 8. Sněmovna mezi schůzemi.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- MZ ČR /vsechny-novinky/ (ověřeno 10. 8., 03:15 UTC): beze změny proti 08-09
  — poslední položky 7. 8. (tamoxifen 6 000 balení — zpracováno revizí 8. 8.;
  kvalita vody). Víkend, žádná nová TZ z 8.–10. 8. Sekundární sken vytáhl
  starší TZ „Česko otevírá výsledky pooperačních sepsí" (2. 6. 2026 — korpus
  pokrývá: `clanek-pooperacni-sepse-2026.html`) a plán spolupráce MZ–WHO
  2026–2027 (30. 7. 2026 — bez nových dat, priority již pokryté korpusem).
- ÚZIS aktuality (ověřeno 10. 8.): beze změny — poslední položky personální
  inzeráty (7. 8., 3. 8.), poslední datová publikace TBC 2025 (26. 6.).
- WHO Europe (ověřeno 10. 8.): beze změny — poslední 5. 8. (kojení, pokryto).
- NÚKIB (ověřeno 10. 8.): beze změny — poslední 7. 8. (NIS2 výzva k podání
  nabídky, administrativní).

## Aktualizace existujících dat (vlna)
- SÚKL MR feed (opendata.sukl.cz/soubory/MR/mr.zip, staženo 10. 8., soubor
  generován 9. 8. 22:15, platnost 10.08.2026): 82 671 hlášení; jediné nové
  hlášení z 8.–10. 8. je **obnovení** dodávek (BRAUNOL 75MG/G, D08AG02) —
  žádný nový výpadek. Produkční počet aktivních přerušení obnoví dnešní
  pondělní ingest cron (06:00 UTC) — mimo scope denní rutiny.
- ČSÚ: listing rychlých informací je JS katalog, přes proxy nečitelný; Pohyb
  obyvatelstva 2Q vyjde v září. OECD/Eurostat mimo publikační okno.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- MCP `hlidac_statu` není v této session připojen → kanál přeskočen (bez
  náhrady sekundárními zdroji, v souladu s citačními pravidly kanálu).

## PubMed sken (EDAT 25. 7.–10. 8., ČR + healthcare/mortality/screening)
60 záznamů, prvních 8 prověřeno metadaty: 7× klinické studie bez systémového
dosahu (stereotaktická biopsie gliomů, cediranib, vestibulární schwannom…),
1× **HOT nález výše** (prostata pilot). Záznam „Intention to Stay in
Healthcare Among Healthcare Students… Czechia and Slovakia" — WARM, k případné
revizi personálních článků později (neblokuje dnešní routing).

## Doporučení pro routing fáze
- HOT (nový indikátor): `screening_prostata` — dvouleté pokrytí PSA testováním
  mužů 50–69 (53,3 % / 2024, trend 47,4 % / 2023) z recenzované studie
  NSC ÚZIS; doplní kompletní screeningovou rodinu indikátorů.
- HOT (aktuální dění): článek „první výsledky pilotu screeningu prostaty" —
  plně doložitelný z primární recenzované open-access studie + kontext
  Věstník MZ 15/2023 (MRI protokoly), EU Council Recommendation 2022.
- WARM (revize): —
- COLD: fallback-audit není potřeba. Evergreen backlog je prázdný (0 ready)
  — signál pro redakci doplnit náměty; dnešní běh to nepotřebuje (HOT trigger).

## Poznámka k dostupnosti zdrojů (proxy)
zakonyprolidi.cz (403), psp.cz (tisky nedostupné), csu.gov.cz + Věstník MZ
listingy (JS, nečitelné). Plně dostupné: uzis.cz, mzd.gov.cz
(/vsechny-novinky/ + TZ), opendata.sukl.cz (mr.zip), who.int, nukib.gov.cz,
PubMed/PMC (plné texty přes MCP).
