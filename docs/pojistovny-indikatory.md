# Inventář indikátorů a datových zdrojů o zdravotních pojišťovnách

_Stav repa k 2. 11. 2026 (větev `claude/gracious-hamilton-yswl0a`). Zadání vydavatele
z 2. 11. 2026: „sestavit všechny indikátory, které se pojišťoven týkají, a udělat si
jejich seznam (ty, ve kterých vidíme, jak který pojištěnec je u koho pojištěn —
které údaje to jsou?)“. Dokument je rešerše a inventář, nic v něm není implementace.
Vstup pro balíček P5.5 v `05_M1_Starter/PLAN-SROVNAVAC-POJISTOVEN.md` a pro práci na
srovnávači (`pojistovny.html`, metodika `docs/metodika-srovnavac-pojistoven.md`).
Cesty jsou od kořene repa; `05_M1_Starter/` zkracuji na `M1/`. Strojová podoba inventáře je
`M1/data/pojistovny-indikatory.json` a zobrazuje ji podstránka `pojistovny-indikatory.html`
(indikátory kontraktu obohacuje za běhu z `indicators.json`); audit otevřených dat pojišťoven
je v `M1/data/pojistovny-opendata.json`._

## 0. Stručná odpověď

1. **Kdo je u koho pojištěn, říká jediný veřejný zdroj s plnou strukturou: ÚZIS ·
   Centrální registr pojištěnců, datový souhrn OIS 11-47** (NZIP, Dimenze 5). Řádek =
   rok × ZP × okres × 19 věkových pásem × pohlaví, 2010–2025, 278 975 řádků, 7 ZP,
   77 okresů. V repu je jako surové CSV v kořeni a jako tři předagregované JSON.
2. **Kontrakt `data/indicators.json` (249 indikátorů) nemá jediný indikátor „per
   pojišťovna“.** Všech 249 hodnot je za ČR (nebo za kraj v `data/regions.json`).
   Pojišťovny jako rozměr žijí mimo kontrakt, v `data/pojistovny*.json` a
   `data/pojistenci-d5-zp.json`.
3. **Rozpad podle pojišťovny v repu je: kmen 2010–2025 (kraj × ZP), věk × pohlaví 2025
   (ZP), hospodaření 2024 (MZ + MF, 7 ZP), část 2025 (VZ: VZP, VoZP, OZP), plán 2026
   (tisk 280), struktura fondu prevence, plán úhrad podle segmentů 2024 (ZPP).**
4. **Nevyužité, ale v repu ležící:** ZP × okres × věk × pohlaví (surové CSV, transform
   to agreguje pryč) a úhrady ZP podle segmentů a okresů zařízení (OIS 11-24,
   `03_Prezentace/Datovy-souhrn-OIS-11-24-…xlsx`).
5. **Chybí:** měsíční počty pojištěnců per ZP (jediná cesta k přestupům mezi
   pojišťovnami v čase), skutečné nákladové indexy přerozdělení, věková struktura
   z výročních zpráv, jakákoli data o změnách pojišťovny.

## 1. Indikátory datového kontraktu

Zdroj: `M1/data/indicators.json` (249 indikátorů; pole `id`, `name`, `area`, `domain`,
`subdomain`, `unit`, `value`, `year`, `source{name,url,origin}`, `verification_status`,
`method_card_url`) a metodické karty `M1/indicators/{id}.json`. Prohledáno podle
`name`, `domain`, `subdomain`, `source.name` a `data_source` v kartách (výrazy
pojišť*, ZFZP, VZP, KZP, NRHZS, v.z.p., OIS-11-xx).

**Granularita „per pojišťovna“: ne u žádného.** Sloupec „Granularita“ níže říká, za co
hodnota je. Strojový rozměr „pojišťovna“ kontrakt vůbec nemá (žádné pole typu `by_zp`).

### 1.1 Přímo o veřejném zdravotním pojištění a pojišťovnách

| id | Název | Oblast / doména | Jednotka | Zdroj | Rok | Granularita | Origin | Ověření |
|---|---|---|---|---|---|---|---|---|
| `uhrada_zp_per_pojistenec` | Úhrada zdravotních pojišťoven na pojištěnce (ZFZP) | Struktury / Financování zdravotnictví / Výdaje v.z.p. | Kč / pojištěnec / rok | MZ ČR, Hodnocení vývoje systému v.z.p. 2024 (Tab. 11) | 2024 | **ČR** (součet 7 ZP). Per ZP jen v textu karty: VZP 47 998 Kč, zaměstnanecké v průměru 44 604 Kč | seed | verified |
| `podil_vydaje_luzkova_pece` | Podíl výdajů ZP na lůžkovou péči | Struktury / Financování / Struktura úhrad podle segmentů | % | ÚZIS · NRHZS, OIS-11-24 (2026-01) | 2024 | **ČR** (zdrojová sada má ZP i okres, indikátor ne) | seed | verified |
| `podil_vydaje_ambulantni_pece` | Podíl výdajů ZP na ambulantní péči | tamtéž | % | OIS-11-24 | 2024 | ČR | seed | verified |
| `podil_vydaje_leky` | Podíl výdajů ZP na léky | tamtéž | % | OIS-11-24 | 2024 | ČR | seed | verified |
| `naklady_centrove_leky_total` | Úhrady za centrové léky | Struktury / Financování / Centrová léčba | mld Kč / rok | ÚZIS · NZIP, OIS-11-06 (NRHZS) | 2025 | ČR | seed | verified (2. 11. 2026) |
| `vydaje_sprava_systemu_pct` | Výdaje na správu a řízení zdravotního systému (SHA HC.7, zahrnuje chod ZP) | Struktury / Financování / Správa a řízení | % běžných výdajů | Eurostat `hlth_sha11_hc` | 2024 | ČR | **live** | preliminary |
| `podfinancovani_oblastni_interna_cm` | Rozdíl úhrady a nákladu u interny v oblastních nemocnicích | Struktury / Financování / Úhradová politika | Kč / CM bod | ÚZIS · NRHZS (kompozit OIS-11-05 + 11-39) | 2024 | ČR (poskytovatelé, ne ZP) | seed | preliminary |

