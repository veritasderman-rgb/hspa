# Zdravé Česko · Dashboard (M1 Starter)

Startovní balíček pro **milník M1** — refaktor mock prototypu na verzi napojenou na reálná API. Připraveno pro implementaci v Claude Code podle plánu v `04_Plan_napojeni_na_API/PLAN_API_INTEGRACE.md`.

## Co tento balíček obsahuje

| Komponenta | Stav | Poznámka |
|---|---|---|
| Adresářová struktura | ✅ Hotovo | viz strom níže |
| `package.json` + skripty | ✅ Hotovo | npm scripts pro ingest, serve, test |
| `index.html` refaktorován | ✅ Hotovo | místo inline dat fetchuje `data/indicators.json` |
| Datový kontrakt | ✅ Hotovo | `data/indicators.json` s 10 vzorovými indikátory |
| Metodické karty | ✅ Hotovo | 10 souborů v `indicators/` |
| Stub fetchery | ✅ Hotovo | `ingest/fetchers/*.js` s TODO komentáři pro M2–M4 |
| Transform | ✅ Hotovo | `ingest/transform.js` se signal logikou připravenou |
| Orchestrátor | ✅ Hotovo | `ingest/run.js` |
| GitHub Actions cron | ✅ Hotovo | `.github/workflows/refresh.yml` |
| Reálné fetchery (ÚZIS, ČSÚ, OECD) | ⏳ M2–M4 | toto je úkol pro Claude Code |
| Frontend interaktivita | ⏳ M7 | Reload tlačítko, tooltip, CSV export |

## Rychlý start

```bash
# Instalace
npm install

# Spuštění lokálního serveru (otevře dashboard se vzorovými daty)
npm run serve
# pak otevři http://localhost:8080

# Spuštění testů
npm test

# Spuštění ingest pipeline (ve fázi M1 jen napíše "TODO" do logu — implementace v M2)
npm run ingest
```

## Struktura repa

```
05_M1_Starter/
├── README.md                  ← jsi tu
├── package.json
├── .gitignore
├── index.html                 ← REFAKTOROVÁNO: fetchuje data/indicators.json
├── src/
│   └── app.js                 ← logika načítání + render
├── data/
│   ├── indicators.json        ← 10 vzorových indikátorů ve finálním kontraktu
│   └── regions.json           ← regionální data (kraje)
├── indicators/                ← metodické karty (1 soubor = 1 indikátor)
│   ├── nadeje_doziti_total.json
│   ├── nadeje_doziti_zdravi_65.json
│   ├── mortalita_inhosp_ami.json
│   ├── mortalita_inhosp_cmp.json
│   ├── spokojenost_pece.json
│   ├── lekari_per_1000.json
│   ├── sestry_per_1000.json
│   ├── vydaje_zdravotnictvi_hdp.json
│   ├── pm25_expozice.json
│   └── kuractvi_denni.json
├── ingest/
│   ├── config.js              ← URL endpointů, parametry
│   ├── run.js                 ← orchestrátor (M6)
│   ├── transform.js           ← výpočet signálů, harmonizace (M5)
│   ├── validate.js            ← validace datového kontraktu
│   ├── fetchers/              ← M2–M4
│   │   ├── uzis_nrpzs.js      (TODO M2)
│   │   ├── csu.js             (TODO M3)
│   │   ├── oecd.js            (TODO M4)
│   │   └── eurostat.js        (TODO M4)
│   └── cache/                 ← gitignored, raw responses
├── tests/
│   └── transform.test.js      ← test signal logiky
└── .github/workflows/
    └── refresh.yml            ← cron 6:00 UTC denně
```

## Datový kontrakt (data/indicators.json)

Frontend nesmí znát ÚZIS, OECD, ČSÚ. Načítá pouze `data/indicators.json`. Tvar viz `data/indicators.json` (10 vzorových záznamů s reálnými hodnotami z OECD Health at a Glance 2025).

## Stav implementace

| Milník | Stav | Co je hotové |
|---|---|---|
| M1 · setup + datový kontrakt | ✅ | struktura, schema, 10 vzorových indikátorů |
| M2 · ÚZIS NRPZS fetcher | ✅ | retry, cache, agregace kraj×obor, testy |
| M3 · ČSÚ DataStat fetcher | ✅ | primary→CSV fallback, JSON-stat parser |
| M4 · OECD/Eurostat fetchery | ✅ | SDMX-JSON, JSON-stat, mapping, computed mean |
| M5 · transform vrstva | ✅ | extraktory, signal, seed fallback, 12 testů |
| M6 · orchestrátor + cron | ✅ | snapshoty, GitHub Actions denně 06:00 UTC |
| M7 · frontend interaktivita | ✅ | reload, modal, CSV export, localStorage fallback, stale indicator |
| M8 · verifikace | ✅ | 55 testů, validate:data, npm run serve |
| M9 · Vercel setup | ✅ | `vercel.json` se security headers + cache |
| M10 · auto-deploy hook | ✅ | refresh.yml v `.github/workflows/` (root repa) |
| M11 · pre-deploy gate | ✅ | deploy-check.yml na každý PR |

## Deploy na Vercel

1. **Import repa**: vercel.com → Add New → Project → vyber `veritasderman-rgb/hspa`.
2. **Project Settings**:
   - Framework Preset: **Other**
   - Root Directory: **`05_M1_Starter`**
   - Build Command: _prázdné_ (statický web)
   - Output Directory: _prázdné_
   - Install Command: `npm ci` (volitelné — pro M5+ není potřeba běhové instalace)
3. **Environment Variables**: žádné nejsou potřeba pro statický web.
4. **Deploy** — Vercel automaticky detekuje `index.html` a publikuje statický web.

Po pushi do `main` Vercel automaticky rebuildne. GitHub Actions cron (`refresh.yml`) v 06:00 UTC commitne aktualizovaná data → Vercel rebuild → uživatel vidí čerstvá čísla.

### Datový tok

```
GitHub Actions cron 06:00 UTC
   ↓ (npm run ingest)
ingest/fetchers/* → ingest/cache/*
   ↓ (transform)
data/indicators.json + data/snapshot-YYYYMMDD.json
   ↓ (git commit + push)
Vercel auto-deploy
   ↓
CDN edge → uživatel
```

## Detailní plány

- `04_Plan_napojeni_na_API/PLAN_API_INTEGRACE.md` — milníky M1–M8
- `04_Plan_napojeni_na_API/PLAN_DEPLOY_VERCEL.md` — milníky M9–M12

---
*Verze 0.2.0 · M1–M11 hotovo · květen 2026*
