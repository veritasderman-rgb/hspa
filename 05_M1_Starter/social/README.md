# Distribuční systém pro sociální sítě

Autonomní systém: detekce nově publikovaných článků → generování shrnutí
a grafiky → schválení v Notionu → publikace přes Make.com na Facebook,
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
  publisher/webhook-publisher.js ──► Make.com ──► FB / IG / LinkedIn / X
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

## Konfigurace (env / GitHub Secrets)

`ANTHROPIC_API_KEY`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`,
`MAKE_WEBHOOK_URL`, `MAKE_WEBHOOK_SECRET`. Volitelně `SOCIAL_CLAUDE_MODEL`
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
├── publisher/webhook-publisher.js  odeslání na Make.com (HMAC)
├── reporting/weekly-report.js   týdenní souhrn
├── run-generate.js              orchestrátor — neděle
├── run-publish.js               orchestrátor — pondělí
├── dry-run.js                   lokální test
├── assets/fonts/                Source Serif 4 + Inter (render grafiky)
├── docs/                        make-scenario.json, setup-social-accounts.md
└── state/last-run.json          stav posledního běhu
```
