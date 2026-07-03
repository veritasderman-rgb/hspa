# Discovery report — 2026-07-03

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
**co není ověřené z primárního strojově dohledatelného zdroje, na portálu
nezůstává.** Uživatel pro tento běh znovu explicitně zdůraznil: **„Naprosto
zásadní je validace a ověření všech zdrojů!!!!"** 3. 7. 2026 je **pátek** — a
zároveň **den plánované publikace** draftu `clanek-tuberkuloza-cr-2025`
(`scheduled_for: 2026-07-03`). Nezávislé ověření centrálních KPI tohoto článku
proti primárnímu zdroji je proto nejvyšší priorita běhu.

Startovní stav: publikační fronta drží **19 nepublikovaných draftů** (beze změny
proti 07-02). Poslední discovery report = **2026-07-02**. Mezera 1 den, kontinuita
zachována. Technická validace: `npm run validate:all` ✅ (159 indikátorů, 36
strategií, 35 explainerů, 9 prevence, 165 článků, dohodovací řízení, financing,
clinical-quality — vše OK), `npm run verify:freshness` ✅ (live_ratio 0,377 ≥ 0).

## Procházené primární zdroje (stav fetch k 3. 7. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější položka stále **26. 6.** „Tuberkulóza v ČR v roce 2025". **Žádná nová položka v červenci.** Žádná nová vlna NRPZS/NOR/NRH/NRZP. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **NOVÉ (primární): TZ 1. 7. 2026** „Ministerstvo zdravotnictví převzalo agendu politiky v oblasti závislostí a duševního zdraví." → primární potvrzení kompetenčního přesunu (dosud avizovaného) k datu účinnosti 1. 7. Žádná nová TZ 2.–3. 7. |
| 3 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | Svrab (scabies) — pokračující pokrytí (1. 7. Nova: „letos 4 úmrtí na komplikace"; 2. 7. Aktuálně: STI „nákaza ohrožující plodnost"). **STÁLE jen mediální citace, ŽÁDNÝ formální SZÚ surveillance bulletin se strojově ověřitelnou incidencí/mortalitou svrabu.** → svrab zůstává WATCH, ne HOT. |
| 4 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | Beze změny s dopadem na zdravotnictví. 2. 7. jen „Plánovaný výpadek DataStat" (technická notice); 1. 7. ICT mzdy, deficit vlády Q1, zaměstnanost 5/2026. Žádná nová mortalitní/EHIS/demografická vlna. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat, who.int | ✅ search | HAG 2025 + Country Health Profile Czechia 2025 stále nejnovější, v korpusu. Žádná nová `hlth_*` vlna s ČR-implikací. ECDC/WHO TBC report 2026 (2024 data, publ. 23. 3. 2026) ověřen tento běh (viz níže). |
| 6 | **PSP ČR / Sbírka zákonů / zakonyprolidi** | psp.cz, zakonyprolidi.cz | ⚠️ anti-bot (403) | Strojově neověřeno (WebFetch 403 = anti-bot, ne mrtvý odkaz). Žádný nový normativní akt v gesci MZ ČR po 18. 6. netvrdím. Úhradová vyhláška 2027 avizována „do konce října" (zatím nevydána). |
| 7 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ přístupnost | Registr výpadků strojově obtížně dohledatelný. Žádný nový výpadek netvrdím. |

## Nové indikátory / datasety

- (žádný nový indikátor / dataset)

## Nové legislativní normy / sněmovní tisky / strategie

- **MZ ČR — TZ 1. 7. 2026** „Ministerstvo zdravotnictví převzalo agendu politiky
  v oblasti závislostí a duševního zdraví." — **primární** potvrzení kompetenčního
  přesunu protidrogové a duševně-zdravotní agendy z Úřadu vlády na MZ ČR
  (účinnost 1. 7. 2026). 07-02 byl přesun doložen jen datem účinnosti + řadou
  zdrojů; nyní existuje **primární TZ MZ**. → upgrade WARM follow-upu pro
  publikovaný `clanek-protidrogova-dusevni-politika-mz-2026.html` (atribuce data
  účinnosti lze nyní povýšit na primární TZ MZ).
- Věstník MZ ČR č. 8/2026 (29. 6.) — beze změny od 07-02 (WATCH: Standard akutní
  lůžkové dětské psychiatrické péče; výzva onkourologická centra 2026–2030).
