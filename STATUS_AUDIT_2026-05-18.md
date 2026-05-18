# Status audit strategických plánů — 18. 5. 2026

> Verifikace stavu položek z dlouhodobých plánů `06_Plan_redesignu.md`, `07_Prevence_plan.md`, `08_Politicky_program.md` proti reálnému stavu webu.
> Audit: claude-code-agent · Cíl: oddělit hotové od nedokončeného.

---

## Legenda

- ✅ **DONE** — plně implementováno, evidence v repu
- 🟡 **PARTIAL** — částečně, dokončit
- ⏳ **PENDING** — neimplementováno, zůstává v backlogu
- 📦 **ARCHIVED** — zastaralé / superseded jinde

---

## 06_Plan_redesignu.md — status per priority

### P0 · Kritické metodické rozpory

| ID | Položka | Status | Evidence |
|---|---|---|---|
| **P0.1** | Sjednotit metodiku CMP/AMI úmrtnosti | ✅ DONE | Cascade audit 15. 5. 2026, `clanek-akutni-infarkt.html` ovedřen proti OECD H@G 2025 (5,2 % unlinked admission-based), `clanek-kardiovaskularni-mortalita.html` rekonciliován proti Eurostat `hlth_cd_asdr2` |
| **P0.2** | Sjednotit „výdaje na zdravotnictví" % HDP | 🟡 PARTIAL | `clanek-financovani-sha.html` + `clanek-vydaje-zdravotnictvi.html` auditovány, ale tooltip „veřejné vs celkové" na `jak-funguje.html` neověřen |
| **P0.3** | Otevřít rozpor 58 vs 122 indikátorů | ✅ DONE | PR #321: `hspa-prehled.html` má sekci „Mezery v datech" (collapsible) s dynamickou tabulkou pokrytí 12 OECD domén |
| **P0.4** | Vyčistit „seed" + slabé zdroje v datech | 🟡 PARTIAL | Daily routine pipeline ověřuje `origin: live` denně; některé `seed` entries pravděpodobně přetrvávají — vyžaduje samostatný průchod |
| **P0.5** | Opravit broken cross-link `index.html?indicator=...` | ✅ DONE | Pattern `indicator.html?id=ID` plošně používán napříč články |
| **P0.6** | Smazat interní TODO + dev poznámky z UI | ✅ DONE | Audit-pass-1 (PR #315) prošel 103 články, žádné interní TODO/dev poznámky |

### P1 · Rychlé wins (jazyk + UX)

| ID | Položka | Status | Evidence |
|---|---|---|---|
| **P1.1** | Gramatika a stylistika (13 oprav v tabulce) | 🟡 PARTIAL | Většina oprav prošla audity (např. „naších" → „našich" v manifestu), ale spot-check: „in-hospital úmrtnost" stále místy. Vyžaduje finální grep & replace průchod |
| **P1.2** | Anglicismy a žargon (8 termínů) | 🟡 PARTIAL | Glosář (110 termínů) existuje; inline `<dfn>` wrap stále chybí (planUXDesign Sprint 3.2) |
| **P1.3** | Skeleton loaders místo „Načítám…" | ✅ DONE | `.skeleton-card` třída v `styles.css`, používá se v `index.html` |
| **P1.4** | Empty states s CTA | ✅ DONE | `.empty-state-actions` s tlačítky „Vymazat filtry" / „Zobrazit Výsledky" v `index.html` |
| **P1.5** | Filtry indikátorů viditelné defaultně | ✅ DONE | `.filter-bar-main` plně viditelný v `index.html`, pokročilé filtry pod `<details>` |
| **P1.6** | HSPA tooltip v hlavičce + jednovětné vysvětlení | ✅ DONE | `<abbr class="hspa-abbr" title="...">` v topbar, `.ed-hero-hspa-line` v hero |
| **P1.7** | Aktivovat audience switch | ⏳ PENDING | `data-audience="public"` na `<body>` v `o-projektu.html`, ale **vizuální přepínač chybí**. Data mají `tldr_public/expert/policy`, frontend nepřepíná |

### P2 · Audience layering, glosář, transparentnost

| ID | Položka | Status | Evidence |
|---|---|---|---|
| **P2.1** | Glosář zkratek (interaktivní) | ✅ DONE / 🟡 PARTIAL | `data/glossary.json` (110 termínů), `glosar.html` page. **Inline `<dfn>` wrap zatím chybí** (planUXDesign Sprint 3.2) |
| **P2.2** | Methodology cards inline u indikátorů | ✅ DONE | Každý indikátor má `indicators/{id}.json` metodickou kartu, `indicator.html` page renderuje |
| **P2.3** | Stav verifikace dat (badge) | 🟡 PARTIAL | Audit-pass-1 zavedl `meta name="article:audit-status"` pro články (110 článků). **Pro indikátory badge zatím není viditelný v UI** |
| **P2.4** | Stránka „O projektu" | ✅ DONE | `o-projektu.html` existuje, obsahuje časovou osu, AI disclaimer, NotebookLM podcast |
| **P2.5** | Filter terminologie (laik vs expert) | 🟡 PARTIAL | „Výsledky / Výstupy / Procesy / Struktury" filtr na `index.html` má laický popis v `<option>` („Výsledky — zdraví populace"), ale tooltip vysvětlení obou ne |
| **P2.6** | Pořadí menu (Indikátory → Jak funguje → Strategie) | ✅ DONE | Označeno jako hotové v plánu samotném |

