# Discovery report — 2026-06-04

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního zdroje, nezůstává. Předchozí běh 2026-06-03 →
ARTICLE-WRITE (`clanek-pooperacni-sepse-2026`, MZ ČR TZ 2. 6. + PUK).

## Procházené primární zdroje (stav fetch)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | MZ ČR — tiskové zprávy | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **3. 6. nová TZ — radioterapie (viz HOT)** |
| 2 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | poslední položka 5. 5. 2026 (administrativní), nic nového |
| 3 | SZÚ — aktuality | szu.gov.cz/aktuality/ | ✅ 200 | 3. 6. žloutenka (6 úmrtí letos, 2 rizikové regiony); 30. 5. WNTD; 22. 5. úmrtí na záškrt (neočk. dítě, Ostrava) |
| 4 | ČSÚ — aktuality | csu.gov.cz/aktuality | ✅ 200 | 3. 6. pracovní neschopnost stabilní (bez HSPA datové vlny); 1. 6. trh práce duben |
| 5 | WHO Europe — news-room | who.int/europe/news-room | ✅ 200 | bez ČR-specifického triggeru |
| 6 | NZIP / SÚKL / zakonyprolidi | — | ⚠️ 403 fetch | ověřeno přes WebSearch, bez nové normy v gesci MZ datované po 30. 5. |

## Nové legislativní normy / sněmovní tisky

- (žádná nová ověřená norma v gesci MZ ČR datovaná po 30. 5. — zakonyprolidi
  nedostupné fetch, bez potvrzení neuvádím)

## Aktuální dění / kauzy s implikací pro zdravotnictví (MZ ČR TZ)

- **3. 6. 2026** — „Ministerstvo zdravotnictví zpřesňuje pravidla pro dostupnost
  specializované radioterapie" → **HOT**, dosud v korpusu nepokryto. Reforma
  indikace vysoce specializovaných metod (CyberKnife, Leksellův gama nůž,
  protonová terapie) přes doporučení multidisciplinárního týmu KOC; cíl
  rovný přístup bez ohledu na region + datová transparentnost. Citováni ministr
  Adam Vojtěch a ředitel sekce zdravotní péče Patrik Zachar. Bez čísla
  vyhlášky / harmonogramu (zatím příprava metodiky s odbornými společnostmi).
- 2. 6. 2026 — pooperační sepse (✅ zpracováno 3. 6., `clanek-pooperacni-sepse-2026`)
- 29. 5. 2026 — Rögnerová zpět na MZ; IKEM (personálie, bez HSPA triggeru)

## Nové datové vlny / datasety

- ČSÚ 3. 6. pracovní neschopnost — stabilní, bez nové strukturální vlny.
- ÚZIS: poslední aktualita 5. 5. 2026 (administrativní).
- Žádný nový dataset OECD/Eurostat/WHO s ČR-implikací k 4. 6. ověřen.

## Aktualizace existujících dat (vlna)

- (žádná nová vlna vyžadující revizi existujícího článku dnes)

## Doporučení pro routing fáze

- **HOT (aktuální dění s institucionálně doložitelným rámcem):**
  `dostupnost-radioterapie-2026` — reforma indikace vysoce specializované
  radioterapie přes KOC (MZ ČR TZ 3. 6. 2026). Navazuje na publikovaný korpus
  centralizace (`clanek-centralizace-chirurgie-2027`) a onkologický koordinátor
  (`clanek-onkologicky-koordinator-2026`). Dvě nezávislé primární linie:
  (1) MZ ČR TZ 3. 6.; (2) institucionální rámec — Věstník MZ 14/2020 (národní
  radiologické standardy protonové RT, §70 odst. 5 zák. 373/2011 Sb.) +
  Věstník MZ 11/2025 (Koncepce organizace onkologické péče, síť KOC). → **ARTICLE-WRITE**
- WARM: žádná zastaralá vlna vyžadující revizi dnes.
- COLD: n/a (discovery přinesl HOT trigger).
