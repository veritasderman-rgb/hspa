# Odchytávač pozměňovacích návrhů mimo předmět zákona — plán a metodika

Stav 19. 11. 2026: část 1 (odchytávač) je postavená, běží v `prilepky.yml` a má data za 10. volební období. Část 2 (rané signály)
je návrh a čeká na rozhodnutí vydavatele.

## 1. K čemu to je

Legislativní radar (`data/legislativa.json`) sleduje předpis od připomínkového řízení a končí fází
„v Parlamentu“. Jenže právě tam se zákon ještě mění, a to bez připomínek ministerstev, pojišťoven
a odborné veřejnosti: pozměňovacím návrhem poslance. Odchytávač hlídá tři situace:

| Situace | Signál v datech | Úroveň |
|---|---|---|
| Zdravotnický zákon se mění v tisku, který se zdravotnictví netýkal | `zdravotnicky_zakon_v_cizim_tisku` | vysoká |
| Do zdravotnického tisku přibude zákon z jiné oblasti | `cizi_zakon_ve_zdravotnickem_tisku` | vysoká |
| Zdravotnický tisk začne měnit další zdravotnický zákon | `jiny_zdravotnicky_zakon` | střední |
| Zdravotnický návrh nepředložila vláda (bez připomínkového řízení) | `bez_pripominkoveho_rizeni` | nízká |
| Navrženo schválit už v prvním čtení (§ 90 odst. 2) | `navrh_schvalit_v_prvnim_cteni` | nízká |

**Co nález říká a co ne.** Říká: tento pozměňovací návrh mění zákon č. X, který původní návrh
neměnil, tady je doslovná citace a odkaz na dokument Sněmovny. Neříká, že jde o protiústavní
přílepek; to posuzuje Ústavní soud podle věcné souvislosti (nález Pl. ÚS 77/06), stroj ne. Slovo
„přílepek“ proto v datech ani na webu jako označení nálezu není a validátor ho odmítne.

## 2. Co zjistila sonda (18. 11. 2026)

`ingest/probe/psp-probe.js`, workflow `psp-probe.yml`, testovací případ tisk 235 a sněmovní
dokumenty 1796 a 1813.

- **`www.psp.cz` z prostředí agenta nejde** (spojení se resetuje při TLS; síť prostředí je přitom
  neomezená). Z runneru GitHub Actions jde bez potíží. Vše proto běží v Actions, stejně jako sonda PPO.
- **Otevřená data stačí na metadata.** `tisky.zip` (`tisky.unl`, 24 sloupců: číslo tisku, druh,
  typ předkladatele, název, úplný název, příznak § 90/2) a `sd.zip` (`sd_dokument.unl`: číslo
  dokumentu, číslo tisku, předkladatel, čas podání). Windows-1250, oddělovač `|`, bez hlavičky.
  Pořadí sloupců je zapsané v `ingest/lib/psp-opendata.js`.
- **Text pozměňovacího návrhu v otevřených datech není.** Je jen jako `.docx` a `.pdf` na
  `/sqw/text/orig2.sqw?idd=…`, odkaz je na stránce dokumentu `/sqw/sd.sqw?cd=…&o=…`.
- **`robots.txt` Sněmovny cestu `/sqw/text/orig2.sqw` robotům zakazuje.** Vydavatel 18. 11. 2026
  rozhodl stahovat cíleně: jen `.docx` pozměňovacích návrhů a tisků, které odchytávač potřebuje,
  každý jednou, jeden požadavek za 3 sekundy, s podepsaným User-Agentem. Text se neukládá.
  Stejné soubory čte i cosepece.cz.
