# Discovery report — 2026-09-03

Běh: čtvrtek 3. 9. 2026. Procházen powerlist primárních zdrojů (fáze 1 denní rutiny).

## Nové indikátory / datasety

- [ ] Žádný nový dataset ani nová vlna otevřených dat. NZIP dataset 1773 („Nově
  diagnostikované novotvary — incidence v krajích") má časové pokrytí do
  31. 12. 2024, tedy beze změny proti předchozím běhům; publikován jen jako XLSX
  (36,6 MB), bez CSV/API.

## Nové legislativní normy / sněmovní tisky

- Žádný nový nález. `psp.cz/sqw/historie.sqw` vrátil prázdný výsledek
  („Sněmovní tisk nebyl nalezen"); `zakonyprolidi.cz/cs/aktualne` odpovědělo
  HTTP 403 (blokace robotů), nelze z tohoto běhu ověřit — pro dnešní routing
  bez dopadu, protože zvolená větev na legislativě nestojí.

## Aktuální dění / kauzy s implikací pro zdravotnictví

**HOT — 1. 9. 2026, MZ ČR: „Česko patří mezi evropské průkopníky screeningu
rakoviny prostaty. První výsledky programu publikoval prestižní evropský odborný
časopis"**
<https://mzd.gov.cz/tiskove-centrum-mz/cesko-patri-mezi-evropske-prukopniky-screeningu-rakoviny-prostaty-prvni-vysledky-programu-publikoval-prestizni-evropsky-odborny-casopis/>

Tisková zpráva oznamuje publikaci, kterou korpus **už zpracoval**
(clanek-prostata-screening-pilot.html, 18. 8. 2026 — Eur Urol Open Sci
2026;91:41–48, PMID 42564931). Zpráva ale **nad rámec studie** uvádí průběžná
čísla za **první dva roky** programu, která ve studii (data za rok 2024) nejsou:

| Údaj (verbatim z TZ) | Hodnota |
|---|---|
| „Za první dva roky programu již bylo osloveno více než 310 tisíc mužů" | > 310 000 |
| „(u více než 307 tisíc je známa hodnota PSA)" | > 307 000 |
| „podíl mužů se zvýšenou hodnotou PSA dosahuje 8,7 % (více než 26,5 tisíce mužů)" | 8,7 % / > 26 500 |
| „v roce 2025 již přesáhlo hodnotu 57,0 %" (pokrytí PSA testováním, muži 50–69) | > 57,0 % |
| „v čase před zahájením programu se … pohybovalo na úrovni 45–47 %" | 45–47 % |
| „ochota oslovených mužů k účasti … dosahuje 99,1 %" | 99,1 % |
| „Průběžné výsledky programu dokládají dosavadní záchyt 2 079 karcinomů prostaty" | 2 079 |
| „Ročně v ČR onemocní rakovinou prostaty více než 10 000 mužů" | > 10 000 |
| „Roční mortalita … činí téměř 1 500 úmrtí" | ≈ 1 500 |

→ **rozpor s korpusem**: článek i starší aktualita ÚZIS (23. 11. 2023, aid=8639,
„okolo 8 000 mužů" / „přibližně 1 400 mužů ročně") pracují s nižší incidencí;
NOR za rok 2018 uvádí 7 938 nových případů a 1 372 úmrtí (ÚZIS aktualita
8. 9. 2021, aid=8521). Rozpor je nutné v článku vyřešit explicitně, ne přepsat.

**WARM — 2. 9. 2026, MZ ČR: „Jeden kontakt, méně čekání, rychlejší cesta
k léčbě. Koordinátoři mění péči o onkologické pacienty"**
<https://mzd.gov.cz/tiskove-centrum-mz/jeden-kontakt-mene-cekani-rychlejsi-cesta-k-lecbe-koordinatori-meni-peci-o-onkologicke-pacienty/>

Implementační data k signálnímu výkonu onkologického koordinátora (140
vyškolených koordinátorů na FBMI ČVUT, 250 Kč za intervenci, povinnost min.
1 koordinátora na KOC od 2026, tři typy koordinátora, nově Asociace
zdravotnických koordinátorů). Uvádí i silné systémové číslo — „přes 60 %
pacientů s karcinomem plic nezahájí léčbu do 8 týdnů od CT". Korpus má
clanek-onkologicky-koordinator-2026.html (17. 5. 2026), který popisuje zavedení
výkonu, ne jeho první rok. **Kandidát na ARTICLE-REVISE nebo samostatný text
v dalším běhu** — číslo o karcinomu plic vyžaduje dohledání primárního podkladu
(NOR / indiko.cz), TZ samotná zdroj neuvádí.

**COLD — 3. 9. 2026: brífink premiéra a ministra k nové generaci EZKarty.**
Zachyceno jen v sekundárním zdroji (kurzy.cz). Na `mzd.gov.cz/vsechny-novinky/`
ani v tiskových zprávách k 3. 9. 2026 **žádná odpovídající TZ zveřejněna
nebyla** → bez primárního zdroje se dnes nezpracovává. Sledovat v dalším běhu.

## Aktualizace existujících dat (vlna)

- ÚZIS aktuality: poslední položka 14. 8. 2026 („Vysoké teploty a mortalita"),
  jinak jen personální inzeráty (10. 8., 7. 8., 3. 8.). **Žádná nová datová vlna.**
- OECD / Eurostat / WHO: bez nové vlny relevantní pro kontrakt (HAG vychází
  typicky v listopadu).

## Hlídač státu — VeKLEP / Registr smluv / ÚOHS (posledních 7 dní)

- VeKLEP: dotaz `search_veklep_legislation("zdravotnictví")` vrátil 1 884
  záznamů, ale bez řazení podle data — mezi vrácenými výsledky **žádný materiál
  s `datumPosledniUpravy` v posledních 7 dnech** (nejnovější z vrácené sady:
  KORND8QB4ERJ, poslední úprava 5. 11. 2024). Kanál dnes bez nálezu.
- Registr smluv: nedotazováno (dnešní routing míří na revizi datového článku,
  ne na peníze) — přesouvá se do dalšího běhu.
- ÚOHS: nedotazováno, tamtéž.

## Zdroje, které v tomto běhu nebyly dostupné (transparentně)

| Zdroj | Stav |
|---|---|
| `nsc.uzis.cz` (Národní screeningové centrum, stránka programu) | HTTP 503 / connection reset — nedostupné z běhového prostředí |
| `prostascreening.cz` (oficiální web programu) | connection reset — nedostupné |
| `sukl.cz/aktuality` | HTTP 503 |
| `zakonyprolidi.cz/cs/aktualne` | HTTP 403 |
| `svod.cz/report.php?diag=C61` | HTTP 404 (změněná struktura webu) |

Důsledek pro dnešní práci: dvouletá čísla programu **nelze dnes ověřit proti
monitorovacímu portálu NSC ÚZIS**; jediným dostupným primárním zdrojem je
tisková zpráva MZ ČR z 1. 9. 2026 (bod 3 powerlistu). V článku proto musí být
atribuována jmenovitě ministerstvu jako *průběžná* čísla, ne vydávána za
recenzovaný výstup.

## Doporučení pro routing fáze

- HOT (nový indikátor): žádný
- HOT (aktuální dění): dvouletá průběžná data programu screeningu prostaty
  (MZ ČR, 1. 9. 2026) — ale téma už v korpusu je → patří do revize, ne do nového článku
- WARM (revize existujícího článku zastaralého kvůli vlně):
  `clanek-prostata-screening-pilot.html` (nová dvouletá čísla + rozpor v incidenci),
  `clanek-onkologicky-koordinator-2026.html` (implementační data, číslo o plicích
  vyžaduje primární dohledání — odloženo)
- COLD: EZKarta (bez primárního zdroje)
