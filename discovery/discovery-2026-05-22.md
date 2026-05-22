# Discovery report — 2026-05-22

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-22 (pátek). Předchozí běh 2026-05-21 → FALLBACK-AUDIT
(rekonciliace `clanek-pyll.html`, flagged → review-pending).

Prozkoumáno přímým WebFetch / WebSearch: ÚZIS aktuality (uzis.cz), MZ ČR tiskové
zprávy (mzd.gov.cz/tiskove-centrum/tiskove-zpravy), vláda ČR (vlada.gov.cz —
výsledky jednání vlády), WHO Europe news-room, OECD Health (Health at a Glance
2025 + Country Health Profile 2025: Czechia), Eurostat (health news), ČSÚ
aktuality, NÚKIB aktuality, PSP ČR (sněmovní tisky / schůze), zakonyprolidi.cz
+ Sbírka zákonů (přes WebSearch), SÚKL.

## Nové primární zdroje od posledního běhu

### Žádná nová datová vlna, legislativa ani jednání vlády s dopadem na HSPA

- **ÚZIS — aktuality:** beze změny, poslední položka 5. 5. 2026 (prodloužení sběru
  výkazů za 2025 do 20. 5.). Žádná nová vlna NRPZS / NOR / NRH / NRZP.
- **MZ ČR — tiskové zprávy:** beze změny od 2026-05-21. Poslední položka 20. 5.
  (preventivní přijetí občana USA po kontaktu s ebolou — operační epidemiologie,
  bez HSPA-policy implikace). Žádná nová položka 21.–22. 5.
- **Vláda ČR:** poslední „Výsledky jednání vlády" zůstávají z 18. 5. 2026. Žádné
  jednání 21.–22. 5. (jednání vlády probíhají typicky ve středu; další očekáváno
  v týdnu od 25. 5.).
- **WHO Europe news-room:** World No Tobacco Day awards (20. 5.), nástroj pro
  kvalitu služeb duševního zdraví dětí (18. 5.), klima a zdraví (17. 5.) — žádná
  ČR-specifická ani strukturální položka.
- **OECD Health:** žádná nová vlna. Country Health Profile 2025: Czechia a Health
  at a Glance 2025 zůstávají nejnovějšími — využity jako primární zdroj pro
  fallback audit (viz níže).
- **Eurostat Health:** žádný nový dedikovaný health news release k 5/2026.
  European Statistical Monitor — květnové vydání (19. 5.) je obecný dashboard,
  ne nová zdravotní datová vlna.
- **ČSÚ — aktuality:** indexy cen výrobců (20. 5.), zaměstnanost VŠPS 1Q (18. 5.),
  pozvánka na TK „Dětská jména" (21. 5.) — žádná nová demografická / mortalitní /
  zdravotní vlna.
- **NÚKIB — aktuality:** žádný zdravotnický incident; poslední položky organizační
  (přesun kurzů do DIA e-Academy 20. 5., přehled incidentů za duben 13. 5.).
- **PSP ČR:** 20. schůze Sněmovny začíná až 26. 5. 2026 — v týdnu 21.–22. 5. žádné
  hlasování ani nový zdravotnický tisk v gesci MZ ČR.
- **Sbírka zákonů:** žádná nová norma v gesci MZ ČR 21.–22. 5. dohledaná přes
  WebSearch.
- **SÚKL — registr výpadků léčiv:** stránka vrátila HTTP 403 (přímý WebFetch
  nedostupný); žádný signál kritického výpadku z ostatních zdrojů.

## Aktualizace existujících dat (vlna)

- Žádná nová datová vlna s implikací pro nový článek.

## Doporučení pro routing fáze

- **HOT (nový článek):** žádný. Discovery report neobsahuje nový dataset, novou
  normu, jednání vlády ani kauzu s primárně-zdrojovou doložitelností a HSPA
  implikací.
- **WARM (revize kvůli vlně):** žádná akutní.
- **FALLBACK-AUDIT — VYBRÁNO:** discovery je klidná → přepnutí na fallback routine.
  Cíl: `clanek-koureni.html` — jeden ze sedmi *nikdy neauditovaných* článků
  (bez `audit:` YAML bloku) a zároveň **živě na portálu** (`published` v
  `articles.json` chybí → `isArticleVisible` = true, `date` 2026-05-07 v minulosti).
  Patří do nejvyšší fallback priority #2 (riziko nepřesnosti — článek s konkrétními
  čísly) a navíc je u něj **doložené korpusové riziko**: routing 2026-05-21 explicitně
  zaznamenal, že hodnota denního kuřáctví je napříč korpusem nesprávná
  (`kuractvi_denni` v datovém kontraktu = 22,6 %; clanek-pyll uváděl obrácený směr).
  `clanek-koureni.html` je dedikovaný článek o kouření a téměř jistě nese stejnou
  chybu.

