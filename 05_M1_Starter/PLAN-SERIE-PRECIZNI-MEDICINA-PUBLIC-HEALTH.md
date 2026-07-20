# Plán: Série „Přesná medicína vs. veřejné zdraví — spor o jeden systém"

**Stav:** schváleno vlastníkem (2026-07-20), píše se.
**Datum:** 2026-07-20.

**Rozhodnutí redakce (uzamčeno 2026-07-20):**
1. **Rozsah: 6 dílů** (plný oblouk dle §2).
2. **Linie a tag:** pod stávající populačně-determinantovou — tag
   `Populace a determinanty · spravedlnost` (žádná nová linie/tag).
3. **Díl 6: policy-doporučující (manifest)** — konkrétní doporučení pro ČR.
4. Tempo: psát po dávkách dle §9 (dávka 1 = díly 1+2).
**Branch:** `claude/serie-precizni-medicina-public-health`.
**Typ:** edukativně-publicistická série (long-form), 6 dílů, sériová navigace
jako u „Jak (ne)reformovat komplexní systém".

> **Účel dokumentu:** samostatný vstupní bod pro napsání série o napětí mezi
> **personalizovanou/přesnou medicínou (PM)** a **veřejným zdravím (PH)** —
> tématu, které na webu zatím nemáme. Drží oblouk série, per-díl karty,
> ověřený zdrojový registr, editorial pravidla a české ukotvení. Po schválení
> vlastníkem se píše po dávkách (1 díl = 1 PR jako draft).

---

## 0) Proč to děláme a co je spor

Na webu chybí vrstva, která pojmenuje jeden z nejdůležitějších sporů současné
zdravotní politiky: **utrácíme na správné straně?** Na jedné straně stojí
příslib přesné medicíny — genomika, cílená onkologická léčba, „správný lék
správnému pacientovi". Na druhé straně kritika, že PM je **„odvádění pozornosti"**
(distraction) od toho, co populační zdraví skutečně určuje: sociální
determinanty, nerovnosti, prevence. Spor není akademický — rozhoduje o tom,
kam půjdou desítky miliard z veřejného pojištění.

**Přímý spouštěč a kotva série** je recenzovaná studie:

> Galasso I., Pickersgill M., Testa G. (2026). *Precision medicine 'versus' or
> 'for' public health? Different configurations of precision medicine in
> relation to the social determinants of health.* Social Science & Medicine.
> DOI: **10.1016/j.socscimed.2025.118785**.

Studie analyzuje dokumenty a rozhovory kolem **USA Precision Medicine
Initiative (All of Us)** a **UK 100,000 Genomes Project** a rozlišuje **tři
konfigurace**, jak se PM staví ke zdraví populace a k sociálním determinantům —
od „PM proti PH" přes „PM jako PH" (precision public health) až po polohy mezi
tím. Tento rámec tří konfigurací je páteří série; každý díl ho aplikuje na
jednu rovinu a ukotví v českých datech a strategiích.

**Co série NENÍ:** není to obhajoba ani odsudek přesné medicíny. Je to poctivé
zmapování sporu, jeho evidence a toho, jaké volby před Českem stojí.

## 1) Hlavní teze a spojovací oblouk

Napětí PM↔PH není spor „dobra a zla", ale spor o **rámování problému**: koho
vidíme jako jednotku zdraví — jednotlivce s jeho genomem, nebo populaci s jejími
podmínkami. Série ukazuje, že odpověď „obojí" je snadná rétoricky a těžká
rozpočtově a institucionálně — a že způsob, jakým PM zapojíme (nebo nezapojíme)
do veřejného zdraví, rozhoduje o tom, jestli nerovnosti zmenší, nebo prohloubí.

## 2) Oblouk série (6 dílů)

| Díl | Pracovní název | Jádro | České ukotvení |
|---|---|---|---|
| 1 | **Spor, který se nevede nahlas** | Co je PM/PH, proč je někdo staví proti sobě; „distraction" argument | výdaje na centrovou léčbu × na prevenci (`clanek-financovani-segmenty-2026`, `clanek-vydaje-prevence`) |
| 2 | **Tři způsoby, jak smířit genom a populaci** | Jádro Galasso et al.: tři konfigurace PM vs. SDH; All of Us a 100KGP | rámec pro čtení české debaty |
| 3 | **Precizní veřejné zdraví: příslib, nebo přebalený individualismus?** | „Precision public health" (Khoury a spol.); kdy cílení pomáhá populaci | screeningy jako hraniční případ (`clanek-mamograf-rakovina-prsu`, `clanek-plicni-screening-ucast`) |
| 4 | **Co doopravdy určuje zdraví národa** | Sociální determinanty vs. genom; riziko prohloubení nerovností (reprezentace v kohortách, přístup k datům) | `clanek-zdravotni-gramotnost`, krajské nerovnosti, gradient |
| 5 | **Solidarita, nebo osobní účet?** | Biopolitika, sdílení dat, kdo platí cílenou léčbu; strukturální nespravedlnost | vzácná onemocnění, centrová léčba, HTA (`clanek-vzacna-onemocneni-strategie-2035`, `clanek-hta-jca-eu-2026`) |
| 6 | **Česká cesta: přesně, a přitom spravedlivě** | Syntéza + policy: jak PM zapojit reflexivně do PH | národní genomika, screeningové centrum, doporučení |

