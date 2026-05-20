# Setup — účty a konfigurace distribučního systému

Checklist Fáze 0. Bez těchto kroků systém běží jen v režimu dry-run
(detekce + lokální generování), nepublikuje.

## 1. Účty na sociálních sítích

| Síť | Co zřídit | Poznámka |
|---|---|---|
| **Facebook** | Facebook **Page** (ne osobní profil) | Make.com publikuje přes Facebook Pages API |
| **Instagram** | **Business** účet propojený s FB Page | IG Graph API vyžaduje Business účet + propojení |
| **LinkedIn** | **Company Page** | Doporučeno firemní, ne osobní profil |
| **X** | Účet (stačí běžný) | Publikace přes Make.com modul X |

Všechny 4 musí být při stavbě scénáře připojené v Make.com (autorizace OAuth).

## 2. Notion

1. Vytvoř (nebo zvol) **workspace**.
2. [notion.so/my-integrations](https://notion.so/my-integrations) → **New integration** (interní) → zkopíruj **API key** → GitHub Secret `NOTION_API_KEY`.
3. Vytvoř prázdnou **stránku**, kam fronta patří. V `•••` → **Connections** → přidej integraci.
4. Zkopíruj **ID stránky** (32 znaků z URL).
5. Spusť setup databáze:
   ```bash
   NOTION_API_KEY=secret_… node social/notion/setup-database.js <parent-page-id>
   ```
6. Vypsané `NOTION_DATABASE_ID` → GitHub Secret.

## 3. Make.com

1. Účet na [make.com](https://make.com) — plán **Core** (10 000 operací/měs).
2. Nový scénář podle `social/docs/make-scenario.json` — Webhook → HMAC ověření → Router (4 sítě) → Error handler.
3. Připoj účty FB / IG / LinkedIn / X.
4. Zkopíruj URL webhooku → GitHub Secret `MAKE_WEBHOOK_URL`.
5. Zvol tajemství pro HMAC → GitHub Secret `MAKE_WEBHOOK_SECRET` (stejné nastav v ověřovacím kroku scénáře).

## 4. GitHub Secrets

V `Settings → Secrets and variables → Actions`:

| Secret | Zdroj |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `NOTION_API_KEY` | Notion integrace (krok 2) |
| `NOTION_DATABASE_ID` | výstup setup-database.js (krok 2) |
| `MAKE_WEBHOOK_URL` | Make.com webhook (krok 3) |
| `MAKE_WEBHOOK_SECRET` | zvolené tajemství (krok 3) |

## 5. Ověření

```bash
npm run social:detect          # detekce nových článků (bez klíčů)
npm run social:dry-run -- --latest   # generování do social/out/ (jen s ANTHROPIC_API_KEY)
```

Po nastavení secretů spusť workflow `Social · generování draftů` ručně
(GitHub → Actions → Run workflow) a zkontroluj drafty v Notionu.
