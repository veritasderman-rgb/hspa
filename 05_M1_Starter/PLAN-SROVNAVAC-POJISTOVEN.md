# PLAN — Srovnávač zdravotních pojišťoven: rozvoj a vizuální update

_Stav k 2. 11. 2026, po merge PR #1338 (pracovní verze `pojistovny.html` pod heslem).
Navazuje na `09_Srovnavac_pojistoven_plan.md` (moduly, harmonogram pracovní skupiny)
a `docs/metodika-srovnavac-pojistoven.md` (šest oblastí, semafor, pravidla férovosti).
Tenhle dokument řeší, **co s tím udělat v repu**: jak stránku dostavět, jak jí dát
čitelné grafy a kdo (který agent, který člověk) co udělá. Vstupní bod pro každou
další session nad srovnávačem._

> **Shrnutí.** Data jsou z větší části hotová (CRP 2025, hospodaření 2024, ZPP 2026,
> prevence, aplikace), ale stránka je ukazuje jako sedm náhodně obarvených sloupců,
> dvanáctisloupcové tabulky a matice stejných štítků. Plán má tři vrstvy: (0) uklidit
> integrační dluhy z merge, (1) postavit malou, testovanou sadu grafových primitiv
> `src/zp-viz.js` s jednou validovanou paletou pojišťoven a vrstvou animací a interakce
> (koncept **„Moje pojišťovna“**: čtenář si vybere svou pojišťovnu a celá stránka ji
> zvýrazní; vysvětlivky jsou rozklikávací, ne rozbalené), (2) postupně přepnout
> všech šest modulů na nové formy grafů a doplnit data, která už v repu leží
> nevyužitá (absolutní trend kmene 2010–2025, kraj × ZP, ZP × věk v surovém CSV),
> (3) dotazníky sbírat do Neonu přes serverless API, definice otázek zůstává v JSON. Práce je rozdělená na balíčky s třídou PR podle
> `GOVERNANCE.md` a s agentem, který ji má dělat.

---

## 0. Diagnóza: co dnes nefunguje

### 0.1 Grafy (ověřeno screenshoty 1280 px / 390 px / dark, 2. 11. 2026)

| # | Nález | Kde | Důsledek pro čtenáře |
|---|---|---|---|
| G1 | Sloupce v pořadí kódu ZP, ne podle hodnoty | `hbarSvg` (`src/pojistovny.js:30`) | Pořadí se musí luštit; u „Podíl 65+“ se rozdíly 16,8–22,9 % ztrácejí |
| G2 | VZP (56,9 %) určuje měřítko, šest ostatních je slepených dole | Tržní podíl 2025 | Graf říká jen „VZP je velká“, což čtenář ví |
| G3 | Popisky hodnot kolidují s čárkovanou referenční linkou | Podíl 65+ (ČR 20,9 %), Rezervy 2026 (3–4 %) | „19,8 %“ a „19,6 %“ jsou přeškrtnuté linkou |
| G4 | Sedm libovolných barev, VZP v `--ink` | `ZP_COLOR` (`src/pojistovny.js:15`) | Validátor palety: **FAIL** (lightness band, chroma floor). Rainbow bez významu: barva nenese nic, co by nenesl popisek |
| G5 | V repu jsou **dvě různé palety pojišťoven** (`pojistenci.js:81` vs. `pojistovny.js:15`), ani jedna nemá dark variantu ani token | Atlas pojištěnců vs. srovnávač | VZP je jednou červená, jednou černá; čtenář, který přejde ze stránky na stránku, se musí učit znovu |
| G6 | Sparkline v kartě bez osy, let, min/max | `sparkSvg` v `.zpc-card` | Čára bez měřítka: u ZPŠ vypadá růst z 1,2 na 1,3 % stejně dramaticky jako pád VZP z 62 na 57 % |
| G7 | SVG s `viewBox` škáluje text; na 390 px je písmo ~8 px | všechny `.zpc-chart` | Na mobilu nečitelné (viz `shot mobile-charts`) |
| G8 | Tabulka „Hospodaření 2024“ má 12 numerických sloupců bez vizuální opory, bez řazení | `#zpTableFin` | Stěna čísel; horizontální scroll i na desktopu |
| G9 | Matice nabídky 7 × 9: skoro všechno „základní/silné“, štítky stejné váhy | `#zpPrevMatrix` | Není vidět, kde se pojišťovny liší (jediná odchylka je ZP MV ČR) |
| G10 | Matice aplikací ✓/✗ s obřími prázdnými řádky kvůli `<small>` | `#zpAppMatrix` | 10 funkcí × 7 aplikací se nedá přečíst jako „kdo umí víc“ |
| G11 | Struktura fondu prevence = surová tabulka se `<select>` | `#zpFpStruktura` | Nejzajímavější data modulu (plán vs. skutečnost, položky) nejsou vidět |
| G12 | Žádná animace, žádný tooltip, žádné propojení grafů (hover v jednom nezvýrazní ZP v druhém) | celá stránka | Stránka je statická tabulková příloha, ne dashboard |
| G13 | Hero čísla statická (`.ed-stat-static`), ačkoli web má count-up (`.av-counter`) | `#zpHeroStats` | Nevyužitý existující systém |
| G14 | Styly `.zpc-*` inline v HTML, mimo `styles.css`, minifikaci i drift test | `pojistovny.html:21–100` | Dark mode a tisk nejsou hlídané; porušuje `docs/conventions.md` (namespace, inline) |
| G15 | Testy vážou signatury `hbarSvg`/`sparkSvg`/`levelBadge` | `tests/pojistovny.test.js:96` | Redesign musí testy přepsat, ne obejít |
| G16 | Vysvětlující text je všude rozbalený: tříodstavcové leady, dlouhé popisky pod grafy, boxy „Poznámky k pojišťovnám“ / „Co se nepodařilo dohledat“, celé pravidla férovosti | všechny moduly | Graf se musí hledat mezi odstavci; stránka má ~8 obrazovek textu na 390 px |

Stránka není v seznamu vizuálních (`tests/e2e/visual.spec.js`) ani a11y testů
(`tests/e2e/a11y.spec.js`, `tests/a11y/axe-scan.mjs`), takže regresi dnes nic nechytí.

### 0.2 Integrační dluhy z merge (nesouvisí s grafy, ale blokují)

