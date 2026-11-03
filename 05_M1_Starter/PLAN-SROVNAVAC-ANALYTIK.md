# PLAN — Srovnávač pojišťoven: pohled analytika (peníze, instituce, nástroje)

_Stav k 3. 11. 2026. Navazuje na [`PLAN-SROVNAVAC-POJISTOVEN.md`](PLAN-SROVNAVAC-POJISTOVEN.md)
(balíčky P0–P5, koncept „Moje pojišťovna“, přehled + podstránky) a na
[`docs/metodika-srovnavac-pojistoven.md`](../docs/metodika-srovnavac-pojistoven.md). Vznikl z revize
pracovní verze očima nezávislého analytika (3. 11. 2026): stránka dobře odpovídá na „kdo je kdo
a kolik má“, částečně na „co nabízí“, a vůbec na „jak pojišťovna funguje, kdo ji řídí a kudy tečou
peníze“. Tenhle plán říká, **co z toho jde postavit z veřejných dat bez součinnosti pojišťoven**,
z jakého souboru, v jakém balíčku a s jakou třídou PR. Je to vstupní bod pro sessions, které
srovnávač rozšiřují o analytické pohledy; vizuální pravidla a primitivy se nemění (plán P, § 1–3)._

> **Shrnutí.** Skoro všechno, co analytikovi chybí, Ministerstvo zdravotnictví zveřejňuje, jen to
> stránka nečte: **Hodnocení vývoje systému v. z. p. za roky 2015–2024** existuje i jako XLSX
> (ukazatele hospodaření, zaměstnanci, státní pojištěnci, rozvaha, náklady podle segmentů a fond
> prevence, vše po pojišťovnách), **měsíční výběr pojistného po pojišťovnách** od ledna 2019 doplňuje
> už použitou „částku po přerozdělení“, takže jde spočítat, kdo do přerozdělení přispívá a kdo z něj
> bere. Oba zdroje jsou ověřené 3. 11. 2026 (HTTP 200, struktura tabulek níže). Z toho vznikne nová
> podstránka **Peníze** (přerozdělení, hospodaření 2015–2024, segmenty), podstránka **Instituce**
> (zákon, orgány, zaměstnanci, smluvní programy, co pojišťovny publikují o dostupnosti), profil
> jedné pojišťovny, export CSV, srovnání dvou pojišťoven a přepínač roku. Co veřejně **není** (hrubé
> přestupy, čekací doby po pojišťovnách, žádosti podle § 16 u většiny ZP), plán jmenuje v § 5 a
> řeší dotazem v kole 1, ne odhadem. Odhad: 16 běhů rutiny, z toho 3 PR třídy C (nové stránky,
> skripty v `package.json`, workflow).

---

## 0. Zdroje: co je ověřeno (3. 11. 2026)

Každý balíček níže stojí na řádku této tabulky. „Ověřeno“ = soubor stažen v session, struktura
přečtena; nic z toho není odhad.

| Z | Zdroj | Kde | Roky | Formát | Co dává (po pojišťovnách) | Stav |
|---|---|---|---|---|---|---|
| Z1 | MZ ČR · Hodnocení vývoje systému v. z. p. | `mzd.gov.cz/hodnoceni-vyvoje-systemu-verejneho-zdravotniho-pojisteni/` → `wp-content/uploads/2024/06/vz<rok>_hodnoceni.pdf` + `…_hodnoceni_tab_1-1a-1b-1c-1d-2-4.xlsx` + `…_hodnoceni_tab_3-3a-3b-3c.xlsx` | 2015–2024 (10 ročníků, 30 souborů) | PDF + XLSX | XLSX `tab.č.1` vybrané ukazatele hospodaření (průměrný počet pojištěnců, zaměstnanci, pojištěnců na zaměstnance, příjmy, náklady, provozní fond, režie), `1a` náklady na činnost, `1b` zůstatky BÚ ZFZP, `1c` výstupy z přerozdělování platby státu, `1d` rezervní fondy, `2` rozvaha, `4` vývoj hospodaření; `Tabulka č. 3` náklady podle segmentů (ambulantní podle skupin poskytovatelů, lůžková, léky, lázně, doprava, ZZS…) skutečnost vs. ZPP vs. předchozí rok, `3a` totéž na pojištěnce, `3b` zahraniční pojištěnci, `3c` fond prevence. PDF Tab. 7: státní pojištěnci (počet a podíl) a zaměstnanci (jen ročníky 2018–2024, dříve jen graf); Tab. 5: pohledávky a závazky vč. po lhůtě; Tab. 13: překročení zákonného limitu. **Oprava po implementaci A1.1 (3. 11. 2026):** list `1c` se jmenuje „Vliv přerozdělování“ a nese po ZP rozdíl pojistné po − před přerozdělením (= `vliv_prerozdeleni_mld`), **ne platbu státu**; tu MZ po pojišťovnách nezveřejňuje (jde na zvláštní účet). Limit nákladů na činnost je v `1a` jen v Kč (`provozni_limit_pridelu_mil`, využití v %), ne jako % z rozvrhové základny | ověřeno: 2024 PDF + oba XLSX staženy, listy a řádky přečteny; implementováno v `ingest/fetchers/mz-hodnoceni.js` + `ingest/lib/mz-hodnoceni.js` (A1.1) |
| Z2 | MZ ČR · Přerozdělování pojistného · **částka vybraná na pojistném (100% výběr)** | `wp-content/uploads/2014/11/prerozdelovani_pojistovna_vyber_<rok>_<mm>.pdf` (soubor `2021_12` nese 2019–2021, `2024_12` 2022–2024, `2026_10` 2024–2026) | 1/2019–10/2026 | PDF (tabulka, `pdftotext -layout` čitelná) | tis. Kč měsíčně po ZP + „celkem zaměstnanecké“ + „celkem ZP“; druhá strana: mimořádné události daného měsíce | ověřeno: `2026_10` a `2021_12` staženy a přečteny; `2020_12`, `2022_12`, `2023_12`, `2024_12` HTTP 200 |
| Z3 | MZ ČR · Přerozdělování · částka po přerozdělení na pojišťovnu a na pojištěnce | `prerozdelovani_pojistovna_vysledek_*.pdf`, `prerozdelovani_pojistenec_vysledek_*.pdf` | 2022–2026 v repu (`ingest/manual/pojistovny/prerozdeleni-mz*.json`); `2021_12` HTTP 200 → jde doplnit 2019–2021 | PDF | už použito pro měsíční kmen (§ 4.3 metodiky) | v repu; rozšíření o 2019–2021 ověřeno |
| Z4 | Výroční zprávy pojišťoven (text v repu) | `ingest/manual/pojistovny/vz-text/<kod>-<rok>.txt` (20 souborů, 2023–2025, ZPŠ 2020) | 2023–2025 | text z PDF | kapitola „Orgány pojišťovny“ (správní a dozorčí rada, ředitel) u všech sedmi; státní pojištěnci v textu u VoZP, ZP MV ČR, RBP, VZP; „před přerozdělováním“ u VZP, VoZP, RBP; § 16 zák. 48/1997 jen v textu, bez počtů; „čekací“ jen VZP a ZP MV ČR | v repu |
| Z5 | Zákony | zákon č. 551/1991 Sb. (VZP), č. 280/1992 Sb. (zaměstnanecké ZP), vyhláška č. 418/2003 Sb. (limit nákladů na činnost) | platné znění | e-Sbírka | složení a způsob obsazení orgánů, dohled MZ a MF, limit provozu | veřejné; přesné znění § ověřit při zápisu (A2.1) |
| Z6 | Weby pojišťoven: smluvní programy pro poskytovatele | sekce „pro poskytovatele“ 7 webů (VZP PLUS a programy kvality, OZP bonifikace, ČPZP, ZP MV ČR, VoZP, RBP, ZPŠ) | 2026 | HTML | existence, název, segment, kritéria (kvalita, dostupnost, e-health), rok | k rešerši (A3.2); stejný postup jako audit otevřených dat (`data/pojistovny-opendata.json`) |
| Z7 | Explainery v repu | `data/explainers.json` → `pojistovny` (aktéři), draft `drafts/explainer-prerozdeleni-pojistneho-tisk-70.json` | — | JSON | „jak systém funguje“ pro vysvětlující vrstvu | v repu; ze srovnávače dnes nevede odkaz |

