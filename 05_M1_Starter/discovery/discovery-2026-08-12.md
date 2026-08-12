# Discovery report — 2026-08-12

## Nové indikátory / datasety
- [X] **Eurostat — výměna ukazatele zdravých let v SDG monitoringu** (HOT):
  edice SDG 2026 nahrazuje „Healthy life years" (`hlth_hlye`, GALI/omezení
  aktivit) novým ukazatelem „Healthy life expectancy based on self-perceived
  health" (`hlth_silc_17`, subjektivní zdraví). Doloženo doslovnou poznámkou 5
  na Statistics Explained „SDG 3 – Good health and well-being" (ověřeno
  12. 8. 2026): *„Due to methodological reasons, the data source used for
  measuring healthy life expectancy has changed. Up to 2025, the indicator
  'Healthy life years' was used for the SDG monitoring… As of this 2026
  edition, a new indicator 'Healthy life expectancy based on self-perceived
  health' is used."* Oba datasety mají čerstvou vlnu **2024**
  (`hlth_silc_17` updated 25. 6. 2026, `hlth_hlye` updated 17. 7. 2026;
  REST API ověřeno 12. 8. 2026):
  - ČR 2024 (obě pohlaví): HLY 65+ **8,0** roku vs HLE (subj. zdraví) 65+
    **14,6** roku; LE 65 = 18,9. Při narození: HLY 62,4 vs HLE 73,8 (LE 80,1).
  - EU27 2024: HLY 65+ 10,3 vs HLE 65+ 16,2; LE 65 = 20,2. Při narození:
    HLY 65,2 vs HLE 75,5 (LE 81,5).
  - Příznaky křehkosti řady: EU27 2023 HLY nese flag `bep` (break/estimate/
    provisional), DE 2023 flag `b`; meziroční skok EU HLY 65+ 9,4 → 10,3.
  - Korpus: článek `clanek-nadeje-doziti-zdravi.html` (verified 21. 6. 2026)
    stojí na vlně 2023 (7,7) → o vlnu pozadu; datový kontrakt
    `nadeje_doziti_zdravi_65` už nese 8,0/2024 (live ingest 10. 8.).

## Nové legislativní normy / sněmovní tisky
- PSP tisk 235 (mimořádná valorizace plateb za státní pojištěnce): beze změny —
  1. čtení 8. 7., garanční Výbor pro zdravotnictví neprojednal, další
  projednávání možné od 7. 9. 2026 (psp.cz, ověřeno 12. 8.).
- PSP tisk 274 (novela z. o ochraně veřejného zdraví): beze změny — předložen
  27. 7., 30. 7. přikázán Výboru pro zdravotnictví (zpravodajka MUDr. Eva
  Črámková), žádný další krok (psp.cz, ověřeno 12. 8.).
- Sbírka zákonů: esipa.cz dnes nedostupná (obě URL varianty 404 přes proxy);
  zakonyprolidi.cz trvale 403. Riziko minimální (Sněmovna mezi schůzemi,
  poslední známý stav čá. 141–143/2026 z 6. 8. bez gesce MZ). → prověřit
  v příštím běhu.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- MZ ČR — Věstník: listing `mzd.gov.cz/vestniky/` beze změny, nejnovější
  položka stále NIKEZ č. 1/2026 (10. 8.) — zpracováno včerejším článkem.
- MZ ČR — tiskové zprávy: listingové URL dnes 404 (`/tiskove-centrum-mz/`
  i category varianta) → kanál dnes neprůchozí, prověřit příště.
- ÚZIS aktuality: jen personální inzeráty (3.–10. 8.) → NIC.
- NZIP datové zpravodajství: beze změny od 28. 7. (laboratorní vyšetření,
  rakovina plic) → NIC.
- WHO Europe: 10. 8. Ukrajina (humanitární) + GIS roadmap (globální
  infrastruktura) → mimo záběr.
