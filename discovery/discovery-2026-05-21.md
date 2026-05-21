# Discovery report — 2026-05-21

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-21 (čtvrtek). Předchozí běh 2026-05-20 → ARTICLE-WRITE
`clanek-protidrogova-dusevni-politika-mz-2026.html` (review-pending, zařazen do fronty
na 2026-06-11).

Prozkoumáno přímým WebFetch / WebSearch: MZ ČR tiskové centrum (mzd.gov.cz), ÚZIS
aktuality + souhrnné reporty (uzis.cz), vláda ČR (vlada.gov.cz — media-centrum,
aktuálně), WHO Europe news-room, OECD (Country Health Profile 2025 Czechia — plný PDF),
Eurostat (health news, hlth_cd_apr API), ČSÚ aktuality, NÚKIB aktuality, PSP ČR,
zakonyprolidi.cz (přes WebSearch).

## Nové primární zdroje od posledního běhu

### Žádná nová datová vlna, legislativa ani jednání vlády s dopadem na HSPA

- **MZ ČR — tiskové zprávy 14.–21. 5.:** 4 položky — preventivní přijetí občana USA
  po kontaktu s ebolou (20. 5., operační epidemiologie, bez HSPA-policy implikace),
  Cena A. G. Masarykové za ošetřovatelství (19. 5.), Den otevřených dveří MZ (18. 5.),
  dobrovolníci po CMP (15. 5.). Žádná policy implikace → ne článek.
- **ÚZIS — aktuality:** beze změny, poslední položka 5. 5. 2026 (prodloužení sběru
  výkazů za 2025 do 20. 5.). Žádná nová vlna NRPZS / NOR / NRH / NRZP.
- **ÚZIS — souhrnné reporty:** nejnovější jsou za rok 2024 (odměňování, personální
  kapacity, lékárenská péče) — žádný nový report v 4–5/2026.
- **Vláda ČR:** poslední „Výsledky jednání vlády" jsou z 18. 5. 2026 (pokryto během
  2026-05-20). Žádné jednání 20.–21. 5. Zvýšení rodičovského příspěvku (18. 5.) je
  v gesci MPSV — ne HSPA zdravotnictví.
- **WHO Europe news-room:** World No Tobacco Day awards (20. 5.), nástroj pro kvalitu
  služeb duševního zdraví dětí (18. 5.), klima a zdraví (17. 5.) — žádná ČR-specifická
  ani strukturální položka.
- **OECD Health:** žádná nová vlna. Country Health Profile 2025: Czechia (finalizováno
  9/2025, publikováno 12/2025) zůstává nejnovějším profilem — využit jako primární
  zdroj pro fallback audit (viz níže).
- **Eurostat Health:** žádný nový news release k 5/2026. Datová řada hlth_cd_apr má
  nově rok 2023 (využito v auditu).
- **ČSÚ — aktuality:** žádná nová demografická / zdravotní vlna v týdnu.
- **NÚKIB — aktuality:** žádný zdravotnický incident; poslední položky organizační
  (přesun kurzů na DIA e-Academy 20. 5., přehled incidentů za duben 13. 5.).
- **PSP ČR / Sbírka zákonů:** žádný nový zdravotnický tisk ani norma v gesci MZ ČR
  v týdnu 14.–21. 5. dohledané přes WebSearch.

## Aktualizace existujících dat (vlna)

- Žádná nová datová vlna s implikací pro nový článek.
- Eurostat `hlth_cd_apr` (preventable & treatable mortality) má dostupný rok 2023 —
  relevantní pro audit, ne pro nový článek.

## Doporučení pro routing fáze

- **HOT (nový článek):** žádný. Discovery report neobsahuje nový dataset, novou normu,
  jednání vlády ani kauzu s primárně-zdrojovou doložitelností a HSPA implikací.