Dostupnost z prostředí: `mzd.gov.cz`, `vzp.cz`, `uzis.cz`, `data.gov.cz` odpovídají; **`psp.cz`
neodpovídá** (sněmovní tisky, tj. ZPP a VZ v podobě tisku, se musí brát z webů ZP a MZ). Parsery
už v repu: `ingest/lib/xlsx.js` (SheetJS, bez nové závislosti), `pdftotext -layout`
(`ingest/fetchers/pojistovny-vz.js`, `ingest/lib/pojistovny-vz.js`), HTTP s User-Agentem a
limitem 1 req/s (`ingest/lib/http.js`).

---

## 1. Hranice (přebírá plán P § 1 a GOVERNANCE § 3)

1. **Fakta se řadí, nabídka se nehodnotí.** Saldo přerozdělení, provoz, segmenty, státní pojištěnci
   jsou fakta ze zákonem daného mechanismu → seřazené bary s popiskem „řazeno podle hodnoty,
   nejde o hodnocení pojišťoven“ (R3). Žádný index, žádné Σ.
2. **Třídy PR.** Data, grafy, validátory, testy, úpravy existujících stránek = **B** (editor).
   Nová stránka (`pojistovny-penize.html`, `pojistovny-instituce.html`, `pojistovna.html`),
   `package.json`, `.github/workflows/`, `page-shared.js`, `CLAUDE.md` = **C** (vydavatel).
   Jména členů orgánů pojišťoven = osoby → **C** (jako `ppo-osoby.json`); struktura orgánů bez jmen = B.
3. **Žádné odhady místo dat.** Co zdroj neuvádí, zůstane `null` a „nedohledáno“ (vzor
   `pojistovny.json → chybi[]`). Hrubé přestupy, čekací doby po ZP, § 16 po ZP se nedopočítávají.
4. **Žádná nová závislost, žádné generované artefakty v PR** (`CLAUDE.md`).
5. **Jeden balíček = jedna session = jeden PR.** Report v těle PR se screenshoty 1280/390/dark.
6. **Stáří dat viditelně.** Každý nový dataset má `generated_at`, `zdroj{url, stazeno_at}`,
   a zapojí se do `src/pojistovny-stari.js` („Stáří dat na této stránce“).

---

## 2. Cílová podoba záložek

Dnes: Přehled · Kmen a hospodaření · Prevence · Aplikace · Zdravotní gramotnost ‖ Metodika · Indikátory.
Po plánu (změna záložek je v `src/pojistovny-shell.js → ZP_STRANKY`, třída B; nové HTML = C):

| Záložka | Stránka | Obsah (nové tučně) | Balíčky |
|---|---|---|---|
| Přehled | `pojistovny.html` | KPI, Moje pojišťovna, **4 grafy s informací** (tržní podíl · saldo přerozdělení · náklady na pojištěnce vykázané → přepočtené · provoz % příjmů), semafor, rozcestník | A0.1 |
| Kmen | `pojistovny-kmen.html` | karty, kraje, index 2010 = 100, měsíční kmen (**přepínač bez VZP**), věk 65+, **státní pojištěnci** | A0.6, A1.3 |
| **Peníze** | **`pojistovny-penize.html`** (C) | **přerozdělení: výběr → po přerozdělení, saldo po ZP, měsíční řada 2019→; hospodaření 2015–2024 (řady: příjmy, náklady, provoz, rezervy, pohledávky/závazky po lhůtě); náklady podle segmentů po ZP a na pojištěnce; fond prevence celkem 2015–2024 (MZ)**; tabulka hospodaření 2024 a rezervy 2026 se sem přesunou z Kmene | A1.1, A1.2, A1.4, A1.5 |
| Prevence | `pojistovny-prevence.html` | beze změny (P2.x) | — |
| **Aplikace a servis** | `pojistovny-aplikace.html` (přejmenovaná záložka) | aplikace (**graf „které funkce chybí“** místo n/10), **klientský servis** (přesun z Kmene), **stížnosti, § 16a, otevřená data** (přesun z Indikátorů) | A0.1, A0.5 |
| **Instituce** | **`pojistovny-instituce.html`** (C) | **zákon a dohled, orgány (složení, kdo jmenuje), ředitel, zaměstnanci a pojištěnci na zaměstnance, limit provozu; smluvní programy pro poskytovatele; co pojišťovny publikují o dostupnosti a § 16; síť odborností (přesun prototypu z Kmene)** | A2.1, A3.1, A3.2, A3.3 |
| Zdravotní gramotnost | beze změny | — | — |
| Metodika a semafor · Indikátory a data | beze změny; z Indikátorů odejdou stížnosti a open data (zůstane inventář) | A0.5 |
| **Profil** | **`pojistovna.html?zp=111`** (C) | všechny hodnoty jedné ZP na jedné stránce, srovnání s průměrem ČR, odkazy do témat; cíl pro „Karta … →“ | A2.3 |

Napříč: **export CSV** u každého tabulkového dvojčete (A4.1), **„Porovnat s“** druhá pojišťovna
(A4.2), **přepínač roku** u řad (A4.3), odkaz na explainer „jak systém funguje“ (A2.2).

---

## 3. Balíčky

Třída = podle `scripts/pr-gate.js`; odhad = běhy rutiny (1–2 h). Pořadí v tabulkách = doporučené
pořadí implementace uvnitř fáze. DoD vždy navíc: `npm test`, `npm run validate:all`, screenshoty
1280/390/dark v těle PR, nový dataset ve „Stáří dat“.

### Fáze A0 — Rychlé opravy z revize (1–2 běhy, vše B)

