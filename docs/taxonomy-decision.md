# Taxonomy unification — rozhodnutí (B-09)

> Diskuze a doporučení k odstranění duplicity mezi 4 paralelními klasifikacemi indikátorů.
> Stav: **návrh** — vyžaduje schválení vlastníkem projektu.

## Stav 2026-05

Dashboard má **4 paralelní klasifikace**, které se uživateli zobrazují v různých kontextech:

| Klasifikace | Počet | Kde se používá | Datový zdroj |
|---|---|---|---|
| **HSPA oblasti** | 4 (Výsledky / Výstupy / Procesy / Struktury) | `index.html` filter, `hspa-prehled.html` | `indicators.area` |
| **HSPA dimenze** | 6 (zdraví, dostupnost, kvalita, bezpečnost, efektivita, spravedlnost) | `index.html` filter, `hspa-prehled.html`, homepage hero | `indicators.dimension`, `data/dimensions.json` |
| **OECD HSPA domény** | 12 (Zdravotní stav, Doba dožití, Mortalita…) | `hspa-prehled.html` matrix | `indicators.domain`/`subdomain` |
| **Editorial topics** | 8 (financovani, legislativa, klinika, prevence, …) | `clanky.html` hub matrix, `tematicke-linie.html` | `articles.topics`, `TOPIC_LABELS` v `clanky.js` |

### Problém

- Uživatel se musí orientovat ve 4 různých taxonomiích, které **neoslovují stejné mentální modely**.
- HSPA framework je správně **3-úrovňová hierarchie** (oblasti → dimenze → domény), ale v UI jsou tyto vrstvy filtrovatelné jako paralelní seznamy.
- Editorial topics na článcích neodpovídají žádné HSPA klasifikaci → uživatel vidí jiné chipsy v hubu článků než filtry v dashboardu.

## Návrh

**Zachovat HSPA jako 2-úrovňovou primární strukturu** (oblasti × dimenze), s doménami jako sekundárním řezem na `hspa-prehled.html`.

### Primární taxonomie (v UI viditelně)

| Úroveň | Klasifikace | Použití |
|---|---|---|
| **L1 — Co měříme** | 4 oblasti (Výsledky / Výstupy / Procesy / Struktury) | Dashboard filtr, drobečková navigace |
| **L2 — Jakou kvalitu** | 6 dimenzí | Dashboard filtr, dimensions-grid na homepage, badge u indikátoru |

### Sekundární taxonomie (jen na detailních stránkách)

| Klasifikace | Kde |
|---|---|
| **OECD domény** | `hspa-prehled.html` — pro mapování HSPA frameworku 1:1 |
| **Editorial topics** | `clanky.html`, `tematicke-linie.html` — editorial perspektiva (nepleteme s HSPA) |

### Mapping mezi taxonomiemi

Editorial topics → HSPA dimenze (1-N):

| Topic | Primární dimenze | Sekundární |
|---|---|---|
| `financovani` | efektivita | dostupnost |
| `legislativa` | (cross-cutting) | — |
| `klinika` | kvalita, bezpečnost | — |
| `prevence` | zdraví | dostupnost |
| `dlouhodoba-pece` | dostupnost, kvalita | spravedlnost |
| `psychiatrie` | dostupnost, kvalita | spravedlnost |
| `eu-rules` | (cross-cutting) | — |
| `digitalizace` | efektivita, kvalita | dostupnost |

Toto mapping doplnit do `data/articles.json` jako pole `linked_dimensions` (vedle `topics`), aby UI mohlo zobrazit dimenze u článku stejně jako u indikátorů.

## Implementační kroky

### Fáze 1 — neinvazivní (doporučeno teď)

1. Přidat `linked_dimensions: string[]` do `data/articles.json` (per článek) podle mapování výše. Default odvozený z `topics`.
2. Validátor `ingest/validate.js` zkontroluje, že hodnoty jsou ze 6 dimenzí.
3. UI: detail článku zobrazí dimenze jako badge vedle topics — bez vizuální změny hubu.

### Fáze 2 — UI sjednocení (po user testu)

4. Hub článků (`clanky.html`) přidá sekundární filtr „Podle dimenze" vedle „Podle tématu".
5. Homepage dimenze-grid (`.dim-card`) bude linkovat na clanky.html s pre-filtered dimension queryparam.
6. Dashboard filter „dimenze" sjednoceně používá stejný label/barvy jako homepage dim-grid (sdílený CSS namespace `.dim-*`).

### Fáze 3 — deprecation (po 3 měsících)

7. OECD domény skryté pod fold na `hspa-prehled.html` (collapsible „Pro experty"). Frontend ale data dál umí číst.
8. Topics zůstávají jako editorial vrstva — nepokoušíme se sjednotit s HSPA. Mapping přes `linked_dimensions` je most.

## Akceptační kritéria (přepsané z BACKLOGu B-09)

- [ ] **Fáze 1 hotová**: `linked_dimensions` v `articles.json`, validátor passes
- [ ] **Fáze 2 hotová**: User test (5 lidi) — 4/5 najde článek do 3 kliknutí přes dimension filter
- [ ] **Fáze 3 hotová**: OECD domény vizuálně sekundární, žádný regress na hspa-prehled

## Co se NEbude měnit

- HSPA framework labels (oficiální OECD/MZ ČR 2023 — nesmíme přejmenovat)
- Editorial topics labels (redakční rozhodnutí, ne HSPA)
- Datové schéma `indicators.json` `area`/`domain`/`subdomain` — zůstává beze změny
- Backward compat všech existujících `#area=`/`#dim=`/`#fw=` deeplinků

## Otevřené otázky pro vlastníka

1. Akceptovat 2-úrovňovou primární taxonomii (oblasti × dimenze)?
2. Akceptovat mapping topics → dimensions navržený výše?
3. Skrýt OECD domény pod „Pro experty" toggle na `hspa-prehled.html`? (Tato sekce má 122 indikátorů → potřebuje proházet)

---
*Návrh 2026-05-18 · vyžaduje schválení vlastníkem projektu*
