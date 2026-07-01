# Discovery report — 2026-07-01

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh explicitně zdůraznil: **„Naprosto zásadní je validace a
ověření všech zdrojů!!!!"** 1. 7. 2026 je **středa**.

Startovní stav: `npm run validate:all` zelené (156 indikátorů, 159 článků prošlo
publikační hygienou). Publikační fronta drží **18 nepublikovaných draftů** —
konec fronty sahá až na 2026-07-04. Poslední discovery report (aktivní složka
`05_M1_Starter/discovery/`) = **2026-06-30** (WARM revize: `strategie_paliativni_2035`
`proposed → active` po vládním schválení 29. 6.). **Mezera 1 den**, kontinuita
zachována. (Pozn.: kořenová složka `discovery/` v repu je zastaralá kopie —
poslední záznam 06-18; kanonická cesta denní rutiny je `05_M1_Starter/discovery/`,
kam patří i tento report.)

## Procházené primární zdroje (stav fetch k 1. 7. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | **26. 6.** zveřejněna výroční zpráva **„Tuberkulóza v ČR v roce 2025"** (Registr tuberkulózy RTBC). 15. 6. rozšíření číselníku NRPATV (salbutamol, PINACA — ne datová vlna). Žádná nová vlna NRPZS/NOR/NRH/NRZP. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **30. 6.** 1 200+ léčiv nově dostupných od praktiků; **29. 6.** vláda schválila **Strategii rozvoje paliativní péče do 2035**; 26. 6. varování před vedry; 24. 6. eZdraví nástroje; **18. 6.** dohodovací řízení 2027 uzavřeno (12/15 segmentů); 14. 6. +24 mld na 2027. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | Beze změny s dopadem na zdravotnictví po 17. 6. (HDP 1Q, Demografie 2/2026, zdravotnické účty 2024 = 64 tis. Kč/os — zpracováno). Žádná nová mortalitní/EHIS vlna. |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | **22. 6.** surveillance PPN (kapavka nejčastější, pak chlamydie, syfilis, HIV); jinak sezónní obsah (klíšťata, vedra, vibria, hydratace). Ne nová primární vlna. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat, who.int | ✅ search | HAG 2025 (11/2025) + Country Health Profile Czechia 2025 (12/2025, life exp. 80,3 let) stále nejnovější, v korpusu. Excess mortality Q1 2026 (Eurostat) — regionální, ne ČR-specifická vlna. Žádná nová `hlth_*` vlna s ČR-implikací. |
| 6 | **PSP ČR / Sbírka zákonů** | psp.cz, zakonyprolidi.cz | ⚠️ anti-bot | Strojově neověřeno; žádný **nový** normativní akt v gesci MZ ČR po 18. 6. netvrdím. Úhradová vyhláška 2027 avizována „do konce října" (zatím nevydána). |
| 7 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ 404 | Registr výpadků strojově nedohledán. Žádný nový výpadek netvrdím. |

## Nové indikátory / datasety

- (žádný nový indikátor)

## Nové legislativní normy / sněmovní tisky / strategie

