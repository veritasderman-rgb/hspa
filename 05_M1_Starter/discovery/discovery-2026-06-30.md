# Discovery report — 2026-06-30

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního strojově dohledatelného zdroje, na portálu nezůstává.
Uživatel pro tento běh **opět explicitně zdůraznil: „Naprosto zásadní je validace
a ověření všech zdrojů!!!!"** → každé tvrzení dnešního výstupu je ověřeno přímo
proti primárnímu zdroji (tisková zpráva MZ ČR + landing page strategie na mzd.gov.cz).

30. 6. 2026 je **úterý**. Poslední discovery report v repu = 2026-06-29
(FALLBACK-AUDIT clanek-kardiovaskularni-mortalita). Startovní stav: větev
`claude/dreamy-wright-05d2jo` resetována z origin/main; `npm run validate:all`
zelené (155 indikátorů, 158 článků prošlo publikační hygienou, financing OK,
clinical-quality 35 indikátorů); `npm test` 591/591 pass. Publikační fronta drží
**19 nepublikovaných draftů** (7 naplánovaných do 2026-07-04, dalších 12 v hlubším
backlogu), další volný slot = **2026-07-05**.

## Procházené primární zdroje (stav fetch k 30. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější: 26. 6. „Tuberkulóza v ČR 2025" (zpracováno 27. 6.); 15. 6. NRPATV; 10. 6. čestné členství. **Žádná nová vlna po 26. 6.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | **29. 6. „Česká republika má poprvé v historii Strategii rozvoje paliativní péče. Vláda dnes schválila plán do roku 2035" → HOT trigger (viz Posouzení).** Dále 26. 6. vedra (sezónní); 24. 6. elektronizace (zpracováno); 18. 6. dohodovací řízení 2027 (v draftu fronty); 14. 6. +24 mld. Kč. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 26. 6. Newsletter; 23. 6. kriminalita; 18. 6. Statistika & My; 16. 6. Demografie 2/2026; 12. 6. pohyb obyvatel Q1; 11. 6. výdaje na zdr. péči 2024 (zpracováno). **Žádná nová indikátorová/mortalitní/EHIS vlna.** |
| 4 | **SZÚ — aktuality** | szu.gov.cz/aktuality/ | ✅ 200 | 18.–29. 6. výhradně sezónní/mediální (vedra, klíšťata Hyalomma, vibria, repelenty, PPN komentář 22. 6.). **Žádná nová primární surveillance vlna jako PDF.** |
| 5 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ search | Nejnovější ucelená vlna = Health at a Glance 2025 (13. 11. 2025) + Country Health Profile Czechia 2025, oba v korpusu. **Žádná edice „2026", žádná nová `hlth_*` vlna s novou ČR-implikací.** |
| 6 | **PSP ČR — sněmovní tisky** | psp.cz/sqw/historie.sqw | — | Bez strojově ověřeného **nového schváleného** tisku v gesci MZ ČR (komplexní novela zák. o zdrav. službách: procesní milníky již medializovány). |
| 7 | **zakonyprolidi.cz / Sbírka** | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 anti-bot | Strojově nedostupné → žádný nový normativní akt netvrdím. |
| 8 | **SÚKL — výpadky léčiv** | sukl.gov.cz | ⚠️ registr se přesouvá | Strojově nedostupné → žádný nový výpadek netvrdím. |

## Posouzení triggeru — vládní schválení Strategie rozvoje paliativní péče do 2035

**Primární zdroj (ověřeno přímým fetchem):**
- Tisková zpráva MZ ČR, **29. 6. 2026**: „Česká republika má poprvé v historii
  Strategii rozvoje paliativní péče. Vláda dnes schválila plán do roku 2035."
  URL: `mzd.gov.cz/tiskove-centrum-mz/ceska-republika-ma-poprve-strategii-rozvoje-paliativni-pece-vlada-dnes-schvalila-plan-do-roku-2035/` (HTTP 200).
- Landing page analytické části: `mzd.gov.cz/analyticka-cast-strategie-rozvoje-paliativni-pece-v-cr-do-roku-2035/` (HTTP 200), odkazuje PDF analytickou část (publ. 30. 4. 2025) + datovou přílohu.

**Ověřené verifikovatelné fakty:** vláda schválila 29. 6. 2026; **první** strategický
dokument národního významu pro paliativní péči; horizont **2035**; vznikla v projektu
Standardizace paliativní péče v ČR (OP Zaměstnanost+, ESF EU); navazují **2 implementační
plány** (dospělí + děti, dokončení 2027); cíl dostupnost ve všech krajích.
*(Číselné odhady z TZ — ~110 tis. úmrtí ročně, ~65 tis. potřebuje paliativní péči,
+86 % do 2050 — do datového záznamu záměrně NEpřebírám: nejsou nutné pro update
strategie a jejich přesné znění není v rámci tohoto běhu nezávisle re-ověřeno.)*

**Stav korpusu:** Strategie **už v korpusu je** — `data/strategies.json` →
`strategie_paliativni_2035`, ale se statusem **`proposed`** („v přípravě")
a `verified_at: 2026-05-05`. Korpus má i 4–5 článků o paliativní péči
(`clanek-novela-paliativni-pece`, `clanek-hospicova-pece`, `clanek-mobilni-paliativni-tymy`,
`clanek-umrti-doma-hospic`). → **Nejde o nový indikátor ani o mezeru pro nový článek**
(přidat 20. draft by bylo redundantní a fronta je plná). Jde o **WARM revizi
existujícího datového záznamu**: strategie z navrhované přešla do **schválené**.

## Nové indikátory / datasety
- Žádný nový indikátor ani dataset.

## Nové legislativní normy / sněmovní tisky
- Bez strojově ověřeného **schváleného** normativního aktu v gesci MZ ČR k 30. 6.
  (vládní usnesení o strategii není normativní akt typu zákon/vyhláška; doloženo TZ).

## Aktualizace existujících dat / dění (vlna)
- **Vláda schválila Strategii rozvoje paliativní péče do 2035** (29. 6. 2026) →
  aktualizace statusu existující strategie `strategie_paliativni_2035`.

## Doporučení pro routing fáze
- **WARM (revize existujícího datového záznamu):** `strategie_paliativni_2035`
  status `proposed` → `active`, doplnit TZ o vládním schválení jako primární zdroj,
  propojit relevantní indikátory, aktualizovat `verified_at`.
- **HOT (nový článek):** žádný (palliative už pokryto články + fronta plná).
- **COLD:** n/a — WARM revize má přednost před fallback auditem.
