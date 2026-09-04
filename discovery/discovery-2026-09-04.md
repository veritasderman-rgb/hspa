# Discovery report — 2026-09-04

Běh denní rutiny podle `PROMPT_DAILY_ROUTINE.md`, fáze 1. Všechny zdroje procházeny
4. 9. 2026 z běhového prostředí agenta.

## Nové indikátory / datasety

- [ ] ÚZIS — aktuality (uzis.cz/index.php?pg=aktuality): poslední věcná položka je
  **„Vysoké teploty a mortalita“ (14. 8. 2026)**, dále jen tři pracovní inzeráty
  (3., 7. a 10. 8.). **Žádná nová datová vlna** od posledního běhu.
- [ ] NZIP — datasety (nzip.cz/data): stránka redirectuje, žádná nová položka
  identifikovaná.
- [ ] Eurostat: `hlth_*` nová vlna nezachycena. Kontrolní dotaz na
  `isoc_ci_ac_i` (I_IUMAPP) proběhl **live přes API** — poslední dostupný rok
  zůstává **2024** (ČR 19,62 %, EU27 39,77 %), tedy shodně s hodnotou
  v datovém kontraktu. Nová vlna sudého roku 2026 zatím nepublikována.
- [ ] OECD: oecd.org/en/topics/health.html vrací z běhového prostředí **HTTP 403**,
  nelze ověřit. Health at a Glance vychází typicky v listopadu — mimo okno.

## Nové legislativní normy / sněmovní tisky

- **Sněmovní tisk 235** (novela zákona o pojistném na veřejné zdravotní pojištění,
  vládní návrh z 23. 6. 2026): garanční **výbor pro zdravotnictví návrh stále
  neprojednal** (položka č. 10 pozvánky na jednání 2. 9. 2026). Podle PSP je
  „projednávání možné od 7. 9. 2026“ a tisk je zařazen na **30. schůzi od 8. 9. 2026**.
  → Stav proti běhu 2. 9. 2026 **beze změny**; revize
  `clanek-valorizace-statni-pojistenci-2027` zůstává odložená (není usnesení výboru).
- Sbírka zákonů: `sbirka.gov.cz` z běhového prostředí nedostupná (proxy 502),
  `zakonyprolidi.cz/cs/aktualne` vrací HTTP 403. Kontrola nových norem v gesci MZ
  tedy dnes **neproběhla úplně** — jednotlivé předpisy se ale načíst dají
  (325/2021 Sb. i 236/2025 Sb. staženy a strojově přečteny, viz níž).

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **HOT — MZ ČR, 3. 9. 2026: „Ministerstvo zdravotnictví spouští novou generaci
  EZKarty.“** Za účasti předsedy vlády představena přepracovaná mobilní aplikace.
  Doložitelná čísla přímo v TZ (sekce „EZKarta v číslech“): ~3,1 mil. stažení
  (Android + iOS), ~34 tis. uživatelů denně, ~450 mil. laboratorních záznamů
  v centrálním systému, 10 zpřístupněných laboratorních parametrů, více než
  30 nemocnic zapojených do sdílení dokumentace, 12 měsíců historie léčiv,
  hrazená očkování 2010–2022 + vše z ISIN od 1. 1. 2023, měsíční interval
  aktualizace laboratorních dat.
  <https://mzd.gov.cz/tiskove-centrum-mz/ministerstvo-zdravotnictvi-spousti-novou-generaci-ezkarty-pripomene-preventivni-vysetreni-a-zpristupni-dulezite-zdravotni-informace/>
  - **Vnitřní rozpor v samotné TZ**: citace ředitele ÚZIS uvádí laboratorní
    parametry „za posledních pět let“, přehled „EZKarta v číslech“ ale rozlišuje
    **3 roky viditelné uživateli** vs. **5 let historie v centrálním systému**.
    Rozpor je materiálem pro caveat, ne k tichému výběru jedné hodnoty.
