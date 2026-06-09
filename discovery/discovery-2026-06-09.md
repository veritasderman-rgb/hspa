# Discovery report — 2026-06-09

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo proti
primárním strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo:
co není ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh explicitně zdůraznil: **„Naprosto zásadní je validace a
ověření všech zdrojů!!!!"** Předchozí běh 2026-06-08 (pondělí) → FALLBACK-AUDIT
(`clanek-veterinarni-antibiotika-one-health`, audit-pass, 0 oprav). 9. 6. 2026 je
**úterý**.

Startovní stav: `npm run validate:all` zelené (136 indikátorů, 116 článků prošlo
publikační hygienou), `npm test` 517/517.

## Procházené primární zdroje (stav fetch k 9. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | ÚZIS — aktuality | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny od 06-08: poslední položka stále 5. 5. 2026 (prodloužení sběru výkazů). Nová vlna NRPZS/NOR/NRH/NRZP: žádná. |
| 2 | MZ ČR — tiskové zprávy | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | Nejnovější TZ stále **4. 6. (NCEZ → odbor MZ + Ostrava)** — již ve frontě (`ncez-financovani-2027`). Po 4. 6. žádná nová TZ. |
| 3 | SZÚ — aktuality | szu.gov.cz/aktuality/ | ✅ 200 | 8. 6. dvě **sekundární** media-zmínky (Novinky.cz — mladí a nikotin; CNN Prima — mléčné výrobky ve školách); 5. 6. ovzduší (ČT24) + ERVISS meeting. **Žádná nová primární surveillance vlna.** Nejnovější primární = NAUTA 2025 (TZ SZÚ 29. 5.). |
| 4 | ČSÚ — aktuality | csu.gov.cz/aktuality | ✅ 200 | 8. 6. zahraniční obchod + průmysl 04/2026; 5. 6. maloobchod; 4. 6. mzdy/CPI. **Žádná demografická/mortalitní/EHIS vlna.** |
| 5 | PSP ČR — sněmovní tisky | psp.cz/sqw/historie.sqw | ⚠️ skeleton | Seznam strojově nedohledán. WebSearch vrátil jen starší tisky (847 hlasování 6/2025, elektronizace 833) — **žádný nový zdravotnický tisk schválený v 6/2026 primárně neověřen → netvrdím nic.** |
| 6 | Sbírka zákonů / zakonyprolidi.cz | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 | Anti-bot. WebSearch na „komplexní novela zákona o zdravotních službách" vrací MZ TZ s účinností **1. 1. 2026** (= již známé/pokryté, ne nová norma po 4. 6.). **Žádnou novou normu netvrdím.** |
| 7 | SÚKL — výpadky léčiv | sukl.cz/vypadky-leku | ⚠️ anti-bot | Registr výpadků dnes strojově nedohledán. WebSearch vrací jen obecné/sekundární (Endiaron, Exacyl…) bez čerstvého primárního datování. **Žádný nový výpadek netvrdím.** |
| 8 | OECD / Eurostat / WHO / NÚKIB | — | beze změny | HAG 2025 (11/2025) + Country Health Profile Czechia 2025 (12/2025) nejnovější, již v korpusu; žádná nová hlth_* vlna / WHO guideline s ČR-implikací k 9. 6. |

## Nové indikátory / datasety

- (žádné nové)

## Nové legislativní normy / sněmovní tisky

- Žádná nová norma v gesci MZ ČR primárně doložitelná po 4. 6. 2026. PSP/Sbírka
  dnes strojově nedohledány (skeleton/403). Per železné pravidlo netvrdím, že
  něco nového vyšlo.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **8. 6. — „Skoro 40 % mladých Čechů užívá nikotin"** (Novinky.cz, ČeskéNoviny,
  zdravezpravy — **sekundární**) referuje primární **NAUTA 2025** (SZÚ, TZ 29. 5.):
  15–24 let 38,8 % užívá nikotin, 26,0 % denně; e-cigarety alespoň měsíčně 11,6 %
  (15–24 let 25,6 %); podíl uživatelů nejsilnějších náplní v 15–24 vzrostl
  z 5,0 % (2022) na 35,6 % (2025); příchuť důvodem u 61,5 %. MZ ČR chystá zákaz
  příchutí e-cigaret (EURACTIV, sekundární). → **Téma již v korpusu** (dva články:
  `clanek-koureni` a `clanek-koureni-adolescenti`, publ. 1. 6.). NETVOŘÍ HOT
  (žádný nový primární trigger nepokrytý korpusem); naopak vytváří **WARM** —
  prověřit, zda publikované články drží proti primárním datům.

## Aktualizace existujících dat (vlna)

- (žádná nová vlna vyžadující revizi existujícího článku dnes)

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný trigger (MZ front beze změny po 4. 6.;
  SZÚ/ČSÚ položky sekundární nebo bez HSPA vlny; PSP/Sbírka/SÚKL strojově nedohledány).
- **WARM → FALLBACK-AUDIT.** Při průchodu adolescentně-nikotinového tématu
  (vyvolaného sekundárními zmínkami 8. 6. k NAUTA 2025) jsem identifikoval
  **vysoce-prioritní audit cíl**: `clanek-koureni-adolescenti.html` je
  **`published: true` (živý, veřejný od 1. 6.)**, `audit-status: review-pending`,
  a jeho **vlastní audit YAML přiznává**, že centrální KPI (17,1 % patnáctiletých
  kouří týdně) i celá tabulka zemí jsou **seed hodnoty** odvozené z HBSC, které
  „čekají na ověření přesných hodnot z HBSC 2022 Czech national report". To je
  přesně riziko, na které uživatel upozornil — živý článek stojící na neověřených
  číslech o citlivém tématu (kouření teenagerů). Per Phase 5 + železné pravidlo
  je nezávislé ověření těchto čísel proti primárnímu HBSC zdroji nejvyšší
  prioritou dneška. Detail viz `routing-2026-06-09.md`.
