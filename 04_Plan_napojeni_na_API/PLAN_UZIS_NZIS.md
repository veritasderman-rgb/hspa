# Plán napojení dashboardu Zdravé Česko na ÚZIS NZIS

**Adresát:** Claude Code
**Cíl:** Nahradit seed hodnoty u relevantních indikátorů reálnými daty z ÚZIS NZIS s krajským rozpadem; přidat 5 nových indikátorů (kojenecká úmrtnost, ACSC hospitalizace, doba hospitalizace, NOR incidence onkologie, perinatální úmrtnost).
**Předpoklad:** dokončené M2–M11 (máme `lib/http`, `lib/csv`, `lib/cache`, transform vrstvu se seed fallbackem, frontend s regionální sekcí).
**Časový odhad:** 4 sezení po 60–90 min.

---

## 1 · Co dnes máme a čeho chceme dosáhnout

| Náš indikátor | Stávající stav | Co poskytne NZIS | Akce |
|---|---|---|---|
| `mortalita_30d_ami` → `mortalita_inhosp_ami` | seed → OECD HCQI fallback | NRH 1994–2024, krajský rozpad | upgrade + rename |
| `mortalita_30d_cmp` → `mortalita_inhosp_cmp` | seed → OECD HCQI fallback | NRH | upgrade + rename |
| `lekari_per_1000` | seed | NRZP (Pracovníci ve zdravotnictví) | upgrade |
| `sestry_per_1000` | seed | NRZP | upgrade |
| `screening_kolorektalni` | seed | NRPSV (M-NZIS-4 volitelně) | odložit |
| `screening_mamograficky` | seed | NRPSV (volitelně) | odložit |

**Nové indikátory:**

| ID | Oblast | Zdroj | Direction | Milník |
|---|---|---|---|---|
| `mortalita_kojenecka` | Výsledky | NRH (věk 0, úmrtí) | lower_is_better | M-NZIS-2 |
| `hospitalizace_acsc` | Procesy | NRH (preselectovaný MKN-10) | lower_is_better | M-NZIS-2 |
| `prumerna_doba_hosp` | Struktury | NRH agregát | context_dependent | M-NZIS-2 |
| `incidence_kolorektalni` | Výsledky | NOR | lower_is_better | M-NZIS-5 |
| `incidence_prsu` | Výsledky | NOR | lower_is_better | M-NZIS-5 |

**Plus** přepsat `data/regions.json` — mortalita a hospitalizace po krajích z NRH.

---

## 2 · Architektonické rozhodnutí

NZIS publikuje data dvěma způsoby:
- **přímé `.csv.gz` URL** na `data.mzcr.cz/data/distribuce/{id}/{filename}`
- **CKAN API** (`data.mzcr.cz/api/3/action/package_show?id={dataset}`) vrací metadata včetně aktuální URL distribuce

Generický fetcher bere z mappingu **přímou URL** (rychlejší) **nebo název CKAN datasetu** (odolnější vůči změně cesty). Když je distribuční URL neaktuální, druhý request vyhledá novou.

```
┌──────────────────────────────────────────┐
│  ingest/fetchers/uzis_nzis.js            │
│   1. resolve URL (mapping nebo CKAN)     │
│   2. fetch .csv.gz (s retry, gzip dec.)  │
│   3. parse CSV stream                    │
│   4. uložit raw do ingest/cache/         │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│  ingest/transform.js (M5)                │
│   extract*FromNzis(card.id)              │
│   — filtrace MKN-10 / věk / kraj         │
│   — agregace (úmrtnost = úmrtí/případy)  │
│   — krajský rozpad → regions.json        │
└──────────────────────────────────────────┘
```

---

## 3 · Datasety v rozsahu

| Klíč v mappingu | Dataset | Velikost (rozb.) |
|---|---|---|
| `nrh_dlouhodoba_rada` | NRH hospitalizace 1994–2024 | ~100 MB |
| `nrzp_pracovnici` | NRZP — pracovníci ve zdravotnictví | ~2 MB |
| `nor_incidence` | NOR — incidence onkologických onemocnění | ~10 MB |

Stabilní URL distribucí se hledají v M-NZIS-1 přes CKAN search; ukládají se do `ingest/mapping/uzis_codes.json`.

---

## 4 · Pořadí milníků (podle náročnosti)

