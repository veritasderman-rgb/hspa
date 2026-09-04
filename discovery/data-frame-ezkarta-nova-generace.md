# Datový rámec — ezkarta-nova-generace

Sestaveno 4. 9. 2026. Každá hodnota má primární strojově dohledatelný zdroj.

## Centrální KPI

- **Hlavní hodnota: ~34 000 uživatelů denně** proti **~3,1 milionu stažení**
  aplikace EZKarta (Android + iOS).
- Primární zdroj: MZ ČR, tisková zpráva 3. 9. 2026, sekce „EZKarta v číslech“
  a blok Otázky a odpovědi („Je 3,1 milionu počet uživatelů EZKarty? **Ne.**“).
  Staženo a strojově přečteno 4. 9. 2026.
  <https://mzd.gov.cz/tiskove-centrum-mz/ministerstvo-zdravotnictvi-spousti-novou-generaci-ezkarty-pripomene-preventivni-vysetreni-a-zpristupni-dulezite-zdravotni-informace/>
- **Dopočet redakce:** 34 000 / 3 100 000 = **1,1 %**. Označen v textu i ve
  figcaption jako dopočet. Není to míra pokrytí populace — stažení nejsou
  unikátní uživatelé, upozorňuje na to sama TZ.
- Benchmark: harmonizovaná mezinárodní statistika denního užívání národních
  pacientských aplikací **neexistuje** → benchmark se nekonstruuje. Mezinárodní
  rovina jde přes Eurostat (viz níž).
- Časový kontext: údaje k datu spuštění nové generace, 3. 9. 2026.

## Sekundární hodnoty

| Hodnota | Zdroj | Rok / vlna |
|---|---|---|
| ~450 mil. laboratorních záznamů v centrálním systému | MZ ČR TZ 3. 9. 2026 (citace ředitele ÚZIS L. Duška) | k 3. 9. 2026 |
| 10 zpřístupněných laboratorních parametrů (1. fáze) | MZ ČR TZ 3. 9. 2026 | k 3. 9. 2026 |
| viditelnost výsledků **3 roky** (přehled „v číslech“) vs. **5 let** (citace Duška v těle TZ) — historie v centrálním systému 5 let zpětně | MZ ČR TZ 3. 9. 2026 | **vnitřní rozpor zdroje → caveat** |
| aktualizace laboratorních dat ~1× měsíčně (1. fáze) | MZ ČR TZ 3. 9. 2026 | k 3. 9. 2026 |
| **více než 30 nemocnic** zapojeno do sdílení zdravotní dokumentace | MZ ČR TZ 3. 9. 2026 | k 3. 9. 2026 |
| **160 nemocnic akutní péče**, 49 199 lůžek | ČSÚ (zdroj dat ÚZIS ČR), publikováno 16. 10. 2025 | 2024 |
| 12 měsíců historie předepsaných a vydaných léčiv v SZZ | MZ ČR TZ 3. 9. 2026 + § 34a odst. 2 písm. g), h) zák. 325/2021 Sb. | k 3. 9. 2026 |
| hrazená očkování 2010–2022; vše z ISIN od 1. 1. 2023 | MZ ČR TZ 3. 9. 2026 | k 3. 9. 2026 |
| UMUX 33,2 ± 6,5 (p < 2,2 × 10⁻¹⁶); 38 % spokojených; 72 % by aplikaci užívalo při napojení na klinický systém; n = 209 | Petrová (Hospodková), Bruthans, Ondrejková: *From pilot to policy…*, Digit Health 2026;12, DOI 10.1177/20552076261430059, PMID 41800150 — **ověřeno v PubMedu 4. 9. 2026** | pilot, publ. 4. 3. 2026 |
| 66,4 % lékařů nepoužilo Patient Summary; 72,1 % neví o napojení na NKB; 1,7 % má napojení; n = 1 739 (návratnost 4,14 %) | Hospodková, Bruthans, Englová, Int J Med Inform 2025;208:106232, DOI 10.1016/j.ijmedinf.2025.106232, PMID 41443122 — **ověřeno v PubMedu 4. 9. 2026** | sběr 2–3/2025 |

## Legislativa

Vše staženo a strojově přečteno 4. 9. 2026 ze zakonyprolidi.cz.

