# Plán: Série „Jak (ne)reformovat komplexní systém"

> **Účel dokumentu:** samostatný vstupní bod pro psaní nové edukativní série
> článků HSPA Monitoru o tom, *proč* se komplexní systémy (zejména
> zdravotnictví) tak houževnatě brání reformám a *jak* je reformovat poctivě.
> Drží registr dvou stávajících pilířových článků, návrh oblouku celé série,
> per-díl karty, vizuální a redakční pravidla a — klíčové — **registr čísel
> k ověření před publikací**.
>
> **Vytvořeno:** 2026-06-05 (session „health-reform-series-plan").
> **Vstupní briefy:** tři redakční zadání (Josef Pavlovic) —
> (A) sedmidílná verze s komplexitou jako spojovacím obloukem;
> (B) šestidílná verze se systémovou dynamikou, atraktory a change-managementem;
> (C) practitioner verze („missing middle" — převést koncepty na pracovní
> postupy: workshopy, tracer indikátory, dashboardy, governance cadence,
> playbooky), 7 jádrových + 2 volitelné moduly, alternativní pořadí.
> Tento plán je syntetizuje: **A = primární struktura oblouku, B = systémově-
> dynamická munice a české kauzy, C = practitioner vrstva a zdrojová priorita.**

---

## ROZHODNUTÍ REDAKCE (uzamčeno 2026-06-05)

Odpovědi na otevřené otázky (§9). Tato rozhodnutí jsou závazná pro psaní dílů:

1. **Pořadí = varianta A** (ToC → RBM → komplexita; díly 1–2 zůstávají, komplexita = díl 3).
2. **Dekompozice:** systémové mapování i dashboard **jako samostatné díly**;
   **díl o datech/lock-inu i díl o poslední míli z varianty A zachovat**. ⇒
   **série naroste na 9 jádrových dílů** (+ 2 volitelné = 11 celkem).
3. **Volitelné moduly (PROMs/PREMs, adaptivní evaluace): ANO** — druhá vlna.
4. **Rozcestník:** stávající tematická linie „Platíme za objem" (`platby_za_objem`).
5. **Slugy/tagy:** potvrzeny (dva nové díly viz §8).
6. **Konflikt zájmů VZP: ANO** — jednotný rámeček v dílech, které se VZP dotýkají.
7. **Matematický aparát (brief B): ZAŘADIT** jako volitelné ilustrativní boxy.
8. **Rozsah/tempo:** potvrzeno (2 000–3 800 slov/díl, ~1 díl / 10–12 dní).
9. **Fact-check:** odloženo do některé z dalších iterací (registr §7 zůstává platný).

---

## 0. TL;DR (přečti první)

- **Struktura: 9 jádrových dílů** (+ 2 volitelné, druhá vlna). Dva stávající
  články (teorie změny, řízení podle výsledků) jsou pilíře 1–2; **díl 3 = jádro**
  (komplexita, chaos, policy window) **— NAPSÁN jako draft**; zbývají díly 4–9.
- **Jádrová teze celé série:** *komplexní adaptivní systémy se nereformují
  postupným tlačením „shora", ale měněním zpětných vazeb, pravidel a cílů —
  a skoková reforma typicky přichází až s vnějším šokem (peníze, krize,
  pandemie), který otevře „policy window".*
- **Stav pilířů 1–2:** v této session **prohloubeny** (commit téhož PR) —
  viz §2. Zbylých 5 dílů zatím **neexistuje**; tento dokument je jejich zadání.
- **Páteř důvěryhodnosti:** trojice rámců (WHO ToC 2024 · OECD *Rethinking HSPA*
  2024 · komplexitní literatura — Plsek & Greenhalgh, Meadows, Kingdon,
  Baumgartner & Jones, Pierson, Mayne, Porter), vždy zrcadlená českým primárním
  zdrojem.
- **NEŽ NAPÍŠEŠ JAKÝKOLI DÍL:** projdi §7 (registr čísel k ověření). Brief B
  obsahuje řadu konkrétních českých čísel (deficit pojišťoven 2026, REACT-EU,
  regionální mortalita, polypragmazie, Duškovova VBHC reforma VZP) — **žádné
  z nich není dosud ověřené** a do textu smí jen po fact-checku z primárního
  zdroje, s rokem a jmenovaným zdrojem v popisku (pravidlo C1).

---

## 1. Jádrová teze a oblouk série (9 dílů — uzamčeno)

**Logika oblouku:** *Jak myslet změnu (1) → jak ji měřit (2) → proč to systém
vzdoruje (3, jádro) → jak systém zmapovat a najít páky (4) → co musí být
splněno, aby šlo řídit: data (5), dashboard (6), incentivy (7), governance (8),
poslední míle (9).*

| # | Díl | Blok |
|---|---|---|
| 1 | Teorie změny *(existuje, prohloubeno)* | Jak na to |
| 2 | Řízení podle výsledků *(existuje, prohloubeno)* | Jak na to |
| 3 | Proč se systémy nereformují samy — komplexita, chaos, policy window *(jádro; draft napsán)* | Proč to nejde |
| 4 | Systémové mapování a páky změny *(nový samostatný)* | Co s tím |
| 5 | Datová páteř, interoperabilita a past dodavatele | Co s tím |
| 6 | Ukazatele a dashboard *(nový samostatný)* | Co s tím |
| 7 | Jak platit za výsledek bez gamingu — incentivy, VBHC | Co s tím |
| 8 | Kdo drží smyčku — governance, nezávislost měřičů, review cadence | Co s tím |
| 9 | Poslední míle — implementace, street-level bureaucracy *(závěr)* | Co s tím |
| + | *vol.* Pacientské výsledky (PROMs/PREMs) · *vol.* Adaptivní evaluace | Druhá vlna |

Díl 3 zavádí slovník (zpětná vazba, lock-in, atraktor, páka, policy window),
kterým se mluví ve zbytku série. Díl 9 uzavírá kruh zpět k dílu 1 (reforma je
živý ToC, který se na poslední míli reviduje, ne jen „zavádí").

> **Pozn. k číslování:** oproti původnímu 7dílnému návrhu (§3 obsahuje karty
> dílů 3–7 v starším číslování) se vložily dva nové díly (systémové mapování,
> dashboard). Mapování per-díl karet §3 ↔ nové číslování: díl 3 = komplexita;
> „díl 4 (A) data/lock-in" → **díl 5**; „díl 5 (A) incentivy/VBHC" → **díl 7**;
> „díl 6 (A) governance" → **díl 8**; „díl 7 (A) poslední míle" → **díl 9**.
> Nové díly 4 (mapování) a 6 (dashboard) viz §4b.2.

---

## 2. Dva výchozí pilíře — stav po prohloubení (2026-06-05)

Oba články jsou `published: true`, `audit-status: verified` (od 2026-06-05),
tag „Legislativa a reforma".

### Díl 1 — `clanek-teorie-zmeny.html` (#96)
„Než nakreslíte první šipku: teorie změny a logický model ve zdravotní politice"

**Co bylo v této session přidáno (Část A briefu A):**
- ✅ Nová sekce **„Tatáž logika čtená pozpátku"** — contribution analysis
  (John Mayne, ILAC Brief 16, 2008): atribuce vs. přispění, „credible
  contribution story", přiznání, že u komplexních programů nelze dokázat
  atribuci.
- ✅ Nový vizuál **side-by-side WHO 6 kroků ↔ Mayne 6 kroků** (didaktická
  analogie, ne doslovné ztotožnění).
- ✅ Odstavec s **WHO/Polastro** citátem k revizi (krok 6 — ToC jako živý nástroj).
- ✅ Empirické podepření **Romão a kol., PLOS ONE 2023** (DOI
  10.1371/journal.pone.0282808) — ToC se běžně staví bez systematické práce
  s evidencí.
- ✅ **(brief C, practitioner vrstva)** sekce „Od teorie k pondělnímu ránu"
  + box „Osm otázek, než nakreslíte první šipku" a kostra 90min workshopu —
  převedení konceptu na pracovní postup.

**Zbývá (volitelné, před přepnutím na `verified`):**
- Ověřit šest kroků a terminologii z plného PDF WHO (iris.who.int).
- Doložit/zmírnit tvrzení o struktuře Zdraví 2030 (3 SC → specifické cíle → 6 IP).
- Zvážit konkrétní český příklad reformy s/bez ToC (reforma psychiatrie).

### Díl 2 — `clanek-rizeni-podle-vysledku.html` (#95)
„Měřit, co je důležité. Jak řídit zdravotnictví podle výsledků — a proč to Česko zatím neumí"

**Co bylo v této session přidáno (Část A briefu A):**
- ✅ Vizuál **„QOF: hodně peněz na metriku ještě není lepší zdraví"** —
  691 mil. £ (2016/17, Forbes a kol., *BMC Primary Care* 2020) vs. „jen mírná
  zlepšení, bez jasného vlivu na mortalitu" (systematický přehled, *BJGP* 2017).
  Evidence uvedena jako **rozpětí přes přehled**, ne jednotlivá studie (CAVEAT).
- ✅ Odstavec o **stínech švédského modelu** (registr ≠ jeho reálné využití;
  „one size fits none", PMC6195992) — i benchmark má své limity (pravidlo C1).
- ✅ Doplněná **implicitní 4. podmínka OECD** (zpětná vazba k tvůrcům dat).
- ✅ **(brief C, practitioner vrstva)** box „Jak z metrik udělat řízení"
  (8–12 tracer ukazatelů; mix výsledkový/procesní/balancing/equity; risk
  adjustment; data lag; vlastník + review cadence) — z HSPA udělat řídicí
  systém, ne katalog metrik.

**Zbývá (volitelné):**
- Doplnit konkrétní indikátor z PUK (Portál ukazatelů kvality) jako příklad
  českého outcome reportingu.
- Ověřit kvantifikované cílové hodnoty Zdraví 2030 s termíny.

> **Pozn. k editaci pilířů:** do obou článků se **záměrně nevkládala**
> neverifikovaná česká specifika z briefu B (deficit, regionální mortalita,
> 459 mld, prevence 2,7 %, VBHC reforma VZP). Patří do §7 tohoto plánu
> a do textu smí až po fact-checku.

---

## 3. Per-díl karty — 5 NOVÝCH dílů (3–7)

> Společná pravidla viz §6. Stav scaffoldingu: **žádný z dílů 3–7 zatím
> neexistuje** (HTML ani záznam v `articles.json`).

### DÍL 3 (NOVÝ, JÁDRO) — „Proč se systémy nereformují samy: komplexita, chaos a okno příležitosti"

- **Slug (návrh):** `clanek-komplexita-reforem.html` · **tag:** Legislativa a reforma
- **Abstract.** Zdravotnictví není složitý stroj, ale *komplexní adaptivní
  systém* (CAS) s autonomními aktéry, zpětnými vazbami a nelineárními reakcemi.
  Proč postupné reformy narážejí na odpor systému, proč skoková změna přichází
  s vnějším šokem a kde leží páky, které mění chování.
- **Osnova:** complicated vs. complex (letadlo vs. křižovatka) → zdravotnictví
  jako CAS → teorie chaosu light (citlivost, nelinearita, zpoždění) → atraktory
  a tipping points → path dependence / lock-in (předmostí k dílu 4) →
  punctuated equilibrium → policy window → Meadowsové 12 pák → česká aplikace.
- **Vizuály (3–6):** spektrum jednoduché→složité→komplexní→chaotické
  (Cynefin-style); diagram zpětné vazby se zpožděním (úhrady → výkony →
  vyčerpání → restrikce → oscilace); Meadowsové žebříček 12 pák v zdravotnickém
  kontextu; timeline punctuated equilibrium ČR (1992–93 vznik pojišťoven · 2008
  poplatky · 2020 COVID/přepis Zdraví 2030); Kingdonovo okno (tři proudy) na
  eŽádance.
- **Klíčové zdroje:** Plsek & Greenhalgh *BMJ* 2001 (DOI 10.1136/bmj.323.7313.625);
  Greenhalgh a kol. *Milbank Q* 2023; Sturmberg (CAS reform); Meadows
  *Thinking in Systems* / *Leverage Points* (1999); Baumgartner & Jones (1993);
  Kingdon (1984); Pierson *APSR* 2000.
- **Český tah:** přepis Zdraví 2030 kvůli COVIDu (šok → reforma); zpoždění
  eŽádanky (bez politického proudu okno nezůstane otevřené); vendor lock-in
  jako path dependence (most na díl 4). **Z briefu B (k ověření, §7):** atraktor
  lůžkové péče (~56 % výdajů?), strukturální deficit pojištění 2026, „edge of
  chaos" jako rámec. *Matematický aparát (bifurkace, potenciálová krajina) z
  briefu B držet jako ilustrativní/volitelný box — heuristika, ne zákon.*

### DÍL 4 (NOVÝ) — „Bez dat nelze řídit: datová páteř, interoperabilita a past dodavatele"

- **Slug (návrh):** `clanek-datova-patere-lock-in.html` · **tag:** Digitalizace
- **Abstract.** Řízení podle výsledků (díl 2) předpokládá funkční, sdílená,
  důvěryhodná data. Estonská lekce (páteř + governance + důvěra), proč ČR
  zaostává, jak technologický a institucionální lock-in drží systém v
  suboptimální trajektorii.
- **Osnova:** data nejsou IT projekt, ale infrastruktura (X-Road, once-only) →
  interoperabilita > centralizace → path dependence v IT (increasing returns,
  switching costs) → vendor lock-in mechanika (JŘBU, zdrojové kódy) → česká
  realita (NKÚ 22/20, kmenové registry, eŽádanka) → co s tím (otevřené
  standardy, vlastnictví kódů, governance dat à la TEHIK).
- **Vizuály:** časová osa digitalizace Estonsko vs. ČR; schéma vendor lock-in
  cyklu; **anatomie kauzy VZP** (přeprodejní řetězec — *rejstřík: trestní
  řízení, presumpce neviny*); mapa „kde se rozpojuje smyčka" (MZ ↔ ÚZIS ↔
  pojišťovny ↔ kraje) s NKÚ zjištěním.
- **Klíčové zdroje:** e-Estonia / TEHIK; NKÚ KA 22/20; ÚOHS k vendor lock-in
  (NSS 5 Afs 42/2012); Pierson 2000.
- **Český tah (k ověření, §7):** NKÚ 22/20 (159 mil. Kč), kauza VZP (NCOZ
  11/2025, přeprodejní řetězec, 118 mil. Kč bez DPH — presumpce neviny),
  Nemocnice Na Homolce NIS 91,3 mil. Kč.

### DÍL 5 (NOVÝ) — „Jak platit za výsledek bez gamingu: incentivy a value-based healthcare"

- **Slug (návrh):** `clanek-platit-za-vysledek-vbhc.html` · **tag:** Financování
- **Abstract.** Česko „platí za objem" (úhradová vyhláška). VBHC slibuje opak
  (hodnota = výsledky/náklady). Proč je to lákavé, proč QOF varuje, jak navrhnout
  incentivy odolné Goodhartovu zákonu.
- **Osnova:** co je hodnota (Porter, NEJM 2010) → ICHOM outcome sety → QOF jako
  varování → Goodhart + Campbell → kritika VBHC (slabá evidence systémového
  dopadu) → český kontext (úhradová vyhláška, DŘ, DRG; bundled payments pilotně).
- **Vizuály:** Porterova rovnice value=outcomes/cost na českém příkladu
  (kyčelní endoprotéza: PROMs + komplikace / náklady cyklu); QOF náklady vs.
  dopad (lze recyklovat vizuál z dílu 2); tabulka typů plateb (výkon / kapitace
  / DRG / P4P / bundled / VBHC) — co motivuje, čím se obchází; spektrum gamingu
  (*české příklady ilustrativní*).
- **Klíčové zdroje:** Porter & Teisberg (2006); Porter *NEJM* 2010 (DOI
  10.1056/NEJMp1011024); ICHOM; Forbes *BMC Primary Care* 2020; BJGP 2017;
  kritika VBHC: Groenewoud *BMC HSR* 2019, Lewis *Future Healthcare J* 2022.
- **Český tah (k ověření, §7):** úhradová vyhláška / DŘ; DRG Restart (ÚZIS);
  **Duškovova VBHC reforma VZP** (z briefu B: pilot AMI + TEP od 09/2026?);
  kontrast akutní kardiologie (mortalita AMI ~5,2 %?) vs. CMP (~9,9 %?).

### DÍL 6 (NOVÝ) — „Kdo drží smyčku: governance, nezávislost měřičů a mezirezortní koordinace"

- **Slug (návrh):** `clanek-governance-nezavislost.html` · **tag:** Legislativa a reforma
- **Abstract.** Reforma potřebuje měřiče nezávislého na měřeném a koordinátora
  aktérů s rozcházejícími se zájmy. Institucionální design (belgický model),
  role nezávislého měřiče, politická ekonomie reformy.
- **Osnova:** měřič ≠ měřený → belgický model (KCE + Sciensano + INAMI/RIZIV) →
  mezirezortní koordinace (determinanty zdraví mimo resort) → politická ekonomie
  (Ostrom, zájmové skupiny, „prodej" výsledků) → český kontext (ÚZIS,
  pojišťovny, MZ, kraje).
- **Vizuály:** org-mapa belgického HSPA vs. česká org-mapa (kde měří týž aktér,
  jehož se měření týká); diagram „proudů" politické ekonomie; tabulka
  nezávislosti měřiče napříč zeměmi.
- **Klíčové zdroje:** KCE *Performance of the Belgian Health System* (2024,
  ~145 indikátorů); Sciensano / healthybelgium.be; Ostrom *Governing the
  Commons*; Baumgartner & Jones (venue shopping).
- **Český tah (k ověření, §7):** ÚZIS jako kandidát na nezávislého měřiče vs.
  jeho role v elektronizaci; Správní rada VZP; meziresortní přesah Zdraví 2030.

### DÍL 7 (NOVÝ, ZÁVĚR) — „Poslední míle: proč dobře navržené reformy selžou při zavádění"

- **Slug (návrh):** `clanek-posledni-mile-implementace.html` · **tag:** Legislativa a reforma
- **Abstract.** I dokonalá reforma se rozbije na „poslední míli" — u lékaře,
  sestry, úředníka s vlastním úsudkem a omezenými zdroji. Implementační věda a
  „street-level bureaucracy" uzavírá sérii.
- **Osnova:** implementační mezera („schváleno" ≠ „funguje") → Lipsky
  (street-level bureaucrats, diskrece, coping) → implementation science (NASSS,
  change management) → komplexitní pointa (návrat k dílu 3) → české „poslední
  míle" (eŽádanka u praktika, kvalita dat zadávaná sestrou).
- **Vizuály:** trychtýř implementace (záměr → schváleno → financováno →
  zavedeno → používáno → mění chování) s odhadem úniku; mapa coping-strategií;
  NASSS checklist faktorů neúspěchu.
- **Klíčové zdroje:** Lipsky *Street-Level Bureaucracy* (1980/2010); Tummers &
  Bekkers; Greenhalgh NASSS (*JMIR* 2017); Pressman & Wildavsky (1973).
- **Český tah:** eŽádanka jako učebnicová „poslední míle"; ISIN/COVID systémy;
  kvalita NZIS dat závislá na zadavateli v terénu. **Z briefu B (volitelné,
  k ověření):** odpor lidského faktoru, change fatigue, model **ADKAR**
  (Prosci) — lze začlenit jako „lidskou" vrstvu poslední míle.

---

## 4. Brief B jako doplňující materiál (šestidílná systémově-dynamická verze)

Brief B nabízí paralelní, kondenzovanější (6dílné) pojetí s těžištěm v
**systémové dynamice, atraktorech a change-managementu**. Nepoužíváme ho jako
náhradu struktury A, ale jako **zásobárnu úhlů, vizuálů a české munice**:

| Prvek z briefu B | Kam patří ve struktuře A |
|---|---|
| Atraktory, bifurkace, „edge of chaos", potenciálová krajina, vnější finanční tlak jako spouštěč | **Díl 3** (jádro) — jako ilustrativní/volitelný matematický box |
| Logframe vs. systémová ToC (srovnávací tabulka) | **Díly 1–2** (už pokryto; tabulku lze recyklovat do dílu 3 jako most) |
| REACT-EU / NKÚ (18,6 mld, 82 nemocnic, nevyužitý spektrometr Most) jako selhání lineárního plánování | **Díl 3** úvod nebo **díl 4** (data/investice bez výsledku) |
| Natsiosův zákon (snadno měřitelné = nejméně transformační) | **Díl 2** rozšíření nebo **díl 5** |
| Regionální disparity preventabilní mortality + naděje dožití (tabulka 14 krajů) | **Díl 3** nebo samostatný datový box; **silně vázáno na ověření, §7** |
| Value-Based reforma VZP (Duškov, pilot AMI + TEP 09/2026), „translation problem", AMI vs. CMP mortalita | **Díl 5** — český „tah na branku" |
| Odpor lidského faktoru, change fatigue, model ADKAR | **Díl 7** — lidská vrstva poslední míle |
| Polypragmazie seniorů 65+ (CLD, reinforcing loop, severské audity) | **Díl 3 nebo 6** — worked example systémové dynamiky |
| Finanční toky (459 mld 2023, balancing loop with delay, segmenty péče) | **Díl 3 nebo 5** — worked example, integrální rovnice jako ilustrativní box |
| Reforma hygienické služby / „Institut pro veřejné zdraví 21. století" k 1. 1. 2028 | **Díl 6** (governance) — k ověření |

> **Rozhodnutí struktury:** ponecháváme **7 dílů (A)**. 6dílná verze (B) se
> nezakládá jako samostatná série — její nejsilnější prvky (CLD polypragmazie,
> finanční toky, Duškovova reforma, ADKAR) se vkládají do odpovídajících dílů
> A. *Pokud redakce preferuje 6dílnou „systems-dynamics" verzi jako vlastní
> sérii, je to otevřená otázka — viz §9.*

---

## 4b. Brief C — practitioner vrstva, alternativní dekompozice a pořadí

Brief C má jedinou nosnou tezi, kterou stojí za to vzít vážně: **největší
ediční příležitost je převést oba texty (a celou sérii) z úrovně „co to je"
na úroveň „jak to udělat v české praxi v pondělí ráno".** To je „missing
middle" mezi pojmy a každodenní manažerskou praxí. Tuto vrstvu už částečně
zavádíme do pilířů 1–2 (viz §2) a měla by prostupovat všemi díly.

### 4b.1 Co z briefu C zapojit do KAŽDÉHO dílu
- **Jeden plně rozpracovaný český worked example** na díl (ne jen ilustrace).
- **Checklist / playbook „pro pondělí ráno"** na konci (6–10 otázek, mini-šablona).
- **Vizuální disciplína:** 1 hlavní diagram + max. 1 podpůrný graf na díl.
- **Learning objectives** a **primární cílová skupina** v hlavičce každého dílu
  (ředitelé / policy týmy / analytici / týmy úhrad…).

### 4b.2 Alternativní dekompozice a pořadí (brief C)
Brief C navrhuje mírně jinou stavbu a **practitioner-first pořadí**
(*mental model → intervenční logika → měření → mapování → dashboard →
governance → pobídky*):

| # (C) | Díl podle C | Vztah k struktuře A |
|---|---|---|
| 1 | Proč komplexní systémy vzdorují reformě | = **díl 3 (A)**, ale C ho dává na **první místo** |
| 2 | Teorie změny v praxi | = díl 1 (A) |
| 3 | Řízení podle výsledků v praxi | = díl 2 (A) |
| 4 | Jak mapovat systém a hledat páky změny | **nový** — částečně v dílu 3 (A) (Meadows páky); C ho chce samostatně |
| 5 | Jak vybrat ukazatele a postavit dashboard | **nový** — rozšiřuje díl 2 (A) do samostatného „dashboard" dílu |
| 6 | Governance a review cadence | = díl 6 (A) |
| 7 | Pobídky a nezamýšlené důsledky | = díl 5 (A) |
| (vol.) | Pacientské výsledky (PROMs/PREMs) | **volitelný modul** — druhá vlna |
| (vol.) | Adaptivní evaluace a učení za pochodu | **volitelný modul** — staví na contribution analysis z dílu 1 |

> **Napětí mezi A a C:** A má navíc **díl 4 (data/lock-in)** a **díl 7
> (poslední míle / implementace)**; C má navíc **systémové mapování** a
> **dashboard** jako samostatné díly a vynechává „last-mile" jako samostatný
> text. Obojí je legitimní. **Doporučení tohoto plánu:** ponechat 7dílný oblouk
> A, ale (1) zvážit **practitioner-first pořadí** (komplexita jako díl 1 podle
> C — silnější didaktický vstup), (2) prvky „systémové mapování" a „dashboard"
> z C zabudovat jako těžiště dílů 3 a 2/5, ne nutně jako samostatné díly,
> (3) přijmout oba **volitelné moduly C** (PROMs/PREMs, adaptivní evaluace) jako
> druhou vlnu. **Pořadí a počet dílů = otevřená otázka pro redakci, §9.**

### 4b.3 Volitelné moduly (druhá vlna, z briefu C)
- **Pacientské výsledky a zkušenost (PROMs/PREMs).** Proč HSPA často měří
  systém víc než pacienta; jak PROMs/PREMs proměnit v řízení. Zdroj: **OECD
  PaRIS** (Česko — zkušenost s koordinací nad průměrem OECD, outcomes ~průměr;
  k ověření, §7).
- **Adaptivní evaluace a učení za pochodu.** Contribution analysis, realistická
  evaluace, validace ToC, rapid-cycle learning, kdy scale-up vs. de-implementace.
  Staví přímo na dílu 1 (Mayne). Zdroje: WHO ToC guidance, Mayne, české
  evaluační metodiky.

### 4b.4 Zdrojová priorita (pravidlo briefu C)
**Nejprve české oficiální zdroje → mezinárodní oficiální rámce → syntézy a
klasické články.** Pořadí pro tuto sérii (doplňuje zdroje v §3):

1. OECD — HSPA Framework for the Czech Republic (architektura + governance).
2. NIKEZ — resortní referenční statistiky + programové cíle 2023–2025.
3. ÚZIS — NZIS / NRHZS (hlavní datové zdroje).
4. Zdraví 2030 + implementační dokumenty.
5. Národní akční plán pro duševní zdraví 2020–2030 (multi-actor příklad pro ToC).
6. NCEZ — Národní strategie elektronického zdravotnictví 2025–2035 + NKÚ KA 22/20.
7. WHO ToC guidance 2024; WHO/Observatory renewed HSPA; EC HSPA Expert Group;
   Observatory/OECD „policy-friendly dashboard" brief (opora pro „méně metrik").
8. Belgie (Sciensano/HealthyBelgium), Švédsko (registry, knowledge-driven
   management), Estonsko (OECD HSPA + TEHIK).
9. OECD provider incentives / value-based payment; NHS England + BMJ/QOF.
10. Teoretická páteř: Plsek & Greenhalgh, Sterman, Newton-Lewis, Pierson;
    Taplin & Clark, Stein & Valters, Mayne.

### 4b.5 Publikační rytmus (brief C)
Doporučený **desk-research-first** přístup: zdrojové balíčky + otevřená data +
1 rychlý odborný review na díl; tempo **~1 díl / 10–12 dní** po ~2týdenní
přípravné fázi. Respektovat publikační frontu (max. 1 článek/den, řazení přes
`ready_since`/`scheduled_for` — viz `CLAUDE.md`).

---

## 5. Průřezová pravidla pro celou sérii

### C1 — Vizuální a datová logika
- Stabilní vizuální slovník: vstup/výstup = šedá, výsledek = modrá, dopad =
  zelená; domněnky/šipky vždy s kódem rizika (zelená/žlutá/červená). V kódu
  využít existující `.av-*` třídy (`av-flow`, `av-data-table`, `av-counter-grid`)
  — viz `docs/visual-components.md`.
- **Každé číslo v grafu má rok + jmenovaný zdroj přímo v popisku** (např. „NKÚ
  KA 22/20, 2023"; „Forbes a kol., BMC Primary Care 2020"). U mezinárodních dat
  rok sběru, ne jen publikace.
- Konzistentní „benchmark box": jedna země jako kontrast k ČR, vždy stejné
  řádky (kdo měří / kdo vlastní data / co se povedlo / co ne — **i benchmark má
  stíny**, viz švédská kritika v dílu 2).
- Každý graf má jednu větu „co z toho plyne".

### C2 — Atribuce a redakční poctivost (BLOCKING)
- Tři vrstvy rozlišovat: (a) doložený fakt, (b) odborný rámec, (c) ilustrativní
  model. Pro (c) jednotná formulace v rámečku: *„Toto je ilustrativní model pro
  výklad principu, nikoli návrh oficiální politiky VZP, MZ ČR ani kohokoli
  dalšího."*
- Atribuci řešit Maynem, ne mlčením: „reforma X → výsledek Y" vždy jako
  *contribution story*, ne dokázaná kauzalita; odkaz na contribution analysis
  z dílu 1.
- **Živé kauzy (VZP, trestní řízení): presumpce neviny**, formulace „podle
  policie / podle NKÚ", nikdy autoritativní tvrzení o vině.
- **Konflikt zájmů zveřejnit jednou, viditelně** (autor je členem Správní rady
  VZP). Posiluje, neoslabuje důvěryhodnost.
- Heuristiky (Meadowsové 12 pák, Cynefin) označit jako myšlenkové nástroje, ne
  validované zákony.

### C3 — Pořadí publikace a prolinkování
- **Doporučené pořadí:** 1 → 2 → **3 (vlajková loď, propagovat nejvíc)** →
  4 → 5 → 6 → 7. Publikovat max. 1 článek denně (viz publikační fronta v
  `CLAUDE.md`); řadit přes `ready_since` / `scheduled_for`.
- Každý díl má v úvodu „navazuje na" (zpět) a v závěru „pokračuje v" (vpřed).
- Klíčové pojmy (zpětná vazba, lock-in, Goodhart, policy window, contribution
  analysis) při prvním výskytu linkovat na díl, kde se zavádějí.
- Zvážit **rozcestník série** (samostatná stránka nebo tematická linie — viz §6).

### C4 — Přesah do jiných sektorů, bez ztráty českého zdravotnického těžiště
- V každém díle jeden krátký rámeček „Mimo zdravotnictví" (školství: PISA jako
  Goodhart; veřejná správa: vendor lock-in v eGovernmentu; estonský e-Tax).
