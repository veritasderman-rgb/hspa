# Discovery report — 2026-07-08

Běh denní rutiny. Ověřeno živě (WebFetch/WebSearch) proti primárním zdrojům.
Pozn.: doména `mzcr.cz` přesměrovává na `mzd.gov.cz`.

## Nové indikátory / datasety
- [ ] (žádný nový dataset od posledního běhu 07-07)
- ÚZIS aktuality: nejnovější stále „Tuberkulóza v ČR v roce 2025" (26. 6.) a rozšíření
  NRPATV (15. 6.) — obojí **není nové**, TBC pokryta `clanek-tuberkuloza-cr-2025.html`.

## Nové legislativní normy / sněmovní tisky
- MZ **Legislativní newsletter — červenec 2026** (mzd.gov.cz/legislativni-newsletter-cervenec-2026):
  pokrývá **červen 2026** (4 předpisy MZ ve Sbírce + 4 zdravotnické tisky v PSP/Senátu).
  Konkrétní čísla jsou jen v **obrázkovém PDF** → strojově nedohledatelné; totéž období
  už zaznamenáno v discovery 07-06. **Není nové.**
- Web hits na vyhl. **119/2026 Sb.** (novela 376/2011 — provádění z. o veř. zdrav. pojištění)
  a **117/2026 Sb.** (přírodní léčivé zdroje) — spadají do červnové/červencové Sbírky,
  ale `zakonyprolidi.cz/rocnik/2026` vrací **403** (strojově nedohledatelné konkrétní
  datum/účinnost) → nepoužívat jako zdroj čísel. Marginální dopad na dashboard.

## Aktuální dění / kauzy s implikací pro zdravotnictví (primární TZ MZ)
- MZ tiskové zprávy: nejnovější stále **2026-07-03** (systém péče o vzácná onemocnění /
  SYPOVO) a **2026-07-01** (převzetí agendy závislostí a duševního zdraví) — **obě pokryty**
  (`clanek-vzacna-onemocneni-strategie-2035.html`, `clanek-protidrogova-dusevni-politika-mz-2026.html`).
  **Žádná nová TZ 07-04 až 07-08.**
- Falešný poplach: web hit „Poslanecká sněmovna schválila komplexní novelu zákona o
  zdravotních službách" → ověřeno, TZ je z **4. 6. 2025** (přes rok stará), **není trigger**.

## Aktualizace existujících dat (vlna)
- Žádná nová vlna (OECD HAG 2025, ČSÚ naděje dožití 2025, Eurostat — vše již zapracováno).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nekontrolováno tento běh (MCP `hlidac_statu` mimo scope této session; doplňkový kanál).

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný.
- HOT (aktuální dění): žádný non-redundantní, plně primárně doložitelný kandidát.
- WARM: žádný nový trigger (poslední WARM — protidrogová agenda — uzavřen 07-06).
- **COLD → FALLBACK-AUDIT** nejstaršího `last_reviewed`. Kandidáti se shodou 2026-05-15
  (54 dní): `pracovni-sila`, `vyhnutelne-hospitalizace`. Priorita = **riziko nepřesnosti
  u článku s nejvíce konkrétními čísly** → `pracovni-sila`.

Fronta plná (20 draftů) → nový článek by odporoval železnému pravidlu. Lepší žádná
změna než zbytečná.
