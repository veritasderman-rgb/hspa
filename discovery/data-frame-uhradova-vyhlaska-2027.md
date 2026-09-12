# Datový rámec — uhradova-vyhlaska-2027

Sestaveno 12. 9. 2026 pro ARTICLE-WRITE podle routing-2026-09-12.md.

## Primární dokumenty (vše staženo 12. 9. 2026)

| # | Dokument | Odkud | Jak přečteno |
|---|---|---|---|
| P1 | **Návrh vyhlášky** o stanovení hodnot bodu, výše úhrad hrazených služeb, výše záloh a regulačních omezení **pro rok 2027** (`ma_ALBSDXRFYLM6.docx`) | odok.cz/portal/services/download/attachment/KORNDXRKFD7V/ | staženo `curl`, rozbaleno jako zip, přečteno `word/document.xml` → 584 843 znaků textu |
| P2 | **Odůvodnění / důvodová zpráva** (`zd_ALBSDXRFYLM6.docx`) | odok.cz/…/KORNDXRKFEMB/ | totéž → 127 752 znaků |
| P3 | **Předkládací zpráva** (`zp_ALBSDXRFYLM6.doc`, starý OLE formát) | odok.cz/…/KORNDXRKFCEX/ | plain-text extrakce přes Hlídač státu (`DocumentPlainText`), obsah shodný s P2 v překrývajících se pasážích |
| P4 | **Metadata řízení** (VeKLEP) | odok.cz/portal/veklep/material/ALBSDXRFYLM6/ | přes MCP `hlidac_statu` → `get_veklep_legislation_detail` |
| P5 | **Sněmovní tisk 235 — historie** | psp.cz/sqw/historie.sqw?o=10&t=235 | `curl`, windows-1250 → UTF-8, čteno jako surové HTML |
| P6 | **50. usnesení Výboru pro zdravotnictví** (tisk 235/1) | psp.cz/sqw/text/orig2.sqw?idd=279377 | staženo, rozbaleno, `word/document.xml` |
| P7 | **TZ MZ ČR, 18. 6. 2026** — „Rekordní shoda ve zdravotnictví…“ | mzd.gov.cz/tiskove-centrum-mz/… | ověřeny doslovné věty o podmínce 25 mld. a o 21 mld. |

**Past, kterou bylo nutno ošetřit:** vlastnosti souborů P1 a P2 nesou zděděné
titulky „Úhradová vyhláška 2026“ a „Odůvodnění Úhradové vyhlášky 2025“. Tělo
obou dokumentů je prokazatelně pro rok **2027** — § 1 odst. 1 návrhu:
„Tato vyhláška stanoví pro rok 2027…“; odůvodnění: „V současné době platí
vyhláška č. 432/2025 Sb. … pro rok 2026“. Zděděný titulek se v článku nikde
nepoužívá.

## Centrální KPI

- **Hlavní hodnota: 88,4 %** — poměr centrální a technické základní sazby
  CZ-DRG pro rok 2027. Proti **93,4 %** (2026) a **95,3 %** (2025).
- Zdroj: **P2**, doslova: *„Poměr centrální a technické základní sazby je pro
  rok 2027 88,4 %, což je významné zhoršení poměru oproti minulým rokům
  (v roce 2026 byl poměr 93,4 %, v roce 2025 dokonce 95,3 %). Zhoršení tohoto
  poměru implikuje, že růst nákladů nemocnic vysoce převyšuje růst úhrad, což
  zároveň vede k postupnému zhoršování hospodářského výsledku nemocnic, který
  po svém vrcholu v roce 2024 setrvale klesá.“*
- Vstupy poměru (tamtéž): centrální základní sazba **84 000 Kč**
  (+2 000 Kč, +2,4 % proti 2026); technická základní sazba **95 057 Kč**
  (+8,3 %). Kontrola redakce: 84 000 / 95 057 = 88,37 % → shoda s 88,4 %.
- Benchmark: **neexistuje mezinárodní protějšek** — CZ-DRG je národní systém.
  Článek proto žádné ČR × OECD/EU srovnání téhle veličiny nedělá.
- Časový kontext: návrh pro rok **2027**, v připomínkovém řízení od **9. 9.
  2026**, lhůta do **23. 9. 2026**.

## Sekundární hodnoty (všechny z P2, není-li uvedeno jinak)

**Bilance systému 2027**
- Příjmy **605 mld. Kč**, tj. **+44,4 mld. Kč (+7,9 %)** proti 2026.
- Náklady **604,8 mld. Kč**, z toho **583,5 mld.** na zdravotní služby
  (+27,1 mld.) a **21,3 mld.** ostatní (+240 mil. provozní fondy a fond
  veřejně prospěšných činností, +1 mld. fond prevence).
