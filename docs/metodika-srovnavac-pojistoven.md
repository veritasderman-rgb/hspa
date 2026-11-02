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
   s poznámkou. Postup viz [§ 4.1 podrobně](#41-podrobně--postup-standardizace) níže.
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

### 4.1 podrobně — postup standardizace

_Pracovní návrh (P3.3, 2. 11. 2026); čeká na potvrzení odbornou skupinou (Advance, FBMI ČVUT)._

**Proč.** Pojišťovny mají různě starý kmen: VZP 22,9 % pojištěnců 65+, ČPZP 16,8 %, ČR
20,9 % (CRP 2025). Starší pojištěnec stojí víc, takže „Kč na pojištěnce“ bez
standardizace měří hlavně věk kmene, ne hospodaření pojišťovny.

**Data a skripty.**

| Krok | Soubor | Co dělá |
|---|---|---|
| 1 | `ingest/transform_pojistovny_crp.js` | Streamově čte CSV OIS 11-47 (ÚZIS, verze 2026-01), sečte okresy a zapíše `data/pojistovny-vek.json`: pro nejnovější rok (2025) a každou ZP i ČR počet pojištěnců v 19 věkových pásmech × 2 pohlaví, podíl 65+ a odhad průměrného věku |
| 2 | `ingest/manual/pojistovny/nakladove-indexy-<rok>.json` | Relativní nákladové váhy buněk věk × pohlaví (rok = `rok_hospodareni`, tj. 2024), se zdrojem a stavem `dolozeno` / `placeholder-bez-vah` |
| 3 | `ingest/lib/standardizace.js` | Čisté funkce: faktor a standardizovaná hodnota |
| 4 | `ingest/transform_pojistovny_standardizace.js` | Doplní do `pojistovny[].hospodareni` obálky `naklady_na_pojistence_std_kc` a `fond_prevence_na_pojistence_std_kc` (`{hodnota, rok, zdroj, poznamka, faktor, stav}`) a záznam do `changelog` |

Validátor `ingest/validate-pojistovny.js` hlídá: faktor je číslo 0,5–2, `stav` je z enumu,
u placeholderu je standardizovaná hodnota rovna nestandardizované; u `pojistovny-vek.json`
7 ZP, součet buněk = celkem (±0,1 %), ČR = součet ZP (±0,5 %) a shodu podílu 65+ s blokem
`crp` v `pojistovny.json` (±0,2 p. b.).

**Vzorec.** Pro buňku *i* (věkové pásmo × pohlaví) je *p*<sub>ZP,i</sub> podíl buňky na kmeni
pojišťovny, *p*<sub>ČR,i</sub> podíl na všech pojištěncích ČR a *w*<sub>i</sub> relativní
nákladová váha buňky.

```
E_ZP   = Σ p_ZP,i × w_i          očekávaná nákladovost kmene při jednotkových nákladech ČR
E_ČR   = Σ p_ČR,i × w_i          totéž pro strukturu ČR
faktor = E_ČR / E_ZP
standardizovaná hodnota = hodnota na pojištěnce × faktor
```

Jde o nepřímou standardizaci přes nákladové indexy: neznáme náklady každé pojišťovny
v jednotlivých buňkách, známe jen její průměr na pojištěnce a strukturu kmene. Výsledek je
totožný s přímou standardizací za předpokladu, že náklady pojišťovny v každé buňce jsou
celostátní relativní váha × konstanta pojišťovny (*c*<sub>ZP,i</sub> = *k*<sub>ZP</sub> × *w*<sub>i</sub>).
Měřítko vah nehraje roli, rozhodují jen poměry mezi buňkami.

**Jak číst faktor.**

- **faktor < 1**: kmen je dražší než ČR (starší). Standardizace hodnotu **sníží**: „takhle
  by pojišťovna vycházela, kdyby měla věkovou a pohlavní strukturu celé ČR“.
- **faktor > 1**: kmen je levnější (mladší). Standardizace hodnotu **zvýší**.
- **faktor = 1**: stejná struktura jako ČR, nebo nejsou k dispozici váhy (placeholder).

**Zdroj vah.** Pro přerozdělení pojistného (§ 21 zákona č. 592/1992 Sb.) vyhlašuje MZ pro
každý rok nákladové indexy věkových skupin podle pohlaví: 18 skupin (0–4, 5–9 … 80–84, 85+)
× 2 pohlaví = 36 buněk. Jsou veřejné, celostátní a pojišťovny je znají, proto jsou první
volbou. CSV OIS 11-47 má 19 pásem (0 let a 1–4 roky zvlášť); obě pásma dostávají váhu
skupiny 0–4, ostatní se mapují 1:1 (tabulka `mapovani_pasem` v souboru vah).

**Stav k 2. 11. 2026: placeholder.** Doložená sada indexů pro rok 2024 v repu není (draft
o přerozdělení uvádí jen orientační hodnoty, ne úplnou tabulku), a čísla se nevymýšlejí.
Soubor `nakladove-indexy-2024.json` má proto stav `placeholder-bez-vah` a všechny váhy = 1.
Faktor je u všech pojišťoven 1,000 a standardizovaná hodnota se rovná nestandardizované;
poznámka u každé hodnoty to říká. Až odborná skupina potvrdí zdroj, přepíšou se váhy,
stav se změní na `dolozeno` a skript se spustí znovu, kód se nemění.

**Fond prevence.** Standardizuje se stejným faktorem jako náklady na zdravotní služby.
Je to jen aproximace: věkový profil čerpání fondu prevence je jiný než profil nákladů na
péči (příspěvky na pohyb, očkování a dentální hygienu čerpají spíš děti a lidé v produktivním
věku, ne nejstarší pojištěnci). Faktor nákladů tak u prevence může opravovat špatným
směrem. Vlastní váhy pro prevenci by vyžadovaly čerpání fondu podle věku, které pojišťovny
nezveřejňují (otázka pro kolo dotazů). Fond prevence navíc podle rozhodnutí PS 7. 10. 2026
není hlavním ukazatelem (§ 4.6), takže se standardizovaná hodnota ukazuje jen jako kontext.

**Na stránce** se ukazují obě hodnoty („nestandardizováno“ a „standardizováno“), obě se
zdrojem; dokud je stav `placeholder-bez-vah`, standardizovaná hodnota se nezobrazuje jako
samostatné číslo, jen poznámka, že standardizace čeká na váhy.

### Otevřené otázky standardizace

Pro odbornou skupinu (Advance, FBMI ČVUT); do jejich odpovědi zůstává stav placeholder.

1. **Zdroj a rok vah.** Jsou nákladové indexy přerozdělení pro rok 2024 správný zdroj
   (přesné označení předpisu ve Sbírce, tabulka 36 buněk)? Nebo použít skutečné náklady na
   pojištěnce podle věku a pohlaví za celý systém (ÚZIS, NZIP Dohodovací řízení, Dimenze 5)?
2. **Indexy bez PCG.** Věkově-pohlavní indexy přerozdělení jsou kalibrované jako jedna
   vrstva modelu vedle farmaceutických nákladových skupin (PCG). Mají se pro standardizaci
   použít tak, jak jsou, nebo přepočítat „bez PCG“ (čistě věk × pohlaví)?
3. **Rok struktury.** Náklady jsou za rok 2024, struktura kmene je z CRP 2025 (nejnovější).
   CSV obsahuje i rok 2024. Použít strukturu stejného roku jako náklady (`--rok 2024`),
   nebo průměr let? Rozdíl ve struktuře mezi lety je malý, ale metodicky čistší je stejný rok.
4. **Stav k datu vs. průměr.** CRP je stav k datu, náklady jsou za rok. Postačí stav, nebo
   je potřeba průměrný počet pojištěnců v buňce?
5. **Fond prevence.** Je aproximace faktorem nákladů přijatelná, nebo prevenci
   nestandardizovat vůbec a ukazovat jen s poznámkou o věku kmene?
6. **Další faktory rizika.** Mají se vedle věku a pohlaví zohlednit pojištěnci státu,
   cizinci s dočasnou ochranou (u VZP 80–85 % z nich) nebo regionální cenová hladina? Pokud
   ano, z jakých veřejných dat.
7. **Rozsah faktoru.** Validátor dnes přijme faktor 0,5–2. Je rozumné hlídat užší pásmo
   (např. 0,8–1,25) jako kontrolu chyb?

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

## 7. Dotazníky

- **Definice** dotazníku je jen v `data/pojistovny-otazky.json` (verzovaná, validovaná
  `ingest/validate-pojistovny.js`): sada má `id`, `verze`, otázky nebo části s otázkami;
  otázka s `moznosti` je výběrová (`vyber: "jeden"` = jedna volba, jinak vícenásobná),
  volba „jiné (uveďte)“ dostane pole upřesnění. Formulář na `pojistovny.html` (modul 4)
  se vyrenderuje z definice (`src/zp-dotaznik.js`), takže se otázky mění v gitu.
  Změna znění nebo nabídky otázky zvyšuje `verze` sady, odpověď nese verzi, na kterou se
  odpovídalo.
- **Odpovědi** ukládá `api/dotaznik.js` do Neonu (Postgres, projekt `hspa-dotazniky`,
  tabulka `dotaznik_odpoved`, schéma v `api/migrations/`). Funkce odpověď ověří proti
  definici sady (jen známé otázky, hodnoty z nabídky, texty do 2 000 znaků). Bez
  `DATABASE_URL` vrací 503 a nic neukládá.
- **Tokeny** mají adresné sady (pojišťovny, pacientské organizace): každý respondent
  dostane jednorázový odkaz `pojistovny.html?dotaznik=<sada>&token=<token>`, který
  vygeneruje `scripts/dotaznik-token.js`. V databázi je jen sha256 hash tokenu; typ a kód
  respondenta určuje token, ne tělo požadavku. Použitý nebo prošlý token odpověď
  nepřijme. Veřejná anketa tokeny nepoužívá a text s e-mailem nebo rodným číslem odmítne.
- **Export agregátů**: `node scripts/export-dotaznik.js` stáhne počty z view
  `dotaznik_agregace` do `data/pojistovny-dotaznik-agregaty.json` (třída B, dělá rutina).
  Stránka čte jen tento soubor. Zveřejňují se jen otázky s nabídkou, žádné volné texty,
  a sada s méně než třemi odpověďmi se skryje, aby nešlo přiřadit odpověď instituci.
- **Soukromí** (GOVERNANCE § 2 bod 5): žádné osobní údaje, IP adresa se neukládá (rate
  limit drží v paměti funkce jen hash IP se solí), u adresných sad je respondentem
  instituce, ne osoba. Odpovědi pojišťoven na kolo 1 zůstávají jako dokumenty v
  `ingest/manual/pojistovny/odpovedi/`, Neon je jen pro strukturované dotazníky.
