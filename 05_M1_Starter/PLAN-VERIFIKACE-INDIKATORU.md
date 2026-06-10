# Plán: Přepnout co nejvíc indikátorů z „Ilustrativní" na „Ověřeno"

> **Účel dokumentu:** samostatný vstupní bod pro novou session. Obsahuje vše
> potřebné — nečti nic dalšího, dokud nezačneš na konkrétní dávce. Cílem je
> token-efektivita: tady je kontext, postup, příkazy a akceptační kritéria.
>
> **Vytvořeno:** 2026-06-01 (session „verifikace indikátorů").

---

## 0. TL;DR (přečti první)

- Stav (živý tracker §2): aktuálně **80 „Ilustrativní"** (žluté), 7 „Předběžné",
  42 „Ověřeno" (výchozí bylo 91 / 8 / 30).
- „Ilustrativní" = `source.origin: seed` bez explicitního `verification_status`.
- **Cíl:** co nejvíc seed indikátorů přepnout na **„Ověřeno"** (= `origin: live`
  z funkčního fetcheru **+** `verification_status: "verified"` v metodické kartě).
- **Hotový, ověřený vzor:** ECDC Atlas pipeline (29 indikátorů live+verified).
  Stejným způsobem postupuj pro další zdroje.
- **Pracuj po DÁVKÁCH podle zdroje** (Eurostat → OECD → ÚZIS → …), každá dávka
  = 1 PR. Nikdy nespouštěj `npm run transform` a necommituj jeho výstup celý
  (degraduje indikátory bez cache v sandboxu — viz §6 Pasti).

---

## 1. Jak funguje odznak verifikace (NEMĚŇ logiku, jen data)

Frontend helper `src/page-shared.js` → `resolveVerificationStatus(ind)`:

```
explicit verification_status ∈ {verified, preliminary, illustrative} → použij ho
jiný explicit (review-pending…) → 'preliminary'
bez explicit:  origin==='seed' → 'illustrative'
               origin==='live' → 'preliminary'
               jinak → null (žádný odznak)
```

**Důsledek (klíčový):** `verified` se NIKDY neodvodí automaticky. Indikátor je
„Ověřeno" **jen** když má v metodické kartě **explicitně** `verification_status:
"verified"`. Samotné `origin: live` dá jen „Předběžné".

→ **Recept na „Ověřeno":** (a) živá hodnota z funkčního fetcheru (`origin: live`)
**a zároveň** (b) `verification_status: "verified"` + `verified_at` v kartě
`indicators/{id}.json`. Transform pole `verification_status`/`verified_at` z karty
už přenáší do `data/indicators.json` (pass-through je zapojený).

---

## 2. Stav (živý tracker)

```
CELKEM indikátorů: 129