- **WARM (revize kvůli vlně):** žádná akutní.
- **FALLBACK-AUDIT — VYBRÁNO:** discovery je klidná → přepnutí na fallback routine.
  Cíl: `clanek-pyll.html` — článek je od 2026-05-11 ve stavu **flagged** (nejvyšší
  „riziko nepřesnosti" v korpusu, fallback priorita #2). Centrální čísla se neověřují
  proti primárním zdrojům, flag-poznámka je navíc zčásti zastaralá (odkazuje na
  nedokončenou rekonciliaci kardiovaskulární mortality, kterou audit
  `clanek-kardiovaskularni-mortalita` dokončil už 2026-05-15).

## Verifikační status primárních zdrojů (klíčové pro audit — fáze 5)

Plný text **OECD/European Observatory, Country Health Profile 2025: Czechia**
(finalizováno 9/2025) přečten jako primární zdroj. Ověřené hodnoty:

| Tvrzení | Primární zdroj | Stav |
|---|---|---|
| Preventabilní úmrtnost ČR 195 / 100k, EU 168 (2022, +16 %) | CHP 2025, Figure 9 (zdroj Eurostat hlth_cd_apr) | ✅ ověřeno |
| Léčitelná úmrtnost ČR 113 / 100k, EU 90 (2022, +26 %) | CHP 2025, Figure 9 | ✅ ověřeno |
| Odvratitelná úmrtnost (preventabilní + léčitelná) ČR o 19 % nad EU | CHP 2025, Figure 9 + text | ✅ ověřeno |
| Preventabilní úmrtnost ČR — řada Eurostat 2019–2023 (188,33 / 218,38 / 285,92 / 195,45 / 173,86) | Eurostat hlth_cd_apr API (dissemination 1.0) | ✅ ověřeno |
| Denní kuřáctví dospělých ČR 15,9 % / 16 % (2024), EU 18,5 % (2023) — ČR POD průměrem EU | CHP 2025, Section 3 + Figure 5 | ✅ ověřeno |
| Spotřeba alkoholu ČR 11,2 l čistého alkoholu/dospělý (2023), EU 9,8 — 5. nejvyšší v EU | CHP 2025, Section 3 | ✅ ověřeno |
| Obezita dospělých ČR > 17 % (2022), EU 14,6 % | CHP 2025, Section 3 | ✅ ověřeno |
| Pohybová aktivita ČR 24 % cvičí > 3× týdně, EU 31 % | CHP 2025, Section 3 | ✅ ověřeno |
| KV nemoci 38,9 % a nádory 24,3 % všech úmrtí 2023 (celkem 63,2 %); 113 072 úmrtí 2023 | CHP 2025, Figure 2 (zdroj Eurostat hlth_cd_aro) | ✅ ověřeno |
| Kardiovaskulární mortalita ASR ČR 463,75 / 100k, EU-27 312,95 (2023, ESP 2013) | Eurostat hlth_cd_asdr2 (rekonciliováno auditem clanek-kardiovaskularni-mortalita 2026-05-15) | ✅ ověřeno |
| Struktura preventabilní úmrtnosti ČR 2022: plíce 14 %, ICHS 13 %, alkohol 13 %, COVID-19 9 %, CHOPN 7 % | CHP 2025, Figure 9 | ✅ ověřeno |
| Struktura léčitelné úmrtnosti ČR 2022: ICHS 22 %, kolorektální ca 14 %, pneumonie 10 %, CMP 8 %, ca prsu 7 % | CHP 2025, Figure 9 | ✅ ověřeno |

## Co NENÍ doloženo a v rekonciliovaném článku NEBUDE uvedeno jako fakt (iron rule)

- **Samotná hodnota PYLL 3 800 / 3 300** — neověřitelná z primárního strojově
  dohledatelného zdroje. OECD od reportů PYLL ustoupila ve prospěch rámce
  avoidable / preventable / treatable mortality; navíc OECD PYLL používá věkové
  pásmo 0–74, ne „< 70 let", jak uvádí článek i metodická karta.
- **Sebevraždy 12,5 / 100k vs OECD 10,5** — CHP 2025 udává sebevraždy jen jako podíl
  úmrtí (1,1 % všech úmrtí 2023), ne standardizovanou míru; v článku řešeno
  kvalitativně + odkazem na samostatný článek.
- **Onkologická mortalita ASR 180 vs 163** — CHP 2025 neudává míru, jen incidenci
  a podíl úmrtí; v článku řešeno přes rámec léčitelné úmrtnosti.

---

**Routing rozhodnutí:** FALLBACK-AUDIT → rekonciliace `clanek-pyll.html`
(viz `routing-2026-05-21.md`).
