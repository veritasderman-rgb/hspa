# Naplánované session (Routines) — jak zapnout daily/nightly/social rutinu

> **Kontext (U14):** `PROMPT_DAILY_ROUTINE.md`, `05_M1_Starter/PROMPT_NIGHTLY_ROUTINE.md`
> a `05_M1_Starter/PROMPT_SOCIAL_ROUTINE.md` jsou hotové postupy, ale **nemají žádný
> spouštěč** — fungují jen, když je někdo ručně spustí jako Claude Code session.
> Publikační fronta (`publish-articles.yml`) přitom závisí na tom, že ji daily
> rutina průběžně plní, a Buffer fronta na tom, že ji plní social rutina.
>
> Nastavení plánovače (Claude Code on the web → **Routines**) je krok, který musí
> udělat **vlastník účtu** — z agentní session to nejde (session nemá přístup
> k vlastníkovu nastavení plánovače). Tento dokument je přesný návod krok za
> krokem, jak to vlastník udělá sám. Terminologie „Routines" (naplánovaná
> session) je stejná, jakou už používá `PROMPT_SOCIAL_ROUTINE.md` (§ „Jak to
> zapnout jako routine").

---

## 0. Předpoklady (over check než založíš první routine)

| Předpoklad | Proč | Jak ověřit |
|---|---|---|
| Repozitář `veritasderman-rgb/hspa` je připojený k účtu Claude Code on the web | Routine potřebuje prostředí (environment) navázané na repo, aby mohla číst prompt soubory a otevírat PR/issue | claude.ai/code → repo je vidět v seznamu projektů/environmentů |
| GitHub MCP / oprávnění k PR a issue na repu | Daily i nightly rutina na konci otevírají PR (`mcp__github__create_pull_request`) a případně issue (`issue_write`) | Zkusit ručně spustit jednu rutinu jednou a ověřit, že PR/issue vznikl |
| Buffer MCP připojený (`mcp__Buffer__*`) na účet, kde běží kanály `Skóre zdravotnictví Česko` (FB), `skorezdravotnictvi` (IG), `SkoreZdravko` (X) | Social rutina bez Bufferu nemůže nic udělat | `get_account` / `list_channels` v ruční session vrátí kanály |
| `hlidac_statu` MCP (veřejný, bez API klíče) | Daily i nightly rutina používají discovery kanál Hlídač státu (VeKLEP/Registr smluv/ÚOHS) | Dostupný automaticky, nic není potřeba nastavovat |
| Branch `main` je aktuální a `npm test` / `npm run validate:all` procházejí | Každá routine si zakládá vlastní branch z `main` | `npm test` v `05_M1_Starter/` |

Pokud některý z MCP serverů (GitHub, Buffer) není u účtu, který routine spouští,
připojený, rutina to sama nahlásí a nic nerozbije — ale nebude mít efekt (žádný
PR / žádné doplnění fronty). Nejdřív tedy ověř tuto tabulku, pak zakládej routines.

---

## 1. Kam kliknout — obecný postup pro každou ze tří rutin

1. Otevři **claude.ai/code** (Claude Code on the web) a přihlas se účtem, který
   má repo `veritasderman-rgb/hspa` připojené.
2. Otevři projekt/environment navázaný na tento repozitář (branch `main`).
3. V navigaci najdi sekci **Routines** (naplánované úlohy — v UI může být
   podepsaná i jako „Scheduled tasks" nebo ikonou hodin; přesné popisky se
   mohou v čase mírně měnit, funkce je ale stabilní: „vytvořit novou
   naplánovanou session s daným promptem a cadencí").
4. Klikni **New routine** / **+ Add routine** (nová naplánovaná session).
5. Vyplň:
   - **Environment / repo**: `veritasderman-rgb/hspa`, branch `main` (rutiny si
     větev zakládají samy, viz jednotlivé prompt soubory — daily `daily/{datum}-{slug}`,
     nightly `claude/nightly-{datum}`; social nic nevětví, jen volá Buffer MCP).
   - **Cadence**: viz tabulka v kroku 2 níže (1×/den, konkrétní čas).
   - **Prompt**: přesný text z tabulky v kroku 2 — je to jedna věta s odkazem
     na příslušný `PROMPT_*.md`, ne kopie celého souboru (rutina si soubor
     v session sama otevře a přečte — je to zdroj pravdy, kopírováním do
     promptu jen riskuješ, že se prompt v UI rozejde s aktuální verzí souboru).
   - **Notifikace** (pokud UI nabízí): zapni push/e-mail při dokončení běhu —
     usnadní to krok 3 (ověření).
6. Ulož. Pokud UI nabízí **Run now** / „spustit hned", použij ho na první test
   ihned po založení — nečekej na plánovaný čas, ověříš tím funkčnost hned.

---

## 2. Tři routines — přesné zadání

### 2.1 Daily routine — `PROMPT_DAILY_ROUTINE.md`

> Soubor je **v kořeni repozitáře** (ne v `05_M1_Starter/`) — pozor na cestu.

| Parametr | Hodnota |
|---|---|
| **Prompt** | `Spusť dnešní běh podle PROMPT_DAILY_ROUTINE.md (soubor je v kořeni repozitáře hspa). Projdi fáze 1–5 přesně podle souboru a na konci otevři PR podle sekce „GitHub workflow".` |
| **Cadence** | 1×/den, dopoledne, **po** ranním ingest cronu (`refresh.yml` 08:00 CEST + `ga4-stats.yml` 08:15 CEST) — doporučeno **09:30 Europe/Prague** |
| **Cron (UTC)** | `30 7 * * *` (07:30 UTC = 09:30 CEST v létě / 08:30 CET v zimě — viz poznámka o DST níže) |
| **Proč po ingestu** | Sám soubor to říká v sekci „Co tento prompt explicitně neřeší": *„Tento prompt se spouští po ingest pipeline a využívá výstup."* Discovery fáze 1 má tak k dispozici čerstvá data z dnešního `refresh.yml`. |
| **Co běh vyprodukuje** | Nejvýš 1 nový/revidovaný článek (branch `daily/{YYYY-MM-DD}-{slug}` nebo `daily/{YYYY-MM-DD}-audit` pro fallback), PR s title `daily YYYY-MM-DD: {topic}`, **nikdy** `published: true` (vždy `review-pending`/`flagged`) |

### 2.2 Nightly routine — `05_M1_Starter/PROMPT_NIGHTLY_ROUTINE.md`

| Parametr | Hodnota |
|---|---|
| **Prompt** | `Spusť noční údržbovou rutinu podle 05_M1_Starter/PROMPT_NIGHTLY_ROUTINE.md. Projdi fáze 0–5 přesně podle souboru a na konci otevři jeden PR podle sekce „Fáze 5 — Report + PR".` |
| **Cadence** | 1×/den, v noci, **po** daily rutině i po ranním cronu — doporučeno **22:00 Europe/Prague** |
| **Cron (UTC)** | `0 20 * * *` (20:00 UTC = 22:00 CEST v létě / 21:00 CET v zimě) |
| **Proč v noci** | Sám soubor: *„Běží v noci, po denní rutině i po ranním ingest/publish cronu."* — potřebuje, aby už proběhl dnešní `publish-articles.yml` (06:00 CEST) i případný daily PR. |
| **Co běh vyprodukuje** | `reports/nightly-audit-{datum}.md` (negitovaný, jen v pracovní branchi), max 3–5 obsahových revizí + auto-fixy, branch `claude/nightly-{YYYY-MM-DD}`, PR title `nightly YYYY-MM-DD: údržba korpusu (…)`, případně GitHub issues pro `flagged` nálezy |

### 2.3 Social routine — `05_M1_Starter/PROMPT_SOCIAL_ROUTINE.md`

| Parametr | Hodnota |
|---|---|
| **Prompt** | `Spusť sociální rutinu podle 05_M1_Starter/PROMPT_SOCIAL_ROUTINE.md a postupuj přesně podle jejích fází 0–4.` |
| **Cadence** | 1×/den, ráno, **před** ranním cronem (`publish-articles.yml` 06:00 CEST) — doporučeno **05:00 Europe/Prague** |
| **Cron (UTC)** | `0 3 * * *` (03:00 UTC = 05:00 CEST v létě / 04:00 CET v zimě) |
| **Proč před cronem** | Soubor sám: *„Doporučený čas: ráno (Europe/Prague), klidně před cron pipeline."* — nezávisí na dnešním ingestu, jen doplňuje frontu z už publikovaných článků. |
| **Co běh vyprodukuje** | Žádný commit do repa (rutina do repa nezapisuje) — jen doplní Buffer frontu na 10 příspěvků/kanál (FB/IG/X) + 1 vertikální Story/Reels slot na FB a IG. Výstup je jen textové shrnutí na konci session (viz „Výstup" v souboru). |

**Poznámka k DST (letní/zimní čas):** cron výraz v UTC je pevný, ale
Europe/Prague se dvakrát ročně posouvá (CEST ↔ CET). Pokud plánovač Claude
Code on the web nabízí zadání v místním čase přímo (ne v UTC), použij radši
tu možnost — vyhneš se ručnímu přepočtu. Pokud zadáváš jen UTC cron, po
přechodu na zimní/letní čas (konec března / konec října) přepočítej výše
uvedené hodnoty o hodinu.

---

## 3. Jak ověřit, že rutina skutečně běží

### Daily a nightly (mají PR)
1. Po plánovaném čase zkontroluj GitHub repo `veritasderman-rgb/hspa`:
   - Daily: nová větev `daily/YYYY-MM-DD-*` a otevřený PR `daily YYYY-MM-DD: …`.
   - Nightly: nová větev `claude/nightly-YYYY-MM-DD` a otevřený PR `nightly YYYY-MM-DD: …`.
2. V Claude Code on the web otevři historii běhů dané routine (seznam
   proběhlých sessions/„Runs" u routine) — každý záznam ukazuje čas spuštění,
   stav (úspěch/chyba) a odkaz na transkript session. Otevřením transkriptu
   vidíš celý průběh fáze 1–5 (u nightly 0–5).
3. Pokud jsi zapnul notifikace (krok 1.5), přijde push/e-mail po dokončení
   běhu — to je nejrychlejší způsob kontroly bez nutnosti chodit do GitHubu.
4. Pokud PR nevznikl a přitom měl (např. discovery report existuje, ale žádný
   PR): zkontroluj v transkriptu, jestli nespadl na chybějícím oprávnění
   (GitHub MCP) nebo na síťovém omezení prostředí (routine to sama hlásí,
   nehádá).

### Social (bez PR, jen Buffer)
1. Otevři Buffer (buffer.com) → Publish/Queue pro organizaci a zkontroluj
   počet naplánovaných příspěvků na každém kanálu (cíl: 10 feed + 1 vertikální
   slot na FB a IG).
2. Nebo v Claude Code on the web otevři transkript posledního běhu routine —
   na konci je vždy tabulka „kolik bylo ve frontě → kolik přidáno → kolik teď"
   per kanál (viz sekce „Výstup" v `PROMPT_SOCIAL_ROUTINE.md`).
3. Idempotence: pokud spustíš routine navíc (např. přes „Run now") a fronty
   jsou už plné, běh sám nahlásí „fronty plné, nic nepřidáno" — to je
   očekávané chování, ne chyba.

### Obecná kontrola všech tří (přehled)
- V sekci **Routines** by měly být vidět 3 aktivní záznamy s časem
  posledního a příštího běhu (next run). Pokud je routine omylem `paused`/
  `disabled`, další běh se nezobrazí.
- Po prvním týdnu zkontroluj `data/articles.json` — mělo by přibývat
  `published: false` záznamů s rostoucími `scheduled_for` daty (fronta se
  plní), a `publish-articles.yml` by je měl postupně propouštět ven (max
  1/den) — pokud fronta neroste, daily routine buď neběží, nebo končí ve
  fallbacku (audit) místo tvorby článku, což je v pořádku, pokud discovery
  report nic nenašel.

---

## 4. Co dělat, když plánovač jde nastavit jinak (alternativa)

Pokud si vlastník spustí **vlastní** Claude Code session (ne agentní session
z tohoto repa) a má v ní dostupné nástroje pro plánování (v této dokumentaci
označované jako „trigger"/„routine" nástroje), může routine založit i příkazem
v konverzaci — např. požádat tu session, ať vytvoří naplánovaný trigger s
cron výrazem a promptem z tabulky výše. To je technicky stejný mechanismus,
jaký stojí za UI v kroku 1, jen ovládaný přes chat místo kliknutí. Funguje to
ale jen v **kontextu vlastníkova vlastního účtu** — z jiné (agentní) session
nejde trigger založit „za" vlastníka, proto je primární cestou postup v
kapitole 1–2 výše.

---

## Související dokumentace

- [`../PROMPT_DAILY_ROUTINE.md`](../PROMPT_DAILY_ROUTINE.md) — plné znění denní rutiny
- [`../05_M1_Starter/PROMPT_NIGHTLY_ROUTINE.md`](../05_M1_Starter/PROMPT_NIGHTLY_ROUTINE.md) — plné znění noční rutiny
- [`../05_M1_Starter/PROMPT_SOCIAL_ROUTINE.md`](../05_M1_Starter/PROMPT_SOCIAL_ROUTINE.md) — plné znění sociální rutiny (obsahuje i stručnou verzi tohoto návodu v § „Jak to zapnout jako routine")
- [`../05_M1_Starter/PLAN-PRACE.md`](../05_M1_Starter/PLAN-PRACE.md) — úkol U14 a mapa všech automatizací (GitHub Actions crony + AI rutiny)
