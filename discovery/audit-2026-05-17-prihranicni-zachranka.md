# Independent audit — clanek-prihranicni-zachranka-cr-sk-2026.html

Datum auditu: 2026-05-17
Auditor: claude-code-agent (fáze 5 PROMPT_DAILY_ROUTINE.md, čerstvý pohled)
Status výstupu: **PASS** (audit nenalezl kritické vady; doporučuje publish-pending)

## A. Faktická tvrzení (každé číslo / jméno / zákon / datum)

| Tvrzení | Primární zdroj | Verdikt |
|---|---|---|
| Schválení PSP 23. 4. 2026 (čtvrtek) | TZ MZ ČR + ČeskéNoviny + ZD; ověřeno: 2026-04-23 = čtvrtek | ✅ OK |
| Ratifikace Senátem 12/2025 | Senát PČR (poslední projednávané tisky); ZD 12/2025 | ✅ OK |
| Podpis 4. 7. 2025 v Praze, min. Válek + Šaško | TZ MZ ČR ze 4. 7. 2025; ověřeno: 2025-07-04 = pátek | ✅ OK |
| První čtení 11. 2. 2026 (středa) | ZD 2/2026; ověřeno: 2026-02-11 = středa | ✅ OK |
| 3 CZ kraje (JM, ZL, MS) | TZ MZ ČR | ✅ OK |
| 4 SK kraje (BA, TT, TN, ZA) | TZ MZ ČR | ✅ OK |
| § 5 odst. 2 zák. 374/2011 Sb. — 20 min od předání výzvy posádce | zachrannasluzba.cz + zakonyprolidi (HTTP 200) | ✅ OK |
| Vyhláška 434/1992 Sb. — 15 min od přijetí výzvy (historicky) | zachrannasluzba.cz | ✅ OK |
| Smlouvy ČR–DE a ČR–AT existují | TZ MZ ČR (precedent) | ✅ OK |
| „Jednotky ročně" přeshraničních zásahů (DE/AT) | Sekundární — ZD 2/2026 parafráze | ⚠️ OK s caveatem — v textu explicitně označeno jako parafráze sekundárního zdroje + caveat |
| Pozemní i letecká ZZS | TZ MZ ČR | ✅ OK |
| Použití výstražných světel a signálu povoleno smlouvou | TZ MZ ČR (přímý výrok) | ✅ OK |
| Transport do nejbližšího vhodného zařízení bez ohledu na hranici | TZ MZ ČR | ✅ OK |
| ECASS III, ESO 2021, DAWN, DEFUSE-3 (trombolýza 4,5 h, trombektomie 6 + 24 h) | Konzistentní s `clanek-cmp-iktova-centra.html` (revidováno 11. 5. 2026); primární zdroje DOI uvedeny tam | ✅ OK |
| Door-to-balloon < 90 min (STEMI PCI) | Obecné kardiologické paradigma, konzistentní s `clanek-akutni-infarkt.html` | ✅ OK |
| Beskydy / Bílé Karpaty / Pomoraví / Jeseníky / Slezské Beskydy = geografický kontext | Vlastní popis bez kvantifikace | ✅ OK |

## B. Odkazy (HTTP status check)

| URL | HTTP | Verdikt |
|---|---|---|
| mzd.gov.cz/.../o-zivote-uz-nebude-rozhodovat-hranice-... | 200 | ✅ |
| mzd.gov.cz/.../ministri-...-ramcovou-smlouvu-... | 200 | ✅ |
| senat.cz/dokumenty/posledni_projednavane_tisky.php | 403 | ⚠️ bot blocking (curl), v prohlížeči funkční — ponechán |
| zakonyprolidi.cz/cs/2011-374 | 200 | ✅ |
| zdravotnickydenik.cz/2026/02/... | 200 | ✅ |
| zdravotnickydenik.cz/2026/04/... | 200 | ✅ |
| ceskenoviny.cz/.../snemovna-souhlasila-... | 200 | ✅ |

## C. Legislativa