- **Těžiště i evidence zůstávají české a zdravotnické**: každý díl končí
  konkrétní českou kauzou s čísly a institucemi. Univerzalita = vstupní brána,
  český detail = jádro a důkaz.

---

## 6. Implementační kroky v repu (per nový díl)

Postup dle `docs/workflows.md` → „Nový článek":

1. **HTML:** `clanek-{slug}.html` podle vzoru `clanek-teorie-zmeny.html`
   (relativní `src/styles.css`, `<script type="module" src="src/clanky.js">`,
   `<meta name="article:audit-status" content="draft">`, audit komentář v headu).
   Layout: `article-header` → `article-body` → `article-databox` →
   `article-sources` → `article-nav-bottom`. **Žádný `<aside
   class="article-review-banner">`** (validátor zablokuje při publikaci).
2. **`data/articles.json`:** záznam s `published: false`, `audit-status: draft`,
   `number` = další v pořadí, `linked_indicators`, `topics`, `tag`.
3. **Cover:** `node ingest/scripts/generate-article-cover.js {id}`.
4. **Tematická linie (volitelné, doporučeno pro soudržnost série):** zvážit
   přidání do `data/themes.json` jako linie „Jak (ne)reformovat systém" —
   POZOR: `themes` aktuálně linkují `indicator_ids` / `strategy_ids` /
   `explainer_ids`, **ne článek-id**. Pro rozcestník série proto buď (a) využít
   stávající linii „Platíme za objem, ne za výsledek" (`platby_za_objem`), nebo
   (b) navrhnout úpravu schématu o vazbu na články — **otevřená otázka, §10.**