- Celkový růst nákladů **+28,4 mld. Kč (+4,9 %)**.
- **Saldo +0,2 mld. Kč.**
- Zůstatky pojišťoven: **43,2 mld.** k 31. 12. 2025 → očekávaných
  **33,2 mld.** k 31. 12. 2026; saldo roku 2026 dle ZPP „kolem **−15 mld.**“.
- Snížení maximálních přídělů do provozních fondů o **3 mld. Kč** (novela
  fondové vyhlášky) — MZ nečeká, že povede k poklesu výdajů těchto fondů.

**Příjmová strana a valorizace**
- Srpnová predikce MF: příjmy **604,6 mld. Kč**, zahrnuje mimořádnou
  valorizaci **15 mld. Kč** „dle návrhu novely zákona o pojistném…, který
  pozastavuje automatický valorizační mechanismus a stanovuje výši platby
  za státní pojištěnce pro rok 2027 napřímo“.
- Vyhláška oproti tomu: *„vlivem dodatečných jednání došlo k poklesu tohoto
  mimořádného navýšení z 15 mld. Kč na 13 mld. Kč (k tomu navíc platba za
  státní pojištěnce poroste o dodatečné 3 mld. Kč vlivem rostoucího počtu
  státních pojištěnců – celkový růst platby za státní pojištěnce pro rok 2027
  je tudíž 16 mld. Kč)“.*
- **P7 (18. 6. 2026)** doslova: *„V rámci závěrečného jednání byla z uzavřených
  dohod vypuštěna podmínka navýšení platby za státní pojištěnce o 25 miliard
  korun.“* a *„Uzavřené dohody tak zůstávají platné i při aktuálně schváleném
  navýšení této platby o 21 miliard korun…“*
- Druhá odchylka od MF: ostatní příjmy (penále, plnění risk-sharingových
  smluv) +**2,4 mld.** proti roku 2025; MF je drží na úrovni 2025. Dohromady
  obě odchylky = **0,4 mld.** rozdíl proti srpnové predikci MF.
- **METODICKÁ VÝHRADA (závazná pro text):** 21 mld. (červen) a 16 mld. (září)
  jsou obě popsány jako *navýšení / růst platby za státní pojištěnce pro rok
  2027*, ale **ani jeden dokument neuvádí svou základnu**. Rozdíl 5 mld.
  se v článku uvede jako **rozdíl mezi dvěma větami téhož ministerstva**
  a jako otázka pro připomínkové řízení, **ne** jako doložený výpadek.
  Žádný převodní můstek si redakce nedomýšlí.

**Dohodovací řízení 2027 (P2/P3)**
- Probíhalo **29. 1. – 18. 6. 2026**.
- Dohoda v **11 segmentech** z 15; **1 parciální** (radiodiagnostika
  a ambulantní laboratoře — parciální dohoda pro laboratorní péči);
  **3 bez dohody**: akutní lůžková péče, následná lůžková péče, specializované
  ambulantní služby.
  → Konzistentní s „12 z 15, z toho 1 částečná“ v P7 a v už publikovaném
  `clanek-dohodovaci-rizeni-2027-vysledek`; článek rozdíl 11+1 pojmenuje.
- Proti dohodě praktiků **vznesla protest skupina poskytovatelů domácí
  zdravotní péče**; protest nebyl ve výsledné podobě návrhu zohledněn.

**Růsty segmentů pro 2027**
| Segment | Růst |
|---|---|
| Jednodenní péče | ~16 % (objemem; dohoda nestanovila objemové limitace) |
| Zdravotnické prostředky na poukaz | téměř 9 % |
| Radiodiagnostika | ~8,7 % |
| Domácí péče + péče v pobytových zařízeních sociálních služeb | ~8,5 % |
| Centrové léky | ~6,7 % |
| Následná lůžková péče | 6,3 % |
| Primární péče (segmenty s dohodou) | 4 – ~5,5 % |
| Ambulantní specialisté | 5 % |
| Léky na recept | ~5 % |
| ZZS, laboratoře | 5 % |
| **Akutní lůžková péče** | **3,5 %** — „ze zbývajících disponibilních prostředků systému … do vyrovnaného salda“ |
| Lázně | 2 % |

**Akutní lůžková péče (P2, zvláštní část)**
- Centrální základní sazba **84 000 Kč**; technická **95 057 Kč**.
- Referenční základní sazba plně sjednocena na **95 000 Kč** (poskytovatelé
  v referenční síti CZ-DRG zajišťující komplexní péči) a **90 000 Kč**
  (ostatní z definované skupiny).