### 1.2 Financování a finanční ochrana pojištěnce (kontext, ne o ZP)

| id | Název | Jednotka | Zdroj | Rok | Granularita | Origin | Ověření |
|---|---|---|---|---|---|---|---|
| `vydaje_zdravotnictvi_hdp` | Výdaje na zdravotnictví / HDP | % | ČSÚ, Zdravotnické účty (SHA) | 2024 | ČR | seed | verified |
| `vydaje_prevence_pct` | Výdaje na prevenci (% běžných výdajů, HC6) | % | OECD Health Statistics (SHA) | 2023 | ČR; není fond prevence ZP | seed | verified |
| `vydaje_leky_hdp` | Výdaje na léky mimo nemocnice (% HDP) | % HDP | OECD Health Statistics | 2024 | ČR | live | verified |
| `platba_z_kapsy_pct` | Přímé platby pacientů | % výdajů | ČSÚ, SHA | 2024 | ČR | seed | verified |
| `doplatky_leky_na_obyvatele` | Doplatky pacientů za léky a ZP na obyvatele | Kč/obyv./rok | ÚZIS, Lékárenská péče 2025 (A080) | 2025 | ČR | seed | verified |
| `katastroficke_vydaje_zdravi` | Katastrofické výdaje na zdraví | % domácností | WHO/Europe 2025 | 2023 | ČR | seed | bez stavu |
| `vydaje_dusevni_zdravi_pct` | Podíl výdajů na duševní zdraví | % | MZ ČR · NAPDZ 2020–2030 | 2022 | ČR | seed | bez stavu |

### 1.3 Pojištěnec jako jmenovatel nebo zdroj z dat pojišťoven

| id | Název | Jednotka | Zdroj | Rok | Granularita | Origin | Ověření |
|---|---|---|---|---|---|---|---|
| `registrovani_na_uvazek_pld` | Registrovaní pojištěnci na 1 úvazek praktika pro dospělé | pojištěnců / úvazek | ÚZIS, OIS-11-20 (NRHZS, NRZP) | 2025 | ČR | seed | verified |
| `nemoci_z_povolani_neinfekcni` | Neinfekční nemoci z povolání na 100 tis. pojištěnců | případů / 100 tis. | SZÚ, Národní registr nemocí z povolání | 2025 | ČR | seed | verified |
| `cekaci_doba_kycel` | Čekací doba na náhradu kyčle | dní | **VZP ČR** (jen jedna pojišťovna) | 2024 | ČR, ale zdroj je jediná ZP; `source.url` prázdné | seed | **bez stavu** |
| `cekaci_doby_specialist` | Čekací doba na specialistu (medián) | dní | ÚZIS · NZIS | 2024 | ČR + kraje v `regions.json` | seed | bez stavu |

### 1.4 Indikátory postavené z dat pojišťoven (NRHZS), bez rozpadu na ZP

NRHZS (Národní registr hrazených zdravotních služeb) je sběr výkazů **všech 7
pojišťoven**, takže téměř všechny klinické a preventivní indikátory ÚZIS v kontraktu se
z dat pojišťoven počítají. Pojišťovna ale v hodnotě indikátoru nezůstává. Příklady:
`screening_kolorektalni`, `screening_mamograficky`, `screening_cervix` (live,
`uzis_nrhzs_screening`; kraje v `regions.json`), `zachyt_demence_65_80`,
`zachyt_pas_18_mesicu`, `vakcinace_chripka_65`, `centralizace_cvsp_podil` (OIS-11-51),
`osetrovaci_dny_na_uvazek_sestry` (OIS-11-50), `demence_prevalence_lecena`,
`pacienti_osetreni_zzs`, `hospitalizace_pokus_o_sebevrazdu`. Úplný seznam 40
indikátorů, jejichž zdroj nebo karta zmiňuje NRHZS, VZP, KZP nebo pojišťovny, vzniká
dotazem v příloze A.

### 1.5 Co z toho plyne

- **Systémových indikátorů o v.z.p. je 7 (1.1), per ZP 0.** Per-ZP čísla jsou jen
  v textových polích karet (`uhrada_zp_per_pojistenec`: VZP vs. zaměstnanecké).
- **`financing.json` drží zastaralé číslo.** `headline_stats.per_pojistence_kc` =
  42 226 Kč (2023). Karta `uhrada_zp_per_pojistenec` (revize 30. 8. 2026) výslovně říká,
  že právě tato hodnota byla dopočítána z nadhodnoceného součtu a nahrazena publikovanou
  řadou MZ (2023: 42 011, 2024: 46 529). `data/financing-regions.json` (`country_avg`
  42 226, proxy mapa krajů) z té samé hodnoty vychází. K řešení v P0/P3.
- **Vysvětlivka `pojistovny` v `data/explainers.json` je zastaralá:** uvádí „~60 %,
  ~5,9 mil.“ pojištěnců u VZP, CRP 2025 má 56,85 %, 6 168 626. Její
  `linked_indicators` neobsahují `uhrada_zp_per_pojistenec` (viz § 5).

## 2. Datasety v repu s rozpadem podle pojišťovny

