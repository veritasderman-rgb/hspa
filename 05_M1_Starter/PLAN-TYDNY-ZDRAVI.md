# Plán: „Týdny zdraví" — popup + microsite k mezinárodním dnům

**Stav:** schváleno vlastníkem (2026-07-20), staví se.
**Datum:** 2026-07-20.

**Rozhodnutí redakce (uzamčeno 2026-07-20):**
1. **Hustota: jen marquee dny** (~30–35 týdnů) — popup jen v týdnech se
   skutečným mezinárodním dnem; jinak běží newsletter popup. Evergreen se
   případně doplní podle ohlasu.
2. **Týdny bez dostatečného obsahu se vynechají** (žádný popup) — nikdy se
   nestaví microsite „naprázdno" ani se kvůli ní neobjednává článek.
3. **Značka „Týden zdraví", URL `tyden.html`** (+ `?id=`).
4. Interval týdne **není nutně pondělí–neděle** — kopíruje skutečný termín
   observance (viz oprava §1.1), aby popup neházel nepravdivé datum.
**Branch:** `claude/plan-tydny-zdravi`.
**Cíl:** Systém, který každý týden vyzdvihne jeden **mezinárodní zdravotní den/týden**:
nenápadný **popup** na webu (visí celý týden) → **mikro landing page** (microsite)
s kurátorovaným výběrem relevantních článků, indikátorů, prevence a nástrojů.
Obsah se mění **jednou týdně** novou rutinou. Kalendář témat do července 2027.

---

## 0) Proč a co to je

Web má bohatý korpus (190+ článků, 80 indikátorů, prevence, nástroje), ale
je „plochý" — návštěvník nedostává důvod přijít *teď* a neví, kudy začít u
konkrétního tématu. Mezinárodní zdravotní dny jsou přirozený **kalendářní hook**:
Světový týden kojení, Světový den duševního zdraví, Evropský antibiotický den…
Každý z nich je příležitost sbalit roztroušený obsah k tématu do jedné stránky
a upozornit na něj popupem — a zároveň dát sociálním sítím a newsletteru
pravidelný, předvídatelný rytmus.

**Princip: datově řízené, ne ručně přepínané.** Celý systém stojí na jednom
registru `data/awareness-weeks.json`. Který týden je „aktivní", se určuje
**podle dnešního data** — žádný ruční zásah do kódu, žádný deploy kvůli výměně.
Týdenní rutina jen **připraví další záznam** (kurátorský výběr + copy + cover)
a přepne jeho stav na `ready`. Výměna popupu i microsite proběhne sama v den
začátku týdne.

## 1) Architektura

```
data/awareness-weeks.json         ← registr všech týdnů (zdroj pravdy)
tyden.html                        ← microsite: aktivní týden (?id= override) + hub všech
src/awareness-week.js             ← render microsite z registru (vzor indicator.js)
src/awareness-popup.js            ← globální popup, vybírá aktivní týden podle data
ingest/validate-awareness-weeks.js ← validátor (v validate:all)
tests/awareness-weeks.test.js     ← pure helpery (activeWeekFor, no-overlap, doklady)
.github/workflows/awareness-weekly.yml (volitelně) + PROMPT_AWARENESS_ROUTINE.md
```

### 1.1 Registr `data/awareness-weeks.json`

