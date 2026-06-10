# Decisions log — HSPA Monitor

Záznam strategických rozhodnutí, odstranění a změn, které **NESMÍ být znovu zaváděny** bez explicitního souhlasu uživatele. Pomáhá novým session vyhnout se re-implementaci odstraněných featur.

Formát: každá položka má `Datum`, `PR`, `Co`, `Proč`, `Důsledek`.

---

## 2026-06-10 — Korekce katarakty: 35,8 % → 98,7 % (signal flip bad→good)

- **PR**: #566
- **Co**: Indikátor `jednodenni_chirurgie_katarakta` a publikovaný článek tvrdily, že ČR provádí ambulantně jen 35,8 % kataraktových operací. Ověření primárního OECD dataflow `DSD_HEALTH_PROC@DF_SURG_PROC` ukázalo opak: **98,7 %** výkonů bez přenocování (2022; 143 173 výkonů, jen 1 841 s hospitalizací), OECD ⌀ 94,5 %.
- **Proč**: Stará řada počítala jen nemocniční day cases a míjela ambulantní oční centra, kde se v ČR provádí většina kataraktové chirurgie.
- **Důsledek**: **NEVRACET** hodnoty ~35 % ani narativ „Česko zaostává v ambulantní kataraktě" — je vyvrácený primárními daty. Článek je přepsán jako korekční analýza; otevřená otázka zní „proč se ambulantní model neprosadil u dalších výkonů".

---

## 2026-06-10 — OECD benchmark jen z členských zemí

- **PR**: #566
- **Co**: `oecd_sdmx2.js` počítá „OECD průměr" výhradně z 38 členských zemí (konstanta `OECD_MEMBERS`); dataflows obsahují i partnerské země (BGR, ROU, HRV, PER…), které průměr zkreslovaly.
- **Důsledek**: Nový OECD benchmark vždy přes tento fetcher (members-only). Nepřidávat benchmarky počítané ze všech REF_AREA.

---

## 2026-06-10 — Výpadky léčiv: aktivní = jen přerušení (P), ne ukončení (K)

- **PR**: #566
- **Co**: `vypadky_leciv_aktivni` počítá jen aktivní **přerušení** dodávek (1 378 k 10. 6. 2026). Trvalá **ukončení** (K) se od 2007 kumulují (12 700+ LP) a nejsou „výpadek", ale stažení z trhu — drží se zvlášť (`discontinued_total`). Historický trend se rekonstruuje přehráním kumulativního feedu k 31. 12. (`yearEndTrend`).
- **Důsledek**: Nezahrnovat K do aktivních výpadků (nafouklo by metriku o řád). Seed hodnota 2 210 byla neověřitelná — nevracet.

---

## 2026-05-27 — Plán Kvalita péče (PUK + INDIKO)

- **PR**: #418 (`docs(plan): plán implementace „Kvalita péče"`)
- **Co**: Living spec `05_M1_Starter/PLAN-KVALITA-PECE.md` — nová podstránka s klinickými indikátory z PUK (KZP) a INDIKO (FBMI ČVUT).
- **Stav**:
  - Souhlas k re-publikaci dat: ✅ KZP, ✅ FBMI ČVUT
  - Datová akvizice: **scraping** (oba portály bez API)
  - 5 fází (Fáze 0 submenu → Fáze 4 scrapery) + 3 nové fáze před publikací (Verifikace, Grafika, Publication)
  - Estimace: ~9–11 večerů
- **Důsledek pro novou session**: Pokud uživatel řekne „pokračujeme s Kvalitou péče", začni PR-1 (Fáze 0 — submenu architektura).

---

## 2026-05-27 — GA4 fix: analytics_storage 'denied' → 'granted'

- **PR**: #415
- **Co**: V `src/analytics.js` změněn default `analytics_storage` na `granted`.
- **Proč**: GA Admin hlásil „No data received" — Consent Mode v2 s default-denied posílá jen modelované cookieless pings, neviditelné ve verifikaci.
- **Důsledek**: Reklamní storage (`ad_storage`, `ad_user_data`, `ad_personalization`) zůstávají **denied** — nevracet! Pouze analytická vrstva je povolená.

---

## 2026-05-26 — Articles hub: cover obrázek vlevo + text vpravo

- **PR**: #407
- **Co**: `clanky.html` má grid layout — cover image left (320px), text right (full-width column).
- **Důsledek**: Před publikací nového článku **vždy vygeneruj cover** přes `node ingest/scripts/generate-article-cover.js {id}`. 40+ článků již má, scraper-fallback collapse grid na single-column pokud cover chybí.

---

## 2026-05-26 — Editorial dot před „Články" v menu

- **PR**: #413
- **Co**: 5×5 px červený puntík před „Články" v top nav (CSS `.module-tab-editorial::before`).
- **Proč**: Decent vizuální signál „redakční srdce portálu" bez kolize s `.active` state.
- **Důsledek**: Pokud bude další sekce signalizovaná jako „editorial heart", **nezavádět druhý marker** — používat existující třídu nebo navrhnout jiný indikátor.

---

## 2026-05-26 — Persona switcher (Veřejnost/Odborník/Politik) ODSTRANĚN

