# Porada vedení HSPA Monitoru — týdenní plán a rozhodnutí

> Třetí rutina projektu (GOVERNANCE.md § 4). Porada je jediná role, která smí měnit
> **priority** — ale jen v `PLAN-PRACE.md` → sekce „Priority týdne", nikdy ústavu,
> prompty ani workflows. Smyslem je, aby vydavatel dostal **jednu stránku týdně**
> s nejvýše třemi rozhodnutími, a aby autorka v pondělí věděla, na co se soustředit.
>
> Zdroj pravdy je tento soubor. Prompt v Routines je jedna věta, která na něj odkazuje (§ 6).

---

## 0. Pojistky

- První krok `node 05_M1_Starter/scripts/ai-provoz.js check`; při pozastavení porada
  **proběhne** (je to právě ten moment, kdy vydavatel potřebuje přehled), ale nic
  nemění v repu a výstup dá jen do issue.
- Jeden PR (`claude/porada-RRRR-WW`, třída B: jen `05_M1_Starter/PLAN-PRACE.md`,
  případně `docs/incidents.md`), jedna issue `porada RRRR-WW: rozhodnutí pro vydavatele (N)`
  — a issue jen když N ≥ 1. Existuje-li otevřená issue z minulé porady, doplň ji
  komentářem místo zakládání nové.
- Nejvýš **3 rozhodnutí** týdně, každé s doporučením, termínem a konzervativní
  variantou (co se stane, když vydavatel neodpoví do 14 dnů — GOVERNANCE § 10).
- Porada nezadává práci nad rámec stropů rutiny (1 článek/den, 1 indikátor/týden…).
  Priorita říká **co dřív**, ne **víc**.
- Žádná predikce čtenosti, žádné „AI doporučuje růst"; metriky jsou kontext, cíl je
  poslání (GOVERNANCE § 2).

## 1. Sběr (vše jen čtením)

| Zdroj | Co | Jak |
|---|---|---|
| GitHub | PR za týden podle tříd (labely `brana-*`), kdo mergoval (editor vs. vydavatel), doba PR → merge, otevřené PR třídy C a jejich stáří, issues `rozhodnuti` a `incident` | MCP GitHub `list_pull_requests`, `search_issues` |
| Repo | `docs/incidents.md` (nové S1/S2), `data/articles.json` (publikováno za týden, délka fronty, nejstarší `ready_since`), `data/indicators.json` (nové/změněné), `data/freshness.json`, `data/evidence-audit.json` (poslední dávka) | lokálně |
| Návštěvnost | `data/ga4-stats.json` pokud existuje (plní `ga4-stats.yml`), jinak „bez dat" | lokálně |
| Newsletter | poslední kampaň: odesláno, open, click | MCP `Brevo` (`get_email_campaigns`) |
| Sociální sítě | agregované metriky za 7 dní per kanál | MCP `Buffer` (`get_aggregated_post_metrics`) |
| Hodiny vydavatele | odhad z GitHubu: počet ručních merge × 10 min + komentáře v issues × 5 min + odpovědi na rozhodnutí × 15 min | výpočet, uveď vzorec |

Chybí-li konektor, napiš „bez dat" — nikdy nedoplňuj z paměti ani neodhaduj.

## 2. Vyhodnocení

1. Vyplň tabulku metrik z GOVERNANCE § 12 (hodnota · cíl · trend proti minulému týdnu).
2. Projdi **otevřené body** z minulé porady: splněno / trvá / zrušeno a proč.
3. Pojmenuj **nejvýš 3 priority na příští týden** pro autorku. Priorita = jedna věta
   co + proč (z dat výše) + jak se pozná, že je hotová. Typické důvody: zastaralý
   dataset s novou vlnou, legislativní termín, díra v pokrytí rubriky, incident
   k nápravě, nedokončená série, blížící se Týden zdraví.
4. Sestav **rozhodnutí pro vydavatele** (0–3): věci, které ústava vyhrazuje člověku,
   nebo kde data nedávají odpověď. Ke každému: kontext ve 3 větách, doporučení,
   konzervativní varianta, termín.
5. **Návrhy na změnu pravomocí** (GOVERNANCE § 12) jen pokud má typ změny ≥ 4 týdny
   historie a ≤ 1 incident S2 — pak jako rozhodnutí, ne jako hotovou věc.
6. **Trvalé body**, dokud nejsou vyřešené: vnější lidský audit (§ 11) — kdo a kdy;
   otevřené PR třídy C starší 7 dní; rozhodnutí starší 14 dní (aplikuj konzervativní
   variantu a napiš to).

## 3. Zápis do `PLAN-PRACE.md`

Sekce `## Priority týdne` hned pod úvodním blockquote. Přepiš ji celou (ne přidávej);
historie je v gitu. Šablona:

```markdown
## Priority týdne — RRRR-WW (porada RRRR-MM-DD)

| Metrika | Hodnota | Cíl | Trend |
|---|---|---|---|
| Hodiny vydavatele / týden | … | ≤ 1 | ↘︎ |
| PR zmergováno editorem (A+B) | … % | ≥ 80 % | … |
| Opravy po zveřejnění (S1+S2) / 30 d | … | ≤ 2 | … |
| PR → live medián (A/B) | … h | ≤ 24 h | … |
| Rozhodnutí starší 7 d | … | 0 | … |
| Nový obsah (články · indikátory) | … · … | kvóta | … |
| Dosah (návštěvy · odběratelé · reakce) | … | kontext | … |

**Priority pro autorku (bloky E/F/G rutiny):**
1. … — proč: … — hotovo když: …
2. …
3. …

**Čeká na vydavatele:** #… (od …), #… · **Rozhodnutí v issue:** #…
**Minulý týden:** splněno … · trvá … · zrušeno …
**Trvalé body:** vnější audit — …; změny pravomocí — …
```

Autorka sekci čte v bloku A a při routingu v bloku E ji bere jako první kritérium
(před evergreen backlogem), pokud priorita neodporuje jejím stropům a zdrojovým pravidlům.

## 4. Issue pro vydavatele

Title `porada RRRR-WW: rozhodnutí pro vydavatele (N)`, label `rozhodnuti`. Tělo:
pro každé rozhodnutí nadpis, 3 věty kontextu, **Doporučení**, **Když neodpovíte do
DD.MM.**: konzervativní varianta. Na konci odkaz na PR porady a na tabulku metrik.
Vydavatel odpovídá komentářem; příští porada odpověď převezme a případně zapíše do
`docs/decisions-log.md` (pokud mění pravidla — pak vlastním PR třídy B).

## 5. Uzávěrka

```bash
cd 05_M1_Starter && npm run validate:all && npm test
```

PR `porada RRRR-WW: priority týdne` (třída B, zmerguje editor v dalším běhu — porada
vlastní PR nemerguje). Závěrečná zpráva session = tabulka metrik + 3 priority +
odkaz na issue/PR.

## 6. Jak to běží jako Routine

| Parametr | Hodnota |
|---|---|
| **Název** | `HSPA – porada` |
| **Prompt** | `Spusť týdenní poradu podle PROMPT_PORADA.md v kořeni repozitáře hspa: sesbírej metriky, přepiš sekci Priority týdne v 05_M1_Starter/PLAN-PRACE.md, otevři jeden PR a nejvýš jednu issue s rozhodnutími pro vydavatele.` |
| **Cron (UTC)** | `30 5 * * 1` — pondělí 07:30 CEST, po editorovi (05:00 UTC), před autorčiným úterním během |
| **Konektory** | GitHub · `Brevo` · `Buffer` |
