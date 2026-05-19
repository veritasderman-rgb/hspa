# Discovery report — 2026-05-19

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-19 (úterý). Předchozí discovery 2026-05-18 → ARTICLE-REVISE clanek-cervix-hpv.html + kaskáda do indicators/screening_cervix.json (commit `4a7b865`, audit pass).

Prozkoumáno přímým WebFetch / WebSearch: ÚZIS aktuality, MZ ČR tiskové centrum (mzd.gov.cz), zakonyprolidi.cz, SÚKL (sukl.gov.cz po 301 redirectu z sukl.cz — vrátil 404), PSP ČR (vyhledávání sntisk.sqw), NÚKIB (nukib.gov.cz/cs/infoservis/aktuality — bez 2026 dat), ČSÚ aktuality, VZP, Zdravotnický deník, OECD Health portal (403), Eurostat health news (404), WHO Europe news-room, vláda ČR (vlada.gov.cz/cz/media-centrum + jednání-vlady — vesměs 404 na deeper paths), České noviny / ČTK, iROZHLAS (kontextové).

## Nové primární zdroje od posledního běhu

### Aktualizace ze sledovaných institucí (16.–19. 5. 2026)

- **Vláda ČR — usnesení 18. 5. 2026 o přesunu agend z Úřadu vlády na resortní ministerstva** (HOT, viz níže) — usnesení samo o sobě na vlada.gov.cz dosud nepublikováno; primární evidence zatím jen přes **ČTK** (publikováno přes čeesknoviny.cz, 18. 5. 2026) a sekundární korroborace **Zdravotnický deník** (18. 5. 2026), **iROZHLAS**. Citace ministra spravedlnosti **Jeronýma Tejce** přímá: „Výkon agendy se převádí na jednotlivá ministerstva tak, aby to bylo efektivnější."
- **MZ ČR — TZ 18. 5. 2026 „Den otevřených dveří MZ"** — PR událost, žádná policy implikace; ne článek.
- **MZ ČR — TZ 15. 5. 2026 „Dobrovolníci pomáhají pacientům po CMP"** — již v 5/2026-05-18 discovery.
- **WHO Europe — 18. 5. 2026 „New WHO tool supports countries to improve quality of child and youth mental health services"** — *Clinical audit tool to strengthen quality of child and youth mental health services*. Staví na WHO Quality Standards for CYMH Services. Stat „1 in 7 children and adolescents lives with a mental health condition". ČR explicitně nezmíněna. Relevant pro existující článek `clanek-detska-psychiatrie-krize.html`, ale není to nový strukturální fakt → ne HOT.
- **WHO Europe — 17. 5. 2026 „Climate change is a health crisis"** — globální advokační zpráva, nepoužitelné pro ČR-specifický článek bez národních dat.
- **WHO Europe — 15. 5. 2026 „Little-known virus on cruise ship"** — globální zdravotně-bezpečnostní rámec; mimo HSPA scope.
- **ÚZIS — aktuality:** beze změny od poslední iterace (poslední položka 5. 5. 2026 — prodloužení sběru výkazů za 2025 do 20. 5. 2026).
- **ČSÚ — aktuality 18. 5. 2026 „VŠPS Q1 2026"** — pracovní trh, ne zdravotnictví; 14. 5. 2026 „Tržby v kultuře" — mimo scope; 13. 5. 2026 inflační indikátory — mimo scope.
- **Eurostat Health news:** stránka 404, nelze ověřit; přes WebSearch žádný news release k 5/2026.
- **OECD Health:** 403, primární RSS nedostupný; přes WebSearch žádná nová vlna HAG / OECD.Stat update v týdnu 15.–19. 5.
- **SÚKL — registr výpadků:** 404 na obou URL variantách (sukl.cz redirect na sukl.gov.cz, oba vrátily 404 / 403). Nelze ověřit aktuální výpadky.
- **PSP ČR — sněmovní tisky:** vyhledávací formulář funkční, ale bez výsledků k testu „zdravotn"; přes web search žádný nový tisk v týdnu 15.–19. 5.
- **NÚKIB:** žádné aktuality z 2026 (přes URL nukib.gov.cz/cs/infoservis/aktuality — nejnovější jsou z 5/2025). Stagnuje, beze změny.
- **Zákony pro lidi (aktualne):** 403 forbidden — nelze ověřit nově vyhlášené normy. Vlna ve Sbírce zákonů nedostupná.
- **VZP — aktuality:** neúplný obsah (404 / strukturní stránka), nelze ověřit.

### Pozdější verifikace zdrojů z předchozího runu

