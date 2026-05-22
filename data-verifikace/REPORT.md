# Report verifikace — stránka /dohodovaci-rizeni vs. zdrojová data NZIP

> Datum: 22. 5. 2026 · Verifikace READ-ONLY · Autor: claude-code-agent
> Předmět: stránka **Dohodovací řízení — datová podpora** na produkci
> https://www.hspa-cesko.cz/dohodovaci-rizeni
> Portálová data: `data/dohodovaci-rizeni.json` (snapshot v `nzip-cache/`).
> Zdroj pravdy: datové souhrny NZIP / ÚZIS ČR (`source.latest_file` každé sady).

---

## Souhrn

**39 / 44 PASS** (88,6 %) · 3× FAIL · 2× BLOCKED · 0 TODO

Každá sada byla ověřena ve 4 bodech: hodnota (vč. řádu a zaokrouhlení),
jednotka, referenční období/rok, zdroj (správný XLSX + list + buňka).
Důkaz (list + souřadnice buňky) je u každé sady v `tracker.md`.

| Stav | Počet | Sady |
|---|---|---|
| ✅ PASS | 39 | viz `tracker.md` |
| ❌ FAIL | 3 | ois-11-21, ois-11-33, ois-11-42 |
| ⛔ BLOCKED | 2 | ois-11-12, pps-08-01 |

## Rozpad po dimenzích

| Dim | Téma | PASS | FAIL | BLOCKED | Σ |
|---|---|---|---|---|---|
| d1 | Ceny a objemy | 8 | 0 | 0 | 8 |
| d2 | Personální zabezpečení | 4 | 0 | 1 | 5 |
| d3 | Produkce nelůžkové péče | 4 | **2** | 0 | 6 |
| d4 | Seznam výkonů | — | — | — | 0 |
| d5 | Struktura pojištěnců a náklady ZP | 2 | 0 | 0 | 2 |
| d6 | Lůžková péče | 14 | 0 | 0 | 14 |
| d7 | Komunitní ošetřovatelská péče | 2 | 0 | 0 | 2 |
| d8 | Jednodenní péče | 1 | **1** | 0 | 2 |
| d9 | Doplňkové registry a otevřená data | 4 | 0 | 1 | 5 |
| | **Celkem** | **39** | **3** | **2** | **44** |

Dimenze d4 „Seznam výkonů" nemá na portálu žádnou datovou sadu.

---

## ❌ FAIL — neshody (3)

