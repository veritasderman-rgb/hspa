# Discovery report — 2026-06-29

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch / přímý fetch Eurostat API).
Železné pravidlo: co není ověřené z primárního strojově dohledatelného zdroje,
na portálu nezůstává. Uživatel pro tento běh **opět explicitně zdůraznil:
„Naprosto zásadní je validace a ověření všech zdrojů!!!!"** → každé numerické
tvrzení dotčeného výstupu je ověřeno přímo proti primárnímu zdroji.

29. 6. 2026 je **pondělí**. Poslední discovery report v repu = 2026-06-28
(ARTICLE-WRITE clanek-pohlavni-nemoci-2025, zařazen do fronty na 2026-07-04).
Startovní stav: větev `claude/dreamy-wright-hpp00p`; `npm run validate:all`
zelené (154 indikátorů, 156 článků prošlo publikační hygienou, financing OK,
clinical-quality 35 indikátorů). Publikační fronta drží **17 nepublikovaných
draftů**; 7 z nich má `scheduled_for` (nejvzdálenější 2026-07-04), další volný
slot = **2026-07-05**.

## Procházené primární zdroje (stav fetch k 29. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější: 26. 6. „Tuberkulóza v ČR 2025" (zpracováno 27. 6.); 15. 6. NRPATV; 10. 6. čestné členství. **Žádná nová vlna po 26. 6.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | 26. 6. extrémní vedra (sezónní apel, sekundární); 24. 6. elektronizace (zpracováno); 18. 6. dohodovací řízení 2027 (v draftu fronty); 14. 6. vládní opatření +24 mld. Kč. **Žádný nový schválený normativní akt.** |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 26. 6. Newsletter; 16. 6. Demografie 2/2026; 12. 6. pohyb obyvatel Q1; 11. 6. výdaje na zdr. péči 2024 (64 tis. Kč/os., zpracováno). **Žádná nová indikátorová/mortalitní/EHIS vlna.** |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | 27.–22. 6. výhradně sezónní/mediální (vedra, vibria, repelenty, klíšťata, PPN komentář — zpracováno 28. 6.). **Žádná nová primární surveillance vlna jako PDF.** |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ search + API | Nejnovější ucelená vlna = Health at a Glance 2025 (13. 11. 2025) + Country Health Profile Czechia 2025, oba v korpusu. Eurostat `hlth_cd_asdr2` **aktualizován 8. 6. 2026** (causes of death) — využito k re-verifikaci (viz fáze 5). **Žádná edice „2026", žádná nová `hlth_*` vlna s novou ČR-implikací.** |
| 6 | **PSP ČR — sněmovní tisky** | psp.cz/sqw/historie.sqw | ✅ 200 | Komplexní novela zák. o zdrav. službách prošla 2. čtením (procesní milník, ne schválený akt; již medializováno). Bez strojově ověřeného **nového schváleného** tisku v gesci MZ ČR. |
| 7 | **zakonyprolidi.cz / Sbírka** | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 anti-bot | Strojově nedostupné. Nalezené normy (290/2025 Sb. o zdrav. službách, úhradová vyhláška 432/2025 Sb.) jsou z konce 2025 → již v korpusu. Žádný nový akt netvrdím. |
| 8 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ registr se přesouvá | Strojově nedostupné → žádný nový výpadek netvrdím. |

## Posouzení: žádný nový HOT trigger

- **Nový indikátor / dataset:** žádný. Eurostat `hlth_cd_asdr2` aktualizace 8. 6.
  nepřináší novou metriku, jen čerstvá data k existujícímu indikátoru
  `mortalita_kardiovaskularni` (využito k re-verifikaci).
- **Nová legislativa / schválený akt:** žádný strojově ověřený nový akt v gesci MZ ČR.
- **Aktuální kauza s primárně-zdrojovou doložitelností:** PPN vlna zpracována včera
  (28. 6.). SZÚ items 27.–25. 6. jsou sezónní/mediální bez nové primární vlny.
- **Publikační fronta:** už drží 7 naplánovaných + 10 hlubších draftů → kvalita
  nad kvantitou. Přidávat 18. draft bez triggeru by bylo proti pravidlu
  „lepší žádná změna než zbytečná".

→ **Discovery nepřinesl nic nového → přepnutí na FALLBACK routine = audit
nejstaršího review-pending článku.** Plně v souladu s uživatelovým důrazem
na validaci a ověření zdrojů.

