# Discovery report — 2026-05-23

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-23 (sobota). Předchozí běh 2026-05-22 → FALLBACK-AUDIT
(rekonciliace `clanek-koureni.html`, status `review-pending`).

Prozkoumáno přímým WebFetch / WebSearch: ÚZIS aktuality (uzis.cz), MZ ČR tiskové
zprávy (mzd.gov.cz/tiskove-centrum/tiskove-zpravy), vláda ČR (vlada.gov.cz —
média centrum), WHO Europe news-room, OECD Health, Eurostat (health news + ESM
květnové vydání), ČSÚ aktuality, NÚKIB aktuality, PSP ČR (sněmovní tisky / 20.
schůze 26. 5.), zakonyprolidi.cz + Sbírka zákonů (přes WebSearch), SÚKL (HTTP
404), SZÚ aktuality, KHS Moravskoslezský kraj (khsova.cz), ECDC, WHO
Diphtheria fact sheet.

## Nové primární zdroje od posledního běhu

### HOT — primární zdroj, kauza s ověřitelnými fakty a HSPA implikací

**KHS Moravskoslezský kraj — tisková zpráva „Záškrt" z 22. 5. 2026.**
URL: `https://www.khsova.cz/homepage/detail-aktuality/14146` (PDF na detail-aktuality).
Mluvčí Aleš Kotrla, hygienička Zuzana Babišová.

Klíčová sdělení (ověřená přes KHS + dotvrzená ZD, ČT24, ČTK / iRozhlas):

- **Neočkovaný předškolní chlapec z Ostravska zemřel ve FN Motol dne 18. 5. 2026**
  po onemocnění záškrtem (transferován z FN Ostrava 23. 4. 2026 v důsledku
  zhoršování stavu).
- **V rodinném kontaktu** vyšetřeno 5 sourozenců + oba rodiče → infekce
  potvrzena u 3 sourozenců (2 školáci). **Pouze 1 dítě z rodiny bylo řádně
  očkováno.** Celá rodina hospitalizována na klinice infekčního lékařství FN
  Ostrava, přeléčena antibiotiky.
- **Záškrt v Moravskoslezském kraji:** 2000–2022 = 0 případů (nehlášeno).
  Do 2024 = 6 případů; 2025 = 14 případů (převážně kožní forma, 2 respirační);
  2026 (k 22. 5.) = **9 případů včetně 1 úmrtí**.
- **Protiepidemická opatření** nařízena v rodině i ve školním kolektivu.
  Riziko pro veřejnost dle KHS „velmi nízké"; ohnisko ohraničeno,
  trasování kontaktů dokončeno.

### Primární kontext k záškrtu v ČR (mimo MS kraj)

**SZÚ — tisková zpráva „Záškrt si letos vyžádal první oběť, zemřel 82letý muž"**
(6. 3. 2024). URL: `https://szu.gov.cz/aktuality/zaskrt-si-letos-vyzadal-prvni-obet-zemrel-82-lety-muz/`.

- **Poslední úmrtí na záškrt v ČR před rokem 2024: rok 1969.**
- 2022–2023 v ČR celkem 12 případů.
- Q1 2024 v ČR 6 případů.
- 2024 úmrtí: 82letý muž v jihlavské nemocnici — **první úmrtí v ČR po 55 letech**.
- Úmrtí v 2026 (Ostravsko, předškolák) je tedy **druhé úmrtí na záškrt v ČR
  od roku 1969**.

**SZÚ — Centrum epidemiologie a mikrobiologie / ISIN.**
URL pro datový tok: `https://szu.gov.cz/odborna-centra-a-pracoviste/centrum-epidemiologie-a-mikrobiologie/infekcni-nemoci-tematicky/vyskyt-infekci-v-cr/infekce-v-cr-isin-drive-epidat/`.
ISIN (od 2018, dříve EpiDat) je nyní povinný hlásicí systém infekčních nemocí
v ČR. Konkrétní měsíční zprávy o záškrtu z 2025–2026 nejsou na portálu
veřejně listed (data k vyžádání).

### Mezinárodní kontext — primární zdroj