| Sada | Dim | Portál | NZIP (zdroj) | Rozdíl | Důkaz | Příčina |
|---|---|---|---|---|---|---|
| **ois-11-21** | d3 | 4320 poskytovatelů | **2160** | portál **2× vyšší** | `Data!H109` (řádek „Celkový součet") | Portál sčítá 87 okresních řádků (sloupec „PZS celkem"), čímž duplicitně započítává poskytovatele působící ve více okresech. Správná hodnota je deduplikovaný řádek „Celkový součet" = 2160. |
| **ois-11-42** | d3 | 11736 poskytovatelů | **5868** | portál **2× vyšší** | `Data!I107` (řádek „Celkový součet") | Stejná chyba jako ois-11-21 — součet 87 okresních řádků místo deduplikovaného „Celkový součet" = 5868. |
| **ois-11-33** | d8 | 200115 výkonů | **400230** | portál **2× nižší** (½) | `List1!U18:U8453` (součet sl. „množství výkonů 2024") | Headline i celá řada 2019–2024 jsou systematicky 2× nižší než součet zdroje (poměr přesně 2,0 ve všech letech). Pravděpodobně dělení dvěma nebo sečtení jen poloviny řádků v build skriptu. |

**Vzorec:** d3 sady „počet poskytovatelů" (ois-11-21, ois-11-42) sdílejí
tutéž chybu — sčítání okresních řádků bez deduplikace. ois-11-33 má opačnou,
ale rovněž systematickou (2×) odchylku.

## ⛔ BLOCKED — nelze jednoznačně ověřit (2)

| Sada | Dim | Portál | Důvod |
|---|---|---|---|
| **ois-11-12** | d2 | 126722 Kč/měsíc | Headline je **vážený národní průměr platů/mezd** počítaný přes přepočtené úvazky z jiné sady (OIS-11-13). Zdrojový XLSX OIS-11-12 obsahuje jen hodnoty po typu poskytovatele bez vah a bez agregátní buňky → hodnotu nelze přiřadit konkrétní buňce. Zdroj a období sedí, hodnota je řádově plausibilní (mezi FN 126657 a Nemocnice 129057 Kč). |
| **pps-08-01** | d9 | 33,1 % účast u PL | Hodnota je **vzorkovaný odhad** z otevřených dat ÚZIS (4,5 GB pacientských mikrodat) — nemá zdrojovou buňku. Nezávislý vzorek (32 MB, 84 684 řádků za 2023) dává PL **32,82 %** a stomatolog 51,90 % (portál 52,0 % ≈ shoda). PL je o ~0,28 p.b. níže než portál; celá řada portálu je konzistentně ~0,15–0,25 p.b. nad vlastním vzorkem. Rozdíl je v mezích vzorkovací/metodické variance, ale nelze exaktně ověřit — server data.mzcr.cz blokuje plný i hloubkový range přístup ke 4,5 GB souboru a portál nedokumentuje přesnou vzorkovací metodu (~1,3 mil. osob). |

## Vedlejší zjištění (sady PASS s výhradou)

Tyto sady mají správnou hodnotu, ale drobnou nepřesnost v metadatech —
nezakládají FAIL, ale stojí za opravu:

- **ois-03-01** — portál uvádí `year: 2024`, ale zdrojový XLSX je „stav
  k 30.12.2025" (edice 2026-01). Rok na portálu je nepřesný (měl by být 2025).
- **ois-11-10** — `reference_period` je „Rok 2023", portál ale zobrazuje
  rok 2024. Hodnota se zaokrouhleně shoduje pro oba roky, takže PASS, ale
  popisek roku je nekonzistentní.
- **ois-11-30** — `method_note` uvádí jen odbornosti 913 + 925, headline
  ale fakticky zahrnuje i 926 (paliativní péče). Číslo je správné, popis metody
  je neúplný.
- **Konvence roku edice** — řada sad má XLSX „stav k 31.12.RRRR" a portál
  uvádí RRRR+1 podle edice „(RRRR+1)-01" (např. nr-02-01, nr-02-02). To je
  zavedená konvence NZIP a bylo hodnoceno jako shoda.

---

## Návrh oprav (NÁVRH — neprovedeno)

Stránka `/dohodovaci-rizeni`, její modul `src/dohodovaci-rizeni.js` ani data
`data/dohodovaci-rizeni.json` **nejsou v repu `veritasderman-rgb/hspa`**
(produkce hspa-cesko.cz je před repozitářem). Data generuje skript
`ingest/build-dohodovaci-rizeni.js` (dle `_doc` v datovém souboru). Opravy
je proto třeba provést tam, kde tento build skript žije.

1. **ois-11-21 a ois-11-42 (oprava 2× duplicit):** v build skriptu pro d3
   sady „počet poskytovatelů" přestat sčítat okresní řádky a místo toho číst
   deduplikovaný řádek „Celkový součet" (ois-11-21 → `Data!H109` = 2160;
   ois-11-42 → `Data!I107` = 5868). Pravděpodobně jde o jednu sdílenou
   funkci — opravit na jednom místě.
2. **ois-11-33 (oprava ½):** opravit agregaci tak, aby headline (a celá řada)
   odpovídal plnému součtu sloupce „množství výkonů" (`List1!U` = 400230 za
   2024), ne polovině. Prověřit, zda build nedělí dvěma nebo nesčítá jen část
   řádků.
3. **ois-11-12 (BLOCKED):** doplnit do `method_note`, že hodnota je vážený
   průměr přes úvazky z OIS-11-13, aby byla derivace dohledatelná; ideálně
   uvést i mezivýpočet.
4. **pps-08-01 (BLOCKED):** zdokumentovat přesnou vzorkovací metodu (velikost
   a způsob výběru vzorku), aby byl odhad reprodukovatelný; zvážit přepočet na
   plné datové sadě. Vlastní kontrola naznačuje, že portálová řada PL může být
   mírně nadhodnocená (~0,2 p.b.).
5. **Drobné popisky:** opravit `year` u ois-11-03-01 (2024 → 2025), sjednotit
   rok u ois-11-10, doplnit odbornost 926 do `method_note` u ois-11-30.

---

## Metodika

- Portálová hodnota = pole `headline.value` dané sady v `dohodovaci-rizeni.json`.
- Zdroj = `source.latest_file` (přímý XLSX z NZIP) u 43 sad; u pps-08-01
  otevřená data ÚZIS (4,5 GB CSV).
- XLSX otevřeny přes `python3 + openpyxl` (read-only), dohledána přesná buňka
  nebo rozsah řádků produkující headline.
- Každá sada ověřena samostatným subagentem (1 sada = 1 krok), výsledek
  zapsán do `vysledky.jsonl` a `tracker.md`, commitnut.
- Plný důkaz (list + buňka) u každé sady: viz `tracker.md`.