| ID | Úkol | Zdroj | Soubory | Odhad | DoD |
|---|---|---|---|---|---|
| A0.1 | **Přehled: vyměnit dva grafy bez informace.** Matici „Co VZ říkají o prevenci“ (48× ano) a „Co umí aplikace“ (n/10) nahradit: (a) `dumbbell` náklady na pojištěnce vykázané → přepočtené (už na Kmeni), (b) `rankedBars` provoz v % příjmů s limitem v tooltipu. Po A1.2 se (a) vymění za saldo přerozdělení a náklady půjdou na Peníze. Aplikace na podstránce: místo n/10 `dotMatrix` otočená „funkce × ZP“ se součtem „kolik ZP funkci má“ (ukáže, že eDoklady a eRecept chybí čtyřem) | data v repu | `src/pojistovny-prehled.js`, `src/pojistovny.js`, `tests/pojistovny-prehled.test.js` | 0,5 | přehled má 4 grafy, každý s rozptylem hodnot > 10 % rozsahu; test na výběr grafů |
| A0.2 | **Mobil: grafy přehledu pod sebe.** `.zpc-overview-grid` na ≤ 640 px = jeden sloupec, bez posuvného pásu; text „posuňte do stran“ jen nad 640 px | — | `src/styles.css`, `pojistovny.html` | 0,25 | screenshot 390 px: 4 grafy viditelné scrollem; `tests/e2e/visual.spec.js` baseline |
| A0.3 | **Popisek rezerv.** „kritická hranice 3–4 %: 3,5 %“ → „kritické pásmo 3–4 % výdajů“ (zóna), číslo 3,5 pryč z popisku, do tooltipu „střed pásma“ | — | `src/pojistovny.js` (`buildKmenCharts`) | 0,1 | text v testu `pojistovny.test.js` |
| A0.4 | **Pojmenování přepočtu.** „standardizováno indexem nákladovosti kmene (přerozdělení MZ)“ → „přepočteno na index přerozdělení“ + jedna věta pod grafem („index zahrnuje věk, pohlaví a farmaceuticko-nákladové skupiny; není to věková standardizace, ta čeká na váhy ÚZIS“); karta ZP stejně | metodika § 4.2 | `src/pojistovny.js`, `pojistovny-kmen.html`, metodika § 4.2 (jen pojmenování) | 0,25 | žádné „standardizováno“ mimo sekci 4.1 metodiky, dokud váhy nejsou `dolozeno` |
| A0.5 | **Záložka „Aplikace a servis“.** Přesun sekcí „Klientský servis“ (z Kmene), „Stížnosti na dostupnost“, „§ 16a“ a „Jak pojišťovny publikují otevřená data“ (z Indikátorů) na `pojistovny-aplikace.html`; `ZP_STRANKY.aplikace.label = 'Aplikace a servis'`, `veta`/`co` upravit; Indikátory zůstanou inventář | — | `pojistovny-aplikace.html`, `pojistovny-kmen.html`, `pojistovny-indikatory.html`, `src/pojistovny-shell.js`, `src/pojistovny.js`, `src/pojistovny-indikatory.js`, testy | 0,5 | čtenářská skupina záložek obsahuje stížnosti a open data; Indikátory < 15 000 znaků textu |
| A0.6 | **Měsíční kmen: přepínač.** Segmented control „všech 7 / bez VZP / od 1/2023“ nad `indexedLines`; výchozí „všech 7“; stav v URL `?kmen=bez-vzp` | data v repu | `src/pojistovny-kmen-mesicni.js`, `src/zp-interact.js` | 0,25 | bez VZP má osa rozsah ≤ 5 p. b.; reduced motion test |
| A0.7 | **Vysvětlující vrstva.** Do „O projektu a datech“ a do hlavičky Peněz box „Jak systém funguje“ se čtyřmi větami (sedm ZP, 100% přerozdělení, platba státu, dohled MZ a MF) a odkazem `strategie.html?id=pojistovny`; explainer `pojistovny` doplnit o `linked_pages: ['pojistovny.html']` | Z7 | `pojistovny.html`, `src/pojistovny-prehled.js`, `data/explainers.json` | 0,25 | `validate:explainers` zelené; odkaz ze srovnávače na explainer a zpět |

### Fáze A1 — Peníze z dat MZ (6 běhů; data a grafy B, stránka a skripty C)

