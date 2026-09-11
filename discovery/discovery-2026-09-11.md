# Discovery report — 2026-09-11

Běh denní rutiny podle `PROMPT_DAILY_ROUTINE.md`. Všechny nálezy ověřeny proti
primárnímu zdroji; sekundární zdroje slouží jen jako stopa.

## Nové indikátory / datasety

- [ ] (žádný nový dataset s nenapojenou populací)
- ÚZIS — aktuality: poslední položka **14. 8. 2026** („Vysoké teploty a mortalita“).
  Od 1. 9. 2026 na `uzis.cz/index.php?pg=aktuality` **žádná nová vlna** NRPZS, NOR,
  NRH ani NRZP. COLD.
- ČSÚ — aktuality: od 1. 9. 2026 jen nezdravotnické (3. 9. školní docházka,
  28. 8. HDP a trh práce). Cause-of-death vlna za rok **2025** zatím **nevyšla** —
  ČSÚ ji publikuje na konci září (vlna za 2024 vyšla 22. 9. 2025). COLD.
- OECD — `oecd.org/en/topics/health.html` vrací na strojový dotaz HTTP 403;
  kanál se dnes ověřit nepodařilo, do routingu nevstupuje.
- Eurostat — `hlth_cd_asdr2` dotažen přímo přes disseminační API (staženo
  11. 9. 2026). Nejnovější dostupný rok je **2023**; nová vlna od minula nepřibyla.
  Dataset ale **věcně vstupuje do dnešního článku** (viz níže).

## Nové legislativní normy / sněmovní tisky

- Sbírka zákonů (`zakonyprolidi.cz/cs/aktualne`): HTTP 403, kanál dnes neověřen.
- PSP ČR: `historie.sqw` vrací jen navigační kostru bez seznamu tisků; posun
  u sledovaných tisků se dnes strojově doložit nepodařilo. Neuvádím nic.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **WHO Europe, 10. 9. 2026 (news release)** — *Hidden in the numbers: Detective
  work behind data linkage to support suicide prevention in Czechia*. WHO popisuje
  propojení dat ÚZIS s evidencí Policie ČR a jeho dopad na statistiku sebevražd.
  Doslovné věty z releasu: „In 2024, improved data linkage shifted some deaths
  previously classified as being of undetermined intent into the suicide
  statistics.“; „As a result, recorded suicide deaths increased by 25%, while
  deaths of undetermined intent decreased by 14%.“; „the number of deaths by
  suicide rose from 1249 to 1561.“; „Between 2023 and 2024, deaths classified as
  transport accidents decreased by 12%.“ → **HOT**.
  <https://www.who.int/europe/news/item/10-09-2026-hidden-in-the-numbers--detective-work-behind-data-linkage-to-support-suicide-prevention-in-czechia>
  - ⚠️ **Nesoulad v čísle za rok 2023.** WHO uvádí 1 249. Primární zdroje uvádějí
    jinou hodnotu — ÚZIS (tab. 1 analytické studie, kódy X60–X84) **1 250**,
    ÚZIS/ČSÚ (tab. 4 téže studie, X60–X84 + Y87.0) a tisková zpráva ČSÚ
    **1 253**. Do článku jde primární hodnota, ne číslo z WHO releasu; rozdíl
    vintage je v textu pojmenován.
- MZ ČR — tiskové zprávy: 5. 9. „Aktivní ZÁŘÍ“ (kampaň), 3. 9. nová generace
  EZKarty, 2. 9. koordinátoři v onkologické péči. Žádná z nich nenese
  kvantitativní tvrzení doložitelné z primárních dat → nejde o spouštěč.
- WHO Europe, další položky září 2026 (Ukrajina, požáry, ocenění) — bez
  implikace pro ČR.
- NÚKIB: 4. 9. analýza k Signalu, 1. 9. konference. Nic ke zdravotnictví ani
  k NIS2. COLD.
- SÚKL — výpadky léčiv: obě předpokládané cesty (`sukl.cz/...` → 301 na
  `sukl.gov.cz/...` → 404; `/registr-vypadku-leciv/` → 404). Kanál dnes
  neověřen, žádné tvrzení z něj nevzniká.

## Recenzovaná literatura (PubMed / Consensus)

Oba konektory dostupné a použité.

- `search_articles` k českým pracím o sebevraždách a mortalitní statistice:
  15 záznamů, **žádný** k propojování dat ÚZIS × PČR — studie ÚZIS je šedá
  literatura publikovaná na NZIP, v PubMed není.