```json
{
  "version": "1.0",
  "weeks": [{
    "id": "svetovy-tyden-kojeni-2026",
    "observance": "Světový týden kojení (WBW)",
    "observance_source": "WABA / WHO — World Breastfeeding Week, 1.–7. srpna",
    "start": "2026-08-01",           // začátek observance (WBW 1.–7. 8.)
    "end": "2026-08-07",             // konec observance
    "theme": "kojeni",
    "kicker": "Světový týden kojení",
    "title": "Kojení: co o něm víme z dat — a kde Česko tlačí bota",
    "lead": "1–2 věty do microsite hero + popupu.",
    "popup": {
      "headline": "Je Světový týden kojení",
      "body": "Proč na kojení záleží a jak si vede Česko — články, čísla a souvislosti na jednom místě.",
      "cta": "Otevřít týden kojení"
    },
    "microsite": {
      "sections": [
        { "h": "Přečtěte si", "kind": "articles" },
        { "h": "Čísla, která to měří", "kind": "indicators" },
        { "h": "Prevence a nárok", "kind": "prevention" },
        { "h": "Vyzkoušejte", "kind": "tools" }
      ]
    },
    "linked_articles": ["clanek-plne-kojeni-porodnice.html", "clanek-stret-zajmu-vyziva-kojencu.html"],
    "linked_indicators": ["kojeni_6m", "..."],
    "linked_prevention_themes": [],
    "linked_tools": ["kompas.html"],
    "og_image": "assets/awareness/svetovy-tyden-kojeni-2026.png",
    "status": "draft"               // draft | ready | archived
  }]
}
```

- **`start`/`end` kopírují skutečný termín observance** (ne nutně pondělí–neděle);
  interval typicky 5–9 dní; týdny se **nepřekrývají** (hlídá validátor). Popup tak
  visí přesně v dnech, kdy den/týden skutečně probíhá, a nehlásí nepravdivé datum.
- Aktivní záznam = ten, jehož interval obsahuje dnešek a má `status: ready`.
  Když žádný, popup se nezobrazí (fallback na newsletter popup).
- Odkazy (`linked_*`) míří na existující obsah; validátor kontroluje existenci.

### 1.2 Microsite `tyden.html`

- Jedna stránka, skeleton dle `strategie.html`/`diagnoza.html` (topbar, hero,
  `<main>`, footer, `styles.min.css`).
- `src/awareness-week.js` (vzor `indicator.js`): bez `?id=` vyrenderuje
  **aktivní týden** (podle data); s `?id=svetovy-tyden-kojeni-2026` konkrétní
  (pro sdílení/archiv). Sekce se generují z `microsite.sections` + `linked_*`:
  karty článků (z `articles.json`, respektují `isArticleVisible`), živé hodnoty
  indikátorů (z `indicators.json`, signálová tečka, proklik na `indikator-{id}`),
  prevence, nástroje.
- **Hub** dole: „Kalendář týdnů zdraví" — mřížka nadcházejících a archivních
  týdnů (odkazy `tyden.html?id=`), aby stránka fungovala i mimo aktivní týden.
- SEO: záznam do `STATIC_PAGES`, `seo:pages`, sitemap.

### 1.3 Popup `src/awareness-popup.js`

- Injektuje se globálně vedle newsletter popupu (v `renderModuleNav` →
  `initNewsletterPopup`); vzor a dismiss logika z `newsletter-popup.js`
  (localStorage, per-týden klíč, jedno zobrazení za návštěvu, znovu po zavření
  ne dřív než za pár dní).
- **Priorita:** je-li aktivní awareness-týden, popup patří jemu; newsletter
  popup se v tom týdnu nespouští (aby nevyskočily dva). Mimo aktivní týden
  běží newsletter popup beze změny.
- Popup je rohová karta: kicker (název dne), headline, 1 věta, CTA →
  `tyden.html`. Zavření = zapamatuje se pro daný `id`.
- A11y: `role="dialog"`, fokus management, Esc zavírá, `prefers-reduced-motion`.

### 1.4 Týdenní rutina (jádro zadání)

Systém je datově řízený, takže **výměna je automatická**. Rutina má jediný
úkol: **mít připravený příští týden**. Každý běh (ideálně čtvrtek/pátek před
dalším pondělím):

1. Najde v registru nejbližší budoucí týden se `status: draft`.
2. Ověří/aktualizuje kurátorský výběr odkazů (nové články od minula), dopíše
   `popup` + `lead` copy, vygeneruje `og_image` cover.
3. Ověří doklady (`validate:all`), přepne `status: ready`.
4. Volitelně: připraví sociální posty (napojení na Buffer rutinu) a zmínku do
   newsletteru.

