# Discovery report — 2026-05-25

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-25 (pondělí). Předchozí běh 2026-05-24 → ARTICLE-WRITE
(`clanek-klistova-encefalitida-proockovanost-2026.html`, status `review-pending`,
slot 2026-06-12).

Prozkoumáno přímým WebFetch / WebSearch: ÚZIS aktuality (uzis.cz),
MZ ČR tiskové centrum (mzd.gov.cz), SZÚ aktuality (szu.gov.cz/aktuality),
WHO Europe news-room (who.int/europe/news-room), Sbírka zákonů přes
WebSearch (zakonyprolidi vrátil HTTP 403, PSP psp.cz HTTP 500), SÚKL
(sukl.cz redirect → sukl.gov.cz vrátil HTTP 404), VZP (vzp.cz), ČSÚ
(csu.gov.cz), NÚKIB (nukib.gov.cz), OECD (oecd.org/en/topics/health.html
vrátil HTTP 403; doplněno přes WebSearch), Eurostat (přes WebSearch),
WHO World Health Statistics 2026 (přes WebSearch).

## Nové primární zdroje od posledního běhu (18.–25. 5. 2026)

### Žádný nový HOT trigger pro samostatný článek

Procházení primárních zdrojů nevrátilo nové datasety, kauzy ani normy
s primárně-zdrojovou doložitelností a HSPA implikací, které by nebyly
již pokryté v korpusu nebo ve frontě 22 článků (do 2026-06-12).

#### ÚZIS
- Žádná nová aktualita (poslední 5. 5. 2026 — prodloužení termínu sběru
  výkazů za 2025, již zaregistrováno minulý běh).

#### MZ ČR
- Žádná nová TZ od 20. 5. 2026 (ebola — americký lékař preventivně přijat
  po kontaktu s ebolou v Ugandě; již zachyceno discovery 2026-05-24,
  operační epidemiologie bez HSPA-policy implikace).

#### SZÚ
- Žádná nová oficiální aktualita SZÚ za období 18.–25. 5. 2026 (poslední
  oficiální aktualita 20. 5. 2026 nikotinové sáčky — pokryto stávajícím
  korpusem; mediální zmínky o KE 17 %, záškrtu, žloutence A v Brně,
  hantaviru — všechny pokryty v korpusu nebo článcích ve frontě).

#### WHO Europe
- 18.–20. 5. 2026: tool pro child & youth mental health (globální nástroj
  bez CZ pilotu), World No Tobacco Day awards (globální), Türkiye emoční
  podpora pro adolescenty, midwives investment feature — vše zachyceno
  discovery 2026-05-24, bez CZ-specific dat ani primárního triggeru pro
  samostatný článek.

#### WHO globálně
- **World Health Statistics 2026** (publ. 13. 5. 2026, SDG monitoring) —
  globální souhrnný report; CZ-specific data nejsou jeho hlavním obsahem;
  jednotlivé CZ indikátory budou postupně zpracovány přes existující
  indikátorové karty, ne samostatným článkem.

#### OECD
- Bez nové edice Health at a Glance (HaG 2025 zůstává nejnovější
  celosvětovou edicí, HaG Europe 2024 nejnovější evropskou).
- Pracovní paper „Cluster analysis of NCD burden, prevention and
  management across EU27+2 countries" (zmiňováno z 21. 5. 2026) —
  primární zdroj se nepodařilo dohledat ve veřejně dostupné OECD
  bibliografii; bez ověření nepoužívat.

#### Eurostat
- Bez nové vlny hlth_* datasetů s implikací pro CZ.

#### ČSÚ
- Bez nové zdravotnické / mortalitní vlny. Aktuální vydání 18.–22. 5.
  (zaměstnanost Q1, indexy cen výrobců duben, newsletter, časopis
  o AI, tisková konference dětská jména) — mimo HSPA scope.

#### NÚKIB
- 22. 5. elektronické certifikáty NBÚ (procesní), 20. 5. smishing
  varování (obecné), 20. 5. eAkademie migrace, 13. 5. dubnový incident
  report (18 incidentů, 3 významné, polovina pokusů o průlom) — bez
  zdravotnicko-specifické sekce v novém týdnu; zachycené pro budoucí
  kontext článku o kybernetické bezpečnosti zdravotnictví, který už
  v korpusu existuje (clanek-kyberneticka-bezpecnost-zdravotnictvi-2026).

#### Sbírka zákonů / PSP
- Žádná nová norma v gesci MZ ČR vyhlášená ve Sbírce zákonů 18.–25. 5.
- PSP psp.cz HTTP 500 přístup neúspěšný; podle sekundárních zdrojů
  20. schůze plánovaná od 26. 5. 2026 ještě neproběhla.

#### SÚKL
- sukl.gov.cz/farmaceuticky-trh/registr-vypadku-leciv vrátil HTTP 404
  (přesměrování zlomené po migraci sukl.cz → sukl.gov.cz). Nelze ověřit
  nové výpadky této iteraci.

