# Plán — Osobní zdravotní kompas (`kompas.html`)

Osobní čočka nad daty portálu. Uživatel zadá **věk, pohlaví, kraj** (a volitelně
rizikový faktor kouření) a Kompas mu složí:

1. **Osobní checklist prevence** — které preventivní prohlídky, screeningy a
   očkování se ho podle věku/pohlaví právě týkají, s oficiálním intervalem,
   jednou větou doporučení a **citovaným zdrojem** (vyhlášky MZ ČR, národní
   screeningové programy).
2. **Jak si vede můj kraj** — u checků, které mají krajský dataset
   (`data/regions.json`), ukáže hodnotu uživatelova kraje vs. celostátní průměr
   a pořadí — kontext, ne verdikt.
3. **Co si přečíst** — relevantní články a indikátory k profilu.

## Zásady

- **Žádné PII, žádné ukládání, žádná síť.** Vše běží v prohlížeči, nic se
  neodesílá ani neukládá. Vstupy jsou volby, ne diagnostika.
- **Informace, ne lékařská rada.** Výrazný disclaimer. Kompas neříká „jdi na
  vyšetření", ukazuje, co český systém prevence pro daný profil obsahuje.
- **Každý check má zdroj.** Validátor to hlídá (jako u pák/tvrzení).
- **Tokeny only v CSS** → automaticky dark-safe. Default light (viz
  decisions-log).

## Data — `data/personal-checks.json`

```json
{
  "version": "1.0",
  "generated_at": "...",
  "checks": [{
    "id": "prohlidka_prakticky",
    "label": "Preventivní prohlídka u praktického lékaře",
    "category": "prohlidka",          // prohlidka | screening | ockovani
    "sex": "all",                      // all | female | male
    "age_min": 18,
    "age_max": null,                   // null = bez horní hranice
    "requires_risk": null,             // null | "smoking"
    "interval": "1× za 2 roky",
    "recommendation": "…jedna věta…",
    "region_dataset": "prohlidka_prakticky_lekar_kraje",  // optional
    "related_indicator": "prohlidka_prakticky_lekar",       // optional
    "related_articles": ["clanek-preventivni-prohlidka.html"],
    "source": { "name": "Vyhláška č. 70/2012 Sb.", "url": "…" }
  }]
}
```

## Engine — `src/kompas-engine.js` (čistý, testovaný)

- `checkApplies(check, {age, sex, smoking})` → bool (věk v rozsahu, pohlaví
  sedí, risk gate splněn).
- `applicableChecks(checks, profile)` → filtrované + seřazené (kategorie pořadí
  prohlidka → screening → ockovani).
- `regionStat(dataset, krajCode)` → `{value, country_avg, rank, of, direction, better}`
  — pořadí kraje a zda je nad/pod průměrem.

## UI — `kompas.html` + `src/kompas.js`

- Formulář: věk (number 0–120), pohlaví (radio muž/žena), kraj (select 14
  krajů), kouření (checkbox). Vše volitelné s rozumnými defaulty; nic povinného.
- Výstup (aria-live): checklist karet (label, interval, doporučení, krajský
  kontext, odkazy, zdroj). Prázdný stav před výběrem.
- Sdílená chrome přes `renderModuleNav` + `renderMastheadDate`; nav položka
  „Osobní kompas" pod „Co s tím můžu dělat já" (prevention) nebo samostatně.

## Validátor — `ingest/validate-personal-checks.js`

Kontroluje: unikátní id, category ∈ {prohlidka,screening,ockovani},
sex ∈ {all,female,male}, age_min konečné, age_max null|konečné a ≥ age_min,
requires_risk ∈ {null,"smoking"}, interval+recommendation+source povinné,
region_dataset (je-li) existuje v regions.json, related_indicator (je-li)
existuje v indicators.json. Zapojit do `validate:all`.

## Testy — `tests/kompas.test.js`

- validátor projde
- checkApplies: věk pod/nad rozsahem, pohlaví, risk gate (kouření)
- applicableChecks: 30letá žena vs. 68letý muž-kuřák → očekávané sady
- regionStat: pořadí a better/worse vůči průměru

## Pořadí dávek

1. plán + data + engine + validátor + testy (tato dávka)
2. stránka + UI + CSS + nav + build:css → PR
