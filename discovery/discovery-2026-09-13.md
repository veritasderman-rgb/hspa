# Discovery report — 2026-09-13

Běh denní rutiny podle `PROMPT_DAILY_ROUTINE.md`, fáze 1. Okno rešerše:
**12. 9. – 13. 9. 2026** (poslední běh rutiny 12. 9.), u kanálů s delší
periodicitou kontrolováno zpět k 5. 9. Primární dokumenty byly staženy přímo
(`curl`, User-Agent `ZdraveCesko-HSPA/1.0`) a strojově rozbaleny, ne přečteny
přes shrnující WebFetch — u nálezu dne to platí bez výjimky.

## Nové indikátory / datasety

- **Eurostat — žádná nová vlna.** Oficiální RSS
  `api/dissemination/catalogue/rss/en/statistics-update.rss` staženo 13. 9. 2026,
  1 979 položek, feed pokrývá **6.–12. 9. 2026**. V celém okně je **8 položek
  `hlth_*`**, všechny z řady SHA11 (FS, HC, HCHF, HCHP, HF, HFFS, HP, HPHF)
  a všechny s jediným časovým razítkem **2026-09-09 23:00** — tedy tatáž vlna,
  kterou zachytil běh z 12. 9. Nic nového → COLD.
- **ÚZIS — aktuality** (`uzis.cz/index.php?pg=aktuality`): beze změny, poslední
  věcná položka zůstává **aid=8757 „Vysoké teploty a mortalita“ (14. 8. 2026)**.
  Žádná nová vlna NRPZS, NOR, NRH ani NRZP → NIC.
- **NZIP — datové zpravodajství** (`nzip.cz/modul/datove-zpravodajstvi`): beze
  změny proti 29. 8. → NIC.
- **ČSÚ — indexy spotřebitelských cen**: kanál dnes použit jako **ověřovací**,
  ne objevný (viz nález dne). Rychlá informace „Indexy spotřebitelských cen
  (inflace) — červen 2026“ stažena a strojově přečtena 13. 9. 2026; věta
  verbatim: *„Hladina bazického indexu spotřebitelských cen k základnímu období
  průměr roku 2025 byla v červnu 101,7 % (v květnu 102,0 %).“* Nezávisle tím
  potvrzena hodnota, se kterou počítá důvodová zpráva MF.
- **OECD**: kanál se ani dnes strojově ověřit nepodařilo, do routingu nevstupuje.
  Health at a Glance vychází typicky v listopadu — mimo okno.

## Nové legislativní normy / sněmovní tisky