Realizace: `PROMPT_AWARENESS_ROUTINE.md` (pro AI agenta, vzor
`PROMPT_NIGHTLY_ROUTINE.md`) + volitelný `.github/workflows/awareness-weekly.yml`
(cron, který otevře PR s připraveným týdnem, nebo jen upozorní). **Žádný týdenní
deploy „napevno" — jen udržování registru.**

## 2) Kalendář témat (srpen 2026 – červenec 2027)

**Jen marquee dny** (rozhodnutí §0.1); týdny bez mezinárodního dne se vynechají
(běží newsletter popup). Datum = skutečný termín observance; u pohyblivých dnů
rutina před publikací ověří přesné datum daného ročníku.
Legenda pokrytí obsahem: ✅ silné (5+ článků) · ◒ částečné (1–4). Po korektuře
inventury (Codex) mají obsah i dárcovství krve a vedra/ovzduší.

| # | Termín | Mezinárodní den / týden | Téma | Obsah |
|---|---|---|---|---|
| 1 | 1.–7.8.2026 | **Světový týden kojení** (WBW) | kojení, výživa kojenců | ◒ **(pilot)** |
| 2 | 10.9. | **Světový den prevence sebevražd** | duševní zdraví | ✅ |
| 3 | 13.9. | Světový den sepse | sepse, bezpečnost péče | ◒ |
| 4 | 17.9. | **Světový den bezpečí pacientů** | bezpečnost péče, dekubity | ✅ |
| 5 | 21.9. | Světový den Alzheimera | demence, dlouhodobá péče | ◒ |
| 6 | 29.9. | **Světový den srdce** | kardio, CMP, cholesterol | ✅ |
| 7 | 10.10. | **Světový den duševního zdraví** | duševní zdraví | ✅ |
| 8 | 2. sobota 10. | Světový den paliativní a hospicové péče | paliativní péče | ✅ |
| 9 | říjen (měsíc) | Měsíc boje proti rakovině prsu | screening prsu, onkologie | ✅ |
| 10 | 14.11. | **Světový den diabetu** | diabetes | ◒ |
| 11 | 18.–24.11. | **Světový antibiotický týden** | antibiotická rezistence | ✅ |
| 12 | 3. středa 11. | Světový den CHOPN | respirační nemoci | ◒ |
| 13 | 1.12. | **Světový den boje proti AIDS** | HIV, sexuální zdraví | ✅ |
| 14 | 12.12. | Den univerzálního zdravotního pokrytí | dostupnost, financování | ✅ |
| 15 | 4.2. | **Světový den boje proti rakovině** | onkologie, screening | ✅ |
| 16 | 15.2. | Mezinárodní den dětské onkologie | dětská onkologie | ◒ |
| 17 | 28./29.2. | **Den vzácných onemocnění** | vzácná onemocnění, centrová léčba | ◒ |
| 18 | 4.3. | **Světový den obezity** | obezita, výživa, nápoje | ✅ |
| 19 | 3. pátek 3. | Světový den spánku | životní styl, duševní zdraví | ◒ |
| 20 | 24.3. | **Světový den tuberkulózy** | TBC, přenosné nemoci | ◒ |
| 21 | 7.4. | **Světový den zdraví** | veřejné zdraví, systém | ✅ |
| 22 | 17.4. | Světový den hemofilie | vzácná onemocnění, krev | ◒ |
| 23 | 24.–30.4. | **Světový imunizační týden** | vakcinace | ✅ |
| 24 | 5.5. | Světový den hygieny rukou | bezpečnost péče, rezistence | ✅ |
| 25 | 12.5. | **Mezinárodní den sester** | pracovní síla, sestry | ✅ |
| 26 | 17.5. | **Světový den hypertenze** | kardio, hypertenze | ✅ |
| 27 | 31.5. | **Světový den bez tabáku** | kouření, tabák | ✅ |
| 28 | 7.6. | Světový den bezpečnosti potravin | výživa, bezpečnost potravin | ◒ |
| 29 | 14.6. | **Světový den dárců krve** | dárcovství krve/plazmy | ◒ |
| 30 | červenec (vedra) | Sezónní: vedra a zdraví / ovzduší | vedra, znečištění ovzduší | ◒ |
| 31 | 1.–7.8.2027 | **Světový týden kojení** (2. ročník) | kojení | ◒ |

