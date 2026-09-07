# Evidence-audit: ověření článků a indikátorů proti recenzované literatuře (PubMed + Consensus)

> **Orchestrovaný úkol.** Sonnet hledá a třídí, Opus rozhoduje sporné případy a zapisuje,
> hlavní session (Fable/Opus) jen řídí, commituje a otevírá PR. Běží **po dávkách**
> (default 12 článků + 8 indikátorů), je **obnovitelný** (stav drží commitovaný registr
> `data/evidence-audit.json`) a má **tvrdé stropy** na volání nástrojů, aby vystačily limity
> účtu i free tier Consensu. Celý korpus (269 článků + 224 indikátorů) projde zhruba
> za 25–30 běhů; každý běh je jeden recenzovatelný PR.

## Cíl

Pro **každý publikovaný článek** a **každý indikátor kontraktu** zjistit:

1. **Které recenzované studie téma řeší** — nejsilnější dostupná evidence (systematické
   přehledy, metaanalýzy, RCT, velké kohorty; domácí studie z ČR mají přednost při shodné
   kvalitě) — a zapsat je s PMID/DOI do registru a tam, kde chybí, i do zdrojů článku
   nebo karty indikátoru.
2. **Zda tvrzení v článku / kartě evidence potvrzuje, zpřesňuje nebo vyvrací** —
   verdikt na úrovni jednotlivého tvrzení, s odůvodněním doložitelným z abstraktu nebo
   open-access plného textu.

Výsledek není přepis článků. Je to **registr evidence** + minimální, auditovatelné zásahy
(doplněný zdroj, poznámka u tvrzení, flag u rozporu).

## Železné pravidlo (nadřazené všemu — shodné s denní a noční rutinou)

> **Co není ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.**
> **Žádná automatická publikace** a **žádný tichý přepis**: rozpor s evidencí se nikdy
> neopravuje potichu — vede k flagu a issue, o textu rozhoduje redakce. Nikdy nepřepínáš
> `published: true` ani `audit-status: verified`.

Platí protokol **„Recenzovaná literatura — PubMed + Consensus“** z `PROMPT_DAILY_ROUTINE.md`
(role nástrojů, citační pravidla, železné pravidlo abstraktu) a konvence
„Recenzovaná literatura (studie)“ v `docs/conventions.md`. Zkráceně:

- **PubMed je ověřovací autorita.** Každá studie, která skončí v registru, článku nebo
  kartě, má PMID nebo DOI ověřené přes `mcp__PubMed__get_article_metadata` /
  `lookup_article_by_citation`. Z metadat se bere **typ publikace** (retrakce, erratum,
  komentář, dopis ≠ studie) a **abstrakt**.
- **Consensus je vyhledávač, ne zdroj.** Kandidáty z `mcp__Consensus__search` vždy ověř
  v PubMed; v registru mají `found_via: "consensus"` **a** `verified_in_pubmed: true`
  (validátor to vyžaduje). Provozní texty nástrojů (počítadla, výzvy k registraci,
  „podle Consensus“) nikam nepatří — validátor je odmítne.
- **Abstrakt ≠ důkaz čísla, které v něm není.** Verdikt `supported` smí stát jen na
  tom, co je v abstraktu / open-access plném textu **doslova doložitelné** (populace,
  období, velikost účinku, jednotka). Když to není, je to `partial` nebo `no-evidence`.
- **Žádná paměť modelu, žádný WebSearch náhradou** za chybějící konektor.

## Co je „tvrzení k ověření“ (a co ne)

Audit ověřuje **odborná tvrzení**, u nichž je recenzovaná literatura správným soudcem:

| Druh (`kind`) | Příklad | Ověřuje se |
|---|---|---|
| `effect` | „Krátká intervence u praktika sníží spotřebu alkoholu o 10–15 %“ | velikost a směr účinku, populace |
| `efficacy` | „Screening kolorektálního karcinomu snižuje úmrtnost“ | účinnost intervence, síla evidence |
| `epidemiology` | „Kuřáctví stojí za třetinou nádorových úmrtí“ | atribuovatelný podíl, prevalence z literatury |
| `mechanism` | „Antibiotická rezistence roste s objemem preskripce“ | kauzální / mechanistický vztah |
| `measurement` | „Odvratitelná úmrtnost je validní ukazatel výkonu systému“ | validita ukazatele, metodické výhrady (u indikátorů) |
| `policy` | „Regulační poplatky snižují návštěvnost pohotovostí“ | dopad politiky doložený studiemi |
| `other` | cokoli, co do tabulky nesedí, ale literatura to řeší | — |