| ID | Úkol | Zdroj | Soubory | Třída | Odhad | DoD |
|---|---|---|---|---|---|---|
| A1.1 | **Fetcher + transform Hodnocení MZ 2015–2024.** `ingest/fetchers/mz-hodnoceni.js`: stáhne 20 XLSX (+ 10 PDF kvůli Tab. 7 a Tab. 5) do `ingest/cache/mz-hodnoceni/`, manifest se sha256 jako u VZ. `ingest/transform_pojistovny_hospodareni_rady.js`: z `tab.č.1`, `1a`, `1b`, `1c`, `1d`, `2`, `4` a z PDF Tab. 5 a 7 → **`data/pojistovny-hospodareni-rady.json`** `{roky[2015…2024], pojistovny[{kod, zkratka, rady: {pojistenci_prumer, statni_pojistenci, statni_pojistenci_pct, zamestnanci, pojistencu_na_zamestnance, prijmy_celkem_mld, pojistne_po_prerozdeleni_mld, platba_statu_mld, naklady_zs_mld, naklady_na_pojistence_kc, provozni_naklady_mil, provozni_naklady_pct, provozni_limit_pct, zustatek_bu_zfzp_mld, rezervni_fond_mld, pohledavky_po_lhute_mil, zavazky_po_lhute_mil, hospodarsky_vysledek_mld}[rok→{hodnota, zdroj, list, radek}]}], cr{…}}`. Historické kódy (Hornická, Hutnická → RBP; ZP Metal-Aliance → ČPZP) mapovat podle `ingest/mapping/pojistovny_kody.json` s rokem sloučení; před sloučením hodnoty zvlášť, ne sečtené. Validátor: 7 ZP × 10 let, součet ZP = řádek celkem (±0,5 %), rok 2024 = hodnoty v `pojistovny.json → hospodareni` (±0,1 %) | Z1 | `ingest/fetchers/mz-hodnoceni.js`, `ingest/lib/mz-hodnoceni.js` (čisté parsery: `parseTab1(rows)`, `parseTab7(text)`…), `ingest/transform_pojistovny_hospodareni_rady.js`, `ingest/mapping/pojistovny_kody.json`, `data/pojistovny-hospodareni-rady.json`, `ingest/validate-pojistovny.js` (`validateHospodareniRady`), `tests/mz-hodnoceni.test.js` (fixtures: 2 malé XLSX listy + úryvek PDF textu) | B (+ C jen `package.json` skript `data:pojistovny-mz`, do té doby `node ingest/…`) | 2 | 10 let × 7 ZP bez `null` u 12 základních řad; test parseru na fixtuře; každá hodnota nese list a řádek |
| A1.2 | **Přerozdělení: výběr vs. výsledek.** `ingest/fetchers/mz-prerozdeleni.js`: stáhne `prerozdelovani_pojistovna_vyber_<rok>_12.pdf` (2021_12, 2024_12, aktuální) a `…_vysledek_*` pro 2019–2021 (doplnění Z3), `pdftotext -layout`, parser řádků „Název (kód) 12 čísel“ (fixture = úryvek výše) → `ingest/manual/pojistovny/prerozdeleni-mz-vyber.json` (stejná struktura jako `prerozdeleni-mz-pojistovna.json`). `ingest/transform_pojistovny_prerozdeleni.js` → **`data/pojistovny-prerozdeleni.json`**: po ZP a měsíci `vybrano`, `po_prerozdeleni`, `rozdil = po_prerozdeleni − vybrano` (hrubé saldo: zahrnuje podíl ZP na platbě státu), ročně totéž + ~~`platba_statu` z `tab.č.1c`~~ (není platba státu, viz Z1) a **`saldo_relativni`** (definice níže), na pojištěnce (měsíční kmen § 4.3). **Změna po implementaci (3. 11. 2026): „čisté saldo vůči platbě státu“ z veřejných dat nejde** (MZ platbu státu po ZP nezveřejňuje; list 1c je jen po − před) a odhad podle počtu státních pojištěnců nepoužíváme (pravidlo § 1 bod 3). Místo něj **relativní saldo** = identita bez odhadu: `saldo_relativni = po_prerozdeleni − vybrano × (Σ po_prerozdeleni / Σ vybrano)`, tj. o kolik pojišťovna dostala víc nebo míň, než kdyby se celý objem po přerozdělení rozdělil v poměru jejího podílu na vybraném pojistném; součet přes 7 ZP je z konstrukce nula. Rok grafů = poslední rok s 12 měsíci (`posledni_rok_rocni`). **Revize 3. 11. 2026 (Opus):** sloupec měsíce v PDF MZ je měsíc přerozdělení a nese výběr za předchozí kalendářní měsíc (§ 21 odst. 1 písm. c) zák. 592/1992 Sb.; součet 2/Y–1/Y+1 = Tab. 1 Hodnocení na −0,01 %), roční okno je proto 12/(rok−1)–11/rok; saldo se rozkládá identitou na složku rizikovou (po − n/N·Σpo; složení kmene) a plátcovou (n/N·Σpo − vybráno·Σpo/Σvybráno; příjmy plátců) — kladné saldo RBP a ČPZP je plátcové (nízký výběr na pojištěnce), ne „starší kmen“; texty na webu to říkají, ne „věk kmene“. Grafy na Peníze: (1) diverging `rankedBars` „Relativní saldo přerozdělení <rok> po pojišťovnách“ (`--good`/`--bad` jen jako znaménko toku, ne hodnocení; popisek R3; rok v nadpisu z dat), (2) `segmentedBar` ×2 „vybráno“ vs. „po přerozdělení“ (part-to-whole před a po, poslední celý rok výběru), (3) tabulka ročního relativního salda 2019–<poslední celý rok> v % vybraného; měsíční výběr pojistného jako `indexedLines` (1/2019 = 100) s přepínačem bez VZP. Na přehled graf (1). Text: čtyři věty, co je 100% přerozdělení (§ 20–21a zák. 592/1992 Sb.), proč VZP bere a zaměstnanecké platí (věk kmene), že saldo není „dotace“ ani „ztráta“ | Z2, Z3, Z1 (`1c`) | `ingest/fetchers/mz-prerozdeleni.js`, `ingest/lib/mz-prerozdeleni.js`, `ingest/transform_pojistovny_prerozdeleni.js`, `ingest/manual/pojistovny/prerozdeleni-mz-vyber.json`, `data/pojistovny-prerozdeleni.json`, validátor (`validatePrerozdeleni`: součet 7 ZP = řádek celkem ±2 tis. Kč jako u Z3; `vybrano > 0`; měsíce 1–12), `src/pojistovny-penize.js`, testy | B (stránka Peníze viz A1.6) | 2 | řada výběru a výsledku 1/2019–aktuální měsíc; test: roční součet výběru 2024 ≈ Tab. 1 MZ „pojistné vybrané“ (−0,58 %, WARN; rozdíl hotovostního měsíčního výběru a akruálního ročního údaje nevysvětlen); Σ relativních sald = 0 (±0,001 mld); nadpis grafu nese rok z dat. **Hotovo 3. 11. 2026** (`ingest/fetchers/mz-prerozdeleni.js`, `ingest/transform_pojistovny_prerozdeleni.js`, `data/pojistovny-prerozdeleni.json`): 2024 VZP +17,3 mld (+9,2 % výběru), RBP +2,3 (+21,8 %), ČPZP +0,9, VoZP −3,7, ZP MV ČR −5,6, OZP −9,2 (−32,6 %), ZPŠ −2,0 (−33,2 %) |
| A1.3 | **Státní pojištěnci po ZP.** Z `pojistovny-hospodareni-rady.json` (Tab. 7 MZ, 2024: VZP 55,7 %, VoZP 53,5 %, ČPZP 56,7 %, OZP 55,3 %, ZPŠ 55,1 %, ZP MV ČR 56,1 %, RBP 58,5 %) na kartu ZP (Kmen) řádek „Státní pojištěnci“, `rankedBars` s pásmem ČR 56 % vedle „Podíl seniorů 65+“, a `indexedLines` 2015–2024. Starší roky: PDF Tab. 7 téhož čísla (ověřit, že tabulka existuje ve všech ročnících; kde ne, `null`) | Z1 | `src/pojistovny.js`, `src/pojistovny-prehled.js`, `data/pojistovny.json` (`crp` → nový klíč `statni_pojistenci_pct` s obálkou `{hodnota, rok, zdroj}`), testy | B | 0,5 | karta i graf; validátor: 40–70 % |
| A1.4 | **Náklady podle segmentů po ZP.** Z `Tabulka č. 3` a `3a` (2015–2024, skutečnost + ZPP + předchozí rok) → **`data/pojistovny-segmenty.json`** `{roky, segmenty[{id, nazev, skupina: ambulantni|luzkova|leky|ostatni}], pojistovny[{kod, rady[rok]: {segment_id: {tis_kc, na_pojistence_kc, zpp_tis_kc}}}]}`. Grafy: (1) `segmentedBar` 7× pod sebou, 100 % = náklady ZS, 5 skupin + Ostatní (part-to-whole: liší se podíl lůžkové péče a léků), (2) `dumbbell` ZPP → skutečnost pro 6 největších segmentů vybrané ZP (jako u fondu prevence), (3) `rankedBars` na pojištěnce pro zvolený segment (přepínač A4.3), s pásmem ČR. Poznámka u grafu: segmenty jsou ze ZFZP, akruálně, podle metodiky MZ | Z1 | `ingest/transform_pojistovny_segmenty.js`, `data/pojistovny-segmenty.json`, validátor (`validateSegmenty`: součet segmentů = celkem ±0,5 %; 2024 VZP celkem 295 195 mil = `pojistovny.json`), `src/pojistovny-penize.js`, testy | B | 1 | 10 let, 7 ZP, ≥ 20 segmentů; test na fixtuře listu 3 |
| A1.5 | **Fond prevence a provoz z MZ jako řady.** `Tabulka č. 3c` (fond prevence po ZP 2015–2024, celkem a na pojištěnce) a `1a` (náklady na činnost, limit) → do `pojistovny-hospodareni-rady.json` (A1.1 rozšíření). Na Peníze `indexedLines` „Fond prevence na pojištěnce 2015–2024“ jako **kontext** (PS 7. 10.: není hlavní ukazatel; popisek to říká) a `rankedBars` provoz s limitem vyhl. 418/2003 jako zónou. Na Prevenci jen odkaz | Z1 | jako A1.1 + `src/pojistovny-penize.js` | B | 0,5 | řady bez `null` 2015–2024; limit u všech 7 (dnes chybí u 3) |
| A1.6 | **Stránka Peníze + skripty + workflow** (jeden PR třídy C, připraví Sonnet, merguje vydavatel): `pojistovny-penize.html` (shell, kontejnery pro A1.2/A1.4/A1.5 + přesun tabulky Hospodaření 2024 a Rezerv 2026 z Kmene), `ZP_STRANKY` (B, ale v témž PR), `package.json`: `data:pojistovny-mz` (= fetchery A1.1 + A1.2 + transformy), `validate:pojistovny` už existuje; `.github/workflows/pojistovny-mz.yml`: 1× ročně 20. 6. (Hodnocení vychází do konce května) + 1× měsíčně 10. den (přerozdělení) → PR jako u `pojistovny-vz.yml`; `middleware.js` matcher už pokrývá `/pojistovny-:path*`; e2e/a11y seznamy + baseline | — | `pojistovny-penize.html`, `src/pojistovny-penize.js` (orchestrace), `src/pojistovny-shell.js`, `package.json`, `.github/workflows/pojistovny-mz.yml`, `tests/e2e/*` | **C** | 1 | stránka pod heslem, v záložkách, axe bez critical; workflow dry-run lokálně (`--dry-run`) |

### Fáze A2 — Instituce a profil (3 běhy)