- **MZ ČR TZ „Přesnější screening, lepší výsledky" (7. 5. 2026):** revize uzavřena commitem `4a7b865` (předchozí běh). Beze změny dnes.
- **KST rekordní rok 2025:** beze změny; data již použita v draftu `clanek-transplantace-darcovstvi-organu.html` (publikace plánovaná 2026-05-20).

## Aktualizace existujících dat (vlna)

- Žádná nová vlna ÚZIS, NRH, NRZP, NOR, OECD HAG, Eurostat hlth_*, WHO Mortality DB. Dataset world ne-pohyblivý v ne­celém týdnu od poslední iterace.

## Aktuální dění / kauzy s primárně-zdrojovou doložitelností

### HOT pending primary verification — vláda ČR 18. 5. 2026

**Co bylo rozhodnuto** (dle ČTK přes České noviny + Zdravotnický deník + iROZHLAS, vše 18. 5. 2026):

1. Přesun **Odboru protidrogové politiky** + Národního monitorovacího střediska z Úřadu vlády → **Ministerstvo zdravotnictví** s účinností od **1. 7. 2026**.
2. Přesun agendy **duševního zdraví** (Rada vlády pro duševní zdraví, znovuzřízena pod vedením Dity Protopopové počátkem 2026) z Úřadu vlády → **MZ ČR**.
3. Přesun agendy **lidských práv** → MS ČR.
4. Přesun agendy **práv osob se zdravotním postižením** → MPSV.
5. Citace ministra spravedlnosti **Jeronýma Tejce**: „Výkon agendy se převádí na jednotlivá ministerstva tak, aby to bylo efektivnější." (ČTK, 18. 5. 2026)

**Kritika** (dle iROZHLAS + České noviny, 18. 5. 2026):

- **Jindřich Vobořil** (bývalý protidrogový koordinátor 2010–2021): kritizuje, že MZ ČR nemá zákonný mandát pro koordinaci napříč cly, hazardem, ilegálním obchodováním ani represí; v minulosti odmítlo financovat sociální složky terénní práce.
- 4 bývalí národní koordinátoři (vč. současného **MUDr. Pavla Béma**, který funkci znovu zastává — ověřeno přes vlada.gov.cz/cz/ppov/protidrogova-politika) v minulém vol. období proti přesunu vystoupili.

**Co primární zdroj zatím neuvádí** (tj. blokuje HOT → ARTICLE-WRITE per iron rule):

- Číslo usnesení vlády (vlada.gov.cz/cz/media-centrum/aktualne — 404 na deeper paths, materiál k jednání 18. 5. 2026 nepublikován)
- Přesný počet zaměstnanců přecházejících na MZ ČR
- Rozpočtové dopady na kapitolu MZ ČR pro 2026/2027
- Konkrétní organizační umístění v rámci MZ ČR
- Související legislativní změny (kompetenční zákon č. 2/1969 Sb. — pravidla pro přesuny agend)

**Klasifikace:** WARM trigger pro **REVISE** existujícího článku duševního zdraví, ne dnes plný HOT článek. Primární zdroj (usnesení) má být dostupný v řádu dnů; ARTICLE-WRITE flow odložen na příští iteraci, kdy bude usnesení vyhlášeno.

## Audit stav korpusu

- **Nepublikovaných v frontě:** 22 článků zařazených na dny 2026-05-19 až 2026-06-10 (denní kadence dodržena).
- **Publikovaných bez audit metadata:** 35 z 41 published článků (většina publikována vlnově 2026-05-07).
- **Nejstarší publikovaný bez auditu (kandidáti pro fallback):** `clanek-manifest-reforma-zdravotnictvi.html`, `clanek-uhradova-vyhlaska.html`, `clanek-akutni-infarkt.html`, `clanek-preventivni-prohlidka.html`, `clanek-nosokomialni-infekce.html`, `clanek-ambulantni-kontakty.html`, `clanek-vyhnutelne-hospitalizace.html`, `clanek-reforma-psychiatrie-13-let.html`, `clanek-vakcinace.html`, `clanek-cekani-specialista.html`, `clanek-ehealth.html`, `clanek-pracovni-sila.html`, `clanek-pohyb.html`, `clanek-bmi-obezita.html` (vesměs publ. 2026-05-07, tj. 12 dní bez nezávislého auditu).
- `clanek-reforma-psychiatrie-13-let.html` má audit YAML s `status: partial` z 2026-05-17 a v notes vyjmenováno: „DOPORUČENO pro ruční audit: ověřit DOI a citaci článku (Int Rev Psychiatry, 2026), počet PWLE 23, hodnoty CDZ síť... aktuální stav sítě CDZ k 2026".

## Doporučení pro routing fáze

