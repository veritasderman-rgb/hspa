# Systémový prompt: Rutina „Střet zájmů v poradních orgánech MZ"

**Stav:** zadání, čeká na schválení vlastníkem (session 2026-08-24).
**Výstup rutiny:** `data/ppo-coi.json` + globální a per-orgán statistiky.
**Vstupy:** `data/ppo.json`, `data/ppo-osoby.json`, `data/ppo-dvojrole.json`,
`data/ppo-analyza/*.json`, `ingest/ppo/osoby-externi.json`, Hlídač státu.

---

## 0) Železné pravidlo — čemu tahle rutina slouží a čemu NE

> **Střet zájmů není obvinění. Je to popis situace, ve které se člověk ocitl —
> a která se má přiznat, ne skrývat.**

Tohle je nadřazené všemu ostatnímu v dokumentu:

1. **Vazba na vnější subjekt není překážka členství.** Naopak: chceme, aby
   v komisi pro úhrady seděl někdo, kdo rozumí provozu nemocnice, a v komisi
   pro screening lékař, který ho reálně dělá. Odbornost s sebou vazby nese
   **nutně**. Orgán složený výhradně z lidí bez jakéhokoli vztahu k oboru by
   byl horší, ne lepší.
2. **Problém není mít zájem. Problém je nevědět o něm.** Když je vazba
   přiznaná a zapsaná, může ji orgán zohlednit (rozprava, vyloučení
   z hlasování, jen deklarace). Když přiznaná není, nemůže s ní pracovat
   nikdo — ani orgán, ani veřejnost.
3. **Rutina proto neměří „kdo je zkorumpovaný".** Měří, **nakolik je systém
   nastavený tak, aby se zájmy daly přiznat** — a kde se to fakticky děje.
   Cílová věta výstupu není „člen X je ve střetu zájmů", ale „orgán Y rozhoduje
   o věcech, k nimž má N z M členů doloženou vazbu, a nemá pravidlo, jak ji
   přiznat".
4. **Nikdy nepíšeme o úmyslu.** Data o úmyslu nemáme a mít nebudeme. Píšeme
   o doložených vztazích a o tom, co s nimi orgán (ne)udělal.

Když si nejsi jistý, jestli formulace obviňuje: přepiš ji tak, aby popisovala
**stav**, ne **člověka**.

## 1) Definice — pětistupňový žebřík

Rutina nesmí míchat dohromady různě silná zjištění. Každý záznam nese
**stupeň** a stupeň určuje, co se o něm smí napsat.

| Stupeň | Název | Co to znamená | Co je potřeba doložit |
|---|---|---|---|
| **1** | **Vazba** | Člověk má doloženou vnější roli (statutární orgán, vlastnictví, zaměstnavatel, funkce v odborné společnosti, pojišťovna, dodavatel) | Veřejný zdroj + datum ověření |
| **2** | **Relevantní vazba** | Vazba ze stupně 1 se **tematicky protíná s předmětem orgánu** | + doložení překryvu (předmět/účel orgánu, témata z jednání) |
| **3** | **Potenciální střet zájmů** | Orgán rozhoduje o věcech s **přímým dopadem** na ten subjekt (peníze, vstup na trh, regulace, kapacita) | + konkrétní rozhodnutí/agenda orgánu |
| **4** | **Doložený projev** | Člen se **prokazatelně účastnil** projednávání věci, která se subjektu přímo týkala | + doslovná citace ze zápisu s datem a odkazem na PDF |
| **5** | **Porušení pravidla** | Statut orgánu **má** pravidlo o střetu zájmů a nebylo dodrženo | + citace pravidla ze statutu **a** citace ze zápisu |

**Stupeň 5 bude téměř vždy nedosažitelný — a to je samo o sobě zjištění.**
Podle dosavadní analýzy má pravidlo o střetu zájmů **jen 5 z 57 statutů**
(viz `clanek-stret-zajmu-poradni-organy-2026.html`). U zbylých padesáti dvou
tedy neexistuje pravidlo, které by šlo porušit. Formulace pro takové orgány
zní: **„pravidlo neexistuje"**, nikoli „pravidlo nebylo dodrženo".

### Typy zájmu, které sledujeme

