# Discovery report — 2026-05-24

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-24 (neděle). Předchozí běh 2026-05-23 → ARTICLE-WRITE
(`clanek-zaskrt-umrti-2026.html`, status `review-pending`, slot 2026-06-11).

Prozkoumáno přímým WebFetch / WebSearch: ÚZIS aktuality (uzis.cz),
MZ ČR tiskové zprávy (mzd.gov.cz/tiskove-centrum), WHO Europe news-room
(who.int/europe/news-room), SZÚ aktuality (szu.gov.cz/aktuality),
SZÚ epidemiologické podklady (szu.gov.cz/wp-content/uploads),
ECDC (ecdc.europa.eu/en/publications-data + atlas), zakonyprolidi /
Sbírka zákonů (přes WebSearch), PSP ČR (HTTP 500 dnes; verifikace přes
sekundární zdroje + mzd.gov.cz), VZP ČR (vzp.cz/o-nas/aktuality),
NZIP (nzip.cz). Vláda ČR vlada.gov.cz vyvolala ECONNREFUSED.

## Nové primární zdroje od posledního běhu

### HOT — primární zdroj, kauza s ověřitelnými fakty a HSPA implikací

**SZÚ — aktualita „Nedokončené očkování proti klíšťové encefalitidě?
Vynechané posilující dávky? Pak na ochranu nelze spoléhat" (2. 4. 2026).**

URL: `https://szu.gov.cz/aktuality/nedokoncene-ockovani-proti-klistove-encefalitide-vynechane-posilujici-davky-pak-na-ochranu-nelze-spolehat/`

Klíčová sdělení (přímo na webu SZÚ):

- **51 % Čechů má za sebou minimálně 1 dávku** vakcíny proti klíšťové
  encefalitidě (KE) — historicky nejvíc.
- **34 % má částečnou ochranu** (rozjeté schéma, ale ne dokončené).
- **Pouze 17 % populace je plně chráněno** (3 základní dávky + 1.
  posilovací po 3 letech).
- **75 % očkovaných se mylně domnívá**, že jsou chráněni, ačkoli
  posilovací dávky vynechali.
- **Rakouský benchmark:** 80 % proočkovanost, srovnatelný výskyt klíšťat,
  zlomek nemocnosti.
- Doporučení SZÚ: minimum 2 dávky v rozmezí 2–14 týdnů = 1 sezóna;
  3. dávka do 1 roku; přeočkování po 3–5 letech.

Téma je aktuální (sezóna 2026 v rozjezdu — SZÚ aktualita vyšla 2. 4. 2026
před začátkem hlavní sezóny, opakovaně mediálně připomínáno 20.–22. 5. 2026
přes Praha TV, ČT24, iDNES, Tojesenzace, PharmaProfit, ZP MV ČR).

### Primární kontext k incidenci KE — ECDC

**ECDC — Tick-borne encephalitis Annual Epidemiological Report for 2022**
(Stockholm, June 2024; data z TESSy retrieved 18. 1. 2024).

URL PDF: `https://www.ecdc.europa.eu/sites/default/files/documents/tick-borne-encephalistis-annual-epidemiological-report-2022_0.pdf`
URL HTML: `https://www.ecdc.europa.eu/en/publications-data/tick-borne-encephalitis-annual-epidemiological-report-2022`

Ověřená čísla (Table 1, primární data ECDC TESSy):

| Rok | ČR případy | ČR rate/100k | AT případy | AT rate/100k | EU/EEA celkem |
|---|---|---|---|---|---|
| 2018 | 714 | 6.7 | 171 | 1.9 | 3 090 |
| 2019 | 771 | 7.2 | 106 | 1.2 | 3 304 |
| 2020 | 850 | 7.9 | 250 | 2.8 | 3 751 |
| 2021 | 593 | 5.7 | 135 | 1.5 | 2 972 |
| 2022 | 709 | 6.7 | 206 | 2.3 | 3 516 |

Klíčová sdělení z reportu:

- ČR **2. nejvyšší absolutní počet potvrzených případů KE v EU/EEA za 2022**
  (709 = 20 % všech), za Litvou v míře, před Německem (554) a Švédskem (465).
- EU/EEA notifikační míra **0.81/100k** v 2022 (ČR má 6.7 — **8.3× nad
  průměrem EU/EEA**).
- Tři země s trvalou notifikací >5/100k posledních 5 let: **Litva, Estonsko,
  ČR**.
- **94 % všech potvrzených případů s informací o vakcinaci v EU/EEA bylo
  neočkovaných** (1 522 z 1 620; n=98 byli částečně očkovaní).
- Nejvyšší rate v 2022: Litva 13.4, Estonsko 10.5; ČR 6.7 (3. v relativním
  riziku); Rakousko 2.3 (ASR 2.2) — **ČR vs. AT poměr 2.9×**.
- Sezónnost: 90 % případů červen–listopad, peak červenec (n=800 v EU/EEA).
- Věkový peak: 45–64 let (rate 1.0/100k v EU/EEA), poměr muži:ženy 1.5:1.

### Primární data SZÚ pro 2024

