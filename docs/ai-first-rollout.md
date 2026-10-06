# AI-first provoz — plán zavedení na 90 dní a checklist vydavatele

> Doprovod k `GOVERNANCE.md`. Cíl: HSPA Monitor řídí AI v rolích autorka · editor ·
> porada · ombudsman, Josef Pavlovic je vydavatel s odpovědností a kill switchem.
> Měřítkem není počet agentů, ale **hodiny vydavatele za týden** (cíl ≤ 1) a **opravy
> po zveřejnění** (cíl ≤ 2 za měsíc). Žádná právnická osoba nevzniká — projekt běží
> pod fyzickou osobou.
>
> Stav k 2026-10-06: fáze 0 připravena v repu (tento PR), fáze 1 čeká na kroky
> vydavatele níže.

---

## Výchozí stav (proč to jde rychle)

| Co už existuje | Kde |
|---|---|
| Denní rutina autorky s tvrdými stropy (1 PR, 1 článek, žádná publikace) | `PROMPT_ROUTINE.md` |
| Deterministická publikace nejvýš 1 článku denně | `publish-articles.yml`, `scripts/publish-scheduled.js` |
| Registr tvrzení s CI kontrolou citací a nočním drift-checkem | `data/claims.json`, `redakce.html#duveryhodnost` |
| Evidence-audit proti PubMed/Consensus | `PROMPT_EVIDENCE_AUDIT.md`, `data/evidence-audit.json` |
| Byline AI u každého článku a stránka autorky | `src/clanky.js`, `autor-florence.html` |
| CI gate: testy, validátory, vizuální regrese, a11y | `deploy-check.yml`, `visual-a11y.yml` |
| Historie: v posledních 123 commitech 72 Claude, 33 bot, 18 vydavatel (jen merge) | `git log` |

Jediný krok, který dnes dělá člověk každý den, je **merge PR**. Všechno ostatní, co
mu zbývá, je nárazové: priority, vnější vztahy, rozhodnutí.

## Fáze 0 · základ v repu (hotovo tímto PR)

- [x] `GOVERNANCE.md` — ústava: role, rozhodovací matice A/B/C, kill switch, červené linie, opravy, peníze, incidenty, eskalace, metriky
- [x] `05_M1_Starter/scripts/pr-gate.js` + testy — mechanické zařazení PR do třídy podle cest
- [x] `05_M1_Starter/data/ai-provoz.json` + `scripts/ai-provoz.js` + testy — kill switch (fail-safe)
- [x] `PROMPT_EDITOR.md` — nezávislý editor: revize a merge tříd A/B, nikdy C
- [x] `PROMPT_PORADA.md` — týdenní porada: metriky, priority týdne, ≤ 3 rozhodnutí
- [x] `PROMPT_OMBUDSMAN.md` — schránka, opravy, právo na odpověď (první 4 týdny jen draft)
- [x] `docs/incidents.md` — registr incidentů se dvěma zpětně doplněnými záznamy
- [x] `PLAN-PRACE.md` → sekce „Priority týdne" (vlastní ji porada)
- [x] `o-projektu.html` → blok „Kdo tu rozhoduje" se stavem provozu
- [x] blok A rutiny: kill switch, převzetí PR se „změnami vyžadovány", čtení priorit týdne

## Fáze 1 · týden 1–2: brána a kill switch živě

