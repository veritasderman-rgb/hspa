# Draft: žádost o datovou spolupráci (ÚZIS / NIKEZ / KZP)

> **Stav: DRAFT k ruční úpravě a odeslání redakcí.** Připraveno 2026-06-10 v rámci
> plánu „dostat co nejvíc ověřených dat na dashboard". Nic nebylo odesláno.
> Před odesláním doplnit: jméno odesílatele, funkci, konkrétního adresáta.
>
> **Kontext:** Největší blok neověřených indikátorů HSPA Monitoru (~34) má jako
> zdroj ÚZIS (NZIS, NRHZS, NRZP, NRH). Veřejné API cesty jsou nedostupné
> (data.gov.cz CKAN API vypnuto, NRHZS exporty v 7z, řada dat jen v PDF).
> Formální dohoda o strojovém přístupu by odblokovala největší pool dat.

---

## Varianta A — ÚZIS (žádost o strojový přístup k otevřeným datům)

Vážená paní / Vážený pane,

obracím se na Vás jménem redakce projektu **HSPA Monitor** (hspa-cesko.cz) —
veřejného, nekomerčního portálu, který podle metodiky OECD Health System
Performance Assessment (HSPA 2023) průběžně zveřejňuje indikátory výkonnosti
českého zdravotnictví, vždy s uvedením primárního zdroje a metodiky.

Část indikátorů již čerpáme automatizovaně z otevřených rozhraní (Eurostat,
OECD SDMX, ECDC, SÚKL open data, ČSÚ). U dat ÚZIS jsme však narazili na
praktickou překážku: katalogové API data.gov.cz bylo vypnuto, část datových
sad je dostupná pouze jako komprimované archivy bez stabilních URL a řada
agregátů vychází pouze v PDF publikacích.

Rádi bychom proto požádali o konzultaci, jak korektně a šetrně (max. 1 dotaz
denně, identifikace User-Agentem) strojově odebírat tyto agregované datové sady:

1. NZIS — vybrané agregáty (hospitalizace, ambulantní kontakty, personál),
2. NRHZS — roční agregáty na úrovni ČR/krajů,
3. NRZP — počty lékařů a sester (úvazky) podle krajů.

Nejde o individuální ani citlivá data — výhradně o agregáty, které ÚZIS již
publikuje, jen v podobě obtížné pro automatizované zpracování. Výstupy vždy
uvádějí ÚZIS jako zdroj s odkazem.

Děkuji za Váš čas a jsem k dispozici k osobní či online schůzce.

S pozdravem,
[jméno, role, kontakt]

---

## Varianta B — KZP (návaznost na souhlas s PUK daty)

Vážená paní / Vážený pane,

děkujeme za souhlas s re-publikací ukazatelů z Portálu ukazatelů kvality (PUK),
který jste nám poskytli. Připravujeme sekci „Kvalita péče" a rádi bychom se
zeptali, zda KZP zvažuje (nebo by zvážila) zveřejnění podkladových dat PUK
ve strojově čitelném formátu (CSV/JSON export), případně zda existuje interní
rozhraní, ke kterému by bylo možné sjednat přístup. Scraping HTML, ke kterému
máme Váš souhlas, je pro obě strany křehčí řešení než stabilní export.

S pozdravem,
[jméno, role, kontakt]

---

## Varianta C — NIKEZ (nabídka spolupráce)

Vážená paní / Vážený pane,

HSPA Monitor (hspa-cesko.cz) veřejně vizualizuje výkonnost českého zdravotnictví
podle metodiky OECD HSPA — včetně rozlišování ověřených a ilustrativních hodnot
a odkazů na primární zdroje. Vnímáme silný průnik s posláním NIKEZ v oblasti
indikátorů kvality. Rádi bychom nabídli spolupráci: převzetí indikátorové sady
NIKEZ do veřejné vizualizace (s plnou atribucí), zpětnou vazbu k metodickým
kartám, případně sdílení našeho open-source datového pipeline.

S pozdravem,
[jméno, role, kontakt]

---

## Poznámky pro odeslání

- Adresáti: ÚZIS — oddělení komunikace / open data (datová podpora);
  KZP — kontakt z dohody o PUK; NIKEZ — sekretariát.
- Přílohou možno: odkaz na `o-projektu.html` (metodika), příklad metodické
  karty indikátoru, odkaz na GitHub repozitář (transparentní pipeline).
- Po odpovědi zaznamenat výsledek do `05_M1_Starter/PLAN-VERIFIKACE-INDIKATORU.md`
  (sekce Blokované zdroje).
