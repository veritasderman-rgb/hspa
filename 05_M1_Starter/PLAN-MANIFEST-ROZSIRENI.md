# Plán: Rozšíření manifestu — „omáčka okolo" + multi-úroveň substránek

**Stav:** ready for review.
**Datum:** 2026-05-29.
**Branch:** `claude/plan-manifest-rozsireni`.
**Cíl:** současný `clanek-manifest-reforma-zdravotnictvi.html` (text 13 priorit od Pavlovic / Malíková / ČPS Resortní tým) **obsahově nedotčen**. Přidat: silnější hero, „proč tato reforma" rámec, animované klíčové grafy, prolinkování s indikátory, samostatné substránky pro každou z 13 priorit.

---

## 0) Současný stav

**Soubor:** `clanek-manifest-reforma-zdravotnictvi.html` (410 řádků)

**Struktura:**
- Hero (article-page layout, h2 + perex)
- „Hodnoty, na kterých to celé stojí"
- 13 priorit (h3 každá, ~12–18 vět)
- Závěr

**Metadata** (`data/articles.json`):
- `kind: "manifest"`
- 10 `linked_indicators` (mortalita_kardiovaskularni, screening_kolorektalni, alkohol_spotreba, kuractvi_denni, sebevrazdy_per_100k, …)
- Topics: `legislativa`
- Date: 2026-05-07

**Co chybí:**
- Žádná animace / vizuální dynamika (statický long-form)
- Žádný „why now / why this" frame (čtenář dostane 13 priorit bez kontextu, proč právě tyto)
- Žádné prolinkování konkrétních indikátorů do jednotlivých priorit (jen sumární `linked_indicators` v metadata)
- Žádné substránky pro priority — 13 témat v jedné scrollovací rouře
- Hero je standardní article-page (kicker + h2 + perex) — manifest by si zasloužil silnější vstup

---

## 1) Cílový stav — 5 vrstev

### Vrstva 1 — Nový hero (silnější vstup)

**Současný hero:**
```
[kicker] Manifest
[h2] Průvodce reformou českého zdravotnictví. Třináct oblastí…
[perex] Politický manifest — souhrn 13 priorit, na kterých…
```

**Cílový hero** — varianta podle UX-grade editorial otvírače:

**Možnost A — „Proč zrovna teď"** (kontext + emoce):
```
[kicker] MANIFEST · 2026
[obří headline] „Zdravotnictví se nedá reformovat. Dá se ho ale začít opravovat."
[lead] Třináct oblastí, kde dává smysl pracovat — ne politický program, ale
       seznam priorit, na kterých se shoduje pacient, lékař i analytik dat.

[3 stats kotvy s animací]:
  100+ mld   deficit veřejného pojištění do 2030 bez reformy
  463 / 100k  KV mortalita ČR — 48 % nad EU-27
  37,1 %      AWaRe Access — pod WHO cílem 60 %
```

**Možnost B — „Příběh jednoho rozhodnutí"** (storytelling):
```
[kicker] MANIFEST
[h1] Co kdyby byla reforma sestavena podle dat, ne podle koalice?
[lead] Tohle je seznam 13 oblastí, na kterých se shodují lidé z různých
       světů — pacient, lékař, ekonom, analytik. Jejich společným jazykem
       jsou data HSPA Monitoru.
[autoři + datum + audit-status badge]
```

**Možnost C — „Manifesto-style typography"** (silný typografický statement):
```
[full-width hero s paper2 backgroundem]
[obrovský serif 80px italic]
„Tohle není program. Tohle je seznam míst, kde to bolí."
[velký rule]
[3 sloupce: HODNOTY · PRIORITY · MĚŘENÍ]
```

**Doporučuju Možnost A** — kombinuje emoci (kvotace) + tvrdá data (3 stats) + funguje jako hub do priorit.

### Vrstva 2 — Sekce „Proč tato reforma" (nová, mezi hero a hodnotami)

**Cíl:** dát kontext, **proč** těchto 13 priorit a **proč právě teď**.