| ID | Úkol | Zdroj | Soubory | Třída | Odhad | DoD |
|---|---|---|---|---|---|---|
| A2.1 | **Dataset instituce.** **`data/pojistovny-instituce.json`** po ZP: `zakon` (551/1991 / 280/1992), `vznik {rok, puvod: 'statni'|'resortni'|'podnikova'|'oborova', poznamka}` (např. ZPŠ = Škoda Auto, RBP = hornictví + sloučení Hornické a Hutnické, ČPZP = sloučení…), `organy {spravni_rada {pocet, jmenuje: [{kdo, pocet}]}, dozorci_rada {…}, reditel {funkce, od, zdroj}}` **bez jmen** (jména = C, viz níže), `dohled: ['MZ', 'MF']`, `provozni_limit_pct {hodnota, rok, zdroj: vyhl. 418/2003}`, `zamestnanci` a `pojistencu_na_zamestnance` (odkaz na A1.1), `clenstvi: ['SZP ČR']`, `web_pro_poskytovatele`. Zdroje: VZ kapitola „Orgány“ (Z4, 20 textů), zákony (Z5; **ověřeno 3. 11. 2026 v A2.1:** zák. 280/1992 Sb. § 10a odst. 1–2 — správní rada 15 = 5 jmenuje vláda + 5 volí zaměstnavatelé a OSVČ + 5 volí zaměstnanci a OBZP, dozorčí rada 9 = 3 + 3 + 3; § 9a ředitel; zák. 551/1991 Sb. § 20 odst. 2 — SR VZP 30 = 10 vláda + 20 Poslanecká sněmovna, § 21 odst. 3 DR 13 = 3 + 10; **Poslanecká sněmovna volí jen u VZP**, původní domněnka plánu o volbě PSP u zaměstnaneckých ZP byla chybná), MZ Tab. 7. UI na Instituce: tabulka 7 × (zákon · vznik · správní rada · dozorčí rada · zaměstnanci · pojištěnců na zaměstnance · limit provozu) + text „kdo pojišťovnu řídí“ ve 4 větách. **Jména členů orgánů**: volitelný druhý PR třídy C (`pojistovny-instituce-osoby.json`, stejná pravidla jako `ppo-osoby.json`, odkaz na `pracovni-osoba.html`, pokud osoba už v PPO je) — rozhodne vydavatel | Z4, Z5, Z1 | `data/pojistovny-instituce.json`, validátor (`validateInstituce`: enumy, součet jmenovaných = počet), `src/pojistovny-instituce.js`, testy | B (jména C) | 1,5 | 7 ZP bez `null` u zákona, vzniku, orgánů, zaměstnanců; každé pole zdroj + rok |
| A2.2 | **Explainer „Jak funguje přerozdělení“** z draftu `drafts/explainer-prerozdeleni-pojistneho-tisk-70.json` zobecnit na stálý explainer `prerozdeleni_pojistneho` (mechanismus § 20–21a zák. 592/1992: 100% výběr, platba státu, věkové skupiny × pohlaví, PCG, nákladné služby; tisk 70 jako příklad mimořádného přerozdělení), `linked_pages` na Peníze; odkaz z A1.2 | Z7 | `data/explainers.json`, `drafts/` (draft smazat po převzetí) | B | 0,5 | `validate:explainers`; evidence-audit fronta |
| A2.3 | **Profil pojišťovny `pojistovna.html?zp=111`.** Jedna stránka, všechny hodnoty jedné ZP: hlavička (zkratka, název, kód, web, zákon, vznik), KPI (kmen, podíl, 65+, státní, náklady na pojištěnce vykázané/přepočtené, saldo přerozdělení, provoz, rezerva 2026), mini-grafy řad 2015–2024 (`indexedLines` jedna řada + ČR), segmenty (`segmentedBar`), prevence (max. příspěvek, struktura fondu), aplikace (funkce), servis (pobočky, stížnosti), instituce (orgány), odkazy „celé téma →“. Renderery = existující funkce s filtrem na jednu ZP (žádná duplikace logiky; `buildKarta(kod)` v každém modulu). Neplatné `?zp=` → seznam sedmi. „Karta … →“ na přehledu a chip „Moje pojišťovna“ míří sem. Sitemap/noindex jako ostatní | vše výše | `pojistovna.html`, `src/pojistovna.js`, `src/pojistovny*.js` (export `build*Karta`), `tests/pojistovna.test.js`, e2e | **C** | 1 | 7 profilů renderují bez chyby; `?zp=999` = rozcestník; axe |

### Fáze A3 — Smluvní politika a dostupnost (2,5 běhu, B)

| ID | Úkol | Zdroj | Soubory | Odhad | DoD |
|---|---|---|---|---|---|
| A3.1 | **Co pojišťovny publikují o dostupnosti.** Inventář jako u stížností: po ZP `dostupnost {publikuje_cekaci_doby: ano|castecne|ne, co: [...], url, citace, rok}` z VZ textů (jen VZP a ZP MV ČR zmiňují „čekací“) a webů (VZP: data o čekacích dobách na operace? ověřit; KZP = nadřízený orgán, ne zdroj po ZP). UI na Instituce: matice pokrytí (`coverageMatrix`) 7 × 4 (čekací doby · síť v nedostatkových oblastech · zajištění péče na žádost · lhůty NV 307/2012). Žádné číslo se neodhaduje; prázdné buňky = otázka do kola 1 (sada 2 už má otázku na dostupnost? pokud ne, doplnit do `pojistovny-otazky.json`) | Z4, weby ZP | `data/pojistovny-dostupnost.json`, validátor, `src/pojistovny-instituce.js`, `data/pojistovny-otazky.json` | 0,5 | 7 ZP, každá buňka má zdroj nebo `null`; indikátor `cekaci_doba_kycel` (zdroj VZP) prolinkovaný |
| A3.2 | **Smluvní programy pro poskytovatele.** Rešerše 7 webů (sekce pro poskytovatele): bonifikační/kvalitativní programy (VZP PLUS a programy kvality, OZP bonifikace, ČPZP, ZP MV ČR, VoZP, RBP, ZPŠ), e-health bonifikace, programy pro nedostatkové regiony → **`data/pojistovny-smluvni-programy.json`** `{pojistovny[{kod, programy[{id, nazev, segment: 'VPL'|'PLDD'|'AS'|'nemocnice'|'stomatologie'|…, kriteria: ['kvalita','dostupnost','e-health','prevence'], od_roku, url, citace, overeno_at}]}]}`; UI: `dotMatrix` ZP × kritérium (má program s kritériem ano/ne) + seznam programů vybrané ZP. Popisek: existence programu ≠ jeho účinek (to je oblast `kvalita` semaforu, verdikt člověk) | Z6 | `data/pojistovny-smluvni-programy.json`, validátor, `src/pojistovny-instituce.js`, testy | 1,5 | každá ZP ≥ 1 ověřený odkaz nebo explicitní „nenalezeno“ s datem; drift-check URL ve `verify:ambulance-drift` stylu (volitelně) |
| A3.3 | **§ 16 zák. 48/1997 po ZP.** VZ texty počty neuvádějí (grep 3. 11.); doplnit inventář „co ZP o § 16 publikuje“ (VZP tiskové zprávy, ostatní VZ text) do `pojistovny-dostupnost.json` jako čtvrtý sloupec; počty jen tam, kde jsou (zdroj + rok); jinak otázka do kola 1 | Z4, weby | jako A3.1 | 0,5 | žádný odhad; otázka v `pojistovny-otazky.json` |

### Fáze A4 — Nástroje analytika (2,5 běhu, B)

