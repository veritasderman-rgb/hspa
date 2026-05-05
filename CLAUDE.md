# Zdravé Česko — HSPA Dashboard · CLAUDE.md

Veřejný portál pro hodnocení výkonnosti zdravotního systému ČR podle metodiky OECD HSPA.
Inspirováno belgickým modelem **Healthy Belgium**.

## Aktivní kód

Veškerý vývoj probíhá v **`05_M1_Starter/`**. Ostatní adresáře jsou podkladové materiály:

| Adresář | Obsah |
|---|---|
| `01_Prototyp_Dashboard/` | Původní statický prototyp (zastaralý, jen pro referenci) |
| `02_Strategicky_dokument/` | Strategický plán DOCX |
| `03_Prezentace/` | Stakeholder prezentace PPTX |
| `04_Plan_napojeni_na_API/` | Plány a dokumentace milníků |
| `05_M1_Starter/` | **Aktivní dashboard** — veškerý kód je zde |

## Rychlý start

```bash
cd 05_M1_Starter
npm install
npm test          # 93 testů, vše musí projít
npm run serve     # http://localhost:8080
```

## Architektura

```
05_M1_Starter/
├── index.html              ← Vstupní bod, fetchuje data/indicators.json
├── src/
│   ├── app.js              ← Veškerá frontend logika (ES module)
│   └── styles.css          ← CSS včetně dark mode, print, a11y
├── data/
│   ├── indicators.json     ← Datový kontrakt (generovaný ingest pipeline)
│   └── regions.json        ← Krajská data (multi-dataset, v2 formát)
├── indicators/             ← Metodické karty (1 JSON = 1 indikátor, 40 souborů)
├── ingest/
│   ├── run.js              ← Orchestrátor (spouštěn GitHub Actions)
│   ├── transform.js        ← Harmonizace + výpočet signálů
│   ├── fetchers/           ← ÚZIS, ČSÚ, OECD, Eurostat fetchery
│   ├── lib/                ← HTTP, cache, JSON-stat, SDMX, CSV parsery
│   └── mapping/            ← Mapping tabulky (OECD kódy, ÚZIS kódy)
└── tests/                  ← 93 testů (node:test)
```

## Datový tok

```
GitHub Actions (denně 06:00 UTC)
  ↓ npm run ingest
ingest/fetchers/* → ingest/cache/*
  ↓ npm run transform
data/indicators.json + data/snapshot-YYYYMMDD.json
  ↓ git commit + push
Vercel auto-deploy → CDN → uživatel
```

## Datový kontrakt (`data/indicators.json`)

Frontend čte **pouze** tento soubor — nezná ÚZIS, ČSÚ ani OECD.

```json
{
  "version": "1.0",
  "generated_at": "2026-05-05T06:00:00Z",
  "indicators": [{
    "id": "nadeje_doziti_total",
    "name": "Naděje dožití při narození",
    "area": "Výsledky",           // Výsledky | Výstupy | Procesy | Struktury
    "domain": "Zdravotní stav",
    "subdomain": "Doba dožití",
    "value": 79.9,
    "unit": "let",
    "year": 2024,
    "trend": [{"year": 2022, "value": 79.5}, ...],
    "benchmark": {"oecd": 81.1, "eu": 80.9},
    "signal": "warn",             // good | warn | bad | neutral
    "direction": "higher_is_better",
    "source": {"name": "ČSÚ", "url": "...", "fetched_at": "...", "origin": "seed|live"},
    "method_card_url": "indicators/nadeje_doziti_total.json"
  }]
}
```

## Klíčové příkazy

```bash
npm test                  # Spustí všechny testy
npm run validate:data     # Validuje schéma data/indicators.json
npm run ingest            # Spustí celý ingest pipeline (seed v dev prostředí)
npm run transform         # Jen transform krok
npm run serve             # Lokální HTTP server
```

## Stav milníků

| Milník | Stav |
|---|---|
| M1 · Setup + datový kontrakt | ✅ |
| M2 · ÚZIS NRPZS fetcher | ✅ |
| M3 · ČSÚ DataStat fetcher | ✅ |
| M4 · OECD/Eurostat fetchery | ✅ |
| M5 · Transform vrstva | ✅ |
| M6 · Orchestrátor + cron | ✅ |
| M7 · Frontend interaktivita | ✅ |
| M8 · Verifikace (93 testů) | ✅ |
| M9 · Vercel setup | ✅ |
| M10 · Auto-deploy hook | ✅ |
| M11 · Pre-deploy gate | ✅ |

## Pravidla pro rozšiřování

### Přidat nový indikátor
1. Vytvoř `indicators/{id}.json` (metodická karta) — viz existující karty pro strukturu
2. Přidej seed záznam do `data/indicators.json` (pro dev bez síťového přístupu)
3. Případně přidej mapping do `ingest/mapping/oecd_codes.json` nebo `uzis_codes.json`
4. Spusť `npm test` — test "Každý indikátor v data/indicators.json má odpovídající metodickou kartu" musí projít

### Přidat nový fetcher
1. Vytvoř `ingest/fetchers/{source}.js` — viz existující fetchery
2. Exportuj `async function fetch{Source}(opts)` s parametrem `force`
3. Zaregistruj v `ingest/run.js`
4. Napiš test do `tests/{source}.test.js`

## Signal logika

```javascript
computeSignal(value, benchmark, direction, thresholds)
// direction: 'higher_is_better' | 'lower_is_better' | 'context_dependent'
// thresholds: { good: 2, warn: 5 }  (v %)
// good:    adjusted diff > +good %
// warn:    -warn % ≤ adjusted diff ≤ +good %
// bad:     adjusted diff < -warn %
// neutral: chybí benchmark nebo direction = context_dependent
```

## Deploy (Vercel)

- **Root Directory:** `05_M1_Starter`
- **Framework Preset:** Other (statický web)
- **Build Command:** *(prázdné)*
- Po každém push do `main` Vercel automaticky rebuildne
- GitHub Actions cron (06:00 UTC) commituje čerstvá data → Vercel rebuild

## Bezpečnostní pravidla

- Všechna data jsou agregovaná — žádné PII
- `User-Agent: ZdraveCesko-HSPA/1.0` ve všech HTTP požadavcích
- Cron maximálně jednou denně (rate limit ÚZIS)
- Žádné API klíče — vše veřejné zdroje

## Soubory pro ignorování při hledání

- `ingest/cache/` — gitignored raw odpovědi ze zdrojů
- `node_modules/`
- `*.lock`
