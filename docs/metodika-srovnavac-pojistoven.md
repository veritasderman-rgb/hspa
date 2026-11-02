# Metodika — Srovnávač zdravotních pojišťoven (pracovní verze)

> Derivát `docs/metodika-barometr.md`. Závazná pro validátor `ingest/validate-pojistovny.js`
> a pro UI `pojistovny.html`. Změna metodiky = změna tohoto dokumentu se záznamem
> v `docs/decisions-log.md`. Do schválení odbornou skupinou (Advance, FBMI ČVUT, NAPO)
> a vydavatelem je semafor prázdný.

**Dataset:** `data/pojistovny.json` (semafor), `data/pojistovny-aplikace.json`,
`data/pojistovny-prevence.json`, `data/pojistovny-otazky.json`.

## 1. Zaměření

Vztah **pojišťovna – pojištěnec**. Otázka zní: dělá pojišťovna pro svého pojištěnce víc
než proplácení faktur, a dá se to doložit? Mimo zaměření: úhrady poskytovatelům,
vztah pojišťovna – nemocnice, politické výroky (ty patří do Barometru).

## 2. Šest oblastí

| id | Oblast | Co se sleduje | Primární zdroje |
|---|---|---|---|
| `prevence` | Prevence s dopadem | struktura čerpání fondu prevence, cíle programů, měření dopadu, interní metodika, frekvence vyhodnocení | VZ, ZPP, odpovědi na 7 otázek, NZIP, screeningové registry |
| `dostupnost` | Dostupnost a čekací doby | čekací doby, lhůty podle nařízení 307/2012 Sb., cesty pacientů, regionální rozdíly | dotazy, KZP, data VZP, OIS |
| `sit` | Síť a ohrožené oblasti | smluvní síť v nedostatkových regionech, vzdálená péče, pohotovosti | NRHZS (OIS 11-39), OIS 11-20, pohotovosti |
| `kvalita` | Kvalita ve smluvní politice | ukazatele kvality (PUK, INDIKO, NIKEZ) ve smlouvách a úhradách | dotazy, smluvní dodatky, KZP |
| `servis` | Klientský servis a informování | aplikace (funkce, přívětivost, přístupnost 65+), online přepážka, srozumitelnost, stížnosti | weby, aplikace, dotazníky NAPO |
| `hospodareni` | Hospodaření a transparentnost | provozní náklady, rezervy, závazky po splatnosti, včasnost VZ, odpovědi ve lhůtě | ZPP, hodnocení MZ+MF, VZ, evidence dotazů |

## 3. Stavy semaforu (enum `stavy_semaforu`)

| stav | label | signal | Kdy |
|---|---|---|---|
| `dolozeno` | doloženo daty | good | pojišťovna předložila data nebo metodiku, kterou lze ověřit a replikovat |
| `deklarovano` | deklarováno, nedoloženo | warn | pojišťovna tvrdí, že dělá / měří, ale nepředložila data |
| `nedolozeno` | nedoloženo | bad | odpověď neobsahuje nic k věci, nebo data vyvracejí tvrzení |
| `neodpovedela` | neodpověděla / mimo lhůtu | neutral | bez odpovědi do 15 dní (zákon 106) ani po výzvě |
| `null` | zatím nehodnoceno | — | před prvním kolem; výchozí stav |

Každý stav `!= null` vyžaduje `rok`, `zduvodneni` a `zdroj` (validátor). Stav se
nevyjadřuje k motivům ani k osobám.

## 4. Pravidla férovosti

1. **Standardizace.** Náklady a prevence na pojištěnce se přepočítávají na věkovou a
   pohlavní strukturu ČR z CRP (OIS 11-47). Nestandardizovaná čísla se zobrazují jen
   s poznámkou.
2. **Stejná otázka, stejný den, stejný formát.** Všech sedm pojišťoven dostane totéž podání.
   Odpovědi se zveřejňují v plném znění (`ingest/manual/pojistovny/odpovedi/`).
3. **Partnerský tón.** Před žádostí podle zákona 106 vždy nabídka dobrovolného předání dat
   (šablona `docs/dopis-instituce-data.md`).
4. **Právo na odpověď.** Pojišťovna dostane návrh verdiktu 10 dní před zveřejněním; její
   stanovisko se publikuje vedle verdiktu, doslova.
5. **Zamrazená baseline.** Výchozí hodnoty k datu prvního zveřejnění se nemění; revize
   zdrojových dat se zapisují s datem.
6. **Doložitelnost před objemem.** Výše fondu prevence ani počet benefitů nejsou
   kritériem (rozhodnutí PS 7. 10. 2026). Kritériem je, zda pojišťovna umí doložit
   účast a výsledek (záchyty, změna chování, náklady na záchyt).
7. **Opravy viditelně.** Každá změna má záznam s datem a důvodem v `changelog` datasetu.

## 5. Zdroje a jejich váha

| Zdroj | Autorita | Poznámka |
|---|---|---|
| Hodnocení vývoje systému v.z.p. (MZ ČR + MF) | primární, konzistentní pro všech 7 ZP | roční, metodika hotovostní |
| Výroční zprávy ZP (vyhláška 362/2010 Sb.) | primární, ale vlastní vykazování | přepis z PDF vyžaduje druhé ověření |
| Zdravotně pojistné plány (sněmovní tisky) | primární pro plány a rezervy | plán ≠ skutečnost |
| CRP OIS 11-47 (ÚZIS) | primární pro kmen | NZIP, datová podpora dohodovacího řízení |
| Interní rešerše z webů (matice nabídky, aplikace) | redakční odhad | nikdy nenahrazuje doložení pojišťovnou |
| Odpovědi pojišťoven | primární pro semafor | plné znění veřejné |

## 6. Role a třídy změn

- Přepis dat, grafy, drafty: AI rutina (třída B).
- Verdikty semaforu, texty profilů pojišťoven, odeslání dotazů, zveřejnění stránky:
  člověk (třída C) — stránka `pojistovny.html` i `middleware.js` spadají do třídy C podle
  `scripts/pr-gate.js` (nová stránka, nasazení).
- Odborná garance metodiky: Advance, FBMI ČVUT, NAPO; redakce metodiku nemění sama.