- Kontext k tématu dne (ověřeno v PubMed 11. 9. 2026, včetně typu publikace):
  - **Tøllefsen IM et al.** *Are suicide deaths under-reported? Nationwide
    re-evaluations of 1800 deaths in Scandinavia.* BMJ Open 2015;5(11):e009120.
    DOI 10.1136/bmjopen-2015-009120. PMID 26608638. Typ: *Validation Study*.
    Závěr abstraktu: reklasifikace **nezvýšila** celkovou oficiální statistiku
    tří skandinávských zemí; 21 % švédských „nezjištěných“ ale na sebevraždu
    překlasifikováno bylo.
  - **Auger N et al.** *Suicide in Canada: impact of injuries with undetermined
    intent on regional rankings.* Inj Prev 2016;22(1):76–8.
    DOI 10.1136/injuryprev-2015-041613. PMID 26157108. Připočtení úmrtí
    nezjištěného úmyslu zvýšilo míru sebevražd až o 26,5 % (muži) a 37,7 %
    (ženy) a **přeházelo pořadí provincií**.
  - **Snowdon J.** *Spain's suicide statistics: do we believe them?* Soc
    Psychiatry Psychiatr Epidemiol 2021;56(5):721–729.
    DOI 10.1007/s00127-020-01948-z. PMID 32918553. Míra úmrtí nezjištěného
    úmyslu ve Španělsku 0,09 proti 1,74 v Anglii a Walesu.
  - **Schmeckenbecher J et al.** *Autopsy rates and the misclassification of
    suicide and accident deaths.* Eur J Epidemiol 2024;39(10):1109–1126.
    DOI 10.1007/s10654-024-01142-4. PMID 39044107. **Protisměrný nález**:
    „suicides do not seem to be misclassified as undetermined deaths or
    ill-defined deaths“ — sebevraždy a nehody se podle této práce zaměňují
    navzájem, ne s nezjištěným úmyslem.
- **Consensus** (`search`, `medical_mode`, `exclude_preprints`) použit jako
  vyhledávač k témuž tvrzení. Výsledek: **evidence není jednosměrná** — vedle
  prací dokládajících podhodnocení (Auger 2015, Donaldson 2006, Öhberg 1998)
  stojí Tøllefsen 2015 a Schmeckenbecher 2024 s opačným nebo nulovým nálezem.
  Článek proto nesmí stát na jediné studii a tvrdí jen to, co unese český
  doklad. Citují se práce, ne Consensus.

## Aktualizace existujících dat (vlna)

- Eurostat `hlth_cd_asdr2`, jednotka RT, sex T, age TOTAL, kódy
  `X60-X84_Y870` (úmyslné sebepoškození) a `Y10-Y34_Y872` (událost nezjištěného
  úmyslu) — dotaženo přímo z API 11. 9. 2026, poslední rok 2023, bez nové vlny.
- ÚZIS/NZIP analytická studie „Validace počtu sebevražd v ČR v roce 2024“
  (NZIP dataset 2478, poslední aktualizace **22. 9. 2025**) — v korpusu HSPA
  Monitoru dosud **nezpracovaná**, přestože korpus má tři články o sebevraždách.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

- **VeKLEP**: 27 záznamů se zdravotnickou vazbou s pohybem od 1. 9. 2026.
  Nejvýznamnější: **Návrh vyhlášky o stanovení hodnot bodu, výše úhrad hrazených
  služeb, výše záloh a regulačních omezení pro rok 2027** (úhradová vyhláška),
  předkladatel Ministerstvo zdravotnictví, autorizace **9. 9. 2026**, oblast
  Sociální zabezpečení/Zdravotní pojištění.
  <https://odok.cz/portal/veklep/material/ALBSDXRFYLM6/> · dotaz spuštěn
  11. 9. 2026. Dále pohyb u novely zákona č. 167/1998 Sb. o návykových látkách
  (10. 9.), novely zákona č. 258/2000 Sb. o ochraně veřejného zdraví (10. 9.)
  a nařízení vlády o vyměřovacím základu pro pojistné hrazené státem na rok 2027
  (9. 9.).
- **Registr smluv**: nad 50 mil. Kč od 4. 9. jediná smlouva se zdravotnickou
  vazbou — Ústav pro péči o matku a dítě (IČO 00023698), *Smlouva o úklidu*,
  podepsáno 7. 9. 2026, 69 611 632,75 Kč, dodavatelé TSC Hospital s.r.o.
  (IČO 26872561) a VKUS-BUSTAN s.r.o. (IČO 26841410). Kategorie „Čisticí a
  hygienické služby“, cena není skrytá. Dotaz spuštěn 11. 9. 2026 přes
  hlidacstatu.cz. **Nic mimořádného — jde o běžnou úklidovou zakázku a nevzniká
  z ní žádné tvrzení.**
- **ÚOHS**: 0 rozhodnutí se zdravotnickou vazbou od 1. 9. 2026.
- **Ověřovna Barometru**: žádný kvantitativní výrok politika o zdravotnictví,
  který by šel konfrontovat s indikátory. Kandidát dnes nevzniká.

## Doporučení pro routing fáze

- **HOT (aktuální dění)**: WHO Europe 10. 9. 2026 — propojení dat ÚZIS × PČR
  a jeho dopad na českou statistiku sebevražd. Doložitelné **primárním**
  zdrojem (analytická studie ÚZIS na NZIP + TZ ČSÚ + Eurostat), korpusem
  nepokryté, přímo dotýkající se indikátorů dashboardu.
- **HOT (legislativa)**: úhradová vyhláška na rok 2027 vstoupila do
  meziresortního řízení (VeKLEP, 9. 9. 2026). Korpus má explainer
  `clanek-uhradova-vyhlaska` a článek o výsledku dohodovacího řízení 2027 —
  téma je pokryté; nález se hodí spíš na sledování posunu fáze než na dnešní
  článek. **Ponecháno na příští běh.**
- **WARM**: žádný článek dnes nezastaral novou vlnou.
- **COLD**: ÚZIS, ČSÚ, MZ ČR, NÚKIB, WHO (mimo uvedený release), ÚOHS.
