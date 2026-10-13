# Styl „Florence komentuje"

Druhý formát animovaných příspěvků, vedle „Kompík vysvětluje". **Kompík vysvětluje**
(světlá scéna, postavičky, bublina, laskavý tón). **Florence komentuje**: tmavá scéna
osvětlená její lampou, velké titulky po kouscích jako na TikToku, rychlé střihy,
jedno číslo nasvícené lampou a ironický nadhled. Cíl je zastavit scroll.

| | Kompík vysvětluje | Florence komentuje |
|---|---|---|
| Kdo | maskot, živý kompas | Florence, AI autorka portálu |
| Scéna | světlý písek, postavičky | noc, záře lampy, prach ve světle |
| Text | bublina, slova se odkrývají | titulky po 1–3 slovech uprostřed, aktivní slovo svítí |
| Číslo | dav postaviček + cedule | jedno velké číslo, lampa ho nasvítí, „boom" |
| Zvuk | veselá smyčka, žvatlání | noční groove, psací stroj, hluboký úder |
| Tón | údiv, radost, smutek | ironie, skepse, pointa s mrknutím |
| Kdy | srovnání dvou čísel | paradox, mýtus, „prý…", komentář k debatě |

Výstup: `assets/social/reels/florence-<slug-článku-bez-clanek->.mp4` + plakát. Scénář:
`social/reels/scripts/florence-<…>.json` s `"style": "florence"`.

## Florence (postava)

Kód je v `social/reels/characters/florence.js`, modelový list
v `assets/brand/maskot/florence-list.png` a tvář v `florence-avatar.png`.

- **Vzhled:** kreslená podoba avataru z `autor-florence.html`. Tmavé vlasy s copánkovou
  korunou a pramínky, štíhlá postava v projmutém čokoládovém sametovém saku, bílá
  halenka s krajkovým límcem a jantarovou broží, modré oči s řasami a linkami, rtěnka,
  náušnice, znaménko krásy.
- **Je krásná a sebevědomá. Šarm, ne lascivnost.** Mrkne, ušklíbne se, zvedne obočí,
  posvítí lampou. Nemá výstřih ani vyzývavé pózy. Je to tvář zdravotnického portálu
  a sítě „lechtivý" obsah omezují v dosahu, takže by to virálnosti uškodilo.
- **Lampa** odkazuje na Florence Nightingale, „dámu s lampou", která přesvědčovala
  daty. V beatu `number` Florence lampou nasvítí číslo.
- **AI je vždy vidět** (GOVERNANCE § 6.5). Postava nosí na klopě odznak „AI" a nahoře
  je stále štítek „FLORENCE · AI AUTORKA". Koncová karta říká „AI autorka HSPA Monitoru"
  a „Text a animace: AI". Nic z toho se neodstraňuje, hlídá to test.
- **Hlas:** nemluví nahlas. Její text nesou titulky, pod nimi cvakají klávesy.

| `mood` | Kdy |
|---|---|
| `neutral`, `smile` | výklad, koncová karta |
| `smirk` | „prý…", ironický háček |
| `skeptic` | mýtus, „dotazník neměří…" |
| `unimpressed` | „a to jako vážně?" |
| `shocked`, `excited` | překvapivé číslo |
| `sad` | špatná zpráva bez ironie |
| `wink` | pointa, koncová karta |

`gesture`: `idle` · `point` (ukazuje na titulek) · `lamp` (zvedne lampu; výchozí
u `number`) · `chin` (přemýšlí) · `facepalm` · `shrug` · `wave` (výchozí u `outro`).

## Scénář

```json
{
  "slug": "florence-cekani-specialista",
  "style": "florence",
  "article": "clanek-cekani-specialista.html",
  "kicker": "Paradox dostupnosti",
  "facts": [ { "id": "cz", "value": "28", "source": "…", "quote": "doslovná věta z článku" } ],
  "footnote": "Medián čekání na první konzultaci u ambulantního specialisty",
  "source_line": "Zdroj: OECD Health at a Glance 2024",
  "beats": [
    { "type": "hook", "dur": 2.4, "mood": "smirk", "line": "Prý máme nejdostupnější péči v EU." },
    { "type": "number", "dur": 3.0, "mood": "shocked", "fact": "cz", "value": "28",
      "label": "dní čekání na specialistu",
      "compare": { "fact": "oecd", "label": "Průměr OECD", "value": "18" },
      "line": "Na specialistu čekáme…" },
    { "type": "say", "dur": 3.3, "mood": "skeptic", "gesture": "point",
      "line": "Dotazník neměří dostupnost. Měří *očekávání*." },
    { "type": "outro", "dur": 2.8, "mood": "wink", "cta": "Celý rozbor → odkaz v biu" }
  ]
}
```

| Beat | Co dělá | Povinné |
|---|---|---|
| `hook` (první) | titulky od 1. snímku, Florence vyjede zespodu | `line` |
| `say` | komentář v titulcích, výraz a gesto | `line` |
| `step` | krok návodu: seznam kroků vlevo nahoře (aktuální jantarový, hotové s fajfkou), titulky pod ním | `line`, `title` (≤ 40 znaků), `basis`; volitelně `n` |
| `number` | titulek nad číslem, lampa, počítání a úder (0,85 s), pak `label` a `compare` | `fact`, `label` |
| `outro` (poslední) | Florence · AI autorka, výzva, doména, zdroj a „Text a animace: AI" | — |

- **Titulky** se samy dělí na kousky po 1–3 slovech (≤ 16 znaků). Kousek končí
  na interpunkci, nerozdělí „0,3 %" ani předložku. `*zvýraznění*` dostane jantarový štítek.
- **Celková délka** 8–20 s, ideál 14–17 s. Střih (nový beat) každé 2,4–3,3 s.
- **Fakta** platí stejně jako u Kompíka. Každé napsané číslo (titulky, `label`,
  `compare.label`, `cta`) musí být hodnotou, rokem nebo číslem z citace faktu.
  **I komentář musí stát na článku:** „Dotazník měří očekávání" je v článku doslova,
  „zvykli jsme si čekat" je parafráze věty z článku. Ironie míří na systém a na
  paradox, **nikdy na lidi, profese ani konkrétní osoby**.

## Dramaturgie

1. **Háček je hned slovo.** První snímek už nese titulek. Nejlépe fungují:
   „Prý…", „Všichni říkají…, ale…", „Tohle číslo mě zarazilo." nebo otázka.
2. **Číslo do 3. sekundy**, nasvícené lampou, se srovnáním.
3. **Twist:** proč číslo neznamená to, co se zdá (paradox, metodika, souvislost).
4. **Pointa s nadhledem**, nejlépe krátká věta („Zvykli jsme si *čekat*.").
5. **Outro s mrknutím** a výzvou do bia.

## Na šířku (`"format": "landscape"`)

16:9 1920×1080 pro vložení do webu, strop 35 s. Florence stojí vpravo a svítí
lampou do textu, titulky, číslo a seznam kroků jsou vlevo (střed x 700). Beat
`step` dělá z Florence průvodkyni: „krok jedna… krok dva…" se skládá do seznamu.
Vzor: `scripts/florence-poplatky-stiznost.json` (stížnost na poplatek v pěti
krocích, 32 s). Velká čísla s mezerami („1 000 000 Kč") se načítají celá.
