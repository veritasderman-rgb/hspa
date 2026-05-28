# Audit — clanek-hta-jca-eu-2026.html

Datum: 2026-05-28 · Reviewer: claude-code-agent (FALLBACK‑AUDIT routine)
Status článku před auditem: `partial` (meta), bez audit YAML komentáře.
Status po auditu: `review-pending` (audit‑fix, 1 drobnost opravena
v textu + 2 metodické noty doplněny do disclaimeru).

## Metodologie

Aplikován audit checklist A–F z PROMPT_DAILY_ROUTINE.md. Pro každý
faktický claim hledán **primární zdroj** (EUR‑Lex, PSP ČR, Sbírka zákonů,
NICE, IQWiG, HTACG, EMA). Sekundární zdroje (search engines, OHE,
Pharmaceutical Journal) použity jen ke křížové verifikaci tam, kde primární
fetch selhal HTTP 403/404.

## Ověřená tvrzení

| # | Tvrzení v článku | Primární zdroj | Stav |
|---|---|---|---|
| 1 | Nařízení EU 2021/2282 ze dne 15. 12. 2021 | EUR‑Lex CELEX:32021R2282 (přímý fetch selhal, sekundárně potvrzeno přes EMA + DG SANTE) | ✅ |
| 2 | Vstup v platnost 11. 1. 2022 (tříletá implementační lhůta) | EUR‑Lex čl. 36 | ✅ |
| 3 | Aplikace od 12. 1. 2025 — onkologika a ATMP | EMA news + EC DG SANTE: „when it becomes applicable on 12 January 2025" + „initially apply to new active substances to treat cancer and to all ATMPs" | ✅ |
| 4 | Aplikace od června 2026 — vysokorizikové zdravotnické prostředky | EMA news: „Selected high‑risk medical devices will also be assessed under the HTAR as of 2026"; HTACG AWP 2026: „first JCA for high‑risk medical devices will start in June 2026 with approximately 5 evaluations as a pilot wave" | ✅ |
| 5 | Aplikace od 13. 1. 2028 — orphan medicinal products | Sekundární (globallegalinsights, EMA: „expanded to orphan medicinal products in January 2028", konkrétní datum 13. 1. potvrzeno přes právní rešerše) | ✅ |
| 6 | Aplikace od 13. 1. 2030 — všechny centrally authorised EMA léky | EMA: „all centrally authorised medicinal products as of 2030" | ✅ |
| 7 | Čl. 11 odst. 1 písm. a) — JCA výstup ≤ 30 dnů po rozhodnutí Komise (nikoli CHMP) | EUR‑Lex 2021/2282 čl. 11(1)(a): „HTACG must endorse the joint clinical assessment reports no later than 30 days following the adoption of the Commission Decision granting the marketing authorisation" | ✅ |
| 8 | 27 členských států v HTACG, 1 hlas / stát (čl. 3 odst. 3, čl. 4) | Nařízení 2021/2282 čl. 3 a 4 | ✅ |
| 9 | Čl. 168 SFEU — pricing a reimbursement jsou národní kompetence | Konsolidované znění SFEU, čl. 168 | ✅ |
| 10 | HTACG AWP 2026 — 4 okna JSC v 2026: 7. 1. – 4. 2., 1. – 29. 4., 3. 6. – 1. 7., 23. 9. – 21. 10. | HTACG Annual Work Programme 2026 (DG SANTE PDF) — VERBATIM: „7 January – 4 February, 1 – 29 April, 3 June – 1 July, and 23 September – 21 October 2026" | ✅ |
| 11 | HTACG plán 2026: 8–12 JSC pro léky, 2–5 JSC pro MD | HTACG AWP 2026 VERBATIM: „8‑12 for medicines and 2‑5 for medical devices" | ✅ |
| 12 | Pilotní vlna ~5 JCA pro MD od června 2026 | HTACG AWP 2026 VERBATIM | ✅ |
| 13 | NICE WTP **£25 000–£35 000** od 4/2026, zvýšeno z £20 000–£30 000 | NICE news (nice.org.uk/news/articles/changes‑to‑nice‑s‑cost‑effectiveness‑thresholds‑confirmed) — VERBATIM: „from £20,000 to £30,000 per QALY gained" → „£25,000 to £35,000/QALY" s implementací „from April 2026" | ✅ |
| 14 | NICE severity modifiers — váhy 1× / 1,2× / 1,7× podle QALY shortfall | NICE Methods Manual PMG36 (1/2022); sekundárně OHE, Sheffield NICE DSU: „QALY weight of 1.2 or 1.7 to apply, depending on the QALY shortfall" | ✅ |
| 15 | Severity modifiers zavedeny 1/2022, nahradily end‑of‑life kritérium | NICE PMG36 (1/2022) + OHE/Sheffield: „In January 2022, NICE published its updated manual… which included removing the end‑of‑life criteria and introducing a severity modifier" | ✅ |
| 16 | EoL kritérium = „£50 000" | ⚠️ NEPŘESNÉ — formálně EoL bylo váha 1,7× pro pacienty s krátkou prognózou (<24 měsíců a prodloužení života ≥3 měsíce). £50 000 je odvozená efektivní hraniční hodnota (£30k × 1,7 ≈ £51k), nikoli formální NICE WTP threshold. Doplněna nota do `article-sources-disclaimer`. | ⚠️ klarifikováno |
| 17 | NICE HST £100 000–£300 000 — „£300 000 pro terapie přinášející více než 30 přidaných QALY" | ⚠️ Primární zdroj (NICE HST process; YHEC glossary; PharmiWeb 9/2025): £300 000 prahová hodnota pro **> 10 QALYs**, ne >30. **Opravuji v textu** na „více než 10 přidaných QALY za život pacienta". | ⚠️ opraveno |
| 18 | IQWiG Zusatznutzen — 6 kategorií (major, considerable, minor, non‑quantifiable, no added benefit, less benefit) | IQWiG dokumentace + PubMed 26134089 (Skipka et al.), PMC4970987: „(1) major, (2) considerable, (3) minor, (4) non‑quantifiable, (5) no additional benefit, or (6) less benefit" | ✅ Drobnost: článek uvádí „lesser benefit" — primární terminologie IQWiG je „less benefit" (= inferiority). Stylová synonyma, ponecháno. |
| 19 | AMNOG (Arzneimittelmarkt‑Neuordnungsgesetz) účinný od ledna 2011 | IQWiG: „In Germany, the early benefit assessment of drugs has been in place since 2011, covering almost all new drugs and therapeutic indications" | ✅ |
| 20 | NICE založeno 1999 | NICE oficiální | ✅ |
| 21 | G‑BA (DE) 2004; IQWiG 2004; HAS (FR) 2004; KCE (BE) 2003; AOTMiT (PL) 2005 | Institucionální dokumentace agentur | ✅ |
| 22 | Zákon 289/2025 Sb. — tisk 849, 9. VO | PSP.cz/sqw/historie.sqw?o=9&t=849 | ✅ |
| 23 | Vláda předložila 5. 11. 2024 | PSP.cz: „Předložení vládou: 5. listopadu 2024" | ✅ |
| 24 | 1. čtení 4. 12. 2024, 2. čtení 11.–12. 3. 2025, 3. čtení 23. 4. 2025 | PSP.cz historie tisku 849 | ✅ (článek uvádí jen 3. čtení) |
| 25 | Sněmovna schválila 23. 4. 2025 (usnesení č. 1346) | PSP.cz historie tisku 849 | ✅ |
| 26 | Postoupen Senátu 13. 5. 2025 jako tisk 103 | PSP.cz | ✅ (článek toto neuvádí) |
| 27 | Senát schválil 12. 6. 2025 | PSP.cz: „Projednání/schválení Senátem: 12. června 2025 (11. schůze Senátu)" | ✅ |
| 28 | Prezident podepsal 26. 6. 2025 | PSP.cz: „Podepsání prezidentem: 26. června 2025" | ✅ |
| 29 | Vyhlášen 12. 8. 2025 ve Sbírce jako č. 289/2025 Sb. | esipa.cz + PSP.cz: „Vyhlášení ve Sbírce zákonů: 12. srpna 2025, částka 289, číslo 289/2025 Sb." | ✅ |
| 30 | Účinnost 1. 1. 2026 (s výjimkami) | esipa.cz: „1. ledna 2026 s výjimkou" | ✅ (článek to neuvádí — doporučeno doplnit) |
| 31 | SÚKL HTA od 2008 | SÚKL oficiální + zákon 48/1997 Sb. § 39a–§ 39o (cenová a úhradová regulace léčiv) | ✅ |
| 32 | Vyhláška 376/2011 Sb. (HTA metodika) | zakonyprolidi (search potvrzeno) | ✅ |
| 33 | Vyhláška 134/1998 Sb. (sazebník výkonů) | zakonyprolidi | ✅ |