Sedm pojišťoven a jejich kódy ve všech zdrojích: 111 VZP ČR · 201 VoZP · 205 ČPZP · 207 OZP
· 209 ZPŠ · 211 ZP MV ČR · 213 RBP.

### 2.1 Přehled

| # | Soubor | Dimenze | Roky | Zdroj | Aktualizace | Zobrazení na webu |
|---|---|---|---|---|---|---|
| A | `CSV Datovy-souhrn-OIS-11-47-zdravotni-pojistenci-struktura-2026-01.csv` (kořen repa, 15 MB) | rok × ZP × okres × věk × pohlaví | 2010–2025 | ÚZIS · CRP, OIS 11-47 | ruční (soubor se do repa nahrává ručně) | přímo ne; vstup pro B–F |
| B | `M1/data/pojistenci-d5-zp.json` | kraj (14) × rok × ZP (7): `counts`, `shares`, `total` | 2010–2025 | totéž | `npm run transform:pojistenci`, ručně | `pojistenci.html` (tržní podíly, `src/pojistenci.js`), `financovani.html` (přepočet na pojištěnce) |
| C | `M1/data/pojistenci-d5-kraj.json` | kraj × rok × věk × pohlaví, **bez ZP** | 2010–2025 | totéž | totéž | `pojistenci.html` (mapa, pyramida), `ingest/transform_financing_regions.js` |
| D | `M1/data/pojistenci-d5-okres.json` | okres (77) × rok × věk × pohlaví, **bez ZP** | 2010–2025 | totéž | totéž | `pojistenci.html` (drill-down) |
| E | `M1/ingest/manual/pojistovny/crp-agregaty-2025.json` | ZP × rok (absolutně, podíl) + 2025: podíl 65+/80+/0–14, růst, top kraje | 2010–2025 | totéž | ruční agregát | vstup `pojistovny.json` |
| F | `M1/data/pojistovny-vek.json` | ZP × 19 pásem × pohlaví, součet přes okresy | **jen 2025** | totéž | `npm run data:pojistovny-crp` (`ingest/transform_pojistovny_crp.js`, CSV z kořene; bez CSV skončí s exit 0 bez přepisu) | vstup standardizace |
| G | `M1/data/pojistovny.json` | ZP × hospodaření, prevence, servis, semafor (viz 2.4) | 2024 (+ část 2025, plán 2026) | MZ + MF, VZ, ZPP 2026 | ručně, validátor `ingest/validate-pojistovny.js` | `pojistovny.html` (pod heslem, `middleware.js`) |
| H | `M1/ingest/manual/pojistovny/zdroje-vz-2024.json`, `nakladove-indexy-2024.json` | podkladové tabulky z VZ 2024; váhy standardizace (placeholder) | 2024 | VZ, MZ | ručně | vstup G, `ingest/lib/standardizace.js` |
| I | `M1/data/financing.json` → `by_payer` + `M1/ingest/manual/zpp/{kod}-2024.json` | ZP × 8 segmentů péče, **plán ZPP 2024** | 2024 | ZPP 2024 (sněmovní tisky, weby ZP) | ručně ("kalibrováno"), parser `ingest/fetchers/zpp_pdf.js` (pilot VZP, ZP MV ČR) | `financovani.html`, `renderPayersComparison()` v `src/financovani.js` |
| J | `M1/data/pojistovny-prevence.json` | ZP × oblasti prevence, struktura fondu prevence, odpovědi z VZ | 2024 | weby ZP, VZ | ručně | `pojistovny.html` (Prevence) |
| K | `M1/data/pojistovny-aplikace.json`, `pojistovny-otazky.json`, `pojistovny-dotaznik-agregaty.json` | aplikace ZP; sady otázek; agregáty (zatím prázdné `sady: {}`) | 2026 | weby, VZ, dotazníky | ručně / Neon | `pojistovny.html` |
| L | `M1/data/dohodovaci-rizeni.json` (OIS-11-24) | žebříček úhrad podle ZP | 2023, 2024 (pololetní dodávka) | ÚZIS | `npm run data:dohodovaci-rizeni` | `dohodovaci-rizeni.html` |
| M | `03_Prezentace/Datovy-souhrn-OIS-11-24-naklady-zdravotni-pojistovny-segmenty-2026-01.xlsx` | **ZP × segment × rok** a **ZP × segment × okres zařízení** | 2023, 2024_pol | ÚZIS · NRHZS | ručně uloženo; fetcher stahuje XLSX do cache | podle toho jen systémové součty (`podil_vydaje_*`) |
| N | `M1/data/regions.json` | **nic per ZP** (45 datasetů kraj × ukazatel; pojišťovny jen jako zdroj v poznámkách) | – | – | – | `kraje.html` |

### 2.2 OIS 11-47 podrobně (surové CSV)

Instituce: ÚZIS ČR, Centrální registr pojištěnců (CRP); publikuje NZIP v rámci „Datové
podpory dohodovacího řízení“, **Dimenze 5: Struktura pojištěnců a náklady zdravotních
pojišťoven**, podpořeno projektem CZ.03.02.02/00/22_046/0002180. Stránka sady:
`https://www.nzip.cz/data/2660-zdravotni-pojistenci-struktura-datovy-souhrn`; edice
2026-01 (XLSX): `https://www.nzip.cz/data/dohodovaci-rizeni/datove-souhrny/Datovy-souhrn-OIS-11-47-zdravotni-pojistenci-struktura-2026-01.xlsx`;
metodický popis (PDF) na `…/metodicke-popisy/Datovy-souhrn-OIS-11-47-zdravotni-pojistenci-struktura-2026-01.pdf`.
Licence: v JSON uvedena jako „CC-BY 4.0 (předpoklad podle podmínek NZIP)“, tedy
**nepotvrzeno**.