- **PR**: #402 + cleanup #405
- **Co**: Top-nav switcher 3 person + `tldr_expert` / `tldr_policy` rendering odstraněn z UI.
- **Proč**: „Nemělo to žádnou funkci" — buttons neměly měřitelný dopad, persona text byl pro většinu uživatelů neviditelný.
- **Důsledek**:
  - **NEVRACET** persona switcher.
  - `tldr_expert` a `tldr_policy` zůstávají v `data/explainers.json` a `data/strategies.json` jako **dead content** (validátor je stále vyžaduje, ale UI je nezobrazí — vrací jen `tldr_public` přes `audienceText()`).
  - `filterExplainers()` prohledává jen `tldr_public` (PR #405 fix proti phantom search matches).
  - Pokud někdy persona switcher vrátíme, schéma se nemění — jen se zapne UI vrstva.

---

## 2026-05-25 — Score widget v hlavičce ODSTRANĚN

- **PR**: #402
- **Co**: `<span class="masthead-score">Skóre českého zdravotnictví: 28/100 · OECD průměr 71</span>` smazán z 95 HTML souborů.
- **Proč**: „Nemělo to žádnou funkci" — ozdobný widget bez interakce, mlžil sdělení.
- **Důsledek**:
  - **NEVRACET** widget.
  - `#czScore` element už neexistuje — `renderHSPAScore()` v `page-shared.js` ho nereferencuje (PR #405 cleanup).
  - `applyDataStats()` stále plní `[data-stat="X"]` placeholdery v `o-projektu.html`, `hspa-prehled.html` (statistiky o počtu indikátorů, ne skóre).

---

## 2026-05-25 — § 16b limity doplatků opraveny

- **PR**: #409
- **Co**: V `clanek-narok-pojistence-1-co-to-je.html` chybný text „200 / 500 / 1 000 / 5 000 Kč" opraven na **500 / 1 000 / 5 000 Kč** (skutečné kategorie dle aktuálního znění § 16b ZVZP).
- **Důsledek**: Limit 200 Kč v zákoně 48/1997 Sb. **NEEXISTUJE**. Pokud bude článek tématicky znovu řešen, ověř proti aktuálnímu znění + tisková zpráva ZP MV ČR.

---

## 2026-05-25 — Ředitel ÚZIS = Ladislav Dušek (NE Petr)

- **PR**: #409
- **Co**: V `clanek-narok-pojistence-2-demograficky-tlak.html` opraveno chybné jméno.
- **Důsledek**: Při zmínce ředitele ÚZIS vždy `prof. RNDr. Ladislav Dušek, Ph.D.` (od 2014). Žádný Petr.

---

## 2026-05-25 — OECD Health at a Glance 2025 aktualizace

- **PR**: #400
- **Co**: 9 OECD benchmarků aktualizováno podle HAaG 2025:
  - `alkohol_spotreba`: oecd 8.9 (zachováno kvůli WHO metodice)
  - `hospitalizace_acsc`: 580 → 592, oecd 480 → 473
  - `obezita_prevalence`: oecd 19.4 → 19
  - `sebevrazdy_per_100k`: oecd 10.5 → 11 (signal bad → warn)
  - `spotreba_antibiotik`: oecd 17.5 → 16, eu 18.5 → 18.3
  - `unmet_need_medical`: oecd 2.4 → 3
  - + glosář, explainery, timeline
- **Důsledek**: Pokud bude další HAaG (2027), opakovat patternem — vyhledat „Health at a Glance 2024" a „Health at a Glance 2023" reference a aktualizovat.

---

## 2026-05-25 — „Příbuzné sekce" napříč webem

- **PR**: #401
- **Co**: Hub stránky (16) + článkové stránky (65) mají dolní sekci „Příbuzné sekce" — cross-link cards.
- **Mechanismus**:
  - Hub stránky: statické cards v HTML
  - Článkové stránky: dynamicky generuje `src/article-related.js` z metadat (`linked_indicators`, `linked_prevention_themes`, `topics`)
- **Důsledek**: Při přidání nové top-level stránky **doplnit „Příbuzné sekce" sekci** do alespoň 3-5 souvisejících stránek + zvážit cross-link z dynamického generátoru pro články.

---

## 2026-05-25 — Nová strategie NIKEZ + explainer INDIKO

- **PR**: #406
- **Co**: V `data/strategies.json` nová entry `nikez_zdravotnictvi`; v `data/explainers.json` nová entry `indiko_portal`. Nový článek `clanek-data-leci-cesko-2026.html`.
- **Důsledek**:
  - Nově vznikající strategie patří do `data/strategies.json` s konzistentním `scope` (framework/program/action_plan/strategy/guideline — **NE `institutional`!**).
  - Při příští aktualizaci dashboardu o klinické indikátory (PUK, INDIKO) zachovat cross-link na tyto entries.

---

## 2026-05-?? — Daily routine cron (06:00 UTC)

- **Co**: GitHub Actions cron spouští `npm run ingest` + commituje `data/snapshot-YYYY-MM-DD.json` + `discovery/discovery-YYYY-MM-DD.md` + `discovery/routing-YYYY-MM-DD.md`.
- **Důsledek**:
  - `data/snapshot-*.json` a `discovery/*.md` jsou auto-generated. Nepatří do manuálních PR.
  - Pokud cron selže, signál je v `discovery/routing-YYYY-MM-DD.md` (selhání ingestu/transformu).

---

## Aktualizační pravidla pro tento log

1. Po každém merged PR s **strategickou** změnou (odstranění feature, nový plán, oprava chyby s implikací) přidej záznam.
2. Format: datum (YYYY-MM-DD) + PR # + Co/Proč/Důsledek.
3. Drobné PR (typo, formátovací oprava, single-article edit) **NEZAZNAMENÁVAT**.
4. Verze tohoto souboru = datum posledního záznamu nahoře.

**Účel**: nová Claude session přečte tento log a vyhne se 2 typům chyb:
- Re-implementovat odstraněnou feature („přidám persona switcher")
- Re-zavést opravenou chybu („v § 16b je 200 Kč limit")