výchozí (2026-06-01):  origin seed 99 | live 30   ·  illustrative 91 | preliminary 8 | verified 30
po Dávce A (Eurostat): origin seed 93 | live 36   ·  illustrative 85 | preliminary 7 | verified 37
po Dávce B (Eurostat): origin seed 89 | live 40   ·  illustrative 81 | preliminary 7 | verified 41
po integritní opravě:  origin seed 88 | live 41   ·  illustrative 81 | preliminary 7 | verified 41
po Dávce C (OECD):     origin seed 87 | live 42   ·  illustrative 80 | preliminary 7 | verified 42
po Dávce D (OECD SDMX2): origin seed 84 | live 46  ·  illustrative ~74 | verified ~52
po Dávce E (SÚKL+Eurostat): origin seed 81 | live 49 · illustrative ~72 | verified ~58
po Dávce F (SÚKL fetcher fix + onko Eurostat): origin seed 83 | live 55 · illustrative 73 | preliminary 8 | verified 57
```

**Dávky D–E (2026-06-10, session „tender-edison"):**
- ✅ **Dávka D — OECD SDMX 2.0 (+5 verified, 1 origin fix):** `pyll_potencialne_ztracene_roky`
  (4564,4 / <75), `pracovnici_ltc_per_100_65plus` (2,1; OECD ⌀ 5,7), `vydaje_prevence_pct`
  (2,74 %; OECD ⌀ 3,2), `prezit_karcinom_prsu_5let` (81,4 %; CONCORD-3), a **korekce**
  `jednodenni_chirurgie_katarakta` (35,8 % → 98,7 %, signal bad→good — stará metrika
  nezachycovala ambulantní oční centra; článek přepsán). `absolventi_lekarstvi` seed→live.
  Fetcher rozšířen: key-path filtr, součtové dimenze, HTTP/2 fallback, benchmark jen z členů OECD.
- ✅ **Dávka E — SÚKL + Eurostat (+3 verified):** `lekarny_per_100k` (24,97; ZIP discovery +
  nativní unzip), `vypadky_leciv_aktivni` (1 378 aktivních přerušení + historický trend
  z přehrání kumulativního feedu), `mortalita_onkologicka` (Eurostat hlth_cd_asdr2, 250,4 / 100k
  ESP 2013; seed 180 byl neověřitelný).

**Blokované zdroje (ověřeno 2026-06-10, NEhádat hodnoty):**
- **ÚZIS / data.gov.cz** — CKAN API `data.gov.cz/api/3/action/*` vrací **404**
  (národní katalog přešel na NKOD2; funguje jen SPARQL endpoint + datové sady
  v `.7z`). `nrhzs_providers.js` postavený na starém CKAN API by selhal.
  ~34 ÚZIS seed indikátorů (NZIS 16, NRHZS 10, NRZP 4, NRH 2) zůstává seed —
  zlivnění vyžaduje přepis na NKOD2 SPARQL + 7z dekompresi (samostatná dávka).
- **ECDC HIV** (`hiv_nove_diagnozy`) — health topic Id 28/75, dataset
  `CURRENT.HIVAIDS.YEARLY` (Id 881) potvrzeny, ale measure-discovery endpointy
  (`GetMeasuresForDataset`, `GetIndicators`…) vrací **404** — web app Atlasu volá
  measure list přes POST/jiný service. Bez `measure_id` nelze přidat (nehádat).

**Otevřený drift k revizi (NEsladěno — riziko):** screeningové citace v
`clanek-centrum-onkologicke-prevence-mou-2026.html` (mamograf 60 %, cervix 52,3 %,
kolorektál 28 %) neodpovídají aktuálním verified indikátorům (54,5 / 65,7 / 31,1 %).
Rozdíl u cervixu je velký → pravděpodobně jiná kohorta/záběr, ne prostá zastaralost.
Vyžaduje ověření definice screening_* indikátorů proti ÚZIS NSC před sladěním článku.
Zachyceno nočním skenerem (`indicator-drift`).

> Integritní oprava (2026-06-01): `rezistence_antibiotik_ecoli` měl `verified`,
> ale `origin: seed`. Živý ECDC Atlas fetch (ESCCOL.FLUOROQUINOLONES) potvrdil
> shodnou hodnotu 19,2 % (2024) i celý trend → přepnuto na `origin: live`.

**Hotové dávky:**
- ✅ **Dávka A — Eurostat (2026-06-01):** +7 verified —
  `nadeje_doziti_total`, `nadeje_doziti_zdravi_65`, `unmet_need_medical`,
  `subjektivni_zdravi`, `mortalita_kardiovaskularni`, `pohybova_aktivita_dospeli`,
  `bmi_dospeli`. Opraven kód `hlth_silc_08` reason (TOOEFW→TXP_TFAR_WLIST), dataset
  BMI bm1b→bm1e, doplněny 4 nové mapping záznamy. EHIS-indikátory (bmi, pohyb) mají
  rok 2019 = poslední dostupná vlna EHIS.
- ✅ **Dávka B — Eurostat rozšíření (2026-06-01):** +4 verified —
  `mortalita_kojenecka` (demo_minfind), `nadeje_doziti_zeny` (demo_mlexpec sex=F),
  `sebevrazdy_per_100k` (hlth_cd_asdr2 icd10=X60-X84_Y870, standardizovaná),
  `obezita_prevalence` (hlth_ehis_bm1e BMI_GE30). Opraven `subjektivni_zdravi`
  název/definice 15+→16+ (Codex P2). **Vědomě ponecháno seed:** `kuractvi_denni`
  (karta má primárně SZÚ NAUTA, novější než EHIS 2019), `prevalence_diabetu`
  (NDR registr úplnější než self-report EHIS), `vydaje_zdravotnictvi_hdp`
  (Eurostat SHA nemá přímý %HDP unit).
- ✅ **Dávka C — OECD SDMX 2.0 (2026-06-01):** +1 verified —
  `absolventi_lekarstvi_per_100k` (16,4 / 100 000, 2023, OECD ⌀ 15,4;
  DSD_HEALTH_REAC_EMP@DF_GRAD). **Postaven nový fetcher** `oecd_sdmx2.js`
  na novém Data Explorer endpointu (legacy stats.oecd.org = 404) — reusable
  pro další OECD indikátory. Pozn.: ověřená hodnota obrátila narativ (seed 13
  „deficit/warn" → 16,4 „nadprůměr/good"; seed byl podhodnocený odhad).
  **Vědomě NEpřevedeno** (NEHÁDAT, viz §3 bod 2): `pracovnici_ltc`
  (dataflow vrací přes node/undici HTTP 500 i s Accept */* — cron běží na
  node, takže by stejně selhal; funguje jen přes curl/HTTP2 → potřebuje
  key-path query nebo jiný http klient), `alkohol_spotreba` (OECD 11,2 vs
  seed 14,4 — recorded vs WHO/národní), `pyll` (<75 vs <70 cutoff),
  `jednodenni_chirurgie_katarakta` (žádná CZE data), `vydaje_prevence_pct`
  (DSD_SHA obří dataset, nutný přesný klíč), `spokojenost_pece` (Gallup
  mimo strojní API). Klíč: OECD SDMX vrací 500 na Accept: application/json.

