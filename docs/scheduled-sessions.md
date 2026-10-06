# Naplánovaná session (Routine) — jak zapnout jedinou rutinu agenta

> **Stav (2026-10-06):** projekt má rutinu **autorky** a od AI-first provozu k ní přibývají editor, porada a ombudsman (§ 1b).
> Původní text: projekt má **jednu** rutinu agenta. Její úplné znění je
> [`PROMPT_ROUTINE.md`](../PROMPT_ROUTINE.md) v kořeni repozitáře — bloky A–L,
> kalendář (§ 3) a pravidla šumu (§ 0). Dřívější rutiny (denní články, noční údržba,
> indikátory, Social, Newsletter, Týdny zdraví) jsou v ní sloučené; jejich prompt
> soubory už v repu nejsou.
>
> Nastavení plánovače (Claude Code on the web → **Routines**) dělá **vlastník účtu** —
> agentní session k jeho plánovači nemá přístup. Tento dokument je návod krok za krokem.

---

## 0. Předpoklady

| Předpoklad | Proč | Jak ověřit |
|---|---|---|
| Repozitář `veritasderman-rgb/hspa` připojený k účtu Claude Code on the web | Routine potřebuje environment navázaný na repo, aby četla `PROMPT_ROUTINE.md` a otevírala PR | claude.ai/code → repo je v seznamu |
| GitHub oprávnění k PR a issue | Blok L otevírá jeden PR (a nejvýš jednu issue) za běh | ruční zkušební běh vytvoří PR |
| MCP `PubMed` + `Consensus` | ověřování citací a evidence (§ 2.1) — bez nich rutina literaturu **neověřuje** a napíše to do PR | v ruční session jsou vidět `mcp__PubMed__*`, `mcp__Consensus__*` |
| MCP `hlidac_statu` (veřejný, bez klíče) | discovery VeKLEP / smluv / ÚOHS, blok D | dostupný automaticky |
| MCP `Buffer` na účet s kanály FB `Skóre zdravotnictví Česko`, IG `skorezdravotnictvi`, X `SkoreZdravko` | blok B plní frontu | `get_account` / `list_channels` vrátí kanály |
| MCP `Brevo` | blok J (pátek) ověřuje naplánovanou kampaň, fallback ji zakládá | `get_account` projde |

---

## 1. Založení Routine

1. Otevři **claude.ai/code** → projekt/environment repa `veritasderman-rgb/hspa`, branch `main`.
2. **Routines** → **New routine**.
3. Vyplň:

| Parametr | Hodnota |
|---|---|
| **Název** | `HSPA – rutina` |
| **Prompt** | `Spusť dnešní běh podle PROMPT_ROUTINE.md v kořeni repozitáře hspa. Projdi bloky A–L přesně podle souboru, dodrž kalendář (§ 3) a pravidla šumu (§ 0) a na konci otevři nejvýš jeden PR podle bloku L. Zásadní je validace a ověření všech zdrojů.` |
| **Cadence / cron (UTC)** | `0 1 * * *` — jednou denně, 03:00 CEST / 02:00 CET |
| **Konektory** | GitHub · `PubMed` · `Consensus` · `hlidac_statu` · `Buffer` · `Brevo` (ostatní nejsou potřeba) |
| **Model** | výchozí model účtu (rutina si sama deleguje bloky na Sonnet/Opus přes Agent tool, viz § 1 souboru) |
| **Notifikace** | zapni push/e-mail po dokončení — ráno pak stačí otevřít PR |

   Prompt je jedna věta s odkazem na soubor, **ne kopie souboru** — soubor je zdroj
   pravdy a mění se PR-y; kopie v UI by se rozešla.
4. Ulož a spusť **Run now** na první test.

**Proč 01:00 UTC**: po půlnočních změnách; před `publish-articles.yml` (04:00 UTC),
`awareness-weekly.yml` (pondělí po 04:00 UTC — draft Týdne zdraví je připraven dřív)
i `newsletter-weekly.yml` (čtvrtek 07:33 UTC — páteční kontrola už vidí výsledek);
2. den čtvrtletí vidí data z kvartálního `refresh.yml` (1. den 06:00 UTC). Cron je
v UTC — po změně letního/zimního času se místní čas posune o hodinu, což nevadí.

---

## 1b. Další rutiny AI-first provozu (GOVERNANCE.md § 4)

Stejný postup jako v § 1, jen jiný název, prompt, cron a konektory. Zakládají se
postupně podle fází v [`ai-first-rollout.md`](ai-first-rollout.md) — editor hned,
porada a ombudsman až po první fázi.

| Routine | Prompt (jedna věta) | Cron (UTC) | Konektory | Fáze |
|---|---|---|---|---|
| `HSPA – editor` | `Spusť dnešní běh editora podle PROMPT_EDITOR.md v kořeni repozitáře hspa. Dodrž pojistky § 0, zpracuj otevřené PR z větví claude/* podle tříd brány a skonči závěrečnou zprávou § 6.` | `0 5 * * *` | GitHub · `PubMed` | 1 |
| `HSPA – porada` | `Spusť týdenní poradu podle PROMPT_PORADA.md v kořeni repozitáře hspa: sesbírej metriky, přepiš sekci Priority týdne v 05_M1_Starter/PLAN-PRACE.md, otevři jeden PR a nejvýš jednu issue s rozhodnutími pro vydavatele.` | `30 5 * * 1` | GitHub · `Brevo` · `Buffer` | 2 |
| `HSPA – ombudsman` | `Spusť běh ombudsmana podle PROMPT_OMBUDSMAN.md v kořeni repozitáře hspa v režimu uvedeném v § 6. Dodrž pojistky § 0 a skonči závěrečnou zprávou § 4.` | `0 6 * * 1-5` | `Gmail` · GitHub | 2 |

