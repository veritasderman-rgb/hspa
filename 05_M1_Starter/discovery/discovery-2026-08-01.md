# Discovery report — 2026-08-01

## Nové indikátory / datasety
- [ ] (žádný nový strojově dohledatelný dataset) — ÚZIS aktuality nejnovější stále
  26. 6. 2026 (Tuberkulóza v ČR 2025), 15. 6. (NRPATV). Beze změny od běhu 07-31.

## Nové legislativní normy / sněmovní tisky
- Bez nové normy s centrálním KPI. zakonyprolidi.cz/aktualne vrací pro bota HTTP 403
  (bot ochrana) — jednotlivé permalinky norem ale živé (viz audit níže: 2000-258, 2006-537 = 200).

## Aktuální dění / kauzy s implikací pro zdravotnictví (MZ tiskové zprávy)
- Nejnovější TZ MZ stále **30. 7. 2026** (WHO plán spolupráce) — od běhu 07-31 žádná nová.
- Ostatní z posledních dní (29. 7. pilot nákupů FN, 28. 7. sekce duš. zdraví, 24. 7. očkování
  v lékárnách „připravuje se", 21. 7. paliativní strategie) — rámcové/personální/implementační,
  bez samostatného strojově dohledatelného centrálního KPI. Nezpůsobilé pro datový článek.
- **Infrastrukturní nález**: doména MZ přesměrována `mzcr.cz` → `mzd.gov.cz` (HTTP 301).
  Redirect funguje, existující odkazy v korpusu tedy neselhávají; kandidát na budoucí sweep
  (noční rutina) na přepis kanonických URL, ne na dnešní akci.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna ÚZIS/Eurostat/OECD/WHO od posledního běhu.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno v tomto běhu (fokus rutiny dle zadání na live validaci zdrojů korpusu;
  routing spadl na FALLBACK-AUDIT). Bez signálu z powerlistu.

## Stav publikační fronty
- 33 nepublikovaných draftů. Fronta přeplněná → přidání 34. draftu odporuje železnému
  pravidlu („lepší žádná změna než zbytečná"). Konzistentní s 07-07/07-08/07-31.

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- HOT (aktuální dění se samostatným centrálním KPI): žádný způsobilý.
- WARM (revize zastaralého článku kvůli vlně): žádný akutní.
- COLD → **FALLBACK-AUDIT** nejstaršího dotčeného článku s live ověřením VŠECH zdrojů
  (přesně dle důrazu zadání „naprosto zásadní je validace a ověření všech zdrojů!!!!").
