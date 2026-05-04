# Plán nasazení dashboardu Zdravé Česko na Vercel

**Adresát:** Claude Code
**Cíl:** Z lokálního prototypu v `05_M1_Starter/` udělat veřejný dashboard běžící na Vercel s automatickou denní aktualizací dat.
**Předpoklad:** dokončené milníky M1–M5 (statický `data/indicators.json` se naplní z `ingest/run.js`).
**Časový odhad:** 2–3 sezení po 60 min.

---

## 1 · Architektonické rozhodnutí

Na Vercelu poběží **čistě statický web** (žádný backend). Zdrojem pravdy zůstává repo:

```
GitHub repo (main)
  ├── 05_M1_Starter/index.html, src/, data/indicators.json   ──┐
  │                                                            │ auto-deploy hook
  └── .github/workflows/refresh.yml (daily cron)               ▼
                                                          Vercel Edge CDN
                                                       (statický web + JSON)

Cron flow:
  GitHub Actions (06:00 UTC) → node ingest/run.js → commit data/ → push → Vercel rebuild
```

**Proč ne Vercel Cron Jobs?**
- Bezplatný plán je pro statický web a GitHub Actions cron stačí.
- Vercel Cron + serverless funkce by vyžadovaly Vercel KV nebo Blob storage (placené, nebo limity).
- Source-of-truth v gitu znamená auditní historii datových snapshotů (a snadný rollback).

**Vyhodnotit znovu, až:** budou potřeba personalizované filtrace, autenticace nebo data větší než 5 MB.

---

## 2 · Volby k rozhodnutí před začátkem

| Volba | Doporučení | Alternativa |
|---|---|---|
| Project root v Vercelu | `05_M1_Starter/` (Root Directory v Project Settings) | přesunout obsah do `app/` v rootu repa |
| Framework Preset | `Other` (čistý HTML) | žádný — Vercel detekuje |
| Build Command | _prázdné_ | `npm run validate:data` jako pre-deploy gate |
| Output Directory | _prázdné_ (= root projektu) | — |
| Node verze | 22 (kvůli ingest skriptům v Actions, ne pro web) | — |
| Doména | `zdrave-cesko.vercel.app` zdarma → vlastní doména později | např. `zdravecesko.cz` přes registrátora |
| Preview deploys | povoleny pro PR | zakázat pro feature větve mimo `main` |

**Citlivá data:** žádný secret se ve frontendu neobjeví. Pokud bude Vercel volat externí API (nebude), tak přes Environment Variables, nikoli v kódu.

---

## 3 · Cílový stav repa po deploy přípravě

```
05_M1_Starter/
├── vercel.json                         ← NOVÝ: routes, headers, redirects
├── index.html
├── src/
├── data/
│   ├── indicators.json
│   ├── regions.json
│   └── snapshot-YYYYMMDD.json
├── indicators/
├── ingest/
└── .github/workflows/
    ├── refresh.yml                     ← cron (existuje od M6)
    └── deploy-check.yml                ← NOVÝ: validace na PR
```

---

## 4 · Implementační milníky pro Claude Code

### M9 · Vercel project setup + vercel.json
**Definice "hotovo":** projekt je propojený s repem, build prochází, `https://<projekt>.vercel.app/` zobrazuje dashboard se vzorovými daty.

**Prompt pro Claude Code:**
```
V 05_M1_Starter/ vytvoř vercel.json se základní konfigurací:
- žádný build (čistý static)
- security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- cache hlavičky:
  * /data/*.json     → Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400
  * /indicators/*    → Cache-Control: public, max-age=86400 (metodické karty se mění zřídka)
  * /src/*, /assets/ → Cache-Control: public, max-age=86400, immutable (pokud bude versioning)
  * default          → public, max-age=60
- redirects: / → /index.html (default), /api/health → 200 JSON pro liveness check (může být soubor /api/health.json)
- cleanUrls: true (volitelné)

Připrav krátký README sekci "Deploy" v 05_M1_Starter/README.md s kroky:
1. Import repa do Vercelu (Add New → Project)
2. Root Directory: 05_M1_Starter
3. Framework: Other, Build/Output: prázdné
4. Deploy

Ověř lokálně:
- npx vercel build (pokud máš Vercel CLI) NEBO
- npm run serve a klikni přes všechny sekce
```

