# Plán — „Tři židle": jeden systém, tři pohledy (herní trilogie)

**Stav:** návrh ke schválení vlastníkem.
**Datum:** 2026-07-19.
**Branch:** `claude/nova-interaktivni-hra-oxc8zd` (tento plán; implementační dávky
mají vlastní branche/PR dle standardního workflow).
**Cíl:** spojit existující hru na ministra (`vyhlaska.html`) se třemi novými
interaktivními prvky do **jednoho herního celku**: hráč projde tentýž zdravotní
systém očima ministra, ředitele nemocnice a pacienta (s přehráním očima lékaře)
— a na závěr uvidí na Modelu systému, jak málo z celku každá role vidí.

---

## 0) Proč a co to je

Web už má čtyři interaktivní nástroje, které se dotýkají systémových pák:
hra na ministra (`vyhlaska.html` + `vyhlaska-engine.js`), Model systému
s režimem „Zatlačte na páku" (`model-systemu.html`), Simulátor pák
(`simulator.html`) a statický explainer Cesta pacienta (`cesta-pacienta.html`,
5 fází × 7 diagnóz). Chybí vrstva, která by je spojila do jednoho zážitku
a řekla hlavní tezi: **je to jeden systém, ale každý aktér ho vidí jinak —
a rozhodnutí jednoho jsou omezení druhého.**

Trilogie „Tři židle" je kampaň o třech aktech + epilogu:

| Akt | Role | Stránka | Stav |
|---|---|---|---|
| I | **Ministr** — podepíšete úhradovou vyhlášku | `vyhlaska.html` | ✅ existuje, malé rozšíření |
| II | **Ředitel nemocnice** — s vaší vyhláškou přežijte rok | `reditel.html` | 🆕 |
| III | **Pacient (a lékař)** — projděte cestu systémem, který jste nastavili | `pribeh-pacienta.html` | 🆕 |
| Epilog | **Tři židle** — perspektivní přepínač nad Modelem systému | `model-systemu.html` | 🆕 rozšíření |
| Hub | rozcestník kampaně + závěrečná výsledovka | `hra.html` | 🆕 |

Klíčový mechanismus: **předávání stavu mezi akty.** Růst úhrad, který hráč
jako ministr přidělí lůžkovým segmentům, určí rozpočet jeho nemocnice v aktu II.
Rozhodnutí ředitele (platy, přesčasy, zavřená oddělení) určí čekací doby
a kapacity, kterými v aktu III projde pacient. Hráč tak fyzicky zažije,
jak jeho vlastní rozhodnutí shora vypadá zdola.

