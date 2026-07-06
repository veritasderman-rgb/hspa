# Plán práce — Zdravé Česko / HSPA Dashboard

> **Vzniklo:** 2026-07-06 · kompletní audit kódu, backlogu, automatizací + návrh rozvoje
> **Účel:** jeden vstupní dokument pro další vývoj. Každý úkol má připravené zadání
> („Prompt pro Claude Code"), které lze zkopírovat do nové session a spustit.
> **Jak číst:** sekce 1 = stav webu (co audit zjistil), sekce 2 = sada úkolů U1–U30,
> sekce 3 = co NEDĚLAT. Priority: 🔴 P0 kritické · 🟠 P1 důležité · 🟡 P2 rozvoj · ⚪ P3 vize.

---

## 1. Stav webu — souhrn auditu (2026-07-06)

### 1.1 Co je zdravé ✅

- **Kód je čistý**: 0 reálných inline TODO/FIXME v JS/CSS, žádné stub funkce.
- **Testy zelené**: všech **591 testů prochází** (0 failures). Pozn.: CLAUDE.md uvádí
  zastarale „~355 testů, 6 pre-existing failures" — viz úkol U10.
- **Freshness OK**: ingest běžel dnes, `data/freshness.json` aktuální.
- Hotové vlny: financování (fáze 2–5), Kvalita péče V2, GA4 úrovně 1–3, a11y baseline
  (axe 0 porušení), SDOH explainery, série Reforma komplexity (9 dílů verified),
  rubriky F1–F4, dohodovací řízení, SEO/GEO (JSON-LD, canonical, prerender,
  per-indikátor URL), ux-audit 2026-06-11 (12/12 bodů).

### 1.2 Hlavní dluhy 🔴🟠

| # | Zjištění | Rozsah |
|---|---|---|
| 1 | **104 ze 163 indikátorů na `seed`** (live ratio 36,4 %). Gate `MIN_LIVE_RATIO` v `refresh.yml` je **0.0 = vypnutý** — rozbitý fetcher projde bez povšimnutí. Komentář ve workflow („všechny fetchery selhávají") je navíc zastaralý — 59 jich živě funguje. | L |
| 2 | **116 ze 169 článků není `verified`** — z toho **76 živě publikovaných** s nedokončeným auditem (46 review-pending + 30 partial) a **18 publikovaných úplně bez `audit-status`**. | L |
| 3 | **Stale auditní poznámky v ~10 HTML**: série `napoje-1..5`, `ai-zdravotnictvi-1..2`, `dohodovaci-rizeni-2027-vysledek` mají v hlavičce splněný, ale neuklizený checklist „TODO před publikací" (článek už je published+verified); `onkologicky-koordinator-2026` a `deficit-pojisteni-2026` mají „k doplnění". | S |
| 4 | **Screening drift**: `clanek-centrum-onkologicke-prevence-mou-2026.html` cituje 60/52,3/28 %, verified indikátory říkají 54,5/65,7/31,1 %. | S |
| 5 | **OECD fetcher `oecd.js` volá mrtvý legacy endpoint** `stats.oecd.org` (404); náhrada `sdmx.oecd.org` je ověřená, přepis není hotový (~7 kandidátských indikátorů čeká). | M |
| 6 | Metodické karty `indicators/*.json` nenesou `source.origin` (jen agregát). | S |

### 1.3 Noční a denní automatizace — mapa a slabá místa

**GitHub Actions crony** (UTC; v létě +2 h na český čas):

| Workflow | Kdy (CEST) | Co dělá |
|---|---|---|
| `publish-articles.yml` | denně 06:00 | max 1 článek z fronty (`scripts/publish-scheduled.js`), feed, sitemap, prerender |
| `refresh.yml` | denně 08:00 | `npm run ingest` (11 fetcherů) → transform → feed/SEO/sitemap → validace + testy → freshness gate → commit do main; při selhání issue `freshness-alert` |
| `ga4-stats.yml` | denně 08:15 | GA4 statistiky → `data/analytics-public.json` |
| `social-generate.yml` | neděle 18:00 | Claude API → 4 shrnutí + grafika → drafty do Notion |
| `social-publish.yml` | pondělí 07:00 | schválené drafty z Notion → Buffer fronta |
| `newsletter-weekly.yml` | čtvrtek 09:33 | 3–4 články + Florence úvod → Brevo kampaň na pátek 11:00; log `data/newsletter-log.json` |
| `deploy-check.yml`, `visual-a11y.yml` | na PR | testy, validace, Playwright vizuální + axe regrese |

**AI rutiny (prompty)**: `PROMPT_DAILY_ROUTINE.md` (kořen repa!), `PROMPT_NIGHTLY_ROUTINE.md`,
`PROMPT_SOCIAL_ROUTINE.md`, `PROMPT_NEWSLETTER_ROUTINE.md` (jediná s vlastním workflow).

**Slabá místa:**

1. **Freshness gate vypnutý** (`MIN_LIVE_RATIO=0.0`) — nejzávažnější věc; viz U1.
2. **Daily/nightly/social rutiny nemají žádný trigger** — běží jen když je někdo ručně
   spustí. Publikační fronta (`publish-articles.yml`) přitom závisí na tom, že ji daily
   rutina plní. Viz U14.
3. **Dvě paralelní sociální pipeline** míří do téhož Bufferu (workflow Notion→Buffer
   token vs. PROMPT_SOCIAL přes Buffer MCP) — riziko duplicit. Viz U15.
4. `ga4-stats.yml` pushuje bez rebase-retry a běží 15 min po `refresh.yml` → občasné
   kolizní selhání. Viz U2.
5. `data/newsletter-log.json` má jen 1 záznam — ověřit, zda cron nevydává, nebo
   opakovaně přeskakuje („< 2 nové články"). Viz U16.
6. Crony jsou v UTC bez DST — v zimě vše běží o hodinu dřív, než říkají komentáře.

### 1.4 Nové napojení: Hlídač státu MCP 🆕

Ověřeno živým dotazem (funguje). K dispozici je 31 nástrojů, pro nás nejcennější:

| Nástroj | Co umí | Využití pro Zdravé Česko |
|---|---|---|
| `search_contracts` + `get_contract_detail` | Registr smluv, filtr na zdravotnické kategorie (`zdrav_leciva`, `zdrav_pristroje`, …), detekce smluv těsně pod limitem ZZVZ, skryté ceny | Rubrika „Peníze ve zdravotnictví": nákupy nemocnic, léky, přístroje |
| `get_kindex_for_legal_entity` | K-Index rizikovosti smluvní praxe (A–F) pro 200+ největších institucí | Transparentnost FN, pojišťoven, MZ ČR — srovnávací článek/tabulka |
| `search_subsidies` + `get_subsidy_detail` | České i EU dotace | Dotace do zdravotnictví (NPO, IROP), kdo a kolik |
| `search_veklep_legislation` | VeKLEP — návrhy zákonů v připomínkovém řízení | **Legislativní radar**: novely zdravotnických zákonů dřív, než dorazí do sněmovny |
| `search_uohs_decisions` | Rozhodnutí ÚOHS od 1999 | Zakázkové kauzy nemocnic |
| `get_business_with_government`, `find_legal_entity_by_name`, insolvence, sponzoring stran, platy politiků | Profily subjektů | Fact-checking a kontext v článcích |

Testovací dotaz vrátil reálná data (objednávky léků FN Bulovka 50,2 mld. Kč kumulativně,
FN Motol — Vertex 787,8 mil. Kč za lék na cystickou fibrózu, FN Brno — ibrutinib 590,5 mil. Kč).
To samo o sobě jsou témata na články. Integrace = úkoly U17–U20.

---

## 2. Sada úkolů (spustitelné přes Claude Code)

> Každý úkol spouštěj v nové session zkopírováním bloku **Prompt**. Úkoly jsou řazené
> podle priority; nezávislé úkoly lze dělat v libovolném pořadí. Vždy platí standardní
> workflow z CLAUDE.md: čerstvý main → branch `claude/…` → `npm run validate:all` +
> `npm test` → PR.

### 🔴 P0 — Kritické

#### U1 · Zapnout freshness gate + smoke log fetcherů

**Rozsah:** M · **Blokace:** žádná (live ratio už je 0.364, gate lze zvednout hned)

> **Prompt:** V repu hspa: freshness gate v `.github/workflows/refresh.yml` je
> `MIN_LIVE_RATIO: '0.0'` s komentářem, že všechny fetchery selhávají — to už neplatí,
> `data/freshness.json` hlásí live_ratio 0.364. Udělej: (1) zvedni `MIN_LIVE_RATIO` na
> `'0.3'` a oprav zastaralý komentář, (2) do `ingest/run.js` přidej závěrečný souhrn
> per-fetcher (name, ok/fail, počet indikátorů live) do stdout, ať je v logu workflow
> na první pohled vidět, který fetcher vypadl, (3) přidej test. Postupné zvedání na
> 0.5–0.8 řeší PLAN-VERIFIKACE-INDIKATORU.md — neměň verifikační logiku.

#### U2 · Opravit race condition v `ga4-stats.yml`

**Rozsah:** S

> **Prompt:** V repu hspa: `.github/workflows/ga4-stats.yml` pushuje do main prostým
> `git push` bez retry, ale běží v 06:15 UTC, 15 minut po `refresh.yml`, který také
> pushuje. Převezmi rebase-retry push pattern z `refresh.yml` (max 5 pokusů) do
> `ga4-stats.yml`. Zvaž i posun cronu na 06:45 UTC. Jen workflow změna, žádný JS.

#### U3 · Oprava screening driftu v článku MOÚ

**Rozsah:** S · **Zdroj:** PLAN-VERIFIKACE-INDIKATORU.md §2, nightly scanner `indicator-drift`

> **Prompt:** V repu hspa: `clanek-centrum-onkologicke-prevence-mou-2026.html` cituje
> screeningové účasti (mamograf 60 %, cervix 52,3 %, kolorektál 28 %), které nesedí na
> verified indikátory `screening_*` (54,5 / 65,7 / 31,1 %). Postupuj podle
> PLAN-VERIFIKACE-INDIKATORU.md §2: nejdřív ověř definice indikátorů proti ÚZIS NSC
> (WebFetch), zjisti, zda jde o rozdíl metodiky (cílová populace vs. pozvaní), a pak
> článek slaď s verified čísly včetně vysvětlivky metodiky. Bez primárního zdroje čísla
> neměň — jen flaguj.

### 🟠 P1 — Data a verifikace indikátorů

#### U4 · Přepis OECD fetcheru na sdmx.oecd.org

**Rozsah:** M · **Zdroj:** PLAN-VERIFIKACE-INDIKATORU.md

> **Prompt:** V repu hspa: `ingest/fetchers/oecd.js` volá mrtvý legacy endpoint
> `stats.oecd.org` (404). Funkční náhrada je `sdmx.oecd.org` — vzor už existuje
> v `ingest/fetchers/oecd_sdmx2.js` (pozor: benchmark počítat JEN z 38 zemí
> `OECD_MEMBERS`, viz docs/decisions-log.md). Přepiš `oecd.js` (nebo jeho indikátory
> přemigruj pod oecd_sdmx2) pro kandidáty z PLAN-VERIFIKACE-INDIKATORU.md. Pozor na
> metodickou past `alkohol_spotreba` (OECD recorded 11,2 L vs. seed WHO 14,4 L — nutná
> poznámka o metodice, ne tichá záměna). Testy + mapping + `verification_status`
> podle receptu v plánu.

#### U5 · Verifikační dávka G (seed → Ověřeno)

**Rozsah:** M · **Opakovatelný úkol** — spouštět opakovaně, dokud jsou kandidáti

> **Prompt:** V repu hspa: pokračuj v plánu 05_M1_Starter/PLAN-VERIFIKACE-INDIKATORU.md
> další dávkou (po dávce F). Vyber 5–8 seed indikátorů, které lze napojit na strojově
> dostupný primární zdroj (ČSÚ DataStat, Eurostat JSON-stat, OECD SDMX, SÚKL),
> implementuj fetch+mapping, nastav `verification_status: "verified"` + `verified_at`
> v metodických kartách. NEHÁDAT hodnoty; co nemá dostupný zdroj, zůstává Ilustrativní.
> Řiď se recepty a pastmi v plánu (traps.md: nespouštět transform v sandboxu a
> necommitovat degradovaný výstup).

#### U6 · Doplnit `audit-status` 18 publikovaným článkům

**Rozsah:** M

> **Prompt:** V repu hspa: 18 článků v `data/articles.json` nemá vůbec pole
> `audit-status`, většina je přitom `published:true` (mj. onkologicky-koordinator-2026,
> financovani-segmenty-2026, detska-psychiatrie-krize, pyll, spotreba-antibiotik,
> cekaci-doby-kycel, novela-elektronizace-2026, reforma-pohotovosti-290-2025,
> ai-act-zdravotnictvi-srpen-2026 …). Vypiš si je (`jq`), u každého proveď rychlý audit
> podle docs/conventions.md (čísla vs. zdroje, funkční odkazy) a nastav odpovídající
> status (`verified` / `partial` / `review-pending`). Zjištěné problémy → `flagged` +
> poznámka do HTML komentáře `audit:`, ne do viditelného textu. `npm run validate:articles`.

#### U7 · Úklid stale auditních poznámek v HTML

**Rozsah:** S

> **Prompt:** V repu hspa: tyto publikované+verified články mají v hlavičce zastaralý
> HTML komentář `audit:` se splněným checklistem „TODO před publikací" a textem
> „DRAFT — published:false", což už neplatí: clanek-ai-zdravotnictvi-1-vstricnost.html,
> clanek-ai-zdravotnictvi-2-lecba.html, clanek-napoje-1..5 (5 souborů),
> clanek-dohodovaci-rizeni-2027-vysledek.html. Aktualizuj komentáře na skutečný stav
> (datum publikace, status), splněné TODO odstraň. V clanek-onkologicky-koordinator-2026.html
> a clanek-deficit-pojisteni-2026.html vyřeš body „k doplnění" (doplnit, nebo převést na
> flagged záznam). Jen HTML komentáře — viditelný text neměň.

#### U8 · Audit review-pending/partial publikovaných článků (dávkově)

**Rozsah:** L (dávky po ~8) · **Opakovatelný úkol**

> **Prompt:** V repu hspa: 76 živě publikovaných článků má `audit-status`
> `review-pending` (46) nebo `partial` (30). Vezmi dávku 8 nejstarších (podle `date`),
> proveď plný redakční audit podle docs/conventions.md: ověř klíčová čísla proti
> primárním zdrojům (WebFetch), zkontroluj odkazy, `linked_indicators` a soulad
> s aktuálními hodnotami indikátorů. Výsledek: povýšit na `verified`, nebo `flagged`
> s konkrétní poznámkou. Detailní zjištění do HTML komentáře `audit:`. Průběžný stav
> reportuj do PR body, ať je vidět, kolik dávek zbývá.

#### U9 · Explainery: doověřit 20× `needs_verification`

**Rozsah:** M · **Zdroj:** BACKLOG.md EXPLAINER-VERIFY

> **Prompt:** V repu hspa: v `data/explainers.json` má 20 explainerů
> `verification_status: needs_verification` (11 má `ok`). Projdi je, ověř klíčová
> tvrzení proti dokumentům v poli `documents` (WebFetch primárních zdrojů), oprav
> drobné nepřesnosti a přepni na `ok`. Co nejde ověřit, nech `needs_verification`
> s poznámkou proč. `npm run validate:all`.

#### U10 · Aktualizace dokumentace (CLAUDE.md + BACKLOG)

**Rozsah:** S

> **Prompt:** V repu hspa: dokumentační dluh: (1) CLAUDE.md uvádí „~355 testů, 6
> pre-existing failures z xlsx/csv-parse" — reálně je 591 testů a 0 failures; oprav.
> (2) BACKLOG.md uvádí CLINICAL-V2 jako 🟡 rozpracované, ale PLAN-KVALITA-PECE-V2.md
> je ✅ implementováno 2026-06-10 — srovnej. (3) CLAUDE.md tabulka odkazuje
> PROMPT_DAILY_ROUTINE.md do 05_M1_Starter/, soubor je ale v kořeni repa — oprav odkaz,
> nebo soubor přesuň a oprav relativní odkazy v ostatních promptech (zvol jedno,
> konzistentně). (4) Zaeviduj PLAN-PRACE.md do sekce Living docs v CLAUDE.md.

#### U11 · `source.origin` do metodických karet

**Rozsah:** S–M

> **Prompt:** V repu hspa: metodické karty `indicators/*.json` (163 souborů) nenesou
> informaci seed/live — ta existuje jen v agregátu `data/indicators.json`. Rozhodni
> a implementuj: buď (a) transform propíše `origin` + `fetched_at` do karet
> automaticky, nebo (b) zdokumentuj v docs/data-model.md, že origin je záměrně jen
> v kontraktu, a přidej test konzistence (karta tvrdí verified ⇒ kontrakt má live).
> Preferuj menší zásah (b), pokud (a) nekoliduje s pastmi z traps.md ohledně
> spouštění transformu v sandboxu.

#### U12 · check-sources: kontrola ~52 legislativních odkazů

**Rozsah:** M · **Zdroj:** issue #576

> **Prompt:** V repu hspa: podle PLAN-VERIFIKACE-INDIKATORU.md §10 (issue #576) je
> potřeba zkontrolovat ~52 primárních legislativních/EU odkazů napříč ~30 články
> (zakonyprolidi.cz vrací 403 → zkusit e-Sbírku, EUR-Lex, PSP/Senát). WebFetchem ověř
> dostupnost a správnost cílů, mrtvé odkazy nahraď funkčním primárním zdrojem (ne
> archivem třetí strany, pokud existuje oficiální). Změny jen v odkazech, ne v textu
> tvrzení.

### 🟠 P1 — Integrace Hlídače státu 🆕

#### U17 · Článek: Peníze ve zdravotnictví — pilot ze smluv nemocnic

**Rozsah:** M · **Vyžaduje:** session s Hlídač státu MCP

> **Prompt:** V repu hspa: máme MCP napojení na Hlídač státu. Napiš pilotní článek
> rubriky „Peníze ve zdravotnictví" postavený na Registru smluv: největší smlouvy
> fakultních nemocnic za posledních 12 měsíců (mcp hlidac_statu: search_contracts,
> kategorie zdrav_*, order PriceDesc; detaily get_contract_detail). Ověřený úvodní
> úlovek: kumulativní objednávky léků FN Bulovka přes PHOENIX (50,2 mld. Kč evidence),
> FN Motol — Vertex (Kaftrio, 787,8 mil. Kč), FN Brno — ibrutinib (590,5 mil. Kč).
> Kontext: centrová léčba, proč rostou výdaje na léky (navaž na indikátor výdajů).
> Standardní postup nového článku dle docs/workflows.md + CLAUDE.md (draft,
> published:false, audit-status: draft, AV komponenty, zdroje = odkazy na
> hlidacstatu.cz + smlouvy v registru). Dodrž licenci Hlídače (uvést zdroj).

#### U18 · Legislativní radar (VeKLEP)

**Rozsah:** L

> **Prompt:** V repu hspa: navrhni a implementuj „Legislativní radar" — přehled
> zdravotnické legislativy v přípravě. Zdroj: Hlídač státu MCP `search_veklep_legislation`
> (návrhy zákonů/novel MZ ČR v připomínkovém řízení). Architektura po vzoru strategií:
> (1) nový dataset `data/legislativa.json` (schéma: id, název, předkladatel, stav,
> fáze, odkaz VeKLEP, anotace, dotčené indikátory/články), (2) validátor
> `ingest/validate-legislation.js` zapojený do validate:all, (3) stránka
> `legislativa.html` + `src/legislativa.js` (tabulka + filtry fází), (4) zápis do menu
> přes page-shared.js, (5) docs/data-model.md + testy. Naplň úvodních ~10 záznamů
> reálnými daty z VeKLEP (zdravotnictví 2025–2026). Ruční aktualizace zatím stačí —
> automatizaci řeší U20.

#### U19 · Srovnání transparentnosti nákupů: K-Index nemocnic

**Rozsah:** M

> **Prompt:** V repu hspa: napiš datový článek srovnávající K-Index (index klíčových
> rizik smluvní praxe Hlídače státu, škála A–F) zdravotnických institucí: ministerstvo
> zdravotnictví, fakultní nemocnice (Motol, Bulovka, VFN, Brno, Ostrava, Plzeň, HK,
> Olomouc…), VZP a velké krajské nemocnice. MCP: find_legal_entity_by_name →
> get_kindex_for_legal_entity; doplň kontext co K-Index měří (podíl smluv se skrytou
> cenou, u limitu ZZVZ, koncentrace dodavatelů). AV tabulka + vysvětlení metodiky +
> limity interpretace (K-Index ≠ korupce). Draft workflow dle docs/workflows.md,
> zdroj + licence Hlídače uvedena.

#### U20 · Hlídač státu do denní rutiny (discovery)

**Rozsah:** S

> **Prompt:** V repu hspa: rozšiř PROMPT_DAILY_ROUTINE.md (kořen repa) o discovery krok
> „Hlídač státu": (a) VeKLEP — nové zdravotnické návrhy zákonů za posledních 7 dní
> (search_veklep_legislation), (b) Registr smluv — mimořádné zdravotnické smlouvy
> (search_contracts, kategorie zdrav_*, s. skrytou cenou nebo těsně pod limitem ZZVZ),
> (c) ÚOHS — nová rozhodnutí týkající se nemocnic. Nález = kandidát na článek dne nebo
> aktualizaci legislativního radaru (data/legislativa.json, pokud existuje). Doplň
> i pravidla: vždy citovat zdroj hlidacstatu.cz, nespekulovat o motivech, K-Index ≠
> obvinění. Jen úprava promptu + případně PROMPT_NIGHTLY_ROUTINE.md (kontrola posunů
> fází ve VeKLEP u sledovaných novel).

### 🟡 P2 — Automatizace a provoz

#### U13 · Nightly scanner do CI

**Rozsah:** S

> **Prompt:** V repu hspa: deterministický skener `scripts/nightly-scan.js`
> (`npm run scan:nightly`) generuje reporty do gitignorované `reports/`, ale žádné CI
> ho nespouští — běží jen když někdo ručně pustí noční rutinu. Přidej workflow
> `.github/workflows/nightly-scan.yml` (cron ~02:00 UTC): spustí skener +
> `verify:freshness:report`, report přiloží jako artifact, a pokud najde kategorii
> `indicator-drift` nebo mrtvé odkazy, založí/aktualizuje GitHub issue (vzor
> freshness-alert v refresh.yml). Nic necommituje do main.

#### U14 · Rozjet daily + nightly rutinu na plánovači

**Rozsah:** S (konfigurační) · **Vyžaduje rozhodnutí vlastníka**

> **Prompt:** V repu hspa: rutiny PROMPT_DAILY_ROUTINE.md a PROMPT_NIGHTLY_ROUTINE.md
> nemají žádný trigger — fronta článků se bez ručního spuštění neplní. Nastav
> naplánované Claude Code sessions (Claude Code on the web → scheduled tasks /
> triggers): daily rutina 1×/den dopoledne, nightly 1×/den v noci, social 1×/den.
> Prompt každé session = odkaz na příslušný PROMPT_*.md. Pokud plánovač nejde nastavit
> z této session, vytvoř přesný návod krok za krokem pro vlastníka (kam kliknout, jaký
> prompt vložit, jaká má být cadence) a ulož ho jako docs/scheduled-sessions.md.

#### U15 · Konsolidace sociálních pipeline

**Rozsah:** M · **Vyžaduje rozhodnutí vlastníka**

> **Prompt:** V repu hspa: existují dvě nezávislé sociální pipeline mířící do stejného
> Bufferu: (A) workflow social-generate.yml + social-publish.yml (Claude API → Notion
> schvalování → Buffer token), (B) PROMPT_SOCIAL_ROUTINE.md (interaktivní session přes
> Buffer MCP, bez schvalování). Riziko duplicit. Analyzuj obě (social/, prompty,
> workflows), navrhni konsolidaci — doporučení: nech (A) jako produkční s Notion
> schvalováním, (B) přepiš na doplňkovou roli (ad-hoc doplnění fronty s povinnou
> kontrolou, co už v Bufferu je přes list_posts, a deduplikací proti Notion frontě).
> Předlož návrh v PR, který upraví PROMPT_SOCIAL_ROUTINE.md a doplní dedup kontrolu.

#### U16 · Diagnostika newsletteru

**Rozsah:** S

> **Prompt:** V repu hspa: newsletter cron (newsletter-weekly.yml, čtvrtek) běží, ale
> data/newsletter-log.json má jediný záznam (úvodní vydání). Zjisti proč: projdi runy
> workflow (mcp github actions_list / get_job_logs), ověř podmínku „< 2 nové články →
> přeskoč" v scripts/newsletter-run.js proti reálnému tempu publikace (1 článek/den by
> měl stačit), zkontroluj BREVO_API_KEY selhání. Pokud vydání padají na chybě, oprav;
> pokud legitimně přeskakuje, zvaž snížení prahu nebo fallback obsah (indikátor týdne)
> a reportuj vlastníkovi v PR body.

### 🟡 P2 — Rozvoj webu (z backlogu)

#### U21 · Manifest — rozšíření (fáze A–D)

**Rozsah:** L · **Zdroj:** PLAN-MANIFEST-ROZSIRENI.md (čeká na schválení — potvrdit před startem)

> **Prompt:** V repu hspa: implementuj PLAN-MANIFEST-ROZSIRENI.md fáze A–D pro
> clanek-manifest-reforma-zdravotnictvi.html (obsah 13 priorit se NEMĚNÍ): A) nový hero
> varianta „Proč zrovna teď" + 3 animované stats, B) sekce „Proč tato reforma"
> (3 expanze), C) .av-counter na klíčových číslech priorit 1, 5, 8, 11, 13, D) inline
> data cards per priorita (mapping priorita → indikátory, např. priorita 8 →
> screening_kolorektalni, kuractvi_denni, alkohol_spotreba). Fáze E (substránky) a F
> (cross-link z indicator.html) nech na samostatný úkol. AV komponenty dle
> docs/visual-components.md, build:css, testy.