Struktura souboru (středník, UTF-8 s BOM, oddělovač tisíců v počtu = mezera):

- 8 řádků preambule (název „5.1 Struktura pojištenců zdravotních pojišťoven“,
  „Dimenze 5“, „Roky 2010–2025“, „Zdroj dat: Centrální registr pojištěnců (CRP)“,
  poděkování projektu), pak hlavička, pak data.
- Hlavička (doslova, včetně překlepu): `Rok;Kód zdravotní pojišťovny;Okres LAU;Název okresu;Věková kategorie;Pohlaví;Počet pojišťenců`.
- `Rok` 2010–2025. `Kód zdravotní pojišťovny` 111, 201, 205, 207, 209, 211, 213.
  `Okres LAU` kód ve tvaru CZ0100 (77 okresů, prefix = NUTS-3 kraj). `Věková kategorie`
  19 pásem: `0 let`, `01–04 let`, `05–09 let` … `80–84 let`, `85+ let`.
  `Pohlaví` M / Z. `Počet pojišťenců` celé číslo.
- Příklad: `2025;213;CZ0806;Ostrava-město;85+ let;Z;749`. Řádků dat 278 975.
- Součty z CSV: 2010 10 365 642 pojištěnců, 2020 10 552 556, 2024 10 840 228, 2025
  10 851 604 (z toho VZP 6 168 626, ZP MV ČR 1 354 312, ČPZP 1 307 560, OZP 755 548,
  VoZP 700 176, RBP 422 338, ZPŠ 143 044).
- **Datum, ke kterému je stav počítán, soubor neuvádí.** Metodika repa mluví o „stavu
  k datu“; přesný den (31. 12.? 1. 1.?) je třeba přečíst v metodickém PDF sady.
- „Pojištěnec“ je tu zdravotně pojištěná osoba evidovaná u dané ZP, včetně státních
  pojištěnců a cizinců s dočasnou ochranou. Metodika srovnávače (otevřená otázka 6)
  uvádí, že cizinců s dočasnou ochranou je u VZP 80–85 %. Nepodložené vysvětlení
  skoku VZP 2022 → 2023 (5 896 281 → 6 225 718, tj. +329 tis., zatímco ostatních šest ZP
  dohromady +66 tis.): příliv osob s dočasnou ochranou. **Ověřit v metodice sady, než
  se to napíše do textu.**

Co repo z CSV dělá (`M1/ingest/transform_pojistenci_d5.js`, 278 975 řádků, 0 přeskočeno):
agreguje do tří kostek a **ztrácí kombinace**. `pojistenci-d5-zp.json` zná ZP × kraj,
ale ne věk. `pojistenci-d5-kraj/okres.json` znají věk a pohlaví, ale ne ZP. Kostka
ZP × okres a ZP × kraj × věk existuje jen v CSV. `pojistovny-vek.json` ji zachovává jen
pro 2025 a součet za ČR.

### 2.3 OIS 11-24 (náklady ZP podle segmentů)

Stránka `https://www.nzip.cz/data/2394-naklady-zdravotni-pojistovny-segmenty-datovy-souhrn`,
NRHZS, zpracováno 31. 10. 2025, období 1. 1. 2023 – 30. 6. 2024. Dva listy: „Úhradová
data – souhrn“ (`CPO` = kód ZP, `Rok` = `2023` / `2024_pol`, `Segment` dle ZPP,
`Úhrada` v Kč; 414 řádků: 7 ZP × 34 kódů segmentů × 2 roky) a „Úhradová data – okresy“
(+ `Kód okresu`, `Název okresu` = **okres zařízení (IČZ), ne bydliště pojištěnce**,
9 414 řádků, jen rok 2023). Pasti: segment 1.7 už obsahuje 1.7.1 (nesčítat dvakrát),
víceúrovňové segmenty (1.2, 1.5, 2.1, 2.2, 3) se sčítají přes úrovně, rok `2024_pol`
je pololetní dodávka s více dohadnými položkami, u části segmentů je okres `CZ9999`.
Z toho vzniká v repu jen systémový součet (`ingest/nzip-extracts/OIS-11-24.json`,
žebříček ZP 2024: VZP 293,3 · ZP MV ČR 63,6 · ČPZP 55,1 · VoZP 35,0 · OZP 32,3 ·
RBP 19,0 · ZPŠ 6,4 mld Kč) a tři indikátory `podil_vydaje_*`.

### 2.4 Co je v `data/pojistovny.json` (sloučený dataset 7 ZP, verze 0.1.0)

