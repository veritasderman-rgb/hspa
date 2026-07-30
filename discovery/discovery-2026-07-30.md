# Discovery report — 2026-07-30

> Běh denní rutiny (PROMPT_DAILY_ROUTINE.md). Důraz této session: **validace a ověření
> všech zdrojů**. Poznámka k prostředí: sandbox má egress-block na české vládní domény
> (uzis.cz, mzcr.cz/mzd.gov.cz, ppo.mzcr.cz, psp.cz → 403/000). Ověřitelné odsud:
> OECD, Eurostat, WHO, PubMed (MCP), WHA rezoluce, mezinárodní registry. Domácí primární
> zdroje ověřeny nepřímo (sekundární korroborace) nebo ponechány k ověření mimo sandbox.

## Nové indikátory / datasety
- [ ] (žádný nový machine-verifiable indikátor k zařazení dnes)
- ÚZIS zveřejnil **většinu dat za rok 2025** (kolem 13. 7. 2026) — vlnová aktualizace napříč
  registry. Zdroj: uzis.cz/aktuality (přímo nedosažitelné ze sandboxu, korroborace přes
  sekundární přehled). Implikace: kandidát pro **budoucí revizi** článků opřených o ÚZIS
  roční řady (lůžková péče, hrazené služby), až budou konkrétní datové sady dohledatelné
  přes NZIP open-data / živý ingest. Dnes **nezařazeno** — bez strojově dohledatelné řádky
  se do dvojice číslo↔zdroj nepouští (železné pravidlo).

## Nové legislativní normy / sněmovní tisky
- MZ ČR **Legislativní newsletter — červenec 2026** publikován (mzd.gov.cz). Bez nové normy
  v gesci MZ s bezprostřední implikací pro korpus nad rámec již sledovaných tisků
  (sněmovní tisk 153 — novela zák. 40/1995 Sb. o regulaci reklamy, dozor SZPI nad reklamou
  na kojeneckou výživu — je již zachycen ve `clanek-stret-zajmu-vyziva-kojencu`).

## Aktuální dění / kauzy s implikací pro zdravotnictví
- MZ ČR + ÚZIS: rozšíření datové podpory **dohodovacího řízení 2027** — přes 50 datových sad
  v 8 dimenzích (otevřená data o dostupnosti a kapacitě segmentů). Již reflektováno v
  `data/dohodovaci-rizeni.json` (validátor: 9 dimenzí, 44 datových sad). Bez nového
  machine-verifiable čísla k okamžitému článku.

## Aktualizace existujících dat (vlna)
- Eurostat `demo_mexrt` (Excess mortality by month) — poslední aktualizace **17. 6. 2026**,
  data do 03/2026. **Ověřeno živě** přes Eurostat dissemination API (label „Excess mortality
  by month", monthly %, zdroj ESTAT). Podpírá indikátor `nadumrtnost` (draft ve frontě).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)
- Nespuštěno v tomto běhu (MCP `hlidac_statu` není v této session připojen). Bez nálezu.

## Ověřené primární zdroje v tomto běhu (checklist A/B)
- **WHO Global Hepatitis Report 2024** (who.int/publications/i/item/9789240091672) — úmrtí
  na virovou hepatitidu vzrostla z **1,1 mil. (2019) na 1,3 mil. (2022)**; HBV **~13 %
  diagnostikováno**, HCV **~36 % diagnostikováno / 20 % léčeno**. ✅ přesná shoda s čísly
  v `clanek-hepatitida-eliminace-2030`.
- **Eurostat `demo_mexrt`** — existuje, „Excess mortality by month", aktualizace 17. 6. 2026.
  ✅ shoda s metadaty citovanými v `clanek-nadumrtnost-cesko`.
- **OECD Health Statistics — Hip and knee replacement** (Health at a Glance 2025) — dataset
  náhrad kolene existuje a metodicky odpovídá (uni/bi/tri-kompartmentální + revize).
  ✅ existence a metodika potvrzena; konkrétní hodnota CZ 2024 (212,4/100k) ponechána jako
  `origin: seed` do potvrzení živým ingestem OECD (viz draft).

## Doporučení pro routing fáze
- HOT (nový indikátor): žádný (machine-verifiable, reachable ze sandboxu)
- HOT (aktuální dění): žádný vyžadující okamžitý reaktivní článek
- WARM (revize kvůli vlně): ÚZIS 2025 vlna — kandidát na pozdější revizi, dnes bez
  dohledatelné řádky
- COLD: fronta nasycená (33 nepublikovaných draftů), kadence nevynucuje nový článek
  → **integrity / publikační hygiena** + audit
