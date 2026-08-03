# Discovery report — 2026-08-03

Běh denní rutiny (HSPA Monitor). Powerlist + ověřovací sonda do primárních zdrojů lůžkové kapacity.

## Nové indikátory / datasety
- [ ] Žádná nová vlna dat s implikací pro dnešek. ÚZIS aktuality (kontrola 3. 8.): poslední publikace — Tuberkulóza v ČR 2025 (26. 6. 2026), měsíční aktualizace NRPZS. Nic, co by spouštělo reaktivní článek dnes.

## Nové legislativní normy / sněmovní tisky
- (žádná nová norma v gesci MZ ČR identifikovaná pro 3. 8. 2026)

## Aktuální dění / kauzy s implikací pro zdravotnictví
- (žádná nová primárně-doložitelná kauza)

## Aktualizace existujících dat (vlna) — OVĚŘENO PRIMÁRNĚ
Během rutiny proběhla verifikační sonda k tématu lůžkové efektivity (evergreen kandidát #5). Ověřeno přímo z primárních strojově dohledatelných souborů ÚZIS/NZIP:

- **NRHZS — Obložnost lůžek** (datový souhrn SSS-05-03, verze 2025-01, zpracováno 12. 8. 2025, stav k 31. 12. 2024): standardní akutní lůžka **56,0 %** (2024), standardní intenzivní lůžka **62,0 %** (2024), následná lůžka **84,2 %** (2024). Zdroj: <https://www.nzip.cz/data/1780-luzkovy-fond-obloznost-datovy-souhrn> (xlsx stažen a přečten).
- **NRHZS — Kapacity lůžkového fondu** (SSS-05-02, verze 2025-01, stav k 31. 12. 2024): standardní akutní (STAN) **42 309** lůžek, intenzivní (JIP+ARO) **5 727** lůžek. Zdroj: <https://www.nzip.cz/data/1779-luzkovy-fond-kapacity-datovy-souhrn>.
- Zjištěn **datový drift v dashboardu**: `obloznost_intenzivni_pece_pct` měl seed hodnotu 63 % → skutečná NRHZS 2024 = 62,0 %; `nevyuzite_osetrovaci_dny_ip` seed 803 252 → přepočet z ověřeného NRHZS (5 727 × 365 × (1 − 0,6199)) = **794 509**. Tři indikátory clusteru měly `origin: seed` s prázdným URL → v této iteraci napojeny na primární NRHZS zdroj (viz creation commit).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- VeKLEP: (nekontrolováno v tomto běhu — evergreen den, kadenční pojistka vynutila EVERGREEN-WRITE; MCP kanál nespuštěn)
- Registr smluv: (dtto)
- ÚOHS: (dtto)

## Doporučení pro routing fáze
- HOT (nový indikátor): —
- HOT (aktuální dění): —
- WARM (revize existujícího článku): —
- COLD/EVERGREEN: **EVERGREEN-WRITE vynucen kadenční pojistkou** (> 2 dny bez nového článku; poslední dailies 07-31…08-02 byly audity/revize). Backlog `data/article-backlog.json` má 8 položek `ready`; top priorita 5 = `prazdna-luzka-efektivita` — datový rámec plně ověřen z NRHZS výše.
