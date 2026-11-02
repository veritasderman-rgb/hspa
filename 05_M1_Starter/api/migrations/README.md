# Migrace databáze dotazníků (Neon / Postgres)

SQL soubory se spouštějí postupně podle čísla, každý je idempotentní
(`create … if not exists`, `create or replace view`).

| Soubor | Obsah |
|---|---|
| `0001_dotaznik.sql` | tabulky `dotaznik_token` a `dotaznik_odpoved`, indexy |
| `0002_agregace.sql` | view `dotaznik_agregace` (sada, otázka, hodnota, počet) |

## Spuštění

```bash
# Zkouška: nejdřív na Neon větvi `test`, ne na produkční větvi
psql "$DATABASE_URL_TEST" -f api/migrations/0001_dotaznik.sql
psql "$DATABASE_URL_TEST" -f api/migrations/0002_agregace.sql

# Produkce (po schválení vydavatelem)
psql "$DATABASE_URL" -f api/migrations/0001_dotaznik.sql
psql "$DATABASE_URL" -f api/migrations/0002_agregace.sql
```

`DATABASE_URL` je connection string projektu `hspa-dotazniky` z Neon konzole
(Connection Details, pooled connection). Do repa se nikdy necommituje.

## Neon branch `test`

Pro zkoušky vytvořte v Neon projektu větev `test` (Branches, Create branch,
z `main`). Její connection string dejte do proměnné `DATABASE_URL_TEST` a
migrace i `scripts/dotaznik-token.js` zkoušejte nejdřív tam. Po zkoušce lze
větev smazat nebo resetovat z rodiče, produkční data se jí nedotknou.

## Soukromí

Tabulky neobsahují IP adresy ani jiné osobní údaje. Token se ukládá jen jako
sha256 hash. Rate limit odesílání běží v paměti funkce (hash IP se nikam
nezapisuje).