Stav 2026-10-06: `HSPA – editor` je založená (`trig_01RYcBtKT29MCRCpn6gQZ6Hs`), zatím
**vypnutá** — zapnout po merge brány (`pr-gate.yml`) a v jejím nastavení doplnit konektor
`PubMed` (session, která ji založila, konektory předat nemohla). První týden `Run now`.

Pořadí v ránu: autorka 01:00 → publikační cron 04:00 → editor 05:00 → (pondělí) porada
05:30 → ombudsman 06:00. Každá rutina čte jako první krok kill switch
(`node 05_M1_Starter/scripts/ai-provoz.js check`); workflow `ai-provoz.yml` ho přepíná.

**Jedna session = jedna role.** Nikdy nespouštěj editora v session, která ten den
psala jako autorka — smysl editora je čerstvý pohled.

---

## 2. Co vypnout

Ve stejné sekci **Routines** vypni (nebo smaž) dřívější záznamy — jejich prompty
odkazují na soubory, které už neexistují:

| Routine | Byla | Nahrazuje blok |
|---|---|---|
| `HSPA - clánky` | `8 3 * * *`, `PROMPT_DAILY_ROUTINE.md` | C, E, K |
| `HSPA - indikatory` | `5 1 * * *`, vlastní prompt v UI | F (pondělí / reaktivně) |
| `Social HSPA` | `0 2 * * *`, `PROMPT_SOCIAL_ROUTINE.md` | B |
| `Kontrola HSPA` (už vypnutá) | `0 0 * * *`, `PROMPT_NIGHTLY_ROUTINE.md` | A, D, G |
| `HSPA Newsletter` (už vypnutá) | `0 7 * * 4`, `PROMPT_NEWSLETTER_ROUTINE.md` | J (+ GitHub Actions) |

GitHub Actions crony zůstávají beze změny (`publish-articles`, `refresh`, `nightly-scan`
kvartálně, `awareness-weekly`, `newsletter-weekly`, `regenerate-artifacts`, `ga4-stats`) —
rutina na ně navazuje.

---

## 3. Jak ověřit, že rutina běží

1. **GitHub**: ráno je nejvýš jeden nový PR `rutina RRRR-MM-DD: …` z větve
   `claude/rutina-RRRR-MM-DD`. Tělo PR je celý report běhu (Souhrn · K rozhodnutí ·
   Verifikace · rozbalovací Discovery, Routing, Audit, Buffer). Když běh nezměnil nic
   v repu (jen doplnil Buffer), PR nevznikne — to je v pořádku, stav je v transkriptu.
2. **Issues**: nejvýš jedna `rutina RRRR-MM-DD: k rozhodnutí redakce (N bodů)`, a jen
   když něco skutečně vyžaduje rozhodnutí. Starší otevřená issue se doplňuje komentářem.
3. **Routines → Runs**: čas, stav, transkript. Závěrečná zpráva každého běhu má odkaz na
   PR (nebo „bez změn v repu") a tabulku Bufferu.
4. **Buffer**: fronta 10 feed příspěvků na kanál + Story na FB/IG. Plné fronty → běh
   nahlásí „nic nepřidáno".
5. **Po týdnu**: v `data/articles.json` přibývají `published: false` záznamy s rostoucím
   `scheduled_for` (fronta se plní, `publish-articles.yml` je pouští ven max 1/den);
   v pondělí přibyla metodická karta v `indicators/`; v neděli záznamy v
   `data/evidence-audit.json`.

Když PR nevznikl a měl (transkript ukazuje hotový článek): typicky chybějící GitHub
oprávnění nebo síťová politika prostředí — rutina to sama hlásí, nehádá.

---

## 4. Alternativa přes chat

Vlastník může Routine založit i příkazem ve **vlastní** session (nástroje
`create_trigger` / `update_trigger` claude-code-remote): stejný prompt, cron `0 1 * * *`,
`initiation: human_request`, seznam konektorů výše. Z agentní session to za vlastníka
nejde.

---

## Související

- [`../PROMPT_ROUTINE.md`](../PROMPT_ROUTINE.md) — plné znění rutiny (jediný zdroj pravdy)
- [`../05_M1_Starter/PROMPT_EVIDENCE_AUDIT.md`](../05_M1_Starter/PROMPT_EVIDENCE_AUDIT.md) — protokol evidence-auditu (blok I ho volá)
- [`decisions-log.md`](decisions-log.md) — záznam 2026-09-13 (proč jedna rutina)
- [`../05_M1_Starter/PLAN-PRACE.md`](../05_M1_Starter/PLAN-PRACE.md) — mapa automatizací (GitHub Actions + rutina)
