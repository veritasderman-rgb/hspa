# Discovery report — 2026-05-26

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-26 (úterý). Předchozí běh 2026-05-25 → FALLBACK-AUDIT
(`clanek-detska-psychiatrie-krize.html`, dokončený audit-fix v PR #?, status
`partial`).

Prozkoumáno přímým WebFetch / WebSearch: ÚZIS aktuality (uzis.cz), MZ ČR
tiskové centrum (mzd.gov.cz), SZÚ aktuality (szu.gov.cz/aktuality), WHO
Europe news-room (who.int/europe/news-room), NKÚ tiskové zprávy (přes
WebSearch — nku.cz/scripts/modules/column/default.php?categid=29 vrátil
listing), Sbírka zákonů přes WebSearch (zakonyprolidi vrátil HTTP 403),
ČSÚ (csu.gov.cz/aktualni-informace vrátil HTTP 404 přes WebFetch),
NÚKIB (nukib.gov.cz/cs/aktualni-informace vrátil HTTP 404), Eurostat
(přes WebSearch). PDF kontrolního závěru NKÚ 25/07 stažen přímo
(curl + pdfjs-dist text extract, 50 566 znaků) a celý text ověřen.

## Nové primární zdroje od posledního běhu (25.–26. 5. 2026)

### HOT — nový primární trigger

#### NKÚ kontrolní závěr 25/07 (publikováno 25. 5. 2026)

- **Zdroj 1 (PRIMÁRNÍ):** NKÚ, kontrolní závěr č. 25/07 „Peněžní
  prostředky určené na posílení odolnosti páteřní sítě poskytovatelů
  zdravotní péče“, schváleno Kolegiem NKÚ 16. 3. 2026 usnesením
  č. 7/IV/2026, zpracoval Mgr. Roman Sklenák.
  PDF: <https://www.nku.cz/assets/kon-zavery/k25007.pdf> (18 stran,
  555 KB; metadata Created 21. 4. 2026; databáze NKÚ označuje
  poslední aktualizaci 25. 5. 2026 = den zveřejnění).
- **Zdroj 2 (PRIMÁRNÍ — TZ NKÚ):** „Z peněz na zotavení z covidové
  krize nemocnice nakupovaly i přístroje, které nepotřebovaly a téměř
  nevyužívaly“, 25. 5. 2026.
  URL: <https://www.nku.cz/cz/pro-media/tiskove-zpravy/z-penez-na-zotaveni-z-covidove-krize-nemocnice-nakupovaly-i-pristroje--ktere-nepotrebovaly-a-temer-nevyuzivaly-id15647/>
- **Zdroj 3 (PRIMÁRNÍ — TZ MZd, reakce):** „Ministerstvo zdravotnictví
  reaguje na kontrolní závěr NKÚ k prostředkům nástroje REACT-EU“,
  25. 5. 2026.
  URL: <https://mzd.gov.cz/tiskove-centrum-mz/ministerstvo-zdravotnictvi-reaguje-na-kontrolni-zaver-nku-k-prostredkum-nastroje-react-eu/>
- **Zdroj 4 (PRIMÁRNÍ — NKÚ doplňková stránka):** „REACT-EU
  v mezinárodním srovnání“, <https://nku.gov.cz/cz/-id15408> (NKÚ ji
  zmiňuje v textu závěru; stránku se nepodařilo přes WebFetch načíst —
  cituji NKÚ jako primární zdroj, link uveden u článku).

**Klíčové údaje z primárního zdroje (NKÚ 25/07, ověřeno přímo z PDF):**