## Fallback — výběr cíle auditu

Nejstarší `last_reviewed` mezi viditelnými články = **2026-05-15** (> 30 dnů):
`kardiovaskularni-mortalita`, `pracovni-sila`, `uhradova-vyhlaska`,
`vyhnutelne-hospitalizace`. Per priorita fallbacku (články s konkrétními čísly =
nejvyšší riziko nepřesnosti) vybrán **`clanek-kardiovaskularni-mortalita`** —
nejstarší, nejvyšší dopad (vedoucí příčina úmrtí v ČR), 8 linkovaných indikátorů,
hustě nabitý konkrétními čísly napříč hero counterem, body a databoxem.

## Výsledek nezávislého auditu (detaily ve fázi 5 / routing-2026-06-29.md)

**OVĚŘENO EXAKTNĚ proti živému primárnímu zdroji** (Eurostat `hlth_cd_asdr2`,
dataset updated 2026-06-08, přes dissemination API):

| Tvrzení | Článek | Eurostat live | Shoda |
|---|---|---|---|
| ČR oběhová I00–I99 2023 | 463,75 | 463.75 | ✅ |
| EU-27 oběhová 2023 | 312,95 | 312.95 | ✅ |
| ČR IHD I20–I25 | 193,59 | 193.59 | ✅ |
| EU-27 IHD | 100,39 | 100.39 | ✅ |
| ČR cerebrovask. I60–I69 | 67,57 | 67.57 | ✅ |
| EU-27 cerebrovask. | 63,93 | 63.93 | ✅ |
| ČR trend 2020→2023 | 557,77→525,62→505,50→463,75 | identické | ✅ |
| EU-27 trend 2020→2023 | 343,69→312,95 | identické | ✅ |

Centrální tvrzení **+48 %** a „~150 úmrtí / 100 000" potvrzeno (463,75 − 312,95 = 150,8).
Pohybová aktivita ověřena živě proti Eurostat `hlth_ehis_pe2e`: ČR 25,1 % / EU-27 32,7 %.

**OPRAVENO (zastaralá / chybná čísla; živý datový kontrakt byl správný):**

1. **Denní kuřáctví 22,6 % → 16,4 %** (SZÚ NAUTA 2024; OECD H@G 2025 = 15,9 %/2023,
   OECD průměr 14,8 % ne 16). Chyba ~40 % v **hero counteru** + body + databoxu.
2. **Pohybová aktivita „33 % proti 40" → 25,1 % proti EU-27 32,7 %** (Eurostat EHIS 2019).
3. **Nemocniční mortalita AMI 5,2 % → 4,6 %** (ÚZIS NRH 2024; 5,2 byla hodnota 2022).
4. **Nemocniční mortalita CMP 11,2 % → 9,9 %** (ÚZIS NRH 2024; 11,2 byla hodnota 2022).
5. **Zastaralá strukturovaná data** (JSON-LD headline+description, breadcrumb,
   og:image:alt) stále nesla pre-rekonciliační „220 / 100 000" a „o 60 procent
   vyšší" — sjednoceno s viditelným H1.

**FLAGGED (nemění se autonomně, čeká na rozhodnutí redakce):**

- **Alkohol 14,4 l vs OECD 8,9** — OECD H@G 2025 konzistentní metodikou uvádí
  ČR **11,2 l vs OECD 8,5 l**. Hodnota 14,4 vypadá jako WHO total APC
  (recorded + unrecorded) párovaná s OECD recorded benchmarkem = methodology
  mismatch dle železného pravidla. Hodnota 14,4 je napříč korpusem v **7 článcích**
  vč. dedikovaného `clanek-alkohol-spotreba.html` → reconciliace je **korpusový
  úkol**, ne jednočlánková oprava. Doporučeno samostatné rozhodnutí + GitHub issue.

## Doporučení pro routing fáze

- **Cesta:** FALLBACK-AUDIT (žádný nový HOT trigger).
- **Cíl:** `clanek-kardiovaskularni-mortalita` — audit dokončen, status zůstává
  `review-pending` (4 opravy + 1 flag), bez automatické publikace.
- **Follow-up (mimo tento běh):** korpusová reconciliace `alkohol_spotreba`
  (14,4 WHO-total vs 11,2 OECD-recorded) — GitHub issue.
