# Discovery report — 2026-05-18

Agent: claude-code-agent · routine: daily (PROMPT_DAILY_ROUTINE.md, 5 fází)
Run start: 2026-05-18 (pondělí). Předchozí discovery proběhla 2026-05-17 → výstupem byl nový článek `clanek-prihranicni-zachranka-cr-sk-2026.html` zařazený na konec fronty (2026-06-10).

Prozkoumáno: ÚZIS aktuality, MZ ČR tiskové zprávy (mzd.gov.cz po 301 redirectu z mzcr.cz), zakonyprolidi.cz, vláda ČR (jednání 4. 5. 2026), PSP ČR (přes vyhledávání — `psp.cz/sqw/hp.sqw?k=22` vrátil chybu 500, `historie.sqw?o=10&t=0` 404), NÚKIB (URL 404 — adresa změněna na `nukib.gov.cz`), SÚKL (403), VZP, KST (transplantace), Zdravotnický deník (cross-check).

## Nové primární zdroje od posledního běhu

### Aktualizace ze sledovaných institucí (15.–18. 5. 2026)

- **MZ ČR — TZ "Dobrovolníci pomáhají pacientům po cévní mozkové příhodě"** (15. 5. 2026). Pilotní projekt s 51 zaškolenými dobrovolníky v 6 iktových centrech. Kontext k `clanek-cmp-iktova-centra.html`, ale není to nový strukturální fakt — ne článek, ne revize.
- **MZ ČR — TZ "Monitoring hantaviru Andes"** (13. 5. 2026). Riziko pro ČR aktuálně nízké; epi-event, ne článek.
- **MZ ČR — TZ "Zdravotnictví 4.0 Challenge"** (12. 5. 2026). Studentsko-nemocniční inovace; PR, ne článek.
- **ÚZIS — aktuality:** žádná nová položka po 5. 5. 2026 (prodloužení sběru výkazů za 2025). Beze změny.
- **VZP — dokumenty:** žádný nový dokument od poslední iterace.
- **Vláda ČR — jednání 4. 5. 2026:** bod 4 (čj. 310/26) — "Zpráva o činnosti Rady vlády pro veřejné zdraví za rok 2025" — předložena ministrem zdravotnictví. Status: pouze pro informaci, bez rozpravy. Materiál veřejně dostupný není.
- **NRZP — Informace č. 28/2026** (29. 4. 2026): Sněmovní tisky 124 a 125 (sociální systém — odložení digitalizace dávek do 1. 7. 2026; novela zákona č. 108/2006 Sb. o sociálních službách a č. 329/2011 Sb. — přesun kompetencí z ÚP na OSSZ se odkládá až na 1. 6. 2028). Hraničí se zdravotnictvím v doméně dlouhodobá / sociálně-zdravotní péče — již částečně pokryto draftem `clanek-socialne-zdravotni-pomezi-2026.html` (zařazeno do fronty na 2026-05-21).

### Pozdější verifikace zdrojů z předchozího runu

- **MZ ČR — TZ "Přesnější screening, lepší výsledky"** (7. 5. 2026) — discovery 17. 5. 2026 ji označila jako WARM trigger pro REVISE. Dnes verifikováno přímým WebFetch tiskové zprávy:
  - Citáty ministra Adama Vojtěcha, Karla Hejduka (vedoucí Národního screeningového centra), Tomáše Hauera (poradce ministra).
  - **Cervix:** rozšíření HPV testování na ženy **25–65 let, frekvence 1×/5 let**, zachování cytologie u mladších žen a "vložená cytologie" v meziintervalu.
  - **Plíce:** zjednodušení odesílatelů (nově i jiné odbornosti než plicní), reakce na účast ~5 % z cílové populace těžkých kuřáků.
  - **Kolorektum:** posílení role pojišťoven a kapacit screeningových koloskopií.
  - **Status legislativy:** v TZ není zmínka o nové vyhlášce / věstníku — pouze "připravované" změny. Tj. ohlášeno, neimplementováno.
  - Sekundární korroborace: Zdravotnický deník 7. 5. 2026, autorka Michaela Koubová (`zdravotnickydenik.cz/2026/05/onkologicka-prevenci-3-screeningove-programy-zmeny/`).