- NÚKIB: beze změny (10. 8. Zimbra advisory, 7. 8. NIS2 tendr — obojí
  zaznamenáno včera) → NIC.
- SZÚ: beze změny od 10. 8. (biomonitoring mateřského mléka) → NIC.
- OECD: policy brief „Strengthening health checks for the prevention and
  management of cardiovascular disease" má publikační datum **14. 8. 2026**
  (včerejší nejasnost 11. vs 14. 8. vyřešena, WebSearch 12. 8.; oecd.org přes
  proxy stále 403) → WARM, kandidát pro běh 14.–15. 8.

## Aktualizace existujících dat (vlna)
- **Eurostat 2024 vlna `hlth_hlye` + `hlth_silc_17`** — viz HOT výše.
- SÚKL MR feed: `opendata.sukl.cz/soubory/NAHLASENE_UDAJE_MR/mr.zip` dnes 404
  (včera funkční — soubor zřejmě v regeneraci) → GYNIPRAL/ATOMINEX vlna
  z 10. 8. už zachycena včera; prověřit příště.
- ČSÚ: beze změny (Pohyb obyvatelstva 2Q → září; RI katalog JS-only) → NIC.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- MCP `hlidac_statu` není v této session připojen → kanál přeskočen (bez
  náhrady sekundárními zdroji, v souladu s citačními pravidly kanálu).

## PubMed sken (EDAT 11.–12. 8., ČR + healthcare/mortality/screening)
8 záznamů, prověřeno metadaty (PubMed MCP, dotaz 12. 8. 2026) — žádný se
systémovým dosahem pro ČR: MyPal4Kids ePRO platforma dětské onkologie (DOI
10.2196/80718, feasibility DE+CZ), kazuistika CIDP/rituximab (DOI
10.14712/18059694.2026.22), komentář ERC Guidelines 2025 (DOI
10.14712/18059694.2026.17), výročí LF UK Hradec Králové (DOI
10.14712/18059694.2026.16), kazuistika NREM parasomnie (DOI
10.2147/NSS.S619779), akvakultura tilápie (DOI 10.1155/anu/5390688),
ekotoxikologie zlatobýlu (DOI 10.1007/s11356-026-38109-9), SENTIX QoL po
sentinelové biopsii u ca hrdla děložního (DOI 10.1016/j.ygyno.2026.08.006 —
klinická studie, ne systémová metrika). → NIC.

## Doporučení pro routing fáze
- HOT (nový indikátor / vlna s implikací): **Eurostat výměna metriky zdravých
  let + 2024 vlna obou datasetů** — plně doloženo strojově (REST API + SDG
  Statistics Explained + ESMS metadata), přímá vazba na indikátory
  `nadeje_doziti_zdravi_65` a `subjektivni_zdravi`, mezera v korpusu
  (metrika subjektivního zdraví jako míra zdravých let není pokryta).
- HOT (aktuální dění): —
- WARM: OECD CVD brief (14. 8.); revize `clanek-nadeje-doziti-zdravi.html`
  na vlnu 2024 (7,7 → 8,0; vhodné pro noční rutinu / navazující audit);
  SÚKL mr.zip až bude feed opět dostupný; MZ TZ listing (nové URL); esipa.
- COLD: fallback-audit není potřeba.

## Poznámka k dostupnosti zdrojů (proxy, 12. 8.)
Dnes nefunkční: mzd.gov.cz tiskové listingy (404), esipa.cz (404),
opendata.sukl.cz mr.zip (404), oecd.org (403 trvale), zakonyprolidi.cz (403
trvale). Funkční: uzis.cz, nzip.cz, mzd.gov.cz/vestniky/, who.int,
nukib.gov.cz, szu.gov.cz, psp.cz (`historie.sqw?o=10&T=<n>`),
ec.europa.eu (Eurostat API + Statistics Explained + ESMS), PubMed MCP.