## Verifikační status primárních zdrojů (klíčové pro audit — fáze 5)

Plný text **OECD/European Observatory, Country Health Profile 2025: Czechia**
(PDF, finalizováno 9/2025, publ. 12/2025) a **SZÚ — Národní výzkum užívání tabáku
a alkoholu v ČR 2024 (NAUTA 2024)** (PDF, publ. 5/2025) přečteny jako primární
zdroje. Ověřené hodnoty pro kouření:

| Tvrzení | Primární zdroj | Stav |
|---|---|---|
| Denní kuřáci ČR (15+) **16,4 % v roce 2024**, 15,9 % v roce 2023 | SZÚ NAUTA 2024, s. text + Graf 1 (přímá citace: „nepozorujeme výrazné změny v prevalenci denních kuřáků — 15,9 % v roce 2023 vs. 16,4 % v roce 2024") | ✅ ověřeno |
| Kuřáci tabákových výrobků celkem ČR (denní + příležitostní) **22,4 % v roce 2024** | SZÚ NAUTA 2024 („V roce 2024 jsme … zaznamenali 22,4 % kuřáků … tabákových výrobků"; příležitostní 6,0 %) | ✅ ověřeno |
| CHP 2025: „In 2024, **16 % of adults smoked daily, below the 2023 EU average of 18,5 %** (SZÚ, 2025)" | OECD CHP 2025: Czechia, Section 3 Risk factors | ✅ ověřeno |
| CHP 2025: „Czechia has **successfully reduced adult smoking rates to below the EU average**" + „a substantial decline **from 23 % in 2012**" | OECD CHP 2025: Czechia | ✅ ověřeno |
| OECD průměr denního kuřáctví **14,8 %**; ČR 15,9 % (mírně nad OECD průměrem) | OECD Health at a Glance 2025 | ✅ ověřeno |
| Denní vapování dospělých ČR vzrostlo **z 2 % (2019) na 9 % (2024)** | OECD CHP 2025: Czechia | ✅ ověřeno |
| Mladí 15–24: čtvrtina užívá e-cigarety alespoň příležitostně (2024) | OECD CHP 2025: Czechia (SZÚ, 2025) | ✅ ověřeno |
| Tabáková kontrola ČR: zákaz kouření na veřejných místech **2017**, růst spotřební daně od **2020**, daň na zahřívaný tabák od 2019, na e-cigarety a nikotinové sáčky od 2024, věkové omezení sáčků 18+ od 2023 | OECD CHP 2025: Czechia | ✅ ověřeno |
| Preventabilní úmrtnost ČR **+16 %** nad EU, léčitelná **+26 %**, odvratitelná **+19 %** (2022); preventabilní 195/100k vs EU 168 | OECD CHP 2025, Figure 9 + text (preventabilní hodnota rekonciliována auditem clanek-pyll 2026-05-21) | ✅ ověřeno |
| UK: současní kuřáci cigaret 11,9 % (2023, věk 18+) | ONS Adult smoking habits in the UK 2023 | ✅ ověřeno |

## Co je v `clanek-koureni.html` neověřitelné / chybné (iron rule)

- **Centrální claim „Denně kouří 22,6 procenta dospělých Čechů"** — chybný.
  22,6 % (přesněji 22,4 % dle NAUTA 2024) je podíl **všech kuřáků tabáku**
  (denní + příležitostní), NE denních kuřáků. Denní kuřáctví je **16,4 %** (2024).
  Záměna metodiky „current/total smokers" vs „daily smokers".
- **„v průměru zemí OECD je to 16"** — chybné. 16 % je přibližně *česká* hodnota
  denního kuřáctví; průměr OECD je 14,8 %.
- **Rámec „Česko zaostává" / „Co s tím jiné země udělaly a Česko zatím ne"** —
  pro denní kuřáctví nepravdivý: CHP 2025 výslovně uvádí, že ČR srazila kuřáctví
  **pod průměr EU** a že to umožnila „comprehensive tobacco control legislation".

---

**Routing rozhodnutí:** FALLBACK-AUDIT → rekonciliace `clanek-koureni.html`
(viz `routing-2026-05-22.md`).
