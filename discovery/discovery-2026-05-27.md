# Discovery report — 2026-05-27

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-27 (středa). Předchozí běh 2026-05-26 → ARTICLE-WRITE
(`clanek-react-eu-nku-kontrola-2026.html`, slot 2026-06-13, status
`review-pending`).

Prozkoumáno přímým WebFetch / WebSearch: ÚZIS aktuality (uzis.cz),
MZ ČR tiskové centrum + všechny novinky (mzd.gov.cz/vsechny-novinky/),
SZÚ aktuality (szu.gov.cz/aktuality), WHO Europe news-room
(who.int/europe/news-room), Národní plán obnovy
(planobnovy.gov.cz), Masarykův onkologický ústav (mou.cz), Úřad vlády
ČR (vlada.gov.cz/cz/media-centrum), NKÚ (nku.cz). Sbírka zákonů /
zakonyprolidi.cz HTTP 403 (bez přístupu). Eurostat / OECD bez nové
vlny CZ-specific publikace v týdnu.

## Nové primární zdroje od posledního běhu (26.–27. 5. 2026)

### HOT — nový primární trigger

#### Otevření Centra onkologické prevence MOÚ Brno (26. 5. 2026)

- **Zdroj 1 (PRIMÁRNÍ — TZ MZd):** „Ministerstvo zdravotnictví podpořilo
  otevření Centra onkologické prevence v Brně. Nové pracoviště rozšíří
  možnosti časné diagnostiky i péče o pacienty", 26. 5. 2026.
  URL: <https://mzd.gov.cz/tiskove-centrum-mz/ministerstvo-zdravotnictvi-podporilo-otevreni-centra-onkologicke-prevence-v-brne/>
- **Zdroj 2 (PRIMÁRNÍ — Úřad vlády ČR):** „26. května 2026: Premiér
  Babiš se zúčastní otevření Centra onkologické prevence Masarykova
  onkologického ústavu", oznámení očekávané události
  227136 z 23. 5. 2026.
  URL: <https://vlada.gov.cz/cz/media-centrum/ocekavane-udalosti/26--kvetna-2026-premier-babis-se-zucastni-otevreni-centra-onkologicke-prevence-masarykova-onkologickeho-ustavu--227136/>
- **Zdroj 3 (PRIMÁRNÍ — Plán obnovy):** „Centrum onkologické prevence
  Masarykova onkologického ústavu v Brně", projektová karta NPO /
  RRF / NextGenerationEU.
  URL: <https://planobnovy.gov.cz/centrum-onkologicke-prevence-masarykova-onkologickeho-ustavu-v-brne/>
- **Zdroj 4 (PRIMÁRNÍ — MOÚ):** „Plány rozvoje MOÚ — Centrum
  onkologické prevence a rozvoj infrastruktury pro inovativní a
  podpůrnou péči", harmonogram realizace.
  URL: <https://www.mou.cz/plany-rozvoje-mou-centrum-onkologicke-prevence-a-rozvoj-infrastruktury-pro-inovativni-a-podpurnou-peci/t1671>

**Klíčové údaje z primárních zdrojů:**

| Co | Hodnota | Primární zdroj |
|---|---|---|
| Celková investice do rozvoje MOÚ | přesáhly 1,12 mld Kč | TZ MZd 26. 5. 2026 |
| Dotace z RRF / NextGenerationEU | 826 mil. Kč | planobnovy.gov.cz + MOÚ |
| Spolufinancování ze státního rozpočtu | 173,46 mil. Kč | planobnovy.gov.cz + MOÚ |
| Vlastní zdroje MOÚ | ~125 mil. Kč | planobnovy.gov.cz |
| Plánovaný nárůst počtu preventivních vyšetření v MOÚ | ~30 % | planobnovy.gov.cz + MOÚ t1671 |
| Centrum prevence — počet oddělení | 4 (preventivní prohlídky, preventivní vyšetřování, preventivní poradenství, centrum genetické prevence) | TZ MZd + planobnovy |
| Druhé centrum (Centrum inovativní a podpůrné péče) — pracoviště | 4 (first contact, klinické hodnocení, podpůrná péče, edukační centrum) | MOÚ t1671 + planobnovy |
| Začátek stavby | 2024 | MOÚ t1671 |
| Zkušební provoz Centra prevence | 2026 | MOÚ t1671 |
| Účast Babiše, Vojtěcha, Schillerové, eurokomisaře Várhelyiho | účast potvrzena | TZ MZd + Úřad vlády 227136 |