---

### M10 · GitHub Actions cron + auto-deploy hook
**Definice "hotovo":** každé ráno v 06:00 UTC běží ingest, commitne aktualizovaná data, Vercel se sám rebuildne.

**Prompt pro Claude Code:**
```
Otevři .github/workflows/refresh.yml (existuje od M6).
Aktualizuj job:
- runs-on: ubuntu-latest
- node 22, cache npm
- spustí: npm ci && npm run ingest && npm run validate:data
- pokud se data/ změnilo:
  * git config + git add data/ + commit "data: refresh YYYY-MM-DD"
  * git push (uses: actions-go/push@... nebo plain `git push`)
- pokud ingest selže, vyhoď non-zero exit (Action failne, mailuje ownerovi)

Vercel se po pushi do main rebuildne automaticky (GitHub integrace).
Pokud preferuješ deploy hook (rychlejší), přidej v Vercel Project Settings →
Git → Deploy Hooks, vyrob URL, ulož do GitHub Secrets jako VERCEL_DEPLOY_HOOK
a do workflow přidej krok:
  curl -X POST "$VERCEL_DEPLOY_HOOK"

Otestuj: spusť workflow ručně přes "Run workflow" tlačítko v Actions tabu.
```

---

### M11 · Pre-deploy gate (validace na PR)
**Definice "hotovo":** každý PR proti main spustí validaci — testy + schema check; merge je zablokovaný, dokud check projde.

**Prompt pro Claude Code:**
```
Vytvoř .github/workflows/deploy-check.yml:
- trigger: pull_request paths: ['05_M1_Starter/**']
- node 22, npm ci
- npm test (transform.test, uzis_nrpzs.test, csu.test, oecd.test, eurostat.test, jsonstat.test, sdmx.test)
- npm run validate:data
- pokud cokoliv failne, check se označí červeně

V Vercel Project Settings → Git → "Ignored Build Step" lze nastavit
skript, který přeskočí build, pokud se v PR nezměnil obsah relevantní
pro frontend. Pro MVP nech tak — Vercel preview deploy je užitečný
pro každý PR.

Volitelně: v GitHub repo → Settings → Branches → main → Require status
checks to pass: vyber deploy-check workflow a Vercel Preview Comment.
```

---

### M12 · (Volitelně) Serverless funkce pro on-demand refresh
**Definice "hotovo":** existuje endpoint `/api/refresh` chráněný tokenem, který spustí ingest mimo cron.

Pro MVP **přeskočit**. Cron + manuál Run workflow stačí. Implementovat až bude potřeba reagovat na události (např. publikace nové verze NZIS).

**Pokud později potřeba — prompt:**
```
Vytvoř 05_M1_Starter/api/refresh.js (Vercel Serverless Function).
- POST endpoint
- ověří hlavičku Authorization: Bearer ${REFRESH_TOKEN} (z env var)
- spustí ingest/run.js (pozor: bez gitu, výsledek pošli do Vercel KV nebo Blob)
- vrátí 200 + summary

Limity: Vercel Serverless má timeout 10s (Hobby). Ingest může trvat déle —
v takovém případě jen vyhodit "ingest queued" a delegovat na separátní
worker (např. Inngest, Trigger.dev). Pro M12 stačí ručně spustit GitHub
Actions workflow přes API.
```

---

