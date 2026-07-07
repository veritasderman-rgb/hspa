# Discovery report — 2026-07-07

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proběhlo živě
(WebFetch / WebSearch / PubMed MCP) proti primárním strojově dohledatelným zdrojům.
Železné pravidlo: co není ověřené z primárního strojově dohledatelného zdroje, na
portálu nezůstává. Uživatel pro tento běh explicitně zdůraznil: **„Naprosto zásadní
je validace a ověření všech zdrojů!!!!"** 7. 7. 2026 je **úterý**.

Startovní stav: `npm run validate:all` zelené (163 indikátorů, 171 článků prošlo
publikační hygienou), `npm test` 613/613. Publikační fronta drží **20 nepublikovaných
draftů** (data do 2026-07-06). Předchozí běh (07-06) uzavřel WARM revizi
`protidrogova-dusevni-politika-mz-2026` (primární TZ MZ nahradila sekundární ČT).

## Procházené primární zdroje (stav fetch k 7. 7. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Beze změny od 07-06. Nejnovější **26. 6.** „Tuberkulóza v ČR 2025" (pokryto `clanek-tuberkuloza-cr-2025`). Žádná nová vlna NRPZS/NOR/NRH/NRZP. |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy | ✅ 200 | Nejnovější **3. 7.** vzácná onemocnění (SYPOVO, pokryto); **1. 7.** převod protidrogové/duševní agendy (zpracováno 07-06); **30. 6.** „přes 1 200 léků smí předepsat i praktik" (**pokryto** `clanek-preskripce-praktici-2026`, 07-06). Po 3. 7. žádná nová TZ s datovým triggerem. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 1.–3. 7. jen ekonomika/trh práce (ICT mzdy, deficit vládních institucí, zaměstnanost 5/2026). Žádná nová mortalitní/demografická/EHIS vlna se zdravotní implikací. |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality | ✅ 200 | Jen sekundární mediální agregace (vedra, svrab, klíšťata Hyalomma, non-cholera vibrio). **Žádná nová primární surveillance vlna / NAUTA report.** Svrab (4 úmrtí 2026) = sekundární média (Nova/iDNES), ne primární SZÚ report → dle železného pravidla nepoužívat jako zdroj čísel. |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat, who.int | ✅ search | HAG 2025 (11/2025) + Country Health Profile Czechia 2025 (12/2025) stále nejnovější, v korpusu. Žádná nová `hlth_*` vlna s ČR-implikací. |
| 6 | **PSP ČR / Sbírka zákonů** | psp.cz, zakonyprolidi.cz | ⚠️ 403/anti-bot | MZ legislativní newsletter 07/2026 hlásí 4 předpisy vyhlášené v červnu, ale PDF obrázkové + zakonyprolidi 403 → není strojově dohledatelný konkrétní předpis s čísly → nepoužívat jako zdroj (železné pravidlo). |
| 7 | **PubMed — Czech health system** | eutils (MCP) | ✅ | 15 zásahů 06-15…07-07, žádná domácí studie s tvrdým HSPA-indikátorovým triggerem pro nový článek (převážně mezinárodní mortalitní literatura). |

## Nové indikátory / datasety

- (žádný nový indikátor / dataset od 07-06)

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 7. 7. 2026
  (newsletter 07/2026 = obrázkové PDF, zakonyprolidi 403 → neověřitelné).

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **Úterý.** Žádný nový tvrdý primárně-doložitelný HOT trigger pro **nový** článek.
  Vše saturováno / v korpusu / ve frontě (20 draftů). Psát 21. tenký článek proti
  plné frontě by byl „zbytečná změna" proti železnému pravidlu kvality.

## Aktualizace existujících dat (vlna)

- Žádná nová vlna s dopadem na dashboard od 07-06.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS

- MCP `hlidac_statu` **není v této session připojen** (server neuvedený mezi
  aktivními). Kanál přeskočen pro tento běh; powerlist (výše) pokryl primární zdroje.

## Doporučení pro routing fáze

- HOT (nový indikátor): žádný.
- HOT (nový článek): žádný non-redundantní, plně primárně doložitelný kandidát.
- WARM (revize kvůli nové vlně/novele): žádný — 07-06 uzavřel poslední WARM trigger.
- **COLD → FALLBACK-AUDIT**: discovery je „prázdné" (nic nového, fronta plná) →
  přepnout na fallback = audit nejstaršího auditovaného článku
  (`last_reviewed` = 2026-05-15, 53 dní > 30). Priorita #1 (legislativa) →
  `clanek-uhradova-vyhlaska` (legislativně centrální, jediný primární zdroj =
  vyhláška 432/2025 Sb., ověřitelná živě). Fokus: verifikace zdrojů (uživatelský důraz).