1. **M-NZIS-1** — Generic fetcher (infrastruktura)
2. **M-NZIS-3** — NRZP (malý dataset, přímý mapping)
3. **M-NZIS-5** — NOR (single dataset, 2 indikátory)
4. **M-NZIS-2** — NRH (velký dataset, stream parsing, 4 indikátory + regions, rename)
5. **M-NZIS-4** — NRPSV (volitelně, jen pokud najdeme stabilní URL)

---

### M-NZIS-1 · Generic fetcher + CKAN resolver

**Definice "hotovo":** existuje `ingest/fetchers/uzis_nzis.js`, který stáhne libovolný `.csv.gz` z `data.mzcr.cz`, dekomprimuje, parsuje, uloží do cache.

**Komponenty:**

1. `ingest/lib/gzip.js` — wrapper nad `node:zlib` pro stream decode `.csv.gz`
2. `ingest/lib/ckan.js` — funkce `resolveDistributionUrl(datasetId)` → volá CKAN `package_show`, vrátí URL nejnovější distribuce
3. `ingest/fetchers/uzis_nzis.js`:
   - `fetchNzisDataset(key, mapping, opts)` — primary URL → fallback CKAN resolve → fetch → gunzip → parseCsv
   - `fetchUzisNzis(opts)` — orchestrátor přes všechny datasety v mappingu
4. `ingest/mapping/uzis_codes.json` — schema viz dokumentace v souboru
5. **Testy** (`tests/uzis_nzis.test.js`):
   - happy path s mock fetch + gunzip
   - cache hit
   - retry na 5xx (přes lib/http)
   - fallback z primary_url na CKAN resolver
   - parse CSV s českými diakritickými hlavičkami

**Riziko:** velikost NRH ~100 MB → držet **streamový parsing**. Pro testy mockovat malým fixture.

---

### M-NZIS-3 · NRZP napojení (lékaři + sestry)

**Definice "hotovo":** `lekari_per_1000` a `sestry_per_1000` čerpají z NRZP otevřených dat, krajský rozpad k dispozici.

1. CKAN resolve datasetu (`data.mzcr.cz/api/3/action/package_search?q=NRZP`)
2. Přidat klíč `nrzp_pracovnici` do `uzis_codes.json`
3. `extractFromNrzp(card, role)` v `transform.js`:
   - role: `"lekari"` (filtrace MEDDOCT) / `"sestry"` (NURS)
   - normalizace na "praktikující na 1 000 obyvatel" — vyžaduje populaci kraje (z ČSÚ → reuse `csu_demografie.json`)
4. Krajský rozpad
5. Testy

**Riziko:** definice "praktikující" se může lišit oproti OECD. Zachovat OECD fallback, dokumentovat v metodické kartě.

---

### M-NZIS-5 · NOR incidence onkologie

**Definice "hotovo":** přidány 2 nové indikátory `incidence_kolorektalni` a `incidence_prsu` s daty z NOR (Národní onkologický registr).

1. CKAN search NOR otevřených datasetů (z 64 onko datasetů na NZIP)
2. Mapping → `nor_incidence` v `uzis_codes.json`
3. Metodické karty `incidence_kolorektalni.json`, `incidence_prsu.json`
4. Seed entries v `data/indicators.json`
5. Extrakce v `transform.js` — `extractFromNor(card, mkn10_filter)`:
   - filter MKN-10 (C18–C20 pro kolorektální, C50 pro prsu)
   - výpočet incidence na 100 000 obyvatel (vyžaduje populaci ČSÚ)
6. Testy

**Riziko:** NOR může mít omezenou granularitu (jen národní agregát) — pak vynechat krajský rozpad.

---

### M-NZIS-2 · NRH napojení (4 indikátory + regions + rename)

**Definice "hotovo":**
- 4 indikátory čerpají z NRH dlouhodobé řady
- `regions.json` přepsán krajským rozpadem
- `mortalita_30d_ami` → `mortalita_inhosp_ami` (rename + metodická poznámka)
- `mortalita_30d_cmp` → `mortalita_inhosp_cmp` (rename + metodická poznámka)

**Implementace v `ingest/transform.js`:**

1. `extractFromNrh(indicatorId, observations, query)` s parametry:
   - `mkn10_filter` — pole prefixů MKN-10 (např. `["I21"]`)
   - `age_filter` — věkové skupiny (např. `["0"]` pro kojeneckou)
   - `metric` — `"mortality_rate"` / `"hospitalization_rate"` / `"avg_los"`
   - `aggregation` — `"national"` / `"by_region"`