## 5 · Konkrétní podoba `vercel.json` (referenční)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "geolocation=(), microphone=(), camera=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" }
      ]
    },
    {
      "source": "/data/(.*).json",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" }
      ]
    },
    {
      "source": "/indicators/(.*).json",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=86400" }
      ]
    }
  ]
}
```

CSP `script-src` zatím povoluje `cdn.jsdelivr.net` (Chart.js). Jakmile bude knihovna self-hosted (`src/vendor/chart.umd.js`), CSP zpřísnit.

---

## 6 · Bezpečnost

- Žádné secrets ve frontendu. Žádné API klíče.
- Vercel Project Settings → Environment Variables: pouze `REFRESH_TOKEN` (volitelné, M12).
- GitHub Secrets pro Actions: `VERCEL_DEPLOY_HOOK` (pokud používáš), nic dalšího.
- Branch Protection na `main`: vyžadovat 1 review + průchod CI checků před merge.
- Vercel "Password Protection" pro Preview deploys: doporučeno, pokud preview může obsahovat experimentální data.
- Veškerá data jsou agregátní — žádné PII. CDN cache je bezpečný.

---

## 7 · Monitoring a observability

| Co sleduje | Kde | Jak |
|---|---|---|
| Build success/fail | Vercel dashboard | email notifikace (default) |
| Cron success/fail | GitHub Actions tab | email notifikace ownerovi |
| 4xx/5xx z CDN | Vercel Analytics (zdarma 1k events/měs.) | aktivovat v Project Settings |
| Real-User Metrics | Vercel Speed Insights | volitelné |
| Stárnutí dat | Frontend ukáže `generated_at` z `indicators.json` | součást M7 |
| Lighthouse score | manuálně po každém větším PR | cíl: Performance ≥ 90 |

---

## 8 · Rollback strategie

- **Nesprávná data po cronu:** `git revert <commit-sha>` v `data/` → Vercel rebuildne starší stav. Snapshoty `data/snapshot-YYYYMMDD.json` slouží jako audit, nepřepisují se.
- **Špatný frontend deploy:** Vercel dashboard → Deployments → klikni na předchozí úspěšný deploy → "Promote to Production". Žádný rebuild, jen přepnutí aliasu.
- **Vercel je dole:** kritické pro MVP není. Cache na CDN přežije ~1 h. Pro vyšší SLA: druhá hostingová cesta (GitHub Pages, Cloudflare Pages) jako warm standby.

---

## 9 · Hand-off checklist před spuštěním M9

- [ ] M1–M5 hotovo: `data/indicators.json` se generuje z `npm run ingest`
- [ ] `npm run validate:data` prochází
- [ ] `npm test` prochází (49 testů po M4)
- [ ] Repo má `main` jako default branch
- [ ] Owner má účet na Vercelu propojený s GitHubem
- [ ] Doména rozhodnuta (free `*.vercel.app` nebo vlastní)

---

## 10 · Co NEdělat (časté chyby)

1. **Necommituj `node_modules/`** — `.gitignore` to už řeší. Vercel si nainstaluje sám, pokud najde `package.json` v Root Directory.
2. **Nezapínej Build Command, dokud není potřeba** — pro statický web prázdné. Jakmile zapneš `npm run build`, Vercel bude čekat na výstupní adresář.
3. **Necachuj `index.html` agresivně** — pokud má hashed asset paths, cache stálého HTML způsobí, že uživatelé po deploy uvidí starou verzi. Default `max-age=60` v `vercel.json` je bezpečné.
4. **Nepřesouvej obsah `05_M1_Starter/` do rootu repa** kvůli Vercelu — stačí Root Directory v Project Settings. Přesun by rozbil ostatní složky balíčku.
5. **Nepouštěj cron častěji než 1× za den** pro veřejná česká API — viz `PLAN_API_INTEGRACE.md` sekce 8.
6. **Nezapomínej na CSP** — Chart.js z CDN vyžaduje `cdn.jsdelivr.net` v `script-src`. Self-host je čistší.

---

## 11 · Po deploy ověření (M9 acceptance test)

```
1. Otevři https://<projekt>.vercel.app v incognito okně.
2. DevTools → Network:
   - HTML 200, < 50 KB gzip
   - data/indicators.json 200, Cache-Control obsahuje s-maxage=3600
   - Žádné 4xx/5xx
3. Lighthouse audit:
   - Performance ≥ 90
   - Accessibility ≥ 95
   - Best Practices ≥ 95
4. DevTools → Application → Service Workers: žádný (zatím nepoužíváme)
5. Project Settings → Functions: prázdné (statický deploy)
6. Project Settings → Domains: alias nasazený
7. Vyzkoušej responsivitu (mobil/tablet/desktop) a všechny tři audience-vrstvy.
```

---

*Verze 1.0 · květen 2026 · Připraveno pro implementaci v Claude Code po dokončení M5.*