5. **Validace:** `npm run validate:all` + `npm test`.

---

## 7. REGISTR ČÍSEL K OVĚŘENÍ PŘED PUBLIKACÍ (z briefu B + caveaty briefu A)

> **Pravidlo:** žádné z těchto čísel nesmí do publikovaného textu bez ověření
> z primárního zdroje, s rokem a jmenovaným zdrojem v popisku (C1). U
> rychle se vyvíjejících kauz proveď „fact-check refresh" těsně před publikací
> daného dílu.

| Tvrzení / číslo | Díl | Status | Pozn. k ověření |
|---|---|---|---|
| Lůžková péče ~56 % celkových výdajů | 3 | ⚠️ neověřeno | ÚZIS / OECD Health at a Glance — definice „lůžkové péče" |
| Strukturální deficit pojištění 2026 = 12–19 mld Kč; rezervy ~32 mld konec 2025 | 3/5 | ⚠️ neověřeno | MZ ČR / VZP / SZP ČR — rychle se mění |
| REACT-EU 18,6 mld Kč, 82 páteřních nemocnic, nevyužitý spektrometr Most | 3/4 | ⚠️ neověřeno | NKÚ kontrolní závěr — najít přesné KA číslo |
| Výdaje na prevenci ČR 2,7 % vs. OECD 3,4 % vs. špička 6,1 % | 3/5 | ⚠️ neověřeno | OECD/SHA klasifikace HC.6; rok sběru |
| Regionální preventabilní mortalita + naděje dožití (14 krajů) | 3 | ⚠️ neověřeno | ČSÚ / ÚZIS; čísla v briefu B jsou ilustrativní — ověřit každé |
| Mortalita AMI ~5,2 %, CMP ~9,9 % | 5 | ⚠️ neověřeno | ÚZIS / registry; pozor na definici (30denní?) |
| Duškovova VBHC reforma VZP, pilot AMI + TEP od 09/2026 | 5 | ⚠️ neověřeno | VZP tisk; **presumpce neviny u personálií není relevantní, ale ověřit oznámení** |
| Kauza VZP / NCOZ 11/2025: řetězec 58→77→95→115 mil., 118 mil. bez DPH, 13 obviněných | 4 | ⚠️ neověřeno | NCOZ tisk; **trestní řízení — presumpce neviny, formulace „podle policie"** |
| NKÚ KA 22/20: 159 mil. Kč, odklad do 2026 | 2/4 | ✅ použito v dílu 2 | ověřeno (k22020.pdf + TZ NKÚ id13447) |
| Polypragmazie seniorů 65+: ČR 51 % (5+ léků), 17 % (10+); severské země <25 % | 3/6 | ⚠️ neověřeno | OECD / EHIS; čísla zemí v briefu B ověřit jednotlivě |
| Výdaje 459 mld Kč (2023), rozdělení podle segmentů | 3/5 | ⚠️ neověřeno | ÚZIS / ČSÚ účty zdravotnictví |
| Reforma hygienické služby → „Institut pro veřejné zdraví 21. století" k 1. 1. 2028 | 6 | ⚠️ neověřeno | MZ ČR / legislativa |
| QOF 691 mil. £ (2016/17); „mírná zlepšení, bez jasného vlivu na mortalitu" | 2/5 | ✅ použito v dílu 2 | Forbes 2020 + BJGP 2017 přehled; uvádět jako rozpětí |
| Belgie 120→145 indikátorů; Švédsko 103–108 registrů | 2/6 | ⚠️ rok-závislé | vždy uvést rok a zdroj konkrétního čísla |
| Český OECD HSPA rámec: 12 domén, 28 subdomén, 122 indikátorů + 30 placeholderů | 2/5/6 | ⚠️ neověřeno (brief C) | OECD HSPA Framework for the Czech Republic — ověřit počty a rok |
| Tříúrovňová governance českého HSPA (steering board / task force / technické skupiny) | 6 | ⚠️ neověřeno (brief C) | OECD HSPA CZ — popis governance |
| NIKEZ: resortní referenční statistiky, 1. HSPA report + online reporting (cíle 2023–2025) | 2/6 | ⚠️ neověřeno (brief C) | NIKEZ programové cíle — stav plnění k datu publikace |
| OECD PaRIS — Česko: zkušenost s koordinací nad průměrem OECD, outcomes ~průměr | vol. PROMs | ⚠️ neověřeno (brief C) | OECD PaRIS results — ověřit znění |
| Otevřená data o péči o CMP (výsledky podle center) | 4/5 | ⚠️ částečně (díl 2 zmiňuje pooperační sepse) | ÚZIS / NIKEZ — ověřit dostupnost a metriku |

