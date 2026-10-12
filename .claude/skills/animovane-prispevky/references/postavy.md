# Postavy — Kompík a obsazení

## Kompík (maskot, tvář série „Kompík vysvětluje")

**Kdo to je.** Živý kompas — znak HSPA Monitoru, který se postavil na nohy. Tělo je
ciferník značky HSPA Kompas (kruh, rysky, index ▲ nahoře), na temeni má **střelku**.
Kód: `05_M1_Starter/social/reels/characters/kompik.js`. Modelový list:
`05_M1_Starter/assets/brand/maskot/kompik-list.png`.

**Povaha.** Zvědavý, poctivý, trochu dětsky nadšený z čísel. Nekáže a nemoralizuje —
diví se, raduje se, posmutní. Je na straně čtenáře: „pojď, podíváme se, jak to
doopravdy je". Nikdy nikoho nezesměšňuje (ani lidi v systému, ani politiky) —
smát se smí situaci a sobě.

**Hlas.** Nemluví lidskou řečí — **žvatlá** krátkými tóny po slabikách (jako Animal
Crossing). Text nese bublina, takže video funguje bez zvuku i se zvukem a nikoho
nenapodobuje. Otázka na konci stoupá.

**Jak mluví (text bublin).**
- Krátce, hovorově, v 1. osobě nebo oslovením „ty": „Kolik sester ročně vychová
  Česko?", „Skoro pětatřicet!", „Mrkni do bia!"
- Jedna replika = jedna myšlenka, ≤ 70 znaků, nejlépe 25–45.
- Čísla v řeči zaokrouhleně a slovy („šestnáct", „skoro polovina"); přesná hodnota
  stojí na ceduli pod skupinou.
- Opakované hlášky (budují rozpoznatelnost, používej střídmě):
  - na začátek: „Tak kudy?", „Počkej… kolik?", „Pojď se podívat!"
  - na pointu: „Střelka padá.", „Tohle ukazuje dobrým směrem!"
  - na konec: „Mrkni do bia!", „Celý rozbor v biu."

**Střelka = měřič nálady a ukazovátko** (podpis postavy, jediná červená věc):

| Emoce (`emotion`) | Střelka | Oči / pusa | Kdy |
|---|---|---|---|
| `curious` | 0° (po roztočení) | velké, pusa „o" | háček, otázka |
| `explain` | 35° — „správný směr" (úhel značky) | klidné, úsměv | výklad, neutrální fakt |
| `worried` | 72° | obočí stažené, rovná pusa, kapka potu | horší číslo, varování |
| `shocked` | 0° + vibruje | vykulené, ruce nahoru | překvapivé srovnání |
| `sad` | 118° — spadlá přes okraj | přivřené, smutná pusa | špatná pointa (`tone: bad`) |
| `happy` | 35° + vrtí se | ^ ^, široký úsměv, ruce nahoru | dobrá zpráva (`tone: good`) |
| `proud` | 35° | ^ ^, ruce v bok | zlepšení, úspěch |
| `skeptic` | 58° | jedno obočí nahoře, vlnitá pusa | mýtus, „říká se…" |

Emoce **musí sedět k obsahu**: dobrá zpráva se nehraje smutně, špatná se nezlehčuje
veselím. Signál článku (`good|warn|bad`) určuje tón pointy.

**Pohyb.** Výskok zespodu se squash & stretch, dýchání, při řeči se pohupuje,
mrká, při přesunu poskočí. Ukazuje rukou na skupinu, o které mluví. Na koncové
kartě mává a střelka se s cinknutím vrátí na 35°.

**Nesmí.** Mít jinou barvu než papír/inkoust (kromě hrotu), nosit loga, držet
léky/injekce jako rekvizitu doporučení, napodobovat skutečnou osobu, mluvit lidským
(syntetizovaným) hlasem bez rozhodnutí vydavatele.

## Obsazení (vedlejší postavičky)

Kód: `characters/cast.js` (`person({ role, … })`). Fazolka + kulatá hlava, tečkové
oči, stejná tlustá linka jako Kompík. Pestrost pleti a účesů řídí `seed`
(deterministicky) — skupina vypadá jako skutečný dav, ne klony.

| `role` | Poznávací znak | Typické použití |
|---|---|---|
| `sestra` | nebesky modrá uniforma, čepeček (bez kříže) | personál, absolventi, směny |
| `lekar` | bílý plášť, fonendoskop | lékaři, specialisté, ordinace |
| `pacient` | jantarový svetr | pacienti, pojištěnci, populace |
| `senior` | šedé vlasy, švestkový svetr, hůlka | stárnutí, dlouhodobá péče |
| `dite` | menší, zelené tričko | děti, očkování, dorost |
| `urednik` | šedý oblek, kravata | správa, úřady, pojišťovny (bez loga) |
| `zachranar` | zelená s reflexním pruhem | ZZS, pohotovosti |

Nálada skupiny: `mood` (`happy|neutral|sad|wow`), po pointě `punchMood`.
Postavičky **nejsou** karikatury profesí — sestra není „ta, co se nestíhá", senior
není „přítěž". Číslo ukazuje systém, ne vinu lidí.

**Nová role** = rozšířit `ROLES` v `cast.js` (jen povolené barvy z `lib/palette.js`),
přidat do modelového listu (`npm run brand:maskot`) a do této tabulky.
