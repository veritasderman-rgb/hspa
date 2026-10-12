# Dramaturgie — jak z čísla udělat skeč, který se šíří

Cíl: aby to člověk na mobilu **nepřescrolloval** v první vteřině, **dokoukal** do
konce (algoritmus měří hlavně dokoukání a opakování) a měl chuť to **poslat dál**
(„tohle jsi věděl?"). A přitom zůstat stejně věcný jako článek.

## Oblouk ve 4 dobách (≈ 15 s)

| Čas | Doba | Co se děje | Proč |
|---|---|---|---|
| 0–3 s | **Háček** | Kompík vyskočí, otázka nebo provokativní tvrzení | první vteřina rozhoduje o scrollu |
| 3–9 s | **Odhalení** | postavičky naskáčou, padne první číslo, pak srovnání | číslo *vidět tělem* je silnější než říct |
| 9–12 s | **Pointa** | plácnutý nápis + reakce Kompíka + zvuk | emoce = sdílení |
| 12–15 s | **Karta** | logo, odkaz v biu, zdroj | převod na web, důvěryhodnost |

Pravidlo: **první číslo do 4. sekundy**, pointa nejpozději v 70 % délky.

## Háčky (vyber jeden — navazují na `docs/social-copywriting-manual.md`)

1. **Otázka s číslem v odpovědi:** „Kolik sester ročně vychová Česko?" → odpověď je překvapení.
2. **Mýtus vs. realita:** Kompík `skeptic` + „Říká se, že…" → postavičky ukážou opak.
3. **Hádej:** „Víc, nebo míň než Slovensko?" → divák si tipne, dokouká kvůli odpovědi.
4. **Absurdní srovnání:** dvě skupiny, jedna o polovinu menší — rozdíl je vidět bez čtení.
5. **Dobrá zpráva, kterou nikdo nečeká:** `proud` / `happy` + `tone: good` (Česko je
   v něčem nejlepší — ta videa se sdílejí nejvíc, nepodceňuj je).

Nepoužívej: clickbait, který video nedoručí; strach („tohle vás zabije");
nadávky na systém. Háček musí být krytý číslem z článku.

## Vizuální metafory (žádné grafy — postavičky)

| Data | Metafora |
|---|---|
| počet na 100 000 / na 1 000 | dav postaviček 1:1 (dvě skupiny vedle sebe = „živý sloupec") |
| procento | 10 nebo 20 postaviček, část má `mood: sad` / jinou roli |
| trend dřív → teď | `label: "2010"` vs. `label: "2024"`, stejná role |
| region vs. region | dvě skupiny, `label` = kraj |
| čekání, fronta | postavičky `pacient` v řadě (`cols: 10`, jedna řada) |
| peníze | `urednik` jako „1 mld." (`per`) |

Stejné `cols` pro obě skupiny → rozdíl výšek davu je férové srovnání.

## Rytmus a zvuk

- Střih/změna každé **2–3,5 s** (nový beat). Nic statického déle než 3 s kromě karty.
- Každá postavička naskočí s „plopem" a stoupajícím tónem — divák *slyší* počítání.
- Pointa `bad` → hudba ztichne do mollu + smutný trombon (vtip, který nezlehčuje);
  `good` → ta-da.
- Video musí fungovat **bez zvuku** (bublina = titulky, velké číslo pod davem)
  i **se zvukem** (žvatlání, efekty, podkres). Hlasitost renderer normalizuje na −15 LUFS.

## Text

- Bublina ≤ 3 řádky, replika ≤ 70 znaků, ideálně 25–45. Slova se odkrývají, jak je
  Kompík „vyslovuje".
- `*Zvýraznit*` jen jedno klíčové slovo/číslo na repliku.
- Pointa (`punch.text`) ≤ 20 znaků: „Méně než polovina", „Nejvíc v Evropě",
  „Dvakrát víc".

## Rozvržení 9:16 (bezpečné zóny)

Horních ~230 px a spodních ~360 px překrývá UI Instagramu/TikToku (popisek, ikony,
tlačítka vpravo). Renderer drží odznak na y 250, bublinu od y 372, davy y 600–1080,
čísla y 1180–1230, Kompíka nohama na y 1490 a drobný text s účařím na y 1546. Nic klíčového
nevkládej mimo tyto zóny.

## Popisek k příspěvku (caption)

Krátký, podle `docs/social-copywriting-manual.md`: hák jednou větou (jiný než
v bublině, doplňující), číslo, „🔗 odkaz v biu", 3–5 hashtagů včetně
`#zdravícesko` a `#kompikvysvetluje`. Na konec vždy: „Animace: AI · data: <zdroj>".

## Série a formáty (opakovatelné)

- **Kompík vysvětluje** — jedno číslo z článku (výchozí).
- **Kompík vs. mýtus** — háček `skeptic`, „Říká se…", postavičky vyvrátí.
- **Hádej s Kompíkem** — otázka s tipem, odpověď v pointě.
- **Kompík má radost** — dobrá zpráva (`tone: good`).

Série = `series` ve scénáři (text odznaku). Držet jednu sérii týdně pohromadě
pomáhá rozpoznatelnosti.

## Měření

Po týdnu porovnat v Bufferu (`get_aggregated_post_metrics`) dosah a interakce reels
vs. statických Story karet stejného článku; o kadenci rozhoduje vydavatel na poradě.
