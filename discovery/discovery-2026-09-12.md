# Discovery report — 2026-09-12

Běh denní rutiny podle `PROMPT_DAILY_ROUTINE.md`, fáze 1. Okno rešerše:
**11. 9. – 12. 9. 2026** (poslední běh rutiny 11. 9.), u kanálů s delší
periodicitou kontrolováno zpět k 5. 9. Primární dokumenty byly staženy přímo
(`curl`, User-Agent `ZdraveCesko-HSPA/1.0`) a strojově rozbaleny, ne přečteny
přes shrnující WebFetch — u nálezu dne to platí bez výjimky.

## Nové indikátory / datasety

- **Eurostat — `HLTH_SHA11_*` znovu aktualizováno 9. 9. 2026 v 23:00.**
  Zachyceno v oficiálním RSS `api/dissemination/catalogue/rss/en/statistics-update.rss`
  (staženo 12. 9. 2026, 1 997 položek, feed pokrývá 5.–11. 9.); v celém okně
  je to **jediných 8 `hlth_*` položek**, všechny z řady SHA11 (FS, HC, HCHF,
  HCHP, HF, HFFS, HP, HPHF). Ověřeno živým dotazem na disseminační API
  (`hlth_sha11_hf`, `unit=PC_GDP`, `icha11_hf=TOT_HF`; hlavička odpovědi
  `updated: 2026-09-09T23:00:00+0200`):
  - **ČR se nezměnila**: 2023 = 8,38 %, **2024 = 8,46 % HDP** (buňka nese flag
    `p` = provisional), rok **2025 pro ČR není**.
  - Novinkou proti vlně z 2. 9. je **první výskyt roku 2025** u několika zemí,
    vždy s flagem `p`: AT 11,93 %, DE 12,73 %, PL 8,89 %.
  - **Agregát EU27 za 2024 stále chybí** (FI, LV, MT bez roku 2024); poslední
    dostupný EU27 zůstává **2023 = 9,94 % HDP**.
  - Pro kontrakt tedy **žádná změna** → COLD. Pro evergreen položku
    `dve-cisla-o-jednom-roce-vintage` (rozpor ČSÚ × Eurostat za 2024) je to
    potvrzení, že rozpor trvá.
  <https://ec.europa.eu/eurostat/databrowser/view/hlth_sha11_hf>
- **ÚZIS — aktuality** (`uzis.cz/index.php?pg=aktuality`): beze změny, poslední
  věcná položka je dál **aid=8757 „Vysoké teploty a mortalita“ (14. 8. 2026)**.
  Žádná nová vlna NRPZS, NOR, NRH ani NRZP → NIC.
- **NZIP — datové zpravodajství** (`nzip.cz/modul/datove-zpravodajstvi`): tytéž
  čtyři položky jako od 29. 8. (vysoké teploty a mortalita, laboratorní
  vyšetření, rakovina plic, stomatologická péče) → NIC.
- **ČSÚ — aktuality**: v okně jen **„Pohyb obyvatelstva – 1. pololetí 2026“
  (11. 9. 2026)**, rychlá informace bez příčin smrti. Vlna příčin smrti za rok
  2025 zatím nevyšla (ČSÚ ji publikuje koncem září) → COLD.
- **OECD**: `oecd.org/en/topics/health.html` vrací na strojový dotaz HTTP 403;
  kanál se ani dnes ověřit nepodařilo, do routingu nevstupuje. Health at a
  Glance vychází typicky v listopadu — mimo okno.
- **SÚKL — registr výpadků léčiv**: obě známé cesty dál končí 404 (`sukl.cz/…`
  → 301 na `sukl.gov.cz/…` → 404). Kanál dnes **neověřen**, žádné tvrzení
  z něj nevzniká.

## Nové legislativní normy / sněmovní tisky

