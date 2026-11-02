# Srovnávač zdravotních pojišťoven — plán modulů a rozdělení práce

_Stav k 2. 11. 2026. Pracovní název; „Hlídač“ pracovní skupina 7. 10. 2026 odmítla jako konfrontační (kandidáti: Průvodce pojištěnce, Navigátor, Zrcadlo, Kompas). Navazuje na `GOVERNANCE.md`, `docs/metodika-barometr.md` a `07_Prevence_plan.md`._

## 1. Co projekt je a co není

- **Je:** srozumitelný průvodce vztahem pojišťovna–pojištěnec, podpora zdravotní gramotnosti, nezávislé srovnání z doložitelných dat. Nositel: think tank Ministr zdraví + NAPO, odborná garance Advance Healthcare Management Institute, záštita ministra zdravotnictví (3/2026). Rozpočet 2026–2029 celkem 7,5 mil. Kč (1,5 / 2 / 2 / 2), zatím bez samostatného financování.
- **Není:** kontrola pojišťoven, hodnocení vztahu pojišťovna–nemocnice, index z desítek ukazatelů. Pracovní skupina chce „5–7 dimenzí“, jednoduché grafy a tři doložitelná témata za rok.
- **Zdravé Česko** je pro projekt hostitel: datový kontrakt, pipeline, vizuální jazyk, governance. Josefa Pavlovice má oslovit Albert Štěrba do 12. 11. 2026.

## 2. Moduly stránky `pojistovny.html` (pod heslem, noindex)

| # | Modul | Stav | Data | Co chybí |
|---|---|---|---|---|
| 1 | **Aplikace** (první výstup PS) | matice 10 funkcí × 7 aplikací hotová | `data/pojistovny-aplikace.json` (interní analýza digitalizace + VZ 2024) | 5–7 kritérií uživatelské přívětivosti (IT expert podle podkladu M. Rybáře), počty uživatelů u 5 ZP (dotaz), ověření 2 rozporů v názvech |
| 2 | **Prevence a fond prevence** | nabídka podle oblastí, onko, duševní zdraví, struktura čerpání, odpovědi z VZ | `data/pojistovny-prevence.json` (PRVNÍ SET OTÁZEK + Výroční zprávy ZP_.docx) | odpovědi pojišťoven na 7 otázek (kolo 1), ZPŠ má data jen z VZ 2020 |
| 3 | **Kmen a hospodaření** | hotovo | `data/pojistovny.json` (CRP 2025, MZ+MF 2024, VZ 2024, tisk 280) | druhé ověření čísel z PDF člověkem; věková standardizace nákladů |
| 4 | **Zdravotní gramotnost a rizikoví pojištěnci** | rámec + dotazník | `data/pojistovny-otazky.json`, rizikové skupiny v aplikace.json | vymezení tématu v PS, metodika dotazníku, souhlas s profilováním |
| 5 | **Metodika a semafor** | šest oblastí, čtyři stavy, prázdný semafor | `data/pojistovny.json` → `semafor`, `docs/metodika-srovnavac-pojistoven.md` | první verdikty až po kole 1 a právu na odpověď; schválení vydavatele (třída C) |
| 6 | **Plán a zdroje** | tento dokument | — | rozhodnutí PS 12. 11. 2026 |

## 3. Rozdělení práce podle náročnosti (agenti × člověk)

Zásada: jedna session drží jednu roli (GOVERNANCE § 4). Datové přepisy a grafy dělají levnější modely, texty o pojmenovaných pojišťovnách a verdikty schvaluje člověk. Zátěž se rozkládá do čtvrtletních běhů, ne do jednoho velkého sprintu.

