# Scénář — formát JSON

Soubor `05_M1_Starter/social/reels/scripts/<slug>.json`, `slug` = slug článku
(= název souboru). Validuje `validate()` v `social/reels/lib/scene.js`
(`npm run reels:check`), fakta proti článku hlídá `tests/reels-engine.test.js`.

Tento soubor popisuje styl **Kompík vysvětluje** (výchozí, bez pole `style`).
Styl **Florence komentuje** (`"style": "florence"`) má vlastní beaty — viz
[`florence.md`](florence.md). Fakta, `source_line`, `footnote` a kontrola čísel platí stejně.

## Kostra

```json
{
  "slug": "clanek-absolventi-osetrovatelstvi",
  "article": "clanek-absolventi-osetrovatelstvi.html",
  "series": "Kompík vysvětluje",
  "kicker": "Sestry · absolventi 2024",
  "facts": [
    { "id": "cz", "value": "16,1", "unit": "absolventů na 100 000 obyvatel", "year": 2024,
      "source": "OECD Health Statistics (DF_GRAD, MINUQUAL)",
      "quote": "Česko jich promuje jen kolem 16,1 na 100 000 obyvatel." }
  ],
  "footnote": "Všeobecné sestry · 1 postavička = 1 absolvent na 100 000 obyvatel · 2024",
  "source_line": "Zdroj: OECD Health Statistics 2024",
  "poster_at": 12.2,
  "beats": [ … ]
}
```

| Pole | Povinné | Význam |
|---|---|---|
| `slug` | ✅ | = název souboru, = slug článku |
| `article` | ✅ | HTML článku (relativně k `05_M1_Starter/`), proti němu se ověřují citace |
| `series` | — | text odznaku nahoře (výchozí „Kompík vysvětluje") |
| `kicker` | — | podtitul pod odznakem (téma · rok), VERZÁLKAMI se vykreslí sám |
| `facts[]` | ✅ | `id`, `value` (přesně jak v článku, s desetinnou čárkou), `unit`, `year`, `source`, `quote` (doslovná věta z článku obsahující `value`) |
| `footnote` | ✅ se skupinou | drobný text dole během skupin: co je 1 postavička, populace, rok |
| `source_line` | ✅ | zdroj na koncové kartě |
| `poster_at` | — | čas (s) plakátu/coveru; výchozí 0,35 s před koncem pointy (celá replika i nápis jsou vidět) |
| `domain` | — | doména na kartě (výchozí `skorezdravotnictvi.cz`) |

## Beaty

Beaty jdou za sebou, každý má `type` a `dur` (s). Celek **8–20 s**. Replika
(`line`) se musí vejít do beatu i s rezervou 0,35 s (validátor spočítá slabiky).
Zvýraznění v replice: `*slovo*` nebo `*víc slov*` (vykreslí se tmavě jantarově,
zelenou při `tone: good`).

### `intro` — háček (první beat)
Kompík vyskočí zespodu (boing + pop), velký uprostřed, bublina nad ním.
```json
{ "type": "intro", "dur": 2.9, "emotion": "curious", "line": "Kolik sester ročně vychová Česko?" }
```
`emotion: curious` navíc roztočí střelku (zvuk „spin").

### `say` — replika s gestem
```json
{ "type": "say", "dur": 2.4, "emotion": "skeptic", "gesture": "shrug", "line": "Říká se, že sester je dost." }
```
`gesture`: `none` · `point-left` · `point-right` · `point-up` · `shrug` · `hands-up` · `wave` · `think`.

### `group` — postavičky ukážou číslo (nejvýš 2 na video)
```json
{ "type": "group", "dur": 3.3, "emotion": "worried", "fact": "cz",
  "id": "cz", "side": "left", "role": "sestra", "count": 16, "value": "16,1",
  "label": "Česko", "line": "Všeobecných? Jen *šestnáct* na sto tisíc lidí." }
```
| Pole | Význam |
|---|---|
| `fact` | odkaz na `facts[].id` — **povinné**; `value` se musí shodovat |
| `count` | počet postaviček (1–40) |
| `per` | kolik jednotek je 1 postavička (výchozí 1); `count × per` ≈ `value` ± 10 % |
| `side` | `left` · `right` · `center` (jedna skupina) |
| `role` | `sestra` · `lekar` · `pacient` · `senior` · `dite` · `urednik` · `zachranar` |
| `label` | popisek pod číslem („Česko", „Průměr OECD", „2010") |
| `cols` | šířka davu (výchozí 5) — stejná pro obě skupiny, ať jde porovnat výška |
| `mood`, `punchMood` | nálada postaviček, a po pointě |

Postavičky naskáčou jedna po druhé (stoupající „plop" = počítání), číslo pod nimi
se načítá. Kompík se zmenší, sejde dolů a ukazuje na skupinu.

**Jak převést hodnotu na postavičky:** malá čísla 1:1 (16,1 → 16). Procenta jako
„kolik ze 100": 21,4 % → `count: 21` + footnote „1 postavička = 1 ze 100". Velká
čísla přes `per`: 14,9 mld. → `count: 15, per: 1` + footnote „1 postavička = 1 mld. Kč";
494 úmrtí → `count: 25, per: 20` (500, odchylka 1 %). Hrubé převody, které by
rozdíl zkreslily (> 10 %), validátor odmítne — a i v toleranci volej spíš jemnější
měřítko, ať je srovnání dvou skupin čitelné.

### `punch` — pointa
```json
{ "type": "punch", "dur": 3.0, "emotion": "sad", "tone": "bad",
  "text": "Méně než polovina", "basis": "16,1 / 34,8 = 0,46 (článek: „méně než polovina“)",
  "line": "To je *méně než polovina*." }
```
Plácnutý nápis přes scénu (otřes, zoom) + zvuk podle `tone`: `bad` = smutný
trombon (wah-wah-waaah) a hudba ztichne do mollu, `good` = ta-da, `warn` = boing.
`basis` (povinné) — výpočet nebo věta z článku, ze které pointa plyne. `text`
≤ ~20 znaků (2 řádky).

### `outro` — koncová karta (poslední beat, povinný)
```json
{ "type": "outro", "dur": 2.8, "line": "Proč? Mrkni do bia!", "cta": "Celý rozbor → odkaz v biu" }
```
Logo HSPA Monitor + doména, jantarová výzva `cta`, `source_line`, „Animace a text:
AI · redakce HSPA Monitor". Kompík velký, mává, střelka se vrátí na 35° s cinknutím.
`line` Kompík jen „zažvatlá" (bublina se na kartě nezobrazuje).

## Doporučené délky

| Beat | dur |
|---|---|
| intro | 2,4–3,0 |
| say | 1,8–3,0 |
| group | 3,0–3,6 |
| punch | 2,6–3,2 |
| outro | 2,5–3,0 |

Typická skladba: `intro → group → group → punch → outro` (≈ 15 s) nebo
`intro → say → group → punch → outro` (jedna skupina + kontext).

## Rozšiřování

Nový typ beatu, emoce nebo gesto = změna v `lib/scene.js` (`BEAT_TYPES`,
`EMOTIONS`, `GESTURES`, vykreslení + zvuk v `audioTrack`) + test v
`tests/reels-engine.test.js` („všechny typy beatů…") + tento soubor.
