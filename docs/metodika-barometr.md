# Metodika — Barometr politických prohlášení

> Veřejná metodika projektu Zdravé Česko (Skóre zdravotnictví). Tento dokument
> je závazný ve dvou směrech: čtenáři vysvětluje, jak Barometr čte politické
> sliby a výroky, a redakčnímu systému definuje **přesné enumy a rozhodovací
> pravidla** — validátor (`ingest/validate-barometr.js`) i UI z něj přímo
> vycházejí. Změna metodiky = změna tohoto dokumentu s viditelným záznamem
> v changelogu datasetu.

**Dataset:** `data/barometr.json` · **Souvisí:** `data/indicators.json`
(indikátory a trendy), `data/legislativa.json` (legislativní radar a plán),
`data/claims.json` (registr tvrzení z článků).

---

## 1. Co Barometr je a co není

Barometr politických prohlášení drží politiku za slovo **daty, která už
měříme**. Skládá se ze dvou částí:

- **Závazky** — sliby z programového prohlášení vlády a veřejných vystoupení
  ministra zdravotnictví, přeložené na falzifikovatelné checkpointy a průběžně
  vyhodnocované proti indikátorům a legislativnímu procesu.
- **Ověřovna** — jednotlivé výroky politiků o zdravotnictví, konfrontované
  s indikátory a primárními zdroji.

**Étos (závazné zásady):**

1. **Žádné predikce.** Nehodnotíme, co se „asi stane". Stavy a verdikty se
   počítají výhradně ze zveřejněných dat a doložitelných událostí.