- **[X] HOT — Úhradová vyhláška pro rok 2027 vstoupila 9. 9. 2026 do
  meziresortního připomínkového řízení.**
  *Návrh vyhlášky o stanovení hodnot bodu, výše úhrad hrazených služeb, výše
  záloh na úhradu hrazených služeb a regulačních omezení pro rok 2027*,
  předkladatel Ministerstvo zdravotnictví, čj. **MZDR 25287/2026-1/LEG**,
  PID **ALBSDXRFYLM6**, datum autorizace **9. 9. 2026**, stav
  **„2 – v připomínkovém řízení“**, **termín připomínek do 23. 9. 2026**,
  11 připomínkových míst. Zmocnění: § 17 odst. 5 zákona č. 48/1997 Sb.
  - Nález přišel z kanálu Hlídače státu (`search_veklep_legislation`), ale
    **všechny hodnoty pocházejí z primárních dokumentů staženého materiálu**:
    `ma_ALBSDXRFYLM6.docx` (návrh vyhlášky, 584 843 znaků po rozbalení) a
    `zd_ALBSDXRFYLM6.docx` (důvodová zpráva / odůvodnění, 127 752 znaků),
    obojí staženo 12. 9. 2026 přímo z odok.cz a rozbaleno lokálně
    (`word/document.xml`).
  - **Past ošetřena:** vlastnosti dokumentů nesou zděděné titulky „Úhradová
    vyhláška 2026“ a „Odůvodnění Úhradové vyhlášky 2025“. Tělo obou dokumentů
    je prokazatelně pro rok **2027** (§ 1 odst. 1 návrhu: „Tato vyhláška
    stanoví pro rok 2027…“; odůvodnění: „V současné době platí vyhláška
    č. 432/2025 Sb. … pro rok 2026“).
  - **První připomínka už v systému je**: Česká stomatologická komora,
    **9. 9. 2026 18:39**, typ *doporučující*, ke kódu 00834 v příloze č. 11.
  - Klíčová čísla (verbatim z odůvodnění): příjmy 2027 **605 mld. Kč**
    (+44,4 mld., +7,9 %), náklady **604,8 mld. Kč** (+28,4 mld., +4,9 %),
    saldo **+0,2 mld. Kč**; zůstatky pojišťoven 43,2 mld. (31. 12. 2025) →
    očekávaných 33,2 mld. (31. 12. 2026); centrální základní sazba CZ-DRG
    **84 000 Kč** proti technické **95 057 Kč** (poměr **88,4 %** proti 93,4 %
    v roce 2026 a 95,3 % v roce 2025).
  → **HOT, kandidát na článek dne.**
  <https://odok.cz/portal/veklep/material/ALBSDXRFYLM6/>
- **PSP ČR, sněmovní tisk 235** (novela zák. č. 592/1992 Sb. — mimořádná
  valorizace platby za státní pojištěnce). Staženo dnes jako surové HTML
  v kódování windows-1250 z `psp.cz/sqw/historie.sqw?o=10&t=235`, hlavička
  verbatim **„Stav projednávání ke dni: 12. září 2026“**. Posledním záznamem
  je dál blok garančního výboru: *„Garanční Výbor pro zdravotnictví projednal
  návrh zákona a vydal 4. 9. 2026 usnesení doručené poslancům jako tisk 235/1
  (doporučuje schválit). Další projednávání možné od 7. 9. 2026.“*
  **Proti běhu 11. 9. beze změny** — druhé čtení neproběhlo.
  Článek `clanek-valorizace-statni-pojistenci-2027` je k tomuto stavu už
  aktualizovaný (revize 5. 9., kontrola 11. 9.) → **žádná nová revize dnes**.
  Tisk ale **věcně vstupuje do dnešního článku**, protože příjmová strana
  úhradové vyhlášky na jeho přijetí stojí.
- **VeKLEP, další pohyb v gesci MZ** (Hlídač státu, `from_date 2026-09-05`):
  novela zákona č. 258/2000 Sb. o ochraně veřejného zdraví (PID ALBSDUUFQ5OR,
  poslední úprava **10. 9. 2026**) a novela zákona č. 167/1998 Sb.
  o návykových látkách (PID KORNDVEC8EF8, poslední úprava **10. 9. 2026**) —
  obojí jen posun data poslední úpravy, **bez nové autorizované verze**
  (autorizace zůstávají 11. 6. a 30. 6. 2026) → WARM, dnes bez akce.
- **Sbírka zákonů**: `zakonyprolidi.cz/cs/aktualne` i detail konkrétního
  předpisu vrací z běhového prostředí **HTTP 403**. Kanál dnes **neověřen**;
  označení vyhlášky č. 432/2025 Sb. se v článku proto opírá o **text
  odůvodnění MZ**, ne o Sbírku, a je tak i uvedeno.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **MZ ČR, 10. 9. 2026** — *Očkování blíž lidem: možnost očkovat v lékárnách má
  širokou podporu odborných společností i pacientů* (13 odborných a pacientských
  organizací, NAPO). Téma je v korpusu pokryto článkem
  `clanek-ockovani-v-lekarnach` (27. 8. 2026) → WARM, ne spouštěč dne;
  kvantitativní údaje z TZ (podíl očkovaných dospělých proti chřipce, počty
  hlášených podezření na NÚ ze SÚKL) by před použitím vyžadovaly dohledání
  v primárních datech SÚKL, které dnes nejsou dostupné (viz výše).
