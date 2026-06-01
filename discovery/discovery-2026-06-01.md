# Discovery report — 2026-06-01

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-06-01 (pondělí). Předchozí běh 2026-05-31 → ARTICLE-REVISE
(`clanek-koureni.html` integrace NAUTA 2025 wave).

Prozkoumáno přímým WebFetch/WebSearch:
MZ ČR `mzd.gov.cz/vsechny-novinky/` + `mzd.gov.cz/tiskove-centrum/tiskove-zpravy/`,
ÚZIS `www.uzis.cz/index.php?pg=aktuality`, SZÚ `szu.gov.cz/aktuality/`,
ČSÚ `csu.gov.cz/aktuality`, SÚKL `sukl.gov.cz/`, WHO Europe news-room,
WebSearch „MZ ČR tisková zpráva 1. června 2026".

## Závěr discovery: ŽÁDNÝ NOVÝ primárně-zdrojový trigger

K dnešnímu dni (pondělí 1. 6. 2026) **nepřibyl žádný nový dataset, norma,
kauza ani nová datová vlna**, která by ještě nebyla zpracovaná předchozími
běhy. Nejnovější položky napříč zdroji jsou z 26.–30. 5. a všechny jsou
buď již zrouteované, nebo bez triggeru:

| Zdroj | Nejnovější položka | Stav |
|---|---|---|
| MZ ČR | 29. 5. JA HEROES + Rögnerová/IKEM | ✅ zrouteováno (clanek-ja-heroes-workforce-2026, 30. 5.) |
| MZ ČR | 28. 5. centralizace vys. spec. péče + Věstník 6/2026 | ✅ zrouteováno (revize clanek-centralizace-chirurgie-2027, 29. 5.) |
| MZ ČR | 28. 5. centra duševního zdraví (CDZ IV) | ✅ posouzeno 29. 5. — pokryto stávajícím korpusem psychiatrie |
| MZ ČR | 26. 5. Centrum onkologické prevence Brno; 25. 5. NKÚ REACT-EU | ✅ NKÚ pokryto (clanek-react-eu-nku-kontrola-2026) |
| SZÚ | 30. 5. Světový den bez tabáku; 29. 5. NAUTA 2025 | ✅ zrouteováno (revize clanek-koureni, 31. 5.) |
| ÚZIS | 5. 5. prodloužení termínu výkazů 2025 | beze změny, bez triggeru |
| ČSÚ | 28.–29. 5. HDP 1Q, dětská jména, mzdy | bez HSPA-relevantního zdravotnického datasetu |
| SÚKL | 26.–29. 5. PRAC signály, CHMP 8 LP, IPLP k 1. 6. | rutinní regulatorní, bez triggeru |
| WHO Europe | 27. 5. World No Tobacco Day; 18. 5. child mental health tool | tabák pokryt; bez ČR-specifického triggeru |

→ Žádné položky datované 31. 5. ani 1. 6. 2026 (ověřeno na obou MZ
stránkách — top položka 29. 5.).

## Routing → FALLBACK (audit) s prioritou „riziko nepřesnosti"

Protože discovery nepřinesl nový trigger, přepínám na **fallback routine
(audit)**. Per PROMPT_DAILY_ROUTINE.md priority výběru revize:

1. Aktuální legislativa/kauza zastaralá → žádná
2. **Riziko nepřesnosti — články s konkrétními čísly** → **HIT**
3. Nejstarší `last_reviewed` (>30 dní) → žádný (nejstarší je 17 dní,
   `deficit-pojisteni-2026` / `financovani-sha`, 2026-05-15)