**Poznámky ke kalendáři:**
- Přesná data pohyblivých dnů (paliativní péče, CHOPN, spánek…) rutina ověří
  před publikací daného ročníku.
- **Korekce inventury (Codex):** dárcovství krve má `clanek-darcovstvi-krve-plazma`
  + indikátor `darcovstvi_krve_plazma_per_1000`; vedra `clanek-nemocnice-v-horku`
  a ovzduší `clanek-pm25-spinavy-vzduch` — tyto týdny **nejsou** obsahové mezery
  a rutina je má prolinkovat, ne objednávat nové články.
- Pořadí je orientační; skutečné pořadí drží datově registr. Marquee dnů je ~31,
  což pokrývá zhruba dvě třetiny roku; zbytek roku běží newsletter popup.

## 3) Microsite: co v ní je

Každá microsite skládá z existujícího obsahu (žádná duplikace textů):
1. **Hero** — kicker (název dne), titulek, lead, datum týdne.
2. **Přečtěte si** — karty relevantních článků (respektují viditelnost).
3. **Čísla, která to měří** — živé indikátory se signálem a proklikem.
4. **Prevence a nárok** — odkazy do `prevence.html` / prevence témat.
5. **Vyzkoušejte** — relevantní nástroje (kompas, simulátor, hra, model).
6. **Zdroj dne** — odkaz na oficiální stránku dne (WHO/WABA…), disclaimer.

## 4) Validátor + testy

- `ingest/validate-awareness-weeks.js` (v `validate:all`): unikátní `id`;
  `start` je pondělí a `end` neděle (start+6); týdny se **nepřekrývají**;
  `linked_articles`/`linked_indicators` existují; `popup.headline/body/cta`
  a `title/lead` neprázdné; `status` z enumu; aspoň jeden `linked_*` neprázdný.
- `tests/awareness-weeks.test.js`: `activeWeekFor(date, weeks)` (hraniční dny,
  jen `ready`), no-overlap, každý `ready` týden má aspoň 1 doklad.

## 5) Zapojení do webu

- Popup globálně (page-shared), priorita nad newsletter popupem v aktivním týdnu.
- `tyden.html` do `STATIC_PAGES` + `seo:pages` + sitemap.
- Odkaz „Týden zdraví" na homepage (pruh nad/pod hero, jen když je aktivní týden).
- Cross-link: microsite ↔ dotčené články (volitelně banner na článku v jeho týdnu).
- Sociální + newsletter: rutina může předvyplnit posty a zmínku (napojení na
  stávající Buffer/Brevo rutiny) — mimo rozsah první dávky.

## 6) Rozhodnutí (uzamčeno 2026-07-20)

1. **Hustota:** jen marquee dny (~31 týdnů); jinak newsletter popup. ✅
2. **Chování popupu:** jednou za návštěvu, po zavření mlčet do konce týdne. ✅
3. **Obsahové mezery:** týdny bez dostatečného obsahu se **vynechají** (žádný
   popup); nikdy se nestaví microsite naprázdno ani se neobjednává článek.
   (Po korekci inventury jsou dárcovství krve i vedra/ovzduší pokryté — viz §2.) ✅
4. **URL/název:** `tyden.html` (+ `?id=`), značka „Týden zdraví". ✅

## 7) Dávky

| Dávka | Obsah |
|---|---|
| 0 | Tento plán + rozhodnutí §6 |
| 1 | Infrastruktura: registr + `tyden.html` + `awareness-week.js` + popup + validátor + testy; **pilot = Světový týden kojení** (kompletní záznam) |
| 2 | Naplnění marquee dnů Q3–Q4 2026 (# 2–14) daty + covers |
| 3 | Naplnění # 15–31 (2027) + týdenní rutina (PROMPT + workflow) |

*Generated by Claude Code.*