| ID | Úkol | Soubory | Odhad | DoD |
|---|---|---|---|---|
| A4.1 | **Export CSV + odkaz na JSON.** Do primitiv `zp-viz.js` (tabulkové dvojče) tlačítko „Stáhnout CSV“: generuje se v prohlížeči z `<table>` (`Blob`, `URL.createObjectURL`, UTF-8 s BOM kvůli Excelu, oddělovač `;`), název `hspa-pojistovny-<id>-<rok>.csv`, bez serveru a bez sledování. Do patičky každé podstránky „Data této stránky (JSON)“ = odkazy na `data/pojistovny*.json`, které stránka načetla (`loadJson` je zaznamená). Licence CC-BY 4.0 v hlavičce CSV | `src/zp-viz.js`, `src/zp-interact.js` (delegovaný click), `src/pojistovny-shared.js`, `src/styles.css`, `tests/zp-viz.test.js` (čistá funkce `tableToCsv(rows)`) | 1 | každé dvojče má tlačítko; CSV otevřené v LibreOffice má správné sloupce; e2e stáhne soubor |
| A4.2 | **„Porovnat s“ – druhá pojišťovna.** Vedle chipů Moje pojišťovna druhý řádek „Porovnat s“ (chip, `localStorage` `hspa-porovnat-zp`, událost jako `MOJE_EVENT`). Marky druhé ZP dostanou `.is-porovnat` (obrys v barvě ZP, ne výplň); tabulková dvojčata zvýrazní oba řádky; karta na přehledu jako dvě sloupce `<dl>` s rozdílem; na profilu `?zp=111&porovnat=205`. Bez výběru se nic nemění | `src/zp-interact.js`, `src/pojistovny-prehled.js`, `src/pojistovna.js`, `src/styles.css`, testy, e2e | 1 | klik na chip → `[data-zp="205"].is-porovnat` ve všech grafech; výběr přežije přechod stránek; reduced motion |
| A4.3 | **Přepínač roku / segmentu u řad.** Společná komponenta v `zp-viz.js`: `figureSwitch({id, options, selected})` v `figcaption`; graf se překreslí z řady (A1.1, A1.4, A1.2) bez skoku layoutu (předchozí render 60 % opacity, jako přepnutí ZP); stav v URL `?rok=2022`; tabulkové dvojče ukáže všechny roky | `src/zp-viz.js`, `src/zp-interact.js`, `src/pojistovny-penize.js`, testy | 0,5 | u 5 grafů; test čisté funkce výběru roku; a11y: `role="radiogroup"` |

### Fáze A5 — Rutina a údržba (0,5 běhu, C)

| ID | Úkol | Soubory | Třída | DoD |
|---|---|---|---|---|
| A5.1 | Blok do `PROMPT_ROUTINE.md`: po merge A1.6 kontrola PR z `pojistovny-mz.yml` (nový rok Hodnocení v červnu, nový měsíc přerozdělení) = přepis do dat je automatický, redakce jen schválí PR a doplní `changelog`; ročně po VZ (červen) aktualizace `pojistovny-instituce.json` (orgány, ředitel) a `pojistovny-smluvni-programy.json` (drift URL) | `PROMPT_ROUTINE.md`, `docs/scheduled-sessions.md` | C | zapsáno, jeden odstavec |

### Fáze A6 — Fond prevence jinak (rozhodnutí vydavatele 3. 11. 2026: směry 1 + 4)

**Proč se to předělává.** Revize dat 3. 11. 2026 (MZ Hodnocení Tab. 16/17 za 2018–2024, NKÚ 20/24,
e-Sbírka) ukázala, že A1.5 uchopilo fond prevence špatně:

- Řada „fond prevence na pojištěnce 2015–2024“ sčítá zdravotní programy, ozdravné pobyty a „ostatní
  činnosti“. V letech 2021–2022 šlo přes „ostatní činnosti“ antigenní testování na covid (967 a
  1 012 mil. Kč, u VZP 65 % a 59 % fondu). Index 2015 = 100 ukazuje covidový hrb jako „růst prevence“.
- Pořadí pojišťoven se po očištění obrací: ZPŠ má celkem 402 Kč na pojištěnce (2024), ale 71 % fondu
  jsou „ostatní činnosti“; jen zdravotní programy dávají ZP MV 323, OZP 316, ČPZP 306, VZP 290, VoZP 250,
  ZPŠ 105, RBP 82 Kč. Co MZ počítá do „ostatních činností“, Hodnocení nedefinuje (otázka pro ZPP/VZ).
- Skok VZP 2023 → 2024 (955 → 2 079 mil.) je legislativní: od 1. 1. 2023 má VZP stejné zdroje fondu
  jako ZZP (§ 7c zák. 551/1991, § 18b zák. 280/1992: ze ZF až 3 % pojistného po přerozdělení za
  předchozí rok, jen při neschodkovém ZPP; dál pokuty, penále, přirážky a provozní fond). Reálně
  čerpají všechny 0,7–1,0 %.
- Položková struktura z VZ není srovnatelná (ZP MV 1 položka, ČPZP 5, RBP 48, ZPŠ 35 z roku 2020);
  regexové skupiny u tří ZP hází většinu do „ostatní“.
- Fond je nenárokový, MZ do podmínek nezasahuje (odpověď MZ podle zák. 106, 11/2025: odepření
  příspěvku pojištěnci s podanou přeregistrací není vybočení ze zákona). NKÚ 20/24: skryté
  financování výzkumu z fondu (1,36 mil.), 182 tis. za klienty jiných ZP, zakázka na ozdravné pobyty
  58,9 mil. v rozporu se ZZVZ, nevyčerpaných 536 mil. k 31. 12. 2020.

Směry 2 (fond jako % pojistného a plán vs. skutečnost) a 3 (nárok vs. čerpání, počty příspěvků)
zůstávají v záloze; 2 je z A6.1 dopočitatelný bez nových dat.

| ID | Úkol | Zdroj | Soubory | Třída | Odhad | DoD |
|---|---|---|---|---|---|---|
| A6.1 | **Kam fond skutečně teče (Tab. 17).** Parser `parseTab17` z textu PDF Hodnocení 2018–2024 (2015–2017 mají jen celek) → do `pojistovny-hospodareni-rady.json` řady `fond_prevence_programy_mil`, `fond_prevence_pobyty_mil`, `fond_prevence_ostatni_mil`, `fond_prevence_jine_zdroje_mil` (jen VoZP), `fond_prevence_programy_na_pojistence_kc`; `cr.rady` totéž 2015–2024 z Tab. 16. Peníze: indexovaný graf fondu celkem **stáhnout**; místo něj (a) `rankedBars` „Zdravotní programy z fondu prevence na pojištěnce“ s `figureSwitch` roku 2018–2024 a poznámkou k covidu 2021–22 a k legislativní změně VZP 2023, (b) `stackedRows` programy / pobyty / ostatní po ZP (rok z přepínače), (c) řádek ČR 2015–2024 s podílem „ostatních činností“ (covid viditelný), (d) kontextová tabulka „programy na pojištěnce × změna kmene k 1. 1. a 1. 7.“ z `pojistovny-kmen-mesicni.json` (`prestupy`, 2022–2025) výslovně bez kauzality. Validace: Σ složek = celkem ±1 mil. Kč, programy ≤ celkem | Z1 | `ingest/lib/mz-hodnoceni.js`, `ingest/transform_pojistovny_hospodareni_rady.js`, `ingest/lib/validate-hospodareni-rady.js`, `data/pojistovny-hospodareni-rady.json`, `src/pojistovny-penize.js`, `tests/mz-hodnoceni.test.js`, `tests/pojistovny-penize.test.js`, `docs/data-model.md` | B | 1 | řady bez `null` 2018–2024 u 7 ZP; fixtura z textu PDF v `tests/fixtures/mz-hodnoceni/`; idempotence transformu |
| A6.2 | **Prevence, nebo nábor? (pravidla a kontroly fondu).** Nový `data/pojistovny-fond-pravidla.json`: zákonný rámec (§ 7b/7c zák. 551/1991, § 18a/18b zák. 280/1992, strop 3 %, nenárokovost, stanovisko MZ 106 11/2025), podmínky čerpání po ZP z dokumentů „Podmínky fondu prevence“ (trvání registrace / nepodání přeregistrace, preventivní prohlídka podle § 18a, dluh na pojistném, lhůta podání, roční strop dospělý/dítě, čerpání jen přes aplikaci), každá položka `{stav: ano\|ne\|castecne\|null, citace, url, overeno_at}`; kontroly NKÚ (18/14 VoZP, 20/24 VZP, 23/12 ZP MV: rok, co se kontrolovalo, zjištění k fondu, částky, reakce ZP, url) a kontroly MZ/MF z kap. 4.4 Hodnocení. Stránka Prevence: sekce „Pravidla fondu: kdo smí čerpat a kdo to kontroluje“ (`coverageMatrix` podmínek 7 × n, časová osa kontrol, odkaz na explainer `fond_prevence` v `explainers.json`). Žádná jména osob | NKÚ, weby ZP, e-Sbírka, MZ | `data/pojistovny-fond-pravidla.json`, `ingest/lib/validate-fond-pravidla.js`, `ingest/validate-pojistovny.js`, `src/pojistovny-prevence.js`, `pojistovny-prevence.html`, `data/explainers.json`, `tests/pojistovny-fond-pravidla.test.js`, `docs/data-model.md` | C | 1,5 | každé tvrzení s `url` a citací; validátor enumů a https; prázdná buňka = otázka do kola 1; screenshoty 1280/390/dark |