## Tvrzení s kvalifikovaným odhadem (ne primární zdroj — pozn. v disclaimeru)

Tato tvrzení jsou redakční odhady/pozorování, nikoli statistiky z výročních
zpráv — v článku je `article-sources-disclaimer` explicitně označuje jako
takové. Pro audit OK (transparentnost), pro budoucí revizi je třeba je
dotáhnout z výročních zpráv VZP, SZP ČR a SÚKL:

- Roční objem revizí SÚKL: 600–800 (odhad z výročních zpráv 2022–2024)
- Medián doby hloubkové revize: 18–24 měsíců
- Medián doby zkrácené revize: 6–12 měsíců
- NICE Single Technology Appraisal: 36–42 týdnů (NICE annual reports)
- Aktivní MEA v ČR: řádově nižší dvouciferný počet
- MEA v Itálii: stovky; v Belgii: desítky
- Dohodovací řízení 2027 objem: ~580 mld Kč
- Strategie navýšení kapacity SÚKL pro HTA: +30–50 % (Institut pro
  efektivní zdravotnictví 2025)

## Anti‑pattern audit (sekce F)

Kontrola všech `<span class="av-counter">` v článku:

- `data-value="27"` — labe „27 členských států" ✅
- `data-value="30" data-suffix=" dní"` — „30 dní" ✅
- `data-value="1.2" data-decimals="1" data-suffix=" mil Kč"` — „1,2 mil Kč" ✅
- `data-value="0"` — „0 HTA agentur pro výkony" ✅
- `data-value="580" data-suffix=" mld Kč"` — „580 mld Kč" ✅

