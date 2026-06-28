# Discovery report — 2026-06-28

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch / přímý fetch CSV).
Železné pravidlo: co není ověřené z primárního strojově dohledatelného zdroje,
na portálu nezůstává. Uživatel pro tento běh **opět explicitně zdůraznil:
„Naprosto zásadní je validace a ověření všech zdrojů!!!!"** → každé numerické
tvrzení dnešního výstupu je ověřeno přímo proti primárnímu zdroji (ÚZIS Registr
pohlavních nemocí — otevřená data CSV, ČSÚ střední stav obyvatelstva, ECDC
report 21. 5. 2026).

28. 6. 2026 je **neděle**. Poslední discovery report v repu = 2026-06-27
(ARTICLE-WRITE clanek-tuberkuloza-cr-2025). Startovní stav: `git` HEAD na větvi
`claude/dreamy-wright-womkoz`; `npm run validate:all` zelené (153 indikátorů,
154 článků prošlo publikační hygienou, financing OK, clinical-quality 35
indicators). Publikační fronta drží **16 nepublikovaných draftů**; nejvzdálenější
naplánovaný slot 2026-07-03 (clanek-tuberkuloza-cr-2025), další volný slot
**2026-07-04**.

## Procházené primární zdroje (stav fetch k 28. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější: 26. 6. „Tuberkulóza v ČR 2025" (zpracováno 27. 6.); 15. 6. NRPATV číselník (zpracováno). **Žádná nová vlna po 26. 6.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | 26. 6. extrémní vedra (sezónní apel, sekundární); 24. 6. elektronizace (forward-looking, zpracováno); 18. 6. dohodovací řízení 2027 (v draftu fronty). **Žádný nový schválený akt.** |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 26. 6. Newsletter; 16. 6. Demografie 2/2026; 12. 6. pohyb obyvatel Q1; 11. 6. výdaje na zdr. péči 2024 (zpracováno). **Žádná nová indikátorová/mortalitní/EHIS vlna.** Použito jako denominátor: střední/koncový stav obyvatelstva **10 915 839** (k 31. 12. 2025). |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | 22.–27. 6. sezónní/mediální (vedra, vibria, repelenty, klíšťata). **22. 6.: H. Zákoucká (NRL syfilis) k nárůstu PPN** (iROZHLAS, sekundární) → vyžaduje primární verifikaci v Registru pohlavních nemocí (viz „Posouzení triggeru"). Žádná nová primární surveillance vlna jako PDF. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ search | Nejnovější ucelená vlna = Health at a Glance 2025 (13. 11. 2025) + Country Health Profile Czechia 2025, oba v korpusu. **Žádná edice „2026", žádná nová `hlth_*` vlna s ČR-implikací.** |
| 6 | **ECDC — STI surveillance** | ecdc.europa.eu | ✅ 200 | Report/TZ **„Bacterial STIs reach record highs in Europe, congenital syphilis nearly doubles"**, publ. **21. 5. 2026**: EU/EEA 2024 — kapavka 106 331, syfilis 45 577, chlamydie 213 443, LGV 3 490, **vrozená syfilis 140 (z 78 v 2023, near-doubling)**. Použito jako evropský kontext pro PPN článek. |
| 7 | **PSP ČR — sněmovní tisky** | psp.cz/sqw/historie.sqw | ✅ 200 (homepage) | Bez strojově ověřeného **nového** tisku v gesci MZ ČR. Žádný nový tisk netvrdím. |
| 8 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ registr se přesouvá | Strojově nedostupné → žádný nový výpadek netvrdím. |
| 9 | **zakonyprolidi.cz / Sbírka** | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 anti-bot | Strojově nedostupné. Žádný nový normativní akt v gesci MZ ČR netvrdím. |

## Posouzení triggeru — pohlavně přenosné nemoci (PPN) v ČR

SZÚ (22. 6.) a média (iROZHLAS 21. 6., zdravezpravy.cz 22. 5.) upozornily na
nárůst bakteriálních PPN (kapavka, syfilis). Mediální vlna je sekundární; primární
strojově dohledatelný zdroj je **ÚZIS Registr pohlavních nemocí (NR-29-RPN),
otevřená data NR-29-01** (CSV `datanzis.uzis.gov.cz/.../Otevrena-data-NR-29-01-pohlavni-nemoci.csv`,
data 1994–2025, **aktualizace 17. 2. 2026**). CSV stažen a agregován (24 639 řádků,
case-level dle roku × okres × pohlaví × věk × dg.). Ověřené národní úhrny:

- **Kapavka (A54):** 2025 = **2 663** případů (24,4/100 tis.). Vrchol **2024 = 3 067**
  (28,1/100 tis., historické maximum datasetu). 2025 tedy **−13 % proti vrcholu**, ale
  pořád **+91 % proti 2014** (1 395) a **3,5× proti 2010** (756). Muži 79,5 %.
- **Syfilis (A50–A53):** 2025 = **1 239** případů (11,4/100 tis.) — **nejvíc od roku
  2001** (tehdy 1 376). +11 % proti 2024 (1 114), +71 % proti 2014 (724). Muži 77,7 %.
- **Vrozená syfilis (A50):** 2025 = **4** případy (novorozenci). Malé absolutní číslo,
  ale evropský trend (ECDC: near-doubling 78→140) je varovný signál pro antenatální screening.
- **Koncentrace:** Praha (okres) = **1 548 z 3 902** případů kapavka+syfilis 2025 = **39,7 %**.
- **Věk (kapavka 2025):** 25–34 let (1 089), 35–44 (704), 19–24 (475) — sexuálně nejaktivnější věk.

**Je to HOT-ekvivalentní trigger pro nový článek:**
1. **Aktuální dění s primárně-zdrojovou doložitelností** — mediální kauza (21.–22. 6.)
   stojí na primárním ÚZIS registru, který lze celý stáhnout a ověřit (CSV). Každé číslo
   článku = přímý agregát z CSV, ne mediální parafráze.
2. **Mezera v korpusu** — HIV má článek (`clanek-hiv-nove-diagnozy`), sexuální chování
   řeší CZECHSEX (`czechsex-*`), ale **bakteriální PPN (kapavka/syfilis) samostatný
   článek nemají**. Článek `czechsex-verejne-zdravi` výslovně píše „co český dashboard
   zatím neměří" — PPN jsou ta mezera.
3. **HSPA framing** — PPN jsou indikátorem výsledku prevence a dostupnosti testování;
   evropský kontext (ECDC 21. 5. 2026) ukazuje, že ČR není výjimkou; vrozená syfilis
   testuje kvalitu antenatální péče.

## Nové indikátory / datasety

- Nový dedikovaný indikátor **nezakládám** — PPN spadají do domény „Přenosné nemoci",
  článek je data-driven z otevřených dat ÚZIS. (Případné založení indikátoru PPN je
  úkol pro samostatný INDICATOR-ADD flow.)

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **schváleného** normativního aktu v gesci MZ ČR k 28. 6.

## Aktualizace existujících dat / dění (vlna)

- ÚZIS Registr pohlavních nemocí — otevřená data NR-29-01, data 1994–2025 (akt. 17. 2. 2026).
- ECDC „Bacterial STIs reach record highs in Europe" (21. 5. 2026) — evropský kontext.

## Doporučení pro routing fáze

- **HOT (nový článek):** Pohlavně přenosné nemoci v ČR 2025 (kapavka/syfilis) — primární
  ÚZIS registr + mezera v korpusu + aktuální mediální/evropská relevance.
- **WARM:** žádný akutní revizní cíl.
- **COLD:** n/a — HOT trigger má přednost.