| # | Dluh | Třída PR |
|---|---|---|
| I1 | `validate:pojistovny` neexistuje v `package.json`, není ve `validate:all` | C (`package.json` = závislosti) |
| I2 | Validátor kontroluje jen `pojistovny.json`; aplikace, prevence, otázky a `hospodareni_2025` nehlídá | B |
| I3 | `data/pojistovny.json` `_doc` odkazuje na neexistující `docs/metodika-hlidac-pojistoven.md`; v datech i kódu zůstal název „Hlídač“, který PS 7. 10. odmítla | B |
| I4 | Metodika odkazuje na `changelog` v datasetu, `ingest/manual/pojistovny/odpovedi/` a `data/zadosti-106.json` — nic z toho neexistuje | B |
| I5 | `ingest/manual/pojistovny/*.json` nejsou v matcheru `middleware.js`; bez `.vercelignore` je Vercel pravděpodobně servíruje veřejně (odvozeno z konfigurace, na nasazení neověřeno) | C (`middleware.js`, `vercel.json`) |
| I6 | `scripts/pr-gate.js` zařadí změnu `semafor` v `data/pojistovny.json` jako **B**, metodika § 6 říká **C** (verdikty o jmenovaných institucích) | C (brána) |
| I7 | `renderModuleNav('pojistovny')` cílí na ID, které v navigaci není; stránka není v sitemapě, nikdo na ni neodkazuje (správně, dokud je pod heslem, ale je třeba to mít v checklistu zveřejnění) | C (`page-shared.js`) |
| I8 | `pojistovny.html` chybí v e2e/a11y seznamech (viz 0.1) | B |

### 0.3 Data, která v repu leží a stránka je nečte

| Data | Kde | Co z nich jde postavit |
|---|---|---|
| Absolutní počty pojištěnců 2010–2025 per ZP | `ingest/manual/pojistovny/crp-agregaty-2025.json` → `zp[kod].trend` | Indexovaný vývoj kmene (2010 = 100) na jedné ose; bar-chart „kdo roste, kdo ztrácí“ |
| Kraj × ZP × rok (14 × 16 × 7) | `data/pojistenci-d5-zp.json` | Dlaždicová mapa krajů per pojišťovna (přes `src/cz-map.js`, který už umí dark mode); nahradí `top_kraje[4]` |
| ZP × okres × věk × pohlaví | surové CSV `Datovy-souhrn-OIS-11-47-…-2026-01.csv` (15 MB, kořen repa); `transform_pojistenci_d5.js` to agreguje pryč | **Věková standardizace nákladů a prevence** (metodika § 4.1, plán PS: prosinec 2026) — bez ní srovnání „Kč na pojištěnce“ není férové |
| `hospodareni_2025` (VZP, VoZP, OZP), `podil_80plus`, `zustatek_zfzp`, `zamestnanci`, `prijmy_na_pojistence`, `pojistne_po_prerozdeleni` | `data/pojistovny.json` | Meziroční změna 2024 → 2025 (dumbbell), provozní efektivita |
| `vydaje_zdravotni_sluzby_mld`, `vekova_struktura` | `ingest/manual/pojistovny/zdroje-vz-2024.json` | Chybí v `pojistovny.json` |
| `fond_prevence_struktura.polozky[].predchozi_rok` | `pojistovny-prevence.json` | Trend položek (ZPŠ 35 položek, RBP 48 — potřeba „Ostatní“) |

---

## 1. Hranice (co se nemění)

1. **Rozhodnutí PS 7. 10. 2026** platí: žádný index 0–100, žádné „Kč fondu prevence na
   pojištěnce“ jako hlavní ukazatel, žádné hodnocení úhrad poskytovatelům. Vizualizace
   nesmí tiše vytvořit žebříček pojišťoven tam, kde metodika žebříček nechce — seřazené
   sloupce jsou v pořádku u faktů (kmen, věk, rezervy), ne u „síly nabídky“.
2. **`GOVERNANCE.md` § 3**: verdikty semaforu, texty o pojmenovaných pojišťovnách,
   zveřejnění stránky, `middleware.js`, `package.json`, `page-shared.js` = třída C,
   merguje vydavatel. Grafy, styly, data, testy = třída B, merguje editor.
3. **Brand**: `--red` patří hrotu střelky a roli „náš případ / bad“. Žádná pojišťovna
   není červená (dnes je VZP červená v Atlasu — to je chyba, protože `--red` = `--bad`).
4. **Žádná nová závislost.** Web má self-hosted Chart.js i ECharts, ale pro tuto stránku
   zůstáváme u inline SVG/HTML: tokenový dark mode zdarma, tisk, tabulkový fallback,
   čisté funkce testovatelné v `node:test`. ECharts/`cz-choropleth.js` použijeme jen
   pro případnou mapu kraj × ZP (už umí tokeny).
5. **Generované artefakty se necommitují** (`styles.min.css`, `search-index.json`…),
   viz `CLAUDE.md`.
6. **AI nepíše verdikty.** Semafor zůstává prázdný, dokud ho nenaplní člověk po kole 1
   a právu na odpověď.

---

## 2. Vizuální koncept: „Moje pojišťovna“

Sedm entit je málo na to, aby barva něco říkala, a moc na to, aby se dala přečíst
z duhy. Proto:

### 2.1 Tři pravidla formy

| Pravidlo | Dnes | Nově |
|---|---|---|
| **Emphasis místo rainbow.** Výchozí stav každého grafu je jedna barva (`--ink` 80 %) a seřazené hodnoty. Barva pojišťovny se objeví, až když ji čtenář vybere nebo na ni najede. | 7 barev v každém grafu | 1 barva + zvýraznění |
| **Reference je zóna, ne linka přes popisky.** Průměr ČR / kritická hranice jako podbarvený pás (8 % opacity) + popisek v záhlaví grafu. | čárkovaná linka přes hodnoty | pás + popisek nahoře |
| **Graf má vždy dvojče v tabulce.** `<details>` „Zobrazit jako tabulku“ pod každým grafem; tooltip nikdy není jediná cesta k hodnotě. | tabulky bez grafů, grafy bez tabulek | obojí, propojené |

### 2.2 Výběr „Moje pojišťovna“

Jeden řádek chipů (tečka + zkratka) nad moduly, uložený v `localStorage`
(`hspa-moje-zp`), bez cookies, bez odeslání. Výběr:

- zvýrazní pojišťovnu ve všech grafech (série v barvě ZP, ostatní `--neutral` 55 %),
- přepne „Kam jdou peníze z fondu prevence“ a „Odpovědi z VZ“ na vybranou ZP,
- v tabulkách přidá řádku `aria-current="true"` a pozadí `--paper2`,
- v kartě (modul 3) rozbalí detail.

