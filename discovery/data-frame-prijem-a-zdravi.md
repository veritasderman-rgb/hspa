# Datový rámec — prijem-a-zdravi

Všechna čísla stažena **17. 8. 2026** přímými dotazy na Eurostat REST API
(`ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/…`), surové JSON
odpovědi v scratchpadu (silc10_cz.json, silc10_eu.json, silc08.json,
silc09.json, silc12.json, li02.json, li02_all.json).

## Centrální KPI

- **Rozdíl v subjektivním zdraví mezi příjmovými kvintily (ČR, 2025): 30,0 p. b.**
  — podíl osob 16+ hodnotících zdraví jako dobré/velmi dobré: 1. kvintil
  53,1 % vs. 5. kvintil 83,1 % (celkem 67,0 %).
- Primární zdroj: Eurostat **hlth_silc_10** (Self-perceived health by sex, age
  and income quintile), dataset updated 2026-07-27, vlna 2025, sex=T, age=Y_GE16,
  levels=VG_G. Staženo 17. 8. 2026.
- Benchmark EU27 (2020): Q1 57,3 % vs. Q5 79,3 % → rozdíl **22,0 p. b.**;
  celkem 67,9 %.
- Časový kontext: vlna EU-SILC 2025 (příjmová referenční perioda 2024).

## Sekundární hodnoty

### hlth_silc_10 — subjektivní zdraví (VG_G, % osob 16+, 2025)
| kvintil | ČR | EU27 |
|---|---|---|
| Q1 (nejchudší) | 53,1 | 57,3 |
| Q2 | 57,3 | 61,1 |
| Q3 | 64,5 | 67,8 |
| Q4 | 75,2 | 73,2 |
| Q5 (nejbohatší) | 83,1 | 79,3 |
| celkem | 67,0 | 67,9 |

→ ČR Q4 a Q5 NAD evropskými protějšky; Q1–Q3 POD nimi.

### hlth_silc_10 — špatné/velmi špatné zdraví (B_VB, 2025)
- ČR: Q1 16,8 % vs. Q5 2,3 % → poměr **7,3×** (16,8/2,3)
- EU27: Q1 14,7 % vs. Q5 4,0 % → poměr **3,7×**
- ČR celkem 8,9 %, EU 8,8 %

### hlth_silc_10 — trend rozdílu Q5−Q1 (VG_G, ČR)
- 2022: 85,9 − 46,4 = **39,5 p. b.**
- 2023: 83,0 − 47,8 = 35,2 p. b.
- 2024: 82,1 − 54,1 = 28,0 p. b.
- 2025: 83,1 − 53,1 = **30,0 p. b.**
→ zúžení proti 2022 taženo vzestupem Q1 (46,4 → 53,1); rok od roku kolísá
(výběrové šetření) — trend interpretovat opatrně.

### ilc_li02 — míra ohrožení příjmovou chudobou (AROP, 60 % mediánu, 2025)
- ČR: **9,6 %** = **nejnižší v EU** (ověřeno proti všem 27 členům, druhá
  nejnižší BE 10,9 %); EU27: 16,3 %. Absolutně ČR: 1 011 tis. osob.
- Shoda s indikátorem dashboardu `ohrozeni_chudobou` (9,6 %, 2025, EU 16,3) ✓

### hlth_silc_08 — neuspokojená potřeba lékařské péče (TXP_TFAR_WLIST, 16+, 2025)
- ČR: celkem 0,3 %; Q1 0,6 %; Q5 0,2 %
- EU27: celkem 2,4 %; Q1 3,7 %; Q5 1,4 %
- Důvod „příliš drahé" (TXP): ČR 0,0 % celkem (Q1 0,0; jediná nenulová Q2 0,1);
  EU27 1,0 % (Q1 2,0)

### hlth_silc_09 — neuspokojená potřeba zubní péče (16+, 2025)
- Composite TXP_TFAR_WLIST — ČR: Q1 2,1 % vs. Q5 0,3 %; celkem 1,0 %;
  EU27: Q1 6,1 % vs. Q5 1,2 %; celkem 3,3 %
- **Jen důvod „too expensive" (TXP; v článku použito — codex P2)** — ČR: Q1
  1,2 % / Q2 0,7 % / Q3 0,1 % / Q4 0,2 % / Q5 0,0 %; celkem 0,4 %;
  EU27: Q1 5,5 % / Q5 0,8 %; celkem 2,8 % (staženo 17. 8. 2026)

### hlth_silc_10 — subjektivní zdraví podle věkových pásem (ČR, VG_G, 2025; codex P2)
| pásmo | Q1 | Q5 | rozdíl |
|---|---|---|---|
| 16–44 | 86,1 | 94,4 | 8,3 |
| 45–64 | 44,9 | 78,9 | 34,0 |
| 65+ | 20,9 | 50,3 | 29,4 |
→ gradient přetrvává uvnitř věkových pásem, největší v předdůchodovém věku;
souhrn 16+ není věkově standardizovaný (výhrada v metodické poznámce článku)

### hlth_silc_12 — omezení obvyklých činností ze zdravotních důvodů (SM_SEV = některé nebo závažné, 16+, 2025)
- ČR: Q1 39,7 % vs. Q5 13,8 % (rozdíl 25,9 p. b.); celkem 27,0 %
- EU27: Q1 33,5 % vs. Q5 15,4 % (rozdíl 18,1 p. b.); celkem 24,2 %
- Závažné (SEV): ČR Q1 11,6 % vs. Q5 2,1 %

## Legislativa
— (nerelevantní; článek je datová analýza, bez legislativního rámce)

## Mezinárodní kontext
- Srovnání výhradně Eurostat EU-SILC (stejná vlna 2025, stejné definice) —
  žádný mix metodik.
- Methodology caveat: subjektivní zdraví je sebehodnocení (kulturní rozdíly ve
  vykazování mezi zeměmi); kvintily jsou národní (ekvivalizovaný disponibilní
  příjem domácnosti — Q1 v ČR ≠ Q1 v DE v absolutní kupní síle); vlna 2025 =
  příjmy roku 2024; EU27 agregát je populačně vážený mix zemí.

## Interní křížové odkazy
- Související články: clanek-nadeje-doziti-vzdelani (vzdělanostní gradient),
  clanek-regionalni-nuzky-nadeje-doziti (krajské rozdíly, kotva
  prijem_disponibilni), clanek-zdravotni-gramotnost, clanek-platba-z-kapsy,
  clanek-katastroficke-vydaje-zdravi, clanek-nesplnena-potreba-zubni-pece,
  clanek-zdrave-roky-cil-pet-let
- Související indikátory (kotvy backlogu): prijem_disponibilni (295 000
  Kč/obyv., 2023, ČSÚ — seed; v článku jen jako databox reference),
  ohrozeni_chudobou (9,6 %, 2025, live ✓), subjektivni_zdravi (67 %, 2025,
  live ✓ — shoduje se s hlth_silc_10 TOTAL 67,0)