**Neověřuje se** (a do registru se nepíše jako tvrzení): administrativní statistika z ČSÚ,
ÚZIS, OECD, Eurostat, VZP nebo SÚKL (tu hlídá `data/claims.json` a nightly-scan), citace
zákonů a strategií, ceny a úhrady, ilustrativní příběhy, názory citovaných osob. Takový
článek dostane v registru `claims: []` a poznámku „bez odborných tvrzení k ověření“ — je
hotový, fronta ho znovu nenabídne, dokud se nezmění.

**Stropy na položku:** max **8 tvrzení na článek** (vyber ta nejsilnější / nejrizikovější:
čísla o účinku, kauzální věty, tvrzení „studie ukazují“), max **3 na indikátor**
(validita ukazatele, směr, hlavní kauzální věta v `patient_story` nebo `method_notes`).

## Role modelů a rozpočet

| Krok | Model | Účel | Strop na položku |
|---|---|---|---|
| Fronta a dávka | skript (`scripts/evidence-audit-queue.js`) | deterministický výběr, žádné tokeny | — |
| Rešerše | **Sonnet** (effort medium) | extrakce tvrzení, PubMed/Consensus, předběžný verdikt | ≤ 6 volání PubMed, ≤ 2 volání Consensus |
| Adjudikace | **Opus** (effort high) | jen položky s `contradicted`, `unclear`, `partial` nebo s návrhem zásahu do textu | ≤ 3 dodatečná volání PubMed (plný text, related) |
| Zápis | **Opus** u zásahů do obsahu, **Sonnet** u čistě registrového zápisu | registr, zdroje, claims, karta, flag, issue | 0 volání nástrojů literatury |
| Kontrola | **Sonnet** (effort low) | validátory + testy; při chybě 1 oprava Opusem | — |
| Orchestrace, commit, PR | hlavní session | řízení, git, PR, souhrn redakci | — |

**Proč tak:** rešerše je objemová práce s jasným protokolem — tam stačí Sonnet. Opus se
volá jen tam, kde jde o úsudek (rozpor, nejistota, zásah do textu), typicky u 20–40 %
položek. Consensus má free-tier počítadlo, proto max 2 dotazy na položku a jen tam, kde
PubMed nedal nic nebo jen jednu studii. Při rate-limitu (429) jednou počkej 30 s, pak
krok přeskoč a poznamenej `consensus: rate-limited` do `notes`.

**Rozpočet běhu (default):** 12 článků + 8 indikátorů → 20 rešeršních agentů (Sonnet),
odhadem 4–8 adjudikací (Opus), 20 zápisů (většina Sonnet), 1–2 kontroly. Přizpůsob
argumenty `articles` / `indicators` aktuálnímu limitu; menší dávka je vždy správná
volba, vynechaná položka zůstane ve frontě.

## Verdikty

| Verdikt | Kdy | Důsledek |
|---|---|---|
| `supported` | Nejsilnější dostupná evidence tvrzení potvrzuje včetně směru a řádu velikosti | doplnit zdroj (PMID/DOI), pokud chybí; `source_note` u claims |
| `partial` | Evidence potvrzuje směr, ale ne rozsah / populaci / číslo; nebo je smíšená | doplnit zdroj + `note` s výhradou; **prose beze změny**, jen audit poznámka; Opus může navrhnout jednu upřesňující větu → `review-pending` (i když článek byl `partial`) |
| `contradicted` | Převaha kvalitní evidence říká opak, nebo citovaná studie je retrahovaná / neexistuje | **flag + issue**, text beze změny; `audit-status` → `partial` (pokud byl `verified` nebo `review-pending`) |
| `no-evidence` | Hledáno podle protokolu, nic relevantního (ani pro, ani proti) | jen registr; `note` s použitými dotazy |
| `not-applicable` | Tvrzení není odborné (viz výše) — vyřazeno až při rešerši | jen registr |
| `unclear` | Sonnet nedokáže rozhodnout → povinná adjudikace Opusem; v registru zůstane jen výjimečně (s `note`) | adjudikace; když ani Opus nerozhodne → `note` + audit poznámka „k posouzení redakcí“ |

