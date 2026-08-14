# Discovery report — 2026-08-14

> Běh denní rutiny (PROMPT_DAILY_ROUTINE.md). Důraz session: **validace a ověření všech
> zdrojů**. Dostupnost zdrojů z prostředí: uzis.cz ✅, nzip.cz ✅, data.mzcr.cz ✅,
> Eurostat API ✅, PubMed (MCP) ✅, clim4cast.eu ✅; mzd.gov.cz ❌ (404), csu.gov.cz
> aktuality ❌ (404), zakonyprolidi.cz ❌ (403), sukl.cz ❌ (503). Nedostupné zdroje
> uvedeny explicitně, nic z nich necitováno.

## Nové indikátory / datasety
- [ ] (žádný nový machine-verifiable indikátor k okamžitému zařazení)
- **ÚZIS aktualita „Vysoké teploty a mortalita" (14. 8. 2026, aid=8757)** — ÚZIS v den
  probíhající vlny veder vysvětluje, že data o zemřelých dostává v **ročním intervalu**
  a real-time data o úmrtnosti v ČR neexistují; odkazuje na rychlejší kanály:
  ČSÚ DataStat (týdenní zemřelí, OBY04ZEM03T01), NZIP otevřená data
  „Denní úmrtí — věk, pohlaví, příčina" (NR-06-33) a teplotní index Clim4Cast.
  ✅ ověřeno přímo (WebFetch uzis.cz, 14. 8. 2026).

## Nové legislativní normy / sněmovní tisky
- Nedohledatelné z prostředí (zakonyprolidi.cz 403, psp.cz historicky blokován,
  mzd.gov.cz 404). Bez nálezu z dosažitelných zdrojů.

## Aktuální dění / kauzy s implikací pro zdravotnictví
- **Vlna veder v ČR (probíhající, srpen 2026)** — ČHMÚ výstrahy před velmi silnou až
  extrémní tepelnou zátěží, teploty až ke 40 °C (sekundární korroborace: Echo24,
  Deník.cz, tiscali.cz, 8/2026; primární výstraha ČHMÚ z prostředí nedosažitelná).
  V kombinaci s dnešní aktualitou ÚZIS = přímý news hook.
- **WHO Europe** (news-room, srpen 2026): kojení (75 % novorozenců do hodiny,
  43 % výlučně v 6 měsících, 5. 8.), AMR photo story (6. 8.), GIS roadmap (10. 8.).
  Bez přímé české implikace vyžadující článek dnes.

## Aktualizace existujících dat (vlna)
- **Eurostat `demo_r_mwk_ts`** (týdenní zemřelí): CZ poslední týden **2026-W27**
  (2 299 zemřelých, provizorní), refresh **13. 8. 2026** → zpoždění ~5–6 týdnů;
  probíhající vlna veder v datech zatím není. ✅ ověřeno živě přes dissemination API.
- **NZIP NR-06-33 „Denní úmrtí"** (data.mzcr.cz, distribuce 467): CSV 16,5 MB,
  1. 1. 1994 – **31. 12. 2024**, Last-Modified 24. 11. 2025, CC BY 4.0.
  ✅ staženo a plně zparsováno (326 524 řádků; roční součty odpovídají známým
  úhrnům ČSÚ: 1994 = 117 373, 2023 = 112 795, 2024 = 112 211).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nespuštěno — MCP `hlidac_statu` není v této session připojen. Bez nálezu.

## Ověřené primární zdroje v tomto běhu (checklist A/B)
- **ÚZIS aktualita aid=8757** (14. 8. 2026) — plný text přepsán, 4 odkazované URL ověřeny.
- **NR-06-33 CSV** — vlastní reprodukovatelný výpočet nadúmrtnosti při vlnách veder
  (sezónní základna ±7 dní × ±3 roky): peak **1. 8. 1994 = 420 zemřelých**
  (základna ~289, **+45 %**); okno 23. 7.–8. 8. 1994 **+855 úmrtí (+17,4 %)**;
  léto 2015 (17. 7.–16. 8.) **+756 (+8,6 %)**; 16.–22. 6. 2013 **+23,0 %**;
  30. 7.–9. 8. 2018 **+14,2 %**; 10.–18. 7. 2010 **+12,6 %**.
- **PubMed (MCP)** — recenzovaná literatura sedí s výpočtem: Kyselý & Kříž 2003
  (PMID 12931347): peak dny >100 úmrtí/den (+30 %), červen 1994 +456 (+10,3 %),
  mortality displacement ~50 %; Urban et al. 2017 (DOI 10.3390/ijerph14121562):
  léto 2015 rekordní v délce a tepelné zátěži, senioři zasaženi silněji než 1994;
  Kyselý & Kříž 2008 (DOI 10.1007/s00484-008-0166-3): slabší dopad 2003 = adaptace
  + varování; Urban et al. 2020 (DOI 10.1016/j.scitotenv.2020.137093): průměrný
  dopad na den vlny klesal 2–3 %/dekádu, pokles se zastavil, kumulativní zátěž roste.
- **Clim4Cast teplotní index** (clim4cast.eu/cs/teplotni-index) — Interreg Central
  Europe, předpověď zdánlivé teploty na 10 dní (model ECMWF). ✅ existence a obsah ověřeny.

## Doporučení pro routing fáze
- **HOT (aktuální dění): vlna veder + dnešní aktualita ÚZIS o (ne)dostupnosti dat
  o úmrtnosti** — plně primárně doložitelné, machine-verifiable (CSV + Eurostat API
  + PubMed DOI), mezera v korpusu (vedro-a-telo = fyziologie, nemocnice-v-horku =
  provoz nemocnic; datově-analytický úhel „kolik vedra zabíjejí a proč to nevíme
  včas" chybí).
- WARM: žádná vlna vyžadující revizi existujícího článku dnes.
- COLD: evergreen backlog prázdný (0× `status: ready`).