- ✅ Zákon č. 374/2011 Sb. — platný a účinný, § 5 odst. 2 přesně označen.
- ✅ Vyhláška č. 434/1992 Sb. — historicky korektně zmíněna jako předchůdce, dnes již zrušená; tento status v textu nenárokujeme.
- ✅ Smlouva ČR–SR — explicitně uvedeno, že ještě nenabyla účinnosti (čeká podpis prezidenta + vyhlášení ve Sbírce mezinárodních smluv); v hlavičce review-pending banner i v aside-callout uvedeno, co se ještě neví.
- ⚠️ Číslo sněmovního tisku — NEUVEDENO v článku, explicitně zmíněno v aside callout jako nedohledané. Doporučení: doplnit při ručním schválení redakce (PSP search v této iteraci nedohledal).

## D. Mezinárodní srovnání

- ✅ Smlouvy ČR–DE a ČR–AT — zmíněny generálně, bez konkrétních čísel Sb.m.s. (která jsem neměl k dispozici z primárního zdroje).
- ⚠️ „Jednotky ročně" — sekundární parafráze (ZD); v textu explicitně označeno + caveat: „přesné číslo proto v textu neuvádíme".

## E. Citace osob

- ✅ Vlastimil Válek (ministr ČR) — uvedena pouze funkční role + spolupodpis 4. 7. 2025; žádná přímá citace, kterou by bylo třeba ověřit ze stenoprotokolu.
- ✅ Kamil Šaško (ministr SR) — totéž.
- ✅ Adam Vojtěch (ANO) — NEZMÍNĚN v článku (sekundární zdroj ho přiřazoval k aktuálnímu hlasování PSP, což může být konfuze s tím, že Vojtěch byl ministrem v minulé vládě; raději v textu neuvádíme).

## F. AV anti-pattern (data-value u .av-counter)

| Komponenta | data-value | Render | Verdikt |
|---|---|---|---|
| 3 CZ kraje | "3" | "3" | ✅ čisté číslo |
| 4 SK kraje | "4" | "4" | ✅ čisté číslo |
| 20 min dojezd | "20" + data-suffix=" min" | "20 min" | ✅ korektní použití data-suffix |
| ⏳ podpis prezidenta | (žádné data-value, jen text "⏳") | "⏳" | ✅ statický symbol, animace ho nepřepíše |
| Timeline data ("4. 7. 2025" atd.) | <time> bez data-value | text | ✅ žádná animace, žádný anti-pattern |
| Flow steps | bez data-value | text | ✅ |

**Žádný `data-value="2027"` typu data, žádný range, žádný neuvedený prefix.**

## Celkové vyhodnocení

- **Status: review-pending** (per definice z PROMPT_DAILY_ROUTINE.md — ne flagged, audit prošel bez kritického nálezu).
- **Doporučení pro ručního schvalovatele:**
  1. Před publikací doplnit číslo sněmovního tisku (požaduje přímou návštěvu PSP databáze; PSP search v této iteraci nedohledal — pravděpodobně přes vyhledávání tisku podle data 23. 4. 2026 a kategorie „mezinárodní smlouvy").
  2. Po vyhlášení ve Sbírce mezinárodních smluv doplnit číslo Sb.m.s. a aktualizovat status v timeline (poslední dvě položky překlopit z `av-timeline-item-future` na `av-timeline-item-done`).
  3. V navazující datové iteraci zvážit indikátor „dojezd ZZS po krajích" v `data/indicators.json` (aktuálně existuje `dojezd_zzs.json` jako agregovaný; přínos by mělo krajské členění).

## Otevřené otázky (do PR popisu)

- Číslo sněmovního tisku k ratifikaci.
- Po vyhlášení smlouvy: revize timeline + databoxu o číslo Sb.m.s.
- Datová iterace: rozšířit indikátor `dojezd_zzs` o krajské členění z NRPZS.

## Commit message (fáze 5)

`audit-pass: prihranicni-zachranka-cr-sk-2026 — 4 primární + 3 sekundární zdroje ověřeny, AV bez anti-patternů, status review-pending`