Každý verdikt nese `confidence` (`high` / `medium` / `low`) a `note` (u `partial`,
`contradicted`, `unclear` povinnou — validátor).

## Co smí audit měnit (a co ne)

**Smí (bez schválení redakce):**

- `data/evidence-audit.json` — záznam položky (vždy).
- Článek — sekce `article-sources`: nová skupina `<h5 class="sources-group-h">Recenzovaná
  literatura</h5>` (pokud chybí) a položky ve tvaru
  `<li><strong>Autor A, Autor B et al. Název. Časopis. Rok;roč(č):strany.</strong> — k čemu v textu (věta/číslo). <a href="https://doi.org/…" target="_blank" rel="noopener">DOI ↗</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/{PMID}/" target="_blank" rel="noopener">PMID {PMID} ↗</a> — ověřeno v PubMed {datum}.</li>`
  Jen pro `supported` / `partial`, jen když článek stejnou studii ještě necituje.
- Článek — hlavička `audit:` (HTML komentář) a `data/articles.json` → `audit.notes`:
  připojit větu `evidence-audit {datum}: {n} tvrzení, {verdikty}; viz data/evidence-audit.json`.
  `audit.last_reviewed` se **nemění** (to je redakční revize, ne strojová).
- `data/claims.json` — u **existujícího** tvrzení téhož článku, jehož `quote` odpovídá
  ověřované větě: `source_note` doplnit o `PMID:… / DOI:…, ověřeno {datum}`. Nové záznamy
  claims audit **nezakládá** (registr claims má vlastní pravidla a quote-verifikaci).
- Karta indikátoru `indicators/{id}.json` — pole `literature` (pole objektů
  `{pmid, doi, title, year, journal, study_type, note, verified_at}`); u `measurement`
  verdiktu lze doplnit jednu větu do `limitations` (jen Opus, jen s citací).
- `audit-status` → `partial` u `contradicted` (viditelný banner „částečně ověřeno“ je
  férová informace čtenáři). Nikdy `flagged` u publikovaného článku (validátor by ho
  stáhl z publikace — to je rozhodnutí redakce, ne auditu).
- GitHub issue u každého `contradicted` (label `evidence-audit`): slug, tvrzení, studie
  pro a proti (PMID/DOI), návrh formulace. Když GitHub nástroj chybí, issue založí
  hlavní session ze souhrnu workflow.

**Nesmí:**

- Přepisovat prose, měnit čísla, mazat věty. Jediná výjimka: Opus u `partial` smí
  přidat **jednu** upřesňující větu s citací, a to jen když je rozsah tvrzení očividně
  širší než evidence; článek pak jde **vždy** do `review-pending` (`audit-status`
  v `articles.json`, `audit.status` i `<meta name="article:audit-status">`), i když byl
  předtím `partial` — nově vložená lékařská formulace čeká na schválení redakce.
- Zakládat nové články, nové claims, nové indikátory.
- Sahat na generované artefakty (`data/search-index.json`, `data/diagnoza-index.json`,
  `data/souvislosti.json`, `src/styles.min.css`).
- Měnit `published`, `date`, `number`, `audit.last_reviewed`, `audit-status: verified`.

## Průběh

### FÁZE 0 — Příprava (hlavní session)

```bash
cd 05_M1_Starter
git checkout main && git pull origin main
git checkout -b claude/evidence-audit-$(date -u +%Y-%m-%d)
npm run evidence:queue -- --status                     # kolik čeká / zastaralo / hotovo
npm run evidence:queue -- --batch --articles 12 --indicators 8 > reports/evidence-batch.json
```

Ověř, že v seznamu nástrojů jsou `mcp__PubMed__*` (nutné) a `mcp__Consensus__*`
(doporučené). **Bez PubMed audit neběží** — zapiš to do reportu a skonči; s PubMed bez
Consensu běží s `tools.consensus: false` v každém záznamu.

Identifikátor běhu: `run_id = ea-RRRR-MM-DD-NN` (NN = pořadí běhu v den). Datum běhu
předej agentům explicitně (workflow skripty nesmí volat `Date`).