**Mezinárodní/legislativní kontext (ověřitelný):**

- **EU Beating Cancer Plan** (2021) — politický rámec evropského
  programu prevence; vazba na účast eurokomisaře pro zdraví (Várhelyi).
- **Národní onkologický program ČR (NOP)** — strategický rámec MZd
  pro onkologii.
- **Národní screeningové centrum ÚZIS** — sleduje účast občanů na
  populačních screeningových programech.

#### Implikace pro HSPA

- **Doména:** Procesy (prevence — populační screeningové programy,
  navýšení kapacity časné detekce) + Struktury (infrastruktura
  prevenčních pracovišť) + Finance (NPO/RRF investice 1,12 mld Kč).
- **Souvisle s indikátory korpusu:** mamografický screening
  (participation 60 %), kolorektální screening, cervikální screening,
  výdaje na prevenci.
- **Souvisle s články korpusu:**
  - `clanek-mamograf-rakovina-prsu.html` (60 % účast)
  - `clanek-rakovina-tlusteho-streva.html` (kolorektál)
  - `clanek-cervix-hpv.html` (cervix)
  - `clanek-screening-rakoviny-plic.html` (plic)
  - `clanek-onkologicky-koordinator-2026.html` (signální výkon 2026)
  - `clanek-centralizace-chirurgie-2027.html` (centralizace onkochir.)
  - `clanek-vydaje-prevence.html` (Česko utrácí 2,75 % na prevenci,
    pětina pod průměrem OECD)
  - `clanek-react-eu-nku-kontrola-2026.html` ve frontě 13. 6. (NPO/RRF
    rámec, komplementární investice — REACT-EU vs NPO).

### Ostatní zdroje (bez nového triggeru)

#### ÚZIS
- Žádná nová aktualita za 26.–27. 5. Poslední novinka 5. 5. 2026
  (Prodloužení sběru výkazů za 2025).

#### MZ ČR — jiné TZ
- 25. 5. 2026: REACT-EU reakce (pokryto v běhu 26. 5.).
- 26. 5. 2026: Centrum onkologické prevence (viz výše).
- 20. 5. 2026: Preventivní převzetí pacienta po expozici ebolou v Ugandě
  (verifikováno ze seznamu novinek MZd — bez nového CZ rizika).

#### SZÚ
- 26. 5. 2026: dvě aktuality bez HSPA implikace
  (Nutrivigilance 2025 + účast odbornice na konferenci ERVI-net).

#### WHO Europe / WHO globálně
- 26. 5. 2026: WHO + Asia-Europe Foundation + Japan předaly vybavení
  ukrajinským nemocnicím — bez CZ relevance.

#### OECD
- Bez nové edice ani CZ-specific publikace v týdnu.

#### Eurostat
- Bez nové vlny hlth_* relevantní pro CZ.

#### ČSÚ
- Bez zdravotně-statistické vlny v týdnu.

#### Sbírka zákonů / PSP ČR
- Přístup omezený (HTTP 403). Bez známé nové normy MZ ČR od
  předchozího běhu.

#### SÚKL / NÚKIB / VZP / NKÚ
- Bez nového triggeru. NKÚ k25007 REACT-EU již pokrytý v běhu 26. 5.

## Stav publikační fronty (k 27. 5. 2026)

Fronta obsahuje **22 článků naplánovaných na 22. 5. – 13. 6. 2026**.
Nejvzdálenější naplánovaný článek: `clanek-react-eu-nku-kontrola-2026.html`
slot 2026-06-13.

