# Plán — Úhradová vyhláška: zahrajte si na ministra (`vyhlaska.html`)

## v3 — logika mezi kroky, relativní spravedlnost, projekce (říjen 2026)

Zadání vlastníka (5. 10. 2026): (a) aby na hře vyskočil newsletter popup,
(b) srozumitelná logika mezi kroky a vysvětlení, co se ovlivňuje, (c) tipy,
jak hru udělat zábavnější a edukativnější pro studenty LF. **Nález před v3:**
z 17 posuvníků tekly do aktů II/III jen dva (akutní + následná lůžková);
efekty aktu I („čekání na specialistu klesá") se do cesty pacienta vůbec
nepropisovaly; deficit vyhlášky neměl žádný následek; nálada byla čistě
lokální (gap vůči vlastnímu požadavku); práh „nadprůměrně" byl neviditelný;
hra je potají jednorozměrná (plné požadavky 48,9 mld, z toho nemocnice 21,9 —
všech 16 ostatních se do obálky vejde za 27,0 a na nemocnice zbude 13,0).
Newsletter popup mlčel od 23. 9. kvůli prioritě Týdnů zdraví
(`page-shared.js`: Týden zdraví > vedra > newsletter), ne kvůli chybě.

### Co v3 mění (modelové = označeno i v UI „Jak hra počítá")

1. **Posuvník mluví.** Značka požadavku a zóny nálady (protest < d−4 ≤ bez
   dohody < d−2 ≤ výhrady < d ≤ dohoda < d+2 ≤ rozšíření) přímo pod sliderem;
   řádek `moodExplain()` — „Chybí 3 p. b. k požadavku → bez dohody".
2. **Relativní spravedlnost** (`moodContext`, `fairnessEscalates`,
   `FAIRNESS_RULE`): segment pod průměrem systému eskaluje o stupeň, když
   jiný *vyjednávací* segment dostal boost (≥ +2 p. b.). Jen z grudging/no_deal;
   zákonné položky (`dr_segment: false`) nikoho neprovokují. Důsledek doložený
   testem: **reformní preset posílá nemocnice do protestu** (5 % vs. 9 %, praktici
   +10 % vs. 8 %). `verdict()` nese `escalations` a `avgPct`.
3. **Projekce „stejná vyhláška každý rok"**: `newShares(segments, alloc, years)`,
   `structureProjection`, `yearsToShare` (definitorika, ne predikce). Status
   quo 56,3 % navždy; reformní 55,8 → 50,7 % za 10 let, OECD (30 %) za 42 let;
   nemocniční priorita 69,4 % za 10 let. UI přepínač 1 / 5 / 10 / 20 let.
4. **Trilema** (`trilemma(v)`): dohody (bad = protest nebo < ⅔ dohod; good =
   všichni), reforma (good = lůžkový blok −0,3 p. b. a víc; bad = roste
   > 0,05), bilance (good = v obálce; mid ≤ 3 mld; bad = víc). Status quo =
   samé „mid" (12/15 dohod přesně jako DR 2027). Prahy modelové.
5. **„Co si odnést"** (`takeaways`, `demandSplit`): nejvýš tři věty podle
   toho, co hráč udělal (DR 2027 zopakováno / setrvačnost / deficit → zálohy /
   spravedlnost / precedent 2023 / tempo k OECD / „jedna páka"). Čísla z dat.
6. **Deficit teče do aktu II**: `reditel-hra.json → handoff.deficit_haircut`
   (0,1 p. b. růstu za 1 mld deficitu, strop 2 p. b.; koeficient modelový,
   mechanismus doložený: uměle snížené zálohy pojišťoven nemocnicím,
   `clanek-platba-statni-pojistenci-2027-tri-cisla.html`). `budgetFromMinistr`
   vrací `haircutPct`/`deficitMld`; `vyhlaska.js` ukládá `deficit_mld`, hub ho
   pro sdílené kódy dopočítává (`ministrState`).
7. **Čekárny ambulancí tečou do aktu III**: `segmentWaitSignals()` (boost nebo
   aktivní doložený pokles čekání → `kratsi`; protest → `delsi`; mapování
   z vlastních eskalačních textů hry, modelové) + `step.segment` v
   `pribeh-pacienta.json` (diabetologie → ambulantní specialisté, prohlídka →
   praktici, rehabilitační lůžko → následná lůžková, dovyšetření → laboratoře
   a radiodiagnostika; validátor hlídá existenci segmentu). Posuny z aktu II
   a I se sčítají. UI: poznámka u kroku + banner nad cestou.
8. **Newsletter na herních stránkách**: `renderModuleNav(id, { popups: 'manual' })`
   = žádný časový popup (ani Týden zdraví); `hra-newsletter.js` vyvolá kartu
   po prvním verdiktu + 15 s klidu; text z `vyhlaska-hra.json → newsletter_hook`
   (do `valid_until` „skutečná vyhláška pro 2027 vyjde do konce října —
   pošleme srovnání", po termínu fallback). `newsletter-popup.js` má varianty
   (session limit per varianta, 30 dní a subscribed společné).
9. **Glosář pro mediky**: 6 nových hesel (dohodovací řízení, úhradová
   vyhláška, hodnota bodu, centrová léčba, odvratitelné hospitalizace, § 16);
   `glossary-inline.js` přijímá `[data-gloss-scope]`; slovníček pod metodikou.
10. **Mobil**: lepicí lišta (čerpání · dohody · protesty) pod 920 px.
11. **Analytics** (GA4 přes `trackEvent`): `hra_verdikt{akt,persona?}`,
    `hra_preset{preset}`, `hra_horizont{roky}`, `hra_pokracovat{z}`,
    `hra_porovnani{n,neplatne}`, `hra_vysledovka{sdilena}`.
12. **Seminární režim** `porovnani.html` + `src/hra-porovnani.js`: N kampaní
    ze sdílecích kódů vedle sebe (alokace, verdikt, trilema, projekce, rok
    ředitele, cesta pacienta), sdílitelné přes `?k=A&k=B`, bez backendu.
13. **Hub**: blok „Co teklo mezi akty" (`flowSummary`), morálka přeformulovaná
    na to, co opravdu teče; stepper popisek handoffu rozšířen.

### v3.1 — krytí vyhlášky (deficit má následky už v aktu I)

Nález vlastníka po nasazení v3: „když dám všechno všem, je tam jen deficit,
jinak jsem v pohodě" — 15/15 dohod, 17× rozšíření péče, červený proužek.
Oprava jedním modelem místo dvou koeficientů:

- `envelope.reserve_mld: 2.8` (zdroj: *„Na konci roku 2026 mají mít
  pojišťovny v základních fondech podle vlastních plánů 2,8 miliardy korun,
  necelé dva dny výdajů"*, `clanek-platba-statni-pojistenci-2027-tri-cisla`).
- `coverageFor(cost, envelope, reserve)`: deficit do rezervy se unese
  (bilance „mid"), nad ni **pojišťovny krátí všem poměrně** → `ratio`.
  `effectiveAlloc` = slíbeno × krytí; nálada, struktura, efekty, projekce
  i signály čekání se počítají z toho, co se vyplatí.
- `promiseBroken` (`PROMISE_RULE`, `PROMISE_CUT_PB = 1`): krácení ≥ 1 p. b.,
  které segment posune do horšího stavu, než by měl se slibem → eskalace
  o stupeň (nesplněný slib bolí víc než poctivá nízká nabídka; precedent
  podzim 2023). Krácení pod 1 p. b. = běžná regulace, nikoho nezlomí.
- Výsledek doložený testem: **všem 15 % → krytí 51 %, ≤ 5/15 dohod,
  ≥ 3 protesty, 0 rozšíření péče**; všem 7,5 % → deficit 2,2 mld v rezervě,
  plně kryto; všem 8 % → krytí 95 %, žádný zlomený slib, bilance „bad".
- Akt II: `budgetFromMinistr` = slíbeno × `coverage_ratio` (stav aktu I ho
  nese, hub a porovnání ho dopočítávají); `handoff.deficit_haircut`
  z v3 **odstraněn** — jeden model, ne dva. Akt III: `segmentWaitSignals`
  s `vyhlaskaParams` — nekrytý slib boostu čekárny nezkracuje, protest
  z krácení je prodlužuje.
- Trilema: bilance good = v obálce, mid = deficit kryje rezerva, bad = nad
  rezervu (krátí). Takeaway „deficit" má nekrytou variantu (první v pořadí)
  a variantu „rezerva to letos unese, příští rok bez polštáře".

### Co v3 nedělá (a proč)

- **Preset „jak to udělal skutečný ministr"** — nejedukativnější návrh, ale
  v repu nejsou strojová data růstu po segmentech pro 432/2025 Sb. (článek
  nese hodnoty bodu a lázně 102 %, `dohodovaci-rizeni.json` výsledky po
  segmentech nemá). Doplnit až po vyhlášce pro 2027 (do 31. 10. 2026) jako
  záznam `presets[]` se `source`; validátor presetů to už umí.
- Multiplayer, odznaky, server — mimo rozsah (PLAN-TRI-ZIDLE.md § 9).

### Testy v3

`tests/vyhlaska.test.js` (spravedlnost, moodExplain, projekce, yearsToShare,
trilema, takeaways, demandSplit, segmentWaitSignals, newsletter_hook),
`tests/reditel.test.js` (haircut), `tests/pribeh-pacienta.test.js` (segmenty
kroků), `tests/hra-newsletter.test.js` (copy podle data, session varianty,
idle trigger), `tests/hra-porovnani.test.js` (parser, tabulka, značení).

## v2 — plná segmentace (červenec 2026)

Hra přestavěna na **17 segmentů dle skutečného číselníku ZPP** („Struktura
nákladů na zdravotní služby podle jednotlivých segmentů", Metodika ZPP MZ ČR):

- **Baseline**: ÚZIS **OIS-11-24** (NRHZS, verze 2026-01) — úhrady 2023 po
  kódech segmentů, celosystémově agregováno; čistý součet **456,1 mld** (bez
  dvojzápočtu „z toho" řádku 1.7.1 centrových LP). Kódy → názvy ověřeny proti
  ZPP 2026 ZPMV (příloha č. 11) a sněmovnímu tisku (tabulka pro rok 2016).
- **Letošní objem**: 2026 ≈ **563 mld** (clanek-deficit-pojisteni-2026);
  hra škáluje podíly 2023 na letošní objem (`scale = 563/456,1`), transparentně.
- **Segmenty**: nemocnice akutní (43,2 %), centrová léčba (6,8 %), následná
  lůžková (6,4 %), praktici, ambulantní specialisté, stomatologie (17,1 mld!),
  gynekologie, fyzioterapie, laboratoře+radiodiagnostika, domácí péče, ostatní
  ambulantní (hemodialýza + soc. služby), lázně+ozdravovny, doprava, ZZS+LPS,
  léky na recept, prostředky, ostatní (zahraničí/§16b/očkovací látky).
- Reálné DR 2027 flagy: bez dohody akutní lůžková, následná, ambul. specialisté.
- Nový segment „jednodenní péče" (od 2026, ZPMV plán 620 mil.) zmíněn
  v metodice — v základně 2023 neexistuje, nemá posuvník.

### ⚠️ Errata nález (k rozhodnutí redakce, mimo tento PR)

Při sourcingu v2 se ukázalo, že `clanek-financovani-segmenty-2026.html`
(a na něj navázané `data/financing.json` sankey + `data/claims.json` +
headline v `data/dohodovaci-rizeni.json`) obsahuje chyby:

1. **Popisky malých segmentů prohozené**: kód 3 = lázně+ozdravovny (4,5 mld),
   ne „Stomatologie 4,4"; stomatologie je kód **1.1 = 17,1 mld** (v článku
   skrytá uvnitř „ambulantní 131"); kód 5 = ZZS+LPS (5,7), ne „Lázně 5,7";
   kód 4 = doprava (2,1), ne „Doprava+ZZS".
2. **Dvojzápočet 1.7.1** (+3,0 mld): publikovaný součet 459 mld vč. „z toho"
   řádku; čistý součet je 456,1 mld. Týká se i per-pojišťovna žebříčku
   (VZP 267,9 vs. čistých 266,4).

Hra v2 používá správná čísla; oprava článku + claims + datasetů je
samostatná redakční dávka.

Interaktivní hra nad reálnou strukturou úhrad: hráč jako „ministr" rozděluje
**meziroční přírůstek** úhrad mezi 8 segmentů péče, sleduje dopad na strukturu
systému a indikátory — a čelí **zástupcům segmentů**, kteří argumentují,
požadují a při podfinancování eskalují až ke stávkové pohotovosti.

## Klíčové vhledy, které hra učí

1. Vyhláška nerozděluje rozpočet, ale **přírůstek** nad setrvačnou základnou.
2. Rozdělení je **hra s nulovým součtem** (obálka je omezená; překročení =
   deficit systému → odkaz na články o deficitu VZP).
3. ČR má **extrémní podíl lůžkové péče** (55,9 % vs. OECD 30 %) — hráč vidí,
   jak (pomalu) se jeho vyhláškou struktura hýbe. Definitorický přepočet, ne model.
4. U některých segmentů **evidence efektu na výsledky chybí** — hra to přiznává.
5. Vyjednávání má reálné aktéry s reálnými argumenty a reálnou eskalací
   (precedent: hromadné výpovědi lékařů z přesčasů, prosinec 2023).

## Datové ukotvení (vše doloženo v repu)

- Segmentové podíly 2023: `clanek-financovani-segmenty-2026.html` + `data/financing.json`
  (lůžková 256,7 mld · 55,9 % / ambulantní 131,1 / léky 45,6 / pomůcky 10,9 /
  lázně 5,7 / stomatologie 4,4 / doprava+ZZS 2,1 / ostatní 2,5; celkem 459 mld)
- Reálný rámec DR 2027: `clanek-dohodovaci-rizeni-2027-vysledek.html`
  (12/15 dohod; bez dohody akutní lůžková, následná, ambulantní specialisté;
  dohody visí na +21 mld platby státu, původně 25)
- Nákladové trendy: `data/dohodovaci-rizeni.json` strategic_analysis
  (osobní náklady lůžkové +56 % 2019–24, lékaři +5 %)
- Efektové indikátory: `podil_vydaje_luzkova_pece`, `hospitalizace_acsc`,
  `cekaci_doby_specialist`, `cekaci_doba_kycel`, `nesplnena_potreba_zubni_pece`,
  `dojezd_zzs` — vše existuje v `data/indicators.json`

## Poctivost (stejná disciplína jako Simulátor/Barometr)

- **Zástupci jsou typizovaní** („ředitelka fakultní nemocnice"), NE reálné osoby.
- **Požadavky segmentů jsou modelové** — ilustrují vyjednávací logiku odvozenou
  z doložených nákladových trendů; nejsou citacemi reálných jednání. Výrazně
  označeno v UI i datech.
- Efekty: definitorický přepočet (struktura výdajů) = přesná matematika;
  směrové efekty jen se zdrojem; kde evidence není, hra řekne „nedoloženo".

## Data — `data/vyhlaska-hra.json`

```json
{
  "envelope": { "amount_mld": 40, "note": "modelová obálka: +21 mld stát (doloženo) + růst pojistného", "source": "..." },
  "segments": [{
    "id": "luzkova", "label": "Lůžková péče",
    "baseline_mld": 256.7, "baseline_share_pct": 55.9, "baseline_source": "...",
    "representative": { "role": "Ředitelka fakultní nemocnice", "argument": "...(doložená čísla)...", "argument_sources": ["..."] },
    "demand_pct": 10, "demand_reasoning": "...", 
    "escalation": { "agree": "...", "grudging": "...", "no_deal": "...", "protest": "...(precedent se zdrojem)" },
    "real_2027": "bez dohody",  
    "effects": [ {"kind":"definitional","indicator":"podil_vydaje_luzkova_pece"}, {"kind":"directional",...,"source":"..."} ]
  }]
}
```

## Engine — `src/vyhlaska-engine.js` (čistý, testovaný)

- `totalCost(segments, alloc)` — cena vyhlášky v mld (alloc = % růstu per segment)
- `newShares(segments, alloc)` — nové podíly segmentů (definitorika)
- `moodFor(segment, allocPct)` — gap vs. demand → stav: dohoda / podpis
  s výhradami / bez dohody (vyhláška) / protest–stávková pohotovost
- `effectsFor(segments, alloc, avgPct, indicatorsById)` — směrový efekt se
  aktivuje, když segment roste nadprůměrně (relativní posílení)
- `verdict(segments, alloc, envelope)` — počet dohod, deficit/rezerva,
  posun podílu lůžkové péče vs. OECD 30 %

## UI — `vyhlaska.html` + `src/vyhlaska.js` (namespace `.vh-*`)

- Hero + disclaimer (modelová hra, typizovaní zástupci, ne predikce)
- Obálka: baterie „rozděleno X / 40 mld" (překročení → deficit varování)
- Karta segmentu: podíl, slider % růstu (0–15, krok 0,5), **zástupce**
  (role, argument s čísly, požadavek), živý chip nálady s eskalací
- Výsledky (aria-live): struktura po vaší vyhlášce (bar vs. OECD),
  efekty na indikátory, počet dohod vs. realita DR 2027 (12/15), deficit
- Presety: Status quo (všem stejně) · Reformní (ambulance+prevence) ·
  Nemocniční priorita
- Nav: pod „Financování" (children); SITE_TOOLS + prolinkování s články
  financovani-segmenty a dohodovaci-rizeni-2027-vysledek

## Validátor — `ingest/validate-vyhlaska-hra.js` (v validate:all)

Unikátní id; baseline_mld konečné a suma ≈ 459 ±1; každý segment má
representative.role + argument + argument_sources; demand_pct konečné;
escalation má všechny 4 stavy; efekt → indikátor existuje; directional má
polarity+strength+source; definitional jen na podíl-indikátory.

## Testy — `tests/vyhlaska.test.js`

validátor; totalCost (ruční výpočet); newShares (suma 100 %, posun lůžkové);
moodFor (prahy eskalace); effectsFor (aktivace jen při nadprůměrném růstu);
verdict (deficit vs. rezerva, počet dohod).

## Dávky

1. plán + data + engine + validátor + testy ← tato dávka
2. stránka + UI + CSS + nav + prolinkování + smoke → PR
