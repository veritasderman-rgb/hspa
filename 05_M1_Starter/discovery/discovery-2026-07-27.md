# Discovery report — 2026-07-27

Denní rutina (PROMPT_DAILY_ROUTINE.md). Zaměření dnešního běhu (zadání session):
**naprosto zásadní validace a ověření všech zdrojů.**

## Nové indikátory / datasety
- [ ] OECD Health at a Glance — nejnovější vlna zůstává **HAG 2025** (publ. 13. 11. 2025)
  a **HAG: Europe 2024** (18. 11. 2024). Žádná nová vlna od posledního běhu.
  (oecd.org/en/topics/health.html — ověřeno 2026-07-27)
- [ ] Eurostat hlth_* — žádné oznámení o nové vlně v hledání nezachyceno.
- [ ] ÚZIS aktuality — červen 2026 report o tuberkulóze za 2025 (dílčí, TBC už v korpusu
  pokryta kontextově). Žádný nový průlomový dataset.

## Nové legislativní normy / sněmovní tisky
- MZ ČR Legislativní newsletter červen 2026: ve Sbírce zákonů vyhlášeny 4 předpisy MZ
  (červen 2026). Vláda 13. 7. 2026 schválila návrh novely zákona o ochraně veřejného
  zdraví — harmonizace hygienických požadavků na materiály ve styku s pitnou vodou
  (transpozice směrnice EU). Nízká relevance pro HSPA dashboard.
  (mzd.gov.cz/legislativni-newsletter-cervenec-2026, vlada.gov.cz — ověřeno 2026-07-27)

## Aktuální dění / kauzy s implikací pro zdravotnictví
- SÚKL: pokračující výpadky léčiv (antidepresiva, léky na srdeční selhání, hypertenzi,
  alergie) — trend již pokrytý v korpusu. Žádná nová jednorázová kauza s ověřitelnými
  primárními čísly nad rámec stávajícího pokrytí.
- Pozn.: hledání vracelo **nekonzistentní jména ministra zdravotnictví** (Válek vs.
  Vojtěch) — jde o artefakt vyhledávacího modelu, NEOVĚŘENO. Do žádného obsahu se
  nepropíše bez primárního zdroje (stenoprotokol/oficiální TZ).

## Aktualizace existujících dat (vlna)
- Žádná nová vlna vyžadující revizi konkrétního článku.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nedotazováno v tomto běhu (kanál doplňkový; discovery nezachytilo trigger vyžadující
  zakázkovou/legislativní stopu). Žádná mimořádná zdravotnická smlouva ani rozhodnutí
  ÚOHS zachycené powerlistem.

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný
- HOT (aktuální dění): žádný dost silný na NOVÝ článek
- WARM (revize existujícího): žádná nová vlna nezastaralila konkrétní článek
- COLD → **FALLBACK-AUDIT**. Navíc: publikační fronta je **saturovaná** (30+ článků
  s `published:false`), nový článek dne již vznikl (`clanek-zijici-darci-ledvin`,
  commit 2026-07-27). Kadenční pojistka splněna → nový/evergreen článek se nevynucuje.
  Zadání session (validace zdrojů) → audit nejstaršího `partial` článku.

### Kandidáti auditu (nejstarší `last_reviewed`, riziko nepřesnosti = konkrétní čísla)
| slug | last_reviewed | status | published |
|---|---|---|---|
| preventivni-prohlidka | 2026-05-17 | partial | ano |
| stret-zajmu-vyziva-kojencu | 2026-05-17 | partial | ano |
| alkohol-spotreba | 2026-05-17 | verified | ano |
| ehealth | 2026-05-17 | verified | ano |

**Volba:** `preventivni-prohlidka` — nejstarší revize, status `partial` (čísla čekala na
update), vysoký objem konkrétních čísel (ÚZIS/VZP/OECD) → maximální dopad validace.
