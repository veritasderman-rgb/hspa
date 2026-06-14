# Discovery report — 2026-06-14

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"** Předchozí
běh 2026-06-13 (sobota) → FALLBACK-AUDIT (`clanek-akutni-infarkt`, audit-fix, 4 nálezy).
14. 6. 2026 je **neděle**.

Startovní stav: `npm run validate:all` zelené (141 indikátorů, 130 článků prošlo
publikační hygienou), `npm test` zelené.

## Procházené primární zdroje (stav fetch k 14. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny od 06-13: nejnovější položka stále **10. 6.** (čestné členství L. Dušek / K. Hejduk — personální). Nová vlna NRPZS/NOR/NRH/NRZP: žádná. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější TZ stále **12. 6.** (eZdraví — ověření zbrojního oprávnění + posudky řidičů; digitalizační oblast saturovaná). Po 12. 6. žádná nová TZ. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | Nejnovější **12. 6.** — „Pohyb obyvatelstva – 1. čtvrtletí 2026" + „Zdravotní péče v roce 2024 stála 64 tisíc korun na osobu" (zdravotnické účty 2024). Žádná nová položka po 12. 6. |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | Nejnovější primární **10. 6.** (klíšťata ve městech, K. Kybicová). Po 10. 6. jen sekundární media-zmínky (komáři — iROZHLAS). Nová surveillance vlna s ČR-implikací: žádná. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat, who.int | ✅ search | HAG 2025 (11/2025) + Country Health Profile Czechia 2025 (12/2025) nejnovější, již v korpusu. **Žádná nová vlna hlth_* s ČR-implikací k 14. 6.** (Eurostat data 2024 napříč EU dosud nepublikována.) |
| 6 | **PSP ČR / Sbírka zákonů** | psp.cz, zakonyprolidi.cz | ⚠️ search/403 | Žádný strojově ověřený **nový** normativní akt v gesci MZ ČR po 12. 6. Úhradová vyhláška 2026 (432/2025 Sb.) + vyhlášky 76/77/2026 Sb. (oceňování / redistribuce) — známé, bez čerstvého triggeru. Netvrdím novou normu. |
| 7 | **SÚKL — registr výpadků** | sukl.gov.cz | — | Neprocházeno strojově (předchozí běhy 301/404 / anti-bot). Per železné pravidlo netvrdím žádný nový výpadek. |

## Nové indikátory / datasety

- (žádné nové) — ČSÚ zdravotnické účty 2024 (11. 6.) je **již zpracovaná vlna**:
  indikátory `vydaje_zdravotnictvi_hdp` (8,6 %) a `platba_z_kapsy_pct` (13,6 %)
  byly sjednoceny na 2024 v běhu 06-12, sister článek `clanek-vydaje-zdravotnictvi`
  revidován (verified). Tato vlna ovšem **dosud nezasáhla** druhý dotčený článek —
  viz routing.

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 14. 6. 2026.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **Neděle** — primární statistické úřady i MZ ČR o víkendu nepublikují. Žádné
  nové primárně-doložitelné dění proti stavu k 12.–13. 6.

## Aktualizace existujících dat (vlna)

- **ČSÚ zdravotnické účty 2024** (publ. 11. 6. 2026, předběžná data) — zasahuje
  ještě jeden publikovaný článek nezrevidovaný na 2024: `clanek-financovani-sha`
  (anatomie financování / rámec SHA), který stojí na referenčním roce 2023.
  → cíl dnešní ARTICLE-REVISE (viz routing).

## Doporučení pro routing fáze

- **Žádný tvrdý HOT trigger pro nový článek** (neděle; digitalizace saturovaná;
  legislativa bez nového aktu; fronta drží 15 nepublikovaných draftů — 16. tenký
  článek by byl „zbytečná změna").
- **→ ARTICLE-REVISE** `clanek-financovani-sha` — nejstarší auditovaný publikovaný
  článek (last_reviewed 2026-05-15, 30 dní) **A ZÁROVEŇ** přímo dotčený čerstvou
  vlnou ČSÚ zdravotnických účtů 2024. Ideální průnik priority #2 (riziko
  nepřesnosti — článek hustý na čísla) a #3 (nejstarší audit) fallback stromu, plně
  v souladu s explicitním požadavkem uživatele na **ověření všech zdrojů**.
  Detail viz `routing-2026-06-14.md`.
