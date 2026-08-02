# Discovery report — 2026-08-02

## Nové indikátory / datasety
- [ ] (žádný nový strojově dohledatelný dataset). ÚZIS aktuality nejnovější stále
  **26. 6. 2026** (Tuberkulóza v ČR 2025), 15. 6. (NRPATV). Beze změny od běhu 08-01.

## Nové legislativní normy / sněmovní tisky
- Bez nové normy s centrálním KPI od posledního běhu.

## Aktuální dění / kauzy s implikací pro zdravotnictví (MZ tiskové zprávy)
- Nejnovější TZ MZ stále **30. 7. 2026** (WHO plán spolupráce) — od běhu 08-01 žádná nová.
  Ostatní z posledních dní (29. 7. společné nákupy FN, 28. 7. sekce duš. zdraví, horké dny,
  24. 7. očkování v lékárnách „připravuje se", 21. 7. strategie paliativní péče do praxe) —
  rámcové/personální/implementační, bez samostatného strojově dohledatelného centrálního KPI.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna ÚZIS/Eurostat/OECD/WHO od posledního běhu.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno v tomto běhu (fokus rutiny dle zadání na live validaci zdrojů korpusu;
  routing spadl na FALLBACK-AUDIT). Bez signálu z powerlistu.

## Stav publikační fronty
- 33 nepublikovaných draftů, backlog evergreen 0 `ready`. Fronta přeplněná → přidání
  34. draftu odporuje železnému pravidlu („lepší žádná změna než zbytečná"). Konzistentní
  s 07-07/07-08/07-31/08-01.

## Doporučení pro routing fáze
- HOT (nový indikátor / aktuální dění se samostatným centrálním KPI): žádný způsobilý.
- WARM (revize zastaralého článku kvůli vlně): žádný akutní.
- COLD → **FALLBACK-AUDIT** nejstaršího dotčeného článku s live ověřením VŠECH zdrojů
  (dle explicitního důrazu zadání „naprosto zásadní je validace a ověření všech zdrojů!!!!").
  Nejstarší dotčený publikovaný článek: `clanek-hospicova-pece.html` (dateModified/last_reviewed
  2026-05-22, 72 dní > 30). Data-heavy, stojí na externích zdrojích (MZD Strategie, EAPC) →
  nejvyšší hodnota re-verifikace.