Při průchodu `npm run validate:all` (požadavek uživatele: „naprosto
zásadní je validace a ověření zdrojů") odhaleny dva problémy v publikovaném
článku `clanek-rezistence-antibiotik.html`:

### Nález A (publikační hygiena) — OPRAVENO

Publikovaný článek (`published: true`, HTML meta `audit-status: verified`)
obsahoval **reader-viditelný redakční banner** „Status: review-pending po
auditní revizi (2026-05-16)" (`<p style="background:#fff7e6…">`). Validátor
`validate-articles.js` hlásil 3 blocking errors. Banner nikdy nebyl
odstraněn při publikaci (7.→31. 5.). Detail banneru je beze ztráty
zachován v audit YAML komentáři v hlavičce. Banner odstraněn → validace
zelená.

### Nález B (faktická chyba benchmarku) — ZÁSADNÍ, primárně ověřeno

Centrální datová dvojice článku i indikátoru
`rezistence_antibiotik_ecoli` zní **„13,1 % (ČR) vs OECD 11,5 %"** se
signálem `warn` a thesí „Česko zaostává". Tato dvojice je metodicky
i hodnotově chybná:

**Primární ověření (ECDC EARS-Net AER 2024, plný PDF stažen a strojově
přečten přes pdftotext 1. 6. 2026):**

- Zdroj: *Antimicrobial resistance in the EU/EEA (EARS-Net) — Annual
  Epidemiological Report for 2024*,
  <https://www.ecdc.europa.eu/sites/default/files/documents/antimicrobial-resistance-eu-annual-epidemiological-report-2024.pdf>
- Doslovná citace (sekce E. coli): *„In 2024, the highest EU/EEA
  population-weighted mean AMR percentage was reported for aminopenicillins
  (54.7%), followed by **fluoroquinolones (22.5%)**, third-generation
  cephalosporins (16.0%), and aminoglycosides (10.4%)."*
- Tj. **EU/EEA populačně vážený průměr rezistence E. coli na
  fluorochinolony = 22,5 % (2024)**, NIKOLIV 11,5 % ani 12 %.
- Trend EU/EEA: **klesající** (statisticky významný pokles 2020–2024).
- Pozn.: hodnota „15,71" v Table 1 reportu je **incidence na 100 000
  obyvatel** (BSI), ne procento rezistence — nezaměňovat (article-level
  caveat).

**Důsledky:**

1. Benchmark „OECD 11,5 %" je import z jiné metodiky (OECD Health at a
   Glance — jiná skupina zemí včetně non-EU, prostý průměr) spárovaný
   s českou EARS-Net-style hodnotou → porušuje železné pravidlo #5
   (dvojice číslo vs benchmark z různých metodik bez caveatu).
2. Skutečný srovnatelný EARS-Net EU/EEA benchmark je **22,5 %**, tedy
   ~2× vyšší než uváděných 11,5 %. Thesis „Česko zaostává oproti
   průměru" je tím postavena na chybném základu.
3. Česká hodnota **13,1 %** (i celý trend 14,5→13,1) má v dashboardu
   `origin: seed` — **nebyla ověřena proti primárnímu EARS-Net výstupu**.
   Pro CEE zemi je hodnota výrazně pod EU/EEA průměrem 22,5 % nezvykle
   nízká a vyžaduje primární verifikaci (ECDC Surveillance Atlas /
   SZÚ EARS-Net národní uzel). Strojově dohledatelná country-level
   hodnota pro ČR se v tomto běhu nepodařila získat (per-country %
   jsou v ECDC Atlasu jako mapová data, ne v textových tabulkách AER;
   Eurostat kód `hlth_rs_resist` z metodické karty vrací HTTP 404
   „not available for dissemination" — sám o sobě zastaralý odkaz).

→ Per Phase 5 „zásadní problém (klíčový claim neověřitelný)":
**článek FLAGGED + staženo z produkce (published:false), benchmark
indikátoru opraven na primárně ověřenou hodnotu, signál neutralizován,
GitHub issue otevřen.** Konečné editoriální rozhodnutí (re-thesis vs
re-publish po datové verifikaci) ponecháno redakci.

## Doporučení pro routing fáze

- **FALLBACK-AUDIT → `clanek-rezistence-antibiotik.html`** (priorita
  „riziko nepřesnosti"). Viz `routing-2026-06-01.md`.
</content>
</invoke>