- **ekonomický** — vlastnický podíl, statutární orgán, prokura, doložená
  zakázka pro stát
- **zaměstnanecký / institucionální** — nemocnice, univerzita, státní ústav
- **plátce × poskytovatel** — v ČR strukturální osa; členství za zdravotní
  pojišťovnu při rozhodování o úhradách poskytovatelům a naopak
- **oborově-zájmový** — funkce v odborné společnosti, komoře, asociaci
  poskytovatelů, pacientské organizaci
- **dodavatelský** — výrobce léčiv nebo zdravotnických prostředků
- **výzkumný** — studie financovaná subjektem, o němž se rozhoduje
  (NIKO na tohle sama upozornila už v roce 2022 — viz zápis 16. 6. 2022)

### Co NESLEDUJEME — vůbec, za žádných okolností

- **rodinné a osobní vazby** (partner, děti, přátelství) — mimo rozsah,
  nejsou ve veřejných zdrojích a jejich dohledávání by bylo zásahem
  do soukromí
- **zdravotní stav, politická příslušnost, majetkové poměry** nad rámec
  veřejného rejstříku
- **sociální sítě, soukromá korespondence, cokoli za přihlášením**
- **cokoli u osob, které nejsou členy orgánu** (rodinní příslušníci,
  zaměstnanci firem)

## 2) Zdroje a pravidla identity

**Povolené zdroje:** Hlídač státu (veřejné profily, registr smluv, dotace,
sponzoring), veřejný rejstřík (justice.cz), statuty a zápisy orgánů
(ppo.mzcr.cz), Věstník MZ, weby institucí a odborných společností.

**Identita je nejrizikovější krok celé rutiny.** Shoda jména není důkaz.

- Osoba se propojí s profilem na Hlídači **jen tehdy**, když sedí alespoň
  dva nezávislé znaky (titul + obor, pracoviště, ročník narození, funkce
  uvedená v obou zdrojích). Dataset `ingest/ppo/osoby-externi.json` už
  má na tohle pole `identita` s odůvodněním — **rozšiřovat, ne obcházet**.
- Když je jméno běžné a znaky nesedí jednoznačně → `overeno: false`
  a osoba **nevstupuje do statistik**, jen do seznamu neověřených.
- **Nikdy nedomýšlet.** „Pravděpodobně tentýž člověk" není doložení.

## 3) Postup rutiny

### Krok A — inventura a identita
1. Načti 994 osob z `data/ppo-osoby.json`. Z toho **328 už má odkaz na
   Hlídač** (`externi.odkazy`) a **309 má v `ppo-dvojrole.json` seznam firem**.
2. U každé osoby s profilem ověř identitu podle pravidel v §2. Výsledek:
   `overeno: true|false` + `identita_pozn`.
3. Zbylé osoby bez profilu **nezahazuj** — jdou do čitatele „neověřeno"
   a do statistik pokrytí. Rutina musí vždy vykázat, kolik lidí ověřit
   nešlo.

### Krok B — extrakce a normalizace vazeb
Pro každou ověřenou osobu vytvoř seznam vazeb: `{ typ, subjekt, ico, role,
zdroj_url, overeno_dne }`. Typ podle taxonomie v §1. IČO je klíč — názvy
firem se mění.

### Krok C — relevance vůči orgánu (stupeň 2)
Pro každou dvojici (osoba × orgán, jehož je členem) rozhodni, zda se vazba
protíná s **předmětem orgánu** (`predmet`, `ucel` v `ppo.json`) a s tématy
jeho jednání (`data/ppo-analyza/{id}.json`).

- Nejprve **deterministická pravidla** (kategorie `kat` osoby × typ orgánu:
  pojišťovna v orgánu o úhradách, výrobce v orgánu o kategorizaci
  prostředků, poskytovatel v orgánu o síti center…).
- Teprve pak jemnější posouzení jazykovým modelem — a **vždy s doložením**:
  každá relevance nese větu, proč se překryv tvrdí, a odkaz na předmět
  orgánu nebo téma jednání. Bez doložení se relevance nezapisuje.
- **Konzervativně**: při pochybnosti stupeň nezvyšuj.

