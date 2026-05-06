# Plán: zprovoznění pravidelného načítání dat

**Cíl:** Spolehlivý, monitorovaný cron, který každý den natáhne čerstvá data ze 4 primárních zdrojů (ÚZIS, ČSÚ, OECD, Eurostat) a viditelně selže, když to nezvládne — místo dnešního tichého fallbacku na seed.

Tento plán doplňuje [`AUDIT_FUNKCNI_2026-05.md`](./AUDIT_FUNKCNI_2026-05.md), který popisuje současný stav: za celou existenci repa proběhl 1 auto-refresh commit (manuální `workflow_dispatch`), všechny indikátory zůstávají na `origin: seed`, fetchery vrací 404/400/timeout.

---

## Diagnóza v 5 bodech

1. **Cron je správně nakonfigurovaný** (`refresh.yml`, `0 6 * * *`), ale za 1 den existence repa neproběhl scheduled run ani jednou.
2. **Fetchery selhávají** na 4/4 zdrojích: ČSÚ DataStat HTTP 404, Eurostat HTTP 400, OECD/ÚZIS timeout.
3. **`transform.js:633`** má **tichý fallback**: `extracted ? 'live' : 'seed'`. Fail → seed → cron commitne diff jen v `generated_at`.
4. **Žádné monitorování:** `data: refresh` commit s 0 čerstvými indikátory vypadá stejně jako úspěšný fetch.
5. **CLAUDE.md a `o-projektu.html`** tvrdí, že data se aktualizují denně — to je editorial slib bez reality.

---

## Strategie ve 4 etapách

| Etapa | Trvání | Cíl | Riziko |
|---|---|---|---|
| **1. Viditelnost** | 1 den | Každé spuštění cronu produkuje **freshness report**, zveřejní se v Actions a (volitelně) commit message; pokud `live ratio < threshold`, workflow **failne** | nízké, žádná změna chování fetcherů |
| **2. Oprava endpointů** | 3–5 dní | Po jednom zdroji ověřit aktuální URL/dimenze, opravit `csu_datasets.js`, mapování OECD/Eurostat | střední, vyžaduje research API |
| **3. Resilience** | 1 týden | Multi-source fallback, structured logging, rate limit per source, dead-source detection | střední |
| **4. Monitoring** | průběžně | Auto-issue na 3 selhání po sobě, freshness badge v README, dashboard banner při zastaralých datech | nízké |

---

## Etapa 1: Viditelnost (1 den) — implementuji teď

### 1.1 Nový skript `ingest/verify-freshness.js`

Spustí se v `refresh.yml` jako poslední krok před commitem. Vrátí non-zero, pokud:
- `live_ratio < MIN_LIVE_RATIO` (default 0.3, tj. méně než 30 % indikátorů je `origin: live`)
- nebo se za 7 dní nepodařilo nikdy získat `live` pro konkrétní indikátor (warning, ne fatal)

**Výstup:** `data/freshness.json` — append-only log historie + summary aktuálního stavu. Tento soubor jde do gitu, takže máme audit trail.

### 1.2 Update `refresh.yml`

- Přidá krok `Verify freshness`
- Při selhání volání **nepushne** vadná data do `main` (chrání produkci)
- Vytvoří/aktualizuje GitHub issue `🚨 Data refresh failure` s diff fetcherů

### 1.3 Banner ve frontendu

Pokud `data/freshness.json#live_ratio < 0.5`, zobraz vrchní banner:
> ⚠️ Některé indikátory se za posledních 24 h nepodařilo aktualizovat ze zdrojů — vidíte poslední uložená čísla. [Detail →]

---

## Etapa 2: Oprava endpointů (3–5 dní)

### Status

| Zdroj | Status | Indikátorů live |
|---|---|---|
| Eurostat | ✅ **opraveno** | 2/3 (nadeje_doziti_zdravi_65, unmet_need_medical) |
| ČSÚ DataStat | ⚠️ čeká | 0 (HTTP 404 — runbook níže) |
| OECD | ⚠️ čeká | 0 (legacy 404, new endpoint 422 — runbook níže) |
| ÚZIS NRPZS | ❌ blokováno | 0 (timeout 8s+) |

### 2.0 ✅ Eurostat — opraveno

1. **`hlth_hlye` (nadeje_doziti_zdravi_65):** předchozí mapping `age=Y65, indic_he=F`. Eurostat dataset `hlth_hlye` ale **nemá dimenzi `age`** — věk je zakódován v `indic_he` (HLY_0=birth, HLY_50, HLY_65). Hodnota `F` byla zjevně připletená zkratka pro Female. **Oprava:** `indic_he=HLY_65`, `age` odstraněna.

