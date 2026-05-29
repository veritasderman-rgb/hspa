# Discovery report — 2026-05-29

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-29 (pátek). Předchozí běh 2026-05-28 → FALLBACK‑AUDIT
(`clanek-hta-jca-eu-2026.html` audit‑fix).

Prozkoumáno přímým WebFetch/WebSearch: ÚZIS aktuality, MZ ČR všechny novinky
(mzd.gov.cz/vsechny-novinky/), SZÚ aktuality, WHO Europe news‑room, ČSÚ
aktuality, NÚKIB (HTTP 404 přes původní URL, redirect na nukib.gov.cz),
PSP historie (jen navigační), Zákony pro lidi aktuálně (HTTP 403),
Věstník MZd, Portál ukazatelů kvality (puk.kancelarzp.cz) — pro mortalitní
data primární zdroj namísto sekundární mediální citace.

## HOT — primárně‑zdrojový trigger 28. 5. 2026

### Věstník MZ ČR č. 6/2026 — publikováno 28. 5. 2026

Po měsících finalizace ministerstvo zveřejnilo dva metodické pokyny pro
vysoce specializovanou chirurgii:

1. **Metodický pokyn MZd stanovující podmínky, za nichž se provádějí
   chirurgické výkony v hepatopankreatikobiliární oblasti** (resekce
   jater, slinivky, výkony na žlučových cestách)
2. **Metodický pokyn MZd stanovující podmínky, za nichž se provádějí
   chirurgické výkony v oblasti jícnu a gastroesofageální junkce**

Dále Věstník obsahuje (mimo HSPA scope):
- Syndrom CAN v urgentní medicíně + KARTY (péče o týrané děti)