| Úkol | Náročnost | Kdo | Kdy |
|---|---|---|---|
| Přepis tabulek z VZ/ZPP do JSON (roční), kontrola součtů, validátor | nízká–střední, mechanické | Haiku / Sonnet (rutina, třída B) | každý rok po vydání VZ (květen–červen) a ZPP (srpen) |
| Matice aplikací: doplnit kritéria přívětivosti, screenshoty, ověření na zařízení | střední, potřebuje člověka u aplikace | IT expert + Sonnet (zápis výsledků) | listopad–prosinec 2026 |
| Věková standardizace nákladů a prevence na pojištěnce (CRP × VZ) | střední, metodická | Opus/Fable jednorázově, pak Sonnet rutina | prosinec 2026 |
| Metodika semaforu, enumy, validátor, právo na odpověď | vyšší, redakční + právní | Fable/Opus draft → odborná skupina (Advance, FBMI ČVUT, NAPO) → vydavatel | leden 2027 |
| Dopisy pojišťovnám (nabídka spolupráce), poté žádosti podle zákona 106 | vysoká odpovědnost | člověk (Ministr zdraví) podle šablony `docs/dopis-instituce-data.md`; AI připraví drafty | kolo 1: leden 2027; kolo 2: Q2 2027 |
| Vyhodnocení odpovědí, návrh verdiktů, texty profilů | vyšší | Fable/Opus draft (třída B) → editor → vydavatel (třída C) | po doručení odpovědí (15denní lhůta + 10 dní právo na odpověď) |
| Články a newsletter (tři témata za rok) | střední | Florence (rutina) → editor | průběžně, po každém zveřejněném modulu |
| Tracker žádostí (`data/zadosti-106.json` + stránka) | nízká | Sonnet | s kolem 1 |
| Dotazník NAPO pro pacientské organizace | střední, obsahová | NAPO + Sonnet (forma) | Q1 2027 |
| Zveřejnění (odstranit heslo, STATIC_PAGES, navigace) | nízká, třída C | vydavatel | po rozhodnutí PS |

Odhad práce agentů na první veřejnou verzi (moduly 1–3 + semafor po kole 1): 6–8 běhů rutiny po 1–2 hodinách, bez nákladů na infrastrukturu nad rámec provozu Zdravého Česka.

## 4. Harmonogram

| Termín | Milník |
|---|---|
| 12. 11. 2026 | PS #2: název, výběr 5–7 hledisek aplikací, formulář hodnocení témat (P. Hroboň), zapojení J. Pavlovice |
| listopad 2026 | upload této složky do repa `hspa`, nasazení pod heslem, interní revize čísel |
| prosinec 2026 | modul Aplikace doplněn o přívětivost; dopis pojišťovnám s nabídkou dobrovolného předání dat |
| leden 2027 | metodika semaforu schválena; kolo 1 (7 otázek k fondu prevence) odesláno všem ZP v jeden den |
| březen 2027 | vyhodnocení, právo na odpověď, první verdikty v oblasti prevence; rozhodnutí o zveřejnění |
| Q2 2027 | kolo 2: zdravotní gramotnost a rizikoví pojištěnci (dotazník A/B/C), přístupnost aplikací 65+ |
| Q3–Q4 2027 | první veřejný přehled pro pojištěnce (one pager: 2027), tisková konference, newsletter před přestupním termínem |
| 2028–2029 | advokační činnost: jednotná metrika jako doporučení MZ (vazba na reformu v.z.p. 2030) |

## 5. Otevřené otázky pro pracovní skupinu

1. Název projektu a tón (partner vs. hodnotitel).
2. Zda hodnotit fond prevence podle doložitelnosti výsledků (návrh: ano, semafor „doloženo / deklarováno / nedoloženo“), ne podle výše příspěvků.
3. Souhlas s profilováním u personalizované komunikace: co lze od pojišťoven chtít.
4. Kdo podepisuje dopisy pojišťovnám a kdo je kontaktní osoba pro právo na odpověď.
5. Financování: bez samostatného rozpočtu běží jen to, co unese rutina Zdravého Česka.

## 6. Co nepřebírat z první verze (rozhodnutí PS 7. 10.)

- „Kč fondu prevence na pojištěnce“ jako hlavní ukazatel: zůstává jen v tabulce hospodaření s poznámkou.
- Index pojišťoven 0–100: odloženo; nejdřív jednoduché grafy a tři témata.
- Srovnání úhrad poskytovatelům: mimo zaměření (vztah pojišťovna–nemocnice).