**Obsah:** 3 expanze:
1. **„Co je špatně"** — krátký výčet stávajícího stavu (KV mortalita, screening propad, dental gap, mental health crisis) s odkazem na indicator.html
2. **„Co je metodika"** — vysvětlit, že priority nevznikly z politického programu ale z dlouhodobé diskuze s pacientskými organizacemi + datovou perspektivou HSPA
3. **„Kdo za tím stojí"** — Pavlovic / Malíková / ČPS Resortní tým — credentials + disclaimer (osobní pohled, ne formální stranická politika)

**Vizuál:** 3 expanze v karet stylu (`hero-detail`-like), s ikonou každý

### Vrstva 3 — Animace klíčových čísel

V hero stats (3 čísla) + v každé prioritě, která má **numerický háček**, dát animovaný `.av-counter` (IntersectionObserver count-up):

- Priorita 1 „Za stejné peníze více muziky" — počet pojištěnců, výdaje per capita
- Priorita 5 „Dostupné léky" — aktivní výpadky léčiv (z dashboard)
- Priorita 8 „Prevence jako standard" — screening propustnost
- Priorita 11 „Vzdělání personálu" — chybějících sester / lékařů
- Priorita 13 „Duševní zdraví" — sebevraždy / 100k, antidepresíva

### Vrstva 4 — Prolinkování s indikátory (linked_indicators per priority)

**Současný stav:** všech 10 `linked_indicators` v metadata, žádné per-priority napojení.

**Cíl:** Každá z 13 priorit má **inline data card** s 1–3 konkrétními HSPA indikátory:

```
Priorita 8 · Prevence jako standard
  [text manifestu — nezměněn]

  ▼ Data, která tomu dávají kontext
  [karta] mortalita_kardiovaskularni → 463 / 100k (ČR vs EU-27 313)
  [karta] screening_kolorektalni → účast 28 % (cíl OECD 65 %)
  [karta] alkohol_spotreba → 14,4 l čistého alkoholu/os (3. nejvyšší v EU)
```

**Mapping** priority → indikátory (návrh — schválit s autory):

| Priorita | Indikátory |
|---|---|
| 1 Za stejné peníze více muziky | platba_z_kapsy_pct, financovani_per_capita |
| 2 Volba bez úplatků | spokojenost_informovani |
| 3 Pojištěnec na prvním místě | (qualitative — bez indikátoru) |
| 4 Transparence | ehealth_adoption |
| 5 Dostupné léky | vypadky_leciv_aktivni |
| 6 Sociálně-zdravotní pomezí | (qualitative) |
| 7 Klinický výzkum | (qualitative) |
| 8 Prevence | screening_kolorektalni, kuractvi_denni, alkohol_spotreba |
| 9 Stomatologie | (qualitative — chybí indikátor) |
| 10 Data ve službách pacienta | ehealth_adoption, spokojenost_informovani |
| 11 Vzdělání personálu | (kvalitativní + tabulka KS) |
| 12 Práva pacientů | (qualitative) |
| 13 Duševní zdraví | sebevrazdy_per_100k, pouzivani_antidepresiv |

### Vrstva 5 — Multi-úroveň substránky

**Cíl:** Každá z 13 priorit může mít **vlastní substránku** s hlubším rozborem (politická souvislost, mezinárodní inspirace, konkrétní legislativní páky, harmonogram).

**Architektura:** `manifest/priorita-{N}-{slug}.html` (např. `manifest/priorita-08-prevence.html`)

**URL strategie 2 varianty:**

**Varianta A — Samostatné HTML soubory** (13 nových stránek)
- ✅ statický, indexovatelný, sdílitelný link
- ❌ duplicitní layout boilerplate × 13
- ❌ jakákoli společná změna nav = 13 souborů

**Varianta B — Single page + hash routing** (`#priorita-8`, `#priorita-13`)
- ✅ jeden soubor, snadná údržba
- ❌ SPA-like, méně SEO-friendly
- ❌ sdílení URL složitější

**Varianta C — Hybrid** (doporučuji)
- 1 hlavní manifest stránka **nezměněna** v core obsahu
- 13 priorit má `<details>` expand s **rozsáhlejším obsahem** (mezinárodní inspirace, legislativní páky)
- Plus odkaz „Detail priority →" do samostatné stránky pro priority, kde má autor delší rozbor (postupně, jen u některých)
- Jiné priority mohou zůstat jen v hlavním manifestu (žádná forced parita)

