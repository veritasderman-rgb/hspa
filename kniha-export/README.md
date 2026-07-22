# Skóre zdravotnictví 2026 — Export balíček pro sazbu knihy
## Handoff pro Cowork session + Affinity Publisher

Tento adresář je **kompletní podklad pro vysázení knihy** *Skóre zdravotnictví
2026 — Jak jsme na tom*. Vznikl překlopením veřejného portálu
**skorezdravotnictvi.cz** (HSPA Monitor) do knižní podoby.

Balíček je navržen tak, aby ho **další Cowork session** vzala a v **Affinity
Publisher** z něj vysázela hotovou knihu — bez nutnosti vracet se pro chybějící
rozhodnutí. Vše, co sazba potřebuje, je zde.

---

## 📁 Co je v balíčku

```
kniha-export/
├── README.md                  ← tento soubor (jak balíček použít)
├── 00-brief.md                ← ZÁMĚR: co kniha je, komu slouží, tón, vztah k MZ
├── 01-design-system.md        ← GRAFICKÁ PODOBA: formát, grid, barvy, typografie,
│                                  komponenty, obálka → paragraph/object styles v Affinity
├── 02-obsah-struktura.md      ← OBSAH: kompletní osnova, díly/kapitoly, pořadí,
│                                  mapování článků webu na kapitoly knihy
├── 03-grafy-spec.md           ← GRAFY: které zařadit, jak vypadají, které NEmít,
│                                  interaktivní prvky → statické infografiky + QR
├── 04-zdroje-metodika.md      ← DŮVĚRYHODNOST: zdroje, metodika HSPA, signály,
│                                  čerstvost, citační pravidla
├── manuskript/                ← TEXT knihy po kapitolách (Markdown, knižní forma)
│   ├── 00-predmluva.md
│   ├── 01-uvod-jak-cist.md
│   ├── dil-*/…                ← kapitoly po dílech (6 dimenzí)
│   └── zz-metodika-zdroje.md
├── grafika/                   ← statické verze klíčových grafů (SVG/PNG) pro tisk
├── podklady/                  ← pomocné: extrahovaná data, manifesty, skript převodu
│   ├── article-manifest.json  ← které články → které kapitoly, stav, pořadí
│   └── convert-article.mjs    ← skript: clanek-*.html → knižní Markdown
└── (výstup sazby vzniká v Affinity session)
```

## 🚀 Postup pro sázecí session (doporučené pořadí)

### Fáze 1 — Nastavení dokumentu (podle `01-design-system.md`)
1. Založ dokument **190 × 250 mm**, okraje dle §2 (vnější 34 mm na marginálie).
2. Vytvoř **barevnou paletu** (globální swatche): 5 základních + 4 signální +
   6 dimenzních (HEX v §3). Ověř červenou `#B8361E` na CMYK nátisku.
3. Nech si přes **Adobe `font_recommend`** navrhnout konkrétní licencované řezy
   podle charakteristiky v §4 (serif pro text + grotesk s tabular figures pro
   data). Nainstaluj a založ **paragraph/character styles** dle velikostní
   stupnice.
4. Vytvoř **master pages A–E** (§2) a **object styles** pro karty indikátorů,
   4 typy boxů, graf-rámec, QR blok (§5).
5. Vytvoř **table style** pro datové tabulky (§5).

### Fáze 2 — Nalití obsahu (podle `02-obsah-struktura.md`)
6. Postav **kostru knihy**: front matter → 6 dílů → zadní matter (přesné pořadí
   a kapitoly v `02`).
7. Naimportuj texty z `manuskript/` (Markdown). Přiřaď paragraph styles. Kapitoly
   jsou v pořadí dle `02` a `podklady/article-manifest.json`.
8. U každé kapitoly umísti její **grafy** (viz `03-grafy-spec.md` — každý graf má
   ID, typ, data, popisek, QR URL). Statické verze jsou v `grafika/`; zbytek
   vyrob podle spec.

### Fáze 3 — Grafika a interaktivní prvky
9. Grafy saž **jednotně** podle vizuálního jazyka v `03` (jeden typ = jeden vzhled).
10. Interaktivní prvky (model systému, hry Tři židle, mapa krajů) → **statická
    infografika + QR** na živou verzi (URL v `03`).
11. **Kompas** na obálku, hřbet, předsádky (assety `05_M1_Starter/assets/brand/`,
    pravidlo: červená = jen hrot střelky).

### Fáze 4 — Dokončení
12. Vlož **paginaci, živá záhlaví, barevný index na ořezu** (§7 designu).
13. Zkontroluj **čísla proti datovému řezu** (`04-zdroje-metodika.md §5`) a
    označení **ilustrativních** hodnot.
14. Vygeneruj **obsah (TOC)** a **rejstřík** automaticky ze stylů nadpisů.
15. Export: tiskové PDF (CMYK, ISO Coated v2, spadávka 3 mm) + digitální PDF (RGB).

## 🔧 Regenerace / aktualizace manuskriptu

Manuskript vznikl skriptem z HTML článků. Pro nový datový řez nebo přidané
články spusť v `05_M1_Starter/`:

```bash
node ../kniha-export/podklady/convert-article.mjs   # převede vybrané články
```

Skript čte `podklady/article-manifest.json` (seznam vybraných článků + pořadí)
a produkuje čisté Markdown soubory do `manuskript/`. Ruční úpravy knižní
redakce dělej až po převodu (nebo v samotné sazbě).

## ⚖️ Klíčová pravidla (nepřekročit)
- **Červená jen pro signál a hrot kompasu.** Nikdy plochy.
- **Ilustrativní data viditelně označit** (nikdy neprezentovat seed jako ověřené).
- **Signál = tvar + barva + slovo** (funguje černobíle a pro barvoslepé).
- **Čísla v knize musí sedět k datovému řezu** — projít claims před finální sazbou.
- **Interaktivní ≠ tisk.** Hry a živé prvky jdou do knihy jako statika + QR.

## 📌 Zdroj pravdy
Web **skorezdravotnictvi.cz** (repo `05_M1_Starter/`) zůstává živým zdrojem.
Kniha je **ročenkový řez** — pevný, citovatelný, s odkazy zpět na web.