---

## 4. Pořadí a odhad

| Pořadí | Balíčky | Běhy | Třída | Proč takhle |
|---|---|---|---|---|
| 1 | A0.1–A0.7 | 1,5–2 | B | viditelné zlepšení hned, bez nových dat |
| 2 | A1.1 → A1.2 → A1.3 → A1.4 → A1.5 | 6 | B | nejcennější chybějící pohled (peníze); A1.1 je základ pro vše ostatní; do merge A1.6 se grafy renderují dočasně na Kmeni (sekce „Peníze“), přesun je jen změna kontejneru |
| 3 | A1.6 | 1 | **C** | jeden PR vydavateli: stránka Peníze + skripty + workflow |
| 4 | A4.1 → A4.3 → A4.2 | 2,5 | B | nástroje nad novými řadami |
| 5 | A2.1 → A2.2 | 2 | B | instituce (dočasně sekce na Kmeni, po A2.3/A1.6 vlastní stránka) |
| 6 | A2.3 + `pojistovny-instituce.html` | 1 | **C** | druhý PR vydavateli: profil + stránka Instituce |
| 7 | A3.2 → A3.1 → A3.3 | 2,5 | B | rešerše webů, inventáře |
| 8 | A5.1 | 0,5 | **C** | rutina |
| **Σ** | | **~16** | 3× C | |

Závislosti: A1.3, A1.5 ← A1.1; A1.2 ← A1.1 (jen `pojistenci_prumer`); A4.3 ← A1.1/A1.4; A2.3 ← A1.x, A2.1;
A0.1 druhá verze (saldo na přehledu) ← A1.2.

---

## 5. Co z veřejných dat nejde (a co s tím)

| Chybí | Proč to veřejně není | Co plán dělá |
|---|---|---|
| Hrubé toky přestupů (odkud kam) | CRP zveřejňuje jen stavy; MZ měsíční řada dává čistou změnu | A0.6 ukazuje čistou změnu; otázka do kola 1 (sada 2: „počet příchozích a odchozích k 1. 1. a 1. 7.“) + žádost ÚZIS o agregát přestupů ZP × ZP × rok (člověk odesílá, metodika § 4.3) |
| Platba státu po pojišťovnách (a tedy „čisté saldo“ přerozdělení) | MZ zveřejňuje jen celkovou platbu státu; po ZP jen vliv přerozdělování (po − před), list 1c Hodnocení | A1.2 relativní saldo jako identita (složka riziková + plátcová), odhad podle státních pojištěnců se nepoužívá |
| Čekací doby po pojišťovnách | žádná ZP je systematicky nepublikuje; KZP data nejsou po ZP | A3.1 inventář „kdo co publikuje“, otázka do kola 1 |
| Žádosti podle § 16 (počty, schválenost) po ZP | ve VZ textech 2023–2025 jen slovně | A3.3 inventář + otázka |
| Věkově-pohlavní nákladové váhy (standardizace) | sada ÚZIS 5.3 zatím nevyšla (inventář `mezery`) | zůstává P3.3; do té doby index přerozdělení s poctivým názvem (A0.4) |
| Čerpání fondu prevence podle věku a účast v programech | ZP nezveřejňují | otázka kola 1 (sada 2), PS 7. 10. |
| Přívětivost aplikací (kritéria) | hodnotí PS a IT expert | P2.3 |
| Verdikty semaforu | píše člověk po právu na odpověď | P4.2 |
| ZPP a VZ jako sněmovní tisky | `psp.cz` z prostředí neodpovídá | brát z webů ZP (`pojistovny-vz.yml`) a MZ; tisk 280 (ZPP 2026) už v repu přepsán |

---

## 6. Datové kontrakty (nové soubory, shrnutí)

Všechny nové soubory: `version`, `generated_at`, `_doc` (co, odkud, jak číst), `zdroj{nazev, url,
stazeno_at}`, hodnoty v obálce `{hodnota, rok, zdroj, list?, radek?, poznamka?}` nebo `null`; kódy
ZP jako řetězce `"111"`; validace v `ingest/validate-pojistovny.js` (nová funkce na soubor, zapojená
do `validateAll`), schéma do `docs/data-model.md` v témž PR.

| Soubor | Klíčová struktura | Validace navíc |
|---|---|---|
| `data/pojistovny-hospodareni-rady.json` | `roky[]`, `pojistovny[].rady.<ukazatel>[rok]`, `cr.rady` | součet ZP = ČR ±0,5 %; 2024 = `pojistovny.json` ±0,1 %; sloučené ZP podle `pojistovny_kody.json` |
| `data/pojistovny-prerozdeleni.json` | `mesice[]`, `pojistovny[].{vybrano[], po_prerozdeleni[], rozdil[]}`, `rocne[rok].{vybrano_mld, po_prerozdeleni_mld, rozdil_mld, saldo_relativni_mld, saldo_relativni_pct_vybraneho, saldo_relativni_na_pojistence_kc, pojistenci_prumer, mesicu}`, `rozdil_relativni[]`, `celkem`, `posledni_rok_rocni` | součet 7 = celkem ±2 tis. Kč; `vybrano > 0`; Σ `saldo_relativni_mld` za rok = 0 (±0,001); roční hodnoty jen pro 12 měsíců |
| `data/pojistovny-segmenty.json` | `segmenty[]{id, nazev, skupina}`, `pojistovny[].rady[rok][segment_id].{tis_kc, na_pojistence_kc, zpp_tis_kc}` | Σ segmentů = celkem ±0,5 % |
| `data/pojistovny-instituce.json` | `pojistovny[].{zakon, vznik, organy, dohled, provozni_limit_pct, clenstvi}` | enumy; Σ jmenovaných = počet členů |
| `data/pojistovny-dostupnost.json` | `pojistovny[].{cekaci_doby, sit_nedostatkove, zajisteni_pece, lhuty_307, par16}` každé `{stav: ano|castecne|ne|null, co, url, citace, rok}` | enum stavů; `ano` vyžaduje `url` |
| `data/pojistovny-smluvni-programy.json` | `pojistovny[].programy[]{id, nazev, segment, kriteria[], od_roku, url, citace, overeno_at}` | enumy segmentů a kritérií; `url` https |
| `data/pojistovny-fond-pravidla.json` | `ramec{zakon[], strop_pct, nenarokovost, stanovisko_mz}`, `podminky[]{id, nazev}` × `pojistovny[].podminky{id: {stav, citace, url, overeno_at}}`, `kontroly[]{organ, cislo, rok, pojistovna, zjisteni[], castky, reakce, url}` | enumy stavů; `url` https; žádná jména osob |
| `ingest/manual/pojistovny/prerozdeleni-mz-vyber.json` | jako `prerozdeleni-mz-pojistovna.json` (rok → kód → 12 měsíců, tis. Kč) | jako Z3 |

---

## 7. Co potřebuji od vydavatele

1. **Tři PR třídy C** (A1.6, A2.3 + Instituce, A5.1): nové stránky, `package.json`, workflow, rutina.
   Vše ostatní jde přes editora jako B.