Bez výběru se nic nerozbije: grafy jsou jednobarevné a seřazené. Hover dělá totéž
dočasně (linked highlighting přes `data-zp="111"` na každém marku a jeden delegovaný
`pointerover` listener).

### 2.3 Jedna paleta pojišťoven, tokeny, obě témata

Pevné pořadí podle kódu, nikdy se nerecykluje, sdílená se `src/pojistenci.js`
(a výhledově `financovani.js`). Hex vychází z referenční kategorické palety dataviz
metodiky (sloty 1–7, slot 8 „red“ vynechán kvůli brandu). Validátor
(`dataviz/scripts/validate_palette.js`) nad povrchem `--paper`:

| Kód | ZP | Light (`#fbf8f1`) | Dark (`#17140f`) |
|---|---|---|---|
| 111 | VZP ČR | `#2a78d6` | `#3987e5` |
| 201 | VoZP | `#eb6834` | `#d95926` |
| 205 | ČPZP | `#1baf7a` | `#199e70` |
| 207 | OZP | `#eda100` | `#c98500` |
| 209 | ZPŠ | `#e87ba4` | `#d55181` |
| 211 | ZP MV ČR | `#008300` | `#008300` |
| 213 | RBP | `#6250d6` | `#9085e9` |

Výsledek: light PASS/PASS/PASS (CVD ΔE 9,1)/PASS, kontrast **WARN** u 205/207/209
(2,0–2,7 : 1) → vyžaduje viditelné popisky a tabulkové dvojče, což 2.1 zaručuje;
dark PASS ve všech pěti kontrolách. Tokeny `--zp-111 … --zp-213` v `src/styles.css`
(`:root` + `:root[data-theme="dark"]`), JS je čte přes `getComputedStyle` (vzor
`cz-choropleth.js:72`). Text se barvou série nikdy nebarví; identitu nese tečka.

### 2.4 Formy grafů podle dat

| Data | Forma | Proč (dataviz heuristika) |
|---|---|---|
| 4 systémová čísla (hero) | KPI řada stat dlaždic s count-up (`.av-counter`) | číslo je graf; existující komponenta |
| Podíl 65+, náklady na pojištěnce, rezervy 2026, provoz % příjmů | **seřazené vodorovné bary**, 1 barva, ref. zóna ČR / limit, hodnota na špičce, ≤ 24 px, 4px zaoblený konec, 2px mezera | magnituda vs. reference |
| Tržní podíl 2025 | **tall segmented bar** (jeden pruh, 7 segmentů, podíl uvnitř kde se vejde) místo barů | part-to-whole na jeden pohled; VZP nerozbije měřítko |
| Vývoj kmene 2010–2025 | **index 2010 = 100**, 7 čar na jedné ose, 2px, direct label na konci, legenda vždy; druhá karta: absolutní změna 2015 → 2025 jako diverging bar (`--good`/`--bad`) | jedna osa, žádné dual-axis; sparkline bez měřítka pryč |
| Kraj × ZP | dlaždicová mapa krajů (`cz-map.js`) pro vybranou ZP + „těžiště“ jako seřazené bary | existující komponenta s dark mode a a11y |
| Fond prevence: položky | **tall segmented bar** (top 5 + Ostatní) + **dumbbell** plán ZPP → skutečnost pro top 6 položek; `predchozi_rok` v tooltipu | part-to-whole + before/after |
| Nabídka 7 × 9 oblastí (stupeň 0–3) | **heatmapa** jednou sekvenční rampou (4 kroky), číslo stupně v buňce, popis v tooltipu, legenda rampy, řazení kliknutím na sloupec | ordinální magnituda v mřížce |
| Onko 5 × bool, duševní 5 × stupeň | malá heatmapa / dot matrix vedle sebe | stejná forma, stejné čtení |
| Aplikace 10 funkcí × 7 | **dot matrix** (plné/prázdné kolečko ≥ 10 px, „—“ pro null) + sloupec `n/10` jako **meter** | identita funkce, ne ✓/✗ v prázdných řádcích |
| 7 otázek × 7 ZP (co VZ odpovídá) | **matice pokrytí** (odpovězeno / částečně / VZ neuvádí) nad akordeony | mezery = to, na co se ptáme |
| Semafor 7 × 6 | tabulka stavů s ikonou + popiskem (nikdy jen barva), prázdný stav viditelně „zatím nehodnoceno“ | status paleta, ne série |
| Hospodaření 2024 (12 sloupců) | tabulka zkrácená na 7 sloupců + **inline thin bar** v buňkách „Náklady na pojištěnce“ a „Provoz %“, řazení kliknutím, zbytek v rozbalovacím detailu | číselná tabulka potřebuje vizuální oporu |

### 2.5 Vrstva animace a interakce

- **IntersectionObserver** (threshold 0,3, `rootMargin -10%`, jednou, `unobserve`);
  stagger 60 ms mezi bary; čáry přes `stroke-dashoffset` 1,2 s; count-up rAF
  `easeOutQuart` 1200 ms (reuse `article-visuals.js`).
- **`prefers-reduced-motion: reduce`** → konečný stav bez přechodu (test v CI).
- **Tooltip**: jeden `<div role="status" aria-live="polite">` na stránku, plněný
  `textContent`, stejný obsah na `focus` (každý mark `tabindex="0"`), hit area ≥ 24 px.
- **Přepnutí ZP** drží předchozí render při 60 % opacity a překreslí bez skoku layoutu.
- **Dark mode**: tokeny; grafy po změně `data-theme` nepřekreslovat, pokud používají
  jen `var(--…)` (SVG `fill="var(--zp-111)"` funguje) — žádný JS pro barvy.
- **Tisk**: `@media print` — bary bez animace, tooltipy skryté, tabulková dvojčata
  rozbalená (`details[open]` přes `print` pravidlo), barvy ZP nahrazené šrafou 45°.
- **Mobil**: bary jako HTML/CSS (šířka v %), ne SVG `viewBox` → text zůstává 13 px;
  heatmapy a matice s `overflow-x:auto` + sticky první sloupec; malé násobky 1 sloupec.

### 2.6 Rozklikávací vysvětlivky (progressive disclosure)

Grafy a čísla jsou na první pohled, vysvětlení na druhé kliknutí. Pravidlo pro
každý modul:

| Vrstva | Co obsahuje | Jak |
|---|---|---|
| 1 · vidím hned | nadpis modulu, **jedna věta** leadu, graf/matice, 1řádkový popisek „zdroj · rok“ | běžný tok stránky |
| 2 · rozkliknu | „Jak to číst“ (metodická poznámka, co graf neříká), „Zdroje a rok údajů“, „Co se nepodařilo dohledat“, „Poznámky k jednotlivým pojišťovnám“, pravidla férovosti, odpovědi z VZ | `<details class="zpc-acc">` (existující komponenta), zavřené, `summary` s počtem položek („Poznámky · 14“) |
| 3 · tabulka | tabulkové dvojče každého grafu | `<details>` „Zobrazit jako tabulku“ |
| 4 · tooltip/focus | zdroj, rok, poznámka k jedné hodnotě (z obálky `{hodnota, rok, zdroj}`) | `role="status"` |

Doplňky: `?otevrit=vse` (nebo tlačítko „Rozbalit vše“ v hlavičce modulu) pro
revizi a tisk; `@media print` otevře všechny `details`; stav rozbalení se
neukládá. Hero lead zkrátit na dvě věty, zbytek do „O projektu“ akordeonu.
Dotýká se balíčků P1.4, P2.2, P2.3, P4.1 (přidáno do DoD).

### 2.7 Dotazníky: definice v JSON, odpovědi v Neonu

Dotazníky (kolo 2 „rizikoví pojištěnci“ pro pojišťovny, dotazník NAPO pro
pacientské organizace, výhledově anketa čtenářů „co vám u vaší pojišťovny
chybí“) nepatří do statického JSON ani do e-mailu. Web už má vzor: statický
frontend + Vercel serverless funkce (`api/subscribe.js` → Brevo). Stejný vzor
pro dotazníky s **Neonem** (Postgres; organizace vydavatele už má projekty
`lepsiml-dotaznik`, `pirati-skoleni-dotaznik` jako precedens):

- **Definice** dotazníku zůstává v `data/pojistovny-otazky.json` (verzovaná,
  validovaná; každá sada dostane `verze` a `platne_od`) — frontend z ní formulář
  vyrenderuje, takže otázky jsou v repu a v gitu, odpovědi ne.
- **Odpovědi** v Neonu: nový projekt `hspa-dotazniky` (region `aws-eu-central-1`,
  jako ostatní), tabulky `dotaznik_odpoved(id, sada_id, sada_verze, respondent_typ
  {pojistovna|pacientska_organizace|verejnost}, respondent_kod (kód ZP nebo
  organizace, u veřejnosti null), odpovedi jsonb, odeslano_at, zdroj_ip_hash null)`
  a `dotaznik_token(token, sada_id, respondent_kod, platny_do, pouzit_at)` pro
  adresné sady (pojišťovny a NAPO dostanou odkaz s tokenem, veřejnost bez tokenu).
- **API** `api/dotaznik.js`: `POST` validuje proti definici sady (stejný validátor
  jako `validate-pojistovny.js`, sdílený modul), rate limit per IP (hash, bez
  ukládání IP), `DATABASE_URL` z env, bez klíče 503 (fail-closed jako Brevo);
  `GET /api/dotaznik?sada=…&agregace=1` vrací jen agregáty pro graf.
- **Zpět do repa**: skript `scripts/export-dotaznik.js` stáhne agregáty do
  `data/pojistovny-dotaznik-agregaty.json` (třída B, rutina), stránka čte jen ten
  soubor — frontend tak dál nezná databázi, jako u všech ostatních dat.
- **Soukromí** (GOVERNANCE § 2.5): žádné PII, veřejná anketa bez e-mailu, u
  adresných sad je respondentem instituce, ne osoba; odpovědi pojišťoven na kolo 1
  jsou oficiální dokumenty a zůstávají jako soubory v
  `ingest/manual/pojistovny/odpovedi/` (plné znění je veřejné), Neon je jen pro
  strukturované dotazníky.
- Neon branching pro testy (`npm run test:api` proti větvi `test`), migrace jako
  SQL soubory v `api/migrations/`.

Balíček P2.4 níže. Třída **C** (nová závislost `@neondatabase/serverless`,
`api/`, env proměnné, data od institucí); Neon projekt zakládá vydavatel (nebo
AI s jeho souhlasem přes Neon MCP), `DATABASE_URL` nastaví ve Vercelu.

### 2.8 Přehled + podstránky (rozhodnutí vydavatele 2. 11. 2026)

Hlavní stránka `pojistovny.html` je **general view**: čtenář na ní za minutu zjistí,
kdo je kdo, vybere si pojišťovnu a vidí jeden klíčový graf za každé téma. Hutný
obsah (matice, tabulky, odpovědi z VZ, metodika, žádosti) jde na podstránky.
Princip doplňuje § 2.6: rozklikávání řeší hloubku *uvnitř* stránky, podstránky řeší
*šířku* témat.

| Stránka | Obsah | Z čeho vzniká |
|---|---|---|
| `pojistovny.html` (přehled) | hero + KPI řada, výběr „Moje pojišťovna“ (sdílený přes `localStorage` na všech podstránkách), karta pojišťovny (vybrané), **jeden graf na téma**: tržní podíl (segmentovaný pruh), index kmene 2010 = 100, nabídka prevence (heatmapa 7 × 9 zkrácená na Σ), funkce aplikací (meter n/10 per ZP), semafor 7 × 6 jako miniatura; pod každým grafem odkaz „Celé téma →“; rozcestník karet podstránek | dnešní moduly, ořezané na headline |
| `pojistovny-kmen.html` | Kmen a hospodaření v plném rozsahu: karty, seřazené bary, index 2010 = 100, dumbbell 2024 → 2025, mapa kraj × ZP a těžiště, tabulky, standardizace (jakmile budou váhy) | modul 3 + `pojistovny-kraje.js` |
| `pojistovny-prevence.html` | Nabídka 7 × 9, onko a duševní, fond prevence (segmentovaný pruh + dumbbell + skupiny), odpovědi z VZ (matice pokrytí + plné znění), doložené výsledky | modul 2 |
| `pojistovny-aplikace.html` | Funkce 7 × 10, přívětivost (po PS), uživatelé, rozpory a chybějící data | modul 1 |
| `pojistovny-gramotnost.html` | Rizikové skupiny, dotazník (Neon), agregáty odpovědí, další směry | modul 4 + `zp-dotaznik.js` |
| `pojistovny-metodika.html` | Metodika a semafor s právem na odpověď, registr žádostí, changelog, zdroje, plán | modul 5 + 6 + `pojistovny-semafor.js`, `pojistovny-zadosti.js` |
| `pojistovna.html?zp=111` (později) | profil jedné pojišťovny: všechny její hodnoty na jedné stránce, srovnání s průměrem ČR, odkazy na témata | stejné renderery, filtr na jednu ZP |