- **MZ ČR, 11. 9. 2026** — *Hygienici letos provedli přes 1 300 kontrol dětských
  táborů* — provozní zpráva bez vazby na indikátor → COLD.
- **MZ ČR, 1.–7. 9. 2026** — screening rakoviny prostaty (1. 9.), onkologičtí
  koordinátoři (2. 9.), EZKarta (3. 9.), Aktivní ZÁŘÍ (4. 9.), komáři (7. 9.):
  všechny už prošly předchozími běhy discovery → bez akce.
- **NÚKIB**: v okně nic ke zdravotnictví ani k NIS2 → COLD.

## Recenzovaná literatura (PubMed / Consensus)

Oba konektory dostupné.

- `PubMed` → `search_articles` s afiliačním filtrem na ČR, `datetype: edat`,
  `date_from 2026/09/10`, `sort: pub_date`, 25 vrácených záznamů. Metadata
  prověřena u pěti nejnovějších (PMID 42586909, 42585865, 42570632, 42721376,
  42672787). Jde o mezinárodní klinické a laboratorní práce se spoluautorstvím
  českých pracovišť (axSpA, mikrobiální elektrolýza, vazba cediranibu na
  albumin, kortizol ve vlasech, biomarkery u preeklampsie) — **žádná
  health-services práce k financování, úhradám ani k tématu dne.**
  Podle PubMed jde bez výjimky o typ *Journal Article*, žádná retrakce.
- `Consensus` dnes **nevolán, a to záměrně**: dnešní článek netvrdí nic
  o účinnosti, riziku ani dopadu intervence — je to popis obsahu právního
  předpisu a jeho vlastního odůvodnění. Rutina předepisuje Consensus
  ke kauzám, „u nichž článek bude tvrdit něco o účinnosti, riziku nebo dopadu“;
  dekorativní dotaz by do registru přidal nález bez vazby na tvrzení.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

- **VeKLEP**: viz výše — **hlavní nález dne** (úhradová vyhláška 2027,
  ALBSDXRFYLM6) plus dvě položky s pouhým posunem data poslední úpravy.
  Dotaz `zdravotnictví OR zdravotní OR léčiv`, `from_date 2026-09-05`,
  spuštěn 12. 9. 2026; celkem 5 záznamů.
- **Registr smluv**: dotaz na klíčová slova „zdravotnické nemocnice“,
  `from_date 2026-09-09`, `minimal_price 100 000 000`, řazeno podle hodnoty —
  **0 záznamů**. (První pokus s kategoriemi `zdrav_*` skončil chybou nástroje;
  zopakováno bez kategorií.) → žádná mimořádná zdravotnická smlouva.
- **ÚOHS**: dotaz `nemocnice OR zdravotní OR VZP OR zdravotnictví`,
  `from_date 2026-09-05` — **0 rozhodnutí** → nic nového.
- **Ověřovna Barometru**: v okně nezachycen žádný konkrétní kvantitativní
  výrok politika o zdravotnictví, který by šlo konfrontovat s indikátory.
  Žádný kandidát.

## Doporučení pro routing fáze

- **HOT (aktuální dění):** úhradová vyhláška pro rok 2027 v připomínkovém
  řízení (ALBSDXRFYLM6, 9.–23. 9. 2026) — plný primární text návrhu
  i odůvodnění k dispozici, korpus má k tématu jen obecný explainer
  `clanek-uhradova-vyhlaska` a výsledek dohodovacího řízení
  `clanek-dohodovaci-rizeni-2027-vysledek` (2. 7. 2026), ne obsah vyhlášky.
- **HOT (nový indikátor):** žádný.
- **WARM (revize):** `clanek-ockovani-v-lekarnach` (TZ MZ z 10. 9. — čeká na
  dostupnost primárních dat SÚKL); novely 258/2000 Sb. a 167/1998 Sb.
  (bez nové verze materiálu).
- **COLD:** ÚZIS, NZIP, ČSÚ, OECD, NÚKIB, ÚOHS, Registr smluv.
- `clanek-valorizace-statni-pojistenci-2027` **nevyžaduje dnes revizi** —
  stav tisku 235 je proti 11. 9. beze změny a článek ho popisuje správně.
