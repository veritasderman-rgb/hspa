# Discovery report — 2026-09-02

Okno rešerše: **1. 9. – 2. 9. 2026** (poslední běh rutiny 1. 9., okno je proto
jednodenní). Všechny kanály ověřeny přímým dotazem dnes, 2. 9. 2026.

## Nové indikátory / datasety

- **ÚZIS aktuality** (uzis.cz/index.php?pg=aktuality, ověřeno dnes): beze změny
  — nejnovější položka je dál **aid=8757 „Vysoké teploty a mortalita"** (14. 8.),
  pod ní nabídky zaměstnání z 3.–10. 8. a „Tuberkulóza v ČR v roce 2025"
  (aid=8753) → NIC.
- **NZIP datové zpravodajství** (nzip.cz/modul/datove-zpravodajstvi, ověřeno
  dnes): tytéž čtyři datové novinky jako 29. 8. – 1. 9. (vysoké teploty
  a mortalita, laboratorní vyšetření, rakovina plic, stomatologická péče);
  katalog hlásí 208 otevřených datových sad / 225 datových souhrnů /
  102 vizualizací → NIC.
- **Eurostat** (oficiální RSS `api/dissemination/catalogue/rss/en/
  statistics-update.rss`, staženo dnes: 1 684 položek, feed pokrývá
  26. 8. – 1. 9.): **žádný `hlth_*` dataset** v celém okně → NIC.
- **OECD**: poslední vlna Health at a Glance zůstává **2025** (13. 11. 2025),
  žádná zářijová publikace. Pozn.: oecd.org dnes vrací agentovi Cloudflare 403,
  ověřeno proto přes vyhledávání nad doménou oecd.org (katalog série
  Health at a Glance) → NIC.

## Nové legislativní normy / sněmovní tisky

- **PSP tisk 235** (novela zákona o pojistném — mimořádná valorizace platby za
  státní pojištěnce), ověřeno na psp.cz dnes; stránka sama uvádí
  „Stav projednávání ke dni: **2. září 2026**": **beze změny** — vláda
  předložila 23. 6. 2026, 1. čtení 8. 7. 2026 (Sněmovna nesouhlasila
  se zrychleným projednáním, přikázala výborům), garanční **Výbor pro
  zdravotnictví návrh dosud neprojednal**, projednání zmíněno na pozvánce na
  jednání **č. 10 (2. září 2026 — tedy dnes)**, další projednávání možné
  od 7. 9., tisk navržen na pořad 30. schůze od 8. 9. → **WARM** (revize
  `valorizace-statni-pojistenci-2027` má smysl až po zveřejnění usnesení
  výboru, které dnes večer ještě není).
- **Sbírka zákonů**: kanál **dnes poprvé přímo ověřen** — zakonyprolidi.cz vrací
  agentovi trvale 403 (Cloudflare) a e-sbirka.cz je SPA bez SSR, ale REST
  backend e-Sbírky odpovídá:
  `POST https://e-sbirka.gov.cz/sbr-cache/chronologicke-rejstriky/castky-po-mesicich`
  s tělem `{"rok":2026,"kodSbirky":"SB"}`. Ročník 2026 má k dnešku
  **157 dokumentů**, poslední je **157/2026 Sb.** (31. 8., novela jednacího
  řádu PS). **V okně 1.–2. 9. nevyhlášen žádný nový předpis.** Poslední
  zdravotnické normy zůstávají **153/2026 Sb.** (vyhláška o přístupových
  údajích do IS Administrace vzdělávání ve zdravotnictví) a **154/2026 Sb.**
  (novela vyhlášky č. 391/2013 Sb., o zdravotní způsobilosti k tělesné výchově
  a sportu), obě vyhlášené 27. 8. → NIC. (Postup zapsat do rutiny — dva
  předchozí běhy hlásily tento kanál jako neprůchozí.)
- **MZ Věstník**: ve feedu MZ (WP API, 25 nejnovějších příspěvků) žádné nové
  číslo → beze změny.

## Aktuální dění / kauzy s implikací pro zdravotnictví

- **MZ ČR** (WP API `mzd.gov.cz/wp-json/wp/v2/posts`, ověřeno dnes):
  **nic nového po 31. 8.** Nejnovější tři položky jsou dál včerejší nálezy
  (pilotní provoz akutních psychiatrických ambulancí 16:31, Výzva k programu
  APA II 12:31, upozornění na stipendia VZP 8:38) → NIC.
- **SÚKL** (sukl.gov.cz WP API, ověřeno dnes): jedna nová položka —
  **„Farmakoterapeutické informace 9/2026"** (1. 9., 7:00). Jde o rutinní
  měsíční odborný bulletin pro předepisující lékaře (PDF 233 kB + seznam
  literatury), bez systémových dat → NIC (rutinní publikace).
