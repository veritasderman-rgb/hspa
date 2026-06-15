# Discovery report — 2026-06-15

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh explicitně zdůraznil: **„Naprosto zásadní je validace a
ověření všech zdrojů!!!!"** 15. 6. 2026 je **pondělí**.

Startovní stav: `npm run validate:all` zelené (136 indikátorů, 130 článků prošlo
publikační hygienou), `npm test` 586/586 po `npm install` (8 selhání před instalací
byly chybějící optional deps csv-parse / xlsx / cheerio / @anthropic-ai/sdk —
prostředí, ne obsah).

## Procházené primární zdroje (stav fetch k 15. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější položka 10. 6. (čestné členství ORL společnosti — personálie, ne data). Po 5. 5. (prodloužení sběru výkazů do 20. 5.) žádná nová vlna NRPZS/NOR/NRH/NRZP. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **HOT: 14. 6. „Opatření schválené vládou posílí zdravotnictví o 24 miliard korun a podpoří přípravu systémových změn"** (vláda schválila 8. 6.). Dále 12. 6. eZdraví (zbrojní/řidičské posudky), 11. 6. letní hygiena/cestování, 10. 6. odměňování nelékařů, 10. 6. MoodPass (již ve frontě `dusevni-zdravi-matek-moodpass`), 9. 6. rozvoj sítě center duševního zdraví. |
| 3 | SZÚ — aktuality | szu.gov.cz/aktuality/ | ✅ 200 | 9.–11. 6. položky sekundární (komáři iROZHLAS, klíšťata ČT24, Den zdraví). NAUTA 2025 (29. 5.) stále nejnovější primární surveillance — **téma již v korpusu** (`clanek-koureni`, `clanek-koureni-adolescenti`). Žádná nová primární vlna. |
| 4 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 12. 6. Pohyb obyvatelstva 1Q2026; **11. 6. „Zdravotní péče v roce 2024 stála 64 tisíc korun na osobu"** (zdravotnické účty 2024 — WARM, navazuje na čerstvě re-ukotvený `financovani-sha`, 06-14); 10. 6. CPI 05/2026. Žádná mortalitní/EHIS vlna. |
| 5 | PSP ČR — sněmovní tisky | psp.cz/sqw/historie.sqw | ⚠️ skeleton | Strojově nedohledán nový zdravotnický tisk schválený v 6/2026 — **netvrdím nic.** |
| 6 | Sbírka zákonů / zakonyprolidi.cz | zakonyprolidi.cz/cs/aktualne | ⚠️ anti-bot | Žádnou novou normu v gesci MZ po 8. 6. primárně netvrdím. |
| 7 | SÚKL — výpadky léčiv | sukl.cz/vypadky-leku | ⚠️ anti-bot | Registr výpadků strojově nedohledán. Žádný nový výpadek netvrdím. |
| 8 | OECD / Eurostat / WHO / NÚKIB | — | beze změny | HAG 2025 (11/2025) + Country Health Profile Czechia 2025 (12/2025) nejnovější, již v korpusu; žádná nová hlth_* vlna / WHO guideline s ČR-implikací. |

## Nové indikátory / datasety

- (žádný nový indikátor; ČSÚ zdravotnické účty 2024 = aktualizace vlny pro
  existující finanční korpus, ne nový indikátor)

## Nové legislativní normy / sněmovní tisky

- **Usnesení vlády ze dne 8. 6. 2026** — vláda Andreje Babiše (ANO) schválila
  mimořádné navýšení plateb za státní pojištěnce o **24 mld Kč pro rok 2027**
  (21 mld navýšení platby za státní pojištěnce ze státního rozpočtu + 3 mld
  přesun z provozu zdravotních pojišťoven do péče, ~1 % jejich provozu). Není to
  zákon ani vyhláška — exekutivní rozhodnutí promítající se do návrhu státního
  rozpočtu 2027 (kapitola 333) a do nařízení vlády o vyměřovacím základu.
  Primární doklad: TZ MZ ČR 14. 6., oficiální stránka vláda.gov.cz, TZ z jednání
  vlády (ČTK/ČT24, premiér Babiš).

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **HOT — 8.–14. 6. rozhodnutí vlády o +24 mld pro 2027.** Trojí ověření
  (vláda.gov.cz · TZ MZ ČR · ČTK/ČT24 + sektorové zdravezpravy.cz a
  nasezdravotnictvi.cz): vláda 8. 6. schválila mimořádnou valorizaci. Premiér
  Babiš: *„Schválili jsme dnes navýšení plateb státu na příští rok o 24 miliard."*
  Ministr zdravotnictví Adam Vojtěch (ANO): *„Dlouhodobou udržitelnost však nelze
  zajistit pouze dodatečnými prostředky."* VZP: *„Vláda nám tímto krokem koupila
  rok času k nastartování změn."* Dosavadní automatická formule § 3c (CPI + ½
  reálných mezd) by dala jen ~3,17 mld → jde o mimořádnou valorizaci řádově 7,5×
  nad formuli. Deficit systému 2026 ~15 mld (19 mld s nedoplatky); vláda požaduje
  po MZ úspory (pojišťovny min. 1 % provozu).
- 12. 6. eZdraví rozšíření, 11. 6. letní hygiena, 10. 6. odměňování nelékařů —
  bez nové primární datové vlny vyžadující článek dnes.

## Aktualizace existujících dat (vlna)

- ČSÚ zdravotnické účty 2024 (11. 6., „64 tis. Kč/os") — navazuje na
  `financovani-sha` re-ukotvený 06-14; WARM, dnes neřešeno (čerstvě auditováno).

## Doporučení pro routing fáze

- **HOT → ARTICLE-REVISE** existujícího publikovaného článku
  `clanek-platba-statu-statni-pojistenci.html`. Tento živý článek (publ. 19. 5.,
  `audit-status: partial`) je **přesně domovem** rozhodnutí z 8. 6.: celé jeho
  jádro (sekce „Mimořádná valorizace pro 2027", tři cesty A/B/C, časová osa)
  explicitně **anticipovalo** toto rozhodnutí a přiznávalo: *„Konkrétní cílová
  hodnota pro 2027 nebyla v době redakční uzávěrky veřejně doložena primárním
  zdrojem — uvedeme ji, jakmile bude oficiálně oznámena MZ ČR."* Nyní oznámena je.
  Psát nový samostatný článek by bylo redundantní (korpus má hustou finanční
  vrstvu: platba_statu, deficit-pojisteni-2026, financovani-sha, ncez-financovani-2027).
  Nejvyšší hodnota = ukotvit živý článek na čerstvě ověřené primární rozhodnutí.
  Detail viz `routing-2026-06-15.md`.