- **WARM — MZ ČR, 2. 9. 2026: onkologičtí koordinátoři.** Odloženo už v běhu
  3. 9. 2026 (klíčové číslo „přes 60 % pacientů s karcinomem plic nezahájí léčbu
  do 8 týdnů“ TZ neopírá o dohledatelný podklad). Beze změny.
- **COLD — MZ ČR, 1. 9. 2026: screening prostaty.** Zpracováno během 3. 9. 2026
  (ARTICLE-REVISE `clanek-prostata-screening-pilot`).
- **COLD — MZ ČR, 31. 8. 2026: vedení SZÚ (Macková, zastupující hlavní hygienik
  Fošum).** Personálie bez indikátorové vazby.

## Aktualizace existujících dat (vlna)

- Žádná nová vlna ÚZIS, ČSÚ ani Eurostat v okně 3.–4. 9. 2026.
- Kontrolně dohledáno pro dnešní datový rámec (ne jako nový nález):
  ČSÚ / ÚZIS — **160 nemocnic akutní péče a 49 199 lůžek v roce 2024**,
  publikováno 16. 10. 2025 (csu.gov.cz/zdravotni-pece).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

- **VeKLEP**: jediný záznam v gesci MZ ČR s pohybem po 28. 8. 2026 —
  *Návrh zákona, kterým se mění zákon č. 167/1998 Sb., o návykových látkách…*
  (KORNDVEC8EF8, autorizace 30. 6. 2026, **poslední úprava 1. 9. 2026**).
  <https://odok.cz/portal/veklep/material/KORNDVEC8EF8/> — vedeno jen jako řádek
  discovery reportu, `data/legislativa.json` v repozitáři neexistuje.
- **Registr smluv**: dnešní běh nedotazován samostatně (žádný signál z ostatních
  kanálů, který by mimořádnou smlouvu naznačoval).
- **ÚOHS**: dotaz `nemocnice OR zdravotní OR zdravotnictví` od 20. 8. 2026 —
  **0 rozhodnutí**.

## Ověřovna Barometru — kandidáti

- Výrok předsedy vlády Andreje Babiše v TZ MZ ČR z 3. 9. 2026: *„Když jsme v květnu
  představovali strategické projekty v oblasti digitalizace státu, říkal jsem, že
  právě zdravotnictví je naší prioritou.“* — **bez kvantitativního jádra**,
  do Ověřovny nepatří.
- Ostatní výroky v TZ (Vojtěch, Dušek, Foltýn, Kasová) jsou popisné, ne měřitelné
  proti indikátorům dashboardu. **Žádný kandidát Ověřovny dnes nevzniká.**

## Doporučení pro routing fáze

- **HOT (aktuální dění):** nová generace EZKarty (MZ ČR 3. 9. 2026) — jediný nález
  dne s vlastním souborem primárně doložitelných čísel a s přímou vazbou na
  indikátory dashboardu (`ehealth_adoption`, `objednani_k_lekari_online`,
  `zdravotni_info_online`, `prohlidka_prakticky_lekar`, `spokojenost_informovani`).
- **HOT (nový indikátor):** žádný.
- **WARM:** tisk 235 (čeká na usnesení garančního výboru); onkologičtí koordinátoři
  (chybí podklad ke klíčovému číslu).
- **COLD:** —

## Zdroje, kde se nic nezměnilo

ÚZIS aktuality · NZIP datasety · Eurostat (`isoc_ci_ac_i` beze změny, poslední rok 2024)
· ÚOHS (0 rozhodnutí) · PSP tisk 235 (stav beze změny) · SÚKL (žádný nový signál
v okně) · NÚKIB (žádný signál v okně).

## Zdroje nedostupné z běhového prostředí (poctivě uvedeno)

- `sbirka.gov.cz` — proxy 502
- `zakonyprolidi.cz/cs/aktualne` — HTTP 403 (jednotlivé předpisy dostupné)
- `oecd.org/en/topics/health.html` — HTTP 403
- `e-sbirka.cz` — prázdná odpověď (HTTP 308 bez těla)
