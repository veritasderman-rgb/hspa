# Plán překopání: kvalita-pece.html (v2)

**Stav:** ✅ IMPLEMENTOVÁNO (ověřeno 2026-06-10). Všech 5 bodů hotovo:
A1 grid layout (ed-hero/cq-split), A2 animované count-up (av-counter ×12),
A3 glossary word-boundary fix + test (tests/clinical-quality-glossary.test.js,
10/10), A4 otvírák „Vlastimil a Anežka", A5 narativní linie (akutní vs chronická).
**Datum:** 2026-05-28 (plán), 2026-06-10 (ověření hotovo).
**Branch:** `claude/plan-kvalita-pece-uxv2`.
**Cíl:** opravit UX/grafické problémy nahlášené uživatelem a posunout stránku z metodického katalogu k editorial-grade narativu.

---

## A) Co je špatně teď (audit konkrétních problémů)

### A1) Layout asymetrie — text na levé straně, grafika přes celou šířku

Hlavní viník: brand komponenta `.hspa-dims-section` má dvě úrovně:
- `.hspa-dims-lead` text s `max-width: 720px` (záměrně — pro čitelnost)
- Vizuální komponenty (`.cq-trendline`, `.cq-heatmap-wrap`, `.av-bar-compare`) s `max-width: 720px` nebo bez limitu

