# Plán práce — Zdravé Česko / HSPA Dashboard

> **Verze 2 · 2026-07-09** (v1 z 2026-07-06 v git historii). Jeden vstupní dokument
> pro další vývoj: stav původní sady U1–U30, nová vlajková loď **Barometr
> politických prohlášení** (BAR1–BAR12) a konsolidovaný zbytek práce (F-série).
> Každý otevřený úkol má prompt ke zkopírování do Claude Code session.
> Priority: 🔴 kritické · 🟠 důležité · 🟡 rozvoj · ⚪ vize.
>
> **📌 Stav k 2026-07-10 (PR #761/#764/#765):** HOTOVO — celý **Barometr** (BAR1–BAR12) ·
> **F2** (2 flagged) · **F3** (skener) · **F5** (zdokumentováno, pipeline-blok) ·
> **F6** (screening karty) · **F7** (výhled 2027–2029) · **F8** (docs+glosář) ·
> **U24** (a11y WCAG 2.2) · **U27** (storytelling) · **U28** (dark mode, PR #765) ·
> **U21** (manifest — hero/„Proč reforma"/countery/data cards už existují; autorský
> politický text) · **SÚKL migrace** sukl.cz→sukl.gov.cz (PR #764) ·
> **F1: link-audit 100 % CELÉHO publikovaného korpusu** (review-pending
> i partial; 6 paralelních subagentů + ruční dohledávka; ~38 mrtvých odkazů opraveno,
> gov/anti-bot false-positives podchyceny). **Kritický nález:** 3 publikované články
> (cmp-iktova-centra, cekaci-doby-kycel, platba-za-vysledek-vzp) měly neuzavřený
> `<!-- audit:` komentář → renderovaly se prázdné; opraveno. **verified 116 ·
> review-pending 21 · partial 15**; všech 21 review-pending + 15 partial má F1 marker
> a zůstává v daném stavu z doložených důvodů (seed indikátor → F4, nebo redakční bod).
> ZBÝVÁ (obojí blokované na prostředí, ne na agentech): **F4** (seed→live → noční
> ingest, sandbox zakazuje transform; odblokuje většinu zbylých 21 review-pending) ·
> **U22** (Duškův brief, blok na datový sourcing PUK/ÚZIS). Vše ostatní z v2 hotovo.

---

## 0. Stav původní sady U1–U30 (z v1, 6. 7. 2026)

**Hotovo (PR #740, #741, #746–#748, #759):** U1 freshness gate + smoke log ·
U2 ga4 race · U3 screening drift MOÚ · U4 OECD fetcher retire · U6 audit 18
článků · U7 úklid stale poznámek · U9 explainery · U10 dokumentace · U11 test
konzistence origin · U12 legislativní odkazy (100 URL) · U13 nightly-scan CI ·
U14 návod na plánovač (docs/scheduled-sessions.md) · U16 diagnóza newsletteru
(běží, 1. kampaň 10. 7.) · U17 článek Peníze ve zdravotnictví · U18 Legislativní
radar + **plán MZ a jeho plnění** · U19 článek K-Index nemocnic · U20 Hlídač
do rutin · U25 statické indikátorové odkazy · U26 rubriky + pinned essentials.

**Mimo plán navíc:** oprava publikační fronty (drafty jdou ven automaticky,
PR #759) · drift-revize 41 nálezů (6 oprav, 35 doložených falešných poplachů) ·
submenu Strategie · publikace 6 článků · uvozující hlavičky sekcí legislativy.

**Otevřené z v1:** U5 (→ F4), U8 (→ F1), U15/U21–U24/U27–U30 (→ sekce 3),
blokace na vlastníka (→ sekce 4).

---

## 1. 🚩 Barometr politických prohlášení (BAR1–BAR12)

### Koncept

Web je samo-verifikující se korpus (1 377 tvrzení v claims.json, 162 indikátorů
s benchmarky, kauzální model systému, sledování plnění legislativního plánu).
Barometr tu infrastrukturu otáčí ven: **drží politiku za slovo daty, která už
měříme.** Tři části:

1. **Závazky** — programové prohlášení vlády + sliby ministra přeložené na
   falzifikovatelné checkpointy: verbatim citace → interpretace → indikátor(y)
   s baseline hodnotou k datu slibu → legislativní kroky → stav.
2. **Ověřovna** — jednotlivé výroky politiků o zdravotnictví konfrontované
   s indikátory a primárními zdroji (verdikt: sedí s daty / nesedí / zavádějící
   kontext / neověřitelné).
3. **Souvislosti** — sdílená vrstva (ne jen pro Barometr): build-time znalostní
   graf propojující indikátory × kauzální model × legislativu × články × claims
   × závazky. Každá stránka indikátoru dostane blok „souvislosti": co ho
   ovlivňuje, jaká legislativa běží, jaké sliby na něj míří, kde se o něm píše.

**Étos:** žádné predikce, žádné hádání. Stavy se počítají z dat (plní se /
bez pohybu / opačný směr / **nemá měřitelný obsah** / splněno). Metodika
veřejná, citace verbatim, baseline zamrazená k datu slibu.

### Úkoly

#### BAR1 · Metodika (fable) 🔴 — jde první, definuje pravidla hry

> **Prompt:** V repu hspa: napiš `docs/metodika-barometr.md` — metodiku
> Barometru politických prohlášení. Obsah: (1) definice závazku (verbatim
> citace + zdroj + datum) vs. interpretace (náš falzifikovatelný checkpoint —
> vždy oddělené, interpretaci lze rozporovat); (2) taxonomie stavů závazků:
> plní se / bez pohybu / opačný směr / splněno / nemá měřitelný obsah — přesná
> rozhodovací pravidla z indikátorových dat (směr trendu od baseline, minimální
> délka pozorování, co dělat s ročními daty); (3) taxonomie verdiktů Ověřovny:
> sedí s daty / nesedí / zavádějící kontext / neověřitelné + pravidla férovosti
> (citovat celý výrok, steel-man výklad, kontext data výroku vs. data
> dostupná v té době); (4) zásady: žádné motivy, žádné predikce, právo na
> odpověď (kontakt), oprava = viditelný changelog. Vyjdi z étosu
> docs/conventions.md a vzoru plnění legislativního plánu (data/legislativa.json).

#### BAR2 · Schéma + validátor (opus) 🔴

> **Prompt:** V repu hspa: nový dataset `data/barometr.json` podle
> docs/metodika-barometr.md. Schéma: `meta` (zdroj programového prohlášení,
> datum vlády, changelog[]); `commitments[]`: id, citace_verbatim, zdroj
> {nazev,url,datum}, oblast, interpretace, linked_indicators [{id,
> baseline_value, baseline_year, direction_wanted}], legislativa_ids[] (FK na
> data/legislativa.json), stav (enum dle metodiky), stav_duvod (věcné
> zdůvodnění s čísly), stav_od, historie[]; `statements[]` (Ověřovna): id,
> vyrok_verbatim, kdo, funkce, kdy, kde {nazev,url}, verdikt (enum), verdikt_
> zduvodneni, linked_indicators[], zdroje[]. Validátor
> `ingest/validate-barometr.js` (enumy, FK na indikátory i legislativu,
> verbatim citace nesmí být prázdná, baseline povinná u měřitelných), zapoj do
> validate:all, testy, fixture položka. Do reportu přesnou JSON ukázku obou
> typů položek.

#### BAR3 · Závazky — pilotní extrakce (fable) 🔴

> **Prompt:** V repu hspa: naplň `data/barometr.json` (schéma viz validátor +
> report BAR2) pilotní sadou 8–12 závazků. Zdroj: programové prohlášení vlády
> (kapitola zdravotnictví) — najdi aktuální znění na vlada.gov.cz (WebSearch/
> WebFetch/curl), verbatim citace. Ke každému závazku: interpretace-checkpoint
> dle docs/metodika-barometr.md, namapuj indikátory z data/indicators.json
> (baseline = hodnota a rok v době slibu — z trend pole), legislativa_ids
> z data/legislativa.json, výchozí stav dle pravidel. Závazky bez měřitelného
> obsahu označ poctivě „nemá měřitelný obsah" — to je legitimní a cenný nález.
> NEHÁDAT: co nejde doložit, do reportu. validate:all.

#### BAR4 · Ověřovna — pilotní výroky (fable) 🟠

> **Prompt:** V repu hspa: naplň sekci `statements` v data/barometr.json 5–8
> výroky politiků o zdravotnictví z posledních ~3 měsíců. Zdroje: tiskovky MZ
> (mzd.gov.cz), vyjádření v médiích (WebSearch), případně Hlídač státu MCP.
> Verbatim výrok + kdo/kdy/kde s URL. Verdikt dle metodiky konfrontací
> s data/indicators.json a claims.json — verdikt_zduvodneni musí citovat
> konkrétní čísla se zdrojem. Steel-man: pokud výrok jde číst benevolentně,
> čti ho tak. validate:all.

#### BAR5 · Adversarial fact-check (fable) 🔴

> **Prompt:** V repu hspa: nezávisle zkontroluj data/barometr.json (vytvořili
> jiní agenti — nevěř, ověřuj): (1) každou verbatim citaci dohledej v primárním
> zdroji (musí být doslovná), (2) každou baseline proti data/indicators.json
> trend polím, (3) každý stav/verdikt přepočítej podle docs/metodika-barometr.md
> — hledej místa, kde by MZ mohlo oprávněně protestovat (nefér interpretace,
> ignorovaný kontext), (4) FK integrity. Opravy proveď, sporné do reportu.

#### BAR6 · Souvislosti engine (opus) 🟠 — sdílená vrstva

> **Prompt:** V repu hspa: build-time generátor `scripts/build-souvislosti.js`
> → `data/souvislosti.json`: pro každý indikátor posbírej vazby napříč
> datasety: (a) uzly/hrany z data/system-model.json, kde indikátor figuruje
> (co ho ovlivňuje / co ovlivňuje on / které páky na něj míří), (b) položky
> data/legislativa.json (items i plan_items) s vazbou na indikátor, (c) články
> z data/articles.json přes linked_indicators, (d) tvrzení z data/claims.json,
> (e) závazky/výroky z data/barometr.json. Výstup: mapa indicator_id → typované
> seznamy vazeb. Deterministický, spouštěný v refresh pipeline (zaregistruj do
> package.json + refresh.yml po transformu), testy (mj. že build je idempotentní
> a nevytváří mrtvé FK). Žádné UI — to je BAR7.

#### BAR7 · Souvislosti UI na indikátorech (opus) 🟡

> **Prompt:** V repu hspa: blok „Souvislosti" na detailu indikátoru
> (src/indicator.js + statické indikator-*.html přes seo:indicators generátor):
> z data/souvislosti.json vykresli sekce „Co na něj působí" (páky/uzly modelu,
> odkaz na model-systemu.html), „Legislativa v běhu", „Sliby, které na něj míří"
> (odkaz na barometr.html), „Píšeme o tom". Prázdné sekce se nevykreslují.
> CSS .suv-* namespace, build:css, testy renderingu, vizuální kontrola.

#### BAR8 · Stránka Barometr (opus) 🔴

> **Prompt:** V repu hspa: nová stránka `barometr.html` + `src/barometr.js`
> podle vzoru legislativa.html (hero, části s uvozujícími hlavičkami):
> (1) hero s countery stavů závazků, (2) část Závazky — karty/tabulka: verbatim
> citace, interpretace, baseline → aktuální hodnota indikátoru (živě z
> data/indicators.json), stav badge + zdůvodnění, odkazy (indikátor,
> legislativa), filtr stavů, (3) část Ověřovna — výroky s verdikty a
> zdůvodněním, (4) box Metodika s odkazem na docs/metodika-barometr.md +
> právo na odpověď. Menu: nová položka (rozhodni: samostatný tab, nebo pod
> Strategie k Legislativě — preferuj samostatný tab „Barometr", je to vlajková
> loď). CSS .bar-* namespace, build:css, testy, graceful bez dat.

#### BAR9 · Dokumentace (sonnet) 🟡

> **Prompt:** V repu hspa: zaeviduj Barometr: docs/data-model.md (schéma
> barometr.json + souvislosti.json), docs/site-architecture.md (barometr.html,
> blok Souvislosti), docs/quickref.md, llms.txt, sitemap (ověř generátor).
> Čti skutečný kód, nic nevymýšlej.

#### BAR10 · Rutiny — živá údržba (sonnet) 🟠

> **Prompt:** V repu hspa: rozšiř PROMPT_DAILY_ROUTINE.md o discovery výroků
> pro Ověřovnu (tiskovky MZ, vyjádření k zdravotnictví — kandidáty jen
> navrhnout jako draft záznam, verdikt vyžaduje plný postup metodiky) a
> PROMPT_NIGHTLY_ROUTINE.md o přepočet stavů závazků (nová data indikátorů →
> změna stavu dle metodiky → aktualizace stav_duvod + historie[]; posun
> legislativa_ids fází). Připomeň: změna stavu závazku je redakční událost —
> kandidát na článek/social post.

#### BAR11 · Verifikace + vizuální baseline (opus) 🔴

> **Prompt:** V repu hspa: závěrečná verifikace Barometru: validate:all, plný
> npm test, build:css kontrola, konzistence metodika ↔ validátor ↔ UI enumy,
> mrtvé FK, a11y rychlá kontrola nové stránky (axe přes test:a11y pokud
> existuje). Nová stránka = update visual baseline (workflow_dispatch
> visual-a11y s update_baseline po pushi — poznač do reportu pro orchestrátora).

#### BAR12 · Doprovodný článek (fable) 🟡

> **Prompt:** V repu hspa: draft článku „Představujeme Barometr: držíme
> politiku za slovo daty" — proč vznikl, jak čteme závazky (verbatim vs.
> interpretace), co znamená „nemá měřitelný obsah", právo na odpověď. Ukázky
> z pilotní sady. Standardní draft workflow (published:false — fronta ho vydá
> sama), AV komponenty, audit-status: draft.

**Fázování:** BAR1 → BAR2 → (BAR3 ∥ BAR6 ∥ BAR8*) → BAR4 → BAR5 → (BAR7 ∥ BAR9 ∥ BAR10 ∥ BAR12) → BAR11 → PR.
*BAR8 proti schématu z BAR2 + fixture, data dodá BAR3.

---

## 2. 🔁 Průběžná a navazující práce (F-série)

#### F1 · Audit publikovaných článků — pokračování U8 🟠 (fable, opakovatelné)

**81 článků** review-pending (49) / partial (32). Dávky po 8 → ~10 dávek.

> **Prompt:** V repu hspa: další dávka plných auditů dle vzoru U8
> (PLAN-PRACE.md v1): vezmi 8 nejstarších publikovaných review-pending/partial
> článků (bez těch s audit komentářem drift_review/plného auditu z posledních
> 14 dní), ověř čísla proti primárním zdrojům (WebFetch/PubMed), odkazy,
> linked_indicators. Výsledek verified, nebo konkrétní poznámka. Audit
> komentáře do HTML. validate:articles. Report: tabulka slug → výsledek.

#### F2 · Vyřešit 2 flagged články 🟠 (fable)

> **Prompt:** V repu hspa: clanek-screening-rakoviny-plic.html a
> clanek-deficit-vzp-2026.html mají audit-status flagged (drží je mimo
> publikační frontu). Najdi v audit komentářích a articles.json důvod flagu,
> ověř proti primárním zdrojům, oprav problém a přenastav na publikovatelný
> status — nebo flag potvrď s konkrétním zdůvodněním, co chybí k odblokování.

#### F3 · Ladění nočního skeneru 🟠 (sonnet)

35/41 driftů v poslední revizi byly falešné poplachy — dva doložené vzory.

> **Prompt:** V repu hspa: uprav scripts/nightly-scan.js (indicator-drift
> heuristiku): (1) ignoruj čtyřciferné roky v závorkách bezprostředně za
> odkazem na indikátor (atribuční vzor „MMR (2022), HPV (2023)"), (2) ignoruj
> odkazy v seznamech „Související indikátory" (ul article-list-bullets), kde
> text položky neobsahuje číslo s jednotkou. Regresní testy na oba vzory +
> na skutečný drift (nesmí přestat chytat). Cíl: šum ~41 → ~8 nálezů.

#### F4 · Verifikační dávky indikátorů — pokračování U5 🟠 (opus, opakovatelné)

103/162 seed (36,4 % live, gate 0.3). Síť na OECD SDMX/Eurostat/ČSÚ funguje.

> **Prompt:** V repu hspa: verifikační dávka dle
> 05_M1_Starter/PLAN-VERIFIKACE-INDIKATORU.md: 5–8 seed indikátorů se strojově
> dostupným zdrojem (Eurostat JSON-stat, OECD sdmx.oecd.org přes oecd_sdmx2,
> ČSÚ, SÚKL) → fetch+mapping+verification_status verified. NEHÁDAT. Pozor na
> pasti (traps.md, decisions-log). Po dávce: pokud live_ratio > 0.45, zvedni
> MIN_LIVE_RATIO v refresh.yml na 0.4.

#### F5 · 7 výjimek testu konzistence 🟡 (opus)

> **Prompt:** V repu hspa: tests/verification-origin-consistency.test.js má
> KNOWN_SEED_VERIFIED_EXCEPTIONS (7 indikátorů verified se seed origin —
> mj. perinatalni_umrtnost, konzumace_ovoce_zeleniny, prezit_karcinom_plic_5let).
> Část už možná má live fetcher z nočních běhů — ověř, oprav zbylé fetchery,
> zmenši seznam výjimek. Co opravit nejde, zdůvodni v komentáři testu.

#### F6 · Screening karty — sladit kohorty 🟡 (opus)

> **Prompt:** V repu hspa: follow-up U3: definice metodických karet
> screening_* deklarují kohorty (50–69/20–64/50–75), ale
> extractFromNrhzsScreening() agreguje všechny věkové skupiny. Rozhodni a
> proveď: buď (a) přidej věkový filtr do extraktoru a přepočítej na deklarované
> kohorty (hodnoty se změní — zkontroluj články, claims.json drift), nebo (b)
> uprav definition/name karet na skutečnost („cílová populace 45+/vše/50+").
> Preferuj (b) — menší zásah, žádná změna publikovaných čísel. Testy.

#### F7 · Výhled legislativních prací 2027–2029 🟡 (fable)

> **Prompt:** V repu hspa: rozšiř sekci plánu MZ na legislativa.html o výhled
> 2027–2029 (stejné usnesení vlády č. 175 — příloha č. 2, PDF na vlada.gov.cz).
> Vytěž MZd položky, přidej do data/legislativa.json (rozšíření schématu:
> plan_items s polem `horizont: "2026" | "vyhled-2027-29"` — uprav validátor +
> testy), UI: přepínač/oddíl Výhled v sekci plánu. Vzor a pravidla viz
> implementace plánu (PR #746). Fact-check proti PDF.

#### F8 · Dokumentační úklid 🟡 (sonnet)

> **Prompt:** V repu hspa: (1) docs/quickref.md — zastaralé počty testů
> (aktuálně ~679, ověř npm test); (2) CLAUDE.md odkazuje 05_M1_Starter/BACKLOG.md
> a STATUS_AUDIT — soubory jsou v kořeni repa, oprav cesty; (3) BACKLOG.md
> je z 31. 5. — projdi položky proti realitě (hodně vyřešeno v PR #740–#759)
> a aktualizuj stavy; (4) glosář: doplň pojem „kofein" (nález U7,
> clanek-napoje-3 na něj odkazuje). validate:all.

#### F9 · Hlídač státu fetcher (fáze 2) ⚪ (opus)

Pravidelný datový feed zdravotnických smluv do `data/` — až bude jasné, co
přesně Barometr/články potřebují opakovaně (nespěchá, MCP stačí pro ad-hoc).

---

## 3. 🟡 Větší feature vlny (čekají na prioritizaci/schválení)

| ID | Úkol | Rozsah | Stav |
|---|---|---|---|
| U21 | Manifest rozšíření fáze A–D (hero, „Proč reforma", countery, data cards) | L | ✅ hotovo — hero + `manifest-why` + 3 hero count-up cards + **Fáze D inline data cards u všech 7 priorit s indikátory** (P1/P2 doplněny 2026-07-10 dle Codex #766: P1 `platba_z_kapsy_pct`, P2 `spokojenost_informovani`; P4/5/8/10/13 už existovaly; P3/6/7/9/11/12 jsou kvalitativní bez indikátoru). `financovani_per_capita` (P1 návrh) v kontraktu neexistuje → nehádáno. Pozn.: manifest je **autorský politický text** (Pavlovic/Malíková/ČPS) — text needitovat, data cards jsou neutrální HSPA vrstva. |
| U22 | Duškův brief: 8 klinických indikátorů (sourcing PUK/ÚZIS) + 6 článků | L | ⛔ blok: datový sourcing PUK/ÚZIS (síť/pipeline), dělit na 2+ sessions |
| U23 | Série Reforma — zbytek: fact-check dílů před publikací (PROMs modul už vyšel) | S–M | připraveno |
| U24 | A11y: manuální WCAG 2.2 (target size 24px, dragging alternativa, focus) + blocking CI | M | ✅ hotovo (PR #761) |
| U27 | Storytelling: STRAT-STORY / IND-STORY / PREV-PERSONA (po jednom) | M–L | ✅ hotovo (PR #761) |
| U28 | Dark mode (~190 hex + 59 rgba + 25 inline) | L | ✅ hotovo (PR #765) — tokenový přepínač světlý/tmavý + toggle (desktop i mobil) + kontrast sweep |
| U29 | SVG interaktivní schéma pák | L | vize |
| U30 | P3: PROMs roadmap, AI query, gamifikace krajů, resilience indikátory | L | vize |

---

## 4. 🚫 Blokované na vlastníkovi (ne na agentech)

| Co | Akce vlastníka |
|---|---|
| U15 konsolidace social pipeline | rozhodnout: Notion+token workflow vs. Buffer MCP rutina |
| Plánovač rutin | nastavit scheduled sessions dle docs/scheduled-sessions.md |
| ÚZIS discovery (~30 indikátorů) | ruční browser discovery URL distribucí |
| ECDC HIV (hiv_nove_diagnozy) | measureId z devtools na atlas.ecdc.europa.eu |
| GA4 dokončení | service-account secret + Enhanced measurement v GA Admin |
| Spokojenost s péčí | Gallup mimo API — zůstává Ilustrativní |
| **Sledovat**: první auto-publikace fronty (cron 04:00 UTC po PR #759) | jen ověřit, že vyšlo `benzodiazepiny-seniori` s bannerem |

---

## 5. Doporučené pořadí

1. **Barometr sprint** (BAR1→BAR11, ~2 dny orchestrace) — vlajková loď; BAR12 článek vyjde frontou
2. **Souběžně s Barometrem**: F1 dávka auditů/den, F3 skener, F8 doc úklid (nezávislé soubory)
3. **Po Barometru**: F4+F5 (data), F2 flagged, F7 výhled, F6 screening
4. **Feature vlny** dle schválení: U24 → U27 → U21/U28
5. **Průběžně**: F1 dávky až na 0 nezauditovaných

**Rozdělení rolí (osvědčené):** fable = metodika, extrakce z primárních zdrojů,
fact-check, redakční úsudek · opus = schémata, validátory, fetchery, frontend,
verifikace · sonnet = docs, rutiny, mechanické úpravy · orchestrátor (fable) =
fázování, commity, PR, watchdog proti zaseknutí, reakce na review.