| Blok | Obsah (pro každou ZP) | Rok | Zdroj |
|---|---|---|---|
| `crp` | počet pojištěnců, podíl trhu, podíl 65+/80+/0–14, růst 2015–2025, max. podíl v kraji, `top_kraje[4]`, `podil_trend` (16 let) | 2025 | OIS 11-47 |
| `hospodareni` | průměrný počet pojištěnců, podíl trhu, příjmy celkem, pojistné po přerozdělení, příjmy na pojištěnce, náklady na zdr. služby (mld, Kč/pojištěnce), fond prevence (mil., Kč/pojištěnce), provozní fond a provozní náklady % (+ zákonný limit u 4 ZP z 7), zůstatky ZFZP a BÚ, hospodářský výsledek, přepočtení zaměstnanci | 2024 | MZ + MF, Hodnocení v.z.p. 2024 (Tab. 1–11), VZ |
| `hospodareni` (plán) | zůstatek BÚ 2025 očekávaný a 2026 plán, % výdajů, závazky po splatnosti 2026 | 2025/2026 | ZPP 2026, tisk 280 |
| `hospodareni.*_std_kc` | věkově standardizované náklady a fond prevence; **stav `placeholder-bez-vah`** (faktor 1) | 2024 | `nakladove-indexy-2024.json` |
| `hospodareni_2025` | jen VZP, VoZP, OZP (kdy co): počty, příjmy, náklady, fond prevence, zůstatky | 2025 | VZ 2025 |
| `prevence`, `servis`, `mereni_dopadu`, `semafor` | max. příspěvek dospělý/dítě, kategorie, bonusový program, aplikace, pobočky; šest oblastí semaforu | 2024–2026 | VZ, weby ZP |
| `system`, `system_crp` | součty systému (příjmy 504,67 mld, výdaje 512,19 mld, saldo −7,5 mld, fond prevence 3,553 mld = 328 Kč/pojištěnce, 10 844 507 pojištěnců průměr; CRP: 10 851 604, 65+ 20,86 %) | 2024/2025 | totéž |
| `chybi` | 10 vlastních poznámek o mezerách | – | – |

Praktický příklad rozdílu zdrojů: průměrný počet pojištěnců 2024 podle MZ
(VZP 6 150 186, VoZP 703 630, ČPZP 1 310 233, OZP 758 486, ZPŠ 143 485, ZP MV ČR
1 354 075, RBP 424 412) a stav z CRP 2024 (6 135 553, 708 583, 1 311 127, 760 202,
144 216, 1 355 587, 424 960). Rozdíl je do 0,7 %, ale jde o **dvě různé veličiny**
(průměr za rok vs. stav) a nesmí se míchat v jedné řadě.

## 3. Které údaje ukazují, kdo je u koho pojištěn

| Zdroj | Co přesně měří | Rozlišení | Časový základ | Kdo a jak často | V repu |
|---|---|---|---|---|---|
| **(a) ÚZIS · CRP, OIS 11-47** | počet evidovaných pojištěnců | **ZP × okres × věk (19) × pohlaví** | stav k datu (den ověřit v metodice) | ÚZIS/NZIP, nepravidelně 1–3 edice ročně, roky 2010–2025 | **ano**: CSV + B–F, G (`crp`) |
| **(b) MZ + MF, Hodnocení vývoje systému v.z.p.** | **průměrný roční počet pojištěnců**, příjmy, náklady, fondy per ZP (hotovostní metodika) | ZP × rok, bez věku a regionu | průměr za rok | MZ, 1× ročně (květen–červen za rok N−1); za 2025 dosud nezveřejněno | **ano** za 2024: `hospodareni.*` (7 ZP) |
| **(c) Výroční zprávy ZP** (vyhláška 362/2010 Sb.) | počet pojištěnců k 31. 12., vlastní vykazování, někdy věkové struktura | ZP × rok (někdy kraj) | typicky 31. 12. | každá ZP zvlášť, v PDF, květen–říjen; formáty nesrovnatelné | **částečně**: VZ 2024 (7 ZP) a VZ 2025 jen VZP, VoZP, OZP (`hospodareni_2025`); text VZ v repu není, jen přepsané tabulky |
| **(d) Zdravotně pojistné plány** (sněmovní tisky) | plánovaný průměr pojištěnců, příjmy, výdaje, rezervy | ZP × rok | plán | ročně v srpnu; tisk 280 = ZPP 2026 | **částečně**: zůstatky a plán 2026 v `pojistovny.json`, úhrady podle segmentů 2024 v `financing.by_payer` (zaokrouhlené „kalibrované“ hodnoty), plánované počty pojištěnců nezachyceny |
| **(e) Měsíční přerozdělení pojistného** | podle popisu stránky MZ: výsledné částky po přerozdělení pro každou ZP, průměrné příjmy na pojištěnce, měsíční 100% výběr a parametry pojistného podle plátců | ZP × měsíc | měsíc | MZ, `https://mzd.gov.cz/prerozdelovani-pojistneho-na-verejne-zdravotni-pojisteni/`, přílohy PDF (kontrola stránky 2. 11. 2026: data od ledna 2023, aktualizace 19. 10. 2026) | **ne**. Odkazuje se na ni jen draft `M1/drafts/explainer-prerozdeleni-pojistneho-tisk-70.json` |

K bodu (e) poctivě: stránka MZ **výslovně nepopisuje, že přílohy obsahují počty
pojištěnců nebo nákladové indexy**, jen výsledné částky a průměr na pojištěnce (který
počet pojištěnců implicitně vyžaduje). Zadání vydavatele předpokládá, že MZ/VZP zveřejňuje
měsíčně počty pojištěnců a indexy per ZP. To v repu **nebylo ověřeno** (PDF přílohy
nebyly staženy, web Kanceláře zdravotního pojištění `zdravotnipojistovny.cz` nebyl
v session dostupný a repo ho jako zdroj nevyužilo, viz `data/pojistovny.json` →
`chybi`). Rozpor ke kontrole: draft explaineru uvádí „měsíční data od 11/2014“,
stránka MZ při kontrole říkala od ledna 2023.

Co je v repu a co ne, shrnutě:

| Otázka | Odpověď repa |
|---|---|
| Kolik pojištěnců má která ZP dnes / v roce X | **ano** (a), 2010–2025 |
| V kterém kraji / okrese | kraj ano (B); **okres jen v CSV** (D okres neumí ZP) |
| Jak jsou staří a jakého pohlaví | ano pro 2025 (F); pro jiné roky a okres jen v CSV |
| Jak se kmen mění v čase | ano ročně (E, B); měsíčně ne |
| Kdo od koho odešel / přestoupil | **ne**: z ročních stavů jde odhadnout jen čistá změna; hrubé toky (přestupy) nikde nemáme. Záznam CRP o změnách pojišťovny veřejný není (neověřeno) |
| Kolik pojištěnců je státních (platí stát) | **ne** per ZP |
| Příjmy na pojištěnce po přerozdělení | ano 2024 (G); měsíčně ne |

## 3b. Stížnosti a podněty na dostupnost péče ve výročních zprávách

_Doplněno 2. 11. 2026 na dotaz vydavatele („dají se z VZ vytáhnout počty stížností klientů na
dostupnost?“). Data: `M1/data/pojistovny-stiznosti.json`, zobrazuje `pojistovny-indikatory.html`._

Ano, částečně. Výroční zpráva má povinnou kapitolu 4.6.1 „Místní a časová dostupnost hrazených
služeb dle § 40 zákona č. 48/1997 Sb.“, ale počty podání v ní uvádějí jen čtyři pojišťovny a každá
jinak:

| ZP | Co počítá | 2023 | 2024 | 2025 |
|---|---|---|---|---|
| VZP ČR | podněty k místní a časové dostupnosti, tabulka podle odbornosti (součet sloupce Celkem) | 46 866 | 46 975 | 42,7 tis. (jen text) |
| ZP MV ČR | (a) všechna podání vč. ombudsmana / oprávněné / prům. doba vyřízení; (b) podání na nedostupnost přes formulář MZ | 1 574 / 4 / 16,5 d; 1 391 | 917 / 14 / 8,65 d; 741 | 919 / 2 / 9,05 d; 672 |
| ČPZP | přijatá podání na zajištění péče; zvlášť stomatologie | ~8 000 | ~8 000 (stomat. 4 703, z toho MSK 2 610) | 6 590 (stomat. 3 539, MSK 1 567) |
| RBP | žádosti o zajištění péče u vybraných odborností | 3 970 (jen zubní) | VZ 2024 v repu není | 6 049 (zubní 4 623, VPL 811, PLDD 248, psychiatrie 148, dětská psych. 56, klin. psych. 163) |
| VoZP, OZP, ZPŠ | jen slovní popis (evidence podnětů, Asistenční služba, komise pro síť) | – | – | – |

Jediná položka se stejnou definicí u všech sedmi je počet stížností podle § 16a zákona
č. 106/1999 Sb. (povinná část VZ o poskytování informací), která ale o dostupnosti péče nic neříká.
Srovnání napříč pojišťovnami proto vyžaduje jednotnou definici podání (otázka do kola 1 nebo
žádost 106): počet podání k dostupnosti za rok podle odbornosti a okresu, podíl vyřízených
zajištěním péče do 30 dnů, počet eskalací na MZ. Převzaté položky jsou v datasetu s odkazem na
soubor a řádek přepisu VZ (`ingest/manual/pojistovny/vz-text/`), takže je `verify` může kontrolovat.

## 4. Mezery a návrhy (jen seznam, žádná implementace)

Navržené `id` mají prefix `zp_` a v kontraktu by potřebovaly nový rozměr (např.
`by_insurer`, schéma je třída C podle `GOVERNANCE.md`). Do té doby je lze vést jako
pole v `data/pojistovny.json`. Sloupec „Zdroj v repu“ říká, zda lze indikátor spočítat
z toho, co už leží v repu.