### FÁZE 1 — Fronta a dávka (skript, 0 tokenů)

`scripts/evidence-audit-queue.js` projde `data/articles.json` (jen viditelné: `published`
≠ false, `date` ≤ dnes), `data/indicators.json` + karty, `data/claims.json` a registr.
Priorita: odkazy na studie, zmínky o studiích, ručně ověřovaná tvrzení, HSPA indikátory
s mnoha navázanými články a bez literatury v kartě. Stav `pending` → `stale` → `done`
(`content_hash` = sha1 souboru; změněný obsah = položka se vrací do fronty). Dávka bere
nejdřív `pending`, pak `stale`, nikdy `done`.

### FÁZE 2 — Rešerše (Sonnet, jedna položka = jeden agent)

Pro článek:

1. Přečti `clanek-{slug}.html` (text, `article-sources`, `audit:` komentář) a tvrzení
   téhož článku v `data/claims.json` (`check: manual` / `relation: external` jsou
   kandidáti).
2. Vyber max 8 odborných tvrzení podle tabulky výše. Ke každému zapiš doslovnou větu
   (`text`), umístění (`location`: nadpis sekce / perex / databox) a případný `claim_id`.
3. Pokud článek studii **už cituje** (DOI/PMID v textu nebo ve zdrojích): ověř ji přes
   `get_article_metadata` (PMID) nebo `lookup_article_by_citation` — existuje, není
   retrahovaná, tvrzení je v abstraktu. `found_via: "article"`.
4. Jinak hledej: `search_articles` s anglickým dotazem v PubMed syntaxi, nejdřív filtry
   na sílu evidence (`systematic[sb]`, `"meta-analysis"[pt]`, `randomized controlled trial[pt]`),
   pak bez nich; při tématu ČR přidej `("Czech Republic"[Title/Abstract] OR Czechia[Title/Abstract] OR Czech[Affiliation])`.
   Max 6 volání PubMed na položku včetně metadat. Consensus (`search`, `medical_mode: true`,
   `exclude_preprints: true`) jen když PubMed nedal nic nebo jedinou studii; max 2 dotazy;
   každý použitý kandidát ověř v PubMed.
5. Verdikt + `confidence` + `note` (co přesně abstrakt říká, čím se liší). Do `evidence`
   jen studie, které jsi ověřil(a): `pmid`, `doi`, `title`, `year`, `journal`,
   `study_type`, `found_via`, `relation` (`supports` / `partial` / `contradicts` /
   `context`), `verified_in_pubmed`.
6. Nic needituj. Vrať strukturovaný výsledek (schéma níže) + `calls` (kolik volání
   PubMed/Consensus) + `tools` (co bylo dostupné).

Pro indikátor: přečti kartu `indicators/{id}.json` a záznam v kontraktu; tvrzení jsou
(a) validita ukazatele jako míry výkonu systému (`measurement`), (b) kauzální věty
v `patient_story` / `method_notes` / `limitations`, (c) směr (`direction`) a prahy, když
karta tvrdí, že vycházejí z literatury. Max 3 tvrzení. Hledej přednostně metodické práce
OECD/WHO/Eurostat indexované v PubMed, systematické přehledy a domácí studie.

### FÁZE 3 — Adjudikace (Opus, jen sporné položky)

Spouští se, když rešerše vrátí aspoň jedno tvrzení `contradicted`, `unclear`, `partial`,
nebo `supported` s `confidence: low`. Opus dostane výstup rešerše, znovu přečte tvrzení
v kontextu článku/karty, abstrakty dohledaných studií (u open-access `get_full_text_article`,
případně `find_related_articles`; max 3 volání) a rozhodne **finální verdikt** každého
tvrzení + **navržené akce** (`source-added` / `claim-note` / `card-note` / `flagged` /
`issue` / `none`) včetně přesného textu položky do zdrojů a případné jedné upřesňující
věty. Rozhodovací pravidla:

- Jedna studie proti tvrzení ≠ `contradicted`; `contradicted` vyžaduje převahu kvalitní
  evidence (přehled/metaanalýza, nebo ≥ 2 nezávislé studie bez kvalitního protikladu)
  nebo retrakci / neexistenci citované studie.