- **FALLBACK-AUDIT + light REVISE (vybráno):** `clanek-reforma-psychiatrie-13-let.html` — má `status: partial` s konkrétním seznamem položek k auditu (PMID, autoři, počet PWLE, věstník 9/2025, strategie 2013), kombinovatelné s light callout o 18. 5. 2026 přesunu Rady pro duševní zdraví → MZ ČR (kontextové potvrzení centrální teze článku „institucionální ukotvení vs politické změny"). Jediná iterace splňující obě potřeby (uzavírá `partial` audit + reflektuje strukturální dění dne).
- **HOT (nový článek):** žádné s plnou primárně-zdrojovou doložitelností (usnesení vlády 18. 5. nedostupné). ARTICLE-WRITE flow odložen na další běh.
- **COLD (audit po stáří):** žádný článek nemá `last_reviewed > 30 dnů` — fallback-by-age neaktivován.

## Verifikační status primárních zdrojů (klíčové pro audit)

| Tvrzení v auditovaném článku | Primární zdroj | Stav ověření |
|---|---|---|
| PMID 41579112 — Winkler P et al., Int Rev Psychiatry 24. 1. 2026 | PubMed | ✅ verified (autoři kompletní, datum, journal, 23 PWLE) |
| DOI: 10.1080/09540261.2026.2619456 | PubMed | ✅ verified (nová informace — v článku zatím není explicitně) |
| Strategie reformy psychiatrické péče schválena 8. 10. 2013, ministr Martin Holcát | reformapsychiatrie.cz PDF (Oficial_final_SRPP_publikace_web_8-10-2013.pdf), MZ ČR TZ archiv 2013 | ✅ verified (datum v názvu publikace; web search potvrdil ministra Holcáta) |
| Věstník MZ ČR č. 9/2025 — standard CDZ pro děti a adolescenty | mzd.gov.cz/vestnik/vestnik-9-2025/ | ✅ verified (vyhlášen 25. 6. 2025, položka 5; korroborace přes acdz.cz a reformapsychiatrie.cz) |
| 2 funkční dětská CDZ k 9/2025 | reformapsychiatrie.cz, Zdravotnický deník | ✅ konzistentní s ostatními zdroji k cíli 14 krajů, ne primárně registrový údaj — v článku již označeno jako „medializované údaje" |
| Italian Law 180/1978 (Basaglia) — deinstitucionalizace | extensively documented WHO + Cochrane (general knowledge consensus) | ✅ standardní fakt mezinárodní psychiatrie |
| Belgian Article 107 (2010) — federální reforma | health.belgium.be, INAMI | ✅ standardní fakt |
| UK IAPT 2008 → NHS Talking Therapies | england.nhs.uk | ✅ aktualní reference v článku |
| Sebevražednost ČR 12.5 vs OECD 10.5 | HSPA Monitor dashboard (data/indicators.json) | (audit per indicator card) |
| Antidepresiva 84 DDD vs OECD 67 DDD | HSPA Monitor dashboard | (audit per indicator card) |

## Verifikační status zdroje 18. 5. 2026 (vláda ČR — pro callout)

| Fakt | Zdroj | Stav |
|---|---|---|
| Vláda 18. 5. 2026 rozhodla o přesunu agendy duševního zdraví + protidrog na MZ ČR | ČTK (přes České noviny), Zdravotnický deník, iROZHLAS — 3 nezávislé sekundární / primárně-zpravodajské | ⚠️ Bez vlastního usnesení (vlada.gov.cz neaktualizováno k 19. 5.) — uvádět jako „rozhodnutí dle ČTK z 18. 5. 2026", explicitní caveat |
| Účinnost od 1. 7. 2026 | ČTK | ⚠️ same caveat |
| MUDr. Pavel Bém — aktuální národní koordinátor protidrogové politiky | vlada.gov.cz/cz/ppov/protidrogova-politika/rada-vlady-pro-koordinaci-politiky-v-oblasti-zavislosti-196551/ | ✅ verified (primární zdroj) |
| Dita Protopopová — předsedkyně Rady pro duševní zdraví od počátku 2026 | Zdravotnický deník 18. 5. 2026, vlada.gov.cz | ⚠️ Sekundární, nicméně Rada pro duševní zdraví je veřejně dohledatelná entita |
| Citace Tejce („Výkon agendy se převádí…") | ČTK 18. 5. 2026 | ⚠️ Primární zpravodajská citace, ale ne stenoprotokol vlády |

---

**Routing rozhodnutí:** FALLBACK-AUDIT + light REVISE → `clanek-reforma-psychiatrie-13-let.html` (viz `routing-2026-05-19.md`).