2. Mapping pro 4 indikátory v `ingest/mapping/uzis_indicator_extracts.json`

3. **regions.json přepsání** — nová struktura per-indikátor:
```json
{
  "version": "1.0",
  "generated_at": "...",
  "indicators": {
    "mortalita_inhosp_ami": {
      "country_avg": 5.2,
      "regions": [{ "code": "CZ010", "name": "Praha", "value": 4.8 }, ...]
    }
  }
}
```

4. Frontend: dropdown pro výběr indikátoru v sekci Regiony.

5. Rename:
   - `indicators/mortalita_30d_ami.json` → `mortalita_inhosp_ami.json`
   - `indicators/mortalita_30d_cmp.json` → `mortalita_inhosp_cmp.json`
   - `data/indicators.json` — id v records
   - `ingest/mapping/oecd_codes.json` — klíče
   - testy

6. Metodické karty pro nové (`mortalita_kojenecka`, `hospitalizace_acsc`, `prumerna_doba_hosp`).

**Riziko:** "30denní mortalita" vs. "in-hospital úmrtnost" — NRH má jen druhou. Mitigace: rename + poznámka v metodické kartě.

---

### M-NZIS-4 · (volitelně) NRPSV — Screeningy a vakcinace

**Definice "hotovo":** `screening_kolorektalni`, `screening_mamograficky`, `vakcinace_chripka_65` čerpají z NRPSV.

**Riziko:** NRPSV neidentifikoval konkrétní open dataset — rešerše přes CKAN. Pokud nepodaří najít stabilní distribuci, **odložit** a zachovat seed/OECD fallback.

---

## 5 · Datový kontrakt — beze změny

`data/indicators.json` schema zůstává. Pole `source.granularity` může nově nést `"by_region"` nebo `"national"`.

`data/regions.json` rozšíření o per-indikátor breakdown (M-NZIS-2).

---

## 6 · Co NEdělat

1. **Necachuj rozbalené `.csv` v repu** — 100 MB. Cache v `ingest/cache/` (gitignored), commitovat jen agregované výstupy v `data/`.
2. **Neparsuj `.csv.gz` celé do paměti** — stream přes `node:zlib.createGunzip()` + `csv-parse` v stream módu. Jinak hrozí OOM.
3. **Necachuj NRH déle než 30 dní** — aktualizace ~ročně, ale klientský cache 24 h stačí pro minimalizaci traffiku.
4. **Nehardkóduj URL distribucí** v kódu — patří do `ingest/mapping/uzis_codes.json`. CKAN ID je stabilnější, primary URL je optimalizace.
5. **Nesměšuj "30denní" s "in-hospital" mortalitou** beze poznámky — metodicky to není totéž (rename řeší).

---

## 7 · Acceptance test (po M-NZIS-2)

```
1. npm run ingest — všechny fetchery proběhnou
   - ingest/cache/uzis_nrh_*.json existuje (cca ~30 MB raw, agregát menší)
   - ingest/cache/uzis_nrzp.json existuje
   - ingest/cache/uzis_nor.json existuje
2. npm run transform — produkuje validní data/indicators.json a data/regions.json
3. node ingest/validate.js — 18–20 indikátorů (15 stávajících + nové)
4. npm test — všechny testy passes
5. V prohlížeči (npm run serve):
   - Indikátory mají origin: "live" v source.origin (předtím seed)
   - Regions sekce ukazuje krajský rozpad mortality
   - Kojenecká úmrtnost a ACSC karta v oblasti Výsledky/Procesy
   - Onkologie: incidence kolorektálního a prsního karcinomu
6. Lighthouse: žádný regress v Performance
```

---

## 8 · Riziková analýza

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|---|---|---|---|
| URL distribucí na `data.mzcr.cz` se změní | střední | vysoký | CKAN resolver fallback |
| ÚZIS přidá ke stažení autentizaci | nízká | vysoký | dokumentovat v audit logu, fallback na seed |
| CSV schéma se změní (přejmenované sloupce) | nízká | střední | `expected_columns` validace + warning |
| Velikost NRH neakceptovatelná na Vercel CDN | nízká | nízký | CDN servuje jen agregát `data/indicators.json`, surová data zůstávají v cache |
| In-hospital ≠ 30d mortalita | jistota | střední | rename + metodická karta |
| NRPSV bez stabilní distribuce | střední | nízký | M-NZIS-4 odložit |

---

*Verze 1.0 · květen 2026 · Připraveno pro implementaci v Claude Code.*
