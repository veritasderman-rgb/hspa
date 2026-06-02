# Discovery report — 2026-06-02

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-06-02 (úterý). Předchozí běh 2026-06-01 → FALLBACK-AUDIT
(`clanek-rezistence-antibiotik.html` flagged + stažen z produkce kvůli
chybnému benchmarku OECD 11,5 % vs primárně ověřený EARS-Net 22,5 %).

Prozkoumáno přímým WebFetch/WebSearch:
MZ ČR `mzd.gov.cz/tiskove-centrum/tiskove-zpravy/` + `mzd.gov.cz/vsechny-novinky/`,
ÚZIS `www.uzis.cz/index.php?pg=aktuality`, SZÚ `szu.gov.cz/aktuality/`,
ČSÚ `csu.gov.cz/aktuality`, WHO Europe news-room, WebSearch na novou
legislativu (Sbírka zákonů / zakonyprolidi — HTTP 403 přes WebFetch,
ověřeno přes WebSearch) a na cokoliv datované 31. 5.–2. 6. 2026.

## Závěr discovery: ŽÁDNÝ NOVÝ primárně-zdrojový trigger

K dnešnímu dni (úterý 2. 6. 2026) **nepřibyl žádný nový dataset, norma,
kauza ani nová datová vlna**, která by ještě nebyla zpracovaná předchozími
běhy. Nejnovější položky napříč zdroji jsou stále z 26.–1. 6. a všechny
jsou buď již zrouteované, nebo bez HSPA triggeru:

| Zdroj | Nejnovější položka | Stav |
|---|---|---|
| MZ ČR | 29. 5. JA HEROES + Rögnerová/IKEM | ✅ zrouteováno (clanek-ja-heroes-workforce-2026) |
| MZ ČR | 28. 5. centralizace vys. spec. péče; CDZ IV | ✅ pokryto stávajícím korpusem |
| MZ ČR | žádná položka 30. 5.–2. 6. (ověřeno na obou stránkách) | — |
| ÚZIS | 5. 5. prodloužení termínu výkazů 2025 | bez triggeru |
| SZÚ | 30. 5. Světový den bez tabáku; 29. 5. NAUTA 2025 | ✅ zrouteováno (revize clanek-koureni) |
| ČSÚ | 1. 6. nové logo, trh práce duben; 28. 5. dětská jména | bez HSPA-zdravotnického datasetu |
| WHO Europe | 1. 6. Uzbekistan childhood cancer; 27. 5. WNTD | bez ČR-specifického triggeru |
| Sbírka zákonů | žádná nová norma v gesci MZ datovaná po 30. 5. | bez triggeru |

→ Discovery prázdné → přepínám na **FALLBACK routine (audit)**.

## Fallback routing → priorita „riziko nepřesnosti" → onko-incidence

Uživatel explicitně zdůraznil „naprosto zásadní je validace a ověření
všech zdrojů". Startovní `npm run validate:all` i `npm test` (504/504)
jsou **zelené** (žádná publikační-hygiena chyba). Per fallback priorita:

1. Aktuální legislativa/kauza zastaralá → žádná
2. **Riziko nepřesnosti — články s konkrétními čísly** → **HIT**
3. Nejstarší `last_reviewed` (>30 dní) → žádný

Identifikoval jsem skupinu publikovaných (viditelných) článků, které
nikdy neprošly nezávislým auditem zdrojů (`published: null`,
`audit-status: null` v `articles.json`, žádný `last_reviewed` v HTML),
přitom obsahují tvrdá čísla vázaná na `origin: seed` indikátory:
`clanek-mamograf-rakovina-prsu`, `clanek-rakovina-tlusteho-streva`,
`clanek-cmp-iktova-centra` (date 2026-05-07).

### Nález (ZÁSADNÍ, primárně ověřeno) — crude vs age-standardised mismatch

Dva onko-incidenční indikátory dashboardu porovnávají **hrubou
(crude) míru** ČR proti **věkově standardizovanému (ASR)** benchmarku
OECD/EU a z toho odvozují `signal: bad`:

| Indikátor | Hodnota (crude) | Benchmark (ASR) | Signál | Teze v kartě / článku |
|---|---|---|---|---|
| `incidence_prsu` | 145 / 100 000 | OECD 90,7 · EU 113,4 | bad | „Česko je dramaticky nad oběma průměry" |
| `incidence_kolorektalni` | 73,5 / 100 000 | OECD 36,5 · EU 38,2 | bad | „Česko … dvojnásobné" |

Obě dvojice porušují **železné pravidlo #5** (číslo vs benchmark z různé
metodiky bez caveatu) — crude míra je systematicky vyšší než ASR kvůli
stárnoucí populaci a nelze ji srovnávat s ASR průměrem.

**Primární ověření (EU Country Cancer Profile 2025 — Czechia, JRC/OECD,
European Cancer Inequalities Registry; plný PDF stažen a strojově přečten
2. 6. 2026):**

- URL: <https://cancer-inequalities.jrc.ec.europa.eu/sites/default/files/docs/ccp2025/ec-oecd-cz-2024-1663-en.pdf>
- Doslovná citace: *„Estimated age-standardised cancer incidence in
  Czechia was similar to the EU average in 2022."* a *„rates were
  expected to be … below the EU averages for breast (10% lower) …
  and colorectal cancer among women (9% lower)"*, *„similar for
  colorectal cancer among men"*.
- **Věkově standardizované incidenční míry ČR vs EU27 (per 100 000, 2022):**
  - Prs (ženy): **ČR 133 vs EU 148** → ČR **o ~10 % NIŽŠÍ**
  - Kolorektum: muži **ČR 94 ≈ EU 93** (na úrovni), ženy **ČR 53 vs EU 58**
    (o 9 % nižší)
  - Celkem všechny nádory: ČR 565 vs EU 572 (mírně pod průměrem)

**Důsledky:**

1. Dashboardová teze „Česko je dramaticky/dvojnásobně NAD průměrem,
   signal bad" je u obou indikátorů **provably-false** — na srovnatelném
   (ASR) základě je ČR u prsu **pod** EU průměrem a u kolorektu **na/pod**
   ním. Vysoká crude míra je artefakt věkové struktury, ne reálné
   nadprůměrnosti.
2. Benchmarky 90,7 / 113,4 / 36,5 / 38,2 mají `origin: seed` a nebyly
   primárně ověřeny; jejich standardní populace (World vs European)
   neodpovídá crude hodnotám ČR.
3. Metodická karta `incidence_prsu` si navíc protiřečí — tvrdí
   „Standardizováno na evropskou ženskou populaci", ale hodnotu uvádí
   crude (144,5).

→ Per Phase 5 „zásadní problém": **oprava obou indikátorů na primárně
ověřený ASR základ (prs) / neutralizace signálu (kolorektum), oprava
metodických karet a databoxu článku, GitHub issue pro otevřené body.**

## Doporučení pro routing fáze

- **FALLBACK-AUDIT → `clanek-mamograf-rakovina-prsu.html` + indikátor
  `incidence_prsu`** (primární cíl, plně primárně ověřeno EU CCP 2025).
- **`incidence_kolorektalni`** — souběžná data-integrity oprava (stejný
  defekt), neutralizace falešného signálu + GitHub issue. Viz
  `routing-2026-06-02.md`.