- **Zákon č. 325/2021 Sb., o elektronizaci zdravotnictví** — platnost od 8. 9. 2021,
  účinnost od 1. 1. 2022, aktuální znění (verze 9) účinné **od 1. 4. 2026**.
  - § 27 odst. 1 písm. h) — EZKarta jako centrální služba elektronického
    zdravotnictví: *„služby mobilní aplikace pro nahlížení na údaje vedené
    v souvislosti s poskytováním zdravotních služeb pro konkrétního pacienta
    (dále jen ‚EZKarta‘)“*.
  - § 34a — **Sdílený zdravotní záznam** = a) emergentní zdravotní záznam
    a b) **výsledky preventivních a screeningových vyšetření**. Emergentní záznam
    obsahuje mj. krevní skupinu, alergie, nežádoucí účinky a **léčivé přípravky
    vydané za posledních 12 měsíců** (odst. 2 písm. g) a použité u lůžkových
    poskytovatelů za 12 měsíců (písm. h).
  - § 34a odst. 3 — zapisující osobou výsledků prevence a screeningu je **každý
    poskytovatel, který se zapojil do preventivní péče nebo screeningových
    programů**; odst. 5 — zápis „bez zbytečného odkladu“.
  - § 35a — *„Ministerstvo zřizuje mobilní aplikaci EZKarta…“* (nahlížení do NZIS,
    registrů dle zákona o ochraně veřejného zdraví, systému eRecept, zdravotnické
    dokumentace a Integrovaného datového rozhraní).
  - § 40 odst. 3 písm. j) — přestupek: *„v rozporu s § 34a odst. 5 nezapíše výsledek
    preventivního nebo screeningového vyšetření do sdíleného zdravotního záznamu“*;
    § 40 odst. 6 písm. b) — **pokuta do 50 000 Kč**; § 41 — projednává ministerstvo.
- **Zákon č. 236/2025 Sb.** — platnost 15. 7. 2025, **účinnost 1. 1. 2026**
  (čl. XV; výjimky: čl. I bod 21 od 1. 4. 2026 a čl. XIII body 5–8).
  Čl. I bod **58** vložil § 34a, bod **59** vložil § 35a.

## Mezinárodní kontext

- Eurostat `isoc_ci_ac_i`, položka **I_IUMAPP** (objednání termínu u lékaře přes
  web), % osob 16–74 — **dotaženo živě přes API 4. 9. 2026**:
  ČR **19,62 %**, EU27 **39,77 %** (2024). Řada ČR: 2012 5,41 · 2014 9,12 ·
  2016 8,81 · 2018 9,51 · 2020 9,28 · 2022 16,09 · 2024 19,62.
  EU27: 2012 7,41 · 2014 10,04 · 2016 12,82 · 2018 17,80 · 2020 20,76 ·
  2022 33,47 · 2024 39,77.
- **Methodology caveat:** Eurostat měří objednání k lékaři přes web, ne užívání
  národní pacientské aplikace. Obě věci se v textu nesměšují.
- Srovnání s dánským sundhed.dk a estonským digilugu podle počtu uživatelů se
  **vynechává** — primární statistiku návštěvnosti se dnes dohledat nepodařilo.

## Indikátory dashboardu (kotvy)

| id | hodnota | benchmark | rok |
|---|---|---|---|
| `ehealth_adoption` | 62 (index 0–100) | OECD 70 · EU 68 | 2024 |
| `objednani_k_lekari_online` | 19,62 % | EU 39,77 % | 2024 |
| `zdravotni_info_online` | 68,4 % | EU 58,2 % | 2024 |
| `prohlidka_prakticky_lekar` | 52,6 % | — | 2023 |
| `spokojenost_informovani` | 72 % | OECD 78 · EU 76 | 2024 |

## Interní křížové odkazy

- Články: `clanek-ezkarta-ehealth.html` (č. 1), `clanek-novela-elektronizace-2026.html`
  (č. 47), `clanek-digi-3-dve-vrstvy-ncez.html`, `clanek-digi-5-strategie-ehds-2030.html`,
  `clanek-objednani-k-lekari-online.html` (č. 251).
- Indikátory: `ehealth_adoption`, `objednani_k_lekari_online`, `zdravotni_info_online`,
  `prohlidka_prakticky_lekar`, `spokojenost_informovani`.