**Každý akt je zároveň hratelný samostatně** (deep-link z článků, ze sociálních
sítí): bez uloženého stavu z předchozího aktu se použije doložený default
(reálná vyhláška 2026, resp. „průměrná" nemocnice). Kampaň je bonus, ne podmínka.

## 1) Klíčové vhledy, které trilogie učí

1. **Jeden systém, tři reality** — tentýž uzel (úhradový mechanismus) je pro
   ředitele „z čeho platím výplaty", pro lékaře „proč se výkon nevyplatí",
   pro pacienta „proč je na rezonanci fronta".
2. **Rozhodnutí ↔ omezení** — ministrova vyhláška je ředitelův strop;
   ředitelova úspora je pacientova čekačka.
3. **Nulové součty se propisují dolů** (navazuje na vhled hry na ministra).
4. **Perspektiva = slepá skvrna** — každá role část mapy systému nevidí;
   epilog to ukáže doslova (ztlumené uzly).
5. **Kde chybí evidence, hra to přiznává** — stejná disciplína jako
   Simulátor/Barometr/vyhláška.

## 2) Sdílený herní stav — `src/hra-stav.js` (čistý, testovaný)

- Úložiště: `localStorage` klíč `zdrave-cesko/hra` (vzor `zdrave-cesko/audience`;
  try/catch pattern z `newsletter-popup.js` — privátní režim hru nerozbije,
  jen se nepřenáší stav).
- Struktura: `{ version, ministr: {alloc, verdict}, reditel: {decisions, verdict},
  pacient: {persona, kraj, decisions, outcome}, completed_at }`.
- **Sdílecí kód**: kompaktní base64url serializace stavu do URL parametru
  (`hra.html?k=...`) — výsledovka kampaně je sdílitelná bez backendu a bez
  cookies. Dekódování validuje rozsahy (žádný eval, žádná důvěra vstupu).
- API: `loadState()`, `saveAct(act, data)`, `resetCampaign()`, `encodeShare()`,
  `decodeShare(code)` — pure funkce nad předaným objektem, testovatelné bez DOM.
- Akt I rozšíření: `vyhlaska.js` po vyhodnocení uloží `saveAct('ministr', …)`
  a zobrazí CTA **„Pokračovat jako ředitel nemocnice →"**. Jediný zásah do
  existující hry; engine se nemění.

## 3) Akt II — Ředitel nemocnice (`reditel.html`, namespace `.rd-*`)

**Koncept:** modelová okresní nemocnice (typizovaná, žádná reálná — stejné
pravidlo jako typizovaní zástupci ve vyhlášce). Rok = 4 kvartály; každý kvartál
hráč rozhoduje, systém reaguje. Deterministický engine, žádná náhoda.

### Data — `data/reditel-hra.json`

```json
{
  "hospital": {
    "label": "Modelová okresní nemocnice",
    "baseline_budget_mld": 1.2, "baseline_source": "…",
    "cost_structure": [{ "id": "osobni", "share_pct": 0, "source": "…" }],
    "departments": [{ "id": "porodnice", "label": "…", "closable": true,
      "annual_loss_mld": 0, "source": "…" }]
  },
  "handoff": {
    "note": "růst rozpočtu = vážený růst segmentů akutní + následná lůžková z aktu I",
    "segments": ["nemocnice_akutni", "nasledna_luzkova"],
    "default_growth_pct": 0, "default_source": "reálná vyhláška 432/2025 Sb."
  },
  "decisions": [{
    "id": "platy_sester", "quarter": "all", "label": "…",
    "options": [{ "id": "…", "cost_mld": 0, "effects": [] }]
  }],
  "reactions": [{
    "id": "vypovedi_prescasy", "trigger": "…",
    "precedent_source": "hromadné výpovědi z přesčasů, prosinec 2023 (doloženo v korpusu)"
  }],
  "scorecard": { "axes": ["hospodareni", "personal", "pacienti"] }
}
```

Konkrétní čísla (baseline rozpočet, struktura nákladů, ztrátovost porodnice)
se doloží při dávce B ze stávajícího korpusu (`clanek-financovani-segmenty-2026`,
`data/dohodovaci-rizeni.json` strategic_analysis — osobní náklady lůžkové
+56 % 2019–24, `clanek-gender-pay-gap-zdravotnictvi`, články o přesčasech);
co nepůjde doložit, hra označí jako modelový předpoklad.

### Engine — `src/reditel-engine.js` (čistý, testovaný)

- `budgetFromMinistr(ministrState, handoff)` — rozpočet z aktu I (definitorika);
  bez stavu → default z reálné vyhlášky.
- `quarterStep(state, decisions)` — hospodaření, morálka personálu, kapacity.
- `reactionsFor(state)` — prahy: výpovědi z přesčasů, odchody sester,
  stížnosti pacientů, zásah pojišťovny (každá reakce má doložený precedent).
- `waitingTimes(state)` — modifikátor čekacích dob (předává se do aktu III).
- `verdict(state)` — roční scorecard: hospodaření × personál × pacienti
  (záměrně nejde „vyhrát" všechny tři osy naplno — to je pointa).

### Efektové indikátory (existují v `data/indicators.json`)

`sestry_per_1000`, `osetrovaci_dny_na_uvazek_sestry`, `lekari_per_1000`,
`podil_lekaru_55plus`, `absolventi_osetrovatelstvi_per_100k`,
`cekaci_doba_kycel`, `cekaci_doby_specialist`, `spokojenost_pece`,
`prumerna_delka_hospitalizace`, `podil_vydaje_luzkova_pece`.
Rozpočtová aritmetika = přesná definitorika; dopady na indikátory jen směrové
se zdrojem (vzor `effects` ve vyhlášce), jinak „nedoloženo".

## 4) Akt III — Příběh pacienta (`pribeh-pacienta.html`, namespace `.pp-*`)

**Koncept:** hráč si vybere personu a kraj, projde cestu krok za krokem
s rozhodnutími („zaplatíte si soukromě, nebo čekáte?"). Po dojití do cíle
tlačítko **„Přehrát očima lékaře"** — tatáž cesta, stejné události, ale
obrazovky ukazují kapacity, úhradové limity a administrativu. Kontrast dvou
průchodů je hlavní sdělení aktu.

### Data — `data/pribeh-pacienta.json`

- **3 startovní persony** (typizované, ne reálné osoby), vybrané tak, aby
  znovu použily kostru `data/cesta-pacienta.json` (fáze × diagnózy):
  senior po CMP (iktus), žena 52 let (screening → onkologie),
  chronik s diabetem. Další persony přidávat lze po jedné (jako články).
- Struktura: `{ personas: [{ id, label, kraj_default, disease_ref,
  steps: [{ id, phase_ref, views: { pacient, lekar }, decision?: { options: [
  { id, label, cost_oop?, wait_modifier?, next }] }, indicators: [],
  sources: [] }], outcomes: {…} }] }`.
- Každý krok je podložen indikátorem nebo článkem (čekací doby, `platba_z_kapsy_pct`,
  `dojezd_zzs`, krajská data z `data/regions.json` — cesta v Praze ≠ na Bruntálsku).
- Vstup modifikátorů z aktu II: `waitingTimes()` ředitele posouvá čekání
  v lůžkových krocích; bez kampaně se použijí reálné hodnoty indikátorů.

### Engine — `src/pribeh-engine.js` (čistý, testovaný)

- `applyDecision(state, stepId, optionId)` — deterministický přechod.
- `journeyOutcome(state)` — čas do definitivního ošetření, zaplaceno z kapsy,
  počet kontaktů se systémem; srovnání s hodnotami indikátorů.
- `withCampaignModifiers(persona, reditelState)` — vliv aktu II.
- Žádná náhoda, žádné časovače — jen rozhodnutí hráče.

**Vztah k `cesta-pacienta.html`:** explainer zůstává beze změny (statický
výklad fází); hra na něj odkazuje jako na „mapu" a explainer dostane kartu
„Zahrajte si cestu pacienta" (cross-link, žádná změna textů tvrzení).

## 5) Epilog — perspektivní přepínač „Tři židle" na Modelu systému

Rozšíření `data/system-model.json` (žádný nový soubor):

```json
"nodes": [{ "…": "…",
  "perspectives": {
    "pacient": { "visibility": "clear | fog", "alt_label": "…", "note": "1 věta, jak roli uzel potkává" },
    "lekar":   { "visibility": "…", "alt_label": "…", "note": "…" },
    "reditel": { "visibility": "…", "alt_label": "…", "note": "…" }
  }
}],
"edges": [{ "…": "…", "conflict": true }]
```

- UI v `model-systemu.js`: řádek chipů **Pacient / Lékař / Ředitel / Vše**
  (default Vše = dnešní chování beze změny). Role: `fog` uzly ztlumené
  (`.msys-persp-fog`), panel uzlu ukazuje `alt_label` + `note` role.
- Tlačítko **„Ukázat konflikty"**: zvýrazní hrany `conflict: true` — kde zisk
  jedné role je náklad jiné (např. úspora lůžek × čekací doby).
- Funguje zcela samostatně (návštěvník modelu nemusí hrát kampaň); pokud
  kampaň proběhla, hub na epilog odkáže jako na závěrečnou pointu.
- A11y: chipy jsou `role="radiogroup"`, fallback seznam pod grafem dostane
  per-role poznámky; `prefers-reduced-motion` beze změny chování.

## 6) Hub — `hra.html` (namespace `.hra-*`)

- Hero: „Tři židle — jeden systém, tři pohledy" + poctivý disclaimer
  (modelová hra, typizované postavy, ne predikce).
- 3 karty aktů s progressem ze `hra-stav.js` (nehráno / dohráno + mini-verdikt).
- **Výsledovka kampaně** (po dohrání všech aktů): co jste podepsali → jak
  dopadla nemocnice → jak to prožil pacient; sdílecí odkaz (`encodeShare`);
  CTA na epilog (model) a Diagnózu.
- Zapojení do webu:
  1. **`SITE_TOOLS`** (`page-shared.js`): nová položka `tri-zidle` → `hra.html`
     („Projděte systém očima ministra, ředitele a pacienta."); akty zůstávají
     i jako samostatné položky tam, kde už jsou (vyhláška zůstává).
  2. **Homepage**: karta do `.home-tools-grid` v `index.html` (badge „Nová hra");
     pořadí karet: hub trilogie nahradí na viditelné pozici kvíz, kvíz se posune.
  3. **Navigace** (`renderModuleNav`): child „Tři židle: hra" pod tab
     „Jak funguje"; `reditel.html` do match pole tabu „Financování" (vedle
     vyhlášky), `pribeh-pacienta.html` + `hra.html` do match „Jak funguje".
  4. **Cross-linky**: `vyhlaska.html` CTA na akt II; `cesta-pacienta.html`
     karta na akt III; `diagnoza.html` sekce „léčba" odkáže i na trilogii;
     `tool-siblings` se propíší automaticky ze `SITE_TOOLS`.
  5. **Sitemap + SEO**: `hra.html`, `reditel.html`, `pribeh-pacienta.html`
     do `STATIC_PAGES` v `scripts/generate-sitemap.js`, pak `npm run seo:pages`
     + `npm run generate:sitemap` (test `inject-page-seo.test.js`).

## 7) Poctivost (závazné, stejná disciplína jako vyhláška/Simulátor/Barometr)

- Všechny postavy **typizované** (ředitel, lékařka, pacientka) — žádné reálné
  osoby ani reálná nemocnice; výrazně označeno v UI i datech.
- Rozpočtová a podílová matematika = **definitorika** (přesná); dopady na
  indikátory jen **směrové se zdrojem**; kde evidence chybí, hra to řekne.
- Persony a reakce mají **doložené precedenty** (výpovědi z přesčasů 12/2023,
  čekací doby, OOP platby) — citace u každého kroku.
- Žádné PII, žádné cookies; `localStorage` jen funkční stav hry (zmínit
  v patičce hry a na `o-projektu.html` v sekci o soukromí).
- Vizuál: brand pravidlo — **červená jen hrot střelky kompasu**; role odlišovat
  existujícími barvami vrstev/rolí (`docs/visual-components.md` §0).
- Žádné D3, žádné API klíče, žádná LLM vrstva — deterministické enginy
  (decisions-log).

## 8) Validátory + testy

- `ingest/validate-reditel-hra.js` + `ingest/validate-pribeh-pacienta.js`
  (vzor `validate-vyhlaska-hra.js`): unikátní id; efekt → indikátor existuje
  v `data/indicators.json`; směrový efekt má polarity+strength+source; každá
  reakce má precedent_source; persona kroky odkazují na existující fáze
  `cesta-pacienta.json`; rozhodovací grafy bez cyklů a se stopem; `conflict`
  hrany a `perspectives` validuje rozšířený `validate-system-model.js`
  (visibility z enum, poznámky neprázdné). Vše zapojit do `validate:all`.
- Testy (`node:test`): `tests/hra-stav.test.js` (encode/decode roundtrip,
  odmítnutí zmanipulovaného kódu, verze stavu), `tests/reditel.test.js`
  (budgetFromMinistr s/bez stavu, prahy reakcí, verdict osy),
  `tests/pribeh-pacienta.test.js` (determinismus průchodu, outcome aritmetika,
  kampaňové modifikátory), rozšíření `tests/system-model.test.js`.
- UI: Playwright screenshoty nových stránek + `test:a11y` axe scan;
  po úpravě CSS vždy `npm run build:css` (hlídá test).

## 9) Co tento plán NEDĚLÁ

- Nemění engine ani čísla existující hry na ministra (jen ukládá výsledek
  a přidává CTA).
- Nemění obsah `cesta-pacienta.html` explaineru ani textů článků (jen cross-linky).
- Žádný backend, účty, leaderboardy — sdílení jen přes URL kód.
- Žádná predikce: výstupy jsou modelové ilustrace doložené evidence.
- Multiplayer, gamifikační odznaky, ukládání na server — mimo rozsah.

## 10) Dávky (každá = samostatný branch + PR)

| Dávka | Obsah | Závislost |
|---|---|---|
| 0 | Tento plán | — |
| A | `hra-stav.js` + testy + rozšíření `vyhlaska.js` (uložení výsledku, CTA) | 0 |
| B | Ředitel: sourcing čísel → `reditel-hra.json` + engine + validátor + testy; poté `reditel.html` UI + CSS | A |
| C | Příběh pacienta: persony → `pribeh-pacienta.json` + engine + validátor + testy; poté `pribeh-pacienta.html` UI + CSS | A (kampaňové modifikátory až po B) |
| D | Perspektivy: `system-model.json` rozšíření + validátor + přepínač UI | — (nezávislá) |
| E | Hub `hra.html` + homepage karta + nav + SEO/sitemap + cross-linky + výsledovka + finální a11y/vizuální smoke | B, C, D |

Dávky B a C mají interně stejný rytmus jako vyhláška v2: nejdřív data + engine
+ validátor + testy (reviewovatelná substance), pak UI. Dávka D je nezávislá
a může jít paralelně.

*Generated by Claude Code.*