- Podíl péče hrazené jednotnou základní sazbou: **30,2 % (2026) → 53,1 %
  (2027)**, včetně TEP.
- **Totální endoprotézy** vyjmuty z vyhláškou stanovené úhrady a ponechány na
  smluvním ujednání. MZ k tomu samo v kapitole „Zhodnocení rizika“ píše, že
  *„není jasné, jakým způsobem bude hrazena v případě, že zdravotní pojišťovna
  a poskytovatel neuzavřou pro daný rok individuální úhradový dodatek“*.
  Očekávaná úspora dle citlivostní analýzy **2,2 mld. Kč**.
- Dopady podle typu poskytovatele: *„významně vyšší růst úhrad pro regionální
  nemocnice než pro fakultní nemocnice“*; **absolutní propad** u
  specializovaných ústavů (sjednocování sazeb, omezování nákladových
  modifikátorů) a u psychiatrických nemocnic (pokračující pád relativních vah
  CZ-DRG).
- Modelace **nezahrnují data od Zdravotní pojišťovny ministerstva vnitra**,
  která je z technických důvodů na své straně neposkytla.

**Následná lůžková péče — pilot rozhodčího panelu (P2)**
- V segmentu nedošlo k dohodě, ale „za souhlasu účastníků“ proběhlo
  **pilotní ověření nového mechanismu tzv. rozhodčího panelu podle
  připravované legislativní změny zákona o veřejném zdravotním pojištění“**.
- Koridor povoleného růstu nákladů **3 % až 8 %**; panel zvolil **návrh
  zdravotních pojišťoven**. Předseda panelu rozhodnutí zdůvodnil *„vyšší
  prioritou pro finanční udržitelnost systému oproti vyšší podpoře
  poskytovatelů následné péče“*.
- Základní růst úhrady **2 %**, u OD 00005, 00024, 00030 a 00037 **3,5 %**.
- Nad rámec zvoleného návrhu: geriatrická bonifikace (+20 Kč za OD u křehkého
  pacienta v OD 00024), celkový dopad geriatrických úprav **~0,5 mld. Kč**.

**Value-based prvky (P2)**
- **Bonifikace za proočkovanost personálu nemocnic proti chřipce:** centrální
  základní sazba se zvýší o **1 000 Kč**, dosáhne-li proočkovanost
  **33 % lékařů a 15 % nelékařů** k 31. 12. 2027. Výchozí stav uvedený
  v odůvodnění: **24 % lékařů a 7,7 % zdravotních sester**.
  ⚠️ **MZ k těmto dvěma číslům neuvádí zdroj ani rok** — v článku se citují
  výhradně jako údaj odůvodnění, ne jako ověřený indikátor. Vyhodnocovat je
  má ÚZIS anonymně a agregovaně.
  Dopad při splnění dle citlivostní analýzy: **−1,3 mld. Kč** (= náklad navíc).
- **Bonifikace za vykazování mRS u cévních mozkových příhod:** +5 % úhrady
  CMP při vykázání u ≥ 90 % pacientů, maximální dopad **50 mil. Kč**.
- **Bonifikace za dětské pacienty** u vybraných DRG skupin u poskytovatelů
  s komplexním onkologickým centrem: dopad **~60 mil. Kč**.

**Citlivostní analýza (P2) — verbatim položky**
| Směr | Částka | Položka |
|---|---|---|
| + | 2,6 mld. | vyšší výběr pojistného |
| + | 3 mld. | nižší náklady roku 2026 |
| + | 3 mld. | pokles výdajů provozních fondů 2027 |
| + | 1,5 mld. | implementace elektronických laboratorních žádanek |
| + | 2,2 mld. | úspory u totálních endoprotéz |
| − | 0,5 mld. | vyšší dopad úhrady terénních sester |
| − | 3,2 mld. | vstup nových léčiv na Alzheimerovu chorobu |
| − | 1,3 mld. | bonifikace za očkování personálu nemocnic |
| − | 2 mld. | vyšší růst objemu péče |
| − | 1,5 mld. | vyšší růst výdajů provozních fondů a FVPČ |
| − | 0,5 mld. | omezená aplikace indexů cenové slevy u centrové léčby |
| − | 2 mld. | podpora transformace nemocnic |
- Součty **redakce**: kladné položky **+12,3 mld.**, záporné **−11,0 mld.**
  (v článku označeno jako součet redakce, ne jako údaj vyhlášky).
- Závěr MZ doslova: *„potenciální vlivy zlepšující finanční bilanci svou výší
  a pravděpodobností výskytu převyšují vlivy zhoršující tuto bilanci a rizika
  predikce jsou tak vychýlená směrem k přebytku“*.

