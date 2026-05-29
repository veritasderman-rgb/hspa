// Generates 13 manifest priority substránky to manifest/priorita-NN-slug.html
// from inline content data. Run: node scripts/generate-manifest-substranky.js
//
// Each priorita gets:
//   - Hero (tag + title + deck)
//   - „Proč to záleží" sekce (background + data odkazy)
//   - „Co konkrétně udělat" sekce (legislativní páky)
//   - „Inspirace ze světa" cards (země s detailem)
//   - „Harmonogram" timeline (volební cyklus → roky)
//   - CTA zpět na hlavní manifest
//
// Layout reusuje portálové brand classes (.topbar, .module-nav, .masthead-strip).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'manifest');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Datový kontrakt — pro „Související data" karty na substránkách čteme reálné
// hodnoty indikátorů, ať čísla nikdy nedrift­ují oproti zbytku portálu.
const INDICATORS = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  return Object.fromEntries((raw.indicators ?? []).map(i => [i.id, i]));
})();

// České formátování čísla (desetinná čárka).
const cz = (n) => (n === null || n === undefined) ? '' : String(n).replace('.', ',');

// Vyrenderuje sekci „Související data HSPA Monitoru" z pole id indikátorů.
// Hodnoty + benchmark tahá z data/indicators.json (single source of truth).
function renderDataSection(ids) {
  if (!Array.isArray(ids) || !ids.length) return '';
  const cards = ids.map(id => {
    const ind = INDICATORS[id];
    if (!ind) { console.warn(`  ⚠ indikátor ${id} nenalezen — karta přeskočena`); return ''; }
    const b = ind.benchmark ?? {};
    const benchParts = [];
    if (b.oecd !== undefined && b.oecd !== null) benchParts.push(`OECD ${cz(b.oecd)}`);
    if (b.eu !== undefined && b.eu !== null) benchParts.push(`EU ${cz(b.eu)}`);
    const bench = benchParts.length ? benchParts.join(' · ') : `Zdroj: ${ind.source?.name ?? '—'}`;
    const unit = ind.unit ? ` ${ind.unit}` : '';
    return `
        <a class="manifest-data-card" href="../indicator.html?id=${id}" data-indicator-id="${id}" data-indicator-domain="manifest">
          <div class="manifest-data-card-id">${id}</div>
          <div class="manifest-data-card-value">${cz(ind.value)}${unit}</div>
          <div class="manifest-data-card-name">${ind.name}</div>
          <div class="manifest-data-card-bench">${bench} · ${ind.year}</div>
        </a>`;
  }).filter(Boolean).join('');
  if (!cards) return '';
  return `
    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Související data</div>
      <h3 class="manifest-sub-section-h">Co k tomu říká HSPA Monitor</h3>
      <p>Tato priorita se opírá o měřitelné indikátory. Hodnoty jsou živé — kliknutím se dostanete na detail indikátoru s trendem a metodikou.</p>
      <div class="manifest-priority-data-grid">${cards}
      </div>
    </section>
`;
}

