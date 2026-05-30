# Discovery report — 2026-05-30

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-30 (sobota). Předchozí běh 2026-05-29 → ARTICLE‑REVISE
(`clanek-centralizace-chirurgie-2027.html` aktualizace z Věstníku 6/2026).

Prozkoumáno přímým WebFetch/WebSearch: ÚZIS aktuality, MZ ČR všechny novinky
(mzd.gov.cz/vsechny-novinky/), SZÚ aktuality (HTTP 404 přes `szu.cz`,
SZÚ portál v redirektu na `szu.gov.cz/aktualne/` — také HTTP 404),
WHO Europe news‑room, ČSÚ aktuality, Zákony pro lidi aktuálně (HTTP 403),
SÚKL registr výpadků léčiv (HTTP 404 přes obě domény), CORDIS (HTTP 404),
healthworkforce.eu — pro JA HEROES primární verifikace projektu.

## HOT — primárně‑zdrojový trigger 29. 5. 2026

### JA HEROES projekt skončil — MZ ČR představilo výsledky 29. 5. 2026

Ministerstvo zdravotnictví zveřejnilo 29. 5. 2026 tiskovou zprávu
„Ministerstvo zdravotnictví představilo výsledky projektu JA HEROES.
Základy systematického plánování zdravotnického personálu jsou
položené" (https://mzd.gov.cz/ministerstvo-zdravotnictvi-predstavilo-vysledky-projektu-ja-heroes-zaklady-systematickeho-planovani-zdravotnickeho-personalu-jsou-polozene/).

**Co je JA HEROES (primárně ověřeno na healthworkforce.eu):**

