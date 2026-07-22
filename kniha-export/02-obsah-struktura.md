# Skóre zdravotnictví 2026 — Obsahová struktura
## Kompletní osnova, díly, kapitoly a mapování článků

> Tento dokument je **stavební plán knihy**. Definuje pořadí a členění: front
> matter → 8 dílů → zadní matter. Každá kapitola = jeden článek webu, převedený
> skriptem do `manuskript/`. Strojově čitelná verze je v
> `podklady/article-manifest.json`.

---

## 0. Architektura knihy

Kniha má **tři vrstvy**, které se prolínají:

1. **Systémová páteř** (Díl I) — jak zdravotnictví funguje jako celek a jak se
   vůbec dá měřit a řídit. Toto je intelektuální rámec celé knihy; čtenář ho
   dostane hned na začátku, aby zbytek četl „systémovýma očima".
2. **Tematické díly** (Díly II–VIII) — konkrétní oblasti: peníze, dostupnost,
   kvalita, prevence, duševní zdraví, digitalizace, populace. Každý díl otevírá
   krátký **úvod dílu** (napíše redakce, viz §3) se scorecardem oblasti.
3. **Metodická a datová opora** (front + zadní matter) — jak číst, odkud data,
   jak citovat, glosář, rejstřík.

**Členění primárně tematické** (rubriky webu), se **sekundárním štítkem dimenze
HSPA** u každé kapitoly (Zdraví / Dostupnost / Kvalita / Bezpečnost / Efektivita /
Spravedlnost) a **oblasti OECD** (Výsledky / Výstupy / Procesy / Struktury).

**Rozsah:** 138 kapitol / ~353 000 slov v plné verzi (celý publikovaný korpus).
To je velmi tlustá kniha (~700+ stran čistého textu). Viz §4 — **kurátorské
úrovně** — pokud se cílí na štíhlejší svazek.

---

## 1. Front matter (přední matter)

| # | Strana | Obsah | Zdroj |
|---|---|---|---|
| 1 | Předtitul | Název | — |
| 2 | Tiráž | Vydavatel, rok, datový řez, citace, licence | `04-zdroje-metodika.md §6` |
| 3 | Titul | Název + podtitul + kompas | `01-design-system.md §6` |
| 4 | **Předmluva** | Proč kniha vznikla, vztah k dokumentu MZ | `manuskript/00-predmluva.md` |
| 5 | **Jak číst tuto knihu** | HSPA v kostce, 4 oblasti × 6 dimenzí, legenda signálů, co je ilustrativní | `manuskript/01-uvod-jak-cist.md` |
| 6 | **Jak jsme na tom — souhrn roku** | Dvoustrana: 8–12 klíčových čísel roku, hlavní teze | `manuskript/02-souhrn-roku.md` (redakce) |
| 7 | Obsah | Automaticky z nadpisů | — |

## 2. Zadní matter (back matter)

| Obsah | Zdroj |
|---|---|
| **Metodika a zdroje** | `04-zdroje-metodika.md` §1–§4, §7 |
| **Model systému a hry** (statická infografika + QR) | `03-grafy-spec.md §Interaktivní`; data `system-model.json`, `levers.json`, `reditel-hra.json`, `vyhlaska-hra.json` |
| **Glosář (výběr ~60 pojmů)** | `data/glossary.json` (110 → výběr klíčových) |
| **Rejstřík indikátorů** | `data/indicators.json` (id, název, hodnota, signál, díl) |
| **O projektu / redakce** | `o-projektu.html`, `redakce.html` |
| **Rejstřík pojmů a jmen** | Generuje sazba ze značek |

---

## 3. Úvody dílů (píše redakce — 6–8 vět + scorecard)

Každý díl otevírá levá titulní strana (master C, dimenzní barva) + pravá strana
s **úvodem dílu**: 1 odstavec „o co v této oblasti jde", 1 odstavec „jak jsme na
tom" a **scorecard oblasti** (3–5 klíčových indikátorů se signálem). Data pro
scorecardy: viz `linked_indicators` v manifestu a `data/indicators.json`.

Úvody dílů zatím **nejsou** v manuskriptu (nevznikají z článků) — jsou to nové
krátké texty. Připraveny jsou jako `manuskript/dil-N/00-uvod.md` šablony k
doplnění (viz `podklady/uvody-dilu.md`).

---

## 4. Kurátorské úrovně (volba rozsahu)

Manifest obsahuje **celý publikovaný korpus (138 kap.)**. Tři úrovně sazby:

| Úroveň | Rozsah | Jak vybrat |
|---|---|---|
| **A — Almanach (plný)** | 138 kap. / ~700+ str. | Vše z manifestu. |
| **B — Ročenka (doporučeno)** | ~70–85 kap. / ~300 str. | Všechny `verified` + systémový Díl I celý; z Dílu V (prevence, 38 kap.) vybrat ~18 (série epidemiologie, nápoje, klíčové screeningy/vakcinace). |
| **C — Esej (štíhlá)** | ~30 kap. / ~150 str. | Díl I celý + 2–3 nejsilnější `verified` z každého dalšího dílu. |

