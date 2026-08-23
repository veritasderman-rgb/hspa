# Discovery report — 2026-08-23

## Nové indikátory / datasety
- [ ] ÚZIS aktuality (uzis.cz, ověřeno 23. 8.): poslední věcná položka stále
  „Vysoké teploty a mortalita" (14. 8.), novější jen pracovní inzeráty → NIC.
- NZIP data (nzip.cz/modul/datove-zpravodajstvi, ověřeno 23. 8.): nejnovější
  datová novinka zrcadlí ÚZIS aktualitu ze 14. 8. → NIC. Pozn.: přímá cesta
  `/data` už redirectuje/404 — funkční vstup je `/modul/datove-zpravodajstvi`.
- ČSÚ (csu.gov.cz/aktuality, ověřeno 23. 8.): poslední 21. 8. Newsletter
  34/2026, bez zdravotní relevance → NIC.
- Eurostat: whats-new stránka 404; ověřeno přes oficiální RSS
  (`api/dissemination/catalogue/rss/en/statistics-update.rss`): v okně
  20.–23. 8. **žádný `hlth_*` dataset**. Okrajově: updaty pracovních úrazů
  `HSW_*` (21. 8.) a regionální populace `DEMO_R_PJANAGGR3` (jmenovatele
  krajských měr) → NIC prioritního.
- OECD: oecd.org přes proxy dál 403; WebSearch fallback nic nového po 14. 8.
  → CVD policy brief (11. 8.) zůstává **WARM carry-over**.

## Nové legislativní normy / sněmovní tisky
- **PSP, sněmovní tisk 280/0**: „Zdravotně pojistné plány zdravotních
  pojišťoven na rok 2026 s vyjádřením vlády" — předkládá ministr
  zdravotnictví, rozeslán poslancům **14. 8. 2026** (usnesení vlády č. 355
  z 8. 6. 2026, čj. OVA 403/26). V žádném předchozím discovery reportu
  nefiguruje → **nezachycený nález, HOT**. Obsah (ověřeno stažením PDF
  příloh z psp.cz 23. 8.): plánované příjmy systému v. z. p. 555,8 mld. Kč,
  výdaje 570,8 mld. Kč, plánované saldo −14,9 mld. Kč (reálně −19 mld. Kč se
  zohledněním růstu závazků po splatnosti); zůstatky ZP klesnou z 39,2 na
  24,3 mld. Kč (−38 %); dvě ZP (VoZP ČR, ZP MV ČR) plánují závazky po
  splatnosti vůči poskytovatelům 5,3 mld. Kč; vláda: „výrazné riziko pro
  fungování systému zdravotnictví", při zachování trendu by závazky po
  splatnosti v letech 2027–2028 čekaly všechny ZP.
  URL: https://www.psp.cz/sqw/historie.sqw?o=10&t=280
- PSP jinak: žádný nový tisk od 22. 8. (poslední 284/0, 19. 8., nezdravotní);
  tisky 235, 274 bez posunu (sněmovna mezi schůzemi do 7. 9.).
- Sbírka zákonů: zakonyprolidi.cz `/cs/aktualne` 404, náhradní výpisy 403
  (bot-ochrana), e-Sbírka API vyžaduje klíč → **kanál dnes neprůchozí**;
  zítra opakovat.
- MZ ČR Věstník: beze změny (poslední č. 10/2026 z 20. 8., ověřeno přes
  WP API). Pozn.: existuje Věstník NIKEZ č. 1/2026 (10. 8.) — mimo okno,
  NIKEZ korpus zná; případný obsahový nález patří do samostatného posouzení.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- MZ ČR tiskové zprávy (mzd.gov.cz, ověřeno 23. 8.): nic po 21. 8. → NIC.