**ECDC — Rapid Risk Assessment „Diphtheria caused by Corynebacterium diphtheriae
ST574 in the EU/EEA" (2025).**
URL: `https://www.ecdc.europa.eu/en/publications-data/diphtheria-caused-corynebacterium-diphtheriae-st574-eueea-2025`.

- **234 případů záškrtu v EU/EEA od ledna 2023.**
- **82 případů kmenu ST574 v období 2023–2025.**
- Většina případů mezi zranitelnými populacemi: migranti (zejména na
  migračních trasách / v přijímacích centrech), osoby bez domova,
  uživatelé injekčních drog.
- ECDC: „největší výskyt záškrtu v Evropě za 70 let" (souvisí převážně
  s migračními koridory, ne s endemickými zeměmi původu).
- ECDC RRA 2025: doporučuje cílené strategie pro zranitelné populace
  + udržet vysokou proočkovanost dětí.

**WHO — Diphtheria fact sheet (aktuální).**
URL: `https://www.who.int/news-room/fact-sheets/detail/diphtheria`.

- Case fatality rate u neléčených neočkovaných: **~30 %**, vyšší u malých
  dětí.
- Globální proočkovanost DTP3 (2023): 84 % → 16 % dětí na světě s neúplnou
  nebo žádnou ochranou.
- WHO doporučuje 6 dávek od 6 týdnů věku přes adolescenci (primární série
  + 3 boostery).
- COVID disrupce imunizačních služeb → zvýšená susceptibilita populace.

### Souvislost s vakcinací DTP v ČR — již v korpusu

**WHO/UNICEF WUENIC + WHO Mortality Database** (přes datové API Světové banky,
indikátor SH.IMM.IDPT). Dotvrzeno v `data/indicators.json` → `vakcinace_hexa_deti`
a v draft článku `clanek-vakcinace-hexa-deti.html` (review-pending,
scheduled 2026-05-22):

- Proočkovanost DTP3 dětí 12–23 měsíců v ČR: **97 % (2020) → 86 % (2024)**.
- EU průměr 92 % (2024), OECD 92 % (2024).
- Práh kolektivní imunity 95 %.
- ČR poprvé pod EU průměr DTP od zavedení monitoringu WUENIC.

## Nové legislativní normy / sněmovní tisky

- Žádné nové od posledního běhu (PSP — 20. schůze začíná 26. 5. 2026,
  v týdnu 18.–24. 5. žádný nový tisk v gesci MZ ČR v plénu / hlasování).
- Sbírka zákonů — žádná nová norma v gesci MZ ČR 21.–23. 5. 2026.

## Aktualizace existujících dat (vlna)

- **Žádná nová celostátní datová vlna.**
- ÚZIS aktuality bez nové vlny NRPZS / NOR / NRH / NRZP od 5. 5. 2026.
- ČSÚ — bez nové demografické / mortalitní vlny 21.–23. 5.
- OECD — Country Health Profile 2025 + HaG 2025 zůstávají nejnovějšími.
- Eurostat ESM květnové vydání (19. 5.) je obecný dashboard, ne nová
  zdravotní datová vlna.

## Další aktuální dění (zachyceno, nezvoleno pro tuto iteraci)

- **Klíšťová encefalitida — proočkovanost 17 % „úplným očkováním"** (SZÚ
  21. 5. 2026 přes Praha TV). Kvantifikace pochází z mediálního výstupu,
  primární SZÚ číslo „úplně očkováno" 17 % nebylo přes WebFetch / WebSearch
  zatím přímo dohledáno na szu.gov.cz; čeká na dotvrzení (možný kandidát
  pro další běh).
- **Epidemie virové hepatitidy A v Brně** — SZÚ má dedikovanou měsíční
  zprávu (B15-VHA-zprava-2026_02_01.pdf na szu.gov.cz). Dlouhodobá kauza,
  vhodná pro vlastní iteraci s ingest pipeline.
- **Hantavirus Andes** — MZ ČR TZ 20. 5. (preventivní izolace občana USA);
  operační epidemiologie, bez HSPA-policy implikace.
- **Nikotinové sáčky — Anna Niklová pro ČT24** (20. 5. 2026, SZÚ) — souvisí
  s rekonciliovaným `clanek-koureni.html`, ne nutně nový článek.

