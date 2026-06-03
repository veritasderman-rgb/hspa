# Plán: Nové UX sekce Články (rubriky jako páteř)

Živý dokument. Cíl: korpus ~100 článků se už nedá procházet po jednom — sekce
Články (`clanky.html`) potřebuje páteř, podle které se čtenář orientuje dnes
i s rostoucím archivem.

Zvolený směr (po konzultaci): **B (tematické rubriky jako páteř) + horní pásmo A
(Poslední zprávy + Kontext, který musíte znát)**.

---

## Cílový layout `clanky.html`

1. **Hero + hledání** — zúžená stávající hlavička.
2. **Poslední zprávy** — 7 nejnovějších (řazení `date` desc; přednost článkům
   s blízkým `topical_until`). Nahrazuje dnešní featured + trending.
3. **Kontext, který musíte znát** — kurátorovaný evergreen, 5–6 položek
   (`pinned_essential: true`).
4. **Rubriky** *(nová páteř)* — 8 rubrik; každá karta = narativní intro
   (kicker/headline/lead) + 3–5 nejnovějších v rubrice + „→ celá rubrika".
5. **Celý archiv** — stávající filtrovaný seznam (úplnost + fulltext).

## Rubriky (8, zarovnané s topic-oblastmi)

`data/rubrics.json` — `prevence`, `legislativa` (a reforma), `financovani`,
`dostupnost` (a regiony), `klinika`, `populace`, `dusevni-zdravi`,
`digitalizace`. Každý publikovaný článek má v `articles.json` pole `rubric`
= id jedné rubriky (primární zařazení). `topics` zůstává jako sekundární tagy.

---

## Fáze

### F1 — datový model + migrace ✅ (tento PR)
- `data/rubrics.json` — 8 rubrik s narativním rámcem.
- `scripts/assign-rubrics.js` — idempotentní seeder: `rubric` heuristikou
  z `topics` (+ `SINGLETON_MAP` pro long-tail tagy, `SLUG_SEED` pro články bez
  tagů). Víceznačné zařazení se loguje pro redakční doladění.
- `articles.json` — všech 97 článků dostalo `rubric`.
- `ingest/validate-articles.js` — publikovaný článek musí mít platné `rubric`.
- `tests/rubrics.test.js` — invarianty rubrik a pokrytí.
- **Bez UI změny.**

### F2 — hub UI (Poslední zprávy + Kontext + Rubriky) ✅
- `src/clanky.js`: `renderHubLatest()` (hero + 6 = 7 nejnovějších),
  `renderHubEssentials()` (články s `pinned_essential`), `renderHubRubrics()`
  (dynamický grouping podle `rubric`). Odstraněn hardcoded `READING_PATHS`
  i topic matrix; archiv filtruje podle `rubric` (chipy `data-rubric`,
  hash `#rubric=`, legacy `#topic=` jako alias).
- `clanky.html`: tři přepsané sekce (Poslední zprávy / Kontext / Rubriky)
  + rubrikové chipy v archivu.
- `src/styles.css`: `.hub-essential-*`, `.hub-rubric-*` + 8 barevných tokenů
  zarovnaných s `color` v `rubrics.json`.
- `pinned_essential` — seed 6 evergreen napříč rubrikami (redakce doladí).
- Regenerován e2e visual baseline `articles-hub` (3 viewporty).

### F3 — detail rubriky + provázání
- Stránka rubriky (buď `clanky.html?rubric=...`, nebo rozšířit
  `tematicke-linie.html`): hlavička rubriky + chronologický seznam jejích
  článků + odkaz na související indikátory/strategie.
- Provázat hub ↔ rubrika ↔ článek (breadcrumb / „další v rubrice").

### F4 — úklid taxonomie + testy
- Sjednotit long-tail `topics` (singletony, nejednotná diakritika) do
  kanonické sady (oddělená migrace; rubriky tím nejsou ohrožené).
- Doladit e2e baseline, doplnit testy.

---

## Otevřené body pro redakci
- **Doladit `rubric`** u 55 víceznačných článků (log z `assign-rubrics.js`).
  Zdroj pravdy je pole `rubric` v `articles.json` — edituje se ručně, seeder
  ho nepřepíše (bez `--force`).
- **Vybrat `pinned_essential`** evergreen sadu pro „Kontext, který musíte znát".

## Spuštění seederu
```bash
node scripts/assign-rubrics.js --dry    # report bez zápisu
node scripts/assign-rubrics.js          # zapíše jen chybějící rubric
node scripts/assign-rubrics.js --force  # přepíše i existující (pozor na ruční doladění)
```