- **[X] HOT — Nařízení vlády o vyměřovacím základu za státní pojištěnce pro rok
  2027 postoupilo z připomínkového řízení do fáze pro jednání vlády.**
  VeKLEP **KORNDWFEFC5X**, čj. předkladatele **MF-36463/2026/2901-8**, čj. OVA
  **691/26**, předkladatel **Ministerstvo financí**.
  - Nález přišel z kanálu Hlídače státu (`search_veklep_legislation`), a to až
    **po rozšíření dotazu o slovo „pojištění“** — předchozí běhy hledaly
    `zdravotnictví OR zdravotní OR léčiv` a tenhle materiál jim proto unikal
    (5 záznamů proti dnešním 13). **Všechny hodnoty níže pocházejí z primárních
    dokumentů staženého materiálu** z `odok.cz`, rozbalených lokálně
    (`word/document.xml`), ne z polí Hlídače.
  - **Co je nové:** proti stavu, který článek
    `clanek-valorizace-statni-pojistenci-2027` ověřil ke 4. 9. (jediná
    autorizovaná verze z 29. 7. 2026, datum poslední úpravy 20. 8. 2026),
    přibyly **dvě autorizované verze pro jednání vlády — 8. 9. a 9. 9. 2026**,
    **18 nových příloh** a především **zveřejněné vypořádání připomínek**
    (dokument datován **4. září 2026**, vypracoval Mgr. Jakub Ševčík). Stav
    materiálu je verbatim **„7 – zařazeno do evidence“**, datum schůze vlády
    **nevyplněno**.
  - **Zásadní zjištění — přepočet proběhl a nezměnil ani korunu.** Připomínka
    Úřadu vlády ČR (Kabinet vedoucího ÚV, Ing. Oldřich Körner) požadovala
    „vycházet nikoli z předběžných údajů, ale z dat ČSÚ o růstu reálné průměrné
    mzdy za druhé čtvrtletí 2026“. Vypořádání ji vede jako **„Akceptováno“**
    s příslibem verbatim: *„Výpočet tak bude na základě dat ČSÚ upraven
    v následném procesu před tím, než bude návrh nařízení vlády předložen
    vládě.“* **Strojový diff obou verzí důvodové zprávy (29. 7. → 9. 9.) vrací
    jediný změněný řádek** — z bodu 3) zmizela slova „na základě přeběžných
    dat“ (v originále skutečně s překlepem):
    - 29. 7.: „V posuzovaném období je **na základě přeběžných dat** podíl pro
      stanovení růstu reálné mzdy nižší než 1.“
    - 9. 9.: „V posuzovaném období je podíl pro stanovení růstu reálné mzdy
      nižší než 1.“
    - Rozdíl délky dokumentů je **přesně 26 znaků** = délka vypuštěné fráze
      včetně mezery. **Žádné jiné slovo se nezměnilo** — částky 16 450 Kč,
      2 221 Kč, 2,4 mld. Kč i 6,016 mil. pojištěnců jsou byte-identické.
  - **Druhé zásadní zjištění — předkladatel sám čeká, že nařízení nikdy nenabude
    účinnosti.** Předkládací zpráva (verze pro jednání vlády) verbatim:
    *„V současnosti je však v Poslanecké sněmovně, jako sněmovní tisk 235,
    předložen vládní návrh zákona, kterým se novelizuje zákon č. 592/1992 Sb.,
    pozastavující valorizaci vyměřovacího základu až pro rok 2029 s účinností
    od 1. ledna 2027. Bude-li tento vládní návrh zákona schválen, nebude se
    v těchto letech nařízení vlády o stanovení vyměřovacího základu vydávat.
    Lze předpokládat, že novela zákona č. 592/1992 Sb. bude schválena
    a vyhlášena do konce roku 2026 a nařízení by tak nevešlo v účinnost.“*
  - **Vypořádání zásadních připomínek** (dokument „Dokument obsahuje zásadní
    připomínky, ale žádná z nich není předmětem rozporu“):
    - **NRR** (otázka, zda platí zákonná, nebo mimořádná valorizace) →
      **„Vysvětleno“**: *„Vláda na svém usnesení trvá a momentálně ho realizuje
      prostřednictvím sněmovního tisku 235… Nicméně podle současného znění
      zákona… je vláda povinna stanovit výši vyměřovacího základu pro následující
      rok do 30. září. Z této povinnosti se nelze v současné době odchýlit.“*
    - **ČMKOS 2.1** (srovnat základ s minimální mzdou) → **„Změněno na
      doporučující / Neakceptováno“** — připomínka míří vůči zákonu, ne nařízení.
    - **ČMKOS 2.2** (dorovnat na slíbených 24 mld., tj. o 21,6 mld.) →
      **„Změněno na doporučující / Neakceptováno“**, týmž odůvodněním.
    - **ÚOOÚ** (formulace v bodě 8 důvodové zprávy) → **„Neakceptováno“**.
  - **Počty připomínek** (předkládací zpráva verbatim): *„Připomínkové řízení
    probíhalo od 29. července do 19. srpna 2027“* — v originále překlep v roce,
    věcně 2026 (pole `terminPripominekDoData` = 2026-08-19); *„K materiálu bylo
    uplatněno celkem 6 připomínek od 5 připomínkových míst, z toho 4 připomínky
    byly označeny jako zásadní. Všechny připomínky byly vypořádány a materiál
    se předkládá bez rozporu.“* Sedí to na členění, které článek drží od 25. 8.
    (5 míst s připomínkou = NRR, ČMKOS, ÚV-Kabinet, ÚV-Odbor kompatibility,
    ÚOOÚ; 4 „zásadní“ = NRR 1.1, ČMKOS 2.1, ČMKOS 2.2 a připomínka ÚV, kterou
    její vlastní text označuje za zásadní, byť je podána jako doporučující).
  - **Kontrolní přepočty** (všechny sedí): 16 450 − 16 206 = **244 Kč** (číslo,
    které uvádí ČMKOS); 18 362 − 16 450 = **1 912 Kč** (číslo, které uvádí NRR);
    2 221 − 2 188 = **33 Kč**; 12 × 6,016 mil. × 33 = **2,38 mld. ≈ 2,4 mld.**;
    16 206 × 1,015 = **16 449,09 ≈ 16 450**; 16 450 × 0,135 = **2 220,75 ≈ 2 221**.
  - **Vláda materiál dosud neprojednala.** `vlada.gov.cz` vede jako poslední
    položku **„Výsledky jednání vlády 7. září 2026“** (staženo 13. 9. 2026) —
    tedy o den dřív, než byla autorizována první verze pro jednání vlády.
  → **HOT, spouštěč dne.**
  <https://odok.cz/portal/veklep/material/KORNDWFEFC5X/>