#### U22 · Duškův brief: 8 klinických indikátorů + 6 článků

**Rozsah:** L (dělit na 2+ session) · **Zdroj:** BACKLOG.md DUSEK-CONTENT

> **Prompt:** V repu hspa: pokračuj v DUSEK-CONTENT (BACKLOG.md, brief
> CLAUDE_BRIEF_HSPA_DUSEK_2026-05-14): 8 klinických indikátorů (obložnost IP, přežití
> na UPV…) už má metodické karty v review-pending — dohledej datový sourcing (PUK/ÚZIS,
> fetchery puk/indiko existují) a naplň hodnoty; NEHÁDAT, co nemá zdroj, zůstává seed +
> Ilustrativní. Poté první 2 ze 6 článků briefu (dohodovací řízení navazuje na
> existující stránku; CZ-DRG). Draft workflow, AV komponenty, audit-status: draft.

#### U23 · Série Reforma — dokončení (2 moduly + fact-check)

**Rozsah:** M · **Zdroj:** PLAN-SERIE-REFORMA-KOMPLEXITA.md §8–9

> **Prompt:** V repu hspa: dokonči sérii „Jak (ne)reformovat komplexní systém"
> (PLAN-SERIE-REFORMA-KOMPLEXITA.md §8): (1) ověř a připrav k publikaci 2 volitelné
> moduly clanek-pacientske-vysledky-proms.html a clanek-adaptivni-evaluace.html
> (fact-check čísel, pak review-pending → fronta), (2) fact-check refresh dílů se
> `scheduled_for` v budoucnu u rychle se vyvíjejících kauz (deficit pojišťoven 2026,
> VZP/NCOZ, VBHC) — ověř WebFetchem, že tvrzení stále platí, (3) vyřeš otevřenou otázku
> rozcestníku série (§9): doporučuji rozšířit themes.json o vazbu linie → seznam článků
> série, pokud to schéma unese (validátor + testy).