Technika: sdílený shell (`src/pojistovny-shell.js`: hlavička srovnávače, pásek
pracovní verze, výběr Moje pojišťovna, rozcestník témat, patička se zdroji),
renderovací funkce modulů zůstávají v `src/pojistovny*.js` a volají se podle toho,
které kontejnery na stránce jsou; `middleware.js` matcher rozšířit na
`/pojistovny-:path*` (třída C); `pr-gate` nové stránky = C; sitemap/noindex jako
dnes. Vizuální e2e baseline pro každou podstránku (light + dark).

---

## 3. Architektura implementace

```
src/
├── zp-palette.js        ← tokeny + mapování kód → název/zkratka, sdílené s pojistenci.js (čisté)
├── zp-viz.js            ← primitivy: rankedBars, segmentedBar, indexedLines, dumbbell,
│                           heatmap, dotMatrix, meter, statTiles, coverageMatrix (čisté funkce → HTML/SVG string)
├── zp-interact.js       ← výběr „Moje pojišťovna“, linked highlight, tooltip, IO animace (DOM)
├── pojistovny.js        ← orchestrace modulů (zůstává), hbarSvg/sparkSvg odstraněny
└── styles.css           ← blok `.zpc-*` (přesun z inline) + tokeny `--zp-*` + print + reduced motion
api/
├── dotaznik.js          ← Vercel funkce: POST odpověď → Neon, GET agregáty (vzor api/subscribe.js)
└── migrations/          ← SQL schéma Neon (dotaznik_odpoved, dotaznik_token)
scripts/
└── export-dotaznik.js   ← agregáty z Neonu → data/pojistovny-dotaznik-agregaty.json
tests/
├── zp-viz.test.js       ← každá primitiva: null → „nedohledáno“, řazení, escapování, aria-label, tabulkové dvojče
├── zp-palette.test.js   ← 7 unikátních tokenů, light/dark definované v styles.css, validátor CVD (port 6 kontrol, nebo zafixované hexy)
├── pojistovny.test.js   ← přepsat část „čisté funkce“ na nové exporty
└── e2e/visual.spec.js   ← + pojistovny (light i dark), a11y.spec.js + axe-scan + pojistovny
```

Zásady: primitivy vrací string (testovatelné bez DOM), interakce je oddělená
a idempotentní (`data-av-init`), žádné inline `style=` kromě `width:%` u barů
(výjimka jako u `.av-bar-compare`), prefix `.zpc-` zapsat do mapy namespace
v `docs/quickref.md`. Heslo v CI neblokuje: `middleware.js` je Vercel Edge, lokální
`http-server` i Playwright ho nevidí.

---

## 4. Pracovní balíčky

Třída podle `scripts/pr-gate.js` (nejvyšší třída v PR rozhoduje → balíčky
jsou rozdělené tak, aby B nečekalo na C). Agent = kdo to dělá; „Fable/Opus“ =
plánování a sporná rozhodnutí, „Sonnet“ = implementace s jasným zadáním,
„Haiku“ = mechanický přepis. Odhad = běhy rutiny po 1–2 h.

### Fáze 0 — Hygiena po merge (listopad 2026)

| ID | Úkol | Soubory | Třída | Agent | Odhad | DoD |
|---|---|---|---|---|---|---|
| P0.1 | `validate:pojistovny` do `package.json` + `validate:all`; `.vercelignore` nebo matcher pro `ingest/manual/pojistovny/`; pravidlo pr-gate: `data/pojistovny.json` se změnou klíče `semafor` → C (brána umí jen cesty → přesunout semafor do `data/pojistovny-semafor.json` a tu cestu zařadit do C) | `package.json`, `vercel.json`/`middleware.js`, `scripts/pr-gate.js`, split datasetu | **C** | Sonnet připraví, vydavatel merguje | 1 | `npm run validate:all` zelené; `pr:gate --files data/pojistovny-semafor.json` = C |
| P0.2 | Validátor na všechny 4 datasety (+ `hospodareni_2025`, enumy stupňů, `funkce` bool/null, sady otázek obou tvarů), `changelog[]` v `pojistovny.json` podle metodiky § 4.7 | `ingest/validate-pojistovny.js`, data | B | Sonnet | 1 | testy + validátor |
| P0.3 | Přejmenování „Hlídač“ → pracovní název „Srovnávač“ v datech/kódu, oprava `_doc` odkazu na metodiku, `ingest/manual/pojistovny/odpovedi/README.md` jako placeholder | data, docs | B | Haiku | 0,5 | grep „Hlídač“ = 0 mimo historické poznámky |
| P0.4 | Přesun `.zpc-*` z inline do `styles.css`, namespace do `quickref.md`, pojistovny do e2e/a11y seznamů, baseline screenshot (light + dark) | `pojistovny.html`, `styles.css`, `docs/quickref.md`, `tests/e2e/*`, `tests/a11y/axe-scan.mjs` | B | Sonnet | 1 | `visual-a11y.yml` zelené s baseline |

### Fáze 1 — Vizuální jádro (listopad–prosinec 2026)

