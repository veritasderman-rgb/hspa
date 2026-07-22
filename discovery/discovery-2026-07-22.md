# Discovery report — 2026-07-22

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md). Důraz běhu: **validace a ověření všech zdrojů** — každé číslo v případném článku muselo projít proti primárnímu strojově dohledatelnému zdroji.

## Nové indikátory / datasety
- [ ] (žádná nová vlna v datovém kontraktu od posledního běhu) — indikátor `hepatitida_bc_chronicka` má čerstvý **live** pull z ECDC Surveillance Atlas (`fetched_at: 2026-07-21`), hodnota 3,1 / 100 000 (2023), ale je **osiřelý** (žádný propojený článek).

## Nové legislativní normy / sněmovní tisky
- (bez nového nálezu v gesci MZ ČR za posledních 7 dní ověřeného primárně) — kontext: systém epidemiologické surveillance přenosných nemocí upravuje **vyhláška č. 389/2023 Sb.** (příloha č. 18), povinné hlášení virových hepatitid B a C.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- Reforma péče o duševní zdraví: MZ ČR plánuje +15 nových CDZ (207 mil. Kč, žádosti od ~poloviny září 2026, podpora do 2028) — zdroj: reformapsychiatrie.cz + zpravodajství 5/2026. **Téma je ale v korpusu už pokryté** (viz routing).

## Aktualizace existujících dat (vlna)
- ECDC Surveillance Atlas — chronická hepatitida B+C, ČR řada 2019–2023: 2,6 → 1,3 → 1,5 → 2,5 → **3,1** / 100 000 (pozn.: propad 2020 = pandemické podhlášení/omezené testování).
- SZÚ / ISIN (via NZIP): hepatitida C — **1 447 nahlášených případů v roce 2024** = nejvíc v období 2010–2025; celkem 15 763 (2010–2025); průměr 700–1 000/rok; ~600–800/rok vázáno na injekční užívání drog. Hepatitida B — 1 378 případů (2010–2025), vrchol 244 v roce 2010, dlouhodobě klesá.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- VeKLEP: (v tomto běhu neprocházeno přes MCP — kanál doplňkový; žádný ověřený nález nezařazen)
- Registr smluv: (bez zařazeného nálezu)
- ÚOHS: (bez zařazeného nálezu)

## Ověřené primární zdroje tohoto běhu
- **ECDC Surveillance Atlas of Infectious Diseases** — chronická hepatitida B+C, ČR (dataset 361, HealthTopic 26). Live v `data/indicators.json`.
- **SZÚ / ISIN — Informační systém infekčních nemocí** (přes NZIP, portál ÚZIS/MZ): počty hepatitid B a C v ČR, léčitelnost HCV, očkování.
- **WHO — Elimination of hepatitis by 2030** + Global Hepatitis Report 2024: cíle 90 % diagnostikovaných / 80 % léčených / −90 % nových nákaz / −65 % úmrtnosti (vs 2015); svět mimo trajektorii (~1,1 mil. úmrtí/rok vs cíl <0,5 mil.).
- **MZ ČR — vyhláška 389/2023 Sb.**: povinné hlášení virových hepatitid.

## Doporučení pro routing fáze
- HOT (nový indikátor): —
- HOT (aktuální dění): —
- WARM: osiřelý indikátor `hepatitida_bc_chronicka` s čerstvým live pullem → ideální kotva evergreen článku (WHO cíl eliminace 2030).
- COLD: kadenční pojistka (2 dny od posledního nového článku) + evergreen backlog `status: ready` → **EVERGREEN-WRITE**.