2. **Rozhodnutí: jména členů orgánů ano/ne** (A2.1). Bez nich je stránka Instituce úplná
   (složení a kdo jmenuje), se jmény je to osobní údaj veřejných funkcionářů = pravidla PPO.
3. **Potvrzení R3 pro saldo přerozdělení na přehledu**: je to fakt zákonného mechanismu
   (VZP bere, zaměstnanecké platí, protože mají mladší kmen), ne hodnocení; popisek to říká.
4. **Názvy záložek** (§ 2): „Peníze“, „Aplikace a servis“, „Instituce“ jsou návrh; změna je jeden
   řádek v `ZP_STRANKY`.
5. Nic z plánu neodesílá dotazy pojišťovnám; otázky, které plán přidává do `pojistovny-otazky.json`,
   jdou ven až s kolem 1 (člověk, metodika § 4.3).

---
## 8. Stav implementace (3. 11. 2026)

Commity jsou v historii větve `claude/focused-hopper-ley6gn`. Odchylky od plánu z implementace (relativní saldo místo čistého, okno přerozdělení, složení orgánů podle § 10a a § 20 zákonů, jména členů orgánů) jsou zapsané v § 0 a § 3 a tady se neopakují.

| Balíček | Stav | Commit / soubor | Poznámka |
|---|---|---|---|
| A0.1 | hotovo | e245c51 · `src/pojistovny-prehled.js` | přehled má 4 grafy s rozptylem; matice VZ a n/10 pryč (§ 3) |
| A0.2 | hotovo | e245c51 · `src/styles.css` | grafy přehledu pod sebou na mobilu |
| A0.3 | hotovo | e245c51 · `src/pojistovny.js` | popisek rezerv bez čísla 3,5 % |
| A0.4 | hotovo | e245c51 · `src/pojistovny.js`, `pojistovny-kmen.html` | pojmenování přepočtu |
| A0.5 | hotovo | e245c51 · `pojistovny-aplikace.html`, `src/pojistovny-shell.js` | Aplikace a servis: servis, stížnosti, § 16a, open data |
| A0.6 | hotovo | e245c51 · `src/pojistovny-kmen-mesicni.js` | přepínač „všech 7 / bez VZP“ |
| A0.7 | hotovo | e245c51 · `data/explainers.json` | vysvětlující vrstva a explainer `pojistovny` |
| A1.1 | hotovo | 4b8c78e · `ingest/fetchers/mz-hodnoceni.js`, `data/pojistovny-hospodareni-rady.json` | řady 2015–2024 z XLSX a PDF MZ |
| A1.2 | hotovo | 078dbec, 59e9a01 · `data/pojistovny-prerozdeleni.json` | relativní saldo, okno 12/Y−1–11/Y (§ 3) |
| A1.3 | hotovo | e72bdc2 · `src/pojistovny-penize.js`, karta ZP na Kmeni | státní pojištěnci z Tab. 7 |
| A1.4 | hotovo | 80742cf · `data/pojistovny-segmenty.json` | segmenty z Tabulky č. 3 a 3a |
| A1.5 | hotovo | e72bdc2 · `src/pojistovny-penize.js` | fond prevence a provoz jako řady, limit u 7 ZP |
| A1.6 | hotovo (třída C) | e72bdc2, b6538c7 · `pojistovny-penize.html`, `package.json`, `.github/workflows/pojistovny-mz.yml` | stránka, skript `data:pojistovny-mz` a workflow; merge rozhodne vydavatel |
| A2.1 | hotovo bez jmen | 28def47 · `data/pojistovny-instituce.json` | jména členů orgánů nejsou; volitelný PR třídy C nerozhodnut (§ 3) |
| A2.2 | hotovo | e245c51 · `data/explainers.json` (`prerozdeleni_pojistneho`) | explainer přerozdělení |
| A2.3 | hotovo | f691fa8, 35a8c65 · `pojistovna.html`, `src/pojistovna.js`, `middleware.js` | profil `?zp=`; rozcestník bez parametru |
| A3.1 | hotovo | 4e5ea61 · `data/pojistovny-dostupnost.json` | prázdné buňky = otázka do kola 1 |
| A3.2 | hotovo | 53a6d77 · `data/pojistovny-smluvni-programy.json` | každý program s citací a datem ověření |
| A3.3 | hotovo | 4e5ea61 · `data/pojistovny-dostupnost.json` (sloupec § 16) | počty jen tam, kde je zdroj |
| A4.1 | hotovo | e4f2ae8 · `src/zp-viz.js` (`tableToCsv`), `src/zp-interact.js` | CSV u tabulkových dvojčat, odkazy na JSON v patičce „Zdroje“ |
| A4.2 | hotovo | 64eb832 · `src/zp-interact.js`, `src/pojistovny-prehled.js`, `src/pojistovna.js` | druhý výběr „Porovnat s“ (`hspa-porovnat-zp`): obrys marků, karta se třemi sloupci na přehledu, profil `?porovnat=`; výběr přežívá přechod mezi stránkami |
| A4.3 | hotovo | 64eb832 · `src/zp-viz.js`, `src/zp-interact.js` | `figureSwitch` (radio/select, `zp:switch`, URL parametry `?kmen=`, `?ukazatel=`, `?rok=`, `?segment=`, `?vyber=`); měsíční kmen i Peníze přepnuté na komponentu; složky salda a částky na pojištěnce na Penězích |
| A5.1 | hotovo | 428901a · `PROMPT_ROUTINE.md` | blok „Data MZ po pojišťovnách“ |
| A6.1 | hotovo | ae41b285 · `ingest/lib/mz-hodnoceni.js` (`parseTab16/17`), `src/pojistovny-penize.js` | složky fondu z Tab. 16/17 (ZP 2018–2024, ČR 2015–2024), indexovaný graf stažen; v Hodnocení 2018 má MZ zaměněné sloupce 2018/2018 ZPP, parser to řeší součtem Tab. 17 |
| A6.2 | hotovo (třída C) | `data/pojistovny-fond-pravidla.json`, `src/pojistovny-prevence.js`, explainer `fond_prevence` | 9 podmínek × 7 ZP s citacemi, 11 kontrol NKÚ/MZ/MF 2014–2025; nedohledáno (null = otázka do kola 1): registrace trvá u OZP a ZPŠ, vazba na screening u ČPZP/OZP/ZPŠ/RBP, roční strop ZPŠ a dětský OZP, kontrolní závěr NKÚ u OZP/ZPŠ/RBP |

Nezávislá revize datové vrstvy (Opus, 3. 11. 2026) a její opravy: commity dda3df4 a 59e9a01. Revize UI (Opus, 3. 11. 2026) a její opravy: commit c8e0aa9. PR #1363 zmergován 3. 11. 2026; vizuální baseline e2e pro stránky srovnávače přegenerována na CI runneru (9bef173) a doplněna navazujícím PR. Zbývá z revize UI (PR třídy B s vlastní regenerací baselinu): onkologická matice bez Σ n/5, sloupec „na 100 tis.“ u stížností, karta Instituce na mobilu jako karty.

---

## Příloha — Brief pro implementační session (šablona)

> Balíček `A1.1` z `05_M1_Starter/PLAN-SROVNAVAC-ANALYTIK.md`. Přečti § 0 (řádek zdroje), § 1, § 6
> (kontrakt souboru) a `docs/traps.md`; vizuální pravidla z `PLAN-SROVNAVAC-POJISTOVEN.md` § 2.
> Postav jen soubory z tabulky balíčku, žádné generované artefakty, žádná nová závislost, žádný
> `package.json` (třída C — spouštěj `node ingest/…`). Parsery jako čisté funkce s fixturou v
> `tests/`. Co zdroj neuvádí, je `null` + záznam v `chybi[]`. Před push: `npm test`,
> `npm run validate:all`, screenshoty 1280/390/dark do těla PR. Třída B. Nepřidávej nic mimo DoD.