- **PSP ČR, sněmovní tisk 235** (mimořádná valorizace). Staženo dnes jako surové
  HTML v kódování windows-1250 z `psp.cz/sqw/historie.sqw?o=10&t=235`, hlavička
  verbatim **„Stav projednávání ke dni: 13. září 2026“**. Posledním záznamem je
  dál blok garančního výboru (usnesení 4. 9. 2026, tisk 235/1, doporučuje
  schválit; další projednávání možné od 7. 9. 2026). **Proti 12. 9. beze změny**
  — druhé čtení neproběhlo.
- **PSP ČR, přehled schůzí 10. volebního období** (`psp.cz/sqw/ischuze.sqw?o=10`,
  staženo 13. 9. 2026): **drobný posun proti 11. 9.** — **29. schůze je nově
  vedena jako uzavřený interval „25. srpna - 11. září 2026“** a poznámku
  „Přerušeno“ už nenese; ta zbývá jen u **3., 6. a 27.** schůze (tři výskyty
  v dokumentu). **Nová schůze po 30. vypsaná není** → tisk 235 nemá kde být
  projednán. (Článek k 11. 9. uváděl „Přerušeno“ u 3., 6., 27. a 29. — k tomu
  dni to platilo; dnešek to mění.)
- **VeKLEP, další pohyb v gesci MZ**: novela zákona č. 258/2000 Sb. o ochraně
  veřejného zdraví (PID ALBSDUUFQ5OR) — poslední úprava **10. 9. 2026**, ale
  autorizace zůstává **11. 6. 2026**, žádná nová verze → WARM, bez akce.
  Úhradová vyhláška 2027 (ALBSDXRFYLM6, nález z 12. 9.): autorizace i poslední
  úprava dál **9. 9. 2026**, žádná nová verze → dnes bez akce.
- **Sbírka zákonů**: `zakonyprolidi.cz/cs/aktualne` vrací z běhového prostředí
  **HTTP 404** (12. 9. to bylo 403). Kanál dnes **neověřen**, žádné tvrzení
  z něj nevzniká.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **MZ ČR — tiskové zprávy** (`mzd.gov.cz/tiskove-centrum/tiskove-zpravy/`,
  staženo 13. 9. 2026): poslední položka je **11. 9. 2026 „Očkování blíž lidem“**,
  tedy beze změny proti běhu z 12. 9. **Nic nového v okně** → COLD.
- **MZ ČR — Věstník**: `mzd.gov.cz/category/uredni-deska/vestnik-mz-cr/` vrací
  **HTTP 404**. Kanál dnes **neověřen**.
- **VZP — dokumenty**: stránka `vzp.cz/o-nas/dokumenty` je rozcestník bez
  datovaných položek; žádná nová výroční zpráva ani ZPP v okně → NIC.
- **WHO Europe — news room**: nejnovější položka je **10. September 2026**,
  v okně 11.–13. 9. nic → COLD.
- **SÚKL — registr výpadků léčiv**: `sukl.gov.cz/farmaceuticky-trh/registr-vypadku-leciv/`
  vrací **HTTP 404**. Kanál dnes **neověřen**, žádné tvrzení z něj nevzniká.
- **NÚKIB**: nejnovější aktualita **11. 9. 2026** (CYBER_CON 2026), bez vazby na
  zdravotnictví či NIS2 ve zdravotnictví → COLD.

## Recenzovaná literatura (PubMed / Consensus)

Oba konektory dostupné.