**SZÚ — „Nemoci přenášené klíšťaty v ČR — epidemiologická situace ke dni
31. července 2024"** (publ. červenec 2024).

URL PDF: `https://szu.gov.cz/wp-content/uploads/2024/08/Nemoci-prenasene-klistaty-v-CR_cervenec_2024_final.pdf`

- **Leden–červenec 2024: 362 případů KE v ISIN** (vs. 212 v 1.–7. 2023 →
  +70 % YoY pro stejné období).
- Srovnatelné s rokem 2020 (367 ve stejném období) → nadprůměrná sezóna.
- Nejvíc v červenci 2024 (200 případů za měsíc).
- **Kumulativní incidence ČR 1.–7. 2024: 3.3/100k.** Krajský strop:
  Vysočina **9.1/100k**, Jihočeský **8.3/100k**, Pardubický 5.8/100k,
  Zlínský 5.2/100k.
- Pohlaví: 210 mužů vs. 152 žen (58 % muži).

### Hrazení očkování v ČR — legislativní rámec

**Zákon č. 48/1997 Sb., o veřejném zdravotním pojištění, § 30 odst. 2
písm. b) bod 8** (znění platné od 1. 1. 2022).

Novela zařadila očkování proti KE pro **pojištěnce starší 50 let** mezi
povinně hrazené (plně z veřejného zdravotního pojištění — látka i aplikace,
včetně přeočkování).

Pro pojištěnce **<50 let** je očkování příspěvkové (typicky z fondu
prevence — VZP poskytuje 500 Kč dospělí, 700 Kč děti per dávka).

Primární právní zdroj: `https://www.zakonyprolidi.cz/cs/1997-48`
Pojišťovenský komentář (sekundární, doplňkový): VZP / ZP MV ČR aktuality.

## Nové legislativní normy / sněmovní tisky

- **Žádná nová norma v gesci MZ ČR vyhlášená ve Sbírce zákonů 18.–24. 5. 2026.**
  Nejnovější platná velká norma: zákon č. 290/2025 Sb. (novela zákona č.
  372/2011 Sb. o zdravotních službách, účinnost 1. 1. 2026 — telemedicína),
  již reflektovaný v korpusu (clanek-novela-elektronizace-2026 ve frontě).
- **PSP ČR** (psp.cz/sqw/snemovna.sqw vrátila HTTP 500 dnes 24. 5.) —
  podle sekundárních zpráv (mzd.gov.cz, PharmaProfit) sněmovna v 5/2026
  schválila novely zákona o veřejném zdravotním pojištění + elektronizaci
  (předmět už pokrytý clanek-novela-elektronizace-2026).
- 20. schůze PSP plánovaná od 26. 5. 2026 ještě neproběhla.

## Aktualizace existujících dat (vlna)

- **Žádná nová celostátní datová vlna** od ÚZIS / ČSÚ / OECD / Eurostat
  za posledních 7 dní.
- ÚZIS aktuality bez nové vlny dat (poslední aktualita 5. 5. 2026 —
  prodloužení termínu sběru výkazů).
- OECD Health at a Glance Europe 2026 dosud nevydáno (HaG 2025 zůstává
  nejnovější celosvětovou edicí, HaG: Europe 2024 nejnovější evropskou).
- ČSÚ — bez nové demografické / mortalitní vlny.

## Další aktuální dění (zachyceno, nezvoleno pro tuto iteraci)

- **Národní strategie pro vzácná onemocnění 2026–2035** (MZ ČR, finální
  návrh 27. 2. 2026) — **JIŽ V KORPUSU** jako
  `clanek-vzacna_onemocneni_strategie_2035` (publ. 12. 5. 2026).
- **Úpravy screeningových programů** (MZ ČR, 7. 5. 2026 — kolorektum 45+,
  cervix HPV-based, plíce) — **JIŽ V KORPUSU** jako
  `clanek-cervix-hpv.html`, `clanek-screening-rakoviny-plic.html` + nedávný
  feature pro kolorektum.
- **Záškrt 2026 / vakcinace dětí** — **JIŽ V KORPUSU** jako včerejší
  `clanek-zaskrt-umrti-2026.html` (review-pending, slot 2026-06-11).
- **WHO Europe — Clinical audit tool for child and youth mental health
  services** (18. 5. 2026) — globální nástroj, bez CZ-specific dat ani
  pilotu, nedostatečný HSPA důvod pro samostatný článek dnes.
- **World No Tobacco Day 2026 awards** (WHO 20. 5. 2026) — globální
  uznávání, bez CZ-specific dat; existující clanek-koureni.html téma
  pokrývá.
- **Hantavirus / občan USA** (MZ ČR TZ 20. 5.) — operační epidemiologie,
  bez HSPA-policy implikace.
- **Lymeská borelióza 2024** (SZÚ Jan–Jul 2024: 1 938 případů,
  +35 % nad pětiletým průměrem) — souvisí s tématem KE, kandidát pro
  samostatný článek příště.

## Doporučení pro routing fáze