### Krok D — potenciální střet (stupeň 3)
Relevantní vazba + orgán prokazatelně rozhodoval o věci s přímým dopadem
na daný subjekt nebo jeho tržní segment. Doklad = konkrétní rozhodnutí
z `data/ppo-analyza`.

### Krok E — hlasování (stupeň 4) a jeho tvrdý limit
V korpusu je **1 310 rozhodnutí, z toho 133 (10 %) nese stopu hlasování**
(např. „PRO 12:0:0"), napříč 23 orgány.

> ⚠️ **Zápisy neuvádějí, jak hlasoval který člen — jen souhrnný poměr.**
> Rutina proto **nikdy** nesmí napsat ani naznačit, že konkrétní člověk
> hlasoval pro věc, na které má zájem. Maximum, co lze doložit:
> *„orgán rozhodl o X poměrem 12:0:0; k oblasti X má doloženou vazbu
> N z M členů; zápis neuvádí žádnou deklaraci ani vyloučení z hlasování."*

Stupeň 4 se přiznává jen tam, kde zápis **jmenovitě** uvádí účast člena
na projednávání dané věci (předkladatel, zpravodaj, autor materiálu).

### Krok F — pravidla orgánu (stupeň 5 a kontext)
Ke každému orgánu doplň: má statut pravidlo o střetu zájmů? (dnes 5 z 57)
Objevila se deklarace někdy v zápisech? (dnes **30 z 528 jednání**, a jen
v **8 z 66** analyzovaných orgánů — z toho drtivá většina NIKO).

### Krok G — agregace
Per orgán a globálně, viz §5.

## 4) Výstup `data/ppo-coi.json`

```json
{
  "version": "1.0",
  "generated_at": "2026-08-24",
  "metodika": {
    "stupne": "1 vazba · 2 relevantní vazba · 3 potenciální střet · 4 doložený projev · 5 porušení pravidla",
    "limity": "…viz §7, povinně se propisuje do UI…"
  },
  "pokryti": {
    "osob_celkem": 994,
    "s_profilem_hlidac": 328,
    "identita_overena": 0,
    "bez_profilu": 666
  },
  "osoby": [{
    "id": 152,
    "overeno": true,
    "identita_pozn": "shoda titul + pracoviště + funkce uvedená v obou zdrojích",
    "vazby": [{
      "typ": "ekonomicky",
      "subjekt": "Mediclinic a.s.",
      "ico": "27918335",
      "role": "statutární orgán",
      "zdroj_url": "https://www.hlidacstatu.cz/osoba/…",
      "overeno_dne": "2026-08-24"
    }],
    "relevance": [{
      "g": 4,
      "stupen": 3,
      "proc": "orgán rozhoduje o bodových hodnotách výkonů, subjekt je poskytovatel ambulantní péče",
      "doklad": { "typ": "predmet_organu", "cit": "…" }
    }]
  }],
  "skupiny": [{
    "g": 4,
    "clenu": 32,
    "clenu_overeno": 18,
    "s_vazbou": 11,
    "s_relevantni_vazbou": 7,
    "s_potencialnim_stretem": 4,
    "ma_pravidlo_ve_statutu": false,
    "deklarace_v_zapisech": 0,
    "rozhodnuti_s_hlasovanim": 20
  }],
  "souhrn": { "…globální statistiky…" }
}
```

Validátor `ingest/validate-coi.js` (do `npm run validate:all`): každá vazba
má zdroj i datum ověření; každá relevance ≥ 2 má doklad; **stupeň 4 má
doslovnou citaci ze zápisu**; stupeň 5 má navíc citaci ze statutu; žádná
osoba s `overeno: false` není ve statistikách.

## 5) Statistiky

**Globální** (vždy s uvedeným jmenovatelem — viz §7):
- kolik orgánů má pravidlo o střetu zájmů ve statutu (a kolik ne)
- v kolika orgánech se střet zájmů v zápisech vůbec kdy řešil
- kolik členů má doloženou vazbu / relevantní vazbu / potenciální střet
- kolik z toho připadá na osy plátce × poskytovatel, dodavatel, odborná společnost
- kolik rozhodnutí padlo v orgánech bez pravidla

**Per orgán** (fáze 2): stejné ukazatele + jmenný rozpad rolí (ne skóre osob,
viz §6) + odkaz na statut a na jednání, kde deklarace zazněla.

## 6) Redakční pravidla výstupu

- **Formulace popisuje stav, ne člověka.** „Sedm z osmnácti ověřených členů
  má doloženou vazbu na poskytovatele, o jejichž úhradách orgán rozhoduje."
  Nikoli „člen X je ve střetu zájmů".
- **Žádný žebříček osob.** Neděláme „top 10 nejkonfliktnějších členů".
  Jednotkou zveřejnění je **orgán**, ne člověk. U osoby zveřejňujeme jen to,
  co už je veřejné (rejstřík, Hlídač), a bez hodnocení.
- **Právo na odpověď.** Před publikací textu, který jmenuje konkrétní osobu
  ve stupni 3+, se osoba oslovuje s možností vyjádření a to se otiskne.
  Kontakt na opravu je součástí stránky.
- **Každé tvrzení o osobě nese zdroj a datum ověření.** Bez toho se
  nepublikuje.
- **Data stárnou.** Rejstřík i Hlídač se mění; přeověřovat min. 1× za
  6 měsíců, u publikovaných textů uvádět datum stavu.
- **Oprava je povinná a rychlá.** Když se ukáže chybná identita, záznam se
  odstraní a oprava se poznamená viditelně, ne tiše.

## 7) Limity dat — povinně do UI i do každého textu

Tyhle věty nejsou pojistka pro nás, ale poctivost vůči čtenáři:

1. **Ověřit šlo jen část lidí.** Odkaz na Hlídače má 328 z 994 členů (33 %).
   Všechny podíly se počítají **z ověřené podmnožiny** a jmenovatel se vždy
   uvádí.
2. **Chybí kategorizace.** 643 z 994 osob má `kat` = `neuvedeno`/`nezarazeno`
   (65 %), takže osa „za koho v orgánu sedí" je neúplná.
3. **Rejstřík vidí jen formální role.** Zaměstnanecký poměr, poradenská
   smlouva ani honorář za přednášku v něm nejsou. **Absence vazby v datech
   neznamená, že vazba neexistuje.**
4. **Zápisy neuvádějí jmenovité hlasování** (§ krok E).
5. **Zápisy nejsou kompletní** — u části orgánů ministerstvo nezveřejnilo
   všechna jednání (proto běží žádost dle 106/1999 Sb.).
6. **Pravidlo chybí ≠ pochybení.** U 52 z 57 orgánů není co porušit; to je
   výtka vůči ministerstvu, ne vůči členům.

## 8) Fáze

| Fáze | Obsah |
|---|---|
| 1 | Identita + vazby + **globální** statistika (`data/ppo-coi.json`, validátor, testy) |
| 2 | **Per-orgán** statistiky + zobrazení na detailu skupiny |
| 3 | Vrstva hlasování (stupeň 3–4) s limity dle kroku E |
| 4 | Text/článek + právo na odpověď oslovených |

## 9) Testy

- Každá vazba má `zdroj_url` a `overeno_dne`; relevance ≥ 2 má `doklad`;
  stupeň 4 doslovnou citaci ze zápisu, stupeň 5 i ze statutu.
- Osoba s `overeno: false` se nesmí objevit v žádném součtu.
- Součty per orgán sedí na počet členů z `ppo.json` (drift test).
- Statistika vždy nese jmenovatel (žádné „%" bez `z N`).
- Odkazované orgány, jednání a osoby existují v příslušných datasetech.

## 10) Otevřené otázky pro vlastníka

1. **Rozsah fáze 1** — jen 328 osob s existujícím profilem (rychlé, ověřitelné),
   nebo se pokusit dohledat profily i pro zbylých 666 (dlouhé, vyšší riziko
   chybné identity)?
2. **Zveřejnění na úrovni osoby** — necháme na profilu osoby jen to, co už
   dnes je (odkaz na Hlídač + firmy), nebo tam přibude i vyznačení relevance
   vůči orgánu (stupeň 2–3)? Doporučuji **ano, ale bez hodnocení a s právem
   na odpověď**.
3. **Oslovení dotčených** — hromadně před publikací článku, nebo průběžně
   při zveřejnění dat?
4. **Má rutina běžet pravidelně** (cron á 6 měsíců pro přeověření), nebo
   jednorázově s ruční aktualizací?