2. **`hlth_silc_08` (unmet_need_medical):** předchozí mapping `quant_inc=TOTAL, reason=TOOEXP_FAR_WAIT`. Dimenze se jmenuje **`quantile`** (ne `quant_inc`), kód je **`TOOEFW`** („Too expensive or too far or waiting list"). **Oprava:** obojí.

**Smoke-test lokálně:**
```
[eurostat] done: 3/3 ok
[transform] wrote 58 indicators (2 from live cache, 56 from seed)
LIVE indicators: 2 / 58
  · nadeje_doziti_zdravi_65 = 7.7 let · 2023 · Eurostat
  · unmet_need_medical      = 0.3 %  · 2025 · Eurostat
```

Regresní test: `tests/eurostat-mapping.test.js` (5 testů) zachytí návrat starých kódů.

> Pozn.: `nadeje_doziti_total` má `primary.type=csu_datastat` — transform na něj neaplikuje Eurostat data, i když jsou v cachi. Multi-source fallback je úkol etapy 3.

### Runbook pro zbylé zdroje

### 2.1 ČSÚ DataStat (`csu.js`)

Současné URL: `https://data.csu.gov.cz/api/v1/data/DEM01-NADE` → **HTTP 404**.

**Co ověřit:**
- Aktuální DataStat API verze a struktura: https://csu.gov.cz/zakladni-informace-pro-pouziti-api-datastatu
- Je `DEM01-NADE` ještě platný název datasetu? (ČSÚ často refaktoruje katalogy.)
- Možná lépe použít **OData endpoint** místo DataStat: `https://vdb.csu.cz/vdbvo2/odata/...`
- Nebo **KROK databáze** (otevřená data v CSV): https://csu.gov.cz/produkty/databaze-krok-otevrena-data

**Postup:**
1. Manuálně v prohlížeči ověřit, který endpoint vrací JSON pro „naděje dožití při narození".
2. Aktualizovat `CSU_DATASETS` v `ingest/fetchers/csu_datasets.js`.
3. Spustit `node ingest/fetchers/csu.js` lokálně, ověřit cache file vznikne.
4. Smoke test: `npm run ingest && node -e "console.log(require('./data/indicators.json').indicators.filter(i => i.source.origin === 'live').length)"` musí být > 0.

### 2.2 Eurostat (`eurostat.js`)

Současné URL vrací **HTTP 400** — bad query params:
```
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_hlye?geo=CZ&geo=EU27_2020&sex=T&age=Y65&indic_he=F&format=JSON
```

Eurostat dimenze `indic_he=F` neexistuje pro `hlth_hlye`. Nutno se podívat do data dictionary daného datasetu:
- https://ec.europa.eu/eurostat/databrowser/view/hlth_hlye/default/table
- Klikem na „Filters" zjistit aktuální kombinace `indic_he`, `sex`, `age`, `unit`.

V Eurostatu je oblíbený trik: stáhnout structure metadata nejdřív (`?showOriginalLabels`). Většinou se ukáže, že místo `Y65` se používá `Y_GE65`, místo `F` (Female?) musí být něco jiného…

### 2.3 OECD SDMX-JSON (`oecd.js`)

OECD migruje z `stats.oecd.org/SDMX-JSON` na `data-explorer.oecd.org` (nový endpoint, jiná schéma). Současný `https://stats.oecd.org/SDMX-JSON/data/HEALTH_STAT/...` může být deprecated.

**Co ověřit:**
- https://data-explorer.oecd.org má nové API endpointy
- Možná lepší stáhnout celý **HEALTH_STAT** dataset jednorázově (~50 MB) a parsovat lokálně, místo per-indicator queries
- OECD též nabízí tematické cuty: HEALTH_PROC, HEALTH_REAC, HEALTH_LVNG…

### 2.4 ÚZIS NRPZS (`uzis_nrpzs.js`)

`https://nrpzs.uzis.cz/api/v1/mista-poskytovani` může vyžadovat rate limiting nebo specifický User-Agent. Aktuálně timeoutuje, ale neselhává s konkrétní chybou.

**Co ověřit:**
- Funguje endpoint vůbec? (curl s 30s timeout, prozkoumat odpověď)
- Vyžaduje API klíč nebo registraci? (zkontrolovat https://nrpzs.uzis.cz/api/doc)
- Pagination? — NRPZS má desítky tisíc poskytovatelů, jeden request může být obrovský

### 2.5 Acceptance kritérium pro etapu 2

Po opravě každého fetcheru:
- `npm run ingest` projde bez `FATAL`
- Aspoň 1 indikátor přejde z `origin: seed` na `origin: live`
- `data/freshness.json#live_count` se inkrementuje
- `verify-freshness.js` projde

---

## Etapa 3: Resilience (1 týden)

### 3.1 Multi-source priority

Současně každý indikátor má 1 primary + 1 fallback. Pro robustnost zavést priorit listu:

```js
// indicators/nadeje_doziti_total.json
{
  "data_source": {
    "primary": [
      { "type": "csu_datastat", "url": "..." },
      { "type": "eurostat", "dataset": "demo_mlexpec", "geo": "CZ" },
      { "type": "oecd", "dataset": "HEALTH_STAT.LFEXP" }
    ],
    "method": "first_success"  // nebo "average" pro cross-validation
  }
}
```

Transform pak iteruje po prioritách, dokud něco neprojde. Tím dosáhneme — i když se ČSÚ rozbije, OECD nás pokryje.

### 3.2 Per-source health tracking (`ingest/lib/source-health.js`)

Příklad výstupu:

```json
{
  "csu": { "consecutive_failures": 14, "last_success": "2026-04-22", "success_rate_30d": 0.0 },
  "oecd": { "consecutive_failures": 0, "last_success": "2026-05-06", "success_rate_30d": 0.97 }
}
```

Použití:
- Když `consecutive_failures > 7`, automaticky otevři issue „ČSÚ fetcher rozbitý 7+ dní"
- Když `success_rate_30d < 0.5`, zobraz banner „Tento zdroj je nestabilní"

### 3.3 Snapshot diffing

Kromě `data/snapshot-YYYYMMDD.json` (existuje) vytvářet **diff report** mezi snapshoty:
- Které indikátory se změnily o > 5 %?
- Které přešly mezi `good/warn/bad`?
- Auto-summary do commit message: `data: refresh — 3 indikátory změnily signál (kuractvi_denni warn→bad, ...)`

---

## Etapa 4: Monitoring (průběžně)

### 4.1 README badge

```markdown
![Data freshness](https://img.shields.io/endpoint?url=https://hspa-cesko.cz/api/freshness-badge)
```

Vercel edge function v `api/freshness-badge.json` čte `data/freshness.json` a vrací Shields.io schema:
- Zelený: live_ratio ≥ 0.8
- Žlutý: 0.5–0.8
- Červený: < 0.5

### 4.2 Auto-issue při selhání

```yaml
- name: Open issue on freshness failure
  if: failure() && github.event_name == 'schedule'
  uses: actions/github-script@v7
  with:
    script: |
      // Najít existující open issue se štítkem "freshness-alert"
      // Pokud existuje, přidat komentář; jinak vytvořit nový
```

### 4.3 Frontend banner

V `index.html` (a všech stránkách s mastheadem):

```html
<div id="staleness-banner" class="hidden">
  ⚠️ Data jsou starší než 7 dní. Některé fetchery selhávají.
  <a href="https://github.com/.../issues?label=freshness-alert">Detail →</a>
</div>
```

JS: `if (Date.now() - data.generated_at > 7 days) showBanner()`.

---

## Acceptance kritéria celého plánu

Po dokončení všech 4 etap:

- [ ] Cron zveřejní freshness report v každém runu
- [ ] Pokud `live_ratio < 30 %`, workflow failne a vznikne GitHub issue
- [ ] Aspoň 80 % indikátorů má `origin: live` během běžného provozu
- [ ] README ukazuje aktuální freshness badge
- [ ] Po 7 dnech bez `live` se na webu zobrazí stale-data banner
- [ ] CLAUDE.md a `o-projektu.html` jsou aktualizovány o reálný proces

---

## Co je teď v tomto PR (nízkorizikové)

V tomto commitu jsou pouze nástroje pro **viditelnost** (etapa 1) — neměním chování fetcherů, jen **odhalím**, kdy selhávají:

1. `05_M1_Starter/ingest/verify-freshness.js` — nový validační skript
2. `05_M1_Starter/data/freshness.json` — historie + aktuální stav (template)
3. `.github/workflows/refresh.yml` — přidán krok freshness check + auto-issue
4. `05_M1_Starter/package.json` — `npm run verify:freshness` script

**Etapy 2–4 si vyžadují souhlas a research aktuálních upstream API**, abychom zbytečně neměnili věci naslepo. Ty implementuji v dalších PR po schválení tohoto plánu.