| ID | Úkol | Soubory | Třída | Agent | Odhad | DoD |
|---|---|---|---|---|---|---|
| P1.1 | `zp-palette.js` + tokeny `--zp-*` light/dark; `pojistenci.js` přepnout na tokeny (ECharts čte `getComputedStyle`, překreslení na `data-theme` jako `cz-choropleth.js`); test 7 unikátních + validátor | `src/zp-palette.js`, `styles.css`, `src/pojistenci.js`, `tests/zp-palette.test.js`, `tests/pojistenci_frontend.test.js` | B | Sonnet | 1 | Atlas i srovnávač mají shodné barvy; dark mode screenshot Atlasu bez `#1f1a14` natvrdo |
| P1.2 | `zp-viz.js` primitivy: `rankedBars`, `segmentedBar`, `statTiles`, `meter` + tabulkové dvojče + aria; CSS; unit testy | `src/zp-viz.js`, `styles.css`, `tests/zp-viz.test.js` | B | Sonnet (brief = § 2.4 + prototyp) | 2 | 100 % větví null/empty; žádný inline style kromě width |
| P1.3 | `zp-interact.js`: výběr Moje pojišťovna (chips, localStorage, `aria-pressed`), linked highlight, tooltip, IO animace, reduced motion | `src/zp-interact.js`, `styles.css` | B | Sonnet | 1,5 | e2e: klik na chip → `[data-zp="201"].is-moje` ve všech grafech; reduced motion test |
| P1.4 | Modul 3 přepnout: hero → stat dlaždice s count-up; 4 grafy → `rankedBars` s ref. zónou + `segmentedBar` tržního podílu; karty: sparkline nahradit indexovaným mini-grafem s popisky 2010/2025; tabulka hospodaření zkrácená + inline bary + řazení; vysvětlivky, poznámky a „co chybí“ do `<details>` podle § 2.6 | `src/pojistovny.js`, `pojistovny.html` | B | Sonnet | 2 | screenshoty 1280/390/dark bez kolizí; `pojistovny.test.js` přepsán; modul 3 má ≤ 1 obrazovku textu nad grafy na 390 px |
| P1.6 | **Přehled + podstránky** (§ 2.8): `pojistovny.html` ořezat na general view, nové `pojistovny-kmen/-prevence/-aplikace/-gramotnost/-metodika.html`, sdílený shell `src/pojistovny-shell.js`, výběr Moje pojišťovna napříč stránkami, matcher middleware, e2e/a11y baseline pro 5 nových stránek, sitemap exclude | nové HTML, `src/pojistovny-shell.js`, `src/pojistovny*.js`, `middleware.js`, testy | **C** (nové stránky, middleware) | Opus (rozhodnutí, co je headline) | 2 | přehled ≤ 3 obrazovky na 390 px, každé téma má podstránku, výběr ZP přežije přechod mezi stránkami |
| P1.5 | Nezávislá revize vizuálu: editor s checklistem (`dataviz/references/anti-patterns.md` + `docs/accessibility.md`) nad screenshoty z CI | — | B (review) | Editor (Opus) | 0,5 | žádný nález kategorie „form“ nebo „a11y“ |

### Fáze 2 — Prevence a aplikace (prosinec 2026 – leden 2027)

| ID | Úkol | Soubory | Třída | Agent | Odhad | DoD |
|---|---|---|---|---|---|---|
| P2.1 | `heatmap` + `dotMatrix` + `dumbbell` + `coverageMatrix` primitivy, testy | `src/zp-viz.js`, testy | B | Sonnet | 1,5 | jako P1.2 |
| P2.2 | Modul 2: nabídka → heatmapa (řazení), onko/duševní → dot matrix, fond prevence → segmented bar + dumbbell (top 5 + Ostatní; ZPŠ/RBP s 35/48 položkami sloučit podle klíčových slov do 6 skupin → nové pole `skupina` v datech, přepis Haiku), odpovědi z VZ → matice pokrytí + akordeony | `src/pojistovny.js`, `pojistovny-prevence.json` | B | Sonnet + Haiku (skupiny) | 2 | čtenář vidí plnění plánu a rozdíl mezi ZP na jeden pohled |
| P2.4 | Dotazníky na Neonu (§ 2.7): schéma + migrace, `api/dotaznik.js`, render formuláře z `pojistovny-otazky.json` (modul 4), tokeny pro adresné sady, `scripts/export-dotaznik.js`, test proti Neon větvi; sekce soukromí v `o-projektu.html` | `api/`, `package.json`, `src/zp-dotaznik.js`, `pojistovny.html`, `scripts/`, `o-projektu.html` | **C** | Sonnet připraví PR; vydavatel založí Neon projekt `hspa-dotazniky` a `DATABASE_URL` | 2 | odpověď se uloží, agregát se vyexportuje do `data/`, bez PII; 503 bez env |
| P2.3 | Modul 1: dot matrix + meter `n/10`; schéma pro 5–7 kritérií přívětivosti (`kriteria[]{id,label,skala}` + `aplikace[].kriteria{id:{stupen,zdroj,rok}}`) připravené pro IT experta; formulář/šablona zápisu | `pojistovny-aplikace.json`, validátor, `src/pojistovny.js` | B (schéma) / data po PS | Sonnet; data zapíše Sonnet podle podkladu IT experta | 1 + 0,5 | validátor přijme prázdná kritéria; po PS 12. 11. naplněno |

### Fáze 3 — Časové řady, region, standardizace (prosinec 2026 – únor 2027)

| ID | Úkol | Soubory | Třída | Agent | Odhad | DoD |
|---|---|---|---|---|---|---|
| P3.1 | `indexedLines` (2010 = 100) z `crp-agregaty-2025.json` → přenést `trend` (absolutní) do `pojistovny.json`; diverging bar změny 2015 → 2025 | data, `zp-viz.js`, `pojistovny.js` | B | Sonnet | 1 | jedna osa, direct labels bez kolizí (leader lines nebo legenda) |
| P3.2 | Kraj × ZP: dlaždicová mapa (`cz-map.js`) pro vybranou ZP z `pojistenci-d5-zp.json` (líný load), „těžiště“ jako seřazené bary místo `top_kraje[0]` | `src/pojistovny.js`, `cz-map.js` hooky | B | Sonnet | 1 | mapa reaguje na Moje pojišťovna; a11y jako v `indicator.js` |
| P3.3 | **Věková standardizace** (metodika § 4.1): nový `ingest/transform_pojistovny_crp.js` z CSV OIS 11-47 → `data/pojistovny-vek.json` (ZP × 19 pásem × pohlaví, 2025); metoda přímé standardizace nákladů a prevence na strukturu ČR s nákladovými váhami podle věku (zdroj: index přerozdělení / Hodnocení v.z.p.); dokumentace postupu v metodice | `ingest/transform_pojistovny_crp.js`, `docs/metodika-srovnavac-pojistoven.md`, data | B (kód) + odborná skupina (metoda) | **Fable/Opus** navrhne metodu a váhy (jednorázově) → Advance/FBMI schválí → Sonnet implementuje | 2 + revize | na stránce dvě hodnoty: „nestandardizováno“ a „standardizováno“, obě se zdrojem |
| P3.4 | Dumbbell 2024 → 2025 pro VZP, VoZP, OZP (`hospodareni_2025`); ostatní „VZ 2025 nedohledána“ viditelně | `pojistovny.js` | B | Sonnet | 0,5 | — |
| P3.5 | **Síť poboček a smluvních odborností per ZP** (oblasti `sit` + `dostupnost`; dokument `docs/pojistovny-sit.md`): prototyp `ingest/fetchers/pojistovny-sit.js` → `data/pojistovny-sit.json` (ÚZIS NR-04-64 smluvní IČZ × NRPZS, ZP × odbornost × kraj, stav 31. 12. 2024, horní odhad), `validateSit()`, testy; dál (a) jednotná definice „pobočky“ (osobní přepážka) a ruční/HTML sběr poboček 7 ZP, (b) dojezdový indikátor podle NV 307/2012 Sb. (35/60/90 min), (c) žádost ÚZIS/KZP/ZP o aktuální agregát pracoviště × odbornost × kraj × ZP, (d) oprava odkazu v metodice § 2 (OIS 11-39 není síť poskytovatelů) | `ingest/fetchers/pojistovny-sit.js`, `data/pojistovny-sit.json`, `ingest/validate-pojistovny.js`, `tests/pojistovny-sit.test.js`, `docs/pojistovny-sit.md`; dál `pojistovny.js`, metodika | **B** (data, dokument, validátor, testy) / **C** (zapojení fetcheru do cronu, nový zdroj v nasazení) | Sonnet; definice pobočky a vymezení na nedostatkové regiony rozhodne PS | 2 + 1 | prototyp validuje, limity viditelně u čísla; žádné pořadí velkých ZP z odhadu; na web až po rozhodnutí PS a kole 1 (rozhodnutí PS o vymezení v `docs/pojistovny-sit.md` § 6) |