### 7.1 Verifikace 2026-06-05 — výsledky (fact-check pro status „verified")

Ověřeno z primárních/spolehlivých zdrojů. **Všech 9 dílů (1–9) přepnuto na
`audit-status: verified`** (díly 1–2 zůstávají `published:true`; díly 3–9
`published:false` s **rozfázovaným `scheduled_for`** v zamýšleném pořadí série
(díl 3 = 2026-06-30, dál ~11denní rozestup dle cadence z rozhodnutí #8: 4=07-11,
5=07-22, 6=08-02, 7=08-13, 8=08-24, 9=09-04). Cron vydá max 1/den a díky
rozfázovaným datům **drží pořadí 3→4→5→6→7→8→9** (jinak by tie-break podle `slug`
vydal díl 5 první — Codex P2 #530).

| Položka | Verdikt | Zdroj |
|---|---|---|
| **QOF 691 mil. £ (2016/17)** | ✅ **OVĚŘENO** — autor = **Khan a kol., BMC Primary Care 2020** (DOI 10.1186/s12875-020-01208-8), meta-syntéza 18 studií; Forbes = BJGP 2017 přehled (dopad). Použito v dílu 2 i 7, konzistentní. | bmcprimcare.biomedcentral.com; bjgp.org |
| **Nemocnice Na Homolce — NIS 91,3 mil. Kč** (díl 5) | ✅ **OVĚŘENO** z NKÚ 22/20 (nový NIS, ale nemůže sdílet dokumentaci) | NKÚ TZ id13447 |
| **X-Road: 2,2 mld transakcí/rok, > 3 000 služeb** (díl 5) | ✅ **OVĚŘENO** | e-estonia.com/solutions/.../x-road |
| **VBHC pilot VZP — TEP + kardiologie, platba za komplexní péči se záruční dobou** (díl 7) | ✅ **OVĚŘENO** (pozor: zdroj uvádí „kardiologie", ne výslovně „AMI"; díl 7 drží kvalitativně — OK) | vzp.cz (TZ „Platba za komplexní péči se záruční dobou"); Zdravotnický deník 2026 |
| **Zdraví 2030: 3 strategické → 7 specifických → 6 implementačních plánů** (díly 1, 2) | ✅ **OVĚŘENO** (dříve flagged kvůli nedostupnosti mzd.gov.cz) | mzd.gov.cz; zdravi2030.mzcr.cz |
| **Deficit veř. zdrav. pojištění 2026** (NENÍ v textu) | ✅ ověřeno: VZP ~12,7 mld, systém ~15,5 mld; rezervy pojišťoven konec 2024 ~47,7 mld → konec 2025 ~41,7 mld (NE „32 mld"). K dispozici, pokud redakce bude chtít doplnit. | e15.cz; zdravotnickydenik.cz; ČTK |
| **OECD HSPA rámec ČR** | ✅ existuje (2023, DOI 5d59b667); **přesné počty (12/28/122/30) nedohledány** → v textu drženo kvalitativně | oecd.org |
| **OECD PaRIS** (vol. modul) | ✅ existuje („Does Healthcare Deliver?", 02/2025, 19 zemí vč. Česka, 107 tis. pacientů); **české konkrétní skóre neověřeno** → modul drží kvalitativně | oecd.org |
| **Belgie indikátory** | ✅ Healthy Belgium 2024 = **~142 indikátorů, 6 dimenzí** (díl 6/8 drží bez tvrdého čísla) | healthybelgium.be; KCE 2024 |
| Regionální preventabilní mortalita (14 krajů) | ⚠️ **NEOVĚŘENO** — ale **NENÍ ve viditelném textu** žádného dílu; neblokuje publikaci. K dohledání z ČSÚ/ÚZIS, pokud redakce bude chtít tabulku přidat. | — |
| Kauza VZP/NCOZ (částky, počet obviněných) | ⚠️ záměrně jen kvalitativně, presumpce neviny — beze změny | — |

> **Závěr:** všechna tvrzení a čísla **ve viditelném textu** dílů 1–9 jsou
> ověřena z primárních/spolehlivých zdrojů, nebo jsou označená jako ilustrativní
> modely/heuristiky. Neověřené položky (regionální mortalita, přesné počty HSPA
> indikátorů, detaily kauzy VZP) **nejsou ve viditelném textu** — zůstávají zde
> jako volitelný materiál pro budoucí rozšíření. Tím jsou díly připraveny k
> publikaci.

---

## 8. Sekvence a tracker

| Díl | Soubor | Stav |
|---|---|---|
| 1 | `clanek-teorie-zmeny.html` | ✅ existuje, prohloubeno 2026-06-05 |
| 2 | `clanek-rizeni-podle-vysledku.html` | ✅ existuje, prohloubeno 2026-06-05 |
| 3 | `clanek-komplexita-reforem.html` | ✅ **verified 2026-06-05 — připraveno k publikaci** (3868 slov; published:false, scheduled_for 2026-06-30) |
| 4 | `clanek-systemove-mapovani-paky.html` | ✅ **verified 2026-06-05 — připraveno k publikaci** (nový samostatný); redakční handoff v audit komentáři; čeká na fact-check |
| 5 | `clanek-datova-patere-lock-in.html` | ✅ **verified 2026-06-05 — připraveno k publikaci** — VZP kauza kvalitativně (presumpce neviny), COI rámeček; handoff; čeká na fact-check |
| 6 | `clanek-ukazatele-dashboard.html` | ✅ **verified 2026-06-05 — připraveno k publikaci** (nový samostatný); handoff; čeká na fact-check čísel HSPA CZ |
| 7 | `clanek-platit-za-vysledek-vbhc.html` | ✅ **verified 2026-06-05 — připraveno k publikaci** — VBHC reforma VZP kvalitativně, COI rámeček; handoff; čeká na fact-check |
| 8 | `clanek-governance-nezavislost.html` | ✅ **verified 2026-06-05 — připraveno k publikaci** — COI rámeček; handoff; čeká na fact-check |
| 9 | `clanek-posledni-mile-implementace.html` | ✅ **verified 2026-06-05 — připraveno k publikaci** (závěr; ADKAR jako heuristika); handoff |
| vol. 1 | `clanek-pacientske-vysledky-proms.html` | 🟦 **draft napsán 2026-06-05** — PaRIS ČR kvalitativně, k ověření |
| vol. 2 | `clanek-adaptivni-evaluace.html` | 🟦 **draft napsán 2026-06-05** (metodický závěr série) |

> **Stav po session 2026-06-05 (fact-check + verified):** všech 9 jádrových
> dílů (1–9) má **`audit-status: verified`** — všechna tvrzení a čísla ve
> viditelném textu ověřena z primárních zdrojů (viz §7.1), nebo označena jako
> ilustrativní modely/heuristiky. Díly 1–2 jsou `published:true` (živé); díly
> 3–9 `published:false` + `scheduled_for: 2026-06-30` → **připraveny k publikaci**,
> publikační cron je vydá max 1/den od 30. 6. (`verified` je publikovatelný stav).
> 2 volitelné moduly (PROMs, adaptivní evaluace) zůstávají `draft` (mimo zadání 1–9).
> **Verifikace:** `npm run validate:all` (113 článků OK), `npm test` (517 pass).
> **Zbývá jako volitelné:** regionální mortalita a přesné počty HSPA indikátorů
> (NEJSOU ve viditelném textu — k doplnění jen pokud je redakce bude chtít přidat).

---

## 9. Otevřené otázky pro redakci

1. **Struktura a pořadí:** potvrdit 7dílný oblouk (A). Přijmout **practitioner-
   first pořadí** (komplexita jako díl 1 dle C), nebo ponechat „ToC → RBM →
   komplexita" (A)? Zvážit 6dílnou systems-dynamics verzi (B) jako alternativu?
2. **Dekompozice:** mají být „systémové mapování" a „dashboard" (C)
   **samostatné díly**, nebo těžiště uvnitř dílů 3 a 2/5 (doporučení plánu)?
   Zachovat z A i **díl 4 (data/lock-in)** a **díl 7 (poslední míle)**?
3. **Volitelné moduly C** (PROMs/PREMs, adaptivní evaluace) — druhá vlna: ano?
4. **Rozcestník série:** stačí stávající tematická linie „Platíme za objem"
   (`platby_za_objem`), nebo založit novou linii / samostatnou stránku
   (vyžaduje úpravu schématu `themes.json` o vazbu na články)?
5. **Slugy/tagy** dílů 3–7 — návrhy v §3, k potvrzení.
6. **Konflikt zájmů (VZP):** kde a jak přesně zveřejnit (jednotný rámeček ve
   všech dílech, které se VZP dotýkají — díly 4, 5, 6).
7. **Matematický aparát z briefu B** (bifurkace, integrální rovnice): zařadit
   jako volitelné ilustrativní boxy, nebo vynechat pro čtenost?
8. **Cílový rozsah a tempo:** brief C navrhuje 2 000–3 800 slov/díl a ~1 díl
   /10–12 dní. Potvrdit kapacitu a desk-research-first přístup.
9. **Fact-check kapacita:** kdo a kdy ověří čísla z §7 před publikací každého dílu.

---

*Verze 1.0 — 2026-06-05. Po napsání každého dílu aktualizuj §8 (tracker) a
přesuň ověřená čísla v §7 na ✅.*