#### VZP
- Bez nové výroční zprávy (VZ 2025 dosud nepublikována — čeká na
  schválení PSP). Aktuální známá data o ZPP 2026 (deficit −12,7 mld. Kč,
  výdaje 341,2 mld. Kč, příjmy 215 mld., platba za státní pojištěnce
  108,7 mld., fond prevence 2,26 mld.) jsou již reflektovaná v korpusu
  (clanek-deficit-pojisteni-2026, clanek-platba-statu-statni-pojistenci).

## Stav publikační fronty (k 25. 5. 2026)

Fronta obsahuje **22 článků naplánovaných na 25. 5. – 12. 6. 2026**
(per-den max 1, žádný slot není volný do 13. 6.). 4 drafty bez
scheduled_for (czechsex × 3, epiziotomie). Korpus je nasycený.

## Doporučení pro routing fáze

- **HOT (nový článek):** **ŽÁDNÝ** — žádný nový primární trigger od
  posledního běhu, fronta je plná na 18 dní dopředu. Přidávat 23.
  článek do fronty bez čerstvého primárního zdroje by porušilo zásadu
  „lepší 1 článek se 4 primárními zdroji než 5 článků s vágními
  tvrzeními".
- **WARM:** žádná akutní revize nutná — vlna OECD HaG 2025 už byla
  zpracovaná v rámci dřívějších revizí (HaG 2025 cited napříč korpusem
  konzistentně).
- **COLD / FALLBACK:** **AUDIT-NEJSTARŠÍHO**. Z 21 publikovaných článků
  jsou:
  - 2 články bez audit bloku v HTML hlavičce
    (`clanek-detska-psychiatrie-krize.html` z 8. 5. 2026 — vůbec bez
    audit metadata; `clanek-ai-act-zdravotnictvi-srpen-2026.html`
    z 18. 5. 2026 — má audit v articles.json status verified, ale chybí
    HTML blok).
  - 15 článků status `partial`, 4 status `review-pending`, žádný `verified`.
  - Nejstarší kompletně chybějící audit: **clanek-detska-psychiatrie-krize.html**
    (publikován 17 dnů, žádný audit blok, obsahuje hodně konkrétních
    čísel — 157 psychiatrů, 559 lůžek, 4–8 měsíců čekání, Věstník MZ
    č. 9/2025).

## Verifikace primárních zdrojů (klíčové pro audit — fáze 5)

| Tvrzení v cíli auditu | Primární zdroj | Stav |
|---|---|---|
| 157 dětských psychiatrů, 559 lůžek, 47 % v důchodu do 5 let | TZ MZ ČR 12. 9. 2025 (Koncepce dětské a dorostové psychiatrie) | ✅ |
| Standard CDZ-D ve Věstníku MZ č. 9/2025 | mzd.gov.cz/vestnik/vestnik-9-2025/ (vydáno 25. 6. 2025) | ✅ — **datum opravit ze „září 2025" na „25. 6. 2025"** |
| Standard ~860 lůžek (8 lůžek / 100 tis. obyvatel) | TZ MZ ČR / Goetz 12. 9. 2025 | ✅ |
| 2 plně funkční dětská CDZ | Zdravotnický deník 12. 9. 2025 | ✅ |
| Plán krajů (Liberec leden 2026, Pardubice Chrudim+Polička, Zlín Otrokovice, Ústí 8 center 2026–2028, Č. Krumlov) | Zdravotnický deník 9/2025 | ✅ |
| Strategie reformy psychiatrické péče 8. 10. 2013 | Tisková zpráva MZ ČR 8. 10. 2013 | ⚠️ — **upřesnit formulaci:** přijatá v NPR 2013 v březnu, oficiálně představená 8. 10. 2013 |
| Pilotní CDZ start 2018 (Operační program Zaměstnanost) | Výzva MZ ČR 23. 3. 2018, projekt „Podpora vzniku CDZ I" (CZ.03.2.63/0.0/0.02/15_039/0004672) | ✅ — **lze doplnit konkrétní datum a registr projektu** |
| OECD A New Benchmark for Mental Health Systems 2021 | OECD doi.org/10.1787/4ed890f6-en (16. 6. 2021) | ✅ |
| 13 vs OECD 17,3 psychiatrů / 100 tis. obyvatel | HSPA dashboard indikátor `psychiatri_per_100k` | ✅ |
| DPN Opařany, FN Brno, FN Motol, FN Olomouc — existence | Veřejné webové stránky | ✅ |
| Linka bezpečí 116 111, Linka pro rodinu a školu 116 000, ZS 155 | Veřejně známá čísla | ✅ |

## Doplňující čísla z TK MZ 12. 9. 2025 NEUVEDENÁ v auditovaném článku

- **5 denních stacionářů celkem** (potřeba 2 v každém kraji = 28).
- **15 rezidentních míst pro dětskou psychiatrii ročně** (limit supervize:
  1 supervizor max 3 rezidenty).
- **+70 % nárůst dětí v psychiatrické péči od 2020** (Goetz, 12. 9. 2025).

Tato čísla jsou primárně doložitelná, ale jejich doplnění není podmínkou
auditu — článek na nich kauzálně nestaví. Lze ponechat na future revizi.

---

**Routing rozhodnutí:** FALLBACK-AUDIT → `clanek-detska-psychiatrie-krize.html`
(viz `routing-2026-05-25.md`).