- Tvrzení s číslem, které abstrakt neobsahuje → nejvýš `partial`.
- Tvrzení o ČR opřené jen o zahraniční evidenci → `partial` s poznámkou o přenositelnosti,
  ne `contradicted`.
- Když ani po plném textu nelze rozhodnout → `unclear` + `note` „k posouzení redakcí“.

### FÁZE 4 — Zápis (sériově, jedna položka po druhé)

Zápis běží **sériově** (jeden agent po druhém), protože všechny položky sahají do týchž
souborů (`data/evidence-audit.json`, `data/claims.json`, `data/articles.json`). Agent:

1. Aplikuje akce z adjudikace (nebo z rešerše, když adjudikace nebyla potřeba) přesně
   podle oddílu „Co smí audit měnit“.
2. Spočítá `content_hash` **až po svých úpravách**:
   `node scripts/evidence-audit-queue.js --hash clanek-{slug}.html` (u indikátoru cesta karty).
3. Zapíše záznam do `data/evidence-audit.json` (`items`, existující `id` nahradí) a
   aktualizuje `generated_at`. Co zůstalo **neověřeno** (vyčerpaný strop volání, tvrzení
   vynechané z rozpočtu, citace bez DOI), zapíše do pole `followup` — fronta pak položku
   vrátí jako `stale` v příštím běhu. Bez `followup` platí položka za dokončenou; spoléhat
   na to, že „se změnil hash“, nelze (hash se počítá až po úpravách).
4. Vrátí seznam změněných souborů a provedených akcí.

Registrový záznam:

```json
{
  "id": "clanek-kratke-intervence-uhrady.html",
  "type": "article",
  "checked_at": "2026-09-08",
  "run_id": "ea-2026-09-08-01",
  "content_hash": "…sha1 po úpravách…",
  "tools": { "pubmed": true, "consensus": true },
  "models": { "search": "sonnet", "adjudicate": "opus", "write": "opus" },
  "calls": { "pubmed": 5, "consensus": 1 },
  "claims": [
    {
      "claim_id": "kratke-intervence-uhrady--03",
      "text": "Krátká intervence u praktického lékaře snižuje rizikové pití o 10–15 %.",
      "location": "sekce „Co říká evidence“",
      "kind": "effect",
      "verdict": "partial",
      "confidence": "medium",
      "evidence": [
        { "pmid": "29476653", "doi": "10.1002/14651858.CD004148.pub4", "title": "Effectiveness of brief alcohol interventions in primary care populations", "year": 2018, "journal": "Cochrane Database Syst Rev", "study_type": "systematic review", "found_via": "pubmed", "relation": "partial", "verified_in_pubmed": true }
      ],
      "note": "Cochrane 2018 potvrzuje snížení spotřeby (−20 g/týden), procento v článku z abstraktu neplyne."
    }
  ],
  "summary": { "supported": 0, "partial": 1, "contradicted": 0, "no_evidence": 0, "not_applicable": 0, "unclear": 0 },
  "actions": [
    { "type": "source-added", "detail": "Kaner 2018 do article-sources (Recenzovaná literatura)" },
    { "type": "claim-note", "detail": "source_note u kratke-intervence-uhrady--03", "ref": "kratke-intervence-uhrady--03" }
  ],
  "followup": "claim --07 (relaps po 12 měsících) neověřen — strop volání",
  "notes": ""
}
```

Pole `summary` musí sedět na počty verdiktů (chybějící klíč = 0). `contradicted` bez
akce `flagged` / `issue` validátor odmítne.

**Poznámka v `audit.notes` / `audit:` komentáři uvádí jen skutečně auditovaná tvrzení**
(počet a verdikty přesně podle registru); tvrzení vyřazená jako administrativní se
nepočítají mezi ověřená.

### FÁZE 5 — Kontrola, report, PR (hlavní session)

```bash
npm run validate:evidence && npm run validate:claims && npm run validate:articles && npm run validate:data
node --test tests/evidence-audit.test.js tests/nightly-scan.test.js tests/published-articles-indexable.test.js
npm run evidence:queue -- --status
```

Report `reports/evidence-audit-RRRR-MM-DD.md` (gitignored, do PR jde jeho obsah):
tabulka položek (id · tvrzení · S/P/C/N verdikty · akce · model), seznam `contradicted`
s odkazy na issues, počty volání nástrojů, co bylo přeskočeno (rate-limit, chybějící
konektor, agent bez výsledku) a stav fronty po běhu.

