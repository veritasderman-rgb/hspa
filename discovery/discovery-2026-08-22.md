# Discovery report — 2026-08-22

## Nové indikátory / datasety
- [ ] ÚZIS aktuality (uzis.cz, ověřeno 22. 8.): poslední věcná položka „Vysoké
  teploty a mortalita" (14. 8., zpracována 14. 8.), novější jsou jen pracovní
  inzeráty (3.–10. 8.) → NIC nového.
- ČSÚ (csu.gov.cz/aktuality, ověřeno 22. 8.): 20.–21. 8. jen Newsletter 34/2026
  a tiskový brífink ke školství → bez zdravotní relevance.
- Eurostat: žádná nová vlna zjištěna (SILC 2024/2025 zachycena 12.–13. 8.).
- OECD: oecd.org přes proxy dlouhodobě 403 → CVD policy brief zůstává
  **WARM carry-over**.

## Nové legislativní normy / sněmovní tisky
- PSP: sněmovna mezi schůzemi (tisky 235, 274 — další posun možný od
  7. 9. 2026); historie.sqw bez parametru vrací „tisk nenalezen" → beze změny.
- MZ ČR Věstník: č. 10/2026 (20. 8.) zpracován včera (SEAI 2026). Položky
  2–5 (HOC výzva 2026–2030, hodnocení kvality hematoonkologické péče,
  radiologické standardy, HPB onkochirurgie) zůstávají **WARM**.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- **NÚKIB, 21. 8. 2026**: vydána **Zpráva o stavu kybernetické bezpečnosti ČR
  za rok 2025** (schválena vládou, PDF ověřeno stažením 22. 8.):
  203 incidentů celkem (z 268 v 2024; text zprávy uvádí 268, Graf 1 zobrazuje
  267), z toho 2 velmi významné (2024: 1), 12 významných (2024: 18),
  189 méně významných; pokles tažen DDoS útoky hacktivistů (167 → 94).
  Kapitola Zdravotnictví: „Množství útoků se snížilo, ale závažnost možných
  následků přetrvává" — 1 vážný ransomwarový incident v ČR (Nemocnice
  Nymburk, začátek července 2025, přes týden omezené fungování některých
  oddělení, akutní péče neohrožena), dominance phishingu s mírným poklesem,
  výrazný nárůst vishingu (vč. AI hlasových klonů); případ Londýn (ransomware
  přispěl k úmrtí pacienta, >10 000 odložených vyšetření). Sektorové počty
  incidentů zpráva nepublikuje (ověřeno: naposledy ve zprávě za rok 2022 —
  29 incidentů ve zdravotnictví; zprávy za 2023, 2024 i 2025 mají sektorové
  kapitoly jen průzkumové). → **HOT (datová vlna k existujícímu článku
  a indikátoru kyberneticke_incidenty_zdravotnictvi)**
- MZ ČR, TZ 20. 8.: „Rada vlády schválila priority dotačního programu MZ pro
  rok 2027" — 415 mil. Kč na protidrogovou politiku 2027, 263 projektů /
  ~98 000 osob v 2025, hazard 68 mld Kč (+7 %), 220–275 tis. problémových
  hráčů, „Lex Kratom" v přípravě. Kvantitativní jádro (hazard) **už pokrývá**
  včerejší článek hazard-vs-adiktologicke-sluzby (ve frontě, 68 mld / čtvrt
  milionu / tisíce v léčbě) → WARM (bez nového úhlu nad rámec fronty).
- MZ ČR, TZ 21. 8.: memorandum MZ × MUNI (bez čísel) → WARM carry-over;
  letní dětská rekreace a kvalita vody ke koupání → minor.
- SÚKL (ověřeno 22. 8.): položky 18.–20. 8. (lékopis, Věstník SÚKL 8/2026,
  cizojazyčná šarže ADEMPAS) — bez systémového čísla → NIC.
- SZÚ (ověřeno 22. 8.): nejnovější 10. 8. (biomonitoring, zachyceno dřív) → NIC.
- WHO Europe: kanál dnes 404 přes proxy → neprůchozí.
- VZP: beze změny (JS obsah, nový dokument nezjistitelný).
- PubMed (dotaz 22. 8., EDAT 21.–22. 8., „Czech Republic" + health): 6 nových
  záznamů, žádný s HSPA prioritou → neprioritizováno.

## Aktualizace existujících dat (vlna)
- **NÚKIB Zpráva 2025** = nová roční vlna pro indikátor
  `kyberneticke_incidenty_zdravotnictvi` (řada v metodické kartě končí 2022;
  sektorový rozpad ani letos nevyšel → hodnota indikátoru se nemění, ale
  metodická karta a článek kyberneticka-bezpecnost-zdravotnictvi-2026
  vyžadují aktualizaci: článek tvrdí „souhrnná evidence [za 2025] ještě
  nebyla oficiálně zveřejněna" — od 21. 8. neplatí).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (dotaz 22. 8. 2026)
- VeKLEP: fulltext „zdravotnictví" vrací jen historické materiály (nic
  s posunem ze srpna 2026 v horních výsledcích); včerejší cílený dotaz
  (předkladatel MZ, 14.–22. 8.) byl prázdný → žádný nový.
  (hlidacstatu.cz dataset veklep, dotaz 22. 8. 2026)
- Registr smluv: `search_contracts` dnes opět vrací serverovou chybu →
  **kanál neprůchozí** (druhý den po sobě). Zítra opakovat.
- ÚOHS: fulltext „nemocnice OR zdravotnictví" — v horních výsledcích žádné
  rozhodnutí s právní mocí v roce 2026 → žádné nové.
  (hlidacstatu.cz, dotaz 22. 8. 2026)

## Doporučení pro routing fázi
- HOT (datová vlna): **NÚKIB Zpráva o stavu kybernetické bezpečnosti ČR za
  rok 2025** (vydána 21. 8.) → ARTICLE-REVISE
  clanek-kyberneticka-bezpecnost-zdravotnictvi-2026.html + metodická karta
  kyberneticke_incidenty_zdravotnictvi. Bonus: nezávislé ověření odhalilo
  v článku 2 neověřitelná tvrzení („ročenka za rok 2024 … necelé tři desítky
  incidentů ve zdravotnictví" — zpráva za 2024 sektorové počty neobsahuje),
  která revize opraví proti primárním PDF 2022–2025.
- WARM: HOC výzva 2026–2030 (Věstník 10/2026); memorandum MZ × MUNI;
  OECD CVD policy brief (403); dotační program závislostí 2027 (415 mil. Kč
  — možný budoucí doplněk článku o hazardu po jeho publikaci).
- COLD: fallback-audit není potřeba (HOT k dispozici).
