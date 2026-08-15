# Discovery report — 2026-08-15

> Běh denní rutiny (PROMPT_DAILY_ROUTINE.md). Důraz session: **validace a ověření všech
> zdrojů**. Dostupnost zdrojů z prostředí: uzis.cz ✅, csu.gov.cz aktuality ✅,
> who.int/europe ✅, Eurostat API ✅, Hlídač státu (MCP) ✅ — dnes poprvé od 11. 8. připojen,
> odok.gov.cz (VeKLEP dokumenty) ✅ (curl s browser UA); mzd.gov.cz ❌ (404),
> sukl.cz ❌ (503), zakonyprolidi.cz ❌ (403). Nedostupné zdroje uvedeny explicitně,
> nic z nich necitováno.

## Nové indikátory / datasety
- [ ] (žádný nový machine-verifiable indikátor k okamžitému zařazení)
- ÚZIS aktuality: od včerejška nic nového (poslední aid=8757 „Vysoké teploty a mortalita",
  14. 8. 2026 — zpracováno včerejším během, článek vedra-umrtnost-data).
- ČSÚ aktuality: srpen 2026 bez demografické/zdravotní publikace (jen zemědělství,
  druhotné suroviny, magazín).

## Nové legislativní normy / sněmovní tisky
- **HOT — Novela zákona č. 258/2000 Sb., o ochraně veřejného zdraví (VeKLEP PID
  ALBSDUUFQ5OR, čj. MZDR 15867/2026, čj. OVA 618/26)** — očkování dospělých na žádost
  nově smí indikovat a provádět **lékaři všech odborností, zubní lékaři a farmaceuti**
  (nový § 47aa). Připomínkové řízení 11. 6.–25. 6. 2026; **10. 8. 2026 vložena „Verze
  pro jednání vlády" s vypořádáním připomínek** (stav „7 – zařazeno do evidence",
  poslední úprava 11. 8.). Jde na vládu s **rozporem s Českou lékařskou komorou**
  (připomínka NEAKCEPTOVÁNO, „ROZPOR!!!" — vp_ALBSDWN9TWGG.docx). ✅ ověřeno:
  hlidacstatu.cz (dotaz `search_veklep_legislation`, 15. 8. 2026) + plné znění
  materiálu, důvodové zprávy a vypořádání připomínek staženo z odok.gov.cz.
- **WARM — Novela zákona č. 325/2021 Sb., o elektronizaci zdravotnictví (VeKLEP PID
  ALBSDVLDLD32, čj. MZDR 18368/2026-1/LEG)** — povinná e-žádanka, elektronická
  dokumentace, 1. fáze implementace EHDS. Připomínkové řízení skončilo 3. 8. 2026,
  zásadní připomínky ČLK, DIA, MV, MF, ÚOOÚ, komor a krajů; vypořádání zatím
  nezveřejněno. Korpus téma částečně kryje (novela-elektronizace-2026,
  digi-* série, ehds-*) → kandidát na budoucí ARTICLE-REVISE/WRITE až po posunu fáze.
- Sbírka zákonů (zakonyprolidi.cz) nedosažitelná (403) — bez nálezu z dosažitelných zdrojů.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- WHO Europe news-room: Ukrajina (sklad WHO zasažen), GIS roadmap (10. 8.), kojení
  (5. 8.), AMR photo story (6. 8.) — bez přímé české implikace vyžadující článek dnes.

## Aktualizace existujících dat (vlna)
- **Eurostat `demo_r_mwk_ts`** (týdenní zemřelí): CZ stále poslední týden **2026-W27**
  (2 299, provizorní), refresh 14. 8. 2026 — beze změny proti včerejšku, nová vlna
  nepřišla. ✅ ověřeno živě přes dissemination API (15. 8. 2026).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- **VeKLEP**: novela 258/2000 Sb. (posun fáze 10. 8., viz výše — HOT);
  novela 325/2021 Sb. (připomínkové řízení ukončeno 3. 8. — WARM);
  vyhláška o Programu statistických zjišťování 2027 (ČSÚ, připomínky do 12. 8. — bez
  zdravotní implikace). Dotaz: `search_veklep_legislation`, 15. 8. 2026.
- **Registr smluv** (kategorie zdravotnictví, ≥ 50 mil. Kč, publikováno 8.–15. 8.):
  FN Motol — dodatek č. 7 „Rekonstrukce LDN" (prodloužení termínu, 297,2 mil. Kč,
  Metrostav CZ, podepsáno 12. 8., hlidacstatu.cz/detail/39123602); VFN Praha — nákup
  IBRUTINIB 156,6 mil. Kč (Janssen-Cilag, 11. 8., detail/39130934); FN Brno — FARICIMAB
  100,4 mil. Kč (ROCHE, 12. 8., detail/39090078); FN Hradec Králové — pojištění
  odpovědnosti 64,3 mil. Kč (Pojišťovna VZP, 12. 8., detail/39111078); FN Motol —
  výpočetní cluster onkologického centra 64,3 mil. Kč (M Computers, 13. 8.,
  detail/39126646). Běžné velkoobjemové nákupy — žádná anomálie (skrytá cena /
  těsně pod limitem ZZVZ) nezaznamenána. Dotaz: `search_contracts`, 15. 8. 2026.
- **ÚOHS**: žádné nové rozhodnutí s účastí nemocnic/ZP od 1. 8. 2026
  (dotaz `search_uohs_decisions`, 15. 8. 2026).

## Ověřené primární zdroje v tomto běhu (checklist A/B)
- **VeKLEP materiál ALBSDUUFQ5OR** — plné znění návrhu zákona (ma_ALBSDWN9TWGG.docx),
  důvodová zpráva (zd_…), platné znění se změnami (pz_…), vypořádání připomínek (vp_…)
  staženy z odok.gov.cz 15. 8. 2026 a plně přečteny. Klíčová čísla z důvodové zprávy:
  hrazená očkování proti chřipce 2024 = **642 172** výkonů / 354 909 223,62 Kč;
  2025 = **659 286** / 398 002 929,90 Kč; modelový scénář +10 % = 725 215 očkování,
  ~437,8 mil. Kč (+39,8 mil. Kč). Nejvíce očkování ve skupině 65–79 let.
- **Dashboard indikátory** (data/indicators.json): vakcinace_chripka_65 = 24,5 %
  (sezóna 2024/25, ÚZIS/NZIS; OECD 47 %, EU 49 %, WHO/ECDC cíl ≥ 75 %);
  vakcinace_pneumokok_65 = 5,5 % (2023); farmaceuti_per_100k = 76 (2023, OECD 86);
  lekarny_per_100k = 25,01 (2026, live).

## Doporučení pro routing fáze
- **HOT (aktuální dění / legislativa): novela 258/2000 Sb. — očkování dospělých
  u všech lékařů, zubařů a farmaceutů.** Čerstvý posun fáze (10.–11. 8.), plně
  primárně doložitelné (VeKLEP dokumenty + vlastní čísla důvodové zprávy + dashboard
  indikátory), otevřený rozpor s ČLK = jasný příběh, mezera v korpusu (vakcinace-*
  články řeší proočkovanost, farmaceuti-pracovni-sila kapacity lékáren; o novele nic).
- WARM: novela elektronizace 325/2021 Sb. (sledovat vypořádání připomínek).
- COLD: evergreen backlog prázdný (0× `status: ready`).