| Co | Hodnota | Místo v PDF |
|---|---|---|
| Celková podpora SC 6.1 REACT-EU (zdrav., systémová úroveň) | 18 596 054 834 Kč (18,6 mld. Kč) | odst. 3.6, str. 8 |
| Kontrolovaný objem (8 projektů u příjemců) | 1 278 419 157 Kč k 30. 9. 2025 (z 1 377 320 835 Kč schválených) | tabulka 2, str. 9 |
| Počet podpořených poskytovatelů zdravotní péče | 82 | titulní strana, str. 2 |
| Urgentní příjmy I. typu (oprávnění žadatelé) | 19 | odst. 2.9 |
| Urgentní příjmy II. typu | 78 | odst. 2.9 |
| Maximální podpora UP I. typu / projekt | 500 mil. Kč | odst. 2.10 |
| Maximální podpora UP II. typu / projekt | 150 mil. Kč | odst. 2.10 |
| Položky v seznamu vybavení (UP I) | 225 | odst. 4.8 |
| Položky v seznamu vybavení (UP II) | 175 | odst. 4.8 |
| Přístrojů ve vzorku kontroly | 27 | odst. 4.14 |
| Z toho významně méně využíváno | 12 (z 27, 44 %) | odst. 4.14 |
| Z toho nevyužíván vůbec | 1 | odst. 4.14 |
| Pořizovací hodnota 12 méně využíváných přístrojů | 41 099 517 Kč (41,1 mil. Kč) | odst. 4.14 |
| Snížení efektivnosti (8 z 12 přístrojů, 14–62 % průměru ČR) | 32 373 550 Kč | odst. 4.15 |
| 3 RTG s C-ramenem Krajská zdravotní (Most/Litoměřice/Teplice/Rumburk) | 7 263 630 Kč pořizovací hodnota | odst. 4.15 |
| Optický spektrometr ICP OES, KZ Nemocnice Most (neúčelně vynaloženo) | 1 462 337 Kč; bez ostrého provozu i po 21 měsících | odst. 4.15, 4.20, str. 13 |
| Průměr výkonů na RTG s C-ramenem v ČR (2024) | >400/rok | odst. 4.15 + str. 2 |
| Skutečnost na 3 RTG Krajské zdravotní | <10 výkonů/rok | odst. 4.15 + str. 2 (graf) |
| Rozdíl ve výši dotace UP I vs UP II / nemocnice | 350 mil. Kč | odst. 4.24 |
| Plánované dokončení sítě urgentních příjmů | nejdříve 2029 | odst. 1 (shrnutí), 4.3 |
| Udržitelnost projektů | 5 let | odst. 2.14 |
| Životnost zdravotnické techniky (typicky) | <10 let | odst. 4.3 |
| Indikátor: hodnota pořízeného vybavení | cíl 559 124 553 EUR, dosaženo 580 197 753 EUR (103,77 %) | tabulka 3, odst. 4.26 |
| Indikátor: nově vytvořená lůžka pro COVID-19 | cíl 1 832, dosaženo 1 834 (100,11 %) | tabulka 3 |
| Indikátor: hospitalizace s využitím podpořených kapacit | cíl 923 033/rok, dosaženo 879 119 (95,24 %) | tabulka 3 |
| Indikátor: podpořená pracoviště | cíl 843, dosaženo 842 (99,88 %) | tabulka 3 |
| Růst počtu MR > 1,5 T 2019 → 2024 | +100 % | odst. 4.36 |
| Růst počtu skiagrafických RTG s přímou digitalizací | +36 % | odst. 4.36 |
| Novela § 44g zákona o zdravotních službách | zákon č. 290/2025 Sb., účinnost 1. 1. 2026 | odst. 2.18 |
| Přeřazení VFN Praha + FN u sv. Anny z UP II → UP I | mimo stanovené podmínky | odst. 4.22 |

**Reakce MZd (TZ z 25. 5. 2026):**

- Podpora koncepčně cílena na nemocnice 24/7 v době pandemie.
- „Nebylo možné přesně predikovat budoucí strukturu pacientů.“
- Kontrolní vzorek 27 přístrojů (z toho 12 = „méně využíváno“) je
  z tisíců pořízených zařízení = MZd odmítá zobecňování.
- U přístrojů nad 5 mil. Kč fungovala Přístrojová komise.
- MZd slibuje zlepšit datové vyhodnocování + revizi Přístrojové komise.

#### Implikace pro HSPA
- **Doména:** Procesy (efektivita využití kapitálových investic) +
  Struktury (síť urgentních příjmů, dostupnost přístrojové techniky)
  + Finance (návratnost veřejných investic).
- **Souvisle s indikátory korpusu:** `vyzv_pristrojove_kapacity` (pokud
  existuje; ověřit), `urgentni_prijem_dostupnost` (pravděpodobně chybí),
  `react_eu_dotacni_efektivita` (nutno přidat?), `mr_pristroje_per_mil`.
- **Souvisle s články korpusu:** `clanek-okresni-nemocnice-personalni-krize`
  (KZ Rumburk, Litoměřice, Most jsou KZ = okresní), `clanek-deficit-pojisteni-2026`,
  `clanek-financovani-sha`, `clanek-kyberneticka-bezpecnost-zdravotnictvi-2026`
  (REACT-EU financovala i kybersafety opatření, ale jiná Výzva), nový
  článek `clanek-reforma-pohotovosti-290-2025` ve frontě 8. 6. 2026
  (zákon č. 290/2025 = táž novela § 44g).

### Ostatní zdroje (bez nového triggeru)

#### ÚZIS
- Bez nové aktuality; poslední 5. 5. 2026 (prodloužení sběru výkazů
  za 2025) bez novinky.

#### MZ ČR — jiné TZ
- 25. 5. 2026 = REACT-EU reakce (viz výše).
- Mezi 21.-26. 5. žádná další zdravotně-politicky relevantní TZ.