Primární zdroje:
- TZ MZd 28. 5. 2026 „Ministerstvo zdravotnictví pokračuje v reformě
  vysoce specializované péče. Centralizace nejnáročnější chirurgie
  vstupuje do finální fáze"
  (https://mzd.gov.cz/tiskove-centrum-mz/ministerstvo-zdravotnictvi-pokracuje-v-reforme-vysoce-specializovane-pece-centralizace-nejnarocnejsi-chirurgie-vstupuje-do-finalni-faze/)
- TZ MZd 28. 5. 2026 „Ministerstvo zdravotnictví vydalo nové metodické
  pokyny pro vysoce specializovanou chirurgickou péči"
  (https://mzd.gov.cz/ministerstvo-zdravotnictvi-vydalo-nove-metodicke-pokyny-pro-vysoce-specializovanou-chirurgickou-peci/)
- Věstník MZD č. 6/2026, datum vydání 28. 5. 2026, 4,17 MB PDF
  (https://mzd.gov.cz/vestnik/vestnik-6-2026/)
- PDF samotného Věstníku nedostupné přes přímý WebFetch
  (potenciální URL `wp-content/uploads/2026/05/Vestnik-MZD_6-2026.pdf`
  vrátila HTTP 404 — agent nemá ke stažení samotného PDF přístup, čísla
  z pokynů zatím pokrývá sekundární mediální reportáž).

Doslovná citace ministra Adama Vojtěcha (TZ 28. 5. 2026, ověřeno
WebSearch):

> „Vysoce specializovaná péče musí být organizována tak, aby pacientům
> v nejtěžších stavech nabídla nejvyšší možný standard léčby bez ohledu
> na region. Naším cílem je budovat systém, který bude transparentní,
> předvídatelný a založený na datech. Tam, kde centralizace prokazatelně
> přináší lepší výsledky léčby, v ní chceme pokračovat."

Další citované osoby v TZ 28. 5. 2026:
- Patrik Zachar (vrchní ředitel sekce zdravotní péče MZd)
- Tomáš Hauer (předseda Pracovní skupiny pro specializovanou zdravotní
  péči a Centra vysoce specializované péče)
- Ladislav Dušek (ředitel ÚZIS ČR)

**Stav implementace per TZ MZd 28. 5. 2026:**
- Metodické pokyny publikovány ve Věstníku 6/2026 (= dříve uváděné
  „čeká na legislativní kontrolu a publikaci" už je hotovo).
- Účinnost reformy: **od roku 2027**.
- Dekontraktace nemocnic bez statutu CVSP pojišťovnami: druhá polovina
  2026.

### KRITICKÁ VALIDACE — ověření osob a primárních zdrojů

1. **Ministr zdravotnictví k 28. 5. 2026 = Adam Vojtěch.**
   Vlastimil Válek skončil 15. 12. 2025 s koncem 3. vlády Petra Fialy.
   Třetí vláda Andreje Babiše jmenována 15. 12. 2025 prezidentem
   Petrem Pavlem; Vojtěch nominován ANO 2011 jako „nestraník za ANO".
   Zdroj: cs.wikipedia.org/wiki/T%C5%99et%C3%AD_vl%C3%A1da_Andreje_Babi%C5%A1e,
   vlada.gov.cz/cz/clenove-vlady/adam-vojtech-167014/.

2. **Mortalitní data po HPB chirurgii — primární zdroj je PUK
   (puk.kancelarzp.cz), ne Zdravotnický deník.**
   Existující článek `clanek-centralizace-chirurgie-2027.html`
   (publ. 13. 5. 2026) cituje hodnoty 6,15 % vs 11,76 % z dubnové
   prezentace MZd. Aktuální PUK 2024 data k 29. 5. 2026 ukazují
   metodicky stejný indikátor, ale na nejnovější vlně:

   | Indikátor | Období | Velkoobjemová | Maloobjemová | ČR celkem |
   |---|---|---|---|---|
   | 90d mortalita resekce jater | 2024 (n=886) | 4,61 % (>40/r, n=598) | 7,55 % (<20/r, n=145) | 5,19 % |
   | 90d mortalita resekce slinivky | 2024 (n=858) | 5,49 % (>30/r, n=525) | 0,00 % (<5/r, n=12 — bez interpretovatelného rozsahu) | 5,24 % |
   | 90d mortalita resekce karc. jícnu | 2022–2024 (n=481) | 7,18 % (≥10/r, n=107) | 7,45 % (<10/r, n=50) | 7,28 % standardizovaná |
   | 90d mortalita resekce karc. jícnu | 2024 samostatně | — | — | **3,18 % — razantní pokles** atribuovaný „výsledkům v posledních dvou letech" a „potenciálnímu příspěvku centralizace" |

   Citace z PUK 90d mortalita resekce jater: „velkoobjemová pracoviště
   (>40 případů/rok) 4,61 %; pracoviště <20 případů/rok 7,55 %;
   ČR celkem 5,19 %; n=886 výkonů v roce 2024".
   Zdroj: puk.kancelarzp.cz/mortalita-po-resekci-jater/,
   puk.kancelarzp.cz/30-90denni-mortalita-po-resekci-slinivky/ (HTTP 404
   přes původní URL, ověřeno alternativní cestou),
   puk.kancelarzp.cz/90denni-mortalita-po-resekci-karcinomu-jicnu/,
   puk.kancelarzp.cz/90denni-mortalita-pacientu-po-resekcnim-vykonu-na-pankreatu/.

   **Methodology caveat:** PUK počítá standardizovanou mortalitu
   (logistická regrese s adjustací na věk, pohlaví, komorbidity);
   dubnová prezentace MZd reportovala hodnoty 2022–2024 souhrnně
   (3 072 případů). 4,61 % vs 7,55 % je proto **podmnožina** dat
   2024; 6,15 % vs 11,76 % bylo souhrnné období 2022–2024 dle
   pracovní skupiny. V revizi článku je správně uvést obě hodnoty
   se zdrojem a vlnou.

3. **Konkrétní seznam center — sekundární zdroj zatím:** ZD 4/2026
   uvádí 13 HPB center (FN Olomouc, FN Královské Vinohrady, IKEM, ÚVN,
   FN HK, FN Plzeň, FN Motol a Homolka, VFN, MOÚ s FN U sv. Anny a
   FN Brno, FN Ostrava, FT Nemocnice, AGEL Nový Jičín, Nemocnice ČB)
   a 6 ezofageálních center v 8 nemocnicích. **Plný seznam ve Věstníku
   6/2026** — text PDF agent nestáhl, primární verifikace odložena
   na pozdější ruční doplnění.

## Další zdroje 28.–29. 5. 2026

### MZ ČR — další novinky 28. 5. 2026 (mimo HOT)
- **Projekt CDZ IV — Podpora vzniku center duševního zdraví IV**.
  Vyhlášení výzvy 15. 9. 2026, realizace VII/2026 – XII/2028, plán
  nejméně 15 nových CDZ. Téma duševního zdraví je v korpusu pokryto
  vícero články (mj. `clanek-psychiatricke-hospitalizace-reforma-2026.html`
  ve frontě 10. 7. 2026, `clanek-detska-psychiatrie-krize.html`); CDZ IV
  jako samostatný trigger neopravňuje nový článek — pokryjeme případně
  jako WARM revizi reformního článku v některém z dalších běhů.
- Nový metodický pokyn ve Věstníku 6/2026 k syndromu CAN v urgentní
  medicíně — souvisí s ochranou týraných dětí, není čistě HSPA téma,
  v korpusu nesouvisí s žádným existujícím článkem. Možný budoucí
  HOT trigger pro samostatný článek o péči o týrané děti.

### ÚZIS
- Bez nové aktuality 28.–29. 5. Poslední aktualita 5. 5. 2026
  (Prodloužení sběru výkazů).

### SZÚ
- 26. 5. 2026: Nutrivigilance 2025, ERVI‑net konference — bez HSPA
  triggeru. Žádná aktualita 28.–29. 5.

### WHO Europe
- 27. 5. 2026: World No Tobacco Day 2026 feature — globální, korpus
  pokrývá `clanek-koureni-adolescenti.html` (slot 9. 6. 2026).

### ČSÚ
- 27. 5. 2026: TZ k inovacím firem; 28. 5. 2026: TK k mzdám.
  Žádný HSPA‑relevantní dataset.

### SÚKL / NÚKIB / VZP / NKÚ / PSP / Sbírka zákonů
- Bez nového triggeru. Některé zdroje vrátily HTTP 403/404, redirected
  na .gov.cz domény (NÚKIB).

## Aktualizace existujících dat
- **PUK aktualizace na vlnu 2024** je hlavní aktualizační vlna napříč
  HPB indikátory (jater, slinivky, jícnu). Implikace: existující článek
  `clanek-centralizace-chirurgie-2027.html` (publ. 13. 5.) cituje
  pouze starší vlnu 2022–2024 souhrnně.

## Stav publikační fronty (k 29. 5. 2026)

Fronta obsahuje **28 článků naplánovaných na 22. 5. – 10. 7. 2026** plus
9 článků bez `scheduled_for`. Nejvzdálenější naplánovaný článek:
`clanek-psychiatricke-hospitalizace-reforma-2026.html` slot 2026‑07‑10.

**Next publikační slot** (dle snippet PROMPT_DAILY_ROUTINE.md sekce 3.4):
**2026-07-11.** Fronta zůstává nedotčená — dnešní routing nepřidává
nový článek (viz Routing).

## Doporučení pro routing fáze

- **HOT (nový článek):** žádný — Věstník 6/2026 publikuje to, co
  článek `clanek-centralizace-chirurgie-2027.html` z 13. 5. 2026 už
  popisuje (mortalitní data, počty center, koeficient centralizace,
  účinnost 2027). Nový článek by byl duplicita.
- **WARM (revize existujícího článku):** **ARTICLE-REVISE →
  `clanek-centralizace-chirurgie-2027.html`** — článek explicitně
  disclaimuje, že „konkrétní finální znění akreditačních kritérií ve
  Věstníku MZ ČR pro reformu 2027 je v okamžiku přípravy tohoto draftu
  (květen 2026) ve fázi finalizace". Tato fáze je dnešním Věstníkem
  6/2026 uzavřena → revize disclaimer a doplnění primárních zdrojů.
- **COLD / FALLBACK‑AUDIT:** žádný — netřeba.

## Routing rozhodnutí

ARTICLE‑REVISE → `clanek-centralizace-chirurgie-2027.html` (doplnit
update sekci s primárními zdroji 28. 5. 2026 + Věstník 6/2026 +
PUK 2024 vlna + citace ministra Vojtěcha). Viz `routing-2026-05-29.md`.
