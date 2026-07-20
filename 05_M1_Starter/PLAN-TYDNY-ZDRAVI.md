# Plán: „Týdny zdraví" — popup + microsite k mezinárodním dnům

**Stav:** návrh ke schválení vlastníkem.
**Datum:** 2026-07-20.
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
    "start": "2026-07-27",           // pondělí — týden, kdy popup visí
    "end": "2026-08-02",             // neděle
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

- **`start` je vždy pondělí, `end` neděle**; týdny se nepřekrývají (hlídá validátor).
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

Pondělní týdny; u pohyblivých dnů rutina před publikací ověří přesné datum.
Legenda pokrytí obsahem: ✅ silné (5+ článků) · ◒ částečné (1–4) · ✍ chybí (napsat).

| # | Týden (po–ne) | Mezinárodní den / týden | Téma | Obsah |
|---|---|---|---|---|
| 1 | 27.7.–2.8. | **Světový týden kojení** (1.–7.8.) | kojení, výživa kojenců | ◒ |
| 2 | 3.–9.8. | Světový týden kojení (dozvuk) / dětské zdraví | perinatální, porod | ◒ |
| 3 | 10.–16.8. | *(bez marquee)* | prevence / životní styl | ✅ |
| 4 | 17.–23.8. | *(bez marquee)* | zdravotní gramotnost | ◒ |
| 5 | 24.–30.8. | *(bez marquee)* | pracovní síla / sestry | ◒ |
| 6 | 31.8.–6.9. | Den bezpečnosti pacientů (17.9. blízko) | bezpečnost péče | ✅ |
| 7 | 7.–13.9. | **Světový den prevence sebevražd** (10.9.) + **Světový den sepse** (13.9.) | duševní zdraví / sepse | ✅ / ◒ |
| 8 | 14.–20.9. | **Světový den bezpečí pacientů** (17.9.) | bezpečnost péče, dekubity | ✅ |
| 9 | 21.–27.9. | **Světový den Alzheimera** (21.9.) + **Světový den srdce** (29.9.) | demence / kardio | ◒ / ✅ |
| 10 | 28.9.–4.10. | Světový den srdce (dozvuk) | kardiovaskulární mortalita, CMP | ✅ |
| 11 | 5.–11.10. | **Světový den duševního zdraví** (10.10.) | duševní zdraví | ✅ |
| 12 | 12.–18.10. | Světový den míchání rukou / hygieny; Den paliativní péče (2. sobota) | paliativní péče | ✅ |
| 13 | 19.–25.10. | **Světový den boje proti rakovině prsu** (měsíc) | screening prsu, onkologie | ✅ |
| 14 | 26.10.–1.11. | Onkologická prevence (dozvuk) | screeningy, HPV | ✅ |
| 15 | 2.–8.11. | *(Movember)* mužské zdraví | prostata, mužské zdraví | ◒ |
| 16 | 9.–15.11. | **Světový den diabetu** (14.11.) | diabetes | ◒ |
| 17 | 16.–22.11. | **Světový antibiotický týden** (18.–24.11.) | antibiotická rezistence | ✅ |
| 18 | 23.–29.11. | Antibiotický týden (dozvuk) / CHOPN (3. středa) | rezistence / respirační | ✅ |
| 19 | 30.11.–6.12. | **Světový den boje proti AIDS** (1.12.) | HIV, sexuální zdraví | ✅ |
| 20 | 7.–13.12. | *(zima, chřipka)* | vakcinace, respirační infekce | ✅ |
| 21 | 14.–20.12. | Univerzální zdravotní pokrytí (12.12.) | dostupnost, financování | ✅ |
| 22 | 21.–27.12. | *(svátky — lehké téma)* | prevence / životní styl | ✅ |
| 23 | 28.12.–3.1. | *(novoroční předsevzetí)* | kouření, alkohol, obezita | ✅ |
| 24 | 4.–10.1. | *(novoroční předsevzetí — dozvuk)* | pohyb, výživa, nápoje | ✅ |
| 25 | 11.–17.1. | *(bez marquee)* | zdravotní gramotnost | ◒ |
| 26 | 18.–24.1. | *(bez marquee)* | digitalizace / eHealth | ✅ |
| 27 | 25.–31.1. | Světový den nemocí bez léčby / vzácné (blízko) | vzácná onemocnění | ◒ |
| 28 | 1.–7.2. | **Světový den boje proti rakovině** (4.2.) | onkologie, screening | ✅ |
| 29 | 8.–14.2. | Mezinárodní den epilepsie (2. po) / dětská onkologie (15.2.) | dětské zdraví | ◒ |
| 30 | 15.–21.2. | **Mezinárodní den dětské onkologie** (15.2.) | dětská onkologie | ◒ |
| 31 | 22.–28.2. | **Den vzácných onemocnění** (28./29.2.) | vzácná onemocnění, centrová léčba | ◒ |
| 32 | 1.–7.3. | **Světový den obezity** (4.3.) | obezita, výživa, nápoje | ✅ |
| 33 | 8.–14.3. | Mezinárodní den žen (8.3.) — zdraví žen | reprodukční, gender pay gap | ◒ |
| 34 | 15.–21.3. | Světový den spánku (pá) | životní styl / duševní | ◒ |
| 35 | 22.–28.3. | **Světový den tuberkulózy** (24.3.) | TBC, přenosné nemoci | ◒ |
| 36 | 29.3.–4.4. | *(příprava na Světový den zdraví)* | veřejné zdraví | ✅ |
| 37 | 5.–11.4. | **Světový den zdraví** (7.4.) | veřejné zdraví, systém | ✅ |
| 38 | 12.–18.4. | Světový den hemofilie (17.4.) | vzácná / krev | ◒ |
| 39 | 19.–25.4. | **Světový imunizační týden** (24.–30.4.) | vakcinace | ✅ |
| 40 | 26.4.–2.5. | Imunizační týden (dozvuk) / Den bezpečnosti práce (28.4.) | vakcinace / pracovní síla | ✅ |
| 41 | 3.–9.5. | **Světový den hygieny rukou** (5.5.) + Den astmatu | bezpečnost péče / respirační | ✅ |
| 42 | 10.–16.5. | **Mezinárodní den sester** (12.5.) | pracovní síla, sestry | ✅ |
| 43 | 17.–23.5. | **Světový den hypertenze** (17.5.) | kardio, hypertenze | ✅ |
| 44 | 24.–30.5. | Světový den bez tabáku (31.5.) — předehra | kouření | ✅ |
| 45 | 31.5.–6.6. | **Světový den bez tabáku** (31.5.) | kouření, tabák | ✅ |
| 46 | 7.–13.6. | Světový den bezpečnosti potravin (7.6.) | výživa, bezpečnost | ◒ |
| 47 | 14.–20.6. | **Světový den dárců krve** (14.6.) | transfuze, dárcovství | ✍ |
| 48 | 21.–27.6. | *(bez marquee)* | financování / reforma | ✅ |
| 49 | 28.6.–4.7. | *(léto — dostupnost o prázdninách)* | dostupnost, ZZS | ✅ |
| 50 | 5.–11.7. | *(léto)* | úrazy / prevence | ◒ |
| 51 | 12.–18.7. | *(léto — vedra)* | životní prostředí / vedra | ✍ |
| 52 | 19.–25.7. | *(příprava na WBW 2027)* | kojení | ◒ |