**Next publikační slot** (dle snippet v PROMPT_DAILY_ROUTINE.md
sekce 3.4): **2026-06-14**.

## Verifikace zdrojů (kritické pro audit fáze 5)

| Tvrzení v plánovaném článku | Primární zdroj | Stav |
|---|---|---|
| Otevření Centra onkologické prevence MOÚ 26. 5. 2026 | TZ MZd 26. 5. 2026 + Úřad vlády 227136 | ✅ |
| Účast premiéra Babiše | Úřad vlády 227136 + TZ MZd | ✅ |
| Účast ministra zdrav. Vojtěcha | TZ MZd 26. 5. 2026 | ✅ |
| Účast ministryně financí Schillerové | Úřad vlády 227136 | ✅ |
| Účast eurokomisaře Várhelyiho | Úřad vlády 227136 | ✅ |
| Celková investice >1,12 mld Kč | TZ MZd 26. 5. 2026 | ✅ |
| 826 mil. Kč z RRF / NPO | planobnovy.gov.cz + MOÚ | ✅ |
| 173,46 mil. Kč státní rozpočet | planobnovy.gov.cz | ✅ |
| ~125 mil. Kč vlastní zdroje MOÚ | planobnovy.gov.cz | ✅ |
| 4 oddělení Centra prevence | TZ MZd + planobnovy + MOÚ t1671 | ✅ |
| 4 pracoviště Centra inovativní a podpůrné péče | MOÚ t1671 + planobnovy | ✅ |
| Nárůst preventivních vyšetření v MOÚ o ~30 % | planobnovy + MOÚ t1671 | ✅ |
| Vstupní pavilon (Centrum inovativní a podpůrné péče) otevřen 7. 4. 2026 | MOÚ t2359 (prim.) | ✅ |
| Mamografický screening: účast cca 60 % žen 45–69 | ÚZIS aktualita aid=8630 (20. 10. 2023) | ✅ |
| Mortalita screeningem snížena o 31 % | ÚZIS aid=8630 | ✅ |
| 11 mil. screeningových mamografií za 20 let | ÚZIS aid=8630 | ✅ |
| Téměř 62 tis. karcinomů prsu zachyceno screeningem od 2002 | ÚZIS aid=8630 | ✅ |
| Česko utrácí 2,75 % výdajů na prevenci (pětina pod OECD) | indikátor v korpusu (clanek-vydaje-prevence) | ✅ (cross-reference) |

## Doporučení pro routing fáze

- **HOT (nový článek):** **`clanek-centrum-onkologicke-prevence-mou-2026.html`**
  — reakce na otevření Centra onkologické prevence MOÚ Brno z NPO/RRF.
  Primárně zdrojový, hustý na čísla, HSPA dimenze Procesy + Struktury +
  Finance, vazba na EU Beating Cancer Plan, komplementární k článku
  `clanek-react-eu-nku-kontrola-2026.html` ve frontě (oba o
  RRF/NPO investicích do zdravotnictví — kontrast: NKÚ kritika REACT-EU
  efektivity vs investice MOÚ s cílem zvýšit účast na screeningech).
- **WARM:** žádná akutní revize nutná. Nově publikovaná data screening
  participation by mohla vyžadovat aktualizaci `clanek-mamograf-rakovina-prsu`,
  ale ÚZIS NSC nepublikoval novou vlnu od 20. 10. 2023.
- **COLD:** N/A — máme HOT trigger.

## Routing rozhodnutí

ARTICLE-WRITE → `clanek-centrum-onkologicke-prevence-mou-2026.html`,
slot 2026-06-14 (konec fronty), `topical_until: 2026-06-26`
pro prioritizaci v cron `publish-scheduled.js` (článek vázaný
na čerstvou událost s relevancí 30 dnů od otevření; nemá smysl klesnout
na úplný konec fronty mezi nezadržené articley).

Viz `routing-2026-05-27.md`.