- **NÚKIB** (nukib.gov.cz/cs/infoservis/aktuality, ověřeno dnes): jedna nová
  položka z **1. 9. — „NÚKIB uspořádá Konferenci Festivalu bezpečného
  internetu 2026"**, pozvánka bez vazby na zdravotnictví. Poslední věcný
  výstup zůstává Zpráva o stavu kybernetické bezpečnosti ČR za rok 2025
  (21. 8.) → NIC.
- **WHO Europe** (who.int/europe/news-room, ověřeno dnes): dvě nové položky
  z **1. 9.** — „WHO in Ukraine: new representative" (personálie) a
  „Progress on AI in health should be determined by strength of governance,
  WHO forum urges" (výstup fóra o správě AI ve zdravotnictví, bez dat za ČR
  a bez guideline dokumentu) → NIC pro dnešní routing, poznamenáno pro
  případný explainer o správě AI ve zdravotnictví.
- **ČSÚ**: kanál dnes **jen částečně ověřen** — `csu.gov.cz/rss/aktuality`
  i starý `czso.cz/csu/czso/aktualnitiskovezpravy` vracejí 404 (redesign webu),
  přehled Rychlých informací se načetl bez datované položky. Zdravotní ani
  demografická novinka nezaznamenána ani jinými kanály → NIC, endpoint
  dohledat v příštím běhu.

## Aktualizace existujících dat (vlna)

- Žádná nová datová vlna v okně 1. – 2. 9.

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (dotaz 2. 9. 2026)

- **VeKLEP** (filtr od 25. 8., řazeno `PosledniZmena desc`): **30 materiálů,
  z toho žádný v gesci MZ ČR.** Nejblíž zdravotnictví jsou dál dva materiály
  **MPSV** k evropským průkazům pro osoby se zdravotním postižením (poslední
  úprava 25. a 26. 8.) — sociální dávková agenda, ne zdravotní služby. Nové
  přírůstky v okně: trestní zákoník (MSp, 31. 8.), státní rozpočet na rok 2027
  (MF, 31. 8.), novela školského zákona (MŠMT, poslední úprava 1. 9.),
  amatérská radiokomunikační služba (1. 9.). Zdravotnicky relevantní jen
  okrajově: novela vyhlášky č. 11/2023 Sb., o **zdravotní způsobilosti ve
  vnitrozemské plavbě** (poslední úprava 31. 8.) → NIC.
- **Registr smluv** (fulltext `nemocnice`, hodnota nad 15 mil. Kč, zveřejněno
  od 1. 9.): **1 záznam** — *Smlouva o dílo*, podepsaná **1. 9. 2026**,
  **32 063 729,86 Kč**, objednatel **Nemocnice Břeclav, příspěvková
  organizace** (IČO 00390780), dodavatel **Hrušecká stavební spol. s r.o.**
  (IČO 25585142), hlidacstatu.cz ID smlouvy 39342393. Běžná stavební zakázka
  krajské nemocnice, bez skryté ceny a bez příznaku vážného nedostatku →
  sledovat, nepsat.
- **ÚOHS** (fulltext `nemocnice OR zdravotní OR zdravotnictví OR pojišťovna`,
  právní moc od 1. 8. 2026): **0 výsledků** → žádné nové rozhodnutí.

## Ověřovna Barometru — kandidáti

- Žádný nový kvantitativní výrok politika o zdravotnictví v okně.

## Doporučení pro routing fázi

- **HOT: žádný.** Všech čtrnáct kanálů powerlistu i tři kanály Hlídače státu
  v okně 1. – 2. 9. neohlásily nic, o co by se dal opřít reaktivní článek.
- **WARM:** tisk 235 — garanční Výbor pro zdravotnictví jedná **dnes**
  (jednání č. 10); usnesení zatím nezveřejněno. Revize
  `valorizace-statni-pojistenci-2027` až po jeho zveřejnění, tedy nejdřív
  zítra.
- **COLD → EVERGREEN:** evergreen backlog má dvě položky se `status: ready`:
  `npo-zdravotnictvi-bilance` (priorita **14**) a `centrova-leciva-37-miliard`
  (priorita 16). Položka s prioritou 14 má navíc **vlastní časový spouštěč** —
  její poznámka výslovně říká „psát až po 31. 8. 2026, kdy bude znám výsledek";
  unijní lhůta RRF pro splnění milníků a cílů (čl. 18 odst. 4 písm. i) nařízení
  (EU) 2021/241) uplynula **předevčírem**. Doporučení: **EVERGREEN-WRITE
  `npo-zdravotnictvi-bilance`**.
- **Poznámka k týdenní kvótě:** týden po–ne začal 31. 8., dosud 2 nové články
  (31. 8. `nemocnicni-ambulance`, 1. 9. `akutni-psychiatricke-ambulance`) →
  **2/3**. Podle kadenční pojistky se při < 3 článcích za týden upřednostní
  EVERGREEN-WRITE i před dostupným fallback auditem.
