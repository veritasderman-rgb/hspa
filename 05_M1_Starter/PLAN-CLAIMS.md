# Plán: Registr tvrzení (claims) — samo-verifikující se korpus

**Stav:** schváleno vlastníkem (session 2026-07-07), implementuje se.
**Datum:** 2026-07-07.
**Branch:** `claude/skorezdravotnictvi-major-feature-7yb7l9` (společný PR s PLAN-SYSTEM-MODEL.md).
**Cíl:** každé podstatné kvantitativní tvrzení ve všech článcích zachytit do
strukturovaného registru `data/claims.json`, navázat na indikátory a nechat
noční skener detekovat drift automaticky — místo ručních auditních dávek.

---

## 0) Proč

Dnes drift hlídá `findIndicatorDrift` v `scripts/nightly-scan.js` jen
textově-pozičně: číslo v okně ±220 znaků kolem odkazu `indikator-*.html`,
a záměrně vynechává `.article-databox`. Nevidí tvrzení bez odkazu na
indikátor, neví, JAKÉ tvrzení číslo nese, a neumí rozlišit metodiku
(viz kauza screening MOÚ 60 % vs. 54,5 %). Registr tvrzení tuto kontrolu
obrací: **tvrzení je datový záznam s explicitní vazbou a tolerancí.**

## 1) Dataset `data/claims.json`

Root obal dle konvence (`version`, `generated_at`, `_doc`, `claims[]`):

```jsonc
{
  "id": "alkohol-spotreba--03",        // {article_id}--{NN}, unikátní
  "article": "clanek-alkohol-spotreba.html",  // FK → articles.json.slug
  "quote": "Češi vypijí 14,4 litru čistého alkoholu na osobu a rok",
                                        // doslovný úryvek textu (≤240 znaků, bez tagů)
  "metric": "spotřeba čistého alkoholu na osobu 15+ za rok",  // co číslo měří
  "value": 14.4,                        // normalizované číslo (tečka)
  "unit": "l/os./rok",
  "as_of": 2024,                        // rok, ke kterému tvrzení platí (null = neuvedeno)
  "location": "prose",                  // prose | counter | databox | perex
  "indicator_id": "alkohol_spotreba",   // FK → indicators.json.id, nebo null
  "relation": "exact",                  // exact = cituje hodnotu indikátoru
                                        // derived = odvozeno (rozdíl vs. benchmark…)
                                        // related = stejné téma, JINÁ metodika/populace
                                        // external = bez indikátoru, externí zdroj
  "check": "auto",                      // auto = drift-check proti indikátoru
                                        // manual = jen inventář (metodika nesedí 1:1)
                                        // none = nekontrolovatelné (odhad, projekce)
  "tolerance_pct": 2,                   // povolená odchylka pro check=auto
  "source_note": "OECD Health at a Glance 2025"   // volitelně odkud číslo je
}
```

Zásady:
- `relation: "exact"` + `check: "auto"` smí dostat JEN tvrzení, kde metrika,
  populace i jednotka odpovídají definici indikátoru. Metodická odchylka
  (recorded vs. total alkohol, pozvaní vs. cílová populace) = `related` +
  `manual` + vysvětlení v `metric`. To je jádro hodnoty registru.
- `quote` je doslovný — deterministický skript ověřuje, že úryvek v článku
  skutečně existuje. Tvrzení s neexistujícím quote se do registru nedostane.
- Registr je **read-only vstup** kontroly; skener do něj nezapisuje
  (výsledky jdou do `reports/`, stejně jako dnes).

## 2) Extrakce (jednorázový fan-out, pak údržba)

- Workflow: dávky po ~5 článcích (172 článků → ~35 agentů), každý agent čte
  HTML a vrací strukturovaná tvrzení (schema-forced). Priorita: čísla vázaná
  na indikátory > titulková čísla (perex, av-counter) > benchmarková srovnání.
  4–14 tvrzení na článek; dlouhé datové tabulky se neextrahují (headline ano).
- Deterministická verifikace po extrakci: `scripts/claims-verify-quotes.js`
  (offline) ověří quote-in-article a parsovatelnost čísla; neprošlé záznamy
  se zahodí/opraví před commitem.
- Údržba: workflow `docs/workflows.md` § Nový článek dostane krok „doplň
  tvrzení do data/claims.json"; nightly report upozorní na publikované
  články bez záznamů v registru (kategorie `claims-missing`).

## 3) Drift-check v nočním skeneru

Rozšíření `scripts/nightly-scan.js` (zůstává offline, read-only):

- Nová kategorie **`claims-drift`** (severity review): pro každé tvrzení
  s `check: "auto"` a `indicator_id` porovná `value` s aktuální hodnotou
  indikátoru; flag pokud relativní odchylka > `tolerance_pct` — do reportu
  jde id tvrzení, quote, hodnota v článku vs. aktuální hodnota (+ rok).
- Nová kategorie **`claims-stale`** (severity low): indikátor má novější
  `year` než `as_of` tvrzení a hodnota se změnila v rámci tolerance — jen
  informativní (číslo sedí, ale existuje novější rok).
- Kategorie **`claims-missing`** (severity low): publikovaný článek bez
  jediného záznamu v registru.
- Stávající poziční `indicator-drift` zůstává (druhá nezávislá síť);
  články pokryté registrem může časem přeskakovat.

## 4) Validátor + testy

- `ingest/validate-claims.js` (vzor validate-strategies.js): root obal,
  required pole, unikátní `id`, `article` existuje v `articles.json`
  i na disku, `indicator_id` existuje v `indicators.json`, enumy
  (`location`, `relation`, `check`), `value` je number, invariant
  „check=auto ⇒ relation=exact ∧ indicator_id ≠ null". Zapojit jako
  `validate:claims` do `validate:all`.
- Testy `tests/claims.test.js`: FK integrita, invarianty, ≥N záznamů;
  `tests/nightly-scan.test.js` rozšířit o pure funkci `findClaimsDrift`
  na in-memory fixtures (vzor stávajících testů skeneru).
- `docs/data-model.md`: nová sekce datasetu + řádky do tabulek
  Foreign keys a Validátory.

## 5) Co tento plán NEDĚLÁ

- Nemění texty článků (jen čte). Opravy driftů zůstávají redakční práce —
  registr je najde, člověk/session je opraví.
- Nemění stávající audit lifecycle (`audit-status` v articles.json).
- Nezapisuje do `data/claims.json` z cronu — registr se mění jen commitem.

## 6) Fáze

| Fáze | Obsah |
|---|---|
| A | Schéma + validátor + prázdný registr + testy |
| B | Extrakční fan-out (35 dávek × 5 článků) + quote-verifikace |
| C | `claims-drift`/`claims-stale`/`claims-missing` v nightly-scan.js + testy |
| D | docs/data-model.md, workflows.md krok pro nové články |

*Generated by Claude Code.*