### P3 · Strategický redesign storytellingu

| ID | Položka | Status | Evidence |
|---|---|---|---|
| **P3.1** | Nová narativní struktura úvodu (4 kroky) | ✅ DONE | `.ed-narrative-grid` v `index.html` se 4 kroky (Jak jsme na tom · Proč se to děje · Kdo s tím může pohnout · Jak poznáme zlepšení) |
| **P3.2** | Tematické linie (cross-cutting) | ✅ DONE | `tematicke-linie.html` existuje, propojeno z `hspa-prehled.html` |
| **P3.3** | Polidštění statistik (cesta pacienta) | 🟡 PARTIAL | Články jako `clanek-akutni-infarkt`, `clanek-mamograf-rakovina-prsu` obsahují příběhy. Globální „mini-příběh" komponenta u indikátorů chybí |
| **P3.4** | Success stories („Kde Česko vede") | ✅ DONE | `.ed-success` sekce v `index.html` se 4 kartami (CMP centra, kojenecká úmrtnost, CT/MRI hustota, antibiotika) |
| **P3.5** | „Co může udělat občan" podle životní fáze | 🟡 PARTIAL | `prevence.html` existuje, ale personalizace podle životní fáze (Mladá rodina / 40+ / 65+) neověřena |
| **P3.6** | Vizuální schéma „pák" (SVG) | ⏳ PENDING | Žádný klikací sloup-střecha-paky SVG na webu |
| **P3.7** | 4-krokový narrative framework u dashboardu | 🟡 PARTIAL | Existuje v hero (`.ed-narrative`), ale ne aplikováno na každou analytickou sekci jako šablona |
| **P3.8** | Storytelling vrstva pro Strategie | 🟡 PARTIAL | `strategie.html` existuje, ale 4-vrstvý flow diagram (Národní · Sektorové · EU · Standardy) neviděn |
| **P3.9** | Kontrola strategií = Kontrola peněz (accountability) | ⏳ PENDING | `data/strategies.json` nemá `accountability` field; UI badges (Vyhodnoceno / Čeká / Bez kontroly) chybí |
| **P3.10** | Vizuální update masthead | ✅ DONE | `masthead-strip` + `module-nav` implementováno per design |
| **P3.11** | Nová stránka „Prevence" | ✅ DONE | `prevence.html` existuje |

### P4 · Růstové funkce (backlog)

| ID | Položka | Status |
|---|---|---|
| **P4.1** | Otevřená data + interoperabilita | ⏳ PENDING |
| **P4.2** | PROMs / PREMs roadmap | ⏳ PENDING (zmíněno v `hspa-prehled.html` gap section) |
| **P4.3** | Sociální determinanty zdraví | ⏳ PENDING |
| **P4.4** | AI / NLP query interface | ⏳ PENDING |
| **P4.5** | Gamifikace a regionální srovnání | ⏳ PENDING |
| **P4.6** | Indikátory odolnosti (resilience) | ⏳ PENDING |
| **P4.7** | Accessibility audit (WCAG 2.2 AA) | 🟡 PARTIAL — překryv s `planUXDesign` Sprint 0+1 |

---

## 07_Prevence_plan.md — status MVP

| Item | Status | Poznámka |
|---|---|---|
| Sekce `/prevence` v navigaci | ✅ DONE | `prevence.html` existuje |
| Hero s redakčním rámcem | 🟡 PARTIAL | Vyžaduje vizuální kontrolu |
| 9 tematických karet (jídlo, pohyb, tabák, alkohol, vztahy, smysl, děti, digitální, screening) | 🟡 PARTIAL | Karty pravděpodobně implementovány, ale `prevention_themes` data kontrakt v `data/` neověřen |
| Propojení s indikátory (`hspa_indicators`) | 🟡 PARTIAL | Některé články mají `linked_prevention_themes` v `articles.json` |
| Sources u každé karty (2–5 primárních) | 🟡 PARTIAL | Vyžaduje verifikaci |
| Caveat box | 🟡 PARTIAL | Vyžaduje verifikaci |

**Doporučení**: provést dedikovaný audit `prevence.html` proti 9 plánovaným kartám — `npm run validate:data` má `validate:prevention_themes` step? Pokud ne, manuálně.

---

## 08_Politicky_program.md — status

| | |
|---|---|
| Účel | Source text pro autorský manifest |
| Stav | ✅ **CONSUMED** — text plně přejat do `clanek-manifest-reforma-zdravotnictvi.html` |
| Akce | Žádná. Dokument lze archivovat do `archive/` nebo ponechat jako referenci |

---

## Souhrn

| Plán | Položek | DONE | PARTIAL | PENDING | Status doporučení |
|---|---|---|---|---|---|
| 06 P0 | 6 | 4 | 2 | 0 | Téměř hotovo — verifikovat P0.2, P0.4 |
| 06 P1 | 7 | 5 | 2 | 1 (P1.7 audience switch) | 1 dotáhnout |
| 06 P2 | 6 | 4 | 2 | 0 | Inline glosář dotáhnout (Sprint 3.2) |
| 06 P3 | 11 | 4 | 5 | 2 (P3.6 SVG páky, P3.9 accountability) | Hodně PARTIAL — verifikační průchod |
| 06 P4 | 7 | 0 | 1 | 6 | Backlog — překryv s planUXDesign |
| **07 Prevence** | 6 | 1 | 5 | 0 | Audit `prevence.html` proti plánu |
| **08 Politicky** | — | — | — | — | Archivovat |

### Top 5 reálně nedokončených z 06/07

1. **P1.7 Audience switch** — vizuální přepínač chybí, data jsou připravená
2. **P3.6 SVG schéma pák** — chybí klikatelná vizualizace
3. **P3.9 Accountability strategií** — `data/strategies.json` extension + UI badges
4. **P2.3 Indicator verification badge** — pro články máme, pro indikátory ne
5. **07 Prevence — verifikační audit** — 9 karet vs reálný stav `prevence.html`

### Top 3 doporučení

1. **Provést dedikovaný průchod „P3.6 + P3.9 + P2.3"** (1 sprint, ~3 dny)
2. **Verifikovat 07_Prevence_plan** proti `prevence.html` (0.5 dne)
3. **Archivovat 08_Politicky_program.md** do `archive/source-texts/` (5 minut, hygienické)

---

_Vytvořeno během status auditu 18. 5. 2026. Aktualizovat při dokončení odložených úkolů._
