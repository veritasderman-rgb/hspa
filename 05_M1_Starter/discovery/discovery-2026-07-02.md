# Discovery report — 2026-07-02

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
**co není ověřené z primárního strojově dohledatelného zdroje, na portálu
nezůstává.** Uživatel pro tento běh znovu explicitně zdůraznil: **„Naprosto
zásadní je validace a ověření všech zdrojů!!!!"** 2. 7. 2026 je **čtvrtek** — a
zároveň **den plánované publikace** draftu `clanek-dohodovaci-rizeni-2027-vysledek`
(`scheduled_for: 2026-07-02`). Verifikace toho článku proti primárnímu zdroji je
proto nejvyšší priorita běhu.

Startovní stav: publikační fronta drží **19 nepublikovaných draftů** (o 1 víc než
včera). Poslední discovery report = **2026-07-01** (verifikační pas). Mezera 1 den,
kontinuita zachována.

## Procházené primární zdroje (stav fetch k 2. 7. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější položka stále **26. 6.** „Tuberkulóza v ČR v roce 2025". **Žádná nová položka v červenci.** Žádná nová vlna NRPZS/NOR/NRH/NRZP. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější TZ z přelomu měsíce (elektronizace 24. 6., dohodovací řízení 18. 6., +24 mld 14. 6.). **Žádná nová TZ v červenci** s tvrdým triggerem pro nový článek. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | Beze změny s dopadem na zdravotnictví (zdravotnické účty 2024 = 64 tis. Kč/os, Demografie 2/2026, Pohyb obyvatelstva 1Q — vše zpracováno). Žádná nová mortalitní/EHIS vlna. |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | **NOVÉ: varování před šířením svrabu (scabies)** — 30. 6. zprávy o úmrtích na komplikace (sepse/orgánové selhání), 1. 7. epidemiolog varuje před rychlým šířením. Dále klíšťata Hyalomma (29. 6.), vedra, letní GIT — sezónní/surveillance obsah. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat, who.int | ✅ search | HAG 2025 + Country Health Profile Czechia 2025 (life exp. 80,3) stále nejnovější, v korpusu. Žádná nová `hlth_*` vlna s ČR-implikací. |
| 6 | **PSP ČR / Sbírka zákonů** | psp.cz, zakonyprolidi.cz | ⚠️ anti-bot | Strojově neověřeno; žádný nový normativní akt v gesci MZ ČR po 18. 6. netvrdím. Úhradová vyhláška 2027 avizována „do konce října" (zatím nevydána). |
| 7 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ přístupnost | Registr výpadků strojově obtížně dohledatelný. Žádný nový výpadek netvrdím. |

## Nové indikátory / datasety

- (žádný nový indikátor / dataset)

## Nové legislativní normy / sněmovní tisky / strategie

