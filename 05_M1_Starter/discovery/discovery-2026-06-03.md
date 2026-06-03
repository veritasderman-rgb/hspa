# Discovery report — 2026-06-03

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md). Discovery proběhlo proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního zdroje, nezůstává.

## Procházené primární zdroje (stav fetch)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | poslední položka 5. 5. 2026 (prodloužení sběru výkazů), nic nového po 5. 5. |
| 2 | NZIP — datasety | nzip.cz/data | ⚠️ 403 | nedostupné přes fetch |
| 3 | MZ ČR — tiskové zprávy | mzd.gov.cz/tiskove-centrum/tiskove-zpravy (přesměrováno z mzcr.cz) | ✅ 200 | **viz nálezy** |
| 10 | SÚKL — výpadky léčiv | sukl.cz/.../registr-vypadku-leciv | ⚠️ 403 | nedostupné přes fetch |
| 12 | Sbírka — zakonyprolidi | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 | nedostupné přes fetch |
| — | PUK (KZP) — pooperační sepse | puk.kancelarzp.cz/pooperacni-sepse | ⚠️ 403 přímý fetch / ✅ obsah přes WebSearch | metodika ověřena |

> Pozn.: doména MZ ČR se přesměrovává z `mzcr.cz` na **`mzd.gov.cz`** (301). Část
> zdrojů (NZIP, SÚKL, zakonyprolidi) vrací 403 na strojový fetch — pro tyto byl
> použit WebSearch s ověřením proti druhému zdroji.

## Nové indikátory / datasety

- [X] **Pooperační sepse — nový národní indikátor kvality nemocniční péče**
  publikovaný **2. 6. 2026** na Portálu ukazatelů kvality (PUK, Kancelář
  zdravotního pojištění) společně s MZ ČR.
  - Národní referenční hodnota 2024: **0,84 % případů** (PUK)
  - Roční objem: **přes 5 000 případů** pooperační sepse (MZ ČR)
  - Datová báze: **2,75 mil. hospitalizačních případů 2020–2024** (claims data ZP)
  - Záchytné body trendu: vrchol **2021 = 1,30 %**, **2023 = 0,92 %**, **2024 = 0,84 %** (PUK)
  - Cíl ministra: snížit počet případů zhruba na polovinu (MZ ČR)
  - Poprvé na úrovni jednotlivých poskytovatelů, risk-adjustace logistickou regresí.

## Nové legislativní normy / sněmovní tisky

- (žádné nové ověřené v gesci MZ ČR k 3. 6. 2026 — zakonyprolidi nedostupné fetch,
  bez potvrzení neuvádím)

## Aktuální dění / kauzy s implikací pro zdravotnictví (MZ ČR TZ)

- **2. 6. 2026** — „Když data chrání pacienty: Česko otevírá výsledky pooperačních sepsí" → **HOT**, dosud v korpusu nepokryto
- 29. 5. 2026 — Helena Rögnerová se vrací na MZ; IKEM povede Romana Benešová (personálie)
- 28. 5. 2026 — reforma vysoce specializované péče, centralizace chirurgie (pokryto `clanek-centralizace-chirurgie-2027`)
- 28. 5. 2026 — podpora nových center duševního zdraví (téma už pokryto)
- 26. 5. 2026 — Centrum onkologické prevence v Brně (pokryto `clanek-centrum-onkologicke-prevence-mou-2026`)
- 25. 5. 2026 — reakce MZ na zjištění NKÚ k REACT-EU (pokryto `clanek-react-eu-nku-kontrola-2026`)

## Aktualizace existujících dat (vlna)

- ÚZIS: poslední aktualita 5. 5. 2026 (administrativní, bez datové vlny)

## Doporučení pro routing fáze

- **HOT (nový indikátor + aktuální dění):** `pooperacni-sepse` — nový národní VBHC/PUK
  indikátor, publikovaný včera (2. 6.), přímo navazuje na již publikovaný článek
  `clanek-data-leci-cesko-2026` (který jeho vydání avizoval na 6/2026), a je
  explicitně předjímán v `PLAN-KVALITA-PECE.md` §1. Dvě nezávislé primární linie
  (MZ ČR TZ + PUK metodika). → **ARTICLE-WRITE**
- WARM: žádná zastaralá vlna vyžadující revizi dnes
- COLD: n/a