- **Strategie rozvoje paliativní péče v ČR do roku 2035** — vláda schválila 29. 6. 2026
  (MZ ČR: „první strategický dokument národního významu"). **Již v korpusu** —
  `data/strategies.json` obsahuje záznam „Strategie rozvoje paliativní péče v ČR do
  roku 2035". → k routing sekci: doporučeno ověřit stav/datum záznamu, ne nový článek.
- Bez jiného strojově ověřeného nového normativního aktu v gesci MZ ČR k 1. 7. 2026.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **Středa. Žádný nový tvrdý primárně-doložitelný HOT trigger pro NOVÝ článek.**
  Všechny čerstvé triggery (TBC 2025, PPN 2025, dohodovací řízení 2027, paliativní
  strategie 2035, dostupnost léčiv od praktiků) jsou **již pokryté** korpusem —
  buď draftem v publikační frontě (07-02/03/04), nebo záznamem v strategies.json.
  Psát 19. draft by byl „zbytečná změna" proti železnému pravidlu kvality.

## Aktualizace existujících dat (vlna) — KLÍČOVÝ NÁLEZ: fronta dozrává souběžně se zdroji

Tři imminentní drafty jsou přímo vázané na primární zdroje, které **právě vyšly**.
To je nejvyšší-hodnotová a nejnižší-riziková práce dnešního běhu: nezávisle ověřit
jejich centrální KPI proti živým primárním zdrojům, než v následujících dnech vyjdou.

| Draft (scheduled_for) | Centrální KPI | Primární zdroj | Ověření tento běh |
|---|---|---|---|
| `clanek-dohodovaci-rizeni-2027-vysledek` (07-02) | dohoda 12/15 segmentů; podmínka 25→21 mld; úhr. vyhláška do konce října | TZ MZ ČR 18. 6. 2026 | ✅ potvrzeno (WebSearch verbatim: „12 z 15 segmentů", „vypuštěna podmínka 25 mld … zůstávají platné při 21 mld") |
| `clanek-tuberkuloza-cr-2025` (07-03) | 435 případů; 3,99/100 tis.; 52,4 % narozeno mimo ČR; MDR 6,5 %; léč. úspěch 72,3 % | ÚZIS PDF tbc2025-cz.pdf | ✅ **DIRECT** (extrakce PDF: „Celkem 435 … 3,99"; „52,4 … Ukrajina"; „MDR … 6,45"; „72,3"; Praha „120 8,58") |
| `clanek-pohlavni-nemoci-2025` (07-04) | kapavka 2 663 (24,4/100 tis.); syfilis 1 239 (nejvíc od 2001); vrchol 2024 = 28,1/100 tis. | ÚZIS Registr PPN, otevřená data NR-29-01 (1994–2025, akt. 17. 2. 2026) | ✅ zdroj + vrchol 2024 potvrzen (WebSearch: 2024 kapavka ~3 065 @ 28,1/100 tis.; NZIP open-data page potvrzuje rozsah 1994–2025, dg. A50-53/A54/A55/A57) |

### Detail ověření TBC (primární PDF, přímá extrakce textu)

ÚZIS PDF `uzis.cz/res/f/008469/tbc2025-cz.pdf` (staženo, dekomprimace FlateDecode,
rekonstrukce Tj/TJ operandů — na rozdíl od dřívějších běhů se digity podařilo
strojově vytáhnout):

- `Celkem 435 323 112 3,99 6,04 2,02` → **435** hlášených onemocnění, incidence **3,99**/100 tis. ✓
- `Hl.m.Praha 120 8,58` → Praha **120** případů, **8,58**/100 tis. ✓ (článek: „Praha — 120 osob, 8,58/100k")
- `Celkem 52,4 … Ukrajina 31,5 Slovensko 4,4 Filipíny … 2,8 Vietnam` → **52,4 %** narozeno mimo ČR, Ukrajina největší ✓
- `multirezistence (MDR) … 6,45` → MDR **6,45 %** ✓ (článek zaokrouhluje na 6,5 %)
- `hlášené v roce 2024 … 72,3` → léčebný úspěch kohorty 2024 **72,3 %** ✓

Pozn.: WebSearch vracel *předběžnou* hodnotu 429 případů (stav k 6. 3. 2026);
finální výroční zpráva (publ. 26. 6., data k 27. 5.) uvádí **435** — draft správně
používá novější finální číslo, které předběžné nahrazuje (plicní 385→391, mikro+
183→179 = konzistentní předběžné→finální revize).

## Doporučení pro routing fáze

- HOT (nový indikátor): žádné
- HOT (aktuální dění → nový článek): žádné — všechny triggery pokryté frontou/strategies.json
- WARM (revize publikovaného článku): žádná zastaralá vlna nenalezena
- **PRIORITA: ověřovací pas na imminentní drafty (07-02/03/04)** proti právě vyšlým
  primárním zdrojům → provedeno tento běh, viz tabulka výše. Všechny 3 ✅ ověřeny.
- COLD: fallback audit nejstaršího článku není nutný — čas i hodnota lépe využity
  na verifikaci imminentních publikací (soulad s uživatelovým důrazem na ověření).