#### U24 · A11y: manuální WCAG 2.2 kritéria + CI gate

**Rozsah:** M · **Zdroj:** PLAN-A11Y-EXPLAINERY-SDOH.md A3+A5

> **Prompt:** V repu hspa: dokonči a11y plán (PLAN-A11Y-EXPLAINERY-SDOH.md, zbývá
> A3+A5): A3 — manuální WCAG 2.2 kritéria, která axe neodhalí: 2.5.8 Target Size ≥24px
> (nav chipy, filtry clanky.html, TOC, mapové dlaždice, paginace — změř v CSS a oprav),
> 2.5.7 Dragging (mapa krajů musí mít ne-drag alternativu — ověř klikatelnost), 2.4.11
> Focus Not Obscured (sticky nav vs. focus), 3.2.6 Consistent Help. A5 — udělej
> `test:a11y` blocking v CI pro klíčové stránky (visual-a11y.yml). build:css po CSS
> změnách.

#### U25 · SEO follow-up: statické indikátorové odkazy

**Rozsah:** S · **Zdroj:** STATUS_AUDIT_SEO_GEO_2026-06-11.md

> **Prompt:** V repu hspa: interní odkazy vedou na `indicator.html?id=…`, ale existují
> statické SEO stránky `indikator-{id}.html` (zatím jen v sitemap). Přesměruj interní
> odkazy napříč src/*.js a HTML na statické URL (hub, related links, glosář, articles).
> indicator.html?id= nech funkční jako fallback. Ověř, že generátor seo:indicators
> pokrývá všechny id. Testy.

#### U26 · Rubriky: doladit 55 víceznačných článků + pinned essentials

**Rozsah:** S · **Zdroj:** PLAN-CLANKY-UX.md

> **Prompt:** V repu hspa: z logu scripts/assign-rubrics.js zbývá ručně doladit
> `rubric` u 55 víceznačných článků a vybrat `pinned_essential` evergreen sadu pro blok
> „Kontext, který musíte znát" na clanky.html. Projdi sporné články, přiřaď rubriku
> podle převažujícího záměru textu (ne titulku), vyber 4–6 pinned essentials
> (nadčasové: jak funguje systém, financování, práva pacienta). validate:all + testy.

#### U27 · Storytelling komponenty (STRAT-STORY, IND-STORY, PREV-PERSONA)

**Rozsah:** M–L · **Pozor:** net-new UI → nutná vizuální verifikace (visual-a11y workflow / Playwright screenshoty)

> **Prompt:** V repu hspa: z BACKLOG.md P2 implementuj jednu z trojice (spouštěj
> postupně, každou zvlášť): (a) STRAT-STORY — flow diagram 4 vrstev strategií
> (Národní · Sektorové · EU · Standardy) na strategie.html; (b) IND-STORY —
> mini-příběh komponenta na indicator.html (co číslo znamená pro pacienta, vzor
> `.ed-narrative`); (c) PREV-PERSONA — filtr prevence.html podle životní fáze (mladá
> rodina / 40+ / 65+). Net-new UI: po implementaci spusť visual-a11y workflow
> s update_baseline a přilož screenshoty do PR. Styl dle docs/visual-components.md,
> build:css.

#### U28 · Dark mode

**Rozsah:** L · **Pozor:** vědomé rozhodnutí vlastníka (dokumentace dark mode byla dříve odstraněna); ~190 hardcoded hex + 59 rgba v CSS + 25 inline barev

> **Prompt:** V repu hspa: implementuj dark mode (vlastník schválil). Postup: (1)
> zmapuj hardcoded barvy v src/styles.css (hex/rgba mimo CSS proměnné) a inline barvy
> v HTML, převeď je na sémantické proměnné, (2) přidej `@media (prefers-color-scheme:
> dark)` + `[data-theme]` přepínač s uložením volby, (3) pozor na SVG grafiku, echarts
> theme, mapy krajů a AV komponenty — každá potřebuje dark variantu, (4) vizuální
> verifikace: Playwright screenshoty klíčových stránek v obou tématech, visual-a11y
> baseline update, kontrast dle WCAG. build:css. Rozděl klidně do 2–3 PR (proměnné →
> přepínač → grafika).

### ⚪ P3 — Vize (dlouhodobé)

#### U29 · SVG interaktivní schéma „pák" systému

**Rozsah:** L · net-new vizualizace (klikací sloup–střecha–páky na jak-funguje.html); vizuální verifikace nutná.

#### U30 · Dlouhodobá témata (výběr dle kapacity)

- **PROMs/PREMs roadmap** — gap sekce na hspa-prehled.html (OECD PaRIS kontext).
- **AI query interface** — dotazování nad indikátory přirozeným jazykem.
- **Gamifikace regionálního srovnání** (kraje.html).
- **Indikátory odolnosti** (resilience) — nová HSPA doména.
- **Rozšíření zdrojů**: SHARE, EHIS vlny; otevřená data/interoperabilita.
- **Hlídač státu fáze 2**: pravidelný datový feed smluv do `data/` (fetcher přes
  veřejné API Hlídače s API klíčem, pokud vlastník zřídí), indikátor transparentnosti
  nákupů jako experimentální metrika mimo HSPA core.

> Pro každé P3 téma platí: před implementací napsat krátký PLAN-*.md (vzor
> PLAN-MANIFEST-ROZSIRENI.md) a nechat schválit.

### 🚫 Blokované úkoly (čekají na člověka, ne na Claude)

| Úkol | Blocker |
|---|---|
| ÚZIS discovery (~30 seed indikátorů: čekací doby, císařský řez, dojezd ZZS…) | data.mzcr.cz CKAN mrtvé; nutný ruční browser discovery URL distribucí → pak spustit U5 |
| ECDC HIV (`hiv_nove_diagnozy`) | measureId nutno zachytit v devtools na atlas.ecdc.europa.eu |
| GA4-BACKEND dokončení | ruční krok: GA service-account secret + Enhanced measurement v GA Admin |
| Spokojenost s péčí (`spokojenost_pece`) | Gallup data mimo API — zůstává Ilustrativní |

---

## 3. Co NEDĚLAT (závazné, z docs/decisions-log.md + traps.md)

Zkrácený seznam — plné znění v decisions-log:

1. Katarakta = **98,7 %** (ne 35,8 %); narativ „ČR zaostává" nevracet.
2. OECD benchmark **jen z 38 členů** (`OECD_MEMBERS`), ne ze všech REF_AREA.
3. Výpadky léčiv: aktivní přerušení zvlášť od trvalých ukončení; seed 2 210 nevracet.
4. GA4 reklamní storage zůstává **denied**.
5. Persona switcher UI a score widget v hlavičce **nevracet**.
6. § 16b limity: **500 / 1 000 / 5 000 Kč** (žádných 200 Kč).
7. Ředitel ÚZIS = **Ladislav Dušek**.
8. Scope strategií: žádné `institutional`.
9. Nespouštět `npm run transform` v sandboxu a necommitovat degradovaný výstup.
10. Nestavět na mrtvém CKAN API data.mzcr.cz / data.gov.cz.
11. NEHÁDAT hodnoty, measure_id ani distribution ID.
12. Stack: žádné D3/AG Grid/Astro/Next/Python ETL — echarts + vanilla ES moduly + Node.
13. `<aside class="article-review-banner">` nikdy v publikovaném článku.

---

## 4. Doporučené pořadí spouštění

**Týden 1 (provozní stabilita):** U1 → U2 → U3 → U10 → U13 → U16
**Týden 2 (redakční dluh):** U7 → U6 → U8 (1. dávka) → U9
**Týden 3 (data):** U4 → U5 (dávka G) → U11 → U12
**Týden 4 (Hlídač státu):** U17 → U19 → U18 → U20
**Průběžně/dle kapacity:** U8 další dávky, U5 další dávky, U14, U15, U21–U28
**Rozhodnutí vlastníka potřebná:** U14 (plánovač), U15 (konsolidace social), U21 (schválit manifest plán), U28 (dark mode ano/ne)