Commit a PR:

```
chore(evidence): audit dávka RRRR-MM-DD — 12 článků, 8 indikátorů (S 31 · P 9 · C 1 · N 6)
```

Tělo PR: Souhrn · Změny (tabulka položek) · Rozpory (issues) · Verifikace (validátory,
testy) · Test plan · trailer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
Do PR **nepatří** generované artefakty (viz CLAUDE.md). Nikdy direct push do `main`.

## Když konektor chybí

- `mcp__PubMed__*` chybí → audit se **nespouští**. Do reportu / odpovědi: „PubMed nedostupný
  — evidence-audit přeskočen“. Žádný WebSearch, žádná paměť.
- `mcp__Consensus__*` chybí → běží jen PubMed; každý záznam má `tools.consensus: false`,
  report to uvede. Redakce konektor doplní v Routines.
- GitHub nástroje chybí → `contradicted` dostane jen `flagged`; seznam pro issues je
  v reportu a hlavní session je založí, jakmile může.

## Jak spustit

**A. Workflow (doporučeno — „velká orchestrace“).** V session Claude Code s připojeným
PubMed (+ Consensus) požádej:

> Spusť workflow `evidence-audit` s argumenty
> `{"today": "RRRR-MM-DD", "run_id": "ea-RRRR-MM-DD-01", "articles": 12, "indicators": 8}`.

Skript `.claude/workflows/evidence-audit.js` provede FÁZE 1–4 (Sonnet rešerše →
Opus adjudikace → sériový zápis → kontrola) a vrátí souhrn; hlavní session dodělá
FÁZI 5 (report, commit, push, PR, issues). Přerušený běh se obnoví
`resumeFromRunId` — hotové agenty se neplatí znovu.

**B. Routine (bez zásahu redakce).** Prompt Routine (kadence např. `0 2 * * 1,4`,
konektory PubMed + Consensus + GitHub):

> Přečti `05_M1_Starter/PROMPT_EVIDENCE_AUDIT.md` a proveď jeden běh evidence-auditu:
> FÁZE 0 (větev, fronta), pak spusť workflow `evidence-audit` s dnešním datem
> (`today`, `run_id` = `ea-<datum>-01`, `articles` 12, `indicators` 8); po návratu
> FÁZE 5 — report, commit, push, PR, issues pro `contradicted`. Když Workflow není
> k dispozici, proveď fáze 2–4 přes Agent tool: rešerši modelem Sonnet, adjudikaci
> a zápis modelem Opus, sériově. Bez PubMed skonči s hlášením. Nikdy nepublikuj,
> nikdy nepřepisuj text, rozpor = flag + issue.

**C. Ručně po částech.** Bez orchestrace: `npm run evidence:queue -- --batch --articles 3
--indicators 1`, pak pro každou položku FÁZE 2–4 v jedné session (Sonnet přes Agent tool
na rešerši, Opus na zápis) — vhodné pro první zkušební dávku.

## Pojistky (hard limits)

- Max **20 položek** na běh (12 + 8) bez výslovného navýšení redakcí; Consensus max
  **2 dotazy na položku**, PubMed max **6 (+3 při adjudikaci)**.
- **Nikdy** `published`, `verified`, `flagged` u publikovaného článku, prose přepis,
  nové claims, generované artefakty.
- Studie bez PMID/DOI ověřeného v PubMed nikam nepatří; preprint se označí `study_type:
  "preprint"` a nikdy nenese `supported` sám.
- Při nejistotě o rozsahu zásahu → `unclear` + poznámka, ne akce.
- Když v běhu selže víc než polovina agentů (null výsledky), běh se ukončí, nic se
  necommituje, report vysvětlí proč.

## Cíl

Po dokončení všech běhů: každý článek a indikátor má v registru seznam studií, které
jeho téma řeší, každé odborné tvrzení nese verdikt a dohledatelnou evidenci, rozpory jsou
u redakce jako issues a čtenář vidí u tvrzení ze studií odkaz na PMID/DOI. Fronta pak
přirozeně hlídá jen to, co se změnilo (`stale`).
