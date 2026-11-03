# ÚZIS · výkon 06211 (návštěva porodní asistentky) · 2025 Q1 – 2026 Q2

Ruční zdroj: odpověď ÚZIS ČR na datový požadavek **UZIS/080507/2026**
(přijato 16. 9. 2026, vyřízeno 30. 10. 2026, zpracovala Szczuková).
Zdroj dat: Národní registr hrazených zdravotních služeb (NRHZS).
Původní soubor: `Poporodní_návštěvy_20261026.xlsx` (list Úvod + Tab. 1–3).

| Soubor | Obsah |
|---|---|
| `uzis-06211-2025q1-2026q2.json` | Normalizovaný přepis Tab. 1 (kraj PZS), Tab. 2 a Tab. 3 (pojišťovna × kraj). 116 buněk `{zp, kraj}` × 6 metrik × 6 kvartálů. Hodnoty 1:1 se zdrojem, prázdné buňky = 0. |

`zp: "ALL"` = všechny pojišťovny (Tab. 1), `kraj: "CZ"` = celá ČR (Tab. 2).
Kódy krajů jsou NUTS 3 jako v `data/regions.json`.

## Metriky

- `vykony` — počet vykázaných výkonů 06211
- `zeny` — počet unikátních žen s výkonem v kvartálu
- `porody` — počet porodů podle NRHZS (výkony 63119–63131, viz `metrics` v JSON)
- `podil` — `zeny / porody`, jak ho spočítal ÚZIS
- `icz_921` / `icz_603` — počet poskytovatelů (IČZ) s vykázaným 06211 v odbornosti
  921 (porodní asistentka) a 603 (gynekologie a porodnictví)

## Limity (z listu Úvod a z kontroly konzistence)

1. Jen veřejné zdravotní pojištění (bez části cizinek a přímo placené péče).
2. Kraj = kraj **poskytovatele**, ne bydliště ženy.
3. Výkon 06211 zahrnuje i návštěvy **v těhotenství**.
4. Unikátní ženy jsou za kvartál. Součet přes kvartály počítá dvakrát ženy, jejichž návštěvy přešly přes hranici kvartálu.
5. Rok 2026 jsou **předběžná data**. V 2026 Q2 je neúplný jmenovatel: porody meziročně −21,5 %, v Q1 jen −3,4 %. Podíl za Q2 je proto nadhodnocený, nejvíc u OZP (452 porodů proti zhruba 1 200 v předchozích kvartálech).

Kontroly konzistence (prošly): součet porodů přes pojišťovny = celá ČR ve všech
kvartálech; součet unikátních žen přes kraje převyšuje celostátní hodnotu
o 7 žen (2026 Q1 i Q2). To odpovídá poznámce ÚZIS o ženách s výkonem ve více krajích.

Analýza a návrh využití dat jsou v [`PLAN-PORODNI-ASISTENCE-06211.md`](../../../PLAN-PORODNI-ASISTENCE-06211.md).