## Legislativa

- **Zmocnění:** § 17 odst. 5 zákona č. 48/1997 Sb., o veřejném zdravotním
  pojištění, ve znění zákona č. 371/2021 Sb. a zákona č. 289/2025 Sb.
  (citace ze záhlaví návrhu, P1).
- **Platný předpis pro rok 2026:** vyhláška č. 432/2025 Sb. — uvedeno
  v odůvodnění (P2). Sbírka zákonů dnes strojově nedostupná (403), označení
  se proto v článku připisuje odůvodnění MZ.
- **Procesní výjimky (P3):** lhůta pro připomínky zkrácena na **10 pracovních
  dnů** dopisem ministra a předsedy Legislativní rady vlády
  **čj. 27721-2026-UVCR ze 7. 7. 2026**; materiál projednán **mimo elektronický
  systém tvorby právních předpisů** podle § 18 odst. 1 zákona č. 222/2016 Sb.
  na základě výjimky ministra vnitra **čj. MV-11705-2/LG-2026 z 27. 1. 2026**.
- **Připomínková místa (P3, 11):** MF, MV, MO, MPSV, MSp, Odbor kompatibility
  ÚV, Unie zaměstnavatelských svazů ČR, ČMKOS, Česká lékařská komora, Česká
  lékárnická komora, Česká stomatologická komora.
- **První připomínka (P4):** Česká stomatologická komora, **9. 9. 2026 18:39**,
  typ *doporučující*, ke kódu 00834 v příloze č. 11 (stomatologie).
- **Sněmovní tisk 235 (P5, P6):** vláda předložila 23. 6. 2026; 1. čtení
  8. 7. 2026 (Sněmovna nesouhlasila s projednáním podle § 90 odst. 2);
  garanční Výbor pro zdravotnictví vydal **50. usnesení z 10. schůze ze dne
  2. září 2026** — doporučuje schválit, **bez pozměňovacích návrhů**;
  doručeno poslancům jako tisk 235/1 **4. 9. 2026**. Hlavička stránky
  ke dni **12. září 2026**: druhé čtení není zaznamenáno, „další projednávání
  možné od 7. 9. 2026“.

## Mezinárodní kontext

**Vědomě žádný.** Centrální ani technická základní sazba CZ-DRG, poměr mezi
nimi ani struktura českých úhradových mechanismů nemají v OECD ani Eurostatu
metodický protějšek. Dvojice „ČR vs OECD“ by zde párovala nesouměřitelné
veličiny — článek ji proto nedělá a důvod pojmenovává.

## Evidence (recenzovaná literatura)

**Žádná.** Článek netvrdí nic o účinnosti, riziku ani dopadu zdravotnické
intervence — popisuje obsah právního předpisu a jeho vlastního odůvodnění.
PubMed byl v discovery fázi dotázán na nové domácí práce (12. 9. 2026,
`datetype: edat`, `date_from 2026/09/10`); žádná health-services práce
k tématu neexistuje. Consensus proto nevolán — viz discovery report.

## Interní křížové odkazy

- Články: `clanek-dohodovaci-rizeni-2027-vysledek`,
  `clanek-uhradova-vyhlaska`, `clanek-valorizace-statni-pojistenci-2027`,
  `clanek-deficit-pojisteni-2026`, `clanek-projekce-bez-centrovych-leciv`,
  `clanek-podfinancovani-nemocnic-2026` (ověřit existenci),
  `clanek-centrove-leky-2026`.
- Indikátory: `vydaje_zdravotnictvi_hdp`, `uhrada_zp_per_pojistenec`,
  `podil_vydaje_luzkova_pece`, `podil_vydaje_ambulantni_pece`,
  `podfinancovani_oblastni_interna_cm`, `naklady_centrove_leky_total`.

## Co se do článku vědomě NEDÁVÁ

1. **Dopočet „kolik systému chybí“** z rozdílu 21 vs 16 mld. — základny nejsou
   doložené (viz výše).
2. **Tvrzení, že vyhláška bude vydána v tomto znění.** Je to návrh
   v připomínkovém řízení; text to říká v každé relevantní pasáži.
3. **Cokoli ze SÚKL a ze Sbírky zákonů** — oba kanály dnes vracejí 404 / 403.
4. **Interpretace proočkovanosti 24 % / 7,7 %** jako ověřeného indikátoru —
   MZ k nim neuvádí zdroj; citují se jako údaj odůvodnění.
5. **Jakýkoli soud o tom, jak dopadne hlasování o tisku 235.**