2. **Žádné motivy.** Nepřipisujeme úmysl („lže", „klame", „chce zakrýt").
   Hodnotíme vztah výroku k datům, ne osobu.
3. **Verbatim citace.** Každý závazek i výrok citujeme doslova, se zdrojem
   (název, URL) a datem. Parafráze nikdy nenahrazuje citaci.
4. **Zamrazená baseline.** Výchozí hodnota indikátoru se fixuje k datu slibu
   a už se nemění (s výjimkou zpětné revize zdrojových dat — viz § 6).
5. **Interpretace je naše — a lze ji rozporovat.** Překlad slibu na měřitelný
   checkpoint je redakční krok, viditelně oddělený od citace. Kdo nesouhlasí
   s interpretací, rozporuje interpretaci, ne citaci.
6. **Právo na odpověď a viditelné opravy.** Viz § 6.

---

## 2. Závazek vs. interpretace

Každá položka Závazků má dvě přísně oddělené vrstvy:

| Vrstva | Pole v datasetu | Kdo za ni ručí | Lze rozporovat? |
|---|---|---|---|
| **Závazek** | `citace_verbatim` + `zdroj {nazev, url, datum}` | autor výroku (vláda, ministr) | ne — je to doslovný citát z primárního zdroje |
| **Interpretace** | `interpretace` + `linked_indicators` + `legislativa_ids` | redakce Zdravého Česka | ano — je to náš falzifikovatelný checkpoint |

**Pravidla pro závazek (citaci):**

- Citace musí být **doslovná** a dohledatelná v primárním zdroji (programové
  prohlášení na vlada.gov.cz, tisková zpráva MZ, stenozáznam, oficiální
  dokument). Zdroj se uvádí s URL a datem vzniku dokumentu.
- Citace nesmí vynechat část věty, která mění smysl (podmínky, termíny,
  „budeme usilovat" vs. „zajistíme").

**Pravidla pro interpretaci (checkpoint):**

- Interpretace překládá slib na **měřitelný obsah**: který indikátor
  (z `data/indicators.json`) by se měl pohnout kterým směrem, případně jaký
  legislativní krok (z `data/legislativa.json`) má nastat.
- Interpretace musí být **falzifikovatelná**: musí být předem jasné, jaká data
  by znamenala „plní se" a jaká „opačný směr".
- Interpretace volí **nejbenevolentnější rozumné čtení** slibu (steel-man):
  pokud slib jde číst více způsoby, měříme ten, který je pro slibujícího
  nejpříznivější a přitom má věcný obsah.
- Ke každému měřitelnému závazku se fixuje **baseline**: poslední hodnota
  indikátoru dostupná k datu slibu (`baseline_value`, `baseline_year`
  z pole `trend`) a chtěný směr (`direction_wanted`).

---

## 3. Taxonomie stavů závazků

### 3.1 Enum `stav` — kanonický výčet

Validátor a UI používají **přesně tyto strojové hodnoty** (snake_case, ASCII):

| `nazev_enum` | Česká UI label | Rozhodovací pravidlo (zkráceně) |
|---|---|---|
| `nema_meritelny_obsah` | Nemá měřitelný obsah | Ze slibu nelze odvodit falzifikovatelný checkpoint — žádný indikátor, žádný doložitelný legislativní akt, žádná ověřitelná událost. Přiděluje se při interpretaci a bez reinterpretace se nemění. |
| `ceka_na_data` | Čeká na data | Checkpoint existuje, ale od data slibu ještě nebylo publikováno žádné nové datové období indikátoru ani nenastal (a podle harmonogramu ještě nemusel nastat) sledovaný legislativní krok. Neutrální výchozí stav měřitelných závazků. |
| `plni_se` | Plní se | Nová data se pohybují chtěným směrem nad toleranční pásmo (§ 3.3), nebo sledovaný legislativní proces postupuje vpřed (§ 3.4). |
| `bez_pohybu` | Bez pohybu | Nová data jsou k dispozici, ale změna od baseline leží uvnitř tolerančního pásma; nebo legislativní krok měl podle harmonogramu nastat a nenastal. |
| `opacny_smer` | Opačný směr | Nová data se pohybují proti chtěnému směru nad toleranční pásmo; nebo byl sledovaný předpis stažen/zamítnut, případně byl přijat krok jdoucí proti závazku. |
| `splneno` | Splněno | Číselný cíl doložitelně dosažen, nebo slíbený jednorázový akt doložitelně vykonán (předpis platný, program spuštěn). Terminální stav — viz § 3.5. |

Poznámka k odchylce od pracovního konceptu: koncept počítal s pěti stavy;
metodika přidává `ceka_na_data`, protože označit čerstvý závazek „bez pohybu"
dřív, než vůbec mohla vyjít nová data, by bylo nefér vůči slibujícímu.
„Bez pohybu" je zjištění z dat, ne default.

### 3.2 Baseline — zamrazení výchozího bodu

- `baseline_value` a `baseline_year` = **poslední hodnota v poli `trend`
  indikátoru dostupná k datu slibu** (`zdroj.datum`). U ročních dat to typicky
  znamená rok předcházející slibu — např. slib z března 2026 dostane baseline
  z roku 2024 nebo 2025 podle toho, co bylo v době slibu publikováno.
- Pokud datová řada začíná až po datu slibu, baseline = první dostupná hodnota
  po slibu; tato výjimka musí být uvedena v `interpretace`.
- Baseline se po zafixování **nemění**. Jedinou výjimkou je zpětná revize
  zdrojových dat (statistický úřad opraví historickou hodnotu) — pak se
  baseline opraví na revidovanou hodnotu téhož roku a změna se zapíše do
  changelogu (§ 6).

### 3.3 Rozhodovací pravidla — indikátorová větev

Pro závazek s `linked_indicators` se stav počítá z **poslední publikované
hodnoty** indikátoru (poslední záznam `trend`) proti baseline. Definice:

- **Pokrok** `P` = (poslední hodnota − `baseline_value`), se znaménkem
  otočeným, pokud `direction_wanted = lower_is_better`. Kladné `P` = pohyb
  chtěným směrem.
- **Toleranční pásmo** `T` = max(0,5 % z |`baseline_value`|, rozlišení řady).
  *Rozlišení řady* = 10^(−d), kde `d` je největší počet desetinných míst,
  s nímž zdroj hodnoty v `trend` publikuje (např. naděje dožití na 1 desetinné
  místo → rozlišení 0,1). Pásmo brání tomu, aby se šum zaokrouhlení vydával
  za trend.

Algoritmus (vyhodnocuje se v tomto pořadí, první platné pravidlo vyhrává):

1. Závazek bez checkpointu → `nema_meritelny_obsah` (přiděleno při
   interpretaci, algoritmus ho nemění).
2. Má-li závazek **explicitní číselný cíl** a poslední hodnota ho dosáhla
   (ve směru `direction_wanted`) → `splneno`.
3. Není-li od data slibu publikováno žádné nové datové období
   (poslední `trend.year` ≤ `baseline_year`) → `ceka_na_data`.
4. `P > +T` → `plni_se`.
5. `P < −T` → `opacny_smer`.
6. Jinak (|`P`| ≤ `T`) → `bez_pohybu`.

**Minimální délka pozorování a roční data:**

- Stav `plni_se` / `opacny_smer` / `bez_pohybu` vyžaduje **alespoň jedno celé
  nové datové období** publikované po datu slibu. U ročních řad (většina
  indikátorů) to znamená: slib z roku 2026 se poprvé věcně vyhodnotí, až vyjdou
  data za rok 2026 (typicky v roce 2027); do té doby `ceka_na_data`.
- Stav se přepočítává, jen když do `trend` přibude nový datapoint (noční
  rutina) — ne podle kalendáře.
- Je-li k dispozici **jen jedno** nové období, `stav_duvod` to musí výslovně
  uvést („zatím jediné nové datové období") — jednoletá změna může být výkyv.
- Je-li nových období více a trajektorie není monotónní (např. zlepšení, pak
  zhoršení), rozhoduje **kumulativní** srovnání poslední hodnoty s baseline
  (kroky 4–6); `stav_duvod` popíše průběh.
- Slib daný v průběhu roku se přičítá k dobru/tíži až od prvního **celého**
  období po slibu; hodnota za rok, v němž byl slib vysloven, se komentuje
  v `stav_duvod`, ale sama o sobě stav nemění, pokud byla většina roku před
  slibem. Hraniční případy rozhoduje redakce ve prospěch slibujícího
  (steel-man) a zdůvodní to v `stav_duvod`.

**Více indikátorů u jednoho závazku:** interpretace určí, který indikátor je
**primární** (rozhoduje o stavu); ostatní jsou kontextové a komentují se
v `stav_duvod`. Bez určení primárního indikátoru platí: stav = nejhorší
z vyhodnocených stavů se mění pouze tehdy, shodují-li se všechny indikátory;
jinak `bez_pohybu` s vysvětlením rozporu. (Doporučení: primární indikátor
určovat vždy.)

### 3.4 Rozhodovací pravidla — legislativní větev

Pro závazek, jehož checkpoint je legislativní akt (`legislativa_ids` na
`data/legislativa.json`), se stav odvozuje z fází radaru
(`pripominky → vyporadani → vlada → parlament → dokonceno`), případně z plánu
legislativních prací (`plan_items`, pole `plan_termin`):

1. Předpis nabyl platnosti (fáze `dokonceno` a předpis vyhlášen) a slib
   nezahrnuje nic dalšího → `splneno`.
2. Předpis je v procesu a od data slibu, nebo za posledních 12 měsíců, se
   posunul o fázi vpřed → `plni_se`.
3. Předpis v procesu bez posunu fáze déle než 12 měsíců, **nebo** plánovaný
   termín předložení (`plan_termin`) uplynul a materiál není ve VeKLEP,
   **nebo** od slibu uplynulo více než 6 měsíců a proces vůbec nezačal
   → `bez_pohybu`.
4. Předpis byl stažen či zamítnut, nebo byl přijat akt jdoucí proti obsahu
   závazku → `opacny_smer`.
5. Proces nezačal a lhůty z bodu 3 ještě neuplynuly → `ceka_na_data`.

**Kombinovaný závazek** (indikátor i legislativa): interpretace určí primární
větev; druhá větev se komentuje v `stav_duvod`. Typicky je legislativa
prostředek a indikátor cíl — pak je primární indikátorová větev, dokud
existují data, a legislativní větev slouží jako předstihový signál.

### 3.5 Stav `splneno` a sliby typu „udržíme"

- `splneno` je **terminální** u jednorázových aktů (přijetí zákona, spuštění
  programu) a u dosažení číselného cíle bez udržovací složky.
- Sliby typu **„udržíme / nezhoršíme X"** nemohou být `splneno` průběžně —
  vyhodnocují se stavy `plni_se` / `bez_pohybu` / `opacny_smer` po celé
  sledované období (typicky volební období) a `splneno` až po jeho konci.
- Pokud se po `splneno` objeví skutečnost, která splnění zpochybní (zákon
  zrušen dřív, než nabyl účinnosti; cíl dosažen jen změnou metodiky výpočtu),
  stav se změní zpět s povinným záznamem v changelogu.

### 3.6 `stav_duvod`, `stav_od` a `historie`

- `stav_duvod` je **věcné zdůvodnění s čísly**: baseline → aktuální hodnota,
  rok, zdroj; u legislativy fáze a data. Žádná hodnocení osob, žádné motivy.
- `stav_od` = datum, kdy aktuální stav začal platit (datum přepočtu, který ho
  nastavil).
- Každá změna stavu přidává záznam do `historie[]` (starý stav, nový stav,
  datum, důvod). Historie se nikdy nemaže.

---

## 4. Taxonomie verdiktů Ověřovny

### 4.1 Co Ověřovna hodnotí

Ověřovna hodnotí **faktická tvrzení** ve veřejných výrocích politiků
o zdravotnictví. Nehodnotí:

- **hodnotové postoje** („považuji za správné…") — nejsou faktickým tvrzením,
- **predikce a záměry** („příští rok bude…", „chystáme…") — nelze je ověřit
  daty; záměry patří do Závazků, ne do Ověřovny,
- **výroky bez dohledatelného primárního záznamu** (z doslechu, bez URL) —
  takové se do datasetu vůbec nezařazují.

### 4.2 Enum `verdikt` — kanonický výčet

| `nazev_enum` | Česká UI label | Rozhodovací pravidlo (zkráceně) |
|---|---|---|
| `sedi_s_daty` | Sedí s daty | Všechna faktická tvrzení výroku odpovídají nejlepším dostupným datům v rámci tolerance (§ 4.3) a výrok nezamlčuje kontext, který by vyznění obrátil. |
| `nesedi` | Nesedí s daty | Alespoň jedno **ústřední** tvrzení výroku je v rozporu s daty nad toleranci — a to i při nejbenevolentnějším rozumném čtení (steel-man). |
| `zavadejici_kontext` | Zavádějící kontext | Jednotlivá čísla sedí (v toleranci), ale výběr, srovnání nebo rámování zamlčuje kontext, který podstatně mění vyznění — např. účelově zvolený výchozí rok, záměna ukazatelů či základů (absolutní vs. relativní), vydávání korelace za kauzalitu. |
| `neoveritelne` | Neověřitelné | K ústřednímu tvrzení neexistují veřejná data ani primární zdroj, které by ho potvrdily nebo vyvrátily. Konstatování o limitech dat, ne hodnocení mluvčího. |

Pořadí vyhodnocení: nejprve se testuje `nesedi` (rozpor ústředního tvrzení),
poté `zavadejici_kontext` (čísla sedí, vyznění ne), poté `sedi_s_daty`;
`neoveritelne` platí, kdykoli chybí data k ústřednímu tvrzení.

### 4.3 Tolerance pro čísla ve výrocích

Číslo ve výroku „odpovídá datům", pokud se od doložené hodnoty liší nejvýše o:

- **zaokrouhlení, s nímž mluvčí číslo uvedl** (řekne-li „zhruba 80 miliard"
  a doložená hodnota je 78,4 mld., sedí), **nebo**
- **5 % relativně** k doložené hodnotě,

podle toho, co je pro mluvčího **benevolentnější**. U výroků o směru („roste",
„klesá") se ověřuje směr posledního meziročního pohybu i delší trend — pokud
se liší, patří to do posouzení kontextu.

### 4.4 Pravidla férovosti (závazná)

1. **Celý výrok.** Cituje se celá relevantní pasáž (`vyrok_verbatim`), ne
   ustřižená věta. Kdo, v jaké funkci, kdy a kde (`kdo`, `funkce`, `kdy`,
   `kde {nazev, url}`) — vždy s URL primárního záznamu.
2. **Steel-man.** Připouští-li výrok více čtení, verdikt se opírá o to
   nejbenevolentnější rozumné. Verdikt `nesedi` padne jen tehdy, když výrok
   nesedí ani při něm.
3. **Data doby výroku.** Výrok se poměřuje daty, která byla **veřejně
   dostupná v době výroku**. Vyjdou-li později revidovaná čísla, verdikt se
   nemění zpětně v neprospěch mluvčího; revize se zmíní ve
   `verdikt_zduvodneni`. (Mluvčí nemohl znát data, která ještě neexistovala.)
4. **Ústřední vs. vedlejší tvrzení.** Verdikt se vztahuje k ústřednímu
   tvrzení výroku. Drobná nepřesnost ve vedlejším údaji nesráží výrok na
   `nesedi` — komentuje se ve zdůvodnění. Obsahuje-li výrok více ústředních
   tvrzení s různými verdikty, rozdělí se na více položek.
5. **Čísla se zdrojem.** `verdikt_zduvodneni` musí citovat konkrétní hodnoty
   s odkazem na zdroj (`data/indicators.json`, `data/claims.json`, primární
   zdroj s URL). Verdikt bez čísel je nepřípustný — s výjimkou
   `neoveritelne`, kde se místo čísel uvádí, jaká data chybí a kde jsme je
   hledali.
6. **Žádné motivy.** Verdikt popisuje vztah výroku k datům. Slova jako „lže",
   „klame", „manipuluje" do zdůvodnění nepatří.

---

## 5. Kdo a kdy stavy přepočítává

- **Noční rutina** (viz `05_M1_Starter/PROMPT_NIGHTLY_ROUTINE.md`) přepočítává
  stavy závazků, kdykoli do `data/indicators.json` přibudou nová data nebo se
  posune fáze v `data/legislativa.json`. Změna stavu = aktualizace
  `stav`, `stav_duvod`, `stav_od` + záznam v `historie[]`.
- **Denní rutina** (viz `PROMPT_DAILY_ROUTINE.md`) navrhuje kandidáty na nové
  výroky do Ověřovny; verdikt smí být přidělen až po plném postupu podle § 4.
- Změna stavu závazku nebo verdiktu je **redakční událost** — kandidát na
  článek či příspěvek na sítích.

---

## 6. Právo na odpověď, opravy a changelog

**Právo na odpověď.** Každý, jehož závazek či výrok Barometr hodnotí (politik,
ministerstvo, instituce), má právo na odpověď. Kontakt:
**josef@josefpavlovic.cz** (redakční kontakt projektu). Odpověď zveřejníme
u příslušné položky — odkazem nebo citací. Ukáže-li odpověď věcnou chybu
(v citaci, baseline, výpočtu nebo interpretaci), opravíme ji.

**Opravy = viditelný changelog.** Žádná tichá editace:

- Každá oprava stavu, verdiktu, citace nebo baseline se zapisuje do
  `meta.changelog[]` v `data/barometr.json` (datum, položka, co se změnilo,
  proč) a u závazků navíc do `historie[]` položky.
- Oprava vyvolaná odpovědí dotčené strany se v changelogu jako taková označí.
- Changelog je součástí veřejného datasetu — historie hodnocení je dohledatelná
  stejně jako hodnocení samo.

**Reinterpretace.** Ukáže-li se interpretace závazku jako nefér nebo věcně
vadná (např. zvolený indikátor slib ve skutečnosti neměří), lze ji změnit —
vždy přes changelog, s novou baseline fixovanou k **původnímu** datu slibu
(nikdy k datu reinterpretace).

---

## 7. Shrnutí enumů pro validátor

Kanonické hodnoty, které `ingest/validate-barometr.js` vynucuje:

```
commitments[].stav ∈ {
  "nema_meritelny_obsah",
  "ceka_na_data",
  "plni_se",
  "bez_pohybu",
  "opacny_smer",
  "splneno"
}

statements[].verdikt ∈ {
  "sedi_s_daty",
  "nesedi",
  "zavadejici_kontext",
  "neoveritelne"
}
```

Doplňující invarianty plynoucí z metodiky (vynucuje validátor):

- `citace_verbatim` / `vyrok_verbatim` nesmí být prázdné a musí mít zdroj
  s URL a datem (§ 1, § 2, § 4.4).
- Závazek se `stav ≠ nema_meritelny_obsah` musí mít alespoň jeden checkpoint:
  neprázdné `linked_indicators` (každý s `baseline_value`, `baseline_year`,
  `direction_wanted`) **nebo** neprázdné `legislativa_ids` (§ 2, § 3).
- `linked_indicators[].id` musí existovat v `data/indicators.json`;
  `legislativa_ids` musí existovat v `data/legislativa.json` (FK integrita).
- `stav_duvod` je povinný u všech stavů kromě `ceka_na_data`;
  `verdikt_zduvodneni` je povinné vždy (§ 3.6, § 4.4 bod 5).
- Každá položka `historie[]` a `meta.changelog[]` nese datum a důvod (§ 6).