> Pro úroveň B/C stačí v manifestu smazat/zakomentovat řádky kapitol nebo přidat
> `"core": false` a spustit převod jen na `core` (skript lze snadno rozšířit).
> Sub-série (napoje 1-6, digi 1-5, epidemiologie 1-4, nárok 1-4, nadstandardy
> 1-3, czechsex 1-3, ai 1-2) drž **pohromadě nebo celé vynech** — jsou psané
> jako návazný celek.

---

## 5. Kompletní osnova (8 dílů, 138 kapitol)

> Pořadí v rámci dílu: `verified` nejdřív, pak `review-pending`, pak `partial`
> (dá se přeskládat dle dramaturgie). Značka `[audit]` je jen pracovní; do knihy
> se promítá jako diskrétní marginální poznámka jen u ne-`verified` (viz metodika).
> `↔` = kapitola tvoří návaznou sérii se sousedy.

### DÍL I — Jak systém funguje a jak se měří (10 kap.) · barva `#5F4A8C`
*Systémová páteř knihy. Řízení podle výsledků, teorie změny, komplexita reforem,
páky, data, governance, poslední míle, PROMs, evaluace. Sem patří statická mapa
Modelu systému + odkaz na hry (Tři židle).*
1. Měřit, co je důležité — řízení podle výsledků `[verified]`
2. Teorie změny a logický model `[verified]`
3. Proč se systémy nereformují samy: komplexita a okno příležitosti `[verified]`
4. Systémové mapování a páky změny `[verified]`
5. Datová páteř, interoperabilita a past dodavatele `[verified]`
6. Ukazatele a dashboard, který vede k akci `[verified]`
7. Governance, nezávislost měřičů, mezirezortní koordinace `[verified]`
8. Poslední míle: proč reformy selžou při zavádění `[verified]`
9. PROMs a PREMs — pacientské výsledky jako „missing middle" `[verified]`
10. Adaptivní evaluace a učení za pochodu `[verified]`

### DÍL II — Peníze: kdo platí a za co (27 kap.) · barva `#88531F`
*Financování, deficit, platba státu, platba z kapsy, VBHC, generika, dohodovací
řízení, K-index, nárok pojištěnce, nadstandardy.*
1. Strukturální deficit zdravotního pojištění 2026 · 2. 8,6 % HDP — co stojí zdravotnictví · 3. Anatomie financování (SHA) · 4. HTA / Joint Clinical Assessment (EU 2021/2282) · 5. Nárok pojištěnce — co to je ↔ · 6. Nárok pojištěnce — co s tím ↔ · 7. Jednodenní chirurgie (katarakta) · 8. NKÚ / REACT-EU kontrola · 9. Diabetické amputace · 10. AZV — zdravotnický výzkum · 11. Platit za výsledek (VBHC) · 12. Gender pay gap · 13. Generika a biosimilars · 14. Dlouhodobá péče — výdaje · 15. Nadstandardy 1 ↔ · 16. Nadstandardy 2 (Irsko/Kanada) ↔ · 17. Nadstandardy 3 (český nárok) ↔ · 18. Nejdražší smlouvy nemocnic · 19. K-index nemocnic · 20. Mobilní paliativní týmy · 21. Dohodovací řízení 2027 · 22. Katastrofické výdaje · 23. Výdaje na duševní zdraví · 24. Platba z kapsy · 25. Platba za výsledek (VZP) · 26. Platba státu za státní pojištěnce · 27. Deficit VZP 2026

### DÍL III — Dostupnost: dostat péči včas (17 kap.) · barva `#2C5A8A`
1. Praktik jako uzel systému (primární péče 2027) · 2. Centralizace onkochirurgie 2027 · 3. Nejvíc hospitalizací v OECD · 4. Reforma pohotovostí (290/2025) · 5. Generační propast v ošetřovatelství · 6. Hospicová lůžka · 7. Úmrtí doma vs. hospic ↔ · 8. Radioterapie — gama nůž, protony · 9. Nesplněná potřeba zubní péče · 10. Reforma dlouhodobé péče · 11. Paliativní péče do zákona · 12. Sociálně-zdravotní pomezí (38/2025) · 13. Okresní nemocnice — personální krize · 14. Přeshraniční záchranka ČR–SR · 15. Farmaceuti — pracovní síla · 16. Dárcovství krve a plazmy · 17. Čekací doba na kyčel