- `PubMed` → `search_articles` s afiliačním filtrem na ČR, `datetype: edat`,
  `date_from 2026/09/11`, `sort: pub_date`, 20 vrácených záznamů. Metadata
  prověřena u pěti (PMID 42586909, 42413296, 42288274, 42672787, 41607075):
  jde o mezinárodní klinické a laboratorní práce se spoluautorstvím českých
  pracovišť — fáze 3 filgotinib u axSpA (Ann Rheum Dis,
  [DOI](https://doi.org/10.1016/j.ard.2026.06.024)), chirální kokrystaly
  (Talanta, [DOI](https://doi.org/10.1016/j.talanta.2026.130238)), přehled
  schémat externího hodnocení kvality FIT testů se spoluautorem P. Kocnou z VFN
  a 1. LF UK (Clin Chim Acta,
  [DOI](https://doi.org/10.1016/j.cca.2026.121180)), kardiomarkery u preeklampsie
  (Hypertens Pregnancy, [DOI](https://doi.org/10.1080/10641955.2026.2708186))
  a CMV u PJP (HIV Res Clin Pract,
  [DOI](https://doi.org/10.1080/25787489.2026.2621466)). Podle PubMed jde bez
  výjimky o typ *Journal Article*, žádná retrakce ani erratum.
  **Žádná health-services práce k financování, úhradám ani k tématu dne.**
  (Práce o FIT EQAS je tematicky blízká kolorektálnímu screeningu, ne dnešnímu
  tématu; zapsána jako stopa pro noční rutinu.)
- `Consensus` dnes **nevolán, a to záměrně**: dnešní revize netvrdí nic
  o účinnosti, riziku ani dopadu zdravotní intervence — jde o popis obsahu
  právního předpisu, jeho vypořádání připomínek a stavu legislativního procesu.
  Rutina předepisuje Consensus ke kauzám, „u nichž článek bude tvrdit něco
  o účinnosti, riziku nebo dopadu“; dekorativní dotaz by do registru přidal
  nález bez vazby na tvrzení.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

- **VeKLEP**: dotaz `zdravotnictví OR zdravotní OR léčiv OR pojištění`,
  `from_date 2026-09-06`, řazeno `PosledniZmena desc`, spuštěn 13. 9. 2026 —
  **13 záznamů**. Hlavní nález dne je mezi nimi (KORNDWFEFC5X, viz výše).
  **Metodická poznámka:** rozšíření dotazu o „pojištění“ odhalilo materiál, který
  předchozí běhy s užším dotazem míjely. Doporučuji držet rozšířený dotaz i dál.
- **Registr smluv**: dotaz klíčová slova „zdravotnické nemocnice“,
  `from_date 2026-09-10`, `minimal_price 50 000 000`, řazeno podle hodnoty —
  **1 záznam**: **Fakultní nemocnice Brno** (IČO 65269705), předmět
  **„Rekonstrukce KDIN“**, hodnota **299 838 000 Kč**, podepsáno **9. 9. 2026**,
  dodavatelé **UNISTAV CONSTRUCTION a.s.** (IČO 03902447) a **IDPS s.r.o.**
  (IČO 47537205), kategorie Stavebnictví, cena uvedena (neskrytá).
  Jde o stavební zakázku bez znaku mimořádnosti v datech; **žádný závěr o motivech
  ani o zadávacím postupu se z toho nevyvozuje** → bez akce, veden jako řádek
  discovery. <https://www.hlidacstatu.cz/>
- **ÚOHS**: dotaz `nemocnice OR zdravotní OR VZP OR zdravotnictví OR léčiv`,
  `from_date 2026-09-05` — **0 rozhodnutí** → nic nového.
- **Ověřovna Barometru**: v okně nezachycen žádný konkrétní kvantitativní výrok
  politika o zdravotnictví, který by šlo konfrontovat s indikátory. Žádný
  kandidát. (Vypořádání připomínek obsahuje formulace předkladatele, ne výrok
  politika — do Ověřovny nepatří.)

## Doporučení pro routing fáze

- **HOT (aktuální dění):** nařízení vlády o vyměřovacím základu 2027
  (KORNDWFEFC5X) postoupilo do fáze pro jednání vlády; vypořádání připomínek
  zveřejněno; přepočet na finálních datech ČSÚ proběhl a částku 16 450 Kč
  nezměnil; předkladatel v předkládací zprávě sám píše, že nařízení
  pravděpodobně nenabude účinnosti.
- **HOT (nový indikátor):** žádný.
- **WARM (revize):** `clanek-valorizace-statni-pojistenci-2027` — **tohle je
  přesně ten milník, který si článek sám vytyčil** v sekci „Co s tím“
  („vypořádání zásadních připomínek NRR a ČMKOS, které musí MF zveřejnit
  v eKLEP“) a který k 4. 9. ještě nenastal. Navíc dnes vyprchala jedna dílčí
  formulace článku (29. schůze už nenese „Přerušeno“).
- **COLD:** ÚZIS, NZIP, MZ ČR (TZ), Eurostat, WHO, NÚKIB, ÚOHS, VZP.
- **NEOVĚŘENO dnes** (a proto bez jakéhokoli tvrzení): Věstník MZ (404),
  SÚKL registr výpadků (404), Sbírka zákonů / zakonyprolidi (404), OECD.
- `clanek-uhradova-vyhlaska-2027` (nález z 12. 9.) **nevyžaduje dnes revizi** —
  materiál ALBSDXRFYLM6 je beze změny a lhůta připomínek běží do 23. 9.