### Fáze 4 — Semafor a právo na odpověď (po kole 1, březen 2027)

| ID | Úkol | Soubory | Třída | Agent | Odhad | DoD |
|---|---|---|---|---|---|---|
| P4.1 | UI semaforu: stavy s ikonou + popiskem, panel „stanovisko pojišťovny“ doslova, `changelog` viditelně; tracker žádostí `data/zadosti-106.json` + sekce | `pojistovny.js`, `pojistovny.html`, data | B (UI) | Sonnet | 1,5 | prázdný semafor vypadá záměrně prázdně, ne rozbitě |
| P4.2 | Vyhodnocení odpovědí → návrh verdiktů (draft) | `data/pojistovny-semafor.json`, `ingest/manual/pojistovny/odpovedi/` | **C** | Fable/Opus draft → editor → **vydavatel** | 2 | metodika § 3 (každý stav má rok, zdůvodnění, zdroj) |

### Fáze 5 — Zveřejnění (rozhodne PS; dříve ne)

| ID | Úkol | Třída | Agent |
|---|---|---|---|
| P5.1 | Odebrat matcher z `middleware.js`, `noindex` pryč, `STATIC_PAGES`, navigace (`page-shared.js`), OG cover (`generate-article-cover.js` má kompas), sitemap | **C** | Sonnet připraví PR, vydavatel merguje |
| P5.2 | Článek „Sedm pojišťoven, jeden pojištěnec“ (rutina Florence), newsletter, video dne (skill `animovane-prispevky`: Kompík vysvětluje „Moje pojišťovna“) | B | rutina `PROMPT_ROUTINE.md` |
| P5.3 | Roční rutina: po vydání VZ (květen–červen) a ZPP (srpen) přepis tabulek do JSON + validátor + `changelog` | B | Haiku/Sonnet (nový blok v `PROMPT_ROUTINE.md` = třída C, jednorázově) |

---

## 5. Delegace: kdo, s čím, jak se to kontroluje

| Role | Agent / model | Dostane | Vrátí | Kontroluje |
|---|---|---|---|---|
| Průzkum (hotovo 2. 11.) | Explore ×2 | repo | inventář vizuálu, datový inventář | tento plán |
| Návrh forem a palety (hotovo) | Fable | dataviz metodika, screenshoty, validátor | § 2, prototyp | vydavatel (vzhled), editor (a11y) |
| Prototyp (hotovo, mimo repo) | general-purpose (Sonnet) | § 2 + reálná data | samostatné HTML + screenshoty | Fable (vizuální kontrola) |
| Implementace primitiv a modulů (P1–P3) | Sonnet, jedna session = jeden balíček | brief: ID balíčku z § 4, § 2.4 řádek, prototyp, DoD; čte `docs/visual-components.md`, `docs/traps.md`, `docs/accessibility.md` | PR třídy B se screenshoty v těle PR (1280/390/dark) | Editor (`PROMPT_EDITOR.md`) + CI `visual-a11y.yml` |
| Mechanický přepis dat (P0.3, P2.2 skupiny, P5.3) | Haiku | zdrojový soubor, schéma, validátor | PR třídy B | validátor + editor |
| Metodika standardizace (P3.3) | Fable/Opus → odborná skupina | CSV, Hodnocení v.z.p., metodika | návrh metody + váhy, sekce metodiky | Advance, FBMI ČVUT, NAPO; vydavatel |
| Verdikty (P4.2) | Fable/Opus draft | odpovědi pojišťoven | draft semaforu | **vydavatel** (C), právo na odpověď |
| Dotazníky (P2.4) | Sonnet (kód) | § 2.7, `api/subscribe.js` jako vzor, Neon MCP (čtení schématu, větev `test`) | PR třídy C + SQL migrace | vydavatel (Neon projekt, env), editor (kód) |
| Třída C změny (P0.1, P5.1) | Sonnet připraví | checklist z tohoto plánu | PR s labelem `brana-clovek` | **Josef Pavlovic** |

**Orchestrace.** Fáze 1 a 2 jdou pustit jako jeden Workflow (vzor
`.claude/workflows/evidence-audit.js`): `pipeline` balíčků P1.1 → P1.2 → (P1.3 ∥ P1.4)
→ P1.5, každý `agent()` dostane brief z § 4 a vrátí `{pr, screenshots, findings}`;
revize P1.5 je adversariální agent s `anti-patterns.md`. Nový soubor
`.claude/workflows/pojistovny-viz.js` je třída C → založit ho až po schválení
tohoto plánu. Do té doby stačí sériové sessions (jedna session = jeden balíček,
GOVERNANCE § 4).

**Brief pro implementační session (šablona, kopíruje se do první zprávy):**

