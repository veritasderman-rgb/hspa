# Discovery report — 2026-05-28

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-28 (čtvrtek). Předchozí běh 2026-05-27 → ARTICLE-WRITE
(`clanek-centrum-onkologicke-prevence-mou-2026.html`, slot 2026-06-14,
`topical_until: 2026-06-26`, status `review-pending`).

Prozkoumáno přímým WebFetch / WebSearch: ÚZIS aktuality (uzis.cz/index.php?pg=aktuality),
MZ ČR — všechny novinky (mzd.gov.cz/vsechny-novinky/), SZÚ aktuality (szu.gov.cz/aktuality),
WHO Europe news-room (who.int/europe/news-room), SÚKL registr výpadků léčiv
(HTTP 403 — bez přístupu), NKÚ tiskové zprávy (HTTP 404), ČSÚ aktuality
(csu.gov.cz/aktuality), PSP historie sněmovních tisků (jen navigační stránka),
OECD topics health (HTTP 403), Eurostat news (HTTP 404).

## Nové primární zdroje od posledního běhu (27.–28. 5. 2026)

### HOT — žádný nový primárně-zdrojový HSPA trigger

#### ÚZIS
- Bez nové aktuality 27.–28. 5. Poslední aktualita 5. 5. 2026
  (Prodloužení sběru výkazů za 2025).

#### MZ ČR
- **27. 5. 2026:** Nová ředitelka Horských lázní Karlova Studánka (Irena
  Vašicová od 1. 7. 2026, výsledek výběrového řízení). **Administrativní
  jmenování bez HSPA implikace.** TZ MZd 27. 5. 2026.
- 26. 5. 2026: Centrum onkologické prevence MOÚ + REACT-EU stanovisko
  (pokryto v běhu 27. 5.).

#### SZÚ
- 26. 5. 2026: dvě aktuality (Nutrivigilance 2025, ERVI-net konference) —
  bez HSPA implikace.
- 25. 5. 2026: Hot weather feature pro ČT24 + jubileum kolegyně.

#### WHO Europe
- 27. 5. 2026: feature World No Tobacco Day 2026 — globální, není CZ‑specific
  trigger, korpus pokrývá `clanek-koureni-adolescenti.html` ve frontě
  9. 6. 2026.
- 26. 5. 2026: dodávky vybavení do ukrajinských nemocnic — bez CZ relevance.

#### OECD / Eurostat / ČSÚ
- Bez nové vlny CZ‑relevantní publikace v období 25.–28. 5.

#### SÚKL / NÚKIB / VZP / NKÚ / PSP / Sbírka zákonů
- Bez nového triggeru. Některé zdroje vrátily HTTP 403/404 (omezený
  přístup), pokryli sekundárním WebSearch — bez nálezu.

## Aktualizace existujících dat
- Žádná nová vlna ÚZIS, OECD, Eurostat za období 26.–28. 5.

## Stav publikační fronty (k 28. 5. 2026)

Fronta obsahuje **28 článků naplánovaných na 22. 5. – 14. 6. 2026** plus
9 článků bez `scheduled_for` (CzechSex série, hospic, hexa vakcína, …).
Nejvzdálenější naplánovaný článek: `clanek-centrum-onkologicke-prevence-mou-2026.html`
slot 2026-06-14.

**Next publikační slot** (dle snippet v PROMPT_DAILY_ROUTINE.md sekce 3.4):
**2026-06-15.**

## Stav auditních metadat (kritické zjištění)

Ze skenu 83 článků v korpusu:
- **75 článků** má audit YAML blok s `last_reviewed`, nejstarší 17 dnů
  (`clanek-akutni-infarkt.html`, 2026-05-11). **Žádný článek není auditovaný >30 dnů.**
- **8 článků nemá audit YAML blok vůbec.** Z nich **dva jsou publikované:**
  - `clanek-ai-act-zdravotnictvi-srpen-2026.html` (publikován 18. 5. 2026)
  - `clanek-hta-jca-eu-2026.html` (publikován 25. 5. 2026)
- 6 zbývajících článků bez audit YAML jsou drafty (`published: false`).

Per PROMPT_DAILY_ROUTINE.md sekce „Fallback routine — žádné nové dění":
> Pokud žádný nic, vyber nejstarší `audit.last_reviewed` (>30 dnů)

Žádný článek není >30 dní starý, ale publikovaný článek **bez audit YAML
bloku vůbec** je vážnější mezera než článek auditovaný před 25 dny.

## Doporučení pro routing fáze

- **HOT:** žádný — nebyl identifikován primárně‑zdrojový trigger pro nový
  článek v období 27.–28. 5. 2026.
- **WARM:** N/A — žádná data nezestárla.
- **COLD / FALLBACK‑AUDIT:** `clanek-hta-jca-eu-2026.html` — nejnovější
  publikovaný článek bez audit YAML bloku, technicky a politicky exponované
  téma (EU HTAR 2021/2282, JCA, NICE/IQWiG/HAS srovnání, zákon 289/2025 Sb.,
  WTP threshold). Validace primárních zdrojů je tu kritická.

## Routing rozhodnutí

FALLBACK‑AUDIT → `clanek-hta-jca-eu-2026.html` (nezávislý audit + doplnění
audit YAML bloku). Viz `routing-2026-05-28.md`.