const PRIORITIES = [
  {
    num: 1, slug: 'za-stejne-penize-vice-muziky',
    name: 'Za stejné peníze více muziky',
    deck: 'České zdravotnictví dostává zhruba 9 % HDP. Otázkou není „kolik", ale „co za to". Úhradová vyhláška, kapitační platby a DRG určují, kde peníze končí — a stávající nastavení odměňuje objem, ne kvalitu.',
    why: 'Stávající úhradový systém je hybrid kapitace + DRG + výkonových plateb. Pro nemocnice je optimální plnit DRG kvóty, pro praktiky držet kapitační kmen. Žádný z těchto mechanismů systematicky neodměňuje měřitelně lepší výsledek (mortalita po AMI, re-admise, kontrolu chronických nemocí). Reforma znamená posun k value-based úhradám — část platby vázaná na outcome.',
    quote: 'Kapitační platba neměří kvalitu. DRG měří case-mix, ne outcome. Bez třetí složky vázané na výsledek systém nikdy nezačne odměňovat zlepšování.',
    actions: [
      '<strong>Value-based DRG add-on</strong> — 5–15 % DRG platby vázaná na 30d mortalitu, re-admise a komplikace (podle pracoviště, ne podle pacienta)',
      '<strong>Bonifikace praktiků</strong> za měřitelně lepší výsledky u dispenzarizovaných pacientů (kontrola hypertenze, diabetu, dyslipidemie)',
      '<strong>Audit úhradových smluv</strong> — publikovat každoroční úhradovou vyhlášku v auditní formě s benchmarkem',
      '<strong>Sankce za odmítnutí pacienta</strong> bez objektivního důvodu (smluvní nemocnice nesmí odmítat)',
    ],
    inspirations: [
      { flag: '🇬🇧 UK', name: 'CQUIN', text: '<strong>Commissioning for Quality and Innovation</strong> — 1,25 % úhrad NHS je vázáno na specifické kvalitativní cíle (sepsis prevention, AKI screening, dementia care). Od 2009.' },
      { flag: '🇺🇸 USA', name: 'Medicare HVBP', text: '<strong>Hospital Value-Based Purchasing</strong> — 2 % DRG plateb vázáno na outcome (mortality 30d, HCAHPS, infections). Od 2012.' },
      { flag: '🇩🇪 Německo', name: 'G-DRG + Q&S Verfahren', text: 'Federální QI agentura IQTIG publikuje povinné kvalitativní indikátory pro 30+ klinických oblastí. Veřejně dostupné per-hospital benchmarky.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Audit současného úhradového systému + návrh value-based add-on pro 3 pilotní DRG (AMI, CMP, sepse)' },
      { time: 'Rok 2', text: 'Pilotní program ve 5 vybraných nemocnicích, sběr baseline dat' },
      { time: 'Rok 3', text: 'Rozšíření na 10 dalších DRG + bonifikace praktiků v kapitační smlouvě' },
      { time: 'Rok 4', text: 'Vyhodnocení dopadu na outcome (mortality, re-admise), úprava parametrů' },
    ],
  },
  {
    num: 2, slug: 'moznost-volby-bez-uplatku',
    name: 'Možnost volby bez úplatků a kulichů',
    deck: 'Pacient v Česku má teoreticky volbu pojišťovny a lékaře. V praxi je tato volba podlomená neexistencí srovnatelných informací, neformálními platbami a omezenou kapacitou vybraných pracovišť.',
    why: 'Volba bez informace není volba. Pacient před plánovaným zákrokem nezná čekací dobu, úspěšnost ani kvalitu v různých zařízeních. Přepis pacienta z fakultní nemocnice do okresní funguje jako trest — výsledek je rezignace na volbu. Neformální platby („obálky", „dary") jsou v některých specializacích strukturálně přítomné a fungují jako de-facto fronta s předskakováním.',
    quote: 'Volba pacienta není ústavní princip, dokud ji systém nepodpoří jasnými informacemi a sankcionováním přeskakování fronty.',
    actions: [
      '<strong>Publikování čekacích dob</strong> per pracoviště v reálném čase (jako v Británii NHS Choices)',
      '<strong>Trestnost neformálních plateb</strong> v rozšířené formě — anonymní whistleblower kanál pro pacienty',
      '<strong>Garance druhého názoru</strong> pojišťovnou hrazená pro vážné diagnózy (onkologie, kardiochirurgie)',
      '<strong>Smluvní povinnost pojišťovny</strong> zajistit dostupnost specialisty do 30 dnů od indikace praktikem',
    ],
    inspirations: [
      { flag: '🇬🇧 UK', name: 'NHS Choices', text: 'Pacient v NHS si vybírá nemocnici online — vidí čekací doby, infection rates, mortality, patient satisfaction (CQC inspekce). Volba má váhu, protože je transparentní.' },
      { flag: '🇩🇰 Dánsko', name: 'Treatment guarantee', text: 'Zákonná garance: pokud veřejný systém nezajistí péči do 30 dnů, pacient může jít do soukromé/zahraniční nemocnice na účet pojišťovny.' },
      { flag: '🇩🇪 Německo', name: 'Termin-Service-Stellen', text: 'Centrální telefonát kdy pacient žádá specialistu — pojišťovna do 5 dnů musí najít termín, jinak hradí pacientovi privátní cestu.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Legislativní úprava trestnosti neformálních plateb + anonymní whistleblower platforma' },
      { time: 'Rok 2', text: 'Publikování čekacích dob a kvalitativních metrik per IČO (pilot 3 specializace)' },
      { time: 'Rok 3', text: 'Garance dostupnosti specialisty do 30 dnů — pilot ve dvou krajích' },
      { time: 'Rok 4', text: 'Druhý názor jako standardní pojistná služba pro onkologii a kardiochirurgii' },
    ],
  },
  {
    num: 3, slug: 'zdravotnictvi-ve-sluzbach-pojistencu',
    name: 'Zdravotnictví ve službách pojištěnců',
    deck: 'Středobodem zdravotnictví musí být pojištěnec, ne ministerský úředník, lobbista ani primář. Práva pojištěnce — od digitálního zdravotního záznamu po reálnou dostupnost péče — jsou na prvním místě.',
    why: 'Současný systém je optimalizovaný pro provozovatele — pojišťovny minimalizují náklady, nemocnice maximalizují DRG, lékaři chrání svou autonomii. Pacient je v této rovnici brán jako jednotka, ne jako klient. Důsledek: dlouhé čekací doby, papírová dokumentace, opakovaná vyšetření při překladu, nedostupné sekundární názory.',
    quote: 'Reforma ve službách pojištěnce začíná otázkou: kdo pro koho pracuje? Pokud nedokážeme jasně odpovědět „pojišťovna pro pojištěnce", reforma nezačala.',
    actions: [
      '<strong>Digitální zdravotní záznam</strong> ve vlastnictví pacienta — přístup přes BankID, kontrola sdílení s lékaři',
      '<strong>Patient navigator service</strong> — pacient s vážnou diagnózou dostane „průvodce systémem" placeného z pojištění',
      '<strong>Mandatorní hlášení pacientských incidentů</strong> jako v aviaci (Patient Safety Incidents) — kultura učení z chyb, ne trestání',
      '<strong>Pojišťovna jako advokát pacienta</strong> — povinnost zajistit dostupnost; sankcionovaná za nesplnění',
    ],
    inspirations: [
      { flag: '🇫🇮 Finsko', name: 'Kanta service', text: 'Pacient vidí, kdo se na jeho data díval, kdy a proč. Plná kontrola nad sdílením, integrace e-Prescription + osobní záznam.' },
      { flag: '🇳🇱 Nizozemsko', name: 'Patient navigator', text: 'NIVEL Patient Federations — pacient s vážnou diagnózou dostane vyškoleného „advokáta" hrazeného pojišťovnou.' },
      { flag: '🇸🇪 Švédsko', name: '1177 Vårdguiden', text: 'Centrální telefonát + portál — pacient řeší cokoliv od triage po orientaci v systému, 24/7, hrazeno z daní.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Legislativní úprava vlastnictví zdravotních dat pacientem (analog GDPR pro health data)' },
      { time: 'Rok 2', text: 'Pilot navigator service pro onkologické pacienty ve 3 KOC' },
      { time: 'Rok 3', text: 'Patient Safety Incidents systém na celonárodní úrovni (povinné hlášení)' },
      { time: 'Rok 5', text: 'Pojišťovna jako advokát pacienta — měřitelné sankce za nedostupnost' },
    ],
  },
  {
    num: 4, slug: 'transparence',
    name: 'Transparence',
    indicators: ['ehealth_adoption', 'spokojenost_informovani'],
    deck: 'Data o českém zdravotnictví vycházejí jako roční PDF — zpoždění, žádné srovnání, neauditovatelné. Pacient před zákrokem nemá srovnatelné informace o úspěšnosti, čekací době a kvalitě péče v jednotlivých zařízeních.',
    why: 'Co se neměří, nelze zlepšit. ÚZIS publikuje ročenky 1–2 roky zpožděně, KZP publikuje PUK ale na úrovni jen vybraných indikátorů, MZČR vydává koncepce bez ověřitelných dat. Lékař volá nemocnice po telefonu protože nezná aktuální kapacity. Pacient před plánovaným zákrokem rozhoduje na anekdotách.',
    quote: 'Co se měří, lze zlepšit. Co se neměří, zůstává v anekdotě.',
    actions: [
      '<strong>Národní open-data portál zdravotnictví</strong> — anonymizovaná data per IČO, denní/týdenní frekvence, otevřené API',
      '<strong>HSPA rámec OECD</strong> jako oficiální měřítko kvality (Česko HSPA přijalo 2023, neimplementuje)',
      '<strong>Per-hospital kvalitativní metriky</strong> publikované veřejně (mortality, re-admise, komplikace, čekací doby)',
      '<strong>Pacient před zákrokem dostane comparison sheet</strong> svého pracoviště vs alternativ v kraji + ČR',
    ],
    inspirations: [
      { flag: '🇬🇧 UK', name: 'NHS Digital', text: '<strong>NHS Find a hospital</strong> — pacient si srovná nemocnice podle outcome, čekací doby, infection rates. Celostátní, denně aktualizováno.' },
      { flag: '🇺🇸 USA', name: 'CMS Hospital Compare', text: '<strong>Hospital Compare</strong> — Medicare srovnává nemocnice podle 100+ metrik (mortality, readmissions, patient experience). Veřejné, sankcionované.' },
      { flag: '🇸🇪 Švédsko', name: 'Nationella kvalitetsregister', text: 'Přes 100 klinických registrů, otevřené researchers, povinný reporting per pracoviště. Tradice od 70. let.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Legislativní povinnost ÚZIS publikovat data otevřeně + API; HSPA jako oficiální měřítko' },
      { time: 'Rok 2', text: 'Per-hospital metrika pro 10 klinických oblastí (AMI, CMP, onko chirurgie, …)' },
      { time: 'Rok 3', text: 'Comparison sheet pro pacienta před plánovaným zákrokem' },
      { time: 'Rok 5', text: 'Plně auditní stopa všech kvalitativních metrik na národní úrovni' },
    ],
  },
  {
    num: 5, slug: 'dostupne-leky',
    name: 'Dostupné léky běžné i moderní',
    indicators: ['vypadky_leciv_aktivni'],
    deck: 'Dostupnost léčiv v Česku má více vrstev nedostatků: nejednotné lékárny, neznámý doplatek předem, omezené pravomoci lékárníků, chybějící systematická politika orphan léků a 2 200 aktivních výpadků (vs 580 v 2019).',
    why: 'Léková dostupnost se za 7 let proměnila z přechodné anomálie ve strukturální slabost. SÚKL eviduje denně rostoucí počet hlášení o přerušení dodávek. 10–15 % postižených LP nemá v ČR registrovanou náhradu. Strukturální příčiny: globální (koncentrace výroby APIs v Asii) i domácí (malý trh, reexport, slabý Emergency Stock).',
    quote: 'Léky nejsou luxusní zboží. Strukturální výpadky znamenají, že systém přestal fungovat — a pacienti to vědí.',
    actions: [
      '<strong>Kurýrní rozvoz léků</strong> s lékárnickou kontrolou před výdejem',
      '<strong>Rozšíření pravomocí lékárníků</strong> — očkování proti chřipce, sezónní prevence, medication review (jako v UK NHS)',
      '<strong>Online srovnávač doplatků</strong> v reálném čase + vzdálené ověření dostupnosti',
      '<strong>Robustní Emergency Stock</strong> rozšířený na 500+ LP (nyní jen ~100 dle zákona 378/2007 §77)',
      '<strong>Orphan léky</strong> — samostatný fond, oddělená HTA metodika, předem stanovený strop nákladů na pacienta/rok',
    ],
    inspirations: [
      { flag: '🇬🇧 UK', name: 'NHS Community Pharmacy', text: '<strong>Community Pharmacy Contractual Framework</strong> — lékárníci očkují, poskytují prevenci, medication review. Plně hrazeno NHS.' },
      { flag: '🇧🇪 Belgie', name: 'Medication Review', text: 'Lékárník placený za roční review léků chronicky nemocných pacientů. Strukturální záchyt interakcí a nedosažitelnosti.' },
      { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Skotsko', name: 'SMC', text: '<strong>Scottish Medicines Consortium</strong> — oddělený HTA pro orphan a moderní léky, transparentní rozhodování, předem stanovený cap.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Novela LPOD (456/2025 Sb.) — efekt: kategorie LP s omezenou dostupností. EU Critical Medicines Act (COM 2024/138) doplnit do národního práva' },
      { time: 'Rok 2', text: 'Rozšíření Emergency Stock na 500+ LP + sankce za nehlášené přerušení' },
      { time: 'Rok 3', text: 'Online srovnávač doplatků v reálném čase + kurýr nemůže odmítnout' },
      { time: 'Rok 4', text: 'Rozšíření pravomocí lékárníků v očkování a prevenci' },
      { time: 'Rok 5', text: 'Orphan fond + samostatná HTA metodika operační' },
    ],
  },
  {
    num: 6, slug: 'zdravotne-socialni-pomezi',
    name: 'Zdravotně sociální pomezí',
    deck: 'Pacient po cévní mozkové příhodě, senior s demencí, terminálně nemocný v hospici — všichni padají do mezery mezi MZ a MPSV. „Sociální lůžko" v nemocnici znamená, že systém prohrál.',
    why: 'Česká nemoc je administrativně rozdělena mezi dvě ministerstva — zdravotnictví a práce a sociálních věcí. Na pomezí, kterým prochází pacient po CMP nebo senior s demencí, nikdo neoptimalizuje celek. V nemocnici zůstává „na sociálním lůžku" déle, než je medicínsky nutné. Sociální systém nedoplácí výkony, které by oddálily generování nákladů ve zdravotnictví.',
    quote: 'Pacient nežije v ministerstvu. Reforma propojuje oba systémy v rovině, ve které lidé skutečně žijí.',
    actions: [
      '<strong>Cross-financování ZP ↔ MPSV</strong> — pojišťovna může hradit sociální službu, pokud sníží zdravotní náklady (a naopak)',
      '<strong>Posílení domácí péče</strong> místo neoblíbených LDN — pacient v domácím prostředí',
      '<strong>Paliativní a hospicová péče</strong> jako standardní součást úhrad pro důstojný konec života',
      '<strong>Přítomnost rodiny v nemocnici</strong> jako základní právo bez výjimek (24/7, ne jen návštěvní hodiny)',
    ],
    inspirations: [
      { flag: '🇩🇰 Dánsko', name: 'Hjemmepleje', text: 'Domácí péče (hjemmepleje) je první volba pro seniory — nemocnice je výjimka, ne pravidlo. Obce a regiony spolu-financují.' },
      { flag: '🇳🇱 Nizozemsko', name: 'Buurtzorg', text: 'Komunitní ošetřovatelská služba — týmy 10–12 sester, samosprávné, plné scope (zdravotní + sociální). Mezinárodně replikováno.' },
      { flag: '🇬🇧 UK', name: 'Integrated Care Systems', text: 'NHS + Local Authorities (ekvivalent obcí + MPSV) sdílejí rozpočet pro chronickou péči. Cíl: žádné silos.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Mezirezortní zákon o integraci zdravotně-sociálních služeb (analog dánského modelu)' },
      { time: 'Rok 2', text: 'Cross-financování pilot pro CMP rehabilitaci a péči o seniory s demencí' },
      { time: 'Rok 3', text: 'Hospic + paliativní péče v plné úhradě pojišťoven' },
      { time: 'Rok 4', text: 'Přítomnost rodiny v nemocnici jako default + posílení domácí péče' },
    ],
  },
  {
    num: 7, slug: 'svetovy-klinicky-vyzkum',
    name: 'Světový klinický výzkum',
    deck: 'Česko má historicky silnou pozici v klinickém výzkumu — kardiologie (CZECH-1/2/3), neurologie, onkologie. Postupně ztrácíme — administrativní zátěž etických komisí, slabé pobídky, neefektivní rekruitment.',
    why: 'Klinický výzkum přináší pacientům přístup k novým terapiím, nemocnicím prestiž a financování, ekonomice export know-how. Česká pozice se ale zhoršuje — počet trial sites klesá, granty se vyhýbají administrativní zátěži, talentovaní výzkumníci odcházejí.',
    quote: 'Klinický výzkum není luxus. Je to způsob, jak český pacient dostává léčbu, kterou ve standardní praxi ještě neuvidí.',
    actions: [
      '<strong>Centrální etická komise</strong> — jediná schvalovací jednotka místo komisí v každé fakultní nemocnici',
      '<strong>EU Clinical Trials Regulation</strong> (CTR 536/2014) plně implementovat — jednotný portál CTIS',
      '<strong>Pobídky pro pracoviště</strong> aktivní v klinickém výzkumu — bonus k DRG, prioritní investiční podpora',
      '<strong>Národní biobanka</strong> propojená s NOR a NRH — strukturovaný přístup pro výzkumníky',
    ],
    inspirations: [
      { flag: '🇩🇰 Dánsko', name: 'Trial Nation', text: 'Centralizovaná struktura pro klinické trials přes 5 univerzit + Národní biobanka. Dánsko je nadprůměrně rekrutuje globální trials.' },
      { flag: '🇬🇧 UK', name: 'NIHR', text: '<strong>National Institute for Health Research</strong> — financuje výzkum přes NHS, povinný benchmark pro trial sites, sankce za pomalou rekrutaci.' },
      { flag: '🇧🇪 Belgie', name: 'CTC + EMA centrum', text: 'Belgie získala sídlo EMA + má vlastní Clinical Trial Centre — historicky silný research hub i přes malou populaci.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Centrální etická komise legislativně + implementace CTR/CTIS' },
      { time: 'Rok 2', text: 'Pobídkový systém pro trial sites (bonus k DRG) — pilot 5 fakultních nemocnic' },
      { time: 'Rok 3', text: 'Národní biobanka s propojením NOR/NRH operační' },
      { time: 'Rok 5', text: 'Cíl: Česko v top 5 EU per capita rekrutací klinických trials' },
    ],
  },
  {
    num: 8, slug: 'prevence-jako-standard',
    name: 'Prevence jako standard',
    indicators: ['mortalita_kardiovaskularni', 'screening_kolorektalni', 'incidence_kolorektalni', 'kuractvi_denni', 'alkohol_spotreba'],
    deck: 'KV mortalita ČR 463/100k vs EU-27 313. Účast na kolorektálním screeningu 28 % vs OECD 42 %. Denní kuřáci 16,4 % vs OECD 14,8 %. Výdaje na prevenci rostou pětkrát pomaleji než léčebná péče.',
    why: 'Česko je v primární prevenci pod evropským průměrem. Důsledek: vysoká kardiovaskulární mortalita, pozdě zachycené nádory (akutní resekce kolorekta má 3× vyšší 90d mortalitu než elektivní), předčasné úmrtí mužů v produktivním věku. Reforma znamená posun investic z léčby do prevence — politicky neviditelné, populačně transformativní.',
    quote: 'Investice do prevence je neviditelná. Léčba následků je viditelná. Politici raději financují léčbu — voliči vidí výsledek. Reforma musí být dlouhodobá vize, ne kvartální PR.',
    actions: [
      '<strong>Navýšit financování prevence</strong> tak, aby růst odpovídal růstu výdajů v jiných segmentech (cíl: ≥ 5 % zdravotních výdajů)',
      '<strong>Aktivní zvaní</strong> u všech populačních screeningů (Nordic model — opt-out místo opt-in)',
      '<strong>Bonifikace praktiků</strong> za měřitelně lepší výsledky u dispenzarizovaných pacientů',
      '<strong>Zdanění alkoholu a tabáku</strong> jako WHO Best Buy — minimální cena za jednotku, vyšší spotřební daň',
      '<strong>Hrazená dentální hygiena</strong> pro děti a mladistvé do 18 let (preventabilní onemocnění)',
      '<strong>Komplexní edukativní program</strong> ve školství (spolupráce MŠ + MZ)',
    ],
    inspirations: [
      { flag: '🇫🇮 Finsko', name: 'Severní Karélie 1972', text: 'Komplexní intervence proti KV mortalitě — snížení soli/tuků v potravinách, podpora pohybu, kontrola tlaku. Snížení úmrtnosti na IHD u středního věku o desítky procent.' },
      { flag: '🇸🇪 Švédsko', name: 'Tobacco-free generation', text: 'Cíl: žádné dítě narozené po 2010 nezačne kouřit. Komplexní opatření (zákazy, zdanění, edukace).' },
      { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Skotsko', name: 'Minimum Unit Pricing', text: 'Od 2018 minimální cena alkoholu (50p/unit). Pokles spotřeby u nejtěžších pijáků + snížení alcohol-related úmrtí.' },
      { flag: '🇩🇰 Dánsko', name: 'Tax on saturated fat', text: 'První na světě (2011) — daň na nasycené tuky. Krátce trvala, ale ukázala, že lze.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Zdanění tabáku zvýšit (WHO Best Buy) + minimální cena alkoholu (Skotský model)' },
      { time: 'Rok 2', text: 'Opt-out screening pozvánky pro kolorekt + cervix + mamograf' },
      { time: 'Rok 3', text: 'Hrazená dentální hygiena do 18 let' },
      { time: 'Rok 4', text: 'Bonifikace praktiků dle dispenzarizovaných outcome' },
      { time: 'Rok 5+', text: 'Edukativní program ve školství (analog severní Karélie)' },
    ],
  },
  {
    num: 9, slug: 'reforma-stomatologie',
    name: 'Reforma stomatologie',
    deck: 'Dentální péče je v ČR rozdělená — část hrazená pojišťovnou, většina out-of-pocket. Pacient bez peněz nemá zuby. Dostupnost zubaře přijímajícího pojištěnce klesá. Děti jsou prevencí pokryté nedostatečně.',
    why: 'Stomatologie je v Česku „druhořadá péče" — kapitální výkony jsou hrazené, ale moderní materiály (kompozit místo amalgámu, ale i kompozit limitovaný), endodoncie nad rámec a vyšší prevence jsou out-of-pocket. Důsledek: socio-ekonomický gradient v zubním zdraví, zubní hygiena u dětí neexistuje, dospělí ve středním věku ztrácejí zuby předčasně.',
    quote: 'Zubní zdraví je proxy ekonomické nerovnosti. V Česku ji nezakrýváme — vystavujeme ji v ústech každého pacienta.',
    actions: [
      '<strong>Hrazená dentální hygiena</strong> pro děti a mladistvé do 18 let (preventabilní onemocnění)',
      '<strong>Bonifikace zubařů</strong> za prevenci (méně kazů = víc úhrad, méně extrakcí = víc úhrad)',
      '<strong>Posílení sítě</strong> zubařů přijímajících pojištěnce — sankce pojišťoven za nedostupnost',
      '<strong>Standardizace materiálů</strong> — kompozit jako default pro vidět (frontální zuby), amalgám fade-out per EU 2024/1849',
      '<strong>Onkologická prevence</strong> v rámci kontrolního vyšetření (skríning rakoviny dutiny ústní)',
    ],
    inspirations: [
      { flag: '🇩🇪 Německo', name: 'Kassenzahnärztliche Vereinigung', text: 'Komplexní úhradový systém — pojišťovna hradí prevenci, restaurace, parodontologii. Pacient si platí jen kosmetiku/luxus.' },
      { flag: '🇸🇪 Švédsko', name: 'Free dental until 23', text: 'Dentální péče plně zdarma do 23 let — komplexní prevence + restaurace + ortho. Dospělí mají bonus systém.' },
      { flag: '🇬🇧 UK', name: 'NHS Dental', text: 'NHS dental je v krizi — ale model je: tři pásma plateb (band 1, 2, 3), zbytek hradí stát. Pacient ví, kolik zaplatí předem.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Legislativní úprava hrazené dentální hygieny do 18 let' },
      { time: 'Rok 2', text: 'Standardizace materiálů (kompozit default pro frontální zuby)' },
      { time: 'Rok 3', text: 'Bonifikace zubařů za prevenci (méně kazů = větší úhrada)' },
      { time: 'Rok 4', text: 'Sankce pojišťoven za nedostupnost zubaře (analog NHS guarantee)' },
      { time: 'Rok 5', text: 'Onkologická prevence v rámci kontroly' },
    ],
  },
  {
    num: 10, slug: 'data-a-informace',
    name: 'Data a informace ve službách pacienta',
    indicators: ['ehealth_adoption', 'spokojenost_informovani'],
    deck: 'Index eHealth adoption ČR 62/100 vs OECD 70. Pacient přesouvaný mezi pracovišti nese papírovou dokumentaci. Lékař telefonuje kvůli volnému lůžku. Záchranná služba nemá v terénu zdravotní záznam.',
    why: 'Elektronizace, kterou Česko deklaruje 20 let, je v praxi úspěšná spíš v jednotlivostech (eRecept) než jako koherentní infrastruktura. Estonsko od 2008 má plnohodnotný národní eHealth. Dánsko sundhed.dk od 2003. Finsko Kanta. Česko stále řeší standardy a interoperabilitu.',
    quote: 'Elektronizace zdravotnictví je infrastruktura. Ne projekt na jedno volební období — investice na 15–20 let.',
    actions: [
      '<strong>Jednotné standardy elektronizace</strong> — FHIR jako default, povinný interop',
      '<strong>Sdílení dat mezi poskytovateli</strong> — lékař vidí aktuální záznam pacienta při překladu',
      '<strong>Pacientský portál</strong> přes BankID/eIdentity s plnou kontrolou přístupu (audit log)',
      '<strong>Elektronické plánování kapacit</strong> v reálném čase (čekací doby, volná lůžka)',
      '<strong>Anonymizovaná data otevřeně</strong> — denní/týdenní frekvence (viz priorita 4 Transparence)',
    ],
    inspirations: [
      { flag: '🇪🇪 Estonsko', name: 'X-Road + e-Health', text: 'Od 2008 plnohodnotný národní eHealth — e-Prescription, e-Consultation, EHR s pacientskou kontrolou. Pacient vidí, kdo a kdy.' },
      { flag: '🇩🇰 Dánsko', name: 'sundhed.dk', text: 'Národní zdravotní portál od 2003. Propojený s primární péčí přes MedCom systém. 80 %+ adopce.' },
      { flag: '🇫🇮 Finsko', name: 'Kanta', text: 'Osobní zdravotní záznam + e-Prescription + archiv vyšetření. Plně integrované do systému.' },
    ],
    timeline: [
      { time: 'Rok 1–2', text: 'Legislativní ukotvení standardů (FHIR, interop)' },
      { time: 'Rok 2–3', text: 'Pacientský portál přes BankID + audit log' },
      { time: 'Rok 3–5', text: 'Aktualizace softwaru poskytovatelů na jednotné standardy' },
      { time: 'Rok 3', text: 'Elektronické plánování kapacit operační' },
      { time: 'Rok 5+', text: 'Anonymizovaná data otevřená denně' },
    ],
  },
  {
    num: 11, slug: 'vzdelani-a-personal',
    name: 'Vzdělání a podmínky personálu',
    deck: 'Lékařské fakulty mají nedostatek kapacit. Sestry odcházejí ze systému. Vzdělávání je rigidní, vázané na vyhlášku, neumožňuje flexibilní kariérní cesty. Specializace jsou nedostupné v některých regionech.',
    why: 'Personální krize ve zdravotnictví je dlouhodobá. Nedostatek lékařů určitých specializací (psychiatři, geriatři, primární péče v periferii). Sestry odcházejí kvůli pracovním podmínkám a platům. Vzdělávací systém nereflektuje moderní potřeby (digitalizace, paliativní péče, multidisciplinární týmy).',
    quote: 'Personál je nejhlubší pilíř systému. Bez personálu nebude reforma — jen koncepce.',
    actions: [
      '<strong>Navýšení kapacit lékařských fakult</strong> + bonifikace specializací s nedostatkem (psychiatrie, geriatrie, primární péče)',
      '<strong>Flexibilní kariérní cesty</strong> — sestry mohou postupně získávat kompetence (advanced practice nurse)',
      '<strong>Posílení nelékařských kompetencí</strong> (vakcinace v lékárně, sesterská preskripce — viz novela 2026)',
      '<strong>Atraktivnější pracovní podmínky</strong> — sankce za nepřetížení směn, ochrana před vyhořením',
      '<strong>Regionální bonusy</strong> pro nedostatkové specializace mimo Prahu',
    ],
    inspirations: [
      { flag: '🇳🇱 Nizozemsko', name: 'Verpleegkundig specialist', text: 'Advanced practice nurses s preskripčním právem v primární péči. Zpřístupňují systém + uvolňují lékaře.' },
      { flag: '🇬🇧 UK', name: 'NHS workforce plan 2023', text: 'Patnáctileté plánování personálu — kvóty fakult, retention programy, advanced practice rolí.' },
      { flag: '🇫🇮 Finsko', name: 'Sjuksköterskor i primärvård', text: 'Sestry v primární péči s preskripčním právem pro chronické nemoci. Decentralizovaný model.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Novela 96/2004 Sb. — sesterská preskripce + posílení nelékařských kompetencí' },
      { time: 'Rok 2', text: 'Navýšení kapacit LF + regionální bonusy pro nedostatkové specializace' },
      { time: 'Rok 3', text: 'Flexibilní kariérní cesty (advanced practice nurse program)' },
      { time: 'Rok 5+', text: 'Patnáctileté plánování personálu (NHS-style workforce plan)' },
    ],
  },
  {
    num: 12, slug: 'prava-pacientu',
    name: 'Práva pacientů',
    deck: 'Pacient v Česku má teoretická práva, ale slabé vymahací mechanismy. Nemocniční ombudsman je novinka (povinný od 7/2026), ale jeho efektivita závisí na lokální implementaci. Stížnosti se řeší pomalu a neviditelně.',
    why: 'Pacient nespokojený s péčí má v ČR několik paralelních cest — pojišťovna, krajský úřad, MZ ČR, ombudsman, soud. Žádná z nich není rychlá. Nemocniční ombudsman zavedený novelou 290/2025 Sb. od 7/2026 je krok správným směrem, ale závisí na implementaci.',
    quote: 'Práva pacienta měříme tím, jak rychle dostane odpověď na stížnost. Ne tím, kolik paragrafů je v zákoně.',
    actions: [
      '<strong>Nemocniční ombudsman</strong> — povinné role v každém poskytovateli s lůžkovou péčí (od 7/2026)',
      '<strong>Pacientský advokát</strong> — pro vážné diagnózy (onkologie, rare disease) — vyškolený průvodce systémem',
      '<strong>Standardizace stížnostního řízení</strong> — maximální lhůta na odpověď 30 dní, sankce za nedodržení',
      '<strong>Patient Safety Incidents</strong> jako v aviaci — povinné hlášení, kultura učení z chyb',
      '<strong>Mediátor sporů pacient ↔ poskytovatel</strong> — alternativa k soudu pro méně závažné spory',
    ],
    inspirations: [
      { flag: '🇩🇰 Dánsko', name: 'Patient Compensation Association', text: 'Bez-viny odškodňovací systém — pacient nemusí prokazovat „vinu" lékaře, jen že újma vznikla. Rychlé, jasné.' },
      { flag: '🇸🇪 Švédsko', name: 'No-fault insurance', text: 'Patient injury insurance — automatické odškodnění bez soudu pro definované újmy. Skandinávský model.' },
      { flag: '🇳🇱 Nizozemsko', name: 'IGJ', text: 'Inspectie Gezondheidszorg en Jeugd — silný inspekční orgán s pravomocí veřejně publikovat výsledky inspekcí per pracoviště.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Implementace nemocničního ombudsmana (zákon 290/2025 Sb., účinnost 1. 7. 2026)' },
      { time: 'Rok 2', text: 'Standardizace stížnostního řízení + lhůty + sankce' },
      { time: 'Rok 3', text: 'Pilot Patient Safety Incidents systému (3 fakultní nemocnice)' },
      { time: 'Rok 4', text: 'Pacientský advokát pro onkologii a vážné diagnózy' },
      { time: 'Rok 5+', text: 'No-fault compensation model (Skandinávský)' },
    ],
  },
  {
    num: 13, slug: 'dusevni-zdravi',
    name: 'Dostupná péče o duševní zdraví',
    indicators: ['sebevrazdy_per_100k', 'pouzivani_antidepresiv'],
    deck: 'Sebevražednost ČR 12,5/100k vs OECD 11. Antidepresíva 84 DDD/1000/den vs OECD 67 — léky se předepisují, systém péče ne. Center duševního zdraví je málo, jejich pokrytí nerovnoměrné, personál malý.',
    why: 'Reforma psychiatrické péče běží od 2013, vznikla síť Center duševního zdraví, ale jejich pokrytí je nerovnoměrné. Psychoterapie není zákonem definovaná profese, takže pojištění hradí nesystematicky. Děti a mladiství mají nejhorší dostupnost.',
    quote: 'Antidepresíva nejsou náhrada za systém. Léky se v Česku předepisují víc než v OECD, ale dostupnost terapie zaostává.',
    actions: [
      '<strong>Rozšíření personálu CDZ</strong> o sociální pracovníky, peer konzultanty, psychoterapeuty, adiktology',
      '<strong>Zákonná definice psychoterapeuta</strong> + systematická úhrada psychoterapie z pojištění',
      '<strong>Zvýšení dostupnosti dětské psychiatrie</strong> — kapacity + krajská distribuce',
      '<strong>Spolupráce s MŠMT</strong> — duševní zdraví ve školním kurikulu, destigmatizace',
      '<strong>Lidská práva v psychiatrické péči</strong> — zvlášť u dětí, ochrana před nedobrovolnou hospitalizací bez indikace',
    ],
    inspirations: [
      { flag: '🇬🇧 UK', name: 'NHS Talking Therapies', text: 'Největší národní program psychoterapie v Evropě (od 2008). Pacient se self-referral, strukturovaná CBT, bez doplatku. Evaluováno v Lancet Psychiatry.' },
      { flag: '🇧🇪 Belgie', name: 'Article 107 reform', text: 'Přesun zdrojů z lůžkových psychiatrických zařízení do komunitní péče. Od 2010, systematicky.' },
      { flag: '🇮🇹 Itálie', name: 'Basagliův zákon 1978', text: 'Ikonický model deinstitucionalizace psychiatrie. Mezinárodní vzor komunitního přístupu.' },
      { flag: '🇳🇱 Nizozemsko', name: 'GZ-psycholog', text: 'Etablovaná kategorie zdravotnického psychologa s úhradou v základním pojištění.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Zákon o psychoterapii — definice profese, výcvikové standardy, úhrada' },
      { time: 'Rok 2', text: 'Rozšíření personálu CDZ — sociální pracovníci, peer konzultanti, adiktologové' },
      { time: 'Rok 3', text: 'Talking Therapies pilot ve 3 krajích (NHS model)' },
      { time: 'Rok 4', text: 'Spolupráce s MŠMT — duševní zdraví ve školním kurikulu' },
      { time: 'Rok 5+', text: 'Strukturální posun zdrojů z lůžkové do komunitní péče (Article 107 model)' },
    ],
  },
];

function renderPage(p) {
  const fileName = `priorita-${String(p.num).padStart(2, '0')}-${p.slug}.html`;
  const filePath = path.join(OUT_DIR, fileName);

  const inspirationsHtml = p.inspirations.map(i => `
        <article class="manifest-sub-inspiration-card">
          <div class="manifest-sub-inspiration-flag">${i.flag} · ${i.name}</div>
          <p class="manifest-sub-inspiration-text">${i.text}</p>
        </article>`).join('');

  const actionsHtml = p.actions.map(a => `        <li>${a}</li>`).join('\n');
  const timelineHtml = p.timeline.map(t => `
        <li>
          <span class="manifest-sub-timeline-time">${t.time}</span>
          <span class="manifest-sub-timeline-text">${t.text}</span>
        </li>`).join('');

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Priorita ${p.num} · ${p.name} — Manifest reformy zdravotnictví · HSPA Monitor</title>
<meta name="description" content="${p.deck.replace(/<[^>]+>/g, '').slice(0, 160)}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article">
<meta property="og:locale" content="cs_CZ">
<meta property="og:title" content="Priorita ${p.num} · ${p.name} — Manifest reformy zdravotnictví">
<meta property="og:description" content="${p.deck.replace(/<[^>]+>/g, '').slice(0, 200)}">
<link rel="canonical" href="https://hspa-cesko.cz/manifest/${fileName}">
<link rel="stylesheet" href="../src/styles.css">
</head>
<body>
<a class="skip-link" href="#content">Přeskočit na hlavní obsah</a>

<header class="topbar">
  <div class="brand">
    <a href="../index.html" class="brand-link"><h1><abbr class="hspa-abbr" title="Health System Performance Assessment">HSPA</abbr> <em>monitor</em>
      <small>hspa-cesko.cz · skorezdravotnictvi.cz · Manifest · Priorita ${p.num}</small>
    </h1></a>
  </div>
  <nav class="module-nav" id="moduleNav" aria-label="Moduly dashboardu"></nav>
</header>

<div class="masthead-strip">
  <span class="masthead-date" id="mastheadDate"></span>
</div>

<main id="content">
  <article class="manifest-sub">
    <nav class="manifest-sub-breadcrumb" aria-label="Drobečková navigace">
      <a href="../clanek-manifest-reforma-zdravotnictvi.html">← Zpět na hlavní manifest</a>
      · <a href="./index.html">Všech 13 priorit</a>
    </nav>

    <header class="manifest-sub-header">
      <span class="manifest-sub-tag">Manifest · Priorita ${p.num} z 13</span>
      <h2 class="manifest-sub-title">${p.num} · ${p.name}</h2>
      <p class="manifest-sub-deck">${p.deck}</p>
    </header>

    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Proč to záleží</div>
      <h3 class="manifest-sub-section-h">Kontext: co dnes nefunguje</h3>
      <p>${p.why}</p>
      <blockquote class="manifest-sub-pullquote">${p.quote}</blockquote>
    </section>
${renderDataSection(p.indicators)}
    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Konkrétní opatření</div>
      <h3 class="manifest-sub-section-h">Co konkrétně udělat</h3>
      <ul>
${actionsHtml}
      </ul>
    </section>

    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Mezinárodní inspirace</div>
      <h3 class="manifest-sub-section-h">Kde už to funguje</h3>
      <div class="manifest-sub-inspiration">
${inspirationsHtml}
      </div>
    </section>

    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Harmonogram</div>
      <h3 class="manifest-sub-section-h">Co a kdy</h3>
      <p>Reforma není projekt na jedno volební období. Jednotlivé kroky se logicky řadí:</p>
      <ol class="manifest-sub-timeline">
${timelineHtml}
      </ol>
    </section>

    <aside class="manifest-sub-cta">
      <div class="manifest-sub-cta-kicker">Pokračovat ve čtení</div>
      <h3 class="manifest-sub-cta-h">Tato priorita je jedna ze 13. Vrátit se na hlavní manifest →</h3>
      <a class="manifest-sub-cta-link" href="../clanek-manifest-reforma-zdravotnictvi.html#manifestHeadline">Manifest reformy českého zdravotnictví ↑</a>
    </aside>
  </article>
</main>

<footer class="bottom" id="siteFooter"></footer>

<script type="module">
  import '../src/analytics.js';
  import { renderModuleNav, renderMastheadDate } from '../src/page-shared.js';
  renderModuleNav('articles');
  renderMastheadDate();
</script>
</body>
</html>
`;

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✓ ${fileName}`);
}

function renderIndex() {
  const cardsHtml = PRIORITIES.map(p => {
    const fileName = `priorita-${String(p.num).padStart(2, '0')}-${p.slug}.html`;
    // Absolutní URL — relativní `./X` se totiž s Vercel cleanUrls
    // + trailingSlash:false ROZBÍJÍ. Index.html se servíruje pod /manifest
    // (bez koncového /), browser pak relativní `./` parsuje jako root /,
    // takže `./priorita-NN…` skončí na /priorita-NN (mimo /manifest/) → 404.
    return `
        <a class="manifest-index-card" href="/manifest/${fileName}">
          <div class="manifest-index-num">Priorita ${p.num}</div>
          <div class="manifest-index-name">${p.name}</div>
          <div class="manifest-index-bench">${p.deck.replace(/<[^>]+>/g, '').slice(0, 110)}…</div>
        </a>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Manifest · 13 priorit reformy českého zdravotnictví — HSPA Monitor</title>
<meta name="description" content="Index všech 13 priorit politického manifestu reformy českého zdravotnictví. Detailní rozbor každé priority — proč to záleží, konkrétní opatření, mezinárodní inspirace, harmonogram.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://hspa-cesko.cz/manifest/index.html">
<link rel="stylesheet" href="../src/styles.css">
</head>
<body>
<a class="skip-link" href="#content">Přeskočit na hlavní obsah</a>

<header class="topbar">
  <div class="brand">
    <a href="../index.html" class="brand-link"><h1><abbr class="hspa-abbr" title="Health System Performance Assessment">HSPA</abbr> <em>monitor</em>
      <small>hspa-cesko.cz · skorezdravotnictvi.cz · Manifest · 13 priorit</small>
    </h1></a>
  </div>
  <nav class="module-nav" id="moduleNav" aria-label="Moduly dashboardu"></nav>
</header>

<div class="masthead-strip">
  <span class="masthead-date" id="mastheadDate"></span>
</div>

<main id="content">
  <article class="manifest-index">
    <nav class="manifest-sub-breadcrumb" aria-label="Drobečková navigace">
      <a href="../clanek-manifest-reforma-zdravotnictvi.html">← Hlavní manifest</a>
    </nav>

    <header style="border-bottom: 2px solid var(--ink); padding-bottom: 22px; margin-bottom: 24px;">
      <div class="ed-kicker">Manifest reformy · index priorit</div>
      <h2 style="font-family: var(--serif); font-size: 36px; font-weight: 700; line-height: 1.15; margin: 8px 0 12px;">Třináct priorit, na kterých má smysl pracovat</h2>
      <p style="font-family: var(--serif); font-size: 17px; line-height: 1.55; color: var(--ink-mut); max-width: 720px;">
        Detailní rozbor každé z 13 priorit politického manifestu reformy českého zdravotnictví. Každá stránka obsahuje: <strong>proč to záleží</strong> (kontext + data), <strong>co konkrétně udělat</strong> (legislativní páky), <strong>kde už to funguje</strong> (mezinárodní inspirace), a <strong>harmonogram</strong> (co a kdy).
      </p>
    </header>

    <section class="manifest-index-grid">${cardsHtml}
    </section>

    <aside class="manifest-sub-cta">
      <div class="manifest-sub-cta-kicker">Pokračovat ve čtení</div>
      <h3 class="manifest-sub-cta-h">Hlavní manifest — kontext, autoři, governance</h3>
      <a class="manifest-sub-cta-link" href="../clanek-manifest-reforma-zdravotnictvi.html">Průvodce reformou českého zdravotnictví →</a>
    </aside>
  </article>
</main>

<footer class="bottom" id="siteFooter"></footer>

<script type="module">
  import '../src/analytics.js';
  import { renderModuleNav, renderMastheadDate } from '../src/page-shared.js';
  renderModuleNav('articles');
  renderMastheadDate();
</script>
</body>
</html>
`;

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html, 'utf8');
  console.log(`✓ index.html`);
}

console.log(`Generating ${PRIORITIES.length} priority pages + index → ${OUT_DIR}\n`);
PRIORITIES.forEach(renderPage);
renderIndex();
console.log(`\nDone. ${PRIORITIES.length + 1} files generated.`);
