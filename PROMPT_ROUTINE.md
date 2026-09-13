# Rutina HSPA Monitoru — jeden běh, jeden soubor, jeden PR

> **Jediná naplánovaná rutina projektu** (rozhodnutí redakce 2026-09-13). Nahrazuje
> šest dřívějších běhů — denní (články), noční (údržba korpusu), indikátorový, sociální,
> newsletterový a Týdny zdraví. Vše, co dělaly, dělá **jeden běh denně** v pevném pořadí
> bloků A–L, s kalendářem uvnitř souboru a s tvrdými stropy na šum.
>
> Zdroj pravdy je tento soubor. Prompt v Routines je jedna věta, která na něj odkazuje
> (viz § 18). Kdo mění pravidla rutiny, mění tento soubor, ne prompt v UI.

---

## 0. Pravidla šumu (nadřazená všem blokům)

Rutina existuje proto, aby redakce ráno našla **jednu věc ke schválení**, ne deset.

| Výstup | Pravidlo |
|---|---|
| **Větev** | Jedna: `claude/rutina-RRRR-MM-DD`. Žádné `daily/…`, `claude/nightly-…`, `claude/newsletter-…`. |
| **PR** | Nejvýš **jeden** za běh, title `rutina RRRR-MM-DD: {hlavní výstup}`. Když běh nezmění žádný soubor v repu (např. jen doplnil Buffer), **PR ani větev nevzniká**. |
| **Issue** | Nejvýš **jedna** za běh, a jen když něco vyžaduje rozhodnutí redakce, které nelze vyjádřit stavem `review-pending`/`flagged` (rozpor s evidencí, klíčové tvrzení bez zdroje, nejasný posun legislativy dotýkající se publikovaného článku). Title `rutina RRRR-MM-DD: k rozhodnutí redakce (N bodů)`. Existuje-li otevřená issue `rutina …` mladší než 7 dní, **doplň ji komentářem** místo zakládání nové. Vše ostatní patří do sekce „K rozhodnutí" v těle PR. |
| **Soubory za běh** | **Žádné.** Discovery report, routing, datový rámec, auditní protokol, noční report — nic z toho se do repa nezapisuje. Report běhu je **tělo PR** (`<details>` sekce). Pracovní soubory drž v gitignorované `05_M1_Starter/reports/` (adresáře `discovery/` jsou zmrazené — historický archiv, nové běhy tam nepíší; jsou gitignorované). |
| **Commity** | Jeden na blok, který něco změnil (max ~8 za běh), česky, prefix `feat/fix/content/data/chore` + scope. |
| **Komentáře na GitHubu** | Žádné vlastní komentáře k vlastnímu PR, žádné labely, žádné pingování. |
| **Obsahové stropy** | 1 nový článek · 1 nový indikátor (pondělí nebo reaktivně) · revize korpusu max 5 (jen v kvartálním okně) · 1 draft Týdne zdraví · evidence-audit 6 + 4 položek (neděle) · Buffer do 10 postů/kanál. Stropy se **nesčítají přes běhy** — co nestihneš, počká. |
| **Publikace** | Nikdy. Žádné `published: true`, žádné `audit-status: verified`, žádný merge, žádné `shareNow` v Bufferu, žádné okamžité odeslání newsletteru. Redakce má vždy poslední slovo. |

Pořadí bloků je zároveň priorita. Když dochází čas nebo kontext, přeskakují se bloky
odzadu, ale **A (příprava), B (Buffer), C (discovery), E (obsah dne), K (audit) a L
(uzávěrka) se nepřeskakují nikdy**. Přeskočený blok se zapíše do těla PR.

---

## 1. Kontext a nástroje

- **Portál**: HSPA Monitor · Skóre zdravotnictví, `https://skorezdravotnictvi.cz`
  (repo `veritasderman-rgb/hspa`, kód a data v `05_M1_Starter/`; cesty níže jsou
  relativní k němu, pokud není řečeno jinak). Přes 210 článků, přes 220 indikátorů
  (přesná čísla zjisti z `data/articles.json` a `data/indicators.json`, nikdy z paměti).
- **Konvence cest**: všechny příkazy a snippety spouštěj z `05_M1_Starter/` (bloky A a L
  tam přecházejí `cd`); v próze jsou cesty zkrácené (`data/…`, `scripts/…`), ve
  snippetech relativní k tomuto adresáři. Z kořene repa je to `05_M1_Starter/data/…`.
- **Před prvním krokem přečti** `CLAUDE.md`, `docs/quickref.md`, `docs/decisions-log.md`,
  `docs/traps.md`. Platí vše z nich (generované artefakty, JSON escaping, publikační hygiena).
- **MCP konektory rutiny** (nastavuje vlastník v Routines; rutina nepoužívá API klíče):
  GitHub (PR, issue), `PubMed`, `Consensus`, `hlidac_statu`, `Buffer`, `Brevo`.
  Chybí-li konektor, příslušný krok **přeskoč a nahlas** to v těle PR — nikdy ho
  nenahrazuj WebSearchem, domněnkou ani pamětí modelu.
- **Dělba modelů** (orchestrátor = tato session; práci deleguj přes Agent tool, aby
  hlavní kontext zůstal malý a každý blok měl čerstvý pohled):

| Blok | Kdo |
|---|---|
| B Buffer | subagent **Sonnet** (texty podle copywriting manuálu), orchestrátor jen kontroluje limity |
| C Discovery | **tři paralelní subagenti Sonnet**: (1) powerlist 1–13, (2) Hlídač státu, (3) PubMed + Consensus; každý vrátí strukturovaný seznam nálezů s URL a datem |
| D Legislativa, Barometr | Sonnet (datové změny), Opus (verdikt Ověřovny) |
| E Článek | **Opus** píše, Sonnet dělá AV obohacení a kontrolu odkazů |
| F Indikátor | průzkum zdrojů Sonnet, karta + příběh Opus |
| G Údržba korpusu | auto-fix Sonnet, obsahové revize Opus |
| H Týdny zdraví | Opus |
| I Evidence-audit | workflow `.claude/workflows/evidence-audit.js` (Sonnet rešerše → Opus adjudikace) |
| K Nezávislý audit | **Opus, jiná instance než autor** (čerstvý pohled) |
| L Uzávěrka | orchestrátor |

---

## 2. Železné pravidlo, zdroje, citace

> **Co není ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.**
> A: **žádná automatická publikace.** Vše, co měníš v obsahu, jde přes
> `audit-status: review-pending` (nebo `flagged`) a čeká na redakci.

**Primární zdroje**

- **Domácí**: ÚZIS (NZIS, NRPZS, NOR, NRZP, NRH), NZIP, MZ ČR (věstníky, tiskové zprávy),
  VZP (ZPP, výroční zpráva), ČSÚ (DataStat, projekce), SZÚ (NAUTA, surveillance),
  SÚKL (registr výpadků, eRecept), NCEZ, KST, NÚKIB, ČKS, ČOS ČLS JEP.
- **Evropské/mezinárodní**: OECD (Health at a Glance, Data Explorer, HCQI), Eurostat
  (`hlth_*`), WHO (Mortality DB, Health Observatory, guidelines), IARC, EUR-Lex (ELI permalink).
- **Legislativa**: ASPI / Zákony pro lidi / e-Sbírka, PSP ČR (sněmovní tisky — `psp.cz/sqw/historie.sqw`
  bez `?o=` = aktuální období), Senát, eKLEP, Sbírka zákonů, nalus.usoud.cz.