Rozsah: **1 800–3 200 slov/díl**, tempo ~1 díl / 10–14 dní. Díly propojené
sériovou navigací (pásek 1–6 + prev/další), vzor `src/series-nav.js`.

## 3) Per-díl karty (teze, obsah, doklady)

### Díl 1 — Spor, který se nevede nahlas
- **Teze:** Rozpočet je konečný; každá koruna do cílené léčby je koruna, která
  nešla do prevence nebo do odstraňování nerovností — a naopak. Spor se u nás
  nevede otevřeně, ale rozhoduje se implicitně každou úhradovou vyhláškou.
- **Obsah:** definice PM (stratifikace, genomika, cílená léčba) vs. PH
  (populace, prevence, determinanty); „distraction" argument a protiargument;
  proč to není nulový součet rétoricky, ale je jím rozpočtově.
- **Doklady:** podíl výdajů centrová léčba vs. prevence (existující data webu);
  Galasso et al. (rámec); odkaz na hru „Úhradová vyhláška" jako zážitkovou ilustraci.

### Díl 2 — Tři způsoby, jak smířit genom a populaci
- **Teze:** Neexistuje jedna „přesná medicína" — existují nejméně tři různé
  politické projekty schované pod jedním jménem.
- **Obsah:** jádro Galasso et al. — tři konfigurace vztahu PM↔SDH; případové
  studie All of Us (USA) a 100,000 Genomes (UK): co slíbily populačně a co
  reálně dodaly; poučení pro ČR.
- **Doklady:** Galasso et al. 2026 (primární); veřejné materiály All of Us a
  Genomics England.

### Díl 3 — Precizní veřejné zdraví: příslib, nebo přebalený individualismus?
- **Teze:** „Precision public health" může znamenat chytřejší cílení intervencí
  na populaci — nebo jen individualizaci převlečenou za populační jazyk.
- **Obsah:** linie Khoury (od genů k populačnímu zdraví); kdy cílení (geografické,
  rizikové) skutečně zlepší populační ukazatel; screening jako hraniční případ,
  který obě logiky spojuje i rozděluje.
- **Doklady:** Khoury MJ (Public Health Genomics); české screeningy — účast a
  nerovnosti v účasti (existující články).

### Díl 4 — Co doopravdy určuje zdraví národa
- **Teze:** Většinu populačního zdraví vysvětlují podmínky, ne geny; PM, která
  ignoruje determinanty, riskuje, že nerovnosti prohloubí (kdo je v kohortách,
  kdo má přístup k datům a drahé léčbě).
- **Obsah:** sociální determinanty a gradient; reprezentativnost genomických
  kohort; „inverzní zákon péče" v éře dat; česká krajská nerovnost.
- **Doklady:** `clanek-zdravotni-gramotnost`; krajské indikátory (gradient
  lékaři/1000, dostupnost); Green/Prainsack/Sabatello (strukturální nespravedlnost).

### Díl 5 — Solidarita, nebo osobní účet?
- **Teze:** PM testuje samu logiku solidárního pojištění: extrémně drahá léčba
  pro velmi malé skupiny vs. plošné intervence pro mnohé. Sdílení dat je přitom
  podmínkou i rizikem.
- **Obsah:** biopolitika a solidarita (Prainsack); ekonomika vzácných onemocnění
  a centrové léčby; role HTA jako arbitra; ochrana dat a diskriminace.
- **Doklady:** `clanek-vzacna-onemocneni-strategie-2035`, `clanek-hta-jca-eu-2026`,
  `clanek-financovani-segmenty-2026` (centrová léčba jako segment).

### Díl 6 — Česká cesta: přesně, a přitom spravedlivě
- **Teze:** PM a PH se nevylučují, ale smíření není zadarmo — vyžaduje vědomé
  institucionální volby (co měřit, koho zahrnout, kdo rozhoduje o úhradě).
- **Obsah:** syntéza tří konfigurací pro české prostředí; národní genomika a
  screeningové centrum; konkrétní policy doporučení (reprezentativita, HTA
  s ohledem na spravedlnost, prevence jako protiváha, governance dat).
- **Doklady:** české strategie (genomika, onkologie), syntéza dílů 1–5.