- Bez strojově ověřeného nového normativního aktu v gesci MZ ČR k 2. 7. 2026.
  Úhradová vyhláška 2027 = avizovaný termín „do konce října", zatím nevydána.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **NOVÝ soft trigger: svrab (scabies).** SZÚ 30. 6. – 1. 7. varuje před šířením;
  mediálně kolují zprávy o úmrtích na komplikace. **Zatím NEpokládám za HOT pro
  nový článek**: klíčové tvrzení („úmrtí na svrab") přichází přes mediální /
  search-summary rámec, **nikoli z primárně strojově dohledatelného datasetu**
  (svrab není v ČR běžně hlášená nemoc s evidovanou mortalitou). Psát článek s
  úmrtním číslem, které neumím doložit z primárního zdroje, by porušilo železné
  pravidlo. → **WATCH pro příští běhy**: pokud SZÚ/ISIN vydá surveillance report se
  strojově ověřitelnou incidencí svrabu, přehodnotit na ARTICLE-WRITE.
- Ostatní čerstvé triggery (TBC 2025, PPN 2025, dohodovací řízení 2027, paliativní
  strategie 2035, dostupnost léčiv od praktiků) jsou **již pokryté** korpusem —
  draftem ve frontě nebo záznamem ve `strategies.json`.

## Ověřovací pas — imminentní publikace (KLÍČOVÝ VÝSTUP BĚHU)

Nejvyšší-hodnotová a nejnižší-riziková práce dnešního běhu: nezávislé ověření
centrálních KPI draftů, které v následujících 72 h vyjdou, proti živým primárním
zdrojům. **Dnes publikuje `dohodovaci-rizeni-2027` — jeho verifikace je nadřazená.**

| Draft (scheduled_for) | Centrální KPI | Verifikace tento běh |
|---|---|---|
| `clanek-dohodovaci-rizeni-2027-vysledek` (**07-02 = DNES**) | 12/15 segmentů (1 částečná); podmínka 25→21 mld vypuštěna; úhr. vyhláška do konce října | ✅ **DIRECT** — všechny 3 centrální citace ověřeny **verbatim** z primární TZ MZ ČR 18. 6. (fetch 200) + VZP aktualita 9. 6. (fetch 200) potvrzuje „12 z 15" a 3 nedohodnuté segmenty doslovně |
| `clanek-tuberkuloza-cr-2025` (07-03) | 435 případů; 3,99/100 tis.; 52,4 % narozeno mimo ČR; MDR 6,5 %; úspěch 72,3 % | ✅ live search potvrzuje 52 % narozeno mimo ČR; **435** je doložená finální revize předběžných **429** (registr uzavřen 30. 4., výroční zpráva 26. 6.) — správně ošetřeno; PDF dosažitelné (529 KB) |
| `clanek-pohlavni-nemoci-2025` (07-04) | kapavka 2 663 (24,4/100 tis.); syfilis 1 239 (nejvíc od 2001); vrchol 2024 = 28,1/100 tis. | ✅ všechny zdrojové odkazy resolují (NZIP open-data NR-29-01, ECDC AER 2024, ČSÚ denominátor); zdroj + vrchol 2024 ověřeny (viz 07-01) |

### Detail ověření draftu publikujícího DNES (`dohodovaci-rizeni-2027`)

Primární zdroj: **TZ MZ ČR 18. 6. 2026** „Rekordní shoda ve zdravotnictví…"
(WebFetch 200). Doslovná shoda všech tří centrálních citací článku:

1. „Zástupci poskytovatelů zdravotních služeb a zdravotních pojišťoven dospěli
   k dohodě **ve 12 z 15 segmentů, přičemž v jednom případě byla uzavřena
   částečná dohoda**." ✓ verbatim
2. „V rámci závěrečného jednání byla z uzavřených dohod **vypuštěna podmínka
   navýšení platby za státní pojištěnce o 25 miliard korun**. Uzavřené dohody
   tak zůstávají platné i **při aktuálně schváleném navýšení této platby o 21
   miliard korun**." ✓ verbatim
3. „**Úhradová vyhláška pro rok 2027 bude zveřejněna ve Sbírce zákonů do konce
   října** letošního roku." ✓ verbatim

Sekundárně-primární potvrzení ze strany pojišťoven: **VZP aktualita 9. 6. 2026**
(WebFetch 200): „Dohody se … podařilo dosáhnout ve 12 z 15 segmentů. Nedohodly se
segmenty akutní a následné lůžkové péče a segment mimolůžkové ambulantní
specializované péče." ✓ potvrzuje jak počet, tak identitu 3 nedohodnutých segmentů.

Údaj „>60 % nákladů" u 3 nedohodnutých segmentů je v článku **explicitně** označen
jako sekundární (Naše zdravotnictví), neověřený proti primárnímu rozpadu úhrad —
v souladu se železným pravidlem. Žádná per-segmentová % růstu z paměti.

**Nález: žádný.** Článek publikující dnes je plně doložen primárním zdrojem.

## Doporučení pro routing fáze

- HOT (nový indikátor): žádné
- HOT (aktuální dění → nový článek): **žádné doložitelné** — svrab je WATCH
  (chybí primárně strojově ověřitelná mortalita/incidence), fronta saturovaná
- WARM (revize publikovaného článku): žádná zastaralá vlna nenalezena
- **PRIORITA: ověřovací pas — proveden, viz tabulka. Klíč: dohodovaci-rizeni-2027
  publikuje DNES a je ✅ verbatim ověřen z primární TZ MZ ČR.**
- COLD: fallback audit nejstaršího článku nebyl nutný — čas i hodnota lépe využity
  na verifikaci imminentních publikací (soulad s uživatelovým důrazem na ověření).