Stav k 2026-10-06 (PR „workflows brány a kill switche"): soubory v repu jsou hotové,
labely založené, Routine editora založená (vypnutá). Vydavateli zbývají dva kroky,
které z agentní session nejdou (proxy GitHubu zápis do nastavení repa nepouští):
**import rulesetu** a **zkouška kill switche** po merge tohoto PR.

- [x] **Workflow `pr-gate.yml`** — `on: pull_request` (opened/synchronize/reopened/ready_for_review),
  job `Brána PR`: `scripts/pr-gate.js --markdown` do shrnutí běhu, `--label-only` → label
  `brana-auto|brana-editor|brana-clovek` (labely si zakládá `gh label create --force`,
  krok má `continue-on-error` kvůli fork PR). Nic nemerguje.
- [x] **Workflow `ai-provoz.yml`** — `workflow_dispatch` se vstupy `akce` (`pozastavit|obnovit`,
  výběr) a `duvod`; `scripts/ai-provoz.js pause|resume --kdo $GITHUB_ACTOR`, commit
  `chore(ai-provoz): …` do `main` s retry přes rebase, `concurrency: ai-provoz`. Bez `npm ci` —
  skript je bez závislostí, kill switch musí fungovat i s rozbitým zbytkem repa.
- [x] **Kill switch v cronech** — `publish-articles`, `social-generate`, `social-publish`,
  `newsletter-weekly`, `awareness-weekly`, `refresh`: krok `Kill switch AI provozu`
  hned po `setup-node`, před instalací závislostí. Stav čte **vždy z `main`**
  (`git show origin/main:…` → `AI_PROVOZ_STATE=… node scripts/ai-provoz.js check`), ne
  z checkoutu — ruční spuštění workflow z jiné větve by jinak kill switch obešlo.
  Ověřeno lokálně: `pause` → `check` končí kódem 1, `resume` → 0, `pause` bez důvodu
  končí kódem 2 a stav nemění.
- [x] **`deploy-check.yml` a `visual-a11y.yml` bez filtru cest** — nutná podmínka pro
  povinné checky: u PR, kde by se workflow kvůli filtru `paths` vůbec nespustil (jen
  docs/, prompty, GOVERNANCE.md), by povinný check zůstal „Expected" navždy a PR by
  nešel zmergovat. Oba workflows teď běží na každý PR; první job `zmeny` zjistí dotčené
  cesty přes API a job `check` / `e2e` se přeskočí, když se PR dashboardu nedotýká —
  přeskočený job GitHub u povinných checků počítá jako splněný. (Dva workflows se
  stejným jménem jobu — původní návrh — GitHub výslovně označuje za nejednoznačné.)
- [ ] **Branch protection `main`** — **krok vydavatele.** Hotový ruleset je v
  [`docs/github-ruleset-main.json`](github-ruleset-main.json): GitHub → *Settings → Rules →
  Rulesets → New ruleset ▾ → Import a ruleset* → vybrat soubor → *Create*. Obsah:
  - povinné checky `check` (Deploy check), `e2e` (Visual + a11y regression), `Brána PR` —
    jména checků jsou **jména jobů**, ne workflows; bez „require branches up to date";
  - zákaz force-push (`non_fast_forward`) a smazání větve; bez „require linear history"
    (repo merguje merge commitem); bez „require approvals" (schválení = merge editora,
    třídu C merguje člověk);
  - **výjimka pro aplikaci GitHub Actions** (`Integration` 15368, bypass `always`): bez ní by
    povinné checky zablokovaly i přímé pushe cronů do `main` s `GITHUB_TOKEN`
    (publikace, newsletter, refresh, regenerace artefaktů, kill switch). Rulesety na
    rozdíl od klasické branch protection tuhle výjimku umí, proto ruleset.
  - Žádná výjimka pro adminy: editor pracuje účtem vydavatele přes MCP, výjimka pro
    admina by bránu obešla. V nouzi ruleset vypne vydavatel v nastavení (`Disabled`).
  - Po importu: otevřené PR bez nového pushe nemají check `Brána PR` — editor je srovná
    `update_pull_request_branch` (merge mainu do větve spustí všechny checky).
