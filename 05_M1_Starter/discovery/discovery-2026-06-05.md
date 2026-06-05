# Discovery report — 2026-06-05

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního zdroje, nezůstává. Předchozí běh 2026-06-04 →
ARTICLE-WRITE (`clanek-dostupnost-radioterapie-2026`, MZ ČR TZ 3. 6. + KOC rámec),
ve frontě `scheduled_for: 2026-06-05`.

## Procházené primární zdroje (stav fetch)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | MZ ČR — tiskové zprávy | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **4. 6. nová TZ — NCEZ zůstane součástí MZ + přesun části do FN Ostrava (viz HOT)** |
| 2 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | poslední položka 5. 5. 2026 (administrativní, prodloužení sběru výkazů); nic nového |
| 3 | SZÚ — aktuality | szu.gov.cz/aktuality/ | ✅ 200 | 4. 6. klíšťata (mediální, Právo — sekundární); 3. 6. žloutenka (6 úmrtí letos, sekundární ZD); 29. 5. NAUTA nikotin u mladých — bez nové datové vlny do HSPA |
| 4 | ČSÚ — aktuality | csu.gov.cz/aktuality | ⚠️ 302 redirect | bez nové strukturální vlny s HSPA implikací (k 5. 6. neověřeno nic nového nad 3. 6.) |
| 5 | NCEZ — primární doložení | ncez.mzcr.cz, mzd.gov.cz, nku.cz | ✅ 200 | institucionální rámec NCEZ ověřen (viz níže) |

## Nové legislativní normy / sněmovní tisky

- Bez nové normy v gesci MZ ČR datované po 30. 5. 2026.
- Relevantní existující rámec (ověřeno pro routing): **zákon č. 325/2021 Sb.,
  o elektronizaci zdravotnictví** (zakonyprolidi.cz/cs/2021-325), novelizován
  zákonem **236/2025 Sb.** — primárně dohledatelné permalinky.

## Aktuální dění / kauzy s implikací pro zdravotnictví (MZ ČR TZ)

- **4. 6. 2026** — „Národní centrum elektronického zdravotnictví zůstane součástí
  Ministerstva zdravotnictví. Resort chystá posílení kapacit i nové odborné
  zázemí v Ostravě" → **HOT**. NCEZ zůstane odborem MZ (ne samostatná
  organizace mimo resort). Část agendy + odborníci se přesunou do **Fakultní
  nemocnice Ostrava** — start **září 2026**, dokončení **do konce 2026**, plný
  provoz **leden 2027**. Financování projektů NCEZ z **evropských fondů
  (Národní plán obnovy)** v průběhu 2026 postupně končí; od **2027** provoz
  z **národního rozpočtu**. Pro 2027 „postupné navýšení kapacit o jednotky
  pracovních míst". Citováni ředitel NCEZ **Petr Foltýn** a ministr **Adam
  Vojtěch**. (Primárně: MZ ČR TZ 4. 6. 2026.)
- 3. 6. 2026 — radioterapie (✅ zpracováno 4. 6., `clanek-dostupnost-radioterapie-2026`, fronta 5. 6.)
- 2. 6. 2026 — pooperační sepse (✅ zpracováno 3. 6.)
- 28. 5. 2026 — centralizace komplexní chirurgie do finální fáze; podpora
  center duševního zdraví → WARM (oba pokryty/ve frontě: `clanek-centralizace-chirurgie-2027`,
  `centra-dusevniho-zdravi` draft).

## Nové datové vlny / datasety

- Žádný nový dataset OECD/Eurostat/WHO s ČR-implikací ověřen k 5. 6. 2026.
- ÚZIS bez nové vlny (poslední aktualita 5. 5. administrativní).

## Aktualizace existujících dat (vlna)

- (žádná nová vlna vyžadující revizi existujícího článku dnes)

## Doporučení pro routing fáze

- **HOT (aktuální dění s primárně-zdrojovou doložitelností a doložitelným
  institucionálním rámcem):** `ncez-financovani-2027` — vládní rozhodnutí
  o budoucnosti financování a organizace e-zdravotnictví poté, co v roce 2026
  končí evropské peníze (NPO). Téma navazuje na publikovanou sérii
  „Digitální zdravotnictví srozumitelně" (`clanek-digi-1`…`digi-5`), jejíž
  díl 3 (`clanek-digi-3-dve-vrstvy-ncez`) v audit-notes **explicitně flagoval
  jako otevřené RIZIKO udržitelnosti** právě konec EU financování v průběhu
  2026 a konec smluv klíčového týmu k 31. 12. 2025. TZ ze 4. 6. toto riziko
  **adresuje** → vzniká korpusová mezera (news/governance/udržitelnost), kterou
  vysvětlující série nepokrývá. → **ARTICLE-WRITE**.

  Tři nezávislé primární linie:
  (1) MZ ČR TZ 4. 6. 2026 (rozhodnutí + timeline Ostrava + financování od 2027);
  (2) zákon 325/2021 Sb. + novela 236/2025 Sb. (právní rámec, centrální páteř
      spuštěna 1. 1. 2026);
  (3) NKÚ TZ 9. 10. 2023 (kontrola 2019–2022): 159 mil. Kč na strategické cíle
      e-health, které „nesplnily účel"; MZ nestihlo komponenty k 1. 1. 2023,
      odložilo na 2026 s financováním z NPO — historický kontext „proč to záleží".
- WARM: žádná zastaralá vlna vyžadující revizi dnes.
- COLD: n/a (discovery přinesl HOT trigger).
