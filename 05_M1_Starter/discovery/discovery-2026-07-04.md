# Discovery report — 2026-07-04

Běh `PROMPT_DAILY_ROUTINE.md` (5 fází). Explicitní důraz uživatele:
**„Naprosto zásadní je validace a ověření všech zdrojů!!!!"** → den publikace
draftu `clanek-pohlavni-nemoci-2025` (naplánováno na 07-04) = nezávislé ověření
proti primárnímu zdroji je nadřazená priorita běhu.

## Nové indikátory / datasety
- [ ] Žádný nový dataset s implikací pro nový článek.
- **ÚZIS aktuality** (uzis.cz/index.php?pg=aktuality): nejnovější položka stále
  **26. 6.** „Tuberkulóza v ČR v roce 2025" — beze změny od minulého běhu.
  Žádná nová vlna NRPZS / NOR / NRH / NRZP v červenci.

## Nové legislativní normy / sněmovní tisky / strategie
Nové primární zdroje MZ ČR (mzd.gov.cz/tiskove-centrum/tiskove-zpravy), ale
**všechny odpovídají již existujícím publikovaným článkům** → žádné nové HOT:
- **3. 7.** TZ „MZ představilo nový systém péče o pacienty se vzácnými
  onemocněními — projekt SYPOVO, Národní strategie do 2035" → již pokryto
  `clanek-vzacna-onemocneni-strategie-2035.html` (published, status `partial`).
  **WARM follow-up:** čerstvá primární TZ může posílit/aktualizovat existující
  článek (upgrade sekundární → primární doložení, případně `partial`→ověřeno).
- **1. 7.** TZ „MZ převzalo agendu politiky v oblasti závislostí a duševního
  zdraví" → již pokryto `clanek-protidrogova-dusevni-politika-mz-2026.html`
  (published, review-pending). WARM: upgrade atribuce na primární TZ
  (přenesené z 07-03 discovery, stále otevřené).
- **29. 6.** TZ „ČR má poprvé Strategii rozvoje paliativní péče do 2035" →
  pokryto `clanek-novela-paliativni-pece.html` + `clanek-mobilni-paliativni-tymy.html`.
- **30. 6.** „Více než 1 200 léků nově u praktického lékaře" → již evidováno
  v korpusu (nightly).

## Aktuální dění / kauzy s implikací pro zdravotnictví
- Evropský kontext PPN (ECDC „Bacterial STIs reach record highs in Europe,
  congenital syphilis nearly doubles", publ. 21. 5. 2026) — už zapracován do
  ověřovaného draftu `clanek-pohlavni-nemoci-2025`.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna od 07-03. Fronta draftů saturovaná (**19 draftů**
  `published:false`).

## Doporučení pro routing fáze
- **HOT (nový článek):** žádný doložitelný, dosud nepokrytý trigger.
- **WARM (revize/upgrade):** `clanek-vzacna-onemocneni-strategie-2035`
  (primární TZ MZ 3. 7.), `clanek-protidrogova-dusevni-politika-mz-2026`
  (primární TZ MZ 1. 7.) — nechat na příští běh, dnes nadřazená priorita
  verifikace publikace.
- **VERIFICATION-PASS (nadřazené):** `clanek-pohlavni-nemoci-2025` publikuje
  DNES → nezávislý audit proti primárnímu ÚZIS + ČSÚ + ECDC (viz routing report).
- **COLD:** fronta saturovaná; technická validace `validate:all` OK,
  `verify:freshness` OK.