**Doporučení:** Varianta C — postupná evoluce, žádný all-or-nothing.

---

## 2) Implementační fáze

### Fáze A — Nový hero (PR-A, ~2 h)

- `clanek-manifest-reforma-zdravotnictvi.html` hero replace
- Nová CSS `.manifest-hero-*` (může reuse `ed-hero` patternu)
- 3 stats s `.av-counter` animací
- Hero meta updated (cover image regenerován s novým headline)

### Fáze B — „Proč tato reforma" sekce (PR-B, ~3 h)

- Nová sekce mezi hero a „Hodnoty"
- 3 expanze (`hero-detail`-like pattern) s ikonami
- Text napsaný (s `audit-status: review-pending` v metadata pro autorské schválení)
- CSS `.manifest-why-*`

### Fáze C — Animace klíčových čísel v prioritách (PR-C, ~2 h)

- Doplnit `<span class="av-counter">` na 5–6 míst v současném textu
- **Bez změny obsahu** — jen wrap konkrétních čísel
- Test: IntersectionObserver triggeruje count-up

### Fáze D — Inline data cards per priority (PR-D, ~4 h)

- Pro každou ze 13 priorit s indikátory přidat `<details>` s data cards
- Použít existující `.indicator-mini-card` nebo nový `.manifest-data-card`
- Fetch z `data/indicators.json` na page-load (renderer)
- Statická textová fallback verze (kdyby JS selhal)

### Fáze E — Substránky (volitelně, postupně) (PR-E1, E2, …)

- Vytvořit framework adresáře `manifest/`
- Layout template (sdílí topbar + footer s portálem)
- První 2–3 priority s rozšířeným obsahem (například Prevence, Duševní zdraví, Léky)
- Linky z hlavního manifestu „Detail →"
- Postupně doplnit ostatní

### Fáze F — Cross-linking ze stránky indikátoru (PR-F, ~1 h)

- Na `indicator.html` přidat blok „Tento indikátor je součástí manifestu"
- Linkne na konkrétní prioritu manifestu

---

## 3) Co tento plán NEDĚLÁ

- **NEMĚNÍ samotný politický obsah manifestu** — 13 priorit zůstává wordding-identical
- **NEMĚNÍ autorství** — Pavlovic / Malíková / ČPS Resortní tým v krediture
- **NEMĚNÍ audit-status** existujícího článku na produkci
- **NEPŘIDÁVÁ nové priority** — výhradně rozšíření okolního UX
- **NEMĚNÍ data/articles.json metadata** kromě eventuálního doplnění substránek

---

## 4) Časový a effortový odhad

| Fáze | Effort | PR |
|---|---|---|
| A — Nový hero | ~2 h | 1 |
| B — „Proč tato reforma" | ~3 h | 1 |
| C — Animace čísel | ~2 h | 1 |
| D — Inline data cards | ~4 h | 1 |
| E — Substránky (3 priority) | ~6 h | 3 |
| F — Cross-link z indicator.html | ~1 h | 1 |
| **Celkem core (A-D + F)** | **~12 h** | **5** |
| **+ E volitelně** | **+~6 h** | **+3** |

---

## 5) Otázky před implementací

1. **Hero varianta:** A („Proč zrovna teď" + 3 stats), B (storytelling), C (typography statement) — nebo kombinace?
2. **Substránky strategie:** A (13 samostatných), B (single page hash), nebo **C (hybrid s postupnou expanzí)**?
3. **Linked indicators mapping:** přijmout můj návrh (sekce 1, Vrstva 4 tabulka), nebo upravit per priority?
4. **Pořadí implementace:** A → B → C → D → F (postupně), nebo skočit rovnou na D (data cards) jako největší value?
5. **Substránky autor obsah:** chcete obsah pro priority sepsat sami / s ČPS Resortním týmem, nebo mám sepsat draft pro tři vybrané?

---

## 6) Schvalovací bod

Tento plán čeká na schválení uživatelem. Po `OK` přejdu rovnou k Fázi A (nový hero).

---

*Generated by Claude Code.*