- **HOT (nový článek):** **ARTICLE-WRITE — klíšťová encefalitida /
  proočkovanost 17 %**. Téma má vysokou aktuálnost (SZÚ 2. 4. 2026 +
  mediální vlna 20.–22. 5. 2026 v rozjezdu sezóny), výjimečnou
  doložitelnost ze 4 primárních zdrojů (SZÚ aktualita 4/2026, SZÚ
  epidemiologický report 7/2024, ECDC TBE AER 2022, zákon č. 48/1997
  Sb.), jasnou HSPA implikaci (preventabilní onemocnění + dramatický gap
  vůči Rakousku) a **mezera v korpusu — žádný článek o KE v aktivních
  článcích ani ve frontě nenalezen.**
- **WARM:** žádná akutní revize nutná.
- **COLD / FALLBACK:** mimo rozsah dnešní iterace (HOT pokrývá).

## Verifikace primárních zdrojů (klíčové pro audit — fáze 5)

| Tvrzení | Primární zdroj | Stav |
|---|---|---|
| 17 % Čechů plně chráněno proti KE | SZÚ aktualita 2. 4. 2026 | ✅ |
| 51 % má ≥1 dávku (historicky nejvíc) | SZÚ aktualita 2. 4. 2026 | ✅ |
| 34 % částečně chráněno | SZÚ aktualita 2. 4. 2026 | ✅ |
| 75 % očkovaných se mylně domnívá, že je chráněno | SZÚ aktualita 2. 4. 2026 | ✅ |
| Rakousko 80 % proočkovanost | SZÚ aktualita 2. 4. 2026 | ✅ |
| ČR 2022 = 709 případů, rate 6.7/100k | ECDC TBE AER 2022 Table 1 | ✅ |
| ČR 2018–2022 trend (714, 771, 850, 593, 709) | ECDC TBE AER 2022 Table 1 | ✅ |
| Rakousko 2018–2022 trend (171, 106, 250, 135, 206) | ECDC TBE AER 2022 Table 1 | ✅ |
| EU/EEA 2022 = 3 650 / 3 516 confirmed, rate 0.81 | ECDC TBE AER 2022 Key facts | ✅ |
| 94 % případů v EU/EEA = neočkovaní (n=1522/1620) | ECDC TBE AER 2022 Epidemiology | ✅ |
| Peak věk 45–64 let, M:F = 1.5:1 | ECDC TBE AER 2022 Figure 4 | ✅ |
| ČR Jan–Jul 2024 = 362 případů (vs. 212 v 2023) | SZÚ 31. 7. 2024 | ✅ |
| Kumulativní incidence ČR Jan–Jul 2024 = 3.3/100k | SZÚ 31. 7. 2024 | ✅ |
| Vysočina 9.1/100k, Jihočeský 8.3/100k (krajový strop Jan–Jul 2024) | SZÚ 31. 7. 2024 | ✅ |
| Plné hrazení očkování KE od 1. 1. 2022 pro pojištěnce 50+ | § 30 odst. 2 z. č. 48/1997 Sb. (novela 2022) | ✅ |
| Příspěvky <50 let z fondu prevence (VZP 500/700 Kč) | VZP aktuality + zákon (sekundární / zákonný rámec) | ✅ |

**Čísla NEZAŘAZENÁ z důvodu nedostatečné primární doložitelnosti:**

- „703 případů v ČR 2025" + „6 úmrtí 2025" — cituje sekundární zdroj
  (pharmaprofit.cz, klistova-encefalitida.cz). SZÚ Z-CEM zpráva za 2025
  zatím není veřejně listed v dostupné formě; nepoužiji bez primárního
  potvrzení.
- „32 % nárůst 2023 → 2024" — sekundární atribuce (medicina.cz). Místo
  toho použiji **primární SZÚ číslo Jan–Jul 2024 = 362 vs. 212 = +70 % YoY
  za stejné období** (přesnější).
- „3 úmrtí v ČR 2023" — sekundární (Tojesenzace cituje SZÚ); ponecháno
  pouze s explicitním caveatem nebo vynecháno.

## Co je v aktuálním korpusu nepokryto a co tedy nový článek přidá

- Dedikovaná HSPA analýza KE jako preventabilního onemocnění s primárně-
  zdrojovou kauzální vazbou: nízká proočkovanost (17 %) → ČR jako outlier
  v EU (8.3× nad průměrem) → systémové selhání vs. rakouský benchmark
  (80 % proočkovanosti = 3× nižší incidence).
- Vztah úhradové politiky (zákon č. 48/1997 Sb. od 1. 1. 2022 plné krytí
  50+) a chování pojištěnců (51 % má 1 dávku, ale jen 17 % plně dokončilo
  schéma — implementace nefunguje na úrovni dokončení).
- Doplnění tematické linie „prevence" o KE — existující clanek-vakcinace.html
  pokrývá obecný rámec, clanek-vakcinace-hexa-deti.html DTP, ale KE jako
  doporučená vakcína mimo povinný kalendář s vysokou epidemiologickou
  zátěží ČR chybí.

---

**Routing rozhodnutí:** ARTICLE-WRITE → nový článek
`clanek-klistova-encefalitida-proockovanost-2026.html` (viz
`routing-2026-05-24.md`).
