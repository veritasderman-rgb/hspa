# Setup — účty a konfigurace distribučního systému

Checklist Fáze 0. Bez těchto kroků systém běží jen v režimu dry-run
(detekce + lokální generování), nepublikuje.

## 1. Účty na sociálních sítích

| Síť | Co zřídit | Poznámka |
|---|---|---|
| **Facebook** | Facebook **Page** (ne osobní profil) | Buffer publikuje přes připojený kanál |
| **Instagram** | **Business** účet propojený s FB Page | IG Graph API vyžaduje Business účet + propojení |
| **LinkedIn** | **Company Page** | Doporučeno firemní, ne osobní profil |
| **X** | Účet (stačí běžný) | Buffer kanál (volitelně) |

Všechny kanály musí být připojené v Bufferu (Buffer → Channels, autorizace OAuth).

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

## 3. Buffer

1. Účet na [buffer.com](https://buffer.com) a připojené kanály (FB Page, IG, příp. LinkedIn/X).
2. Buffer **Access Token** (Buffer → Settings/Developers → Access Token).
3. Připoj účty FB / IG / LinkedIn / X.
4. Zjisti `profile_id` kanálů: `BUFFER_ACCESS_TOKEN=… node social/publisher/buffer-list-profiles.js`.
5. Vlož token a profile_id do GitHub Secrets (viz tabulka níže).

## 4. GitHub Secrets

V `Settings → Secrets and variables → Actions`:

| Secret | Zdroj |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `NOTION_API_KEY` | Notion integrace (krok 2) |
| `NOTION_DATABASE_ID` | výstup setup-database.js (krok 2) |
| `BUFFER_ACCESS_TOKEN` | Buffer access token (krok 3) |
| `BUFFER_PROFILE_FACEBOOK` | profile_id FB stránky (krok 4) |
| `BUFFER_PROFILE_INSTAGRAM` | profile_id IG účtu (krok 4) |
| `BUFFER_PROFILE_LINKEDIN` | (volitelně) profile_id LinkedIn |
| `BUFFER_PROFILE_X` | (volitelně) profile_id X |

## 5. Ověření

```bash
npm run social:detect          # detekce nových článků (bez klíčů)
npm run social:dry-run -- --latest   # generování do social/out/ (jen s ANTHROPIC_API_KEY)
```

Po nastavení secretů spusť workflow `Social · generování draftů` ručně
(GitHub → Actions → Run workflow) a zkontroluj drafty v Notionu.