**Poznámky ke kalendáři:**
- Přesná data pohyblivých dnů (paliativní péče, CHOPN, spánek…) rutina ověří
  před publikací daného týdne; tabulka je plán, ne finální datum.
- „Bez marquee" týdny dostanou **evergreen téma** z korpusu — web tak má popup
  i mimo velké dny (volitelné: lze je nechat bez popupu, viz §6 otázka 1).
- **Obsahové mezery (✍/◒):** dárcovství krve a vedra/prostředí jsou nejtenčí —
  buď se microsite postaví jen z indikátorů + prevence, nebo se k danému týdnu
  doobjedná článek (napojení na denní/noční článkovou rutinu s předstihem).

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

## 6) Otázky k rozhodnutí (před stavbou)

1. **Hustota kalendáře:** popup **každý týden** (evergreen témata i mimo velké
   dny), nebo **jen týdny s mezinárodním dnem** (cca 30–35 týdnů, jinak
   newsletter popup)? *(Doporučení: začít jen s marquee dny, evergreen doplnit
   podle ohlasu.)*
2. **Chování popupu:** zobrazit **jednou za návštěvu** a po zavření mlčet do
   konce týdne (doporučeno), nebo agresivněji?
3. **Obsahové mezery** (dárcovství krve, vedra): postavit microsite jen z
   indikátorů/prevence, nebo k těm týdnům **doobjednat článek** s předstihem?
4. **URL/název:** `tyden.html` (+ `?id=`) a značka „Týden zdraví" — vyhovuje,
   nebo jiný název (např. `kalendar-zdravi.html`)?

## 7) Dávky

| Dávka | Obsah |
|---|---|
| 0 | Tento plán + rozhodnutí §6 |
| 1 | Infrastruktura: registr + `tyden.html` + `awareness-week.js` + popup + validátor + testy; **pilot = Světový týden kojení** (kompletní záznam) |
| 2 | Naplnění kalendáře Q3–Q4 2026 (týdny 1–20) daty + covers |
| 3 | Naplnění Q1–Q3 2027 (týdny 21–52) + týdenní rutina (PROMPT + workflow) |
| — | Průběžně: doobjednané články pro obsahové mezery (mimo tuto sérii) |

*Generated by Claude Code.*