- [x] **Labely** `rozhodnuti`, `incident` založeny (`brana-*` si brána založí sama při prvním běhu).
- [x] **Routine `HSPA – editor`** založena podle `PROMPT_EDITOR.md` § 7
  (`trig_01RYcBtKT29MCRCpn6gQZ6Hs`, cron `0 5 * * *`, nová session na každé spuštění,
  notifikace push + e-mail), **vypnutá** — zapne ji vydavatel po merge tohoto PR, až
  brána labeluje; do té doby by editor podle § 0 („bez labelu nemerguj") jen psal
  prázdné zprávy. První týden spouštět **ručně** (`Run now`) a číst závěrečné zprávy.
  ⚠️ Agentní session nemůže Routine přidat konektory — v *Routines → HSPA – editor →
  Connectors* zapnout `PubMed` (ověření citací § 3); bez něj editor citace neověří a
  napíše to do zprávy.
- [ ] **Zkouška kill switche** — **po merge** (workflow musí být na `main`): Actions →
  *AI provoz · kill switch* → Run workflow → `pozastavit`, důvod „zkouška" → ověřit
  commit `chore(ai-provoz): pozastaveno — zkouška` v `main` a stav na *O projektu* →
  Actions → *Publish scheduled articles* → Run workflow → běh musí skončit **červeně na
  kroku „Kill switch AI provozu"** (nic neinstaluje, nic nepublikuje) → *AI provoz · kill
  switch* → `obnovit` → commit `chore(ai-provoz): obnoveno`. Celé do 5 minut.
  Zkoušku lze zadat i agentní session (má `actions_run_trigger` na tohle repo).

**Kritérium postupu do fáze 2**: editor zmergoval ≥ 10 PR tříd A/B, 0 incidentů S1,
≤ 1 S2, žádný PR třídy C zmergovaný editorem.

## Fáze 2 · týden 3–6: AI vlastní plán a schránku

- [ ] **Routine `HSPA – porada`** podle `PROMPT_PORADA.md` § 6 (pondělí `30 5 * * 1`, GitHub + Brevo + Buffer).
- [ ] Vydavatel odpovídá na issue `porada …` komentářem; cíl ≤ 15 minut týdně.
- [ ] **Redakční adresa** pro ombudsmana: vyplnit `PROMPT_OMBUDSMAN.md` § 6 (adresa nebo
  Gmail label, režim `draft`) a zveřejnit ji na *O projektu*; založit Routine `HSPA – ombudsman`
  (pracovní dny `0 6 * * 1-5`, Gmail + GitHub).
- [ ] **Vnější lidský audit**: domluvit jednoho lékaře/epidemiologa a jednoho zdravotnického
  novináře na měsíční hodinu nad vzorkem 5 článků + 5 indikátorů (GOVERNANCE § 11).
  Porada vzorek vybere, nálezy jdou do `docs/incidents.md`.
- [ ] **Pojištění odpovědnosti** fyzické osoby za obsah (Barometr hodnotí výroky politiků) —
  zjistit nabídku; AI připraví podklad, rozhodnutí je vydavatele.

**Kritérium postupu do fáze 3**: 4 porady za sebou, hodiny vydavatele ≤ 2/týden,
ombudsman v draft režimu bez chybného draftu typů 1–3.

## Fáze 3 · týden 7–12: ustálený provoz

- [ ] Ombudsman: zapnout autonomní typy 1–3 (`PROMPT_OMBUDSMAN.md` § 5).
- [ ] Porada navrhne první přesun typu změny z B do A (např. revize metadat článků
  po drift-checku), pokud má ≥ 4 týdny historie a ≤ 1 S2 — vydavatel schválí změnou
  `GOVERNANCE.md` a `pr-gate.js` (třída C).
- [ ] Veřejný „report provozu" jednou měsíčně: tabulka metrik z porady + incidenty jako
  článek rubriky *O projektu* (píše autorka, merguje editor).
- [ ] Revize této ústavy po 90 dnech: co z třídy C zbytečně brzdí, co z B mělo být C.

**Cílový stav**: vydavatel ≤ 1 h týdně (3 rozhodnutí + merge tříd C), ≥ 80 % PR
merguje editor, opravy po zveřejnění ≤ 2/měsíc, všechny S1/S2 v registru do 24 h.

## Co se zavedením NEmění

- Železné pravidlo zdrojů a stropy denní rutiny (`PROMPT_ROUTINE.md` § 0, § 2, § 16).
- Publikace nejvýš jednoho článku denně cronem; nikdo nenastavuje `published: true` ručně.
- Byline AI a odkaz na zdroje u každého článku (toto je zároveň splnění povinnosti
  označovat AI-generovaný text o věcech veřejného zájmu, pokud by lidská redakční
  kontrola jednotlivých textů odpadla — ověřit s právníkem, nespoléhat na tento řádek).
- Generované artefakty se v PR necommitují.

## Rizika a co s nimi

| Riziko | Jak ho držíme |
|---|---|
| Editor sdílí slepá místa s autorkou (stejný model) | jiná session, adversariální checklist s ⛔, vzorkování čísel proti zdroji, PubMed kontrola citací, měsíční vnější lidský audit |
| Více chyb po zveřejnění bez lidského merge | třída C pro vše o osobách a pohotovostech, revert do minut, kill switch, incident do 24 h, rozšiřování pravomocí jen po 4 týdnech bez S2 |
| „AI médium" ztrácí důvěru institucí | veřejná ústava, registr tvrzení, Doložka, incidenty veřejně, odpovědná fyzická osoba jménem |
| Náklady modelu rostou (3–4 běhy denně místo 1) | editor revizi dělá v jedné session bez delegace, porada týdně, ombudsman jen pracovní dny; porada náklady sleduje jako kontextovou metriku |
| Vydavatel přestane odpovídat | konzervativní varianta po 14 dnech (GOVERNANCE § 10), porada to zapisuje, nic se „tiše neschválí" |
