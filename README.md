# Zdravé Česko — projekt HSPA pro Českou republiku

Komplexní projektový balíček pro implementaci veřejného portálu pro hodnocení výkonnosti zdravotního systému ČR podle metodiky OECD HSPA, inspirovaný belgickým modelem **Healthy Belgium**.

## Co je v balíčku

### 01_Prototyp_Dashboard / index.html
Interaktivní HTML prototyp veřejného portálu. Otevři přímo v prohlížeči.

- **3 audience-vrstvy**: Pro veřejnost · Pro odborníky · Pro tvůrce politik
- **8 sekcí**: Přehled, Výsledky, Výstupy, Procesy, Struktury, Tematické moduly, Regiony, Metodika
- **41 indikátorů** s mock daty inspirovanými reálnými zdroji (OECD Health at a Glance 2025, NZIS, NRC)
- Sparklines, srovnání s OECD průměrem, regionální tabulka, zdroje
- Postaveno na Chart.js, čistý HTML/JS, žádné build kroky

### 02_Strategicky_dokument / Zdrave_Cesko_Strategicky_plan.docx
15-stránkový strategický plán pro stakeholdery (MZČR, ÚZIS, NRC, pojišťovny).

Obsahuje 12 kapitol: manažerské shrnutí, vize, rámec HSPA (4 oblasti × 12 domén × 28 subdomén × 122 indikátorů), datové zdroje, architektura, governance, komunikační strategie, fázovaná roadmapa, rozpočet (~85 mil. Kč na 3 roky), rizika, KPIs, závěr a literatura.

### 03_Prezentace / Zdrave_Cesko_Prezentace.pptx
16slidová prezentace pro stakeholdery v palete Ocean Gradient.

Slide-by-slide: Title → Problém → Inspirace Belgie → Co máme → Co chybí → Návrh → HSPA rámec → Tematické moduly → 8 čísel o ČR → Datové zdroje → Governance → Roadmapa → Rozpočet → Rizika → KPIs → Call to action.

## Klíčové parametry projektu

| Parametr | Hodnota |
|---|---|
| Časový horizont | 36 měsíců (3 fáze) |
| Rozpočet | ~85 mil. Kč |
| MVP launch | Měsíc 12 (~33,5 mil. Kč) |
| Indikátorů ve fázi 1 | 40 |
| Indikátorů cílových | 120+ |
| Tematických modulů | 6 (mentální zdraví, prevence, senioři, equity, závěr života, environmentální udržitelnost) |

## Hlavní opory v existujících zdrojích ČR

- **OECD HSPA Rámec pro ČR (2023)** — již vytvořený rámec se 122 indikátory
- **NZIS** spravovaný ÚZIS (zákon 372/2011 Sb.) — 26 zdravotních registrů
- **NZIP** — Národní zdravotnický informační portál jako platforma
- **Strategický rámec rozvoje péče o zdraví v ČR do 2035** (MZČR 12/2025)
- **Národní strategie eZdraví 2025–2035** — datová interoperabilita
- **NRC indikátory kvality**, VZP/SZP datasety, SZÚ EHIS/EHES, ČSÚ, OECD/Eurostat

---
*Verze 1.0 · květen 2026*