## Doporučení pro routing fáze

- **HOT (nový článek):** **ARTICLE-WRITE — záškrt 2026 / vakcinace dětí**.
  Primární zdroje: KHS MS 22. 5. 2026 + SZÚ 6. 3. 2024 + ECDC RRA 2025 +
  WHO fact sheet + WHO/UNICEF WUENIC. Téma má vysokou aktuálnost (úmrtí
  z minulé pondělí), výjimečnou doložitelnost (3 primární zdroje pro hlavní
  čísla) a přímou HSPA implikaci (preventabilní úmrtí + klesající
  proočkovanost dětí). Korpus nemá dedikovaný článek o záškrtu; existující
  `clanek-vakcinace-hexa-deti.html` pokrývá obecný pokles DTP coverage, ne
  konkrétní úmrtní kauzu. Doplňující odkazy: `clanek-vakcinace.html`,
  `clanek-vakcinace-hexa-deti.html`, indikátor `vakcinace_hexa_deti`.
- **WARM:** žádná akutní revize potřeba.
- **COLD / FALLBACK:** mimo rozsah dnešní iterace (HOT pokrývá).

## Verifikace primárních zdrojů (klíčové pro audit — fáze 5)

| Tvrzení | Primární zdroj | Stav |
|---|---|---|
| Neočkovaný předškolní chlapec z Ostravska zemřel 18. 5. 2026 na záškrt ve FN Motol | KHS MS press release 22. 5. 2026 (khsova.cz/homepage/detail-aktuality/14146) + ZD 22. 5. 2026 | ✅ ověřeno |
| Transfer z FN Ostrava 23. 4. 2026 | ZD 22. 5. 2026 (cituje KHS) | ✅ ověřeno |
| Nakaženo 3 z 5 sourozenců, hospitalizována celá rodina | KHS MS 22. 5. 2026 + ZD + ČTK / iRozhlas | ✅ ověřeno |
| Jediné dítě v rodině řádně očkováno | KHS MS 22. 5. 2026 (cit. mluvčí) | ✅ ověřeno |
| 2026 YTD MS kraj 9 případů (vč. 1 úmrtí); 2025 14 případů; 2024 6 případů; 2000–2022 = 0 | KHS MS 22. 5. 2026 | ✅ ověřeno |
| Poslední úmrtí na záškrt v ČR před 2024 = rok 1969 | SZÚ TZ 6. 3. 2024 | ✅ ověřeno |
| 2022–2023 v ČR celkem 12 případů; Q1 2024 = 6 | SZÚ TZ 6. 3. 2024 | ✅ ověřeno |
| 2024 Jihlava — 82letý muž, sportovec, aktivně žijící senior | SZÚ TZ 6. 3. 2024 | ✅ ověřeno |
| ECDC — 234 případů v EU/EEA od ledna 2023; 82 případů kmenu ST574 v 2023–2025; nejvíc za 70 let | ECDC RRA 2025 + CIDRAP | ✅ ověřeno |
| Case fatality rate záškrtu ~30 % u neléčených neočkovaných | WHO Diphtheria fact sheet | ✅ ověřeno |
| Globální DTP3 proočkovanost 2023 = 84 % | WHO Diphtheria fact sheet | ✅ ověřeno |
| ČR DTP3 proočkovanost dětí 12–23 měsíců 86 % (2024); EU 92 % | WHO/UNICEF WUENIC | ✅ ověřeno |

## Co je v aktuálním korpusu nepokryto a co tedy nový článek přidá

- Dedikovaná HSPA analýza záškrtu jako návratné nemoci s primárně-zdrojovou
  kauzální vazbou: pokles proočkovanosti → návrat nemoci → preventabilní úmrtí.
- Propojení dvou existujících datových bodů korpusu (DTP 86 % +
  rekonciliovaný preventabilní mortalitní rámec) s konkrétní událostí.
- Propojení s ECDC evropským kontextem (návrat záškrtu v Evropě jako
  systémový fenomén, ne izolovaná česká kauza).

---

**Routing rozhodnutí:** ARTICLE-WRITE → nový článek `clanek-zaskrt-umrti-2026.html`
(viz `routing-2026-05-23.md`).