| Navržené `id` | Název | Zdroj | Granularita | Zdroj v repu? |
|---|---|---|---|---|
| `zp_pojistenci` | Počet pojištěnců (stav) | CRP OIS 11-47 | ZP × rok 2010–2025 | **ano** (`crp-agregaty-2025.json`, B) |
| `zp_podil_trhu_pct` | Tržní podíl | CRP | ZP × rok, ZP × kraj | **ano** (B, E) |
| `zp_podil_65plus_pct` | Podíl pojištěnců 65+ (a 80+) | CRP | ZP × rok | **ano** pro 2025 (`crp`, F); jiné roky z CSV |
| `zp_prumerny_vek` | Odhadovaný průměrný věk kmene | CRP | ZP × rok | **ano** 2025 (F), odhad ze středů pásem |
| `zp_rust_kmene_pct` | Růst kmene za 10 let / index 2010 = 100 | CRP | ZP | **ano** (P3.1) |
| `zp_naklady_na_pojistence_kc` | Náklady na zdravotní služby na pojištěnce | MZ Hodnocení v.z.p. | ZP × rok | **ano** 2024; 2025 jen VZP, VoZP, OZP |
| `zp_naklady_na_pojistence_std_kc` | totéž věkově a pohlavně standardizované | CRP + indexy přerozdělení | ZP × rok | **částečně**: kód ano, váhy ne (`placeholder-bez-vah`) |
| `zp_provozni_naklady_pct` | Výdaje na vlastní činnost / **výdaje celkem** (MZ Tab. 4, hotovostně); vedle toho zákonný limit nákladů na činnost podle vyhlášky 418/2003 Sb., který má **každá ZP vlastní** (VZP 2,91 %, ČPZP 3,05 %, ZPŠ 3,08 %, RBP 3,07 %; VoZP, OZP, ZPMV nedohledán) a počítá se z jiného základu (rozvrhová základna), takže se s podílem na výdajích přímo nesrovnává | MZ Tab. 4, VZ | ZP × rok | **ano** 2024 (`provozni_naklady_pct`, `provozni_limit_pct`); limit u 3 ze 7 chybí |
| `zp_rezerva_pct_vydaju` | Zůstatek na **všech bankovních účtech** jako % ročních výdajů (`zustatek_bu_celkem_mld`; ZFZP se **nepřičítá**, jeho účet je v součtu BÚ už obsažen — VZP 2024: ZFZP 11,12 mld, všechny BÚ 32,34 mld); ZFZP lze ukázat zvlášť jako dílčí položku | MZ Tab. 6, ZPP tab. 9 | ZP × rok | **ano** (`zustatek_bu_celkem_mld`, `zustatek_2026_pct_vydaju`); ZFZP zvlášť (`zustatek_zfzp_mld`) |
| `zp_hospodarsky_vysledek_mld` | Hospodářský výsledek (příjmy − výdaje) | MZ Tab. 2 a 4 | ZP × rok | **ano** 2024; zdroj pro saldo v Tab. 1 chybí |
| `zp_fond_prevence_na_pojistence_kc` | Fond prevence na pojištěnce (a % příjmů) | MZ, VZ | ZP × rok | **ano** 2024 (+ 2025 VZP, VoZP, OZP); rozhodnutí PS 7. 10. 2026: není hlavní ukazatel |
| `zp_prijmy_na_pojistence_kc` | Pojistné po přerozdělení na pojištěnce | MZ | ZP × rok | **ano** 2024; měsíčně ne |
| `zp_uhrady_segment_podil` | Podíl lůžkové / ambulantní / léků v úhradách ZP | ÚZIS OIS 11-24 | ZP × segment × rok (okres zařízení) | **surově ano** (`03_Prezentace/…OIS-11-24…xlsx`), zpracované jen za ČR; plán 2024 v `financing.by_payer` |
| `zp_kmen_okres_podil` | Podíl ZP v okrese (kdo je u koho pojištěn „na mapě“) | CRP | ZP × okres × rok | **surově ano** (CSV), nezpracováno |
| `zp_kmen_vek_kraj` | Věková struktura kmene ZP v kraji | CRP | ZP × kraj × věk | **surově ano**, nezpracováno |
| `zp_pojistenci_mesicni` | Měsíční počty pojištěnců (příp. změna oproti předchozímu měsíci) | MZ přerozdělení / KZP | ZP × měsíc | **ne**; ověřit obsah PDF příloh MZ a KZP |
| `zp_prestupy` | Přestupy mezi ZP (příchozí / odchozí / saldo za rok) | KZP / ZP / MZ (neověřeno) | ZP × rok | **ne** |
| `zp_staty_podil_pct` | Podíl státních pojištěnců v kmeni | MF / MZ / ZP (neověřeno) | ZP × rok | **ne** |
| `zp_cizinci_docasna_ochrana` | Počet pojištěnců s dočasnou ochranou | MZ/VZP (v tisku 70 jen u VZP) | ZP | **ne** (jen mimořádné zprávy; draft tisk 70) |
| `zp_cekaci_doby` | Čekací doby na vybrané výkony | žádosti 106, data VZP | ZP | **ne** (jen `cekaci_doba_kycel` z VZP) |
| `zp_pokryti_screeningu` | Pokrytí screeningem podle ZP pojištěnce | NRHZS (obsahuje kód ZP) | ZP × kraj | **ne**; zjistit, zda veřejné sady NZIS Open ZP rozlišují |
| `zp_zamestnanci_na_10k` | Přepočtení zaměstnanci / 10 tis. pojištěnců | VZ | ZP | **ano** (`zamestnanci_prepocteni`) |

Metodické mezery bez nového indikátoru: aktuální stav CRP se do repa nahrává ručně
(CSV v kořeni, fetcher `nzip_dohodovaci_rizeni.js` stahuje jen XLSX do cache a
`transform:pojistenci` v žádném workflow neběží); VZ 2025 chybí pro ČPZP, ZPŠ, ZP MV ČR,
RBP; věková struktura chybí ve VZ všech ZP kromě VZP a VoZP; ohlášená sada ÚZIS 5.3
„Náklady za zdravotní služby pro účely přerozdělování“ (NRHZS, plán: druhá polovina
2026 po validaci pojišťovnami) vyřeší skutečné váhy, zatím nevyšla
(`ingest/dohodovaci-rizeni-ohlasene.json`, kontrola 30. 10. 2026).

## 5. Prolinkování: články, explainer, glosář

### 5.1 Články o pojišťovnách (`M1/data/articles.json`)

Tag `narok-pojistence` existuje v `data/tags.json`; **tag ani rubrika „pojišťovny“ ne**
(články jsou v rubrice `financovani` / `legislativa`). Série `series.json` žádnou sérii
o pojišťovnách nemá. Články mají `linked_indicators`, ale žádný neodkazuje na per-ZP
data, protože žádná neexistují.

