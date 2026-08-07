# Discovery report — 2026-08-07

## Nové indikátory / datasety
- [ ] (žádné nové) — ÚZIS aktuality: nejnovější záznam stále personální inzerát (mzdový
  účetní, 3. 8.), poslední datová publikace „Tuberkulóza v ČR v roce 2025" (26. 6.).
  ČSÚ: bez nové zdravotnické/demografické publikace (Pohyb obyvatelstva za 2Q vyjde
  až v září; naděje dožití 2025 už zpracována v korpusu). OECD/Eurostat mimo
  publikační okno (HAaG listopad).

## Nové legislativní normy / sněmovní tisky
- (nezjistitelné live) — zakonyprolidi.cz/cs/aktualne HTTP 403 přes proxy (stejně jako
  běhy 08-01…08-06). Žádný sekundární signál o nové normě v gesci MZ od 30. 7.
  PSP: Sněmovna mezi schůzemi.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- **HOT — SÚKL 31. 7. 2026: výzva k předložení specifického léčebného programu (SLP)
  na kvetiapin, tablety s prodlouženým uvolňováním (XR).** Primární zdroj: stránka
  Odboru dostupnosti léčiv SÚKL (sukl.gov.cz, zveřejněno 31. 7. 2026, plný text ověřen
  7. 8.). Klíčová fakta z výzvy: v ČR nejsou dostupné registrované přípravky kvetiapinu
  XR v žádné z pěti sil (50/150/200/300/400 mg); u 200/300/400 mg jde o přerušení
  dodávek na minimálně 6 měsíců (předpokládaná potřeba 373 000 + 342 000 + 537 000 =
  1 252 000 DDD), u 50/150 mg o úplné ukončení dodávek (186 000 + 191 000 = 377 000
  DDD ročně). Indikace dle výzvy: schizofrenie, bipolární porucha, přídatná léčba
  depresivní poruchy (MDD). Právní rámec: § 49 zákona č. 378/2007 Sb. (citován přímo
  ve výzvě).
  - **Strojové ověření v SÚKL open-data MR feedu** (opendata.sukl.cz/soubory/MR/mr.zip,
    staženo 7. 8. 2026, soubor generován 6. 8. 2026 22:15, platnost 07.08.2026):
    10 kódů SÚKL KVENTIAX PROLONG s posledním platným hlášením **ukončení**
    dodávek s platností 23. 7.–10. 8. 2026 (hlášeno 14. 7. a 23. 7.); 16 kódů XR
    s aktivním **přerušením** (DERIN PROLONG → obnovení 1. 12. 2026, QUESTAX PROLONG
    → 28. 2. 2027, QUETIAPIN TEVA RETARD → 30. 9./31. 12. 2026, QUETIAPINE VIATRIS
    TBL PRO → 31. 10. 2026/31. 1. 2027), všechna z výrobních důvodů. 2 kódy XR
    formálně bez hlášení výpadku (caveat: hlášení ≠ faktická dostupnost; autoritou
    nedostupnosti je výzva SÚKL). IR formy (okamžité uvolňování) zůstávají vesměs
    dodávané (Kventiax, Neuraxpharm, Polpharma obnovení/zahájení 2025–2026).
  - **EMA (ema.europa.eu, shortage entry „Quetiapine", aktualizace 4. 5. 2026,
    poprvé publikováno 11. 3. 2025)**: celoevropský výpadek XR forem 50–400 mg,
    22 členských států vč. Česka; příčina = nárůst poptávky + výrobní problém
    u výrobce dodávajícího XR formu více firmám v EU; očekávané trvání do 2Q 2027;
    doporučení převádět pacienty na IR formy nebo alternativy dle národních pokynů.
  - **WHO ATC/DDD (atcddd.fhi.no)**: kvetiapin N05AH04, DDD 0,4 g perorálně
    (stanoveno pro léčbu psychóz) — ověřeno pro přepočty DDD.
- MZ ČR „Všechny novinky" 4.–7. 8.: žádná nová TZ od 3. 8. (tamoxifen ZLP —
  zpracováno 08-05; zásady chování ve vedru — osvětové).
- WHO Europe 4.–7. 8.: 5. 8. zpráva o kojení (globální, bez ČR-specifických dat;
  kojení pokrývá awareness rutina + 2 články korpusu). Nic dalšího ČR-relevantního.
- NÚKIB 20. 7.–7. 8.: pouze 29. 7. SBOM doporučení — mimo zdravotnictví.

## Aktualizace existujících dat (vlna)
- (žádná nová vlna) — SÚKL MR feed je průběžný denní feed (využit výše pro verifikaci),
  ne nová vlna zakládající samostatnou revizi.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- MCP `hlidac_statu` není v této session připojen → kanál přeskočen (bez náhrady
  sekundárními zdroji, v souladu s citačními pravidly kanálu).

## Doporučení pro routing fáze
- HOT (nový indikátor): —
- HOT (aktuální dění): **kvetiapin XR — výpadek všech pěti sil + výzva SÚKL k SLP
  (31. 7. 2026)**; plná primárně-zdrojová doložitelnost (výzva SÚKL + MR feed
  strojově + EMA + WHO DDD); mezera v korpusu (tamoxifen-vypadek pokrývá onkologii
  a mechanismus ZLP, nikoli psychofarmaka/SLP; žádný článek o kvetiapinu).
- WARM (revize): společné nákupy FN (stále bez čísel — odloženo)
- COLD: backlog má 5 položek `ready` (top priority 8 preziti-po-dlouhe-upv) —
  nevyužito, HOT má přednost.

## Poznámka k dostupnosti zdrojů (proxy)
zakonyprolidi.cz (403), sukl.gov.cz/farmaceuticky-trh/registr-vypadku-leciv (503),
tn.nova.cz (403 — nepotřeba, jen sekundární stopa). Plně dostupné: sukl.gov.cz výzvy
SLP, opendata.sukl.cz (mr.zip), ema.europa.eu, atcddd.fhi.no, mzd.gov.cz, uzis.cz,
who.int, nukib.gov.cz.
