# Distribuční systém pro sociální sítě

Autonomní systém: detekce nově publikovaných článků → generování shrnutí
a grafiky → schválení v Notionu → publikace přímo do Bufferu na Facebook,
Instagram, LinkedIn a X.

## Tok dat

```
data/articles.json + clanek-*.html
        │  git diff vs. social/state/last-run.json
        ▼
  article-detector.js ──► Article (text, keyStats, indikátory)
        │
        ├─► summary-generator.js  → 4 shrnutí (Claude API)
        └─► image-generator.js    → 4 PNG (resvg)
        │
        ▼
  notion/queue-writer.js ──► Notion fronta (Status=Draft)
        │
        │  redakce zaškrtne „Schválit" + nastaví datum
        ▼
  notion/queue-reader.js ──► schválené řádky
        │
        ▼
  publisher/buffer-publisher.js ──► Buffer fronta ──► FB / IG / LinkedIn / X
```

## Orchestrace (GitHub Actions)

| Workflow | Kdy | Skript |
|---|---|---|
| `social-generate.yml` | neděle 18:00 CEST | `run-generate.js` |
| `social-publish.yml` | pondělí 07:00 CEST | `run-publish.js` + `weekly-report.js` |

## Příkazy

```bash
npm run social:detect             # vypíše nové / viditelné články
npm run social:dry-run -- --latest  # lokální průchod → social/out/ (neodesílá)
npm run social:notion-setup <page-id>  # jednorázové založení Notion fronty
npm run social:generate           # produkční generování (vyžaduje klíče)
npm run social:publish            # publikace schválených
npm run social:report             # týdenní souhrn
```

## Atribuce (UTM)

Každý odkaz na článek, který odchází na sítě, nese UTM (`config.js` → `utmUrl`):
`utm_source=<facebook|instagram|linkedin|x>`, `utm_medium=social`,
`utm_campaign=<pipeline>` — `notion-fronta` (tento systém), `rutina-buffer`
(denní rutina, PROMPT_ROUTINE.md blok B), `linkedin-tydenni` (týdenní LinkedIn draft).
Generátor dává modelu přesnou URL pro danou síť (Instagram bez odkazu, CTA „odkaz
v biu“), publisher ji dává i do náhledu (`media[link]`). GA4 pak ukazuje návštěvy ze sítí
v `sessionSource` / `sessionMedium` (`scripts/fetch-ga4-stats.js` → `data/analytics-public.json`,
`traffic_sources`), odkud je čte týdenní porada (PROMPT_PORADA.md). Idempotentní: URL,
která už `utm_source` má, se nemění.

**LinkedIn** je v generátoru připravený (`generators/prompts/linkedin.js`,
`BUFFER_PROFILE_LINKEDIN`), ale Buffer Free má strop 3 kanálů (FB, IG, X), takže
LinkedIn kanál připojený není a řádek LinkedIn v Notionu skončí jako „přeskočeno:
kanál nemá nakonfigurovaný BUFFER_PROFILE_…“. Týdenní LinkedIn text pro profil
vydavatele proto připravuje rutina jako Buffer **Idea** (ne post), viz PROMPT_ROUTINE.md
blok B krok 6.

## Konfigurace (env / GitHub Secrets)

`ANTHROPIC_API_KEY`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`,
`BUFFER_ACCESS_TOKEN` a `BUFFER_PROFILE_FACEBOOK` / `_INSTAGRAM` / `_LINKEDIN` / `_X`. Volitelně `SOCIAL_CLAUDE_MODEL`
(výchozí `claude-sonnet-4-6`). Lokálně přes `.env.local`.

Setup účtů a služeb krok za krokem: [`docs/setup-social-accounts.md`](docs/setup-social-accounts.md).

## Struktura

```
social/
├── config.js                   sdílená konfigurace
├── sources/article-detector.js detekce nových článků
├── generators/
│   ├── summary-generator.js     4 shrnutí přes Claude API
│   ├── prompts/                 system prompt + per-síť zadání
│   └── image-generator.js       4 PNG přes resvg
├── notion/                      fronta (setup, writer, reader, schema)
├── publisher/buffer-publisher.js  vložení do Buffer fronty (access token)
├── publisher/buffer-list-profiles.js  pomocník: výpis profile_id kanálů
├── reporting/weekly-report.js   týdenní souhrn
├── run-generate.js              orchestrátor — neděle
├── run-publish.js               orchestrátor — pondělí
├── dry-run.js                   lokální test
├── assets/fonts/                Source Serif 4 + Inter (render grafiky)
├── docs/                        setup-social-accounts.md
└── state/last-run.json          stav posledního běhu
```