## Aktualizace existujících dat (vlna)

- **KST (Koordinační středisko transplantací) — rekordní rok 2025** (publikováno 6. 1. 2026 — již dříve známo): 341 zemřelých dárců, 975 transplantovaných orgánů, 849 čekajících k 1. 1. 2026. Tato data **jsou již použita** v draftu `clanek-transplantace-darcovstvi-organu.html` (audit. last_reviewed 2026-05-16, scheduled 2026-05-20). Beze změny oproti předchozímu běhu.
- **Eurostat hlth_*** — žádná nová vlna.
- **OECD HAG** — žádná nová vlna; HAG 2025 zveřejněn 11/2025 (již použit).
- **ÚZIS NOR / NRH / NRPZS** — žádná nová publikace.

## Aktuální dění / kauzy s primárně-zdrojovou doložitelností

- Žádná nová HOT kauza dnes. Klíčová WARM aktualita zůstává MZ ČR TZ ze 7. 5. 2026, která se přímo dotýká **publikovaného článku `clanek-cervix-hpv.html`** (datum publikace 2026-05-07 — paradoxně tentýž den, ale článek MZ ČR oznámení necituje a v sekci "Co Česko nedotáhlo" tvrdí opak: "Co Česko zatím nedotáhlo: přechod na primární HPV testování jako jediný standard screeningu (model Nizozemsko / Austrálie / Velká Británie)").

## Audit stav korpusu

- **Bez audit metadata vůbec:** `clanek-financovani-segmenty-2026.html`, `clanek-detska-psychiatrie-krize.html` (PUBLISHED!), `clanek-pyll.html`, `clanek-cervix-hpv.html` (publikováno, jen poznámka v textu o revizi 2026-05-12), `clanek-cmp-iktova-centra.html`, `clanek-koureni.html`, `clanek-mamograf-rakovina-prsu.html`, `clanek-rakovina-tlusteho-streva.html`, `clanek-platba-z-kapsy.html`, `clanek-reforma-pohotovosti-290-2025.html`, `clanek-ai-act-zdravotnictvi-srpen-2026.html`, `clanek-hta-jca-eu-2026.html`.
- **Nejstarší last_reviewed:** `clanek-akutni-infarkt.html` (2026-05-11) — 7 dnů staré, dále `clanek-prezit-rakoviny.html` (2026-05-12), všechny <30 dnů → fallback-by-age neaktivován.

## Doporučení pro routing fáze

- **WARM REVISE (vybráno):** `clanek-cervix-hpv.html` — MZ ČR TZ ze 7. 5. 2026 je přímou primární evidencí, která vyvrací tvrzení v článku, že ČR přechod na primární HPV neoznámila. Současně článek **nemá audit YAML komentář v hlavičce** (jen krátká poznámka v textu řádek 214 z 2026-05-12 a vlastní `meta name="article:audit-status" content="review-pending"`). Cascade-flag z poznámky v textu žádal opravu metodické karty `indicators/screening_cervix.json` (chybné "zavedení 2014", nepodložené "přechod od 2026"). **Vše dohromady tvoří jednu uzavřenou REVISE iteraci** s primární evidencí + cascade do indikátoru.
- **HOT (nový článek):** žádné (vše významné je již v korpusu nebo ve frontě).
- **COLD (audit po stáří):** všechny <30 dnů → neaktivovat.

---

**Routing rozhodnutí:** ARTICLE-REVISE → `clanek-cervix-hpv.html` + kaskáda do `indicators/screening_cervix.json` (viz routing-2026-05-18.md).