**Rozdělení 99 seed indikátorů podle zdroje** (= kde shánět živá data):

| Zdroj (source.name) | počet seed | proveditelnost živě |
|---|---:|---|
| ÚZIS · NZIS / NRH / NRZP / NOR / NRHZS (souhrn) | ~45 | ⚠️ fetchery pomalé/nejisté — ověř per dataset |
| OECD Health Statistics / hcqi / sdmx | ~8 | 🟡 OECD SDMX API žije, ale fetcher byl pomalý (timeout) — ověř |
| Eurostat (různé varianty názvu) | ~7 | ✅ **nejlepší** — JSON-stat API spolehlivé, vzor hotový |
| academic_survey / share / EHIS / szu_* | ~12 | ❌ většinou jednorázové přehledy bez API — necháš seed |
| sukl_* | ~5 | 🟡 SÚKL open data — ověř endpoint |
| ostatní jednotlivé (vzp, EEA, who_*, cra_register…) | ~22 | ❌/🟡 case-by-case |

**Rychlá výhra:** `nadeje_doziti_total` je `live` ale ne `verified` → stačí
doplnit explicit `verified` do karty (1 indikátor).

---

## 3. DOPORUČENÉ POŘADÍ DÁVEK (každá = 1 PR)

Řaď podle poměru hodnota/jistota. Začni nejjistějšími:

