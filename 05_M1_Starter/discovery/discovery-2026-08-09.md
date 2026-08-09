# Discovery report — 2026-08-09

## Nové indikátory / datasety
- [ ] (žádné nové) — ÚZIS aktuality (ověřeno 9. 8.): beze změny proti 08-08,
  poslední položky jsou personální inzeráty (7. 8. databázový specialista,
  3. 8. mzdový účetní); poslední datová publikace „Tuberkulóza v ČR v roce 2025"
  (26. 6.). ČSÚ: listing rychlých informací je JS katalog, přes proxy nečitelný;
  žádný sekundární signál o nové demografické publikaci (Pohyb obyvatelstva 2Q
  vyjde v září). OECD/Eurostat mimo publikační okno (HAaG listopad).

## Nové legislativní normy / sněmovní tisky
- (nezjistitelné live) — zakonyprolidi.cz/cs/aktualne HTTP 403 přes proxy
  (shodně s běhy 08-01…08-08); psp.cz/sqw/historie.sqw dnes HTTP 503.
  Sekundární sken (WebSearch) nezachytil žádnou novou normu v gesci MZ ČR
  z 8.–9. 8. Sněmovna mezi schůzemi.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- MZ ČR /vsechny-novinky/ (ověřeno 9. 8.): beze změny proti 08-08 — poslední
  položky 7. 8. (tamoxifen 6 000 balení — zpracováno včerejší revizí
  `clanek-tamoxifen-vypadek.html`; kvalita vody ke koupání — osvětové).
  Víkend, žádná nová TZ z 8.–9. 8.
- WHO Europe (ověřeno 9. 8.): beze změny — poslední 5. 8. (kojení, globální,
  pokryto korpusem).
- NÚKIB (ověřeno 9. 8.): beze změny — 7. 8. výzva k podání nabídky (NIS2
  expertní služby), administrativní, mimo zdravotnictví.

## Aktualizace existujících dat (vlna)
- SÚKL MR feed (opendata.sukl.cz/soubory/MR/mr.zip, staženo 9. 8., soubor
  generován 8. 8. 22:15, platnost 09.08.2026): 82 671 hlášení; poslední platná
  hlášení typu „preruseni" bez uplynulého termínu obnovení ≈ 1 271 (heuristika
  rutiny; produkční hodnotu 1 329 počítá `ingest/transform.js` vlastní metodikou
  a obnoví ji pondělní ingest cron — mimo scope denní rutiny).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- MCP `hlidac_statu` není v této session připojen → kanál přeskočen (bez
  náhrady sekundárními zdroji, v souladu s citačními pravidly kanálu).

## ⚠️ Nález nad rámec powerlistu — verifikace kotevního indikátoru evergreen fronty
Při předběžné kontrole top položky evergreen backlogu (`preziti-po-dlouhe-upv`)
byla poprvé strojově replikována hodnota indikátoru
`preziti_1rok_po_upv_2d_pct` z primárního zdroje — analytické studie ÚZIS
**„Pilotní přehled vybraných indikátorů intenzivní péče a anesteziologie
2010–2024"** (NZIP dataset 2708, publikováno 7. 4. 2026, zpracováno
k 1. 2. 2026, zdroj NRHZS; PDF staženo a vytěženo 9. 8. 2026):

- **Hodnota 51,2 % přežití SEDÍ** — sekce „Trajektorie pacientů: stav rok po
  příjmu na ARO", kohorty Σ 2022+2023, pacienti 18+ s UPV ≥ 2 dny:
  31 294 pacientů, z toho 15 279 (48,8 %) zemřelo → přežití 51,2 %.
  Věkový gradient přesně odpovídá metodické kartě: 65–74 let přežití 48,5 %
  (zemřelo 51,5 % z 10 511), 75–84 let 34,7 % (zemřelo 65,3 % ze 7 488),
  85+ let 16,9 % (zemřelo 83,1 % z 1 154).
- **Rok indikátoru NESEDÍ**: dashboard uvádí `year: 2024` a trend
  `[{2024: 51,2}]`, ale hodnota patří souhrnu kohort **2022+2023** (studie
  výslovně: „Pro hospitalizační případy v roce 2024 není k dispozici kompletní
  sledování do roku 2025").
- **Metodická karta obsahuje neověřitelný trend** („2018: 49,8 %; 2024:
  51,2 %") a „rozptyl mezi nemocnicemi 40–62 %" — ve studii nejsou; roční řada
  studie je case-based (hospitalizační případy, mortalita do 1 roku od příjmu:
  2010 54,3 % → 2023 40,1 %), definičně jiná než patient-based headline.
- Zdrojová reference indikátoru je generická (uzis.cz) místo NZIP 2708.

→ Kandidát na **audit-fix indikátoru** (železné pravidlo) + evergreen článek
nad nyní plně ověřeným rámcem.

## Doporučení pro routing fáze
- HOT (nový indikátor): —
- HOT (aktuální dění): — (víkendový klid, tamoxifen zpracován 8. 8.)
- WARM (revize): oprava metadat indikátoru `preziti_1rok_po_upv_2d_pct`
  (rok, trend, zdroj, metodická karta) z primární studie NZIP 2708.
- EVERGREEN: top ready položka backlogu `preziti-po-dlouhe-upv` (prio 8) —
  datový rámec nyní kompletně ověřen z primárního zdroje.
- COLD: fallback-audit není potřeba.

## Poznámka k dostupnosti zdrojů (proxy)
zakonyprolidi.cz (403), psp.cz (503), csu.gov.cz listingy (JS, nečitelné).
Plně dostupné: uzis.cz, mzd.gov.cz (/vsechny-novinky/), opendata.sukl.cz
(mr.zip), nzip.cz (dataset 2708 + PDF studie), who.int, nukib.gov.cz.