- Úhradová vyhláška 2027 = avizovaný termín „do konce října", zatím nevydána.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **Svrab (scabies) — WATCH (nezměněno).** SZÚ stránka nese pokračující **mediální**
  pokrytí (Nova 1. 7.: „letos 4 úmrtí na komplikace spojené se svrabem"; iDNES 30. 6.;
  Aktuálně 2. 7.). Klíčové tvrzení („úmrtí na svrab / počet úmrtí") stále přichází
  přes **mediální / expertní komentář**, nikoli z primárně strojově dohledatelného
  SZÚ/ISIN surveillance datasetu. Svrab není v ČR běžně hlášená nemoc s evidovanou
  mortalitou. Psát článek s úmrtním číslem, které neumím doložit z primárního
  zdroje, by porušilo železné pravidlo. → **WATCH pokračuje**: přehodnotit na
  ARTICLE-WRITE, jakmile SZÚ/ISIN vydá surveillance report se strojově ověřitelnou
  incidencí/mortalitou.
- STI „nákaza ohrožující plodnost" (Aktuálně 2. 7.) — evropská vlna bakteriálních
  PPN; téma je **již pokryto draftem** `clanek-pohlavni-nemoci-2025` (fronta,
  scheduled_for 07-04).
- Kompetenční přesun agendy závislostí/duševního zdraví na MZ — viz výše, WARM.

## Ověřovací pas — imminentní publikace (KLÍČOVÝ VÝSTUP BĚHU)

Nejvyšší-hodnotová a nejnižší-riziková práce dnešního běhu: **nezávislé ověření
centrálních KPI draftu publikujícího DNES** (`clanek-tuberkuloza-cr-2025`,
scheduled_for 07-03) proti živým primárním zdrojům. Provedeno přímou extrakcí
textu z primárního PDF ÚZIS (zlib/FlateDecode dekomprese lokálně staženého PDF,
529 KB) + nezávislým dohledáním benchmarku a srovnávacího roku.

### Detail ověření draftu publikujícího DNES (`tuberkuloza-cr-2025`)

Primární zdroj: **ÚZIS ČR — „Základní přehled epidemiologické situace ve výskytu
tuberkulózy v ČR v roce 2025"** (Registr tuberkulózy RTBC, data k 27. 5. 2026,
uzis.cz/res/f/008469/tbc2025-cz.pdf, WebFetch 200 = 529 KB PDF).

**Přímo ověřeno z PDF (extrakce textu z content streamů):**

| Tvrzení v článku | Nález v PDF | Verdikt |
|---|---|---|
| 435 hlášených onemocnění TBC (2025) | „Celkem **435** 323 112 **3,99** 6,04 2,02" (řádek Celkem: 435 celkem, 323 muži, 112 ženy, incidence 3,99/100 tis.) | ✅ verbatim |
| incidence 3,99/100 tis. | „3,99" (2×) | ✅ verbatim |
| muži > 74 % | 323/435 = 74,3 % | ✅ (odvozeno z PDF) |
| 52,4 % narozeno mimo ČR | „Celkem **52,4** v tom: Ukrajina 31,5 Slovensko 4,4 Filipín…" | ✅ verbatim (% ); 52,4 % × 435 = 228 osob ✅ |
| Ukrajina 137 osob | Ukrajina 31,5 % × 435 = 137,0 | ✅ (odvozeno z PDF %) |
| MDR 6,5 % (24/372) | „Celkem multirezistence (MDR) 29,41 5,35 **6,45**" (24/372 = 6,45 %) | ✅ (článek zaokrouhluje 6,45→6,5 %, standardní zaokrouhlení) |
| rifampicin 6,7 % | „rifampicin (R) 29,41 20 5,63 **6,72**" → 6,72→6,7 % | ✅ verbatim |
| isoniazid 11,0 % | „…11,02" (jakákoliv rezistence na isoniazid) → 11,0 % | ✅ verbatim |
| léčebný úspěch 72,3 % (kohorta 2024) | „Potvrzené TBC hlášené v roce 2024 100,0 100,0 70,0 **72,3**" | ✅ verbatim + kohorta 2024 potvrzena |
| Praha 120 osob / 8,58 /100 tis. | „Hl.m.Praha **120** **8,58** 7,65 5,72…" | ✅ verbatim |
| Zlínský 1,90 /100 tis. (nejnižší) | „…**1,90**…" | ✅ verbatim |
| 89,9 % plicní (391) | 391/435 = 89,9 % | ✅ (odvozeno; % konzistentní se základnou 435) |
| 84,1 % definitivní (366), 41,1 % mikroskopie (179) | 366/435 = 84,1 %, 179/435 = 41,1 % | ✅ (odvozeno; interně konzistentní) |

