# PLAN — Simulátor pák („Co kdyby") · flagship feature #1

Kvantitativní evoluce **Modelu systému** (`model-systemu.html`): z kvalitativní
kauzální mapy na **interaktivní what-if kalkulátor**. Uživatel táhne za páky a
engine spočítá **modelový dopad na indikátory** podle elasticit/efektů
**doložených v korpusu** — každý s citací zdroje a pásmem nejistoty.

> **Rámování (závazné):** Nejde o predikci. Je to *ilustrativní modelový odhad
> dle citované evidence*. Každá páka i každý efekt má zdroj; nejistota je
> zobrazena; kde chybí čistá elasticita, je efekt jen **směrový** (posouvá
> nahoru/dolů, síla slabá/střední/silná — jako hrany Modelu systému).

## 1. Datová struktura — `data/levers.json`

```json
{
  "version": "1.0",
  "generated_at": "…",
  "levers": [
    {
      "id": "tabakova_dan",
      "label": "Tabáková daň (cena cigaret)",
      "group": "Prevence",
      "control": { "unit": "% zvýšení ceny", "min": 0, "max": 50, "step": 5, "default": 0 },
      "system_model_node": "kuractvi",
      "effects": [
        {
          "indicator": "prevalence_koureni_adolescenti",
          "kind": "elasticity",
          "coef_per_unit": -0.4,          // −0,4 % relativní změny na +1 % ceny
          "note": "+10 % ceny → −4 % prevalence u mladistvých",
          "confidence": "medium",
          "source": "WHO (Chaloupka et al.); clanek-koureni-adolescenti.html"
        }
      ]
    }
  ]
}
```

**Dva typy efektu:**
- `kind: "elasticity"` — `coef_per_unit` × posun páky = relativní % změna hodnoty
  indikátoru. Engine: `new = current × (1 + coef_per_unit/100 × delta)`.
- `kind: "directional"` — `polarity` (`down`/`up`) + `strength`
  (`weak`/`medium`/`strong`), bez čísla. Zobrazí se jako šipka + síla.

Každý efekt cílí na **reálný indikátor z `indicators.json`** (bere jeho `current`
value pro výpočet). Validátor kontroluje: indikátor existuje, zdroj vyplněn,
elasticita má konečný `coef_per_unit`, směrový má polarity+strength.

## 2. Iniciální páky (jen doložené)

| Páka | Efekt | Typ | Zdroj |
|---|---|---|---|
| Tabáková daň | `prevalence_koureni_adolescenti` −0,4 %/% ceny | elasticity | WHO Chaloupka |
| Ošetřovatelský poměr (−1 pacient/sestru) | `mortalita_inhosp_cmp` −7 % / pacient | elasticity | Aiken, Lancet 2014 |
| Účast na kolorektál. screeningu ↑ | `prezit_rakoviny_5let` ↑ (medium) | directional | CONCORD-3; clanek-prezit-rakoviny |
| Daň z cukru (sugar levy) | `deti_obezita_cosi` ↓ (medium) | directional | PHE 2020; clanek-deti-obezita |
| Adresné zvaní na prevenci | `prohlidka_prakticky_lekar` ↑ → `hospitalizace_acsc` ↓ | directional | NHS Health Check / QOF |
| Posun 5 % lůžková → ambulantní | `podil_vydaje_luzkova_pece` ↓ | elasticity | clanek-financovani-segmenty-2026 |

## 3. Stránka + engine

- **`simulator.html`** — nová stránka; submenu pod „Indikátory" vedle Modelu systému.
- **`src/simulator.js`** — načte `levers.json` + `indicators.json`, vyrenderuje
  posuvníky (range inputs, a11y: label + `aria-valuetext` s jednotkou), po změně
  přepočte a ukáže dotčené indikátory (před → po, delta, pásmo nejistoty, zdroj).
- **Vizuál:** reuse AV komponent (`.av-bar-compare` pro před/po, signální barvy).
- **A11y:** posuvníky plně klávesnicí; výsledky v `aria-live` regionu; respektuje
  `prefers-reduced-motion`. **Dark mode:** jen tokeny (žádné raw barvy).
- **Reset** + trvalý disclaimer o ilustrativnosti + „jak to počítáme" rozbalovací
  metodika s odkazy na zdroje.

## 4. Testy (`tests/`)

- `levers-schema.test.js` — každá páka: control range validní, každý efekt cílí na
  existující indikátor, elasticity má konečný koeficient, directional má
  polarity+strength, každý efekt má `source`.
- `simulator-engine.test.js` — čistá funkce `applyLever(current, effect, delta)`
  (importovatelná z `simulator.js`) vrací očekávané hodnoty pro elasticitu i
  directional (znaménko/síla). Bez DOM.

## 5. Pořadí (dávky = commity / PR)

1. **Data + validátor + engine test** (tato dávka — foundation).
2. Stránka + JS engine + submenu + a11y + dark.
3. Metodika/disclaimer + cross-linky z Modelu systému a dotčených článků.
4. QA: `validate:all`, `npm test`, ruční klik, vizuální baseline (nová stránka →
   `update_baseline` dispatch pokud je v CI scanu; jinak `clanek-*` výjimka neplatí,
   `simulator.html` JE ve scanu — přidat baseline).

## 6. Vztah k #3 (Osobní kompas) a Modelu systému

- Simulátor a Model systému sdílí uzly (`system_model_node`) → do budoucna proklik
  „páka v grafu → co udělá" a zpět.
- Osobní kompas (#3) může nabídnout „páky, které se týkají vaší skupiny".
