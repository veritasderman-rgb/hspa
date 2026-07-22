# Poznámky a nálezy z tvorby exportu

## Nálezy v repu (mimo rozsah knihy, ale hlášeno)

### 1. Neuzavřený HTML komentář — `clanek-onkologicky-koordinator-2026.html` [OPRAVENO]
Audit blok v hlavičce (`<!--` na ř. 6) neměl uzavírací `-->`. Důsledek: prohlížeč
i parser považovaly **celý zbytek dokumentu za komentář** — článek se nezobrazoval
(ani na živém webu) a nešel převést do knihy. **Opraveno** vložením `-->` za audit
blok. Kapitola (Díl IV, `verified`) se nyní renderuje i převádí správně.
→ Doporučení: ověřit na produkci a zvážit lint na vyváženost `<!-- -->`.

### 2. Neuzavřený HTML komentář — `clanek-pyll.html` [NEOPRAVENO]
Stejná vada (`<!--` na ř. 95 bez `-->`). Článek je **nepublikovaný draft**
(`published` nenastaveno, `audit-status: partial`), **není součástí knihy**.
Neopraveno záměrně (mimo rozsah exportu). Pokud se má publikovat, potřebuje
stejnou opravu.

## Poznámky k převodu (pro redakci/sazbu)

- **Duplicitní perex.** U některých článků se perex (`.article-lead`) shoduje s
  prvním odstavcem těla → v `.md` se objeví dvakrát (jednou tučně jako lead,
  jednou jako první odstavec). Při sazbě jeden z nich zrušit.
- **Značky `[[GRAF: …]]` / `[[BOX: …]]` / `[[TABULKA: …]]`.** Nahrazují vizuální
  a interaktivní komponenty. Podklad (textový obsah komponenty) je ponechán za
  značkou jako _Podklad:_ — sazeč z něj vyrobí graf dle `03-grafy-spec.md`
  (hotová SVG jsou v `grafika/<slug>.svg` pro `cover_viz`).
- **Křížové odkazy.** Interní odkazy mezi články jsou v `.md` ponechány jen jako
  text (bez URL) — v knize převést na „viz kapitola …".
- **Zdroje.** Blok „Zdroje" na konci kapitoly je extrahován z `.article-sources`.
  U návazných sub-sérií (napoje 1-6, digi 1-5 …) zdroje sloučit.
- **Audit ne-`verified`.** Kapitoly `review-pending` / `partial` zkontrolovat
  proti datovému řezu; do knihy jen diskrétní marginální poznámka, ne banner.

## Regenerace
```bash
cd 05_M1_Starter
npm install cheerio          # pokud node_modules chybí
node ../kniha-export/podklady/convert-article.mjs   # manuskript
node ../kniha-export/podklady/generate-charts.mjs   # grafika/*.svg
```