#### SZÚ
- 25. 5. 2026 dvě aktuality (Helena Kazmarová ČT24 horké dny, ocenění
  V. Filipové) — bez HSPA implikace.
- 22. 5. 2026 dvě sekundární zmínky (záškrt Ostravsko, klíšťata v
  centrech měst přes iDnes) — záškrt už pokrytý článkem ve frontě
  `clanek-zaskrt-umrti-2026` (slot 11. 6.).

#### WHO Europe / WHO globálně
- Žádný CZ-specific trigger; nejnovější (20. 5. 2026) World No Tobacco
  Day awards = globální.

#### OECD
- Bez nové edice ani CZ-specific publikace.

#### Eurostat
- Bez nové vlny hlth_* relevantní pro CZ.

#### ČSÚ
- Bez zdravotně-statistické vlny v týdnu.

#### Sbírka zákonů / PSP
- Přístup omezený (HTTP 403/500). Bez známé nové normy MZ ČR.

#### SÚKL / NÚKIB / VZP
- Bez nového triggeru.

## Stav publikační fronty (k 26. 5. 2026)

Fronta obsahuje **22 článků naplánovaných na 26. 5. – 12. 6. 2026**
(per-den max 1, žádný slot není volný do 13. 6.). 4 drafty bez
`scheduled_for` (czechsex × 3, epiziotomie).

**Next publikační slot** (dle snippet v PROMPT_DAILY_ROUTINE.md
sekce 3.4): **2026-06-13**.

## Verifikace zdrojů (kritické pro audit fáze 5)

| Tvrzení v plánovaném článku | Primární zdroj | Stav |
|---|---|---|
| 18,6 mld. Kč na REACT-EU SC 6.1 zdravotnictví | NKÚ k25007 odst. 3.6 + str. 2 + odst. 4.1 | ✅ |
| 82 podpořených páteřních poskytovatelů | NKÚ k25007 str. 2 | ✅ |
| 27 přístrojů kontrolovaných; 12 méně využíváno; 1 vůbec | NKÚ k25007 odst. 4.14 | ✅ |
| 41,1 mil. Kč pořizovací hodnota | NKÚ k25007 odst. 4.14 | ✅ |
| 32,4 mil. Kč ztráta efektivnosti | NKÚ k25007 odst. 4.15 | ✅ |
| ICP OES 1,46 mil. Kč, 21 měsíců bez ostrého provozu | NKÚ k25007 odst. 4.15 + 4.20 + str. 13 | ✅ |
| 3 RTG s C-ramenem KZ < 10 výkonů/rok vs průměr >400 ČR | NKÚ k25007 odst. 4.15 + str. 2 | ✅ |
| 19 UP I. typu + 78 UP II. typu | NKÚ k25007 odst. 2.9 | ✅ |
| Síť UP plánovaná dokončit 2029 | NKÚ k25007 shrnutí + odst. 4.3 | ✅ |
| Schválení Kolegiem NKÚ 16. 3. 2026 | NKÚ k25007 str. 1 | ✅ |
| Reakce MZd 25. 5. 2026 | MZd TZ — viz URL | ✅ |
| Novela § 44g (zák. 290/2025 Sb. účinnost 1. 1. 2026) | NKÚ k25007 odst. 2.18 + Zákony pro lidi (ověřeno přes čl. ve frontě) | ✅ |
| MR >1,5 T +100 %, RTG +36 % (2019–2024) | NKÚ k25007 odst. 4.36 | ✅ |
| Indikátory výzvy (lůžka 1 832/1 834; pracoviště 843/842; hospitalizace 923 033/879 119) | NKÚ k25007 tabulka 3 | ✅ |
| Životnost techniky <10 let, udržitelnost 5 let | NKÚ k25007 odst. 4.3 + 2.14 | ✅ |

## Doporučení pro routing fáze

- **HOT (nový článek):** **`clanek-react-eu-nku-kontrola-2026.html`** —
  reakce na zveřejněný NKÚ kontrolní závěr 25/07 + TZ MZd. Primárně
  zdrojový, hustý na čísla, HSPA dimenze Procesy + Struktury + Finance,
  bez duplicity v korpusu.
- **WARM:** žádná akutní revize nutná.
- **COLD:** N/A — máme HOT trigger.

## Routing rozhodnutí

ARTICLE-WRITE → `clanek-react-eu-nku-kontrola-2026.html`,
slot 2026-06-13 (konec fronty), `topical_until: 2026-06-15`
pro prioritizaci v cron `publish-scheduled.js` (článek vázaný
na čerstvou kauzu by neměl klesnout na konec fronty mezi nezadržené
articley s `ready_since` před ním).

Viz `routing-2026-05-26.md`.