| Slug | Téma | Dotčené indikátory |
|---|---|---|
| `clanek-pojistne-plany-2026` | ZPP 2026, schodek −14,9 mld | `uhrada_zp_per_pojistenec`, `podil_vydaje_*` |
| `clanek-deficit-pojisteni-2026`, `clanek-deficit-vzp-2026` | deficit v.z.p. | `vydaje_zdravotnictvi_hdp`, `platba_z_kapsy_pct`, (`uhrada_zp_per_pojistenec`) |
| `clanek-zp-mv-cr-trestni-oznameni-kontrola-2026` | ZP MV ČR, provoz | `vydaje_sprava_systemu_pct`, `uhrada_zp_per_pojistenec` |
| `clanek-veto-platcu-szv-2026` | veto pojišťoven nad sazebníkem | `uhrada_zp_per_pojistenec` |
| `clanek-platba-statu-statni-pojistenci`, `clanek-valorizace-statni-pojistenci-2027`, `clanek-platba-statni-pojistenci-2027-tri-cisla` | platba státu | `uhrada_zp_per_pojistenec` |
| `clanek-reforma-verejneho-zdravotniho-pojisteni-2030` | reforma, fond prevence | `vydaje_prevence_pct`, `vydaje_sprava_systemu_pct` |
| `clanek-bonus-za-zdravi-pojistne` | bonus a fond prevence | `vydaje_prevence_pct` |
| `clanek-platba-za-vysledek-vzp` | úhrady VZP za výsledek | `cekaci_doba_kycel` |
| `clanek-narok-pojistence-1` až `-4` | nárok pojištěnce (tag `narok-pojistence`) | `uhrada_zp_per_pojistenec`, čekací doby |
| `clanek-uhradova-vyhlaska-2027`, `clanek-financovani-segmenty-2026`, `clanek-dohodovaci-rizeni-2027-vysledek` | úhrady, segmenty, dohodovací řízení | `podil_vydaje_*` |
| `clanek-prerozdeleni-pojistneho-tisk-70` | **jen draft** v `M1/drafts/` (nepublikováno, `noindex`), mimořádný převod 7,8 mld z VZP | – |

Plánovaný článek P5.2 „Sedm pojišťoven, jeden pojištěnec“ zatím neexistuje.

### 5.2 Explainer `pojistovny` (`M1/data/explainers.json`)

Existuje (kategorie `actors`, `verification_status: ok`). Problémy: čísla „~60 %,
~5,9 mil.“ jsou starší než CRP 2025 (56,85 %, 6,17 mil.); `linked_indicators` jen
`cekaci_doba_kycel`, `vydaje_zdravotnictvi_hdp`, `platba_z_kapsy_pct`; nelinkuje na
`uhrada_zp_per_pojistenec`, `vydaje_sprava_systemu_pct` ani na `pojistenci.html`.
Přerozdělení zmiňuje jednou větou. Samostatný explainer o přerozdělení je jen draft
(`M1/drafts/explainer-prerozdeleni-pojistneho-tisk-70.json`, `verification_status:
draft`).

### 5.3 Glosář (`M1/data/glossary.json`, 255 pojmů)

Je tu `VZP`, `KZP`, `NRHZS`, `dohodovací řízení`, `úhradová vyhláška`, `NZIS`, `NRPZS`.
**Chybí** (hledáno v klíči, názvu i definicích):

| Chybějící pojem | Proč je potřeba |
|---|---|
| fond prevence | centrum srovnávače (oblast Prevence), dnes jen v textech |
| přerozdělení pojistného (a zvláštní účet) | vysvětluje, proč „Kč na pojištěnce“ bez standardizace nesrovnává |
| CRP / Centrální registr pojištěnců | zdroj „kdo je u koho pojištěn“ |
| OIS 11-47 / datový souhrn (NZIP) | odkaz z `pojistenci.html` |
| ZFZP (základní fond zdravotního pojištění), provozní fond, rezervní fond | jazyk indikátoru `uhrada_zp_per_pojistenec` a hospodaření ZP |
| ZPP (zdravotně pojistný plán) | plán vs. skutečnost |
| státní pojištěnec, platba státu | články o platbě státu |
| zaměstnanecké pojišťovny (VoZP, ČPZP, OZP, ZPŠ, ZP MV ČR, RBP) | zkratky nejsou nikde rozepsané |
| věková standardizace | metodika § 4.1 |
| změna zdravotní pojišťovny (termín 31. 3.) | jen v explaineru, ne v glosáři |

## Příloha A. Dotaz, kterým lze seznam z § 1.4 znovu vyrobit

Skript prochází `M1/data/indicators.json` a `M1/indicators/*.json`: vybere indikátory,
jejichž `source.name` nebo `data_source` odpovídá regulárnímu výrazu
`VZP|pojišťov|NRHZS|KZP|SZP|ZFZP|v\.z\.p|veřejného zdravotního pojištění|OIS-11-(06|24|20|47)`
nebo jejichž název obsahuje `pojišť|pojistn|ZP`. Výsledek 2. 11. 2026: 40 indikátorů,
z toho 8 s krajskými daty v `regions.json` (`cekaci_doba_kycel`, `cekaci_doby_specialist`,
`polypragmazie_65plus`, `screening_kolorektalni`, `screening_mamograficky`,
`vakcinace_chripka_65`, `zachyt_demence_65_80`, `zachyt_pas_18_mesicu`).

## Příloha B. Odkazy na kód a testy

- Transformace: `M1/ingest/transform_pojistenci_d5.js` (CSV → B–D), `M1/ingest/transform_pojistovny_crp.js` (CSV → F), `M1/ingest/transform_pojistovny_standardizace.js` a `M1/ingest/lib/standardizace.js`, `M1/ingest/transform_financing.js`, `M1/ingest/transform_financing_regions.js`.
- Validace: `M1/ingest/validate-pojistovny.js`, `M1/ingest/validate-financing.js`; testy `M1/tests/transform_pojistenci_d5.test.js`, `pojistenci_frontend.test.js`, `standardizace.test.js`, `pojistovny.test.js`.
- Frontend: `M1/src/pojistenci.js`, `M1/src/financovani.js` (`renderPayersComparison`), `M1/src/pojistovny*.js`, `M1/src/zp-*.js`.
- Související dokumenty: `docs/metodika-srovnavac-pojistoven.md`, `docs/nzip-dohodovaci-rizeni-katalog.md`, `M1/PLAN-SROVNAVAC-POJISTOVEN.md`, `09_Srovnavac_pojistoven_plan.md`.