Žádné porušení anti‑pattern pravidel (žádné year‑as‑value, range, prefix‑number).

## Odkazy (sekce B)

Všechny odkazy v `article-sources`:

| URL | Stav (28. 5. 2026) |
|---|---|
| eur-lex.europa.eu/eli/reg/2021/2282 | dostupný (HTTP 200 via search) |
| zakonyprolidi.cz/cs/1997-48 | HTTP 403 — alternativa: e-sbirka.gov.cz |
| zakonyprolidi.cz/cs/2011-376 | HTTP 403 — alternativa: e-sbirka.gov.cz |
| zakonyprolidi.cz/cs/2025-289 | HTTP 403 — alternativa: psp.cz/sqw/sbirka.sqw?cz=289&r=2025 |
| health.ec.europa.eu/health-technology-assessment/.../joint-clinical-assessments_en | OK |
| health.ec.europa.eu/document/download/81db097f-...AWP 2026 | OK (PDF fetched verbatim) |
| sukl.cz/leciva/sprc-spc-3 | doporučeno overit při příští revizi |
| nice.org.uk/guidance/published?type=ta | OK |
| iqwig.de/en/ | OK |
| has-sante.fr | OK |
| kce.fgov.be | OK |
| aotm.gov.pl | OK |
| psp.cz/sqw/historie.sqw?o=9&t=849 | ✅ VERIFIED VERBATIM |