- **Recenzovaná literatura**: PubMed/MEDLINE (PMID, DOI) přes MCP `PubMed`, Cochrane;
  **Consensus** přes MCP `Consensus` jako **vyhledávač evidence — nástroj, ne zdroj**
  (cituje se nalezená práce, nikdy „podle Consensus").
- **Transparentnost**: Hlídač státu přes MCP `hlidac_statu` — VeKLEP, Registr smluv,
  rozhodnutí ÚOHS, K-Index.

**Zakázáno**

- Čísla z paměti („pravděpodobně", „obvykle bývá").
- Sekundární zdroje (média, blogy) tam, kde existuje primární — sekundární jen jako
  kontext nebo pro mediální kauzu.
- „Studie ukazují", „odborníci se shodují" bez konkrétního odkazu.
- Vizuály z hodnot, které nejsou v textu doložené; dvojice „číslo vs benchmark" z různých
  metodik bez explicitního caveatu.
- U Hlídače státu: nález bez odkazu na hlidacstatu.cz + datum dotazu; spekulace o motivech
  aktérů; K-Index jako obvinění (je to metrika rizikovosti smluvní praxe — vždy dopiš,
  co měří: podíl smluv se skrytou cenou, blízkost limitu ZZVZ, koncentrace dodavatelů).
- Provozní texty nástrojů (počítadla dotazů, výzvy k registraci) kdekoli v repu.

**Nejistota je vždy lepší než falešná jistota.** Krátký, doložený článek překonává
dlouhý a nepřesný. Lepší přesný flag než ukvapená oprava.

### 2.1 Protokol PubMed + Consensus

| Potřeba | Nástroj | Jak |
|---|---|---|
| Ověřit konkrétní citaci | `PubMed` → `lookup_article_by_citation` (≥ 2–3 pole) nebo `get_article_metadata` (PMID) | shoda názvu, autorů, roku, časopisu; z metadat DOI a **typ publikace** (retrakce, erratum, komentář, preprint ≠ studie) |
| Co studie skutečně tvrdí | `PubMed` → abstrakt; u open-access `get_full_text_article` | tvrzení musí být v abstraktu/plném textu **doslova doložitelné** (populace, období, velikost účinku, jednotka) |
| Nové domácí studie | `PubMed` → `search_articles` (viz powerlist ř. 14) | filtr ČR v Title/Abstract nebo Affiliation, `date_from` = poslední běh, `datetype: edat`, `sort: pub_date` |
| „Co říká evidence" | `Consensus` → `search` (anglicky, konkrétně; `medical_mode`, `exclude_preprints`; pro souhrn `study_types: ["systematic review","meta-analysis","rct"]`) | výsledek = kandidáti; každý použitý **ověř v PubMed** (PMID/DOI) |
| Není citovaná studie odlehlá? | `Consensus` → `search` k témuž tvrzení | převaha kvalitní evidence proti → tvrzení přepiš s výhradou a cituj přehled, nebo vynech |

**Citace (závazně)**: v textu *Autor et al.* (rok), *Časopis* + `https://doi.org/…` nebo
`https://pubmed.ncbi.nlm.nih.gov/{PMID}/`; v `article-sources` *Autor A, Autor B et al.
Název. Časopis. Rok;roč(č):strany. DOI. PMID.* + „ověřeno v PubMed {datum}"; preprint
označ slovem **preprint**; v `data/claims.json` `source_note` = `PMID:… / DOI:…, ověřeno
{datum}`. Abstrakt ≠ důkaz čísla, které v něm není. Tisková zpráva o studii je jen stopa.
Stropy: **8 dotazů PubMed + 2 Consensus na jednu položku** (článek/indikátor).

### 2.2 Citační pravidla pro Hlídač státu

1. Každý nález s odkazem na konkrétní stránku hlidacstatu.cz + datum dotazu.
2. Jen ověřitelná fakta: kdo, co, kolik, kdy, kategorie, stav. Žádné „snaha obejít",
   „účelově rozdělená zakázka" bez výroku ÚOHS.
3. K-Index vždy s jednovětým vysvětlením metriky.
4. Nález je **kandidát** na článek (rubrika „Peníze ve zdravotnictví") nebo na aktualizaci
   `data/legislativa.json`.
5. **Ověřovna Barometru** (`data/barometr.json` → `statements`): konkrétní kvantitativní
   výrok politika o zdravotnictví (tiskovka, rozhovor, sněmovní vystoupení), který lze
   konfrontovat s indikátory dashboardu, zapiš do discovery nálezů jako kandidáta
   (verbatim + kdo/kdy/kde + URL). Verdikt jen postupem `docs/metodika-barometr.md` § 4
   (blok D). Výroky bez čísel nepatří.

---

## 3. Kalendář bloků

Den v týdnu a měsíci ber z `date -u` přepočteného na **Europe/Prague** (běh startuje
kolem 03:00 místního času, viz § 18).

| Blok | Kdy | Poznámka |
|---|---|---|
| A Příprava | každý běh | větev, recovery, skeny |
| B Distribuce (Buffer) | každý běh | nic do repa |
| C Discovery | každý běh | |
| D Legislativa + Barometr | každý běh | plan_items s prošlým termínem jen **pondělí**; indikátorová větev Barometru **2. den čtvrtletí** (den po `refresh.yml`) nebo když discovery najde novou vlnu dat |
| E Obsah dne | každý běh | max 1 článek; **pondělí** = INDICATOR-ADD (blok F) |
| F Indikátor | **pondělí** + reaktivně | reaktivně = discovery našel nový strukturovaný dataset |
| G Údržba korpusu | auto-fix každý běh; **review jen 2.–8. den ledna, dubna, července, října** | kvartální okno navazuje na `refresh.yml` (1. den čtvrtletí) |
| H Týdny zdraví | když nejbližší marquee den do **42 dní** nemá kompletní draft | typicky ~1× měsíčně |
| I Evidence-audit | **neděle** | 6 článků + 4 indikátory |
| J Newsletter | **pátek** kontrola; fallback jen když GitHub Actions selhal | odesílá `newsletter-weekly.yml` (čtvrtek) |
| K Nezávislý audit | každý běh, kde se změnil obsah | |
| L Uzávěrka | každý běh | |

---

## 4. Blok A — Příprava

```bash
cd 05_M1_Starter
git fetch origin main && git checkout -B claude/rutina-$(date -u +%Y-%m-%d) origin/main
npm ci --no-audit --no-fund 2>/dev/null || npm install
node scripts/nightly-scan.js            # → reports/nightly-audit-RRRR-MM-DD.{md,json} (gitignored)
npm run verify:freshness:report          # stav čerstvosti dat (warn > 7 d, fail > 30 d)
npm run evidence:queue -- --status       # jen v neděli (blok I)
```

1. **Recovery**: existuje-li vzdálená větev `claude/rutina-*` z předchozích dnů **bez
   otevřeného PR** (předchozí běh spadl před uzávěrkou), otevři pro ni PR jako první
   krok (title podle jejích commitů) a teprve pak pokračuj. Nikdy ji nemaž.
2. Spočítej kalendářní flagy (§ 3) a **dní od posledního nového článku** (viz E).
3. Zjisti stav publikační fronty: počet `published: false` záznamů v `data/articles.json`
   a nejzazší `scheduled_for` (potřebné pro E).
4. Skener `nightly-scan.js` je deterministický a offline, nic needituje. Report má tři
   úrovně: `auto-fix` (uděláš sám, blok G), `review` (úsudek, jen v kvartálním okně),
   `low` (jen když zbývá kapacita). Typy flagů: `missing-cover`, `date-passed`,
   `check-sources`, `check-literature`, `topical-expired`, `missing-indicators`,
   `stale-date`, `no-html`, `claims-drift`, `claims-stale`, `claims-missing`. Články
   auditované < 14 dní (`audit.last_reviewed`) skener u zdrojů přeskakuje sám; plný
   worklist vč. recentně auditovaných dá `node scripts/nightly-scan.js --no-skip-reviewed`
   (použij v kvartálním okně, blok G).

---

## 5. Blok B — Distribuce: fronta Bufferu

**Účel**: udržet na každém připojeném kanálu **10 naplánovaných feed příspěvků**
+ na Facebooku a Instagramu **1 vertikální Story/Reels slot** za běh. Texty podle
`docs/social-copywriting-manual.md` (hlavní věc do 1. věty, jeden hák, věcně ale
poutavě) a etalonu `docs/social-buffer-prvni-prispevky.md`. Portál = **HSPA Monitor**,
doména v CTA `skorezdravotnictvi.cz`.

**Železná pravidla Bufferu**

1. Výhradně `mode: addToQueue`, `schedulingType: automatic`. Žádné `shareNow`, `shareNext`,
   `customScheduled`.
2. Žádná čísla z paměti — jen z textu článku / datového kontraktu.
3. Nepřekračuj **10 naplánovaných feed příspěvků na kanál** (Buffer Free); vertikální sloty
   se počítají zvlášť.
4. Neduplikuj: jeden článek = max 1 příspěvek na kanál v cooldownu **30 dní**.
5. Needituj a nemaž cizí příspěvky; maž jen vlastní, chybně vytvořený v tomtéž běhu.
6. Jen viditelné články: `published !== false`, `date` ≤ dnes, `audit-status` ∉
   {`draft`, `flagged`, `draft-flagged`}.
7. Idempotence: plné fronty = nic nepřidávej, jen to nahlas.
8. Žádné PII, žádné placené akce. **Nic necommituj** — stav drží Buffer.

Cokoli, co by vyžadovalo porušení těchto pravidel (mazání, překročení limitu, okamžitá
publikace), → **zastav se a nahlas to** místo provedení.

**Grafika — vždy tmavá stat-hero karta** (`node scripts/generate-ig-cards.js`, manifest
slugů ve skriptu). Světlý landscape cover (`assets/covers/`) je jen nouzový fallback.

| Účel | Cesta | Rozměr |
|---|---|---|
| FB/IG feed | `assets/social/ig/<slug>.png` | 1080×1080 — povinné |
| X feed | `assets/social/x/<slug>.png` | 1600×900 — povinné, fallback `ig/` |
| Story/Reels | `assets/social/ig-story/<slug>.png` | 1080×1920 |

Do fronty patří jen karta **živá na produkci** (HTTP 200 na
`https://skorezdravotnictvi.cz/assets/social/…`). Chybí-li článku karta: přidej slug do
manifestu `scripts/generate-ig-cards.js` (stat + claim jen z doložených čísel), spusť
`npm run ig:cards <slug>` (X: `-- --format landscape <slug>`), PNG **commitni v tomto
běhu** — do fronty půjde až po nasazení, tj. v příštím běhu. Landscape cover: FB/X mohou
jít text-only, **IG kandidáta bez karty přeskoč**.

**Kanály nehardcoduj** — každý běh `get_account` (org `My Organization`,
`5a06fbc0513d8d6f2373e6b9`) → `list_channels` (id, service, isDisconnected). Referenčně:
FB `Skóre zdravotnictví Česko` `6a26b01d8f1d11f9b263c41b`, IG `skorezdravotnictvi`
`6a29cd518f1d11f9b2729507`, X `SkoreZdravko` `6a2a55ab38b557934582b311`.

**Postup**

0. **Inventura** (Buffer = zdroj pravdy): `get_account` → org ID a timezone;
   `list_channels` → kanály, odpojené (`isDisconnected: true`) přeskoč. Per kanál
   `list_posts` `status: ["scheduled","sent"]`, `sort dueAt asc`, `first: 100`.
   `deficit = 10 − scheduledCount` (≤ 0 → přeskoč). `usedSlugs` = slugy z coveru
   v `assets` (`…/<slug>.png`) nebo z odkazu `skorezdravotnictvi.cz/clanek-…` v textu;
   `sent` jen mladší než 30 dní, `scheduled` vždy. Do fronty přispívá i pipeline
   `social-publish.yml` (Notion → Buffer, pondělí 05:00 UTC): její příspěvky se počítají
   do `scheduledCount` i do `usedSlugs` stejně jako tvoje.
1. **Kandidáti**: články dle pravidla 6 s živou kartou, minus `usedSlugs`.
2. **Priorita**: (1) news hook — `topical_until` ≥ dnes vzestupně (nejbližší expirace
   nejdřív), čerstvá agenda (novela, vládní rozhodnutí, výročí, sezóna), indikátor
   s čerstvou změnou (`data/freshness.json` „fresh") nebo překlopením signálu do
   `bad`/`warn`; (2) nejnovější dosud nepropagované podle `date` sestupně; (3) evergreen
   `verified` mimo cooldown, od nejdéle nepropagovaných / nejmladších. Nová částka
   Věstníku MZ (`data/vestniky.json`, `datum` za poslední týden) je kandidát na věcný post
   s odkazem na `/vestniky-mz` (ne, když už fronta post o té částce má).
3. **Texty** — společné: CTA `https://skorezdravotnictvi.cz/<slug>`; `assets[0].image`
   + povinný `altText` („Čtvercová grafika článku … na portálu HSPA Monitor."); hashtagy
   3–6 (oborové + `#zdravícesko`); emoji 1–4. **Facebook** (`metadata.facebook.type: "post"`):
   hook + 2–4 věty + 1 číslo + klikací odkaz. **Instagram** (`metadata.instagram:
   { type:"post", shouldShareToFeed:true }`): caption, URL do textu ne, konec `🔗 odkaz
   v biu`. **X** (`service: twitter`): max 280 znaků (Free; ukáže-li `get_channel` placený
   tier, limit povol vyšší; odkaz = 23), 16:9 karta, 1–2 hashtagy. `altText` podle
   formátu: FB/IG „Čtvercová grafika článku … na portálu HSPA Monitor.", X „Grafika článku
   …", Story „Vertikální grafika článku …".
4. **Vertikální slot** (FB i IG po 1): jen články s živou `ig-story/` kartou, stejná
   priorita a cooldown (klíč = URL vertikální karty). Story = výchozí: IG
   `metadata.instagram = { type: "story", shouldShareToFeed: false, link: "<URL článku>" }`,
   FB `metadata.facebook = { type: "story" }`. Reel jen když existuje video
   (`assets/social/reels/<slug>.mp4`). Caption ultra-stručně. Bez kandidáta slot vynech
   a nahlas „chybí vertikální karta".
5. **Zařazení** `create_post` v pořadí priority; po kanálu zkontroluj, že `scheduledCount`
   nepřekročil 10.

**Výstup do těla PR** (nebo do závěrečné zprávy, když PR nevzniká): tabulka per kanál
(bylo → přidáno → teď, nejbližší/poslední slot), seznam přidaných (kanál · článek · důvod),
přeskočení s důvodem.

---

## 6. Blok C — Discovery

**Cíl**: projít primární zdroje a zjistit, co se od posledního běhu změnilo. Tři paralelní
subagenti (§ 1), každý vrátí seznam nálezů `{zdroj, co, URL, datum, relevance}`. Rozpočet
30–60 minut celkem — subagent, který nestihne, vrátí, co má, a označí neprojité zdroje.

### 6.1 Powerlist (subagent 1: řádky 1–13; subagent 3: řádky 14–15)

| # | Zdroj | URL / nástroj | Co hledat |
|---|---|---|---|
| 1 | ÚZIS — novinky | uzis.cz/index.php?pg=aktuality | nová vlna NRPZS, NOR, NRH, NRZP; nové reporty |
| 2 | NZIP — datasety | nzip.cz/data | nový/aktualizovaný indikátor, otevřená data |
| 3 | MZ ČR — tiskové zprávy | mzcr.cz/tiskove-centrum/tiskove-zpravy | reforma, strategie, vyhláška |
| 4 | MZ ČR — Věstník | mzcr.cz/category/uredni-deska/vestnik-mz-cr | nové věstníkové předpisy (srovnej s `data/vestniky.json`) |
| 5 | VZP — výroční zpráva / ZPP | vzp.cz/o-nas/dokumenty | finanční data, prognóza |
| 6 | ČSÚ — DataStat / projekce | csu.gov.cz/datastat | demografie, projekce, EHIS |
| 7 | OECD — HAG, Country Health Profile | oecd.org/en/topics/health.html | nová vlna (HAG 11/rok, profily 10–12/rok) |
| 8 | Eurostat — `hlth_*` | ec.europa.eu/eurostat/web/health/database | SILC, HLY, mortalita |
| 9 | WHO Europe | who.int/europe/news-room | guidelines, statistiky |
| 10 | SÚKL — výpadky | sukl.cz/farmaceuticky-trh/registr-vypadku-leciv | kritická léčiva |
| 11 | PSP ČR — tisky | psp.cz/sqw/historie.sqw (bez `?o=` = aktuální období; archiv `o=9`, `o=10`…) | nový tisk, hlasování, vyhlášení |
| 12 | Sbírka zákonů | zakonyprolidi.cz/cs/aktualne | normy v gesci MZ |
| 13 | NÚKIB | nukib.cz/cs/aktualni-informace | incidenty ve zdravotnictví, NIS2 |
| 14 | Recenzovaná literatura ČR | `PubMed` → `search_articles`: `("Czech Republic"[Title/Abstract] OR Czechia[Title/Abstract] OR "Czech Republic"[Affiliation] OR Czechia[Affiliation] OR Czech[Affiliation]) AND (health services OR mortality OR screening OR …)`, `date_from` = poslední běh, `datetype: edat`, `sort: pub_date` | nové domácí studie (PMID, DOI, časopis) |
| 15 | Evidence k tématu dne | `Consensus` → `search` (anglicky, `medical_mode`, `exclude_preprints`; přehledy `study_types`) | ke každé kauze z ř. 1–13, kde článek bude tvrdit něco o účinnosti, riziku nebo dopadu |

### 6.2 Hlídač státu (subagent 2)

| # | Nástroj | Filtr | Co hledat |
|---|---|---|---|
| a | `search_veklep_legislation` | zdravotnictví, MZ ČR předkladatel, posledních 7 dní | nový návrh v připomínkovém řízení, posun fáze |
| b | `search_contracts` | kategorie `zdrav_*`, dle hodnoty/data; skrytá cena, hodnota těsně pod limitem ZZVZ | mimořádná smlouva |
| c | `search_uohs_decisions` | zdravotnictví / nemocnice / VZP | pokuta, zákaz plnění, přezkum |

### 6.3 Výstup discovery (jen do těla PR, `<details>`)

```markdown
## Discovery RRRR-MM-DD
### Nové indikátory / datasety      (nález — URL — hodnota)  / žádné
### Legislativa / sněmovní tisky     (norma — stav — datum)   / žádné
### Aktuální dění                    (TZ, kauza — primární? ano/ne)
### Literatura (PubMed / Consensus)  (PMID/DOI — autor, rok — relevance)
### Nové vlny existujících dat       (dataset — vlna — dotčené indikátory/články)
### Hlídač státu                     VeKLEP / smlouvy / ÚOHS (odkaz hlidacstatu.cz + datum)
### Kandidáti Ověřovny               (výrok verbatim — kdo/kdy/kde — URL)
### Routing: HOT indikátor · HOT dění · WARM revize (slugy) · COLD
### Zdroje bez změny: …
```

Když je discovery prázdné (žádný nový dataset, norma, kauza ani vlna), blok E jde na
EVERGREEN nebo fallback (viz E).

---

## 7. Blok D — Legislativa a Barometr

### 7.1 VeKLEP — posun fází sledovaných novel (každý běh)

Přes MCP `hlidac_statu` (`search_veklep_legislation`, `get_veklep_legislation_detail`)
porovnej fázi u:

- každé položky `items` v `data/legislativa.json` (Legislativní radar),
- článků, které explicitně odkazují na konkrétní návrh v připomínkovém řízení.

**Fáze postoupila** → radar: `stav`/`fáze` + odkaz VeKLEP (mechanická změna, anotaci
věcně nepřepisuj); článek: aktualizuj formulaci, `audit-status: review-pending`, do
`audit:` komentáře zdroj + datum; vždy cituj konkrétní VeKLEP záznam na hlidacstatu.cz.
**Nejisté / záznam nedohledatelný** → beze změny, bod do „K rozhodnutí" (issue jen když
se to dotýká publikovaného článku).

### 7.2 Legislativní plán MZ — `plan_items`

Pro každou položku ověř stav ve VeKLEP (u známého `veklep_pid` přímo). Posun → aktualizuj
`stav` (jen enum `nezahajeno | pripominkove_rizeni | vlada | parlament | sbirka | stazeno`,
viz `ingest/validate-legislation.js`), `veklep_pid` + `veklep_url` (povinné mimo
`nezahajeno`), `plneni_poznamka` (datum ověření, co se stalo, srovnání s `plan_termin` —
**jen popis, nikdy hodnocení**: žádné „MZ plán neplní"). Nově zahájená položka bez záznamu
v `items` → založ ho a dopiš `radar_id`. Položky `nezahajeno` s prošlým `plan_termin`
kontroluj jen **v pondělí**; s budoucím termínem vůbec. **I bez posunu** zapiš datum
poslední kontroly do `plneni_poznamka`; u nedohledatelného/nejasného záznamu jen datum,
pole jinak beze změny. Pak `npm run validate:legislation`.

### 7.3 Barometr — `data/barometr.json`

- **Legislativní větev** (každý běh): závazky s `legislativa_ids` podle metodiky § 3.4
  (posun fáze → `plni_se`, dokončeno → `splneno`, dlouhý klid → `bez_pohybu`).
- **Indikátorová větev** (2. den čtvrtletí nebo po nové vlně dat z discovery): u závazků
  s `linked_indicators` porovnej baseline s hodnotou v `data/indicators.json` a přepočítej
  `stav` přesně podle `docs/metodika-barometr.md` § 3 (toleranční pásmo, roční data,
  pořadí pravidel — neimprovizuj práh).
- Každá změna stavu: `stav`, `stav_od`, `stav_duvod` (věcně, s čísly), záznam do
  `historie[]`; je to **redakční událost** — kandidát na článek a post (zapiš do PR).
- **Ověřovna**: z kandidátů discovery zpracuj **max 1 výrok za běh** plným postupem § 4
  (steel-man, tolerance, data dostupná v době výroku) → `statements[]`, verdikt vždy
  s čísly a zdrojem.
- `npm run validate:barometr`; opravy dat jen přes `meta.changelog[]` (§ 6, právo na odpověď).

Commit: `data(legislativa): RRRR-MM-DD — {co se posunulo}` / `data(barometr): …`.

---

## 8. Blok E — Obsah dne (max 1 nový článek)

### 8.1 Rozhodovací strom

```
┌─ Pondělí, nebo discovery našel nový strukturovaný dataset bez pokrytí?
│  ├─ ANO → INDICATOR-ADD (blok F; jeho článek je článek dne)
│  └─ NE ↓
┌─ Aktuální dění s primárně-zdrojovou doložitelností (nová norma, vlna dat s implikací,
│  kauza s ověřitelnými fakty)?
│  ├─ ANO → ARTICLE-WRITE
│  └─ NE ↓
┌─ Existující článek zastaralý kvůli nové vlně / novele?
│  ├─ ANO → ARTICLE-REVISE (revize + audit K)
│  └─ NE ↓
┌─ `data/article-backlog.json` má položku `status: ready`?
│  ├─ ANO → EVERGREEN-WRITE (hlavní zdroj růstu zásobníku)
│  └─ NE ↓
└─ FALLBACK-AUDIT: nejstarší `audit.last_reviewed` (> 30 dní)
```

Výjimka pro pondělí: je-li HOT reaktivní téma se silnými primárními zdroji, napiš je a
indikátorovou větev posuň na úterý (zapiš do PR).

**Kadenční pojistka** (nadřazená stromu): spočítej dní od posledního **nového** článku
(ARTICLE-WRITE / EVERGREEN-WRITE / INDICATOR-ADD; z `git log` nad `clanek-*.html` nebo
z `creation_phase` v `data/articles.json`). **> 2 dny bez nového článku** → EVERGREEN-WRITE
se vynutí, pokud reaktivní spouštěč nevyšel a backlog není prázdný (fallback se přeskočí). Týdenní kvóta **≥ 3 nové články** (po–ne): pod kvótou
upřednostni psaní před auditem. Kvalita se nesnižuje.

**Výběr při více HOT**: aktuálnost → dopadovost (zdravotní + finanční + počet dotčených)
→ doložitelnost → mezera v korpusu. Rozhodnutí + 3–5 řádků zdůvodnění jde do těla PR.

**Evergreen backlog**: položka `ready` s nejnižší `priority` (shoda → pořadí v souboru);
ověř, že není redundantní s publikovaným článkem (`anchor_indicators` ×
`data/articles.json`) — redundantní položku označ `status: "done"` s poznámkou a vezmi
další; `anchor_indicators` + `primary_sources` jsou startovní rámec —
čísla stejně ověř z primárního zdroje; po dokončení `status: "done"` + `slug`. Prázdný
backlog = signál redakci doplnit náměty (zapiš do PR).

### 8.2 Datový rámec (před psaním, jen v pracovním souboru `reports/`)

Centrální KPI (hodnota + jednotka, primární zdroj s datem stažení, benchmark ČR vs
OECD/EU, rok/vlna) · 3–5 sekundárních hodnot se zdroji · legislativa (č./rok Sb., §,
odkaz; sněmovní tisk + stav) · mezinárodní kontext + methodology caveat · evidence
(tvrzení ← Autor et al., rok, časopis, DOI, PMID, ověřeno v PubMed; Consensus kontrola
souhlasí / nesouhlasí / nejasná + DOI přehledu) · interní křížové odkazy (slugy, id
indikátorů). **Nelze-li rámec sestavit, ARTICLE-WRITE zruš** a přepni na další větev.

### 8.3 Článek

Použij existující články jako vzor (`article-page` layout, `docs/workflows.md` „nový
článek", `docs/visual-components.md`). Povinné prvky:

- `<head>`: `<title>{Headline s KPI} · HSPA Monitor</title>`, `description`, `robots
  index, follow`, OG (`article`, `cs_CZ`), `article:published_time`, `article:section`,
  `<meta name="article:audit-status" content="draft">` (u nového článku; publikace ho
  povýší na `review-pending` spolu se záznamem v `articles.json`), `src/styles.css`.
- Audit komentář hned za `<meta charset>`:

```html
<!--
  audit:
    last_reviewed: RRRR-MM-DD
    reviewer: claude-code-agent
    status: draft                               # nový článek; revize publikovaného: review-pending
    created_at: RRRR-MM-DD
    creation_phase: rutina+article-write        # nebo evergreen-write / indicator-add / article-revise
    primary_sources_count: N
    visual_elements_count: N
    notes: "Vytvořeno z discovery RRRR-MM-DD: {trigger}. KPI: {hodnota + zdroj}. Bench: {hodnota + zdroj}. Čeká na schválení redakce."
-->
```

- Tělo: breadcrumb → `article-header` (tagy, `h2.article-title`, `p.article-deck` 3–5 vět
  s KPI a zdroji, `article-meta` datum/minuty/„redakce HSPA Monitoru") → `article-lead`
  → AV hero → sekce h3 (datový kontext · legislativní/institucionální rámec · mezinárodní
  srovnání · co vývoj přináší · **Co s tím**) → `aside.article-databox` (`ed-kicker`
  „Data v tomto článku", `h4.article-databox-h` „Indikátory HSPA Monitoru, ze kterých text
  vychází", položky `<li><a href="indicator.html?id=X"><strong>{Indikátor}</strong></a> —
  {hodnota} {zdroj}</li>`) → `section.article-sources` (`ed-kicker` „Zdroje", h4 „Kde si
  data sami ověříte", položky `<strong>{Zdroj}</strong> — {popis}. <a href="…"
  target="_blank" rel="noopener">{doména} ↗</a>`) → `<script type="module"
  src="src/clanky.js">`.
- **Design systém**: striktně komponenty z `src/styles.css` + `src/article-visuals.js`.
  Chybí-li komponenta, přidej ji do design systému, ne inline do článku; po úpravě
  `styles.css` spusť `npm run build:css` jen kvůli lokálním testům — `styles.min.css`
  se **necommituje** (regeneruje bot po merge, blok L ho resetuje).
- Rozsah: 1 200–2 000 slov; u INDICATOR-ADD min. 1 500 slov s mezinárodním srovnáním
  (CZ vs DE/AT/PL/SK + OECD/EU).
- **Žádné redakční bannery** (`article-review-banner`, inline „Status:") — hlídá
  `validate:articles`. Proces patří do `audit:` komentáře.

### 8.4 AV obohacení (Sonnet)

Inventář: `.av-counter-grid` (max 4 KPI), `.av-counter` (`data-value` jen číslo;
datum/range/„~"/„50+" → `data-prefix`/`data-suffix` nebo bez `data-value`),
`.av-bar-compare` (ČR vs benchmark), `.av-data-table` (sortable preferred), `.av-flow`
(kauzální řetězec, legislativní cesta), `.av-timeline` (milníky), `.av-aside` (max 1 na
sekci; overflow do dalšího h3 řeší `.av-aside-clear`), `.article-callout-caveat` (limity
dat), `.av-figure-wide` (hero). Pravidla: žádný vizuál nepřinese nové číslo; každý
`<figcaption>` = název + zdroj + datum/vlna; sémantické třídy `-good/-warn/-bad/-neutral`
podle směru; density 3–6 prvků na článek (hero counter + 1 aside + 1 flow/timeline +
1 bar-compare nebo data-table).

### 8.5 `data/articles.json` a publikační fronta

Nový článek jde **na konec fronty** — nikdy ne stejný den. `next_slot` = den po
`max(nejzazší scheduled_for mezi published: false, dnešek)` — tj. vždy nejdřív zítřek,
i když fronta obsahuje jen prošlá data (spouštěj z `05_M1_Starter/`):

```bash
python3 -c "
import json, datetime
d = json.load(open('data/articles.json'))
s = [a['scheduled_for'] for a in d['articles'] if a.get('published') is False and a.get('scheduled_for')]
today = datetime.date.today()
last = max([datetime.date.fromisoformat(x) for x in s] + [today])
print((last + datetime.timedelta(days=1)).isoformat())
"
```

Záznam (na začátek pole; `number` **nepřiděluj** — dává ho publikace):

```json
{ "id": "{slug}", "slug": "clanek-{slug}.html", "tag": "{label z data/tags.json}",
  "rubric": "{id z data/rubrics.json}", "kind": "article|analysis|explainer|manifest",
  "date": "{next_slot}", "published": false, "scheduled_for": "{next_slot}",
  "audit-status": "draft",
  "title": "…", "perex": "…", "linked_indicators": ["…"], "linked_prevention_themes": [],
  "topics": ["…"] }
```

Kontrakt (hlídá `validate:articles`): `tag` = přesný label ze slovníku (chybí-li, přidej
do `tags.json`; historické varianty řeší `aliases` + `node scripts/normalize-article-metadata.js`);
`rubric` z `rubrics.json`; `kind` z enumu; `audit-status: draft` (publikace povýší na
`review-pending`); **≥ 1 `linked_indicators`**;
zvaž sérii (`data/series.json` → `parts`); **perex = meta description = JSON-LD
description** (`tests/articles-perex-sync.test.js`). Volitelné `topical_until` u témat
vázaných na termín. Datum v HTML (`published_time`, `.article-meta-date` slovy) =
`next_slot`; `created_at`/`last_reviewed` v audit komentáři = dnešek. Reaktivní kauza smí
jít nejdřív na **zítřek**, nikdy na dnešek, a jen se zdůvodněním v PR.

### 8.6 ARTICLE-REVISE

Uprav jen doložené pasáže (nová vlna → nová čísla, novela → nový stav), aktualizuj
`<figcaption>` a zdroje, `audit-status: review-pending`, do `audit:` `last_reviewed` +
`notes`; `published` neměň. Perex ↔ description drž v synchronu. Pak blok K.

### 8.7 FALLBACK-AUDIT

Priority: článek dotčený aktuální legislativou/kauzou → riziko nepřesnosti (konkrétní
čísla → regionální rozdíly → legislativa → manifest) → nejstarší `audit.last_reviewed`
(> 30 dní). Vše auditováno < 30 dní a nic zastaralé → blok E končí bez změny („all
articles up-to-date"). Manifest a politicky laděné texty: hodnotové soudy se neauditují,
faktická tvrzení ano; jasně odděluj „toto je názor autora" od „toto je doložený fakt".

Commit: `content(clanky): nový článek {slug}` / `content(clanky): revize {slug} — {co}`
/ `chore(audit): {slug} — verified | fixed | flagged`.

---

## 9. Blok F — Nový indikátor (INDICATOR-ADD)

Cíl: **1 nový smysluplný indikátor** z české strukturované datové sady, který dashboard
nemá a který má politickou nebo systémovou výpověď. Pondělí (pravidelně) nebo reaktivně
(discovery našel dataset). Aktuální počet a pokrytí zjisti z `data/indicators.json`
a `indicators/*.json` — **neopakuj, co už dashboard má** (kontroluj `id`, `domain`,
`subdomain`).

### 9.1 Průzkum (Sonnet, 5–10 kandidátů)

Zdroje: ÚZIS/NZIP (`nzip.cz/data` — NZIS, OIS, NRPZS, NRH, NRMD, NRKI, NOR, Registr
hospitalizovaných, Registr rodiček, Registr lékařů; kvalitativní indikátory, dohodovací
řízení), MZ ČR (open data `mzd.gov.cz/dokumenty`, Věstníky, síťové obory, plány péče), ČSÚ (demografie, příčiny
úmrtí), SÚKL (spotřeba léčiv, výpadky, ATC), ČLS JEP (registry, guideliny — proxy
kvality), SZÚ (EHIS, EHES, NAUTA, surveillance, prostředí), ÚZIS NRC (indikátory kvality
nemocnic), NÚKIB (incidenty, NIS2), AZZS (krajské agregáty výjezdů), neziskovky se
strukturovanými daty (Bílý kruh bezpečí, ROSA, proFem, Konsent, Loono, IDZP, Mamma HELP,
Liga proti rakovině).

Ke každému kandidátovi: název a co měří · přímá URL datasetu (ne homepage) · formát
(CSV/JSON/XLSX/JSON-stat/SDMX/web tabulka) · frekvence · granularita (CZ/kraj/okres/
poskytovatel/věk/pohlaví) · mezinárodní benchmark (OECD Health Statistics, Eurostat
`hlth_*`, ECDC, WHO, EU-SILC, FRA EU surveys, ENISA, OECD Going Digital) · kontrola duplicity. **Vyluč**: bez stabilního zdroje (jednorázová
studie — leda jako `monitoring`), jen mikrodata, neveřejné / paywall.

### 9.2 Výběr (scoring 0–3 za kritérium)

1. HSPA relevance (oblast Výsledky/Výstupy/Procesy/Struktury + dimenze zdravi /
   dostupnost / kvalita / bezpecnost / efektivita / spravedlnost) ·
2. politická páka (úhradová vyhláška, legislativa, kapitační indikátor, dotační program,
   kampaň) · 3. mezinárodní benchmark (OECD/EU nebo ≥ 2 sousedé DE/AT/PL/SK) ·
4. nová informace (neopakuje dashboard) · 5. kvalita dat (metodika, řada ≥ 3 body,
   transparentní revize). Remíza → oblast **Procesy**. Do těla PR (sekce „Indikátor") jde
   matice kandidátů, důvod výběru vítěze, klíčové hodnoty (CZ, OECD, EU, trend), odkazy na
   primární zdroj + benchmark a test plan.

### 9.3 Doručení

A. **Metodická karta** `indicators/{id}.json` dle existujících karet — všechna pole:
`id, name, area, domain, subdomain, definition, unit, direction, data_source { primary
{ type, endpoint, dataset, dimensions }, fallback }, benchmark_source { type, code,
dataset, value, url }` (bez publikovaného benchmarku `type: narrative_only` + kontext
v `dataset`, viz `sex_unmet_need_pece`), `signal_thresholds { good, warn }, frequency,
stewards, method_notes, limitations, determinants?, importance?, patient_story`
(**povinné**, 4 odstavce, 200–500 slov: konkrétní scéna · datový kontext · strukturální
faktory · politická páka; hodnoty **literálně** shodné s `data/indicators.json`),
`framework (hspa | monitoring), dimension`.
B. **Seed** v `data/indicators.json`: `value, unit, year, trend` (≥ 3 body), `benchmark
{ oecd, eu }` (aspoň jeden), `signal` (vypočtený), `direction`, `source { name, url,
fetched_at, origin: "seed" }`, `method_card_url`. Případně mapping v `ingest/mapping/`.
C. **Článek** k indikátoru podle bloku E (8.3–8.5): hero čísla → stav v ČR → mezinárodní
srovnání → strukturální analýza → politická páka → související indikátory + zdroje;
odkazy na **primární** zdroj; `linked_indicators` obsahuje nový indikátor.
D. Verifikace: `npm run validate:data`, `npm run validate:articles`,
`node scripts/audit-patient-stories.js`, `npm test`. Počty indikátorů ve statickém
HTML **nebumpuj** (dělá `site-stats.js`).

Inspirace, kde se ČR systémově neměří, ale data existují: never events (NRH), paliativní
péče (ČSPM), CDZ a sebevraždy adolescentů, equity (gender pay gap, regionální primární
péče), eHealth (portál pacienta, ePreskripce), klimatická resilience nemocnic, KPR
registr, AMR zvířata vs lidé (SVS + SÚKL), adherence dle DDD, dětská stomatologie,
burnout (ČLS JEP, komory), otevřenost zdravotnických dat.

Commit: `feat(indikator): {name} z {zdroj}`.

---

## 10. Blok G — Údržba korpusu

### 10.1 Auto-fix (každý běh, bez ověřování u redakce)

Jen mechanické, nízkorizikové úpravy — **žádná změna čísla, tvrzení ani datace**:

- `missing-cover`: `node ingest/scripts/generate-article-cover.js <slug>` +
  `node ingest/scripts/inject-article-covers.js <slug>` (kompas přidá generátor sám;
  publikace dává cover automaticky přes `scripts/publish-scheduled.js`, takže u
  publikovaného článku je to výjimka — dořeš ji).
- rozbité interní odkazy (`href="clanek-*.html"` na neexistující soubor) → správný slug
  nebo odstranit; chybějící `alt`, prázdné `aria-label`, zjevné překlepy v HTML; rozbitý
  `figcaption`/zdroj u AV figury.
- `missing-indicators`: doplň 1–3 vazby `linked_indicators` (tag ve slovníku;
  `node scripts/normalize-article-metadata.js`).

Commit: `fix(clanky): auto-fix — covery, odkazy, alt (N článků)`.

### 10.2 Review (jen kvartální okno 2.–8. den čtvrtletí, max 5 článků za běh)

Vyber podle dopadu (legislativa s nastalou účinností > nová vlna dat > drobnost) články
s `date-passed`, `check-sources`, `check-literature`, `claims-drift`, `topical-expired`:

- **Ověř posun**: prioritní odkazy přes WebFetch (zákon, ELI, tisk, TZ MZ, dataset).
  Blokovaná doména → nehádej, bod do „K rozhodnutí". U `date-passed` zjisti, zda událost
  skutečně nastala.
- **Odkazy na studie** (`check-literature`) neověřuj HTTP 200, ale přes `PubMed`
  (§ 2.1): shoda citace, DOI, typ publikace; retrakce/erratum = posun nastal → přepsat
  s výhradou nebo odstranit, PMID + datum do `audit:`; nesoulad citace (autor/rok/časopis
  nesedí) = bod do „K rozhodnutí". Tvrzení o jediné studii →
  `Consensus`; opak → nepřepisuj, bod do „K rozhodnutí" (issue) s DOI přehledů; souhlas
  → do `audit:` „Consensus {datum}: v souladu, přehled DOI…".
- **Posun nastal + primární zdroj** → aktualizuj (budoucí čas → aktuální stav, výsledek,
  datum vyhlášení, ELI), `<figcaption>`/zdroje, `review-pending`, `audit:` `last_reviewed`
  + `notes`; `published` neměň; perex ↔ description; checklist K na změněné pasáže.
- **Nejisté** → obsah beze změny, bod do „K rozhodnutí" (issue jen u publikovaného
  článku s klíčovým tvrzením); volitelně do `audit:` poznámka „sken: ke kontrole {datum}".
- **Mimo články**: z reportové sekce „Mimo články" (metodické karty, `drafts/`) vezmi
  2–3 soubory, zkontroluj URL (studie přes PubMed), mrtvý odkaz oprav (u draftu oprav
  draft, ať se chyba nepublikuje), po kontrole zapiš `{"<cesta>": "RRRR-MM-DD"}` do
  `data/link-check-log.json` → `checks` — skener soubor pak 14 dní vynechává.
- **Grafika** (jen když zbývá kapacita): článek s doloženými čísly bez AV figury → doplň
  z design systému (pravidla 8.4).

Commit: `fix(clanky): revize {slug} — {co se aktualizovalo}` / `feat(clanky): AV doplnění {slug}`.

Mimo kvartální okno se `review` položky **jen vypíší** do těla PR („Co zbývá na
kvartální okno: N položek"). Výjimka: `date-passed` u článku o legislativě, kterou blok
D právě posunul — ten se řeší hned (max 1 za běh).

---

## 11. Blok H — Týdny zdraví (draft dalšího marquee dne)

Registr `data/awareness-weeks.json`, plán `PLAN-TYDNY-ZDRAVI.md`. Aktivní týden se vybírá
automaticky podle data; **cron `awareness-weekly.yml`** (`scripts/awareness-rotate.js`,
pondělí 04:00 UTC) archivuje doběhnuté (`ready` → `archived`) a nejbližší **hotový**
`draft` v okně 14 dní překlopí na `ready`. Ty píšeš drafty, cron přepíná; nikdy
nepřepínáš `status` ručně, nepřekrýváš intervaly, nenasazuješ týden bez obsahu.

**Spouštěč**: nejbližší nadcházející marquee den do **42 dní** nemá záznam, nebo má jen
neúplný draft (draft musí být v `main` dřív, než ho cron 14 dní před startem uvidí —
proto rezerva).

Postup: (1) ověř termín z oficiálního zdroje (WHO/WABA/organizace) → `observance`,
`observance_source`, `observance_url`, `start`, `end` (skutečný termín, ne nutně
po–ne), `theme`; (2) copy: `kicker`, `title`, `lead`, `popup { headline, body, cta }`,
`microsite.sections[]` (`h`, `kind` ∈ articles|indicators|prevention|tools, `intro`),
`context { why, affects[], cz }` (**povinné**; `cz` na datech kontraktu), volitelně
`origin`, `celebrate[]`; (3) propoj: `linked_articles[]`, `linked_indicators[]`,
`linked_prevention_themes[]`, `linked_tools[]` — microsite nesmí být prázdná: **aspoň
jeden publikovaný článek NEBO aspoň jeden indikátor** (chybí-li článek, opři se
o indikátory, nebo článek připrav blokem E jako draft); (4) ulož jako
`status: "draft"`; (5) `npm run validate:awareness-weeks` + `tests/awareness-weeks.test.js`
(pozor na escaping `„…\"`). Kritéria `assessReadiness()`: existující cíle, vyplněný
kontext a popup, microsite neprázdná. Chybí-li vhodný obsah, den přeskoč a poznamenej
to v PR. Archivace nic nemaže — archivovaný týden zůstává na `tyden.html?id=<id>`
a v sitemapě jako stálý rozcestník.

Commit: `content(tydny): draft {id} — {observance}`.

---

## 12. Blok I — Evidence-audit (neděle)

Podle `05_M1_Starter/PROMPT_EVIDENCE_AUDIT.md` (závazný: verdikty, co smíš měnit, stropy).
Bez `PubMed` blok přeskoč s hlášením.

1. `npm run evidence:queue -- --status` (do PR).
2. Spusť workflow `.claude/workflows/evidence-audit.js` s argumenty
   `{"today": "RRRR-MM-DD", "run_id": "ea-RRRR-MM-DD-01", "articles": 6, "indicators": 4}`.
   Není-li Workflow k dispozici, proveď FÁZE 2–4 přes Agent tool (rešerše Sonnet,
   adjudikace a zápis Opus, sériově).
3. Po návratu: registr `data/evidence-audit.json`, `npm run validate:evidence`; položky
   `contradicted` = `flagged` + bod do issue (§ 0); prose se nepřepisuje, nové claims
   nevznikají. Souhrn (počty verdiktů, PMID/DOI) do těla PR.

Commit: `data(evidence-audit): dávka ea-RRRR-MM-DD-01 — N článků + M indikátorů`.

---

## 13. Blok J — Newsletter (pátek)

Newsletter odesílá **GitHub Actions `newsletter-weekly.yml`** (čtvrtek 07:33 UTC,
`scripts/newsletter-run.js`): kampaň v Brevu naplánovaná na pátek 11:00 Europe/Prague,
evidence `data/newsletter-log.json`. Rutina ho **neduplikuje** — v pátek jen ověří:

1. `data/newsletter-log.json` (na `origin/main`) má záznam se `scheduled_for` = dnešek
   a v Brevu (`mcp__Brevo__email_campaign_management_get_email_campaign`) je kampaň ve
   stavu naplánováno, `recipients.lists = [2]`, `scheduledAt` sedí → nic nedělej, jen
   řádek do PR.
2. Záznam chybí nebo kampaň neexistuje (workflow selhal) → **fallback A**: spusť znovu
   workflow `newsletter-weekly.yml` přes `mcp__github__actions_run_trigger` s inputem
   `friday` = dnešní datum (workflow má klíče v secrets a předá `--friday=`; bez data by
   `nextFridayYmd()` skočil na příští pátek). Po doběhu ověř bod 1 znovu. Lokálně jen
   `node scripts/newsletter-run.js --offline --dry-run --friday=$(date +%F)` na kontrolu
   výběru — rutina API klíče nemá, ostrý běh skriptu v session nespouštěj.
3. Nejde-li workflow spustit → **fallback B, runbook přes MCP `Brevo`**: kandidáti =
   publikované, viditelné články, jejichž slug není v žádné kampani logu; vyber 3–4
   (nejnovější; max 1 „Z archivu" starší ~60 dní a nadčasový; první = hero); 1 indikátor
   (čerstvý / zajímavý signál / ladí s hero; ne `featured_indicator` z posledních ~4
   kampaní); méně než 2 nové články a žádný archivní → vydání přeskoč. Florencin úvod
   120–180 slov, 2–4 odstavce (pozdrav a čím týden žije · hlavní článek s jedním číslem ·
   indikátor lidskou řečí s benchmarkem a rokem · rozloučení), první osoba, bez
   vykřičníků a AI klišé, čísla se zdrojem a rokem; anotace 1–3 věty vlastními slovy;
   nová částka Věstníku MZ od minulého vydání → jedna věta + odkaz `/vestniky-mz`, jinak
   sekci vynech; blok `promo` jen s kickerem „mimo redakci", ne v hlase Florence.
   Jazykový checklist: české uvozovky „takto", pomlčka –, desetinná čárka a mezera
   v tisících, % s mezerou, pevné mezery u jednotek, vykání, žádné anglicismy, subject
   ≤ 65 znaků s hlavním sdělením v první polovině, preheader neopakuje subject. Spec JSON
   → `node scripts/newsletter-build.js spec.json > newsletter.html` → vizuální kontrola
   (headless screenshot, každý odkaz `curl -sIL` → 200, absolutní `skorezdravotnictvi.cz`,
   `{{ unsubscribe }}` beze změny) → kampaň `mcp__Brevo__email_campaign_management_create_email_campaign`:
   `name: HSPA newsletter — RRRR-MM-DD (pátek)`, `sender {"name":"HSPA Monitor · Skóre
   zdravotnictví","email":"josef@josefpavlovic.cz"}`, `replyTo` tentýž, `recipients
   {"listIds":[2]}`, subject + previewText ze specu, `scheduledAt` = dnes `11:00`
   s aktuálním offsetem Europe/Prague, bez `tag` (Free plán) → zpětný GET: naplánováno,
   `scheduledAt` sedí, `recipients.lists = [2]`, HTML obsahuje všechny články. Záznam do
   `data/newsletter-log.json` → `campaigns[]` (`brevo_campaign_id, name, subject,
   scheduled_for, articles[], featured_indicator`) commitni **hned po naplánování**
   (duplicita je horší než vynechání — nejistota = ber článek jako už poslaný).
4. Je-li už po 10:00 místního času, vydání přeskoč a zapiš to do PR (okno na lidskou
   kontrolu by nezbylo). Nikdy neposílej hned.
5. Chyba Breva (IP autorizace, limit 300/den) → neopakuj naslepo, přesnou chybu do PR.

---

## 14. Blok K — Nezávislý audit (čerstvý pohled, jiná instance)

Na **každý** nový nebo změněný článek, kartu indikátoru a draft Týdne zdraví. Auditor
dostane jen soubor a tento checklist, ne rámec autora.

**A. Faktická tvrzení** — u každého čísla, instituce, zákona, data, citace: primární
zdroj → hodnota, rok/vlna, kontext → OK (doplň přesný odkaz s datem) / zastaralé
(aktualizuj) / neověřitelné (smaž nebo výhrada + zdroj odhadu) / špatně interpretované
(přepiš).
**A2. Studie** — každé „studie ukazuje", DOI/PubMed odkaz: `PubMed` shoda autorů, roku,
časopisu, názvu; typ publikace (retrakce/erratum/komentář/preprint → přepiš nebo vynech);
abstrakt nese přesně to, co článek tvrdí; jediná studie → `Consensus`; bez konektoru
tvrzení vynech nebo `flagged`.
**B. Odkazy** — HTTP 200, cílová stránka obsahuje tvrzené; stabilní permalinky (DOI, ELI,
id tisku); u kritických archivní snapshot; originální dataset před PDF.
**C. Legislativa** — přesné č./rok Sb., § a odst.; platnost a účinnost; aktuální znění
novelizovaných ustanovení; stav legislativního procesu u návrhů.
**D. Mezinárodní srovnání** — stejný rok, konzistentní jednotky a definice (head count vs
FTE, akutní vs dlouhodobá lůžka); OECD vs Eurostat rozpor → oba s vysvětlením.
**E. Citace osob** — stenoprotokol, TZ nebo přímý zdroj; bez zdroje smaž; „odborníci
doporučují" → konkrétní guideline / společnost / WHO.
**F. AV počítadla** — `data-value` jen číslo (ne rok data, ne range); „~1 000" →
`data-prefix`; „50+" → `data-suffix`.

Výsledek: bez nálezu → `chore(audit): {slug} — ověřeno`; < 5 drobností → oprav +
`chore(audit): {slug} — opraveno N nálezů`; klíčové tvrzení bez zdroje → `audit-status:
flagged`, `published` zůstává `false`, bod do issue (§ 0).

---

## 15. Blok L — Uzávěrka

```bash
cd 05_M1_Starter
npm run validate:all
npm run build:generated && npm test        # drift testy nad čerstvými artefakty
git checkout origin/main -- data/search-index.json data/diagnoza-index.json data/souvislosti.json src/styles.min.css
git status --short                          # žádné generované artefakty, žádné reports/ ani discovery/
```

1. Validace a testy musí projít; při chybě jedna oprava, jinak dotčený soubor z commitu
   vyřaď a napiš to do PR. Cover generování vyžaduje `@resvg/resvg-js` (v dependencies).
2. **Nic ke commitu** (běh jen doplnil Buffer / ověřil newsletter / nenašel nic) → PR
   nezakládej, větev nepushuj, skonči závěrečnou zprávou (tabulka Bufferu + „bez změn
   v repu").
3. Jinak `git push -u origin claude/rutina-RRRR-MM-DD` (při síťové chybě 4 pokusy 2/4/8/16 s)
   a **jeden PR** přes MCP GitHub (`create_pull_request`, ready for review, base `main`).
4. **Issue** jen za podmínek § 0 — jedna, s body z „K rozhodnutí" označenými ⚠️.
5. Trailer PR: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

**Tělo PR** (jediný report běhu):

```markdown
## Rutina RRRR-MM-DD — {hlavní výstup}

### Souhrn
- Obsah dne: {ARTICLE-WRITE | EVERGREEN-WRITE | INDICATOR-ADD | ARTICLE-REVISE | FALLBACK-AUDIT | žádný} — {slug} (KPI: …) · dní od posledního nového článku: N · týdenní kvóta X/3
- Indikátor: {id / —} · Legislativa: N posunů · Barometr: N změn stavů, N verdiktů
- Údržba: N auto-fix, N revizí (kvartální okno: ano/ne) · Týdny zdraví: {id / —} · Evidence-audit: {run_id / —}
- Buffer: FB a→b, IG a→b, X a→b (+ Story FB/IG) · Newsletter: {ověřeno / fallback / —}
- Přeskočené bloky a proč: …

### K rozhodnutí redakce
- ⚠️ {bod, který šel do issue #N} / (nic)
- {body, které stačí zvážit při schvalování}

### Verifikace
- validate:all ✅ · npm test ✅ (N testů) · konektory: PubMed ✅ Consensus ✅ hlidac_statu ✅ Buffer ✅ Brevo —
- Literatura: N citací ověřeno v PubMed (PMID/DOI), N tvrzení prošlo Consensus kontrolou (souhlas N / rozpor N / nejasné N), N neověřeno pro chybějící konektor

<details><summary>Discovery</summary>
… (šablona 6.3)
</details>
<details><summary>Routing a datový rámec</summary>
…
</details>
<details><summary>Indikátor (jen INDICATOR-ADD)</summary>
matice kandidátů (0–3 × 5 kritérií) · důvod výběru · klíčové hodnoty CZ / OECD / EU / trend · odkazy: primární dataset + benchmark · test plan (validate:data, audit-patient-stories, npm test)
</details>
<details><summary>Audit K</summary>
{slug}: A ✅ A2 ✅ B ✅ C ✅ D ✅ E ✅ F ✅ — nálezy: …
</details>
<details><summary>Buffer — detail</summary>
…
</details>
```

Závěrečná zpráva session = odkaz na PR (nebo „bez změn v repu") + tři řádky souhrnu.

---

## 16. Pojistky (hard limits, shrnutí)

- 1 větev, ≤ 1 PR, ≤ 1 issue, 0 souborů-reportů v repu, 0 komentářů na GitHubu.
- ≤ 1 nový článek; ≤ 1 nový indikátor; ≤ 5 obsahových revizí (jen kvartální okno);
  ≤ 1 verdikt Ověřovny; evidence-audit ≤ 10 položek; Buffer ≤ 10 feed postů/kanál.
- Nikdy `published: true`, `audit-status: verified`, merge, `shareNow`, okamžité odeslání
  newsletteru, mazání cizí fronty, `number` u článku, bump počtů v HTML.
- Obsah se mění jen s primárním zdrojem; jinak bod „K rozhodnutí". Při nejistotě
  o rozsahu (přepis celé sekce, architektonická změna) → nech redakci.
- Generované artefakty (`search-index`, `diagnoza-index`, `souvislosti`, `styles.min.css`)
  se **nikdy** necommitují; před commitem je resetuj (blok L).
- Redakční bannery do publikovaných článků nikdy (`validate:articles`).
- PubMed/Consensus stropy § 2.1; provozní texty nástrojů nikam.

---

## 17. Na vyžádání (není součástí běhu)

- **Plný restart fronty Bufferu** (jen na výslovný pokyn vlastníka, po nasazení nových
  karet — ověř HTTP 200): per kanál `list_posts status:["scheduled"]`, maž jen s
  `allowedActions.deletePost`, po jednom, nikdy `sent`; pak postav frontu znovu blokem B;
  nahlas smazáno → zařazeno → stav.
- **Větší dávka evidence-auditu** (`articles` 12 + `indicators` 8, strop 20) — spustí
  redakce ručně podle `PROMPT_EVIDENCE_AUDIT.md` § „Jak spustit".
- **Střet zájmů v PPO** — `PROMPT_STRET_ZAJMU_ROUTINE.md` čeká na schválení vlastníkem;
  do rutiny se zařadí až pak (jako blok s vlastním kalendářem).

---

## 18. Jak to běží jako Routine

Jedna Routine v Claude Code on the web (zakládá vlastník; přesný postup v
`docs/scheduled-sessions.md`):

| Parametr | Hodnota |
|---|---|
| **Název** | `HSPA – rutina` |
| **Prompt** | `Spusť dnešní běh podle PROMPT_ROUTINE.md v kořeni repozitáře hspa. Projdi bloky A–L přesně podle souboru, dodrž kalendář (§ 3) a pravidla šumu (§ 0) a na konci otevři nejvýš jeden PR podle bloku L. Zásadní je validace a ověření všech zdrojů.` |
| **Cron (UTC)** | `0 1 * * *` — 03:00 CEST / 02:00 CET: po půlnočních změnách, před `publish-articles.yml` (04:00 UTC), `awareness-weekly.yml` (po 04:00 UTC) i `newsletter-weekly.yml` (čt 07:33 UTC); 2. den čtvrtletí už vidí data z `refresh.yml` (1. den 06:00 UTC). |
| **Konektory** | GitHub · `PubMed` · `Consensus` · `hlidac_statu` · `Buffer` · `Brevo` |
| **Repo / větev** | `veritasderman-rgb/hspa`, `main` (rutina si větev zakládá sama) |

Dřívější Routines (`HSPA - clánky`, `HSPA - indikatory`, `Social HSPA`, `Kontrola HSPA`,
`HSPA Newsletter`) se **vypnou nebo smažou** — jejich prompt soubory byly z repa
odstraněny (2026-09-13), tento soubor je jediný zdroj pravdy. GitHub Actions crony
(`publish-articles`, `refresh`, `nightly-scan` kvartálně, `awareness-weekly`,
`newsletter-weekly`, `social-generate` + `social-publish` (Notion pipeline, plní tutéž
frontu Bufferu — blok B s tím počítá), `regenerate-artifacts`, `ga4-stats`) zůstávají —
rutina na ně navazuje, nenahrazuje je.

## Cíl

Každý den jeden běh, jeden PR, jedna věc ke schválení: korpus **roste** (1 kvalitní
článek), zůstává **aktuální** (legislativa a barometr každý den, sweep kvartálně),
**doložený** (každé číslo primární zdroj, studie ověřené v PubMed) a **viditelný**
(Buffer plný, newsletter pod kontrolou, Týdny zdraví připravené dopředu). Lepší žádná
změna než zbytečná.
