# Plán — Úhradová vyhláška: zahrajte si na ministra (`vyhlaska.html`)

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