### DÍL IV — Kvalita a bezpečnost péče (17 kap.) · barva `#9C3450`
1. Vzácná onemocnění — strategie 2035 · 2. Onkologický koordinátor 2026 · 3. Rezistence antibiotik (ciprofloxacin) · 4. Dárcovství orgánů — tichý rekord ↔ · 5. Epiziotomie · 6. Pooperační sepse · 7. Léčitelná mortalita · 8. Přežití — karcinom prsu · 9. Transplantace / dárcovství orgánů ↔ · 10. Nemocnice v horku · 11. Polypragmazie seniorů · 12. Spotřeba antibiotik · 13. NIKEZ — jak funguje · 14. Benzodiazepiny u seniorů · 15. Přežití — karcinom plic · 16. Včasná operace zlomeniny kyčle · 17. Preskripce u praktiků (1200 léků)

### DÍL V — Prevence: nejlevnější medicína (38 kap.) · barva `#2F6D4F`
*Nejobsáhlejší díl. Doporučená kurátorská redukce viz §4. Série drž pohromadě.*
1. Výdaje na prevenci · 2.–4. CZECHSEX 1–3 ↔ · 5. Očkování dětí (hexavakcína) · 6. Záškrt — úmrtí · 7. Klíšťová encefalitida · 8. Dětská obezita · 9. Pneumokok — senioři · 10. Nízká porodní hmotnost · 11. Zubní kaz dětí · 12. Jaterní mortalita (alkohol) · 13.–16. Epidemiologie 1–4 ↔ · 17. Zdravá škola SZÚ · 18. Medikalizace veřejného zdraví · 19. Černý kašel — epidemie · 20. Plicní screening · 21.–26. Nápoje 1–6 (cukr, džus, energeťáky, alkohol, co pít, daň) ↔ · 27. Tuberkulóza · 28. Pohlavní nemoci 2025 · 29. Vedro a tělo · 30. Screening kolorekta · 31. Centrum onkologické prevence MOÚ · 32. Záchrana srdce (OHCA) · 33. HIV — nové diagnózy · 34. Obezita — školní jídelny · 35. Interrupce · 36. Cholesterol — mapa obcí · 37. Institut veřejného zdraví · 38. Střet zájmů — výživa kojenců

### DÍL VI — Duševní zdraví (8 kap.) · barva `#2C7A87`
1. Dětská psychiatrie — krize · 2. Protidrogová politika na MZ · 3. Kouření adolescentů · 4. Psychiatrické hospitalizace (43 dní) · 5. Centra duševního zdraví · 6. Úmrtnost na předávkování · 7. Duševní zdraví matek (MoodPass) · 8. Sebevraždy mladistvých

### DÍL VII — Digitalizace a data (14 kap.) · barva `#2C5A8A`
1. EZKarta / eHealth (62 %) · 2. EHDS — evropský prostor dat · 3. Novela elektronizace 2026 · 4. AI Act a nemocnice · 5. Kybernetická bezpečnost (264/2025, NIS2) · 6.–9. Digi 2–5 (API, dvě vrstvy NCEZ, povinné/dobrovolné, strategie/EHDS) ↔ · 10. JA HEROES — plánování personálu · 11. NCEZ — financování 2027 · 12.–13. AI ve zdravotnictví 1–2 ↔ · 14. Digi 1 — co to je ↔

### DÍL VIII — Populace, zdraví a nerovnosti (7 kap.) · barva `#2F6D4F`
*Uzavírá knihu perspektivou spravedlnosti a demografie.*
1. Nárok vs. demografie 2050 · 2. Veterinární antibiotika (One Health) · 3. Naděje dožití podle vzdělání · 4. Zdravotní gramotnost · 5. Uhlíková stopa zdravotnictví · 6. Plné kojení — porodnice ↔ · 7. Kojení — obrat v porodnicích ↔

---

## 6. Mapování na soubory

- Strojově: `podklady/article-manifest.json` (`chapters[]`: `slug`, `dil`,
  `poradi`, `audit`, `coverViz`, `indicators`).
- Fyzicky: `manuskript/dil-<n>/<NN>-<slug>.md`.
- Grafy kapitoly: `03-grafy-spec.md` (klíč = `slug`), statika v `grafika/`.
- Zpětný odkaz na web: v patičce každého `.md` (`clanek-<slug>.html`).

## 7. Dramaturgické poznámky pro redakci/sazbu
- **Díl I je záměrně vpředu** — dává čtenáři systémovou optiku. Nezkracovat.
- **Sub-série** čti jako kapitolky jednoho oddílu (mezititulky, ne samostatné
  „Zdroje" u každé — sloučit).
- **Díl V redukovat** dle §4, jinak kniha vizuálně „spadne" do prevence.
- **Závěr knihy** (Díl VIII) laděn na nerovnosti + demografii = otevírá výhled
  „co dál", navazuje na tón předmluvy.
- **Křížové odkazy** mezi kapitolami (v článcích jako odkazy) převést na „viz
  kapitola X" — skript je nechává jako čistý text (nezanáší URL do knihy).