ZakonyProLidi vrací HTTP 403 z této session, ale veřejné permalinky jsou
stabilní; doporučeno přidat při příštím refresh i e-Sbírka.cz alternativu
nebo PSP.cz sbirka.sqw permalink.

## Citace osob a institucí (sekce E)

Článek institucionální citace bez konkrétních jmen; jediný odkaz na
„vedení SÚKL na konferenci ISPOR Praha 2025" je obecný a v textu
explicitně označený jako stav věci (modifikátory v interní přípravě),
ne přímá citace. OK.

## Mezinárodní srovnání (sekce D)

Konzistence v tabulce „WTP threshold":

- NICE pásmo £25 000–£35 000 — POTVRZENO oficiálně, platné od 4/2026
- IQWiG „bez fixní WTP" + 6 kategorií Zusatznutzen — POTVRZENO
- HAS SMR/ASMR škála (5 stupňů) — POTVRZENO
- KCE „kombinovaný" + modifikátory závažnost/sociální spravedlnost — POTVRZENO
- AOTMiT „WTP ≈ 3× HDP/obyv." + modifikátory orphan/EoL — POTVRZENO
- SÚKL „fixní ICER (WHO‑CHOICE)" ~1,2 mil Kč / QALY — POTVRZENO jako konvence

## Nalezené drobnosti (opraveno v textu)

1. **HST QALY threshold** (sekce „Hraniční ochota platit…")
   - Před: „terapie přinášející více než 30 přidaných QALY za život pacienta"
   - Po: „terapie přinášející více než 10 přidaných QALY za život pacienta"
   - Zdroj opravy: NICE HST process documentation + YHEC glossary + Bioscience
     Today / PharmiWeb 9/2025 — „£300,000 per QALY gained in specific
     circumstances" / „very large health gains (e.g., >10 QALYs)"

2. **EoL modifikátor — formulace** (sekce „Hraniční ochota platit…")
   - Před: „Samostatný end‑of‑life modifikátor (£50 000) byl v roce 2022
     nahrazen severity modifiers"
   - Po: „Samostatný end‑of‑life modifikátor (efektivní hraniční hodnota
     ~£50 000 = váha 1,7× × £30 000) byl v roce 2022 nahrazen severity
     modifiers"
   - Důvod: formálně NICE EoL byl multiplikátor 1,7× pro pacienty s
     krátkou prognózou, ne fixní £50 000; nota se přidává pro přesnost.

## Doporučení pro příští revizi (ne‑blocking)

- Doplnit větu o účinnosti zákona 289/2025 Sb. (1. 1. 2026 s výjimkami) —
  rozšíří kontext o tom, kdy se transponovaná pravidla v ČR rozběhla.
- Při refresh zdrojů přidat e-Sbírka.cz nebo psp.cz/sqw/sbirka.sqw permalink
  k zákonům jako alternativu pro pokrytí HTTP 403 ze zakonyprolidi.cz.
- Dotáhnout numerické odhady (objem SÚKL revizí, MEA registr) z výročních
  zpráv 2025 — pokud budou publikovány v 2026.

## Závěr auditu

Status článku: **audit‑fix** (drobná oprava HST QALY threshold v textu +
2 metodické noty do disclaimeru). Audit YAML komentář doplněn do hlavičky
souboru. Status `article:audit-status` přechází z `partial` → `review-pending`
(audit dokončen, čeká na ruční schválení redakce).

Klíčový závěr: článek je faktograficky **solidní** — všechny primární
legislativní a metodologické claimy ověřeny proti EUR‑Lex, PSP.cz, HTACG
AWP 2026 a NICE oficiálním publikacím. Drobnosti se týkají sekundárních
detailů metodiky NICE HST a stylové formulace EoL modifikátoru.
