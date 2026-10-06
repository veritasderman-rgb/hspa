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

## Fáze 1 · týden 1–2: brána a kill switch živě (kroky vydavatele)

Tyto kroky sahají do nastavení GitHubu a plánovače, ke kterým agentní session nemá
(a nemá mít) přístup. Dvě položky jsou soubory workflows — sandbox session je
odmítl zapsat; jsou popsané přesně, aby je šlo založit ručně nebo v session s vaším
souhlasem.

- [ ] **Workflow `pr-gate.yml`** (`on: pull_request` opened/synchronize/reopened/ready_for_review;
  `permissions: pull-requests: write, issues: write`; checkout s `fetch-depth: 0`, Node 22;
  krok v `05_M1_Starter`: `node scripts/pr-gate.js --base origin/<base_ref> --head HEAD --markdown >> $GITHUB_STEP_SUMMARY`
  a `--label-only` → label; krok `gh label create brana-auto|brana-editor|brana-clovek --force`
  a `gh pr edit <n> --add-label <label> --remove-label <ostatní dvě>`, `continue-on-error: true`
  kvůli fork PR). Nic nemerguje.
- [ ] **Workflow `ai-provoz.yml`** (`workflow_dispatch` se vstupy `akce: pozastavit|obnovit`
  a `duvod`; `permissions: contents: write`; v `05_M1_Starter` spustí
  `node scripts/ai-provoz.js pause --duvod "$DUVOD" --kdo "$GITHUB_ACTOR"` nebo `resume`,
  commitne `data/ai-provoz.json` jako `chore(ai-provoz): …` a pushne do `main`;
  `concurrency: ai-provoz`).
- [ ] **Kill switch v cronech**: do `publish-articles.yml`, `social-generate.yml`,
  `social-publish.yml`, `newsletter-weekly.yml`, `awareness-weekly.yml` a `refresh.yml`
  přidat před instalaci závislostí krok
  `- name: Kill switch AI provozu` / `run: node scripts/ai-provoz.js check`
  (working-directory už je `05_M1_Starter`). Při pozastavení job skončí s kódem 1.
- [ ] **Branch protection `main`**: required checks `Deploy check`, `Visual + a11y regression`,
  `Brána PR`; zákaz force-push; „Require linear history" **ne** (repo merguje merge commitem).
  Bez „require approvals" — schválení vyjadřuje editor mergem, člověk třídu C.
- [ ] **Labely**: `rozhodnuti`, `incident` (brána si `brana-*` založí sama).
- [ ] **Routine `HSPA – editor`** podle `PROMPT_EDITOR.md` § 7 (cron `0 5 * * *`, konektory GitHub + PubMed).
  První týden spouštět **ručně** (`Run now`) a číst jeho závěrečné zprávy.
- [ ] Zkouška kill switche: spustit `ai-provoz.yml` → pozastavit → ověřit, že `publish-articles`
  ručně spuštěný skončí na prvním kroku → obnovit.

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