> Balíček `P1.2` z `05_M1_Starter/PLAN-SROVNAVAC-POJISTOVEN.md`. Přečti § 1–3, řádek
> § 2.4 pro svou formu a `docs/traps.md`. Prototyp forem: viz odkaz v PR #(číslo PR
> tohoto plánu). Postav jen soubory z tabulky, žádné generované artefakty, žádné inline
> styly kromě `width:%`. Před push: `npm test`, `npm run validate:all`, screenshoty
> 1280/390/dark přes Playwright do těla PR. Třída B. Nepřidávej nic mimo DoD.

---

## 6. Testy a definice hotového (pro každý balíček fáze 1–3)

1. `npm test` zelené; nové primitivy mají unit test (null, prázdné pole, escapování,
   `aria-label`, tabulkové dvojče).
2. `npm run validate:all` zelené (po P0.1 včetně `validate:pojistovny`).
3. `tests/e2e/visual.spec.js` baseline pro `pojistovny` ve třech viewportech,
   light + dark; `maxDiffPixelRatio` 1 %.
4. axe bez critical/serious; každý graf má `role="img"` + `aria-label` + tabulku;
   žádná informace jen barvou (SC 1.4.1); hit area ≥ 24 px.
5. `prefers-reduced-motion` e2e: po načtení s emulací `reduce` jsou všechny bary
   v konečné šířce, žádný `transition`.
6. Dark mode: screenshot bez natvrdo hexů (grep `#1f1a14|#e8e2d4|Inter` v nových
   souborech = 0).
7. Tisk: `page.emulateMedia({media:'print'})` → tooltipy skryté, `details` otevřené.
8. Výkon: stránka bez knihoven, `< 120 kB` JS celkem, žádný scroll listener (jen IO).
9. Screenshoty v těle PR, editor je porovná s § 2.4 a `anti-patterns.md`.

---

## 7. Rizika a otázky pro vydavatele / PS 12. 11. 2026

| # | Otázka | Návrh |
|---|---|---|
| R1 | Paleta pojišťoven: přijmout sjednocení (VZP přestane být červená v Atlasu) | ano; `--red` = brand + `--bad` |
| R2 | „Moje pojišťovna“ v localStorage: je to v souladu s politikou soukromí (bez cookies, bez odeslání)? | ano, stejný mechanismus jako `hspa-theme`; zapsat do `o-projektu.html` sekce soukromí (C) |
| R3 | Seřazené bary u faktů ≠ žebříček pojišťoven: schválit formulaci „řazeno podle hodnoty, ne hodnocení“ v popisku | ano, popisek pod každým seřazeným grafem |
| R4 | Věková standardizace: kdo dodá nákladové váhy podle věku (index přerozdělení MZ?) | Fable navrhne z veřejných zdrojů, Advance potvrdí |
| R5 | Ochrana `ingest/manual/pojistovny/` na Vercelu (I5) — ověřit na nasazení před čímkoli dalším | vydavatel: `curl -I https://…/ingest/manual/pojistovny/zdroje-vz-2024.json` |
| R6 | Split `semafor` do vlastního souboru kvůli bráně (P0.1) mění datový kontrakt metodiky | zapsat do `docs/decisions-log.md` |
| R7 | Neon pro dotazníky: založit nový projekt `hspa-dotazniky`, nebo větev v existujícím `zdravi-bliz-lidem`? Kdo je správce a kde se vede seznam env proměnných Vercelu | nový projekt (oddělená data, vlastní kvóta); seznam env do `docs/scheduled-sessions.md` |
| R8 | Rozpočet: bez samostatného financování nese práci rutina Zdravého Česka; fáze 1–2 = ~14 běhů | prioritizovat P0 + P1 před PS, P2 po PS |

---

## 8. Harmonogram (navázaný na harmonogram PS)

| Termín | Co je hotové |
|---|---|
| do 12. 11. 2026 (PS #2) | P0.1–P0.4, P1.1, prototyp jako podklad pro PS („takhle to bude vypadat“) |
| listopad 2026 | P1.2–P1.5 (modul 3 v nové podobě), P2.3 schéma přívětivosti |
| prosinec 2026 | P2.1–P2.2 (prevence), P2.4 (Neon dotazníky, aby kolo 2 v Q2 2027 mělo kam sbírat), P3.1–P3.2 (trend, kraje), start P3.3 (metoda standardizace) |
| leden 2027 | P3.3 implementace po schválení, P3.4; kolo 1 odesláno (mimo repo) |
| březen 2027 | P4.1 UI semaforu, P4.2 verdikty (C) |
| po rozhodnutí PS | P5 zveřejnění |

---

## Příloha A — Mapa modulů → balíčků

| Modul | Dnes | Balíčky |
|---|---|---|
| Hero | statická čísla | P1.4 |
| 1 Aplikace | ✓/✗ tabulka | P2.3 |
| 2 Prevence | štítková matice, tabulka se selectem, akordeony | P2.1, P2.2 |
| 3 Kmen a hospodaření | karty + 4 bary + 2 tabulky | P1.4, P3.1, P3.2, P3.3, P3.4 |
| 4 Gramotnost | text | P2.4 (dotazník jako formulář → Neon), obsah po kole 2 |
| 5 Metodika a semafor | prázdná tabulka | P4.1, P4.2 |
| 6 Plán | seznam | odkaz na tento dokument |

## Příloha B — Výstup validátoru palety (2. 11. 2026)

```
light, surface #fbf8f1: Lightness PASS · Chroma PASS · CVD PASS (worst #eda100↔#1baf7a ΔE 9.1 protan)
  · Normal-vision PASS (19.6) · Contrast WARN (#1baf7a 2.65, #eda100 2.04, #e87ba4 2.54 → popisky + tabulka)
dark, surface #17140f: všech 5 kontrol PASS (worst CVD #c98500↔#199e70 ΔE 8.4)
dnešní ZP_COLOR (pojistovny.js): FAIL lightness (#1a1a1a), FAIL chroma (#1a1a1a, #4a6fa5, #7a6a9c)
dnešní ZP_COLORS (pojistenci.js): FAIL CVD (#1F7A1F↔#b8361e ΔE 3.5 deutan)
```

## Příloha C — Prototyp

Klikací prototyp forem z § 2.4 nad reálnými daty (bez knihoven, light/dark,
mobil) je publikovaný jako artefakt; odkaz je v těle PR, kterým tento plán vznikl.
Prototyp není součást repa: slouží jako podklad pro PS 12. 11. a jako referenční
vzhled pro briefy implementačních sessions.