1. **Dávka A — Eurostat (~7 indikátorů)** ✅ HOTOVO 2026-06-01 (viz §2)
   - Přepnuto: `bmi_dospeli`, `pohybova_aktivita_dospeli`, `subjektivni_zdravi`,
     `mortalita_kardiovaskularni`, `nadeje_doziti_zdravi_65`, `unmet_need_medical`,
     `nadeje_doziti_total`.
   - Zbývá prověřit: `pyll_potencialne_ztracene_roky` (možná Eurostat hlth_cd_*).
   - Vzor: `ohrozeni_chudobou` (přepnuto na Eurostat `ilc_li02` v PR #467).
   - Postup: najdi dataset+filtry → přidej do `ingest/mapping/eurostat_codes.json`
     → ověř fetch živě → přepni kartu na `eurostat_jsonstat` + `verified`.

   - ✅ **Dávka B — Eurostat rozšíření (HOTOVO 2026-06-01):** `mortalita_kojenecka`,
     `nadeje_doziti_zeny`, `sebevrazdy_per_100k`, `obezita_prevalence` (viz §2).
   - ⏭️ **Vyčerpáno — diskontinuované/nevhodné Eurostat řady (NEHÁDAT):**
     `vydaje_zdravotnictvi_hdp` (hlth_sha11_hf nemá přímý %HDP unit),
     CT/MRI/lůžka/délka hospitalizace (`hlth_rs_equip`, `hlth_rs_bds`,
     `hlth_co_inpst` jsou „historical data", poslední 2020/2021 — frozen),
     `pyll_potencialne_ztracene_roky` (Eurostat `hlth_cd_apll` → 404),
     `kuractvi_denni`/`prevalence_diabetu` (EHIS 2019 by degradovalo recenci
     proti SZÚ NAUTA / NDR registru, který karty drží jako primární).

2. **OECD (~7 indikátorů)** 🔴 BLOKOVÁNO — fetcher potřebuje přepis
   - Kandidáti: `alkohol_spotreba`, `spokojenost_pece`, `vydaje_prevence_pct`,
     `absolventi_lekarstvi_per_100k`, `jednodenni_chirurgie_katarakta`,
     `pracovnici_ltc_per_100_65plus`, `pyll_potencialne_ztracene_roky`.
   - **Příčina seed (zjištěno 2026-06-01):** `ingest/fetchers/oecd.js` volá
     legacy `stats.oecd.org/SDMX-JSON` → **404 (endpoint zrušen)**. `lekari_per_1000`/
     `sestry_per_1000` už NEJSOU seed (mají ÚZIS NRZP zdroj).
   - **Nový endpoint OVĚŘEN funkční (připraveno k provedení v samostatném PR):**
     - Dataflows: `GET sdmx.oecd.org/public/rest/dataflow/OECD.ELS.HD/all/latest`
       (Accept: `application/vnd.sdmx.structure+json;version=1.0`) → 85 health dataflows.
     - Data: `GET sdmx.oecd.org/public/rest/data/OECD.ELS.HD,{DATAFLOW},1.0/all?startPeriod=2018&format=jsondata&dimensionAtObservation=AllDimensions`
       vrací SDMX-JSON 2.0 (`data.structures[0].dimensions.observation` + `data.dataSets[0].observations` klíčované `:`-separovanými indexy). `/all` funguje; `c[REF_AREA]=CZE` filtr vracel prázdno.
     - Relevantní dataflow ID: alkohol `DSD_HEALTH_LVNG@DF_HEALTH_LVNG_AC`,
       obezita/BW `DF_HEALTH_LVNG_BW`, tabák `DF_HEALTH_LVNG_TC`, PYLL
       `DSD_HEALTH_STAT@DF_PYLL`, vnímané zdraví `DF_PHS`, příčiny úmrtí `DF_COM`.
     - **Nutný přepis** `oecd.js` (legacy `parseSdmxJson` ≠ nový SDMX-JSON 2.0 formát)
       + nový mapping (dataflow + dimenze MEASURE/AGE/UNIT_MEASURE).
   - **⚠️ Metodická past (NEHÁDAT, ověř per indikátor):** OECD `alkohol_spotreba`
     pro CZE (15+, L_PS) = **11,2 L (2023)** — ale seed je **14,4 (2024)**. Velký
     rozdíl (OECD recorded consumption vs národní/WHO odhad vč. neregistrované
     spotřeby). Tj. swap NENÍ čistý — vyžaduje rozhodnutí o metodice + přepis
     patient_story. Stejnou kontrolu udělej u každého OECD kandidáta.

3. **Dávka C — ECDC rozšíření** 🟡 částečně
   - ✅ Integritní oprava `rezistence_antibiotik_ecoli` seed→live (viz §2).
   - ⚠️ HIV/STI: ECDC Atlas má HealthTopic HIV, datasety `CURRENT.HIVAIDS.YEARLY`
     (Id 881) a `2025.HIVAIDS.YEARLY` (Id 2048) — ověřeno 2026-06-10 přes
     `GetDatasets` (funguje, BOM → dekóduj `utf-8-sig`). **Measure-discovery přes
     GET stále 404** (ověřeny: `GetIndicators`, `GetIndicatorsForDataset`,
     `GetMeasures`, `GetMeasuresForDataset`, `GetIndicatorMeasuresForDataset`,
     `GetAtlasData` — všechny 404 HTML). Funkční je jen
     `GetMeasureResultsForTimeUnitAndGeoRegion?measureId=...` (tj. potřebuješ už
     znát measure_id). **Jediná cesta k measure_id**: otevřít atlas.ecdc.europa.eu
     v prohlížeči, dataset HIV, v devtools Network zachytit XHR (měření „HIV new
     diagnoses per 100 000") a z URL/payloadu vyčíst `measureId`. Pak přidat řádek
     do `ecdc_atlas_codes.json` (vzor §5) a fetcher už funguje. **NEHÁDAT
     measure_id.** Alternativa bez Atlasu: roční ECDC/WHO HIV surveillance report
     (PDF) — jen ruční hodnota, ne live.

4. **Dávka D — ÚZIS (~45 indikátorů)** ⚠️ největší, nejnáročnější
   - ÚZIS fetchery (`uzis_nrpzs`, `uzis_nzis`…) jsou pomalé a jejich endpointy
     nejisté. Diagnostikuj per dataset (`npm run ingest:nrpzs` apod.), ne najednou.
   - Pokud endpoint nefunguje → NEHÁDEJ hodnotu, nech seed + zaznamenej do
     `BACKLOG.md`. Mnoho ÚZIS dat je za autentizací / jen v PDF.

5. **Dávka E — SÚKL / ostatní** 🟡 case-by-case, nízká priorita.

> **academic_survey / share / EHIS / one-off zdroje:** většinou NELZE zlivnit
> (jednorázové studie bez API). Tyto ponech `illustrative` — je to korektní.
> Cíl NENÍ „0 ilustrativních za každou cenu", ale „ověřit vše, co MÁ živý zdroj".

---

## 4. POSTUP PRO JEDNU DÁVKU (krok za krokem)

```bash
# 0) čerstvá větev z main
git checkout main && git pull origin main
git checkout -b claude/verify-<zdroj>   # např. claude/verify-eurostat

cd 05_M1_Starter

# 1) pro každý kandidát: zjisti dataset/měřicí kód u zdroje, OVĚŘ hodnotu živě
#    (curl / fetch). Vzor pro Eurostat: query JSON-stat, vytáhni CZ + EU.
#    NIKDY nehádej hodnotu — žádný primární zdroj = necháš seed.

# 2) přidej mapping (eurostat_codes.json / oecd_codes.json / nový fetcher dle §5)

# 3) spusť JEN konkrétní fetcher (ne celý ingest), ověř cache:
npm run ingest:eurostat        # nebo příslušný; ověř "X/Y ok"

# 4) uprav metodickou kartu indicators/{id}.json:
#    - data_source.primary.type → správný typ (eurostat_jsonstat / oecd / ecdc_atlas)
#    - verification_status: "verified"  + verified_at: "RRRR-MM-DD"
#    - patient_story / benchmark_source: sladit s novou hodnotou (Codex to hlídá!)

# 5) CÍLENĚ zapiš hodnotu do data/indicators.json (NE celý transform —
#    viz §6 past). Použij ověřenou hodnotu z cache:
#    value, year, trend, benchmark{eu}, signal (computeSignal), origin:live,
#    verification_status:verified. Změň JEN dotčené indikátory.

# 6) validace + testy (MUSÍ projít):
npm run validate:all
npm test                        # očekávej 498+ pass

# 7) commit + push + PR (čeština, prefix feat/fix; trailer Claude Code)
```

**Akceptační kritéria dávky:**
- `npm run validate:all` zelené, `npm test` beze ztráty (498+ pass).
- `data/indicators.json` diff = JEN indikátory dané dávky (žádná degradace
  ostatních — over `git diff` zkontroluj, že se nezměnil `origin` u nesouvisejících).
- Každá nová „verified" hodnota je **primárně ověřená** (doloženo v PR popisu
  URL/datasetem). Žádné hádání.

---

## 5. Vzor: jak vypadá hotový živý+verified indikátor (ECDC Atlas)

- **Fetcher:** `ingest/fetchers/ecdc_atlas.js` (REST API → cache `ecdc_atlas_{id}.json`).
- **Mapping:** `ingest/mapping/ecdc_atlas_codes.json` (per-indikátor measure_id +
  `source_name`/`source_url`).
- **Transform:** `extractFromEcdcAtlas()` + větev `primaryType==='ecdc_atlas'` +
  `SOURCE_TYPE_TO_LABEL.ecdc_atlas` v `ingest/transform.js`.
- **Karta:** `indicators/rezistence_mrsa.json` — `data_source.primary.type:
  ecdc_atlas`, `verification_status: verified`, `verified_at`.
- **Per-indikátor zdroj** (Codex #464): fetcher zapisuje `source` do cache,
  transform ho čte (ne hardcoded label).

Pro nový zdroj (např. další OECD/Eurostat) buď rozšiř existující fetcher
(eurostat.js umí `filter_extra`), nebo zkopíruj vzor ecdc_atlas.js.

---

## 6. PASTI (poučení z minulé session — NEZOPAKUJ)

1. **NESPOUŠTĚJ `npm run transform` a necommituj jeho celý výstup.** V sandboxu
   chybí cache většiny zdrojů → transform přepíše živé indikátory zpět na seed
   (degradace). Codex to už dvakrát chytil. Místo toho **cíleně zapiš jen
   dotčené indikátory** do `data/indicators.json` z ověřené cache hodnoty.
   (Transform v reálném CI s plnou cache funguje správně — ale ty data commituješ
   ručně, ne přes sandbox transform.)

2. **Sladění karty.** Když změníš hodnotu indikátoru, sjednoť i `patient_story`
   a `benchmark_source` v kartě — jinak Codex nahlásí konfliktní čísla na detailu
   (stalo se u `nadeje_doziti_total`).

3. **JSON syntaxe.** Po každém ručním edit JSON: `python3 -c "import json;
   json.load(open('...'))"` PŘED commitem (jednou jsem commitnul dvojitou čárku).

4. **Benchmark jen když ověřený.** EU/OECD průměr doplň jen z primárního zdroje;
   jinak `benchmark: {}` + signal neutral (nehádej).

5. **Nehádej národní hodnotu.** Když fetcher/zdroj nedodá ČR hodnotu, nech seed
   a zaznamenej do BACKLOG.md. Železné pravidlo: co není z primárního strojově
   dohledatelného zdroje, nezůstává jako „verified".

6. **e2e check je zelený** (CI-driven baseline). Data-only PR e2e neovlivní.
   `check` (validate + unit) je blokující — musí být zelený.

---

## 7. Užitečné příkazy (rychlá reference)

```bash
# kolik je čeho (efektivní odznak):
python3 -c "
import json,collections
d=json.load(open('data/indicators.json'))['indicators']
def eff(i):
    v=i.get('verification_status')
    if v in ('verified','preliminary','illustrative'): return v
    if v: return 'preliminary'
    return 'illustrative' if i['source']['origin']=='seed' else 'preliminary'
print(dict(collections.Counter(eff(i) for i in d)))
"

# seznam seed indikátorů daného zdroje:
python3 -c "
import json
d=json.load(open('data/indicators.json'))['indicators']
[print(i['id'], i['source']['name'], i.get('value'), i.get('unit'))
 for i in d if i['source']['origin']=='seed' and 'eurostat' in i['source']['name'].lower()]
"

# ověř, že fetcher dodal cache:
ls ingest/cache/eurostat_*.json

# kontrola, že se nezdegradovaly cizí indikátory (po ručním zápisu):
git diff data/indicators.json | grep -E '^\+.*"origin"' | sort | uniq -c
```

---

## 8. Co NEDĚLAT

- Neměnit `resolveVerificationStatus` logiku (je správná).
- Necpát `verified` indikátorům bez živého ověřeného zdroje (to je podvod na čtenáři).
- Nedělat jednu obří dávku všech 91 — po zdrojích, recenzovatelné PR.
- Necommitovat sandbox `npm run transform` výstup.

---

## 9. Definice hotovo (celý projekt)

Realistický cíl: **Eurostat + OECD + ECDC rozšíření + rychlé výhry ≈ 20–30
indikátorů přepnutých na „Ověřeno"** napříč několika PR. ÚZIS dávka je bonus
(závisí na dostupnosti endpointů). Zbylé one-off zdroje (academic_survey, share…)
zůstanou korektně „Ilustrativní" — to je v pořádku a má se to tak nechat.

Po každé dávce aktualizuj čísla v §2 tohoto souboru (živý tracker postupu).
