# Discovery report — 2026-05-31

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-31 (neděle). Předchozí běh 2026-05-30 → ARTICLE‑WRITE
(`clanek-ja-heroes-workforce-2026.html` nový článek slot 2026‑07‑11).

Prozkoumáno přímým WebFetch/WebSearch: MZ ČR `mzd.gov.cz/vsechny-novinky/`,
ÚZIS `www.uzis.cz/index.php?pg=aktuality`, SZÚ `szu.gov.cz/`,
SZÚ search NAUTA, SZÚ tisková zpráva NAUTA 2025 (přímý WebFetch),
ČSÚ `csu.gov.cz/csu/czso/aktuality`, WHO Europe news‑room,
SÚKL `sukl.gov.cz/`, NÚKIB `nukib.gov.cz/cs/`,
Zákony pro lidi aktuálně (HTTP 403), PSP ČR (chybí specifický endpoint pro
filtraci nových tisků k dnešnímu dni), WebSearch crossreference NAUTA 2025
(ceskenoviny.cz, bezpecnostpotravin.cz, mzd.gov.cz — všechny potvrzují
klíčová čísla 38,8 %, 26,0 %, 25,6 %, 35,6 %).

## HOT — primárně‑zdrojový trigger 29.–30. 5. 2026

### SZÚ NAUTA 2025 zveřejněn — vlna 2025 přepisuje data o nikotinu u mladých

Státní zdravotní ústav publikoval **29. 5. 2026** tiskovou zprávu
„NAUTA: Téměř 40 % mladých Čechů užívá nikotin, každý čtvrtý denně"
(<https://szu.gov.cz/aktuality/nauta-temer-40-mladych-cechu-uziva-nikotin-kazdy-ctvrty-denne/>).

Plný report ke stažení:
<https://szu.gov.cz/wp-content/uploads/2026/05/NAUTA_Narodni-vyzkum-uzivani-tabaku-a-alkoholu-v-Ceske-republice-2025.pdf>
(2,7 MB; obsah PDF se WebFetch nepodařilo strojově načíst — binární data —
ověření čísel proběhlo přes citace v tiskové zprávě + cross‑check na
ceskenoviny.cz a bezpecnostpotravin.cz).

**Klíčová čísla z tiskové zprávy NAUTA 2025 (doslovné citace ověřené přes
WebFetch primárního zdroje 29. 5. 2026):**

Celá populace 15+:

- **29,5 %** „české populace ve věku nad 15 let užívá nikotin"
- **22,5 %** „jej užívá denně"
- **22,1 %** „jsou kuřáci" — „Tři čtvrtiny současných kuřáků přitom kouří
  denně" (z toho ≈ **16,6 %** denních kuřáků v populaci 15+, dopočítáno;
  TZ ho explicitně neuvádí číslem, ale v naratíve drží stejný řád jako
  16,4 % NAUTA 2024)
- **11,6 %** „respondentů užívalo elektronické cigarety měsíčně"
- **38,0 %** „současných kuřáků se v roce 2025 pokusilo přestat kouřit"
- **35,0 %** „hlavním důvodem byly obavy ze zhoršení zdravotního stavu
  v budoucnosti"

Mladí 15–24 let:

- **38,8 %** „mladých Čechů ve věku 15–24 let" užívá nikotin
- **26,0 %** „jej užívá denně" (denní uživatelé nikotinu, ne jen tabáku)
- **25,6 %** užívá elektronické cigarety
- **35,6 %** uživatelů e‑cigaret v této kategorii používá **nejsilnější
  náplně** — „nárůst z **5,0 %** v roce 2022 na **35,6 %** v roce 2025"
  → **7× nárůst** za 3 roky (signifikantní nová evidence)

Alkohol + tabák (synergický efekt):

- **19,2 %** kuřáků mezi umírněnými konzumenty alkoholu
- **39,2 %** kuřáků mezi rizikovými pijáky
- **54,5 %** kuřáků mezi škodlivě pijícími
- **75 %** případů „rakoviny hlavy" je dle citace SZÚ spojeno s kombinací
  obou faktorů (TZ připisuje, redakce použije s atribucí SZÚ)

**Metodika (z TZ):**

- **1 873 respondentů**
- Reprezentativní pro populaci ČR 15+ z hlediska věku, pohlaví, regionu
- Face‑to‑face řízený rozhovor (standard metodiky NAUTA od r. 2012)
- Roční vlna

**Citace osob (přímo z TZ, atribuováno):**