- **psp.cz je z runnerů pomalý a nestálý.** Při tempu 1 požadavek/s začal po několika stech
  požadavcích zahazovat nová spojení (connect timeout, HTTP 408); první průchod obdobím proto
  vypršel. Fetcher teď čeká 3 s mezi požadavky, po odmítnutí 20 s, má časový rozpočet běhu
  (`--minutes`) a nepřečtené dokumenty dočte příští běh. První průchod obdobím se pouští ručně
  z pracovní větve (`minutes=200`), která si mezivýsledky ukládá sama.
- **První průchod 10. volebním obdobím (19. 11. 2026):** přečteno 752 ze 759 písemných pozměňovacích
  návrhů (1 jen v PDF, 6 se opakovaně nepodařilo stáhnout a zkouší je další běhy). Zdravotnický zákon
  mimo původní předmět mění čtyři: sněmovní dokumenty 1798 a 1928 (tisk 115) a 1799 (tisk 173) vkládají
  do novel trestního zákoníku změnu § 10 zákona č. 258/2000 Sb., dokument 1813 (tisk 235) vkládá do
  novely zákona o pojistném změny zákonů č. 551/1991 Sb. a č. 280/1992 Sb.
- **Co první data opravila v pravidlech:** zdravotnický tisk se určuje podle hlavního předmětu (ne
  podle jakéhokoli zákona ve výčtu souhrnné novely), zákon zmíněný na konci vkládaného znění není
  novelizace, „rostlinolékařská péče“ ani „zdravotní postižení“ nejsou zdravotnictví, a bez známého
  celého předmětu tisku se nález nevydává. Každé má regresní test v `tests/prilepky.test.js`.
- **Testovací případ sedí.** Dokument 1813 k tisku 235 (novela zákona č. 592/1992 Sb.) vkládá nové
  části měnící zákony č. 551/1991 Sb. a č. 280/1992 Sb. Dokument 1796 mění jen částku v původním
  návrhu a nálezem není.

## 3. Jak to funguje

```
prilepky.yml (denně 03:23 UTC, GitHub Actions)
  ↓ ingest/fetchers/psp_prilepky.js
tisky.zip + sd.zip  →  návrhy zákonů a písemné pozměňovací návrhy volebního období
  ↓ jen NOVÉ dokumenty (ingest/data/prilepky-stav.json si pamatuje přečtené)
sd.sqw → .docx → text → které zákony návrh novelizuje (ingest/lib/prilepky.js)
  ↓ porovnání s předmětem tisku + registr ingest/mapping/zdravotnicke-zakony.json
data/prilepky.json  →  PR (chore/prilepky)  →  legislativa.html, sekce 3 (src/prilepky.js)
```

- **Které zákony text mění:** hledá se hlavička novelizace („Zákon č. X Sb., …, se mění takto“,
  „V zákoně č. X Sb. … se … zrušují“). Zmínka o zákoně ani výčet novel („ve znění zákona č. …“) se
  nepočítá.
- **Předmět tisku:** zákony z úplného názvu. Když název výčet nedává („a další související
  zákony“, nový zákon „a o změně některých zákonů“), stáhne se text návrhu a předmět se vezme z něj
  (bez důvodové zprávy).
- **Zdravotnický tisk:** mění zákon z registru, předkládá ho ministr zdravotnictví, nebo má
  zdravotnictví v názvu.
- **Bez jazykového modelu.** Výsledek je opakovatelný a každý nález jde ověřit jedním kliknutím.
- **Stav:** `ingest/data/prilepky-stav.json` drží u každého přečteného dokumentu jen rozbor (čísla
  měněných zákonů s citací), ne text. Díky němu další běh stahuje jen nové dokumenty.

Příkazy: `npm run data:prilepky` (jen z Actions), `npm run validate:prilepky`, testy
`tests/prilepky.test.js`.

## 4. Co odchytávač nevidí

- **Návrhy přednesené ústně** ve druhém čtení a **návrhy výborů** (jdou jako tisk `N/1`, `N/2`).
  Komplexní pozměňovací návrh garančního výboru je přitom častá cesta velkých změn. Další krok:
  číst i podtisky s usnesením výborů.