- VZP dokumenty: beze změny (Výroční zpráva 2025 PDF má Last-Modified
  15. 7. 2026, „neschváleno PSP"; ZPP 2027 nepublikován) → NIC.
- SÚKL (sukl.gov.cz, ověřeno 23. 8.): nic po 20. 8.; padělek Mounjaro
  (20. 8.) byl zachycen už 21. 8. jako minor. **Registr výpadků léčiv je po
  migraci na sukl.gov.cz nedostupný (404)** — provozní poznámka pro fetcher.
- SZÚ (szu.gov.cz, ověřeno 23. 8.): poslední 10. 8. (biomonitoring) → NIC.
- NÚKIB (nukib.gov.cz, ověřeno 23. 8.): nic novějšího než Zpráva 2025
  (21. 8., plně zpracována včera) → NIC.
- WHO Europe (dnes průchozí, HTTP 200): „More than a mother" (18. 8.) —
  analýza ženské mortality z WHO Mortality DB 2018–2022 (>3 500 mateřských
  úmrtí v regionu, ženy 45+ o ~14 % častěji „nedostatečně určená" příčina
  úmrtí); jen subregionální data, ČR bez vlastních čísel → **WARM**
  (možný budoucí úhel: kvalita kódování příčin smrti v ČR). Dále launch
  série „Data stories" (19. 8.) — meta-oznámení, průběžně sledovat.
- PubMed (dotaz 23. 8., EDAT 22.–23. 8., „Czech Republic" + health): 1 nový
  záznam (etická úvaha o alokaci orgánů, HEC Forum,
  DOI 10.1007/s10730-026-09612-w) → bez HSPA priority.

## Aktualizace existujících dat (vlna)
- Tisk 280 = oficiální vlna plánových dat v. z. p. 2026. Publikované články
  `deficit-pojisteni-2026` a `deficit-vzp-2026` (květen, odhad „12–19 mld.
  Kč") zůstávají v rozsahu pravdivé — oficiální plán −14,9/−19 mld. Kč
  odhad zpřesňuje, nevyvrací. Nevyžadují okamžitou opravu; nový článek je
  zpřesní křížovým odkazem.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (dotaz 23. 8. 2026)
- VeKLEP: dotaz zdravotnictví/zdravotní/léčiv se změnou od 16. 8. vrací
  jediný záznam — novelu občanského zákoníku (MPO, změna 17. 8.), bez
  zdravotní relevance → žádný nový. (hlidacstatu.cz dataset veklep)
- Registr smluv: **kanál opět průchozí** (po dvou dnech výpadku).
  Kategorie zdrav ≥ 10 mil. Kč od 16. 8.: 24 smluv, celkem ~2,06 mld. Kč.
  Největší: FN Olomouc — LP s obsahem pembrolizumabu, 571,6 mil. Kč,
  Merck Sharp & Dohme (podpis 17. 8., hlidacstatu.cz smlouva 39151986);
  VFN Praha — ibrutinib 469,7 mil. Kč (39164578); IKEM — antivirotika HCV
  287,2 mil. Kč (39167274). Rutinní centrové nákupy, korpus smluvní praxi
  pokrývá (k-index-nemocnic, penize-zdravotnictvi-smlouvy-nemocnic) →
  bez článku. Skryté ceny: 367 smluv od 16. 8. (dominantně rámcové nákupy
  FN Ostrava) — chronický vzor, ne nová kauza.
- ÚOHS: fulltext nemocnice/zdravotnictví/zdravotní pojišťovna s právní
  mocí od 1. 7. 2026: 0 výsledků → žádné nové. (hlidacstatu.cz)

## Doporučení pro routing fázi
- **HOT (aktuální dění s primárně-zdrojovou doložitelností): sněmovní tisk
  280 — ZPP 2026 s vyjádřením vlády** → ARTICLE-WRITE (rubrika
  financovani). Nejvyšší doložitelnost (PDF + XLSX přílohy na psp.cz),
  systémový dopad (10,82 mil. pojištěnců), mezera v korpusu (deficitní
  články z května stojí na odhadech, vládní hodnocení nikdo nepokrývá).
- WARM: WHO „More than a mother" (kódování příčin smrti); OECD CVD policy
  brief (403); HOC výzva 2026–2030 (Věstník 10/2026); dotační program
  závislostí 2027.
- COLD: fallback-audit není potřeba (HOT k dispozici). Kandidáti pro příště:
  alkohol-spotreba, ehealth (audit 17. 5.).