V některých sekcích (zejména preambule **„Proč in-hospital..."**) je text bez doprovodné grafiky — vznikne „prázdná pravá strana" kontrastující s vedle stojícím trend chartem. Vizuálně to **„volá po grafice"**.

Řešení dvou typů:
1. **Kde je text + graf** → udělat 2-column grid `[text 1fr | graf 1fr]` (jako `ed-hero`)
2. **Kde je jen text** → buď přidat doprovodnou grafiku, nebo posunout text na střed s `max-width: 760px; margin: 0 auto;`

### A2) Žádné animované indikátory

Stávající stránka má **0 animovaných count-up čísel**. Brand má komponentu `.av-counter` s IntersectionObserver count-up animací (viz `clanek-akutni-infarkt.html` 5,2 % bar-fill).

Konkrétně chybí animace na:
- Hero ed-stats (28, 14×8, 5,2 %, 3×, 37,1 %, 35)
- Dual-reading cards (sepse 0,85 %, AMI 5,2 %, CMP 11,2 %, AWaRe CZ 37,1 %)
- Bar-compare (§4 + §5 mají statické bary, mohly by mít fill-in animaci)
- Trend chart (mohl by mít draw-in line jako `narok-svg`)

### A3) Glossary highlight bug: „IC" matchuje uvnitř `penicilin`, `praktického`

Můj regex je `/(IC|...|Iktové centrum)/gi` bez word boundaries. Case-insensitive match najde:
- „ic" v „praktic-kého" → false positive
- „ic" v „pen-ic-ilin" → false positive

Fix: word boundary kolem matche. Musí to být **letter-aware** (Unicode), protože `\b` v JS regex neuctívá českou diakritiku spolehlivě. Použít lookbehind/lookahead s `\p{L}` Unicode property.

```js
// Před matchem nesmí být písmeno; po matchi nesmí být písmeno.
// Použít (?<![\\p{L}])(?:...)(?![\\p{L}]) s flagem 'u'
new RegExp(`(?<![\\p{L}])(${escaped.join('|')})(?![\\p{L}])`, 'giu');
```

Také zkratky jako „IC", „PCI", „AMI", „CMP" by se měly matchovat **case-sensitive** (jinak hrozí false-positives). Termíny jako „sepse", „trombolýza" naopak case-insensitive (mohou být na začátku věty). → Označit v JSON `match: 'exact' | 'caseInsensitive'`.

### A4) Otvírák je slabý — „Proč in-hospital..." je metodologická vsuvka

Současný hook:
> „Když Česko vykazuje 5,2 % nemocniční úmrtnost po infarktu (in-hospital, ÚZIS NRH, MKN-10 I21–I22), znamená to..."

To je **metodologická poznámka**, ne otvírák příběhu. Čtenář (laik / novinář / krajský úředník) se hned po hero ocitne v zakázce o `MKN-10 I21–I22` a „admission-based unlinked". To je obrovský pokles energie.

Editorial-grade otvírák by měl mít **emocionální háček** + **konkrétní data** + **otázku, na kterou stránka odpovídá**.

### A5) Kontextové propojení dat slabé

Sekce § 1–§ 7 sledují metodickou hierarchii (PUK indikátory). Ale **proč by čtenáře měla zajímat sepse vs AMI vs CMP**? Jaký je jednotící příběh?

Možné jednotící linie:
- **„Co Česko zvládá vs zaostává"** — AMI top OECD, CMP propad o pětinu, sepse pokles, AMR pod cílem WHO
- **„Co dělá rozdíl pro pacienta"** — výběr centra, čas, screening, racionální preskripce
- **„Akutní vs chronická"** — akutní vrstva péče špička, chronická / preventivní propad

---

## B) Cílový stav (v2)

### B1) Nový otvírák — „Vlastimil a Anežka" hook

```
HERO (ed-hero zachovat, mírně upravit)
  ↓
NOVÝ INTRO „STORY HOOK" (full-width section, paper2 background)
  ┌───────────────────────────────────────────────────┐
  │  Vlastimil (58) přijel s infarktem ve 23:40       │
  │  do FN Plzeň. Přežil.                             │
  │                                                   │
  │  Anežka (74) přijela s mozkovou mrtvicí ráno      │
  │  do K. Varů. Nepřežila.                           │
  │                                                   │
  │  Jeden ze stejné země. Ve stejném pojištění.      │
  │  Proč ten rozdíl?                                 │
  │                                                   │
  │  [animované velké číslo s benchmarky:]            │
  │  AMI:  5,2 % ČR vs 6,5 % OECD  ⓘ TOP 1/3 OECD    │
  │  CMP:  11,2 % ČR vs 7,7 % OECD ⓘ −20 % OECD     │
  └───────────────────────────────────────────────────┘
```

Tato sekce nahradí současný „Proč in-hospital..." kus. Metodická poznámka o in-hospital vs OECD admission-based se přesune jako rozklikávací detail uvnitř § 2 AMI.

### B2) Layout refactor — všechny dims sekce mají 2-col grid

Kde sekce obsahuje text + vizualizaci → 2 column grid:

```css
.cq-section-2col {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 36px;
  align-items: start;
}
@media (max-width: 880px) {
  .cq-section-2col { grid-template-columns: 1fr; }
}
```

Kde sekce má jen text → `max-width: 760px; margin: 0 auto;`.

### B3) Animace všude

1. **Hero ed-stats** — `.av-counter` na číslech (28, 14, 5,2, 3, 37,1, 35)
2. **Dual-reading cards** — `.av-counter` na value (0,85, 5,2, 11,2, 37,1)
3. **Bar-compare** §4 + §5 — bar fill-in animace (existuje v article-visuals.js, jen není aktivovaná)
4. **Trend chart** §2 + §3 — SVG draw-in line s `nsv-anim-line` třídou jako narok-svg

### B4) Glossary bug fix

`src/clinical-quality.js` → `highlightGlossaryTerms()`:

```js
function highlightGlossaryTerms(text, terms) {
  // terms: [{key, matchMode}] — matchMode = 'exact' (case-sensitive) | 'ci' (case-insensitive)
  const ciKeys = terms.filter(t => t.matchMode === 'ci').map(t => t.key);
  const exactKeys = terms.filter(t => t.matchMode === 'exact').map(t => t.key);
  // Build two regexes with Unicode word boundaries
  const ciPattern = ciKeys.length
    ? new RegExp(`(?<!\\p{L})(${ciKeys.map(esc).join('|')})(?!\\p{L})`, 'giu')
    : null;
  const exactPattern = exactKeys.length
    ? new RegExp(`(?<!\\p{L})(${exactKeys.map(esc).join('|')})(?!\\p{L})`, 'gu')
    : null;
  // ... merge matches by position
}
```

A v `clinical-glossary.json` doplnit `matchMode` na každý term:
- `"PSI-13": { ..., "matchMode": "exact" }` (zkratky → case-sensitive)
- `"sepse": { ..., "matchMode": "ci" }` (slova → case-insensitive)

### B5) Sekce restrukturalizace — z metody k narativu

Současné pořadí § 1 → § 7 je dobrá kostra. Mírné úpravy:

**Nový tok:**

```
HERO (kratší, soustředěnější)
INTRO STORY HOOK (NEW) — Vlastimil + Anežka
§ 1 BEZPEČNOST: pooperační sepse — co Česko zvládá v plánované chirurgii
§ 2 SRDCE: AMI — kde je Česko mezi nejlepšími OECD
§ 3 MOZEK: CMP — kde Česko zaostává o pětinu
§ 4 ANTIBIOTIKA: tichá pandemie před dveřmi
§ 5 RAKOVINA: cena za zmeškaný screening
§ 6 KOORDINACE: INDIKO cesta pacienta
§ 7 KDE BYDLET — krajská heatmapa
KATALOG INDIKÁTORŮ (zachovat z v1)
ZÁVĚR
```

Každá sekce dostane **podtitul + hook větu**, ne jen titulek. Příklad:

```html
<div class="ed-kicker">§ 3 · Mozek</div>
<h3 class="hspa-dims-h">CMP — síť funguje, výsledky zaostávají o pětinu</h3>
<p class="cq-section-hook">
  Anežka v Karlových Varech nezemřela na špatnou síť iktových center
  (Česko jich má 32 a patří mezi evropské lídry). Zemřela na to,
  co se stalo PŘED a PO příjezdu do nemocnice.
</p>
```

### B6) Vylepšený kontext mezi sekcemi

Mezi sekcemi přidat **inter-section bridge** — krátkou větu připojující předchozí téma k dalšímu. Příklad:

```
[konec § 2 AMI]
"Pojďme se ale podívat na druhou nejčastější akutní cévní příhodu,
 kde je výsledek dramaticky horší. ↓"
[začátek § 3 CMP]
```

To zlepší narativní tok a sníží pocit „katalog metrik".

---

## C) Konkrétní úkoly k implementaci

| # | Úkol | Soubor | Náročnost |
|---|------|--------|-----------|
| C1 | Story Hook sekce (Vlastimil + Anežka) | `kvalita-pece.html` | M |
| C2 | Layout 2-col grid pro sekce s text+graf | `kvalita-pece.html` + CSS | L |
| C3 | `.av-counter` na ed-stats v hero | `kvalita-pece.html` | S |
| C4 | `.av-counter` na dual-reading values | `kvalita-pece.html` | S |
| C5 | Bar fill-in animace na bar-compare | aktivovat z `article-visuals.js` | S |
| C6 | SVG draw-in animace na trend charts | `kvalita-pece.html` (přidat třídy) | S |
| C7 | Glossary regex word-boundary fix + matchMode | `src/clinical-quality.js` + `clinical-glossary.json` | M |
| C8 | Podtitul + hook věty pro každou sekci | `kvalita-pece.html` | M |
| C9 | Inter-section bridge věty | `kvalita-pece.html` | S |
| C10 | Závěrečná sekce zaslouží refresh | `kvalita-pece.html` | S |

**Odhad času:** ~3–4 hodiny soustředěné práce.

---

## D) Co tento PR NEDĚLÁ (a proč)

- **NEMĚNÍ data**: clinical-quality.json zůstává, jen se mu mění zobrazení
- **NEMĚNÍ scrapery**: PUK funguje, není co opravovat
- **NEMĚNÍ heatmap**: § 7 je v pořádku — jen mu přidám ed-hook větu
- **NEDOTÝKÁ se navigace**: PR #429 už řešilo submenu + skrytí poskytovatelů

---

## E) Kontrolní seznam před merge

- [ ] Layout: žádná sekce nemá „prázdnou pravou polovinu" na desktop
- [ ] Animace: minimálně 8 animovaných čísel + 2 SVG draw-in animací
- [ ] Glossary: „IC" už nematchuje uvnitř „penicilin" / „praktického"
- [ ] Otvírák: Vlastimil + Anežka story hook nahrazuje současný metodologický intro
- [ ] Sekce: každá má kicker + headline + hook větu
- [ ] Bridge věty: alespoň 4 inter-section spojnice
- [ ] `npm test` 439/439
- [ ] `npm run validate:all` OK
- [ ] Manuální preview na Vercel — pohled mobilu i desktopu

---

## F) Schvalovací bod

Tento plán čeká na schválení uživatelem. Po `OK` přejdu rovnou k implementaci v této branchi.

Otázky pro uživatele před startem:

1. **Story hook Vlastimil + Anežka** — souhlasíte s tímhle otvírákem? Nebo preferujete jiný (např. čísla-první: „5,2 % ČR vs 6,5 % OECD")?
2. **2-column layout v sekcích** — souhlasíte? Nebo radši ponechat single-column a doplnit grafiku pod text?
3. **Glossary matchMode** — souhlasíte, že zkratky budou case-sensitive (`exact`) a slova case-insensitive (`ci`)?
4. **Pořadí sekcí** — současné § 1 → § 7 ponechat (jen s lepšími podtituly), nebo přeskupit?

---

*Generated by Claude Code.*