- **Dokumenty jen v PDF** (bez `.docx`). Dataset jejich počet uvádí v `pokryti.pn_bez_textu`.
- **Věcně nesouvisející změnu téhož zákona.** Když pozměňovací návrh do novely zákona č. 48/1997 Sb.
  vloží úplně jiné téma z téhož zákona, čísla zákonů se neliší a stroj to nepozná.
- **Senát.** Senátní pozměňovací návrhy zatím nečteme.
- **Kdo za návrhem stojí.** Autor je ten, kdo dokument podal; motiv ani původ textu z dat neplyne
  a web o nich nespekuluje.

## 5. Vztah k cosepece.cz a snemovna.hlidacstatu.cz

Oba weby sledují celou Sněmovnu a hodnotí postup skórem. Tady je jen zdravotnický výřez napojený na
radar, indikátory a články, bez skóre a bez jazykového modelu. Sekce na ně odkazuje. Jejich data
nepřebíráme (sekundární zdroj); slouží jako křížová kontrola při revizi PR.

## 6. Provoz a třída změn

- Workflow otevírá PR `chore/prilepky` jen při věcné změně nálezů. Data o jmenovaných osobách
  (autor pozměňovacího návrhu) a nová sekce webu = **třída C**, merguje vydavatel.
- Kontrola při revizi PR: otevřít odkaz na psp.cz, ověřit citaci a to, že zákon v původním návrhu
  opravdu nebyl.
- Nový zdravotnický zákon = jeden řádek v `ingest/mapping/zdravotnicke-zakony.json`.
- Nové volební období: `--obdobi 11` (stav se založí znovu).

## 7. Část 2 — rané signály („co se ví dřív, než je to veřejné“) · návrh

**Co nestavět:** sběr z uzavřených skupin a fór (facebookové skupiny lékařů, členské sekce komor).
Porušuje podmínky služeb, jde o osobní údaje zdravotníků a výsledek nejde publikovat (GOVERNANCE:
nic bez primárního zdroje).

**Co postavit:** registr stop. Většina věcí je veřejně vidět dřív, než se o nich píše:

| Zdroj | Co prozradí | Jak číst |
|---|---|---|
| Registr smluv (Hlídač státu) | objednávky MZ a pojišťoven na právní analýzy a „zpracování návrhu novely“ | konektor `hlidac_statu` v rutině |
| VeKLEP — připomínky | kdo co prosazuje ještě před vládou | konektor `hlidac_statu` |
| Výbor pro zdravotnictví | pozvánky, zápisy, podvýbory | psp.cz přes Actions |
| Program vlády a Legislativní rady vlády | co jde na řadu | odok.cz |
| Stanoviska komor, asociací, Svazu pojišťoven, pacientských organizací | reakce na neveřejné verze | weby organizací |
| Veřejné účty členů zdravotního výboru | ohlášené pozměňovací návrhy | X, Bluesky |
| Schránka ombudsmana | tipy od lidí z oboru | už existuje |

Stopa se zapíše do **neveřejného** registru (ne do veřejného repa) se stavem
`stopa → potvrzeno primárním dokumentem → smí do článku`. Zvěst sama se nikdy nepublikuje. U každého
zdroje se počítá úspěšnost. Zavedení znamená změnu `PROMPT_ROUTINE.md` (blok D) a rozhodnutí, kde
registr leží — obojí třída C.

## 8. Další kroky

1. Podtisky s usnesením výborů (komplexní pozměňovací návrhy).
2. Propojit nález s položkou radaru (`legislativa.items[]`) přes PID eKLEP z `tisk_eklep.unl`.
3. Upozornění do rutiny: nový nález vysoké úrovně = kandidát na článek.
4. Zpětný test na 9. volebním období (`--obdobi 9`) jako kalibrace registru zákonů.
5. Část 2 po rozhodnutí vydavatele.