- **MVDr. Anna Niklová**, vedoucí Centra podpory veřejného zdraví SZÚ —
  „Závislost vzniká velmi rychle" a „nikotin je silně návykový"
- **MUDr. Barbora Macková, MHA**, hlavní hygienička a ředitelka SZÚ —
  zaměřila se na marketingové praktiky a potřebu „důraznějších opatření
  na ochranu mládeže"

**Cross‑check sekundárními zdroji:**

- ČTK / ČeskéNoviny.cz potvrzuje „38,8 %" a „25,6 %" a „5,0 → 35,6 %"
  (<https://www.ceskenoviny.cz/zpravy/pruzkum-temer-40-procent-cechu-od-15-do-24-let-uziva-nikotin-ctvrtina-denne/2831773>)
- bezpecnostpotravin.cz (portál SZPI) přebírá TZ doslovně
  (<https://bezpecnostpotravin.cz/nauta-temer-40-mladych-cechu-uziva-nikotin-kazdy-ctvrty-denne/>)
- WHO Europe World No Tobacco Day 27. 5. 2026 + 31. 5. 2026 SZÚ článek
  „31. květen – Světový den bez tabáku" tvoří mediální kontext

**Mezera v dokumentaci (transparentní caveat):**

- Plný PDF reportu NAUTA 2025 (2,7 MB) se WebFetch strojově nepodařilo
  načíst — exaktní hodnoty bylo nutné ověřit přes TZ + cross‑check.
  Redakční pravidlo: čísla, která se objevují v primární TZ a zároveň
  v alespoň jednom nezávislém zdroji (ČTK), použijeme s přímou citací
  SZÚ NAUTA 2025; čísla bez cross‑checku použijeme jen s explicitní
  atribucí „podle tiskové zprávy SZÚ".
- TZ explicitně NEUVÁDÍ samostatnou hodnotu „denní kuřáctví tabáku
  v celé populaci 15+". Hodnota se dopočítává jako 3/4 z 22,1 %
  = ≈ 16,6 %. Pro aktualizaci indikátoru `kuractvi_denni` (data/
  indicators.json) nemáme exaktní 2025 hodnotu — proto **neupravujeme
  value 16,4 %** v indikátoru, jen aktualizujeme `fetched_at` a přidáme
  poznámku, že NAUTA 2025 potvrzuje stagnaci na úrovni ~16 %.
- Numerická konzistence „22,4 % 2024 → 22,1 % 2025" (kuřáci tabáku
  celkem) je v rámci statistické chyby pro n=1873 (±2 % na 95% CI).
  Redakční výrok zní „roztrhnutý trend stagnuje" / „v rámci chyby
  výběru se podíl kuřáků nemění", ne „pokles o 0,3 p. b."

## Další zdroje 28.–31. 5. 2026

### MZ ČR — žádné nové TZ 30.–31. 5. 2026

Poslední TZ z 29. 5. 2026 (Helena Rögnerová + IKEM, JA HEROES) již
pokryté discovery 30. 5. Víkend bez nových materiálů z MZd.

### ÚZIS

Web `www.uzis.cz/index.php?pg=aktuality` — poslední aktualita 5. 5. 2026
(prodloužení termínu výkazů 2025). Bez nového triggeru.

### ČSÚ

Aktuality 28.–31. 5. 2026 (HDP 1Q 2026, mzdy, dětská jména, těžba dřeva,
demografie) — bez HSPA‑relevantního zdravotnického datasetu. Newsletter
05/2026 nevypouští nový zdravotnický indikátor.

### SZÚ — další aktuality (mimo NAUTA HOT)

- 30. 5. 2026: „31. květen – Světový den bez tabáku" — informativní článek
  k WHO No Tobacco Day; tematicky integrován do NAUTA HOT triggeru.
- 29. 5. 2026: nutrivigilance report 2025 (nežádoucí reakce po konzumaci
  potravin) — bez HSPA‑relevance pro tento běh.
- 26. 5. 2026: ERVI‑net 2026 Annual Meeting účast SZÚ, heat health advisory
  — bez triggeru.

### WHO Europe

- 27. 5. 2026: World No Tobacco Day 2026 (the next nicotine revolution).
- 26. 5. 2026: Ukraine medical equipment delivery. Bez triggeru pro
  korpus HSPA‑monitoru ČR.

### SÚKL

- 29. 5. 2026: PRAC pharmacovigilance signal recommendations (rutinní
  regulatorní aktualizace, bez triggeru).
- 28. 5. 2026: aktualizovaný seznam individuálně připravovaných LP pro
  úhradu (účinnost 1. 6. 2026); CHMP schválil 8 nových LP (18.–21. 5.).
- 27. 5. 2026: stažení šarže Veral 25 mg (úroveň zdravotnického zařízení,
  bez ohrožení zdraví) — bez triggeru.
- 26. 5. 2026: Jascayd (nerandomilast) schválen pro 2 typy plicní
  fibrózy; Vijoice (alpelisib) podmínečně schválen jako první LP pro
  vzácné poruchy růstu tkání. Mezinárodní EMA‑level zprávy, bez ČR‑specifické
  implikace.

### NÚKIB

- 29. 5. 2026: ENISA Cybersecurity Services Tender (Cyber Solidarity Act).
- 25. 5. 2026: česko‑norská mise (post‑quantum, cyber resilience).
- 22. 5. 2026: elektronické certifikáty pro systémy utajovaných informací
  (přechod z papírové formy).
- 20. 5. 2026: smishing kampaň imitující Policii ČR.
- **Žádný incident ve zdravotnictví nebyl hlášen.**

### PSP ČR / Sbírka zákonů

- Zákony pro lidi `aktualne` vrátil HTTP 403 (rate limit / pravděpodobný
  bot block). PSP `historie.sqw` bez parametru o vrátil chybu „Sněmovní
  tisk 0 nebyl nalezen". Pro tento běh nelze ověřit primárně.
  Fallback ověření přes externí kanály neproběhlo (nemělo by primární
  hodnotu).

## Aktualizace existujících dat

- **SZÚ NAUTA 2025** je významná vlna primárních dat 2025
  publikovaná 29. 5. 2026 — přepisuje datový rámec
  `clanek-koureni.html`, který momentálně cituje NAUTA 2024 jako primární.

## Stav publikační fronty (k 31. 5. 2026)

Fronta `data/articles.json` obsahuje 63 nezveřejněných článků,
nejvzdálenější naplánovaný `clanek-ja-heroes-workforce-2026.html`
slot 2026‑07‑11 (vytvořen 30. 5. 2026). Next publikační slot
(maximum scheduled_for + 1) = **2026‑07‑12**.

## Stav korpusu vůči NAUTA 2025 tématu (kontrola na duplicitu)

Existující články o kouření/nikotinu v korpusu:

| Slug | Stav | Pozice |
|---|---|---|
| `clanek-koureni.html` | published 7. 5. 2026 (NAUTA 2024 baseline) | **Cíl revize — vlna 2024 nahrazena vlnou 2025** |
| `clanek-koureni-adolescenti.html` | scheduled 9. 6. 2026 (HBSC 2022) | Jiný úhel (HBSC 15‑letí) — bez revize |
| `clanek-alkohol-spotreba.html` | published | NAUTA pokrývá alkohol jen okrajově — bez revize |

**Vyhodnocení:** ARTICLE‑REVISE `clanek-koureni.html` je čistý postup.
Vytvoření nového článku by zdvojovalo strukturu; NAUTA 2025 wave není
dost rozsáhlá ani odlišná, aby ospravedlnila samostatný článek
o nikotinu mimo již existující `clanek-koureni.html`.

## Doporučení pro routing fáze

- **HOT (revize existujícího článku):** **ARTICLE‑REVISE →
  `clanek-koureni.html`** s integrací NAUTA 2025 wave (29. 5. 2026).
  Hlavní novinky pro článek:
  1. 35,6 % uživatelů e‑cigaret v 15–24 letech užívá nejsilnější
     koncentrace — **7× nárůst** z 5,0 % (2022) → 35,6 % (2025)
  2. 38,8 % mladých 15–24 užívá nikotin (vs. ~50 % v NAUTA 2023 —
     samostatné srovnání metodicky korektní za předpokladu stejné
     věkové definice; uvádíme s atribucí)
  3. Tabák × alkohol synergie: 75 % případů rakoviny hlavy a krku
     dle SZÚ NAUTA 2025 spojeno s kombinací obou faktorů
  4. 38 % současných kuřáků se pokusilo v 2025 přestat (positivní
     context)
- **WARM:** žádný
- **COLD / FALLBACK‑AUDIT:** netřeba, máme čistý HOT trigger.

## Routing rozhodnutí

ARTICLE‑REVISE → `clanek-koureni.html` (integrace NAUTA 2025 wave).
Viz `routing-2026-05-31.md`.