**Nezávislé dohledání (mimo PDF):**

- **Benchmark EU/EHP 8,4/100 tis.** — ověřeno **verbatim** z primárního zdroje:
  WHO Europe/ECDC „Tuberculosis surveillance and monitoring in Europe 2026 (2024
  data)", publ. **23. 3. 2026**: „In 2024, **38 249** cases of TB were reported in
  **30** EU/EEA countries, resulting in a notification rate of **8.4 per 100 000**."
  → přesně odpovídá článku (8,4/100 tis., 38 249 případů, 30 zemí, publ. 23. 3. 2026).
- **Srovnávací rok 2024 = 455 případů** — ověřeno nezávisle (KHS Středočeského
  kraje / Světový den TBC 2026, konzistentní s RTBC): „v roce 2024 bylo hlášeno
  celkem **455** onemocnění tuberkulózou (**4,18**/100 tis.)." → potvrzuje článkovou
  claim „o 20 méně než v roce 2024 (455)". Kontext: 2023 = 459 (nejvíc od 1995),
  2024 = 455, 2025 = 435 → plynulý pokles, interně konzistentní.
- **BCG vyhláška 299/2010 Sb.** (kontext zrušení plošného očkování novorozenců) —
  zakonyprolidi 403 (anti-bot, ne mrtvý odkaz); tvrzení je historicky doložený
  kontext, ne centrální KPI. Bez nálezu.

**Nález: žádný.** Všechna centrální i podpůrná čísla článku publikujícího DNES se
shodují s primárními zdroji (přímo z PDF nebo odvozeno z primárních % a základny).
MDR 6,45→6,5 % je korektní zaokrouhlení. Metodická poznámka o rozdílu roku
(ČR 2025 RTBC vs EU/EHP 2024 ECDC) je v článku explicitní a věcně správná (ČR
reportuje do evropské surveillance právě data RTBC). Článek je plně doložen.

### Draft publikující ZÍTRA (`pohlavni-nemoci-2025`, 07-04)

Kontrola přenesena na zítřejší běh (den-of verifikace, mirroring dnešního TBC).
Centrální KPI (kapavka 2 663 / 24,4; syfilis 1 239 = nejvíc od 2001) byla přímo
ověřena agregací primárního CSV ÚZIS (otevřená data NR-29-01) v bězích 06-28 /
07-01 / 07-02; benchmark ECDC „Bacterial STIs reach record highs" (21. 5. 2026)
ověřen. Zdrojové odkazy resolují. Doporučení: den-of re-verifikace ve běhu 07-04.

## Doporučení pro routing fáze

- HOT (nový indikátor): žádné
- HOT (aktuální dění → nový článek): **žádné doložitelné** — svrab je WATCH
  (chybí primárně strojově ověřitelná mortalita/incidence), STI vlna už pokryta
  draftem, fronta saturovaná (19 draftů)
- **WARM (upgrade po dnešní discovery):** `clanek-protidrogova-dusevni-politika-mz-2026.html`
  — nyní existuje **primární TZ MZ ČR (1. 7.)** potvrzující kompetenční přesun.
  Revize atribuce (sekundární → primární TZ MZ) + doplnění dopadu patří
  samostatnému WARM běhu; **dnes nezasahuji do publikovaného článku** (verifikačně
  zaměřený běh, soulad se železným pravidlem).
- **PRIORITA: ověřovací pas — proveden, viz tabulka. Klíč: tuberkuloza-cr-2025
  publikuje DNES a je ✅ ověřen přímou extrakcí z primárního PDF ÚZIS + nezávislým
  dohledáním benchmarku (ECDC/WHO) i srovnávacího roku (2024=455). Nález: žádný.**
- COLD: fallback audit nejstaršího článku nebyl nutný — čas i hodnota lépe využity
  na verifikaci imminentní publikace (soulad s uživatelovým důrazem na ověření).