- Plný název: **HEROES Joint Action — HEalth woRkfOrce to meet health
  challEngeS** (https://healthworkforce.eu/)
- Datum začátku: **1. 2. 2023** (zdroj: healthworkforce.eu/the-project/)
- Trvání: **42 měsíců** → konec **31. 7. 2026** (počítáno z trvání;
  TZ MZd dne 29. 5. 2026 mluví o „skončeném" projektu — pravděpodobně
  myšleno faktické dokončení výstupů, ne formální administrativní
  uzavření grantu)
- Počet zúčastněných zemí: **19**
- Rozpočet: **8 748 922,55 €** s **80% spolufinancováním EU**
- Financující orgán: **HaDEA** (European Health and Digital Executive
  Agency)
- Koordinátor: **AGENAS** (italská národní agentura pro regionální
  zdravotní služby), kontakt heroes@agenas.it
- Český beneficiář: **Ministerstvo zdravotnictví ČR**
- České přidružené entity (affiliated entities):
  - **Národní centrum ošetřovatelství a nelékařských zdravotnických
    oborů (NCO NZO)**
  - **Ústav zdravotnických informací a statistiky ČR (ÚZIS)**
  - **Univerzita Karlova** (Katedra demografie a geodemografie PřF UK
    dle TZ MZd)

**Výstupy projektu (per TZ MZd 29. 5. 2026):**

1. **První ucelený datový rámec pro analýzy a projekce HWF**
   (Health Workforce) v ČR
2. **Vizualizace trendů v Power BI**
3. Příprava **otevřených datasetů pro NZIP** (Národní zdravotnický
   informační portál)
4. **Projekční model** kombinující nabídku a poptávku zdravotních
   služeb (umožňuje odhadovat optimální kapacity personálu)
5. **27 odborníků** absolvovalo národní školení
6. Dvoudenní studijní návštěva v **NIVEL (Nizozemsko)**
7. Plánovaný **workshop s WHO**
8. **Zařazení tématu HWF plánování do strategie „Zdraví 2035"**
9. **Návrh dedikované jednotky** pro HWF plánování na MZd
10. Pilotní testování procesů s plánovanou expanzí na další odbornosti

**Validace strategie Zdraví 2035 (primárně ověřeno):**

- Schváleno vládou ČR **12. 11. 2025 usnesením č. 862/2025**
- Aktualizace předchozího Zdraví 2030 (2019, update 2020)
- **12 specifických cílů** (rozšířeno z původních 7)
- **11 implementačních plánů** (SC 3.1 nemá vlastní)
- Web: https://mzd.gov.cz/zdravi-2035/
- PDF: https://mzd.gov.cz/wp-content/uploads/2025/12/Strategicky-ramec-rozvoje-pece-o-zdravi-v-Ceske-republice-do-roku-2035.pdf
- Existující záznam ve `data/strategies.json` → `zdravi_2035`
  s `topics` obsahujícími `workforce` (verified_at 2026‑05‑05)

### Validace osob a institucí

1. **Ministr zdravotnictví k 29. 5. 2026 = Adam Vojtěch.** (Třetí vláda
   Andreje Babiše jmenována 15. 12. 2025; potvrzeno discovery z 28. 5.
   2026 — viz `discovery-2026-05-29.md`.)
2. **TZ MZd 29. 5. 2026 přímou citaci ministra Vojtěcha
   k JA HEROES NEOBSAHUJE** — projekt je v TZ zmíněn v kontextu jeho
   funkce, ale bez konkrétního přímého vyjádření. V článku tedy
   citaci ministra **nepřebíráme**, abychom se nedopustili falešné
   atribuce.
3. **NCO NZO** = Národní centrum ošetřovatelství a nelékařských
   zdravotnických oborů (Brno) — etablovaná instituce MZ ČR.
4. **NIVEL** = Netherlands Institute for Health Services Research —
   etablované evropské pracoviště pro zdravotnický výzkum.

### Mezera v dokumentaci (transparentní caveat pro článek)

- Power BI vizualizace **NENÍ na webu NZIP doložená** (kontrola
  nzip.cz — homepage neobsahuje sekci HWF). Možnost: dashboardy
  jsou v interní verzi MZd / ÚZIS, případně budou zveřejněny později
  v r. 2026. Článek bude formulovat „bude zveřejněno" / „připravuje se".
- Otevřené datasety na NZIP — totéž.
- Web ÚZIS o projektu JA HEROES nereferuje (kontrola uzis.cz homepage —
  bez zmínky).
- Konkrétní budgetová alokace pro českého beneficiáře z 8,75 M€
  z dostupných primárních zdrojů **neznámá**.

## Další zdroje 28.–30. 5. 2026

### MZ ČR — další novinky 29. 5. 2026 (mimo HOT)

- **Helena Rögnerová se vrací na MZd, IKEM od června povede Romana
  Benešová** (TZ 29. 5. 2026,
  mzd.gov.cz/tiskove-centrum-mz/helena-rognerova-se-vraci-na-ministerstvo-zdravotnictvi-ikem-od-cervna-povede-romana-benesova/)
  — **personální změna**, ne HSPA‑indikátor. Citace ministra Vojtěcha:
  „IKEM nyní vstupuje do další fáze, která bude spojena především s
  rozvojem nemocnice a připravovanými investičními projekty." Bez
  článkové implikace pro korpus.

### MZ ČR — novinky 28. 5. 2026 (již pokryto discovery 29. 5.)

Věstník č. 6/2026 + CDZ IV + reforma vysoce specializované péče +
ERN výzva. Vše buď pokryto, nebo bez triggeru pro nový článek.

### ÚZIS, SZÚ, ČSÚ, WHO Europe, SÚKL, NÚKIB, PSP, Sbírka zákonů, NKÚ

- ÚZIS: bez nové aktuality (poslední 5. 5. 2026, ověřeno WebFetch
  uzis.cz/index.php?pg=aktuality)
- SZÚ: web `szu.cz/aktualne/` redirect na `szu.gov.cz/aktualne/`
  s HTTP 404. Nelze ověřit, agent ponechává jako neznámý stav (rate
  limit / migrace domény SZÚ na .gov.cz pravděpodobně v procesu).
- ČSÚ: aktuality 28.–29. 5. (HDP 1Q 2026, těžba dřeva, demografie
  jmen, mzdy) — bez HSPA‑relevantního datasetu.
- WHO Europe: poslední aktualita 27. 5. (World No Tobacco Day, již
  pokryté v korpusu — `clanek-koureni-adolescenti.html` slot 9. 6.
  2026).
- SÚKL: registr výpadků léčiv vrátil HTTP 404 (přes obě domény) —
  pravděpodobně migrace. Nelze ověřit.
- NÚKIB, PSP, Sbírka zákonů: bez nové normy / nového triggeru.

## Aktualizace existujících dat

- Žádná nová vlna primárních dat 28.–30. 5. 2026 mimo již pokryté
  PUK 2024 vlnu (revize centralizace‑chirurgie z 29. 5.).

## Stav publikační fronty (k 30. 5. 2026)

Fronta obsahuje **21 článků s `scheduled_for` v rozmezí 2026‑05‑22 až
2026‑07‑10** plus 12 článků bez `scheduled_for` (drafty, čekající na
ruční schválení / dopracování). Nejvzdálenější naplánovaný:
`clanek-psychiatricke-hospitalizace-reforma-2026.html` slot 2026‑07‑10.

**Next publikační slot** (dle snippet PROMPT_DAILY_ROUTINE.md sekce 3.4):
**2026‑07‑11** — sem zařadí nový článek o JA HEROES.

## Stav korpusu vůči HWF tématu (kontrola na duplicitu)

Existující články o workforce v korpusu:

| Slug | Stav | Úhel pohledu |
|---|---|---|
| `clanek-pracovni-sila.html` | draft (audit‑status: draft, published: None) | **Problém**: počet lékařů/sester per 1000, OECD srovnání, kompetence sester, postgrad výchova |
| `clanek-osetrovatelstvi-generacni-propast-2026.html` | publikováno 22. 5. 2026 | **Problém**: generační odchod sester, čísla chybějících sester |
| `clanek-okresni-nemocnice-personalni-krize.html` | publikováno 23. 5. 2026 | **Problém**: kazuistiky Pelhřimov + Znojmo, regionální dopad personální krize |

**Nový JA HEROES článek = METODOLOGICKÝ a INSTITUCIONÁLNÍ úhel pohledu**
(jak Česko vůbec plánuje, jaký nástroj má, jaká strategie to kotví,
kdy by měla vzniknout dedikovaná jednotka). NEDUPLIKUJE problém —
doplňuje ho o stranu řešení a institucionálního rámce. Tříletý projekt
JA HEROES s 8,75 M€ rozpočtem, 19 zeměmi a konkrétními výstupy (datový
rámec, projekční model, Power BI, NZIP) je samostatný primárně‑zdrojový
trigger, který v korpusu zatím chybí.

## Doporučení pro routing fáze

- **HOT (nový článek):** **ARTICLE‑WRITE →
  `clanek-ja-heroes-workforce-2026.html`** (slot 2026‑07‑11).
  Téma: jak Česko poprvé staví strojový rámec pro plánování
  zdravotnického personálu, co dal projekt JA HEROES a co stále chybí.
- **WARM (revize existujícího článku):** žádný akutní (`clanek-pracovni-sila.html`
  draft čeká na dopracování v jiné iteraci — má jiný úhel; doplnění
  o JA HEROES v rámci revize by bylo legitimní, ale méně value než
  samostatný nový článek).
- **COLD / FALLBACK‑AUDIT:** netřeba, máme čistý HOT trigger.

## Routing rozhodnutí

ARTICLE‑WRITE → `clanek-ja-heroes-workforce-2026.html` slot
**2026‑07‑11**. Viz `routing-2026-05-30.md`.