## 4) Ověřený zdrojový registr (aktualizovat před publikací každého dílu)

| Zdroj | Použití | Ověřeno |
|---|---|---|
| Galasso, Pickersgill, Testa — *Precision medicine 'versus' or 'for' public health?* Soc Sci Med 2026, DOI 10.1016/j.socscimed.2025.118785 | primární rámec (díly 1, 2, 6) | ✅ Europe PMC (PMID 42215252) |
| Green, Prainsack, Sabatello — *Precision medicine and the problem of structural injustice.* Med Health Care Philos 2023, DOI 10.1007/s11019-023-10158-8 | strukturální nespravedlnost (díly 4, 5) | ✅ Europe PMC |
| Khoury MJ — *From Genes to Public Health: The Journey Continues!* Public Health Genomics 2025, DOI 10.1159/000545406 | linie precision public health (díl 3) | ✅ Europe PMC |
| Knoppers et al. — *Imagining Genomics and Population Health in 2050.* Public Health Genomics 2026, DOI 10.1159/000552755 | výhled/governance (díl 6) | ✅ Europe PMC |
| Existující články webu (screening, vzácná onemocnění, HTA, gramotnost, financování segmentů) | české ukotvení všech dílů | ✅ v korpusu |

**Pravidlo:** každý netriviální nárok v článku má dohledatelný zdroj; primární
tvrzení o „třech konfiguracích" se opírají výhradně o Galasso et al. a citují ji.
Před publikací dílu ověřit případná nová česká data (genomika, úhrady) živě.

## 5) Editorial a vizuální pravidla (dle `docs/conventions.md`)

- Layout `article-page` dle vzoru existujícího článku; `<meta article:audit-status>`,
  audit blok v HTML komentáři (ne ve viditelném textu).
- Tag: nový sdílený **„Přesná medicína · veřejné zdraví"** (nebo využít
  `Populace a determinanty · spravedlnost`) — k rozhodnutí redakcí.
- AV komponenty (`.av-*`) pro vizuály; **červená jen hrot kompasu**.
- Poctivost: spor podat vyváženě (obě pozice se svými nejlepšími argumenty),
  ne jako předem rozhodnutý; jasně odlišit doložené od interpretace.
- Drafty `published: false`, `audit-status: draft`; publikace přes frontu
  (`scripts/publish-scheduled.js`) po redakčním schválení.

## 6) Zapojení do webu

- **Tematická linie** (`data/themes.json`): buď nová linie „Přesná medicína a
  spravedlnost", nebo zařazení pod existující populačně-determinantovou linii.
- **Sériová navigace** `src/series-nav.js`: nový registr 6 slugů (pásek 1–6).
- **Glosář:** doplnit termíny (přesná/personalizovaná medicína, precision public
  health, sociální determinanty, biobanka/kohorta, solidarita v pojištění).
- **Cross-linky:** z Modelu systému (uzel „Sociální determinanty", „Léková
  politika") a z Diagnózy relevantních indikátorů.

## 7) Slugy (návrh)

1. `clanek-presna-medicina-vs-verejne-zdravi-spor.html`
2. `clanek-presna-medicina-tri-konfigurace.html`
3. `clanek-precizni-verejne-zdravi.html`
4. `clanek-co-urcuje-zdravi-naroda.html`
5. `clanek-presna-medicina-solidarita.html`
6. `clanek-presna-medicina-ceska-cesta.html`

Čísla článků (`number`) přidělit až při psaní (aktuální max 535).

## 8) Otázky k rozhodnutí redakcí (před psaním)

1. **Rozsah:** 6 dílů dle výše, nebo užší (4 díly: spor / tři konfigurace /
   determinanty a solidarita / česká cesta)?
2. **Tag a linie:** nová linie „Přesná medicína a spravedlnost", nebo pod
   stávající populačně-determinantovou?
3. **Tón dílu 6:** čistě analytický, nebo policy-doporučující (jako „manifest")?
4. **Tempo:** psát všech 6 postupně, nebo nejdřív pilotní díl 1 + díl 2
   (jádro rámce) a podle ohlasu pokračovat?

## 9) Dávky (každá = samostatný PR, drafty)

| Dávka | Obsah |
|---|---|
| 0 | Tento plán (schválení oblouku, rozhodnutí §8) |
| 1 | Díl 1 + díl 2 (spor + rámec tří konfigurací) + sériová navigace + linie + glosářové termíny |
| 2 | Díl 3 + díl 4 |
| 3 | Díl 5 + díl 6 + syntézní cross-linky (Model systému, Diagnóza) |

Každý díl: HTML článek, záznam v `data/articles.json` (`published:false`,
`draft`), cover, audit blok, `npm run validate:all` + `npm test`.

*Generated by Claude Code.*
