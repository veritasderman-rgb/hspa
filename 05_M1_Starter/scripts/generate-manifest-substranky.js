// Generates 13 manifest priority substránky → manifest/priorita-NN-slug.html
// + index.html (rozcestník). Run: node scripts/generate-manifest-substranky.js
//
// Každá substránka (5 vrstev hloubky):
//   V1  Hero (tag + title + deck) + „Související data" karty z indicators.json
//   V2  „Proč to záleží" 4-dílná struktura (stav / co to drží / co změnit / risk)
//       + „Konkrétní opatření" jako opatření × legislativní páka × termín
//   V3  „Souvislosti" — provázané články, strategie, explainery, priority
//   V4  Inline glosář (.manifest-sub-prose) + AV srovnání ČR vs benchmark v kartách
//   V5  „Zdroje a další čtení" + „Co je sporné" (otevřená diskuse)
//   + Mezinárodní inspirace, harmonogram, CTA
//
// Single source of truth: pole PRIORITIES níže. Layout reusuje portálové
// brand classes a absolutní cesty (/…) — relativní `./` se s Vercel cleanUrls
// + trailingSlash:false rozbíjí (viz fix 404 na rozcestníku).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'manifest');
fs.mkdirSync(OUT_DIR, { recursive: true });

// --- Datové kontrakty (single source of truth pro hodnoty a názvy) ----------
const INDICATORS = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'indicators.json'), 'utf8'));
  return Object.fromEntries((raw.indicators ?? []).map(i => [i.id, i]));
})();
const STRATEGIES = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strategies.json'), 'utf8'));
  const arr = raw.strategies ?? raw.items ?? (Array.isArray(raw) ? raw : Object.values(raw));
  return Object.fromEntries(arr.map(s => [s.id ?? s.slug, s.name ?? s.title]));
})();
const EXPLAINERS = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'explainers.json'), 'utf8'));
  const arr = raw.explainers ?? raw.items ?? (Array.isArray(raw) ? raw : Object.values(raw));
  return Object.fromEntries(arr.map(e => [e.id ?? e.slug, e.title ?? e.name]));
})();

const cz = (n) => (n === null || n === undefined) ? '' : String(n).replace('.', ',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PRIORITIES = [
  {
    num: 1, slug: 'za-stejne-penize-vice-muziky',
    name: 'Za stejné peníze více muziky',
    deck: 'České zdravotnictví dostává zhruba 9 % HDP. Otázkou není „kolik", ale „co za to". Úhradová vyhláška, kapitační platby a DRG určují, kde peníze končí — a stávající nastavení odměňuje objem, ne kvalitu.',
    why: {
      state: 'Stávající úhradový systém je hybrid kapitace + DRG + výkonových plateb. Pro nemocnice je optimální plnit DRG kvóty, pro praktiky držet kapitační kmen. Žádný z těchto mechanismů systematicky neodměňuje měřitelně lepší výsledek — mortalitu po infarktu, re-admise, kontrolu chronických nemocí.',
      holds: 'Úhradová vyhláška vzniká v dohodovacím řízení mezi pojišťovnami a poskytovateli. Status quo vyhovuje oběma stranám: nemocnice mají predikovatelný příjem podle case-mixu, pojišťovny snadno rozpočtují. Outcome nikdo nezastupuje u stolu.',
      change: 'Zavést třetí složku úhrady vázanou na výsledek — value-based add-on k DRG (5–15 %), bonifikaci praktiků za kontrolu chroniků.',
      risk: 'Bez vazby na outcome systém dál financuje objem výkonů, ne zdraví pacienta. Náklady rostou rychleji než výsledky a reforma se odsouvá o další volební cyklus.',
    },
    quote: 'Kapitační platba neměří kvalitu. DRG měří case-mix, ne outcome. Bez třetí složky vázané na výsledek systém nikdy nezačne odměňovat zlepšování.',
    indicators: ['mortalita_inhosp_ami', 'readmise_30d_ami', 'vydaje_zdravotnictvi_hdp', 'podil_vydaje_luzkova_pece'],
    actions: [
      { action: 'Value-based DRG add-on — 5–15 % DRG platby vázané na 30d mortalitu, re-admise a komplikace', lever: 'Úhradová vyhláška (§ 17 ZVZP)', time: 'Rok 1–2 (pilot)' },
      { action: 'Bonifikace praktiků za měřitelně lepší výsledky u dispenzarizovaných pacientů', lever: 'Kapitační smlouva + P4P dodatek', time: 'Rok 2–3' },
      { action: 'Audit úhradových smluv — každoroční vyhláška v auditní formě s benchmarkem', lever: 'Novela ZVZP 48/1997', time: 'Rok 1' },
      { action: 'Sankce za odmítnutí pacienta bez objektivního důvodu', lever: 'Smluvní podmínky pojišťoven', time: 'Rok 2' },
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
      { time: 'Rok 4', text: 'Vyhodnocení dopadu na outcome (mortalita, re-admise), úprava parametrů' },
    ],
    articles: [
      { href: '/clanek-uhradova-vyhlaska.html', title: 'Vzorec, který rozdělí stovky miliard. Jak funguje úhradová vyhláška' },
      { href: '/clanek-financovani-segmenty-2026.html', title: 'Kam plyne 459 miliard. Struktura výdajů českého zdravotnictví' },
      { href: '/clanek-reforma-primarni-pece-2027.html', title: 'Praktik jako uzel systému. Kapitace a Pay-for-Performance' },
    ],
    strategies: ['nikez_zdravotnictvi', 'std_cz_drg'],
    explainers: ['uhradova_vyhlaska', 'cz_drg', 'dohodovaci_rizeni'],
    related: [4, 3],
    sources: [
      { name: 'OECD Health at a Glance 2025 — financování', url: 'https://www.oecd.org/health/health-at-a-glance/' },
      { name: 'ÚZIS ČR — ekonomické informace ve zdravotnictví', url: 'https://www.uzis.cz/' },
      { name: 'KZP — Portál ukazatelů kvality (PUK)', url: 'https://puk.kzp.cz/' },
    ],
    contested: 'Value-based úhrady mají odpůrce: vážou-li se na špatně zvolené metriky, vznikne „teaching to the test" — nemocnice optimalizují měřené, ne skutečné zdraví. A risk-adjustment (aby se neodměňovaly pracoviště s lehčími pacienty) je metodicky náročný. Otevřená otázka je, kolik procent úhrady na outcome vázat, aby motivace zafungovala, ale neohrozila stabilitu financování.',
  },
  {
    num: 2, slug: 'moznost-volby-bez-uplatku',
    name: 'Možnost volby bez úplatků a kulichů',
    deck: 'Pacient v Česku má teoreticky volbu pojišťovny a lékaře. V praxi je tato volba podlomená neexistencí srovnatelných informací, neformálními platbami a omezenou kapacitou vybraných pracovišť.',
    why: {
      state: 'Volba bez informace není volba. Pacient před plánovaným zákrokem nezná čekací dobu, úspěšnost ani kvalitu v různých zařízeních. Čekání na specialistu je v průměru delší než v OECD a u některých výkonů (kyčel) výrazně.',
      holds: 'Neformální platby („obálky", „dary") jsou v některých specializacích strukturálně přítomné a fungují jako de-facto fronta s předskakováním. Přepis pacienta z fakultní nemocnice do okresní funguje jako trest — výsledek je rezignace na volbu.',
      change: 'Zveřejnit čekací doby a kvalitativní metriky per pracoviště, kriminalizovat neformální platby a zavést garanci dostupnosti specialisty.',
      risk: 'Dokud je volba formální, ale prakticky vyprázdněná, prohlubuje se nerovnost — informovaní a dobře napojení získávají péči rychleji než ostatní.',
    },
    quote: 'Volba pacienta není ústavní princip, dokud ji systém nepodpoří jasnými informacemi a sankcionováním přeskakování fronty.',
    indicators: ['cekaci_doby_specialist', 'cekaci_doba_kycel', 'platba_z_kapsy_pct', 'spokojenost_pece', 'unmet_need_medical'],
    actions: [
      { action: 'Publikování čekacích dob per pracoviště v reálném čase', lever: 'NV 307/2012 Sb. + reporting ÚZIS', time: 'Rok 2' },
      { action: 'Trestnost neformálních plateb + anonymní whistleblower kanál pro pacienty', lever: 'Novela trestního zákoníku + zákon o ZS', time: 'Rok 1' },
      { action: 'Garance druhého názoru hrazená pojišťovnou pro vážné diagnózy', lever: 'Seznam zdravotních výkonů (SZV)', time: 'Rok 3' },
      { action: 'Smluvní povinnost pojišťovny zajistit specialistu do 30 dnů od indikace', lever: 'Smluvní podmínky + NV 307/2012', time: 'Rok 3 (pilot)' },
    ],
    inspirations: [
      { flag: '🇬🇧 UK', name: 'NHS Choices', text: 'Pacient v NHS si vybírá nemocnici online — vidí čekací doby, infection rates, mortality, patient satisfaction (CQC inspekce). Volba má váhu, protože je transparentní.' },
      { flag: '🇩🇰 Dánsko', name: 'Treatment guarantee', text: 'Zákonná garance: pokud veřejný systém nezajistí péči do 30 dnů, pacient může jít do soukromé/zahraniční nemocnice na účet pojišťovny.' },
      { flag: '🇩🇪 Německo', name: 'Termin-Service-Stellen', text: 'Centrální linka, kde pacient žádá specialistu — pojišťovna do 5 dnů musí najít termín, jinak hradí privátní cestu.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Legislativní úprava trestnosti neformálních plateb + anonymní whistleblower platforma' },
      { time: 'Rok 2', text: 'Publikování čekacích dob a kvalitativních metrik per IČO (pilot 3 specializace)' },
      { time: 'Rok 3', text: 'Garance dostupnosti specialisty do 30 dnů — pilot ve dvou krajích' },
      { time: 'Rok 4', text: 'Druhý názor jako standardní pojistná služba pro onkologii a kardiochirurgii' },
    ],
    articles: [
      { href: '/clanek-cekani-specialista.html', title: 'Paradox dostupnosti. Češi udávají nejnižší nesplněnou potřebu péče' },
      { href: '/clanek-narok-pojistence-1-co-to-je.html', title: 'Co dnes skutečně máte nárok? Anatomie ústavního práva na péči' },
    ],
    strategies: ['oecd_hspa_cz'],
    explainers: ['spoluucast_pacienta', 'nv_307_2012', 'odpovednost_dostupnost'],
    related: [4, 12],
    sources: [
      { name: 'OECD — Waiting times for health services', url: 'https://www.oecd.org/health/waiting-times-for-health-services-242e3c8c-en.htm' },
      { name: 'Eurostat — Unmet need for medical examination (hlth_silc_08)', url: 'https://ec.europa.eu/eurostat/' },
    ],
    contested: 'Garance dostupnosti do 30 dnů zní jednoduše, ale v systému s omezenou kapacitou personálu může vést jen k přesunu fronty, ne k jejímu zkrácení. Sporné je i to, zda zveřejňování per-hospital metrik nepovede k „cream-skimming" — odmítání rizikovějších pacientů, aby si pracoviště nezhoršilo statistiku.',
  },
  {
    num: 3, slug: 'zdravotnictvi-ve-sluzbach-pojistencu',
    name: 'Zdravotnictví ve službách pojištěnců',
    deck: 'Středobodem zdravotnictví musí být pojištěnec, ne ministerský úředník, lobbista ani primář. Práva pojištěnce — od digitálního zdravotního záznamu po reálnou dostupnost péče — jsou na prvním místě.',
    why: {
      state: 'Současný systém je optimalizovaný pro provozovatele — pojišťovny minimalizují náklady, nemocnice maximalizují DRG, lékaři chrání svou autonomii. Pacient je v této rovnici brán jako jednotka, ne jako klient. Spokojenost s informováním zaostává za OECD.',
      holds: 'Dlouhé čekací doby, papírová dokumentace, opakovaná vyšetření při překladu, nedostupné sekundární názory — to vše vychází z toho, že nikdo nemá explicitní odpovědnost za zkušenost pacienta napříč systémem.',
      change: 'Dát pacientovi vlastnictví zdravotních dat, navigátora pro vážné diagnózy a pojišťovnu jako advokáta s vymahatelnou povinností zajistit dostupnost.',
      risk: 'Bez jasné odpovědi na otázku „kdo pro koho pracuje" zůstane reforma kosmetická a pacient dál nese organizační tíhu systému na vlastních bedrech.',
    },
    quote: 'Reforma ve službách pojištěnce začíná otázkou: kdo pro koho pracuje? Pokud nedokážeme jasně odpovědět „pojišťovna pro pojištěnce", reforma nezačala.',
    indicators: ['spokojenost_informovani', 'spokojenost_pece', 'ehealth_adoption', 'unmet_need_medical'],
    actions: [
      { action: 'Digitální zdravotní záznam ve vlastnictví pacienta — přístup přes BankID, kontrola sdílení', lever: 'Zákon o elektronizaci zdravotnictví 325/2021', time: 'Rok 1–2' },
      { action: 'Patient navigator service — průvodce systémem hrazený z pojištění pro vážné diagnózy', lever: 'Seznam zdravotních výkonů (SZV)', time: 'Rok 2 (pilot)' },
      { action: 'Mandatorní hlášení pacientských incidentů (Patient Safety Incidents)', lever: 'Zákon o zdravotních službách 372/2011', time: 'Rok 3' },
      { action: 'Pojišťovna jako advokát pacienta — vymahatelná povinnost zajistit dostupnost', lever: 'Novela ZVZP + dohled MZ', time: 'Rok 5' },
    ],
    inspirations: [
      { flag: '🇫🇮 Finsko', name: 'Kanta service', text: 'Pacient vidí, kdo se na jeho data díval, kdy a proč. Plná kontrola nad sdílením, integrace e-Prescription + osobní záznam.' },
      { flag: '🇳🇱 Nizozemsko', name: 'Patient navigator', text: 'Pacient s vážnou diagnózou dostane vyškoleného „advokáta" hrazeného pojišťovnou, který ho provede systémem.' },
      { flag: '🇸🇪 Švédsko', name: '1177 Vårdguiden', text: 'Centrální linka + portál — pacient řeší cokoliv od triage po orientaci v systému, 24/7, hrazeno z daní.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Legislativní úprava vlastnictví zdravotních dat pacientem (analog GDPR pro health data)' },
      { time: 'Rok 2', text: 'Pilot navigator service pro onkologické pacienty ve 3 KOC' },
      { time: 'Rok 3', text: 'Patient Safety Incidents systém na celonárodní úrovni (povinné hlášení)' },
      { time: 'Rok 5', text: 'Pojišťovna jako advokát pacienta — měřitelné sankce za nedostupnost' },
    ],
    articles: [
      { href: '/clanek-narok-pojistence-1-co-to-je.html', title: 'Co dnes skutečně máte nárok? Anatomie ústavního práva na péči' },
      { href: '/clanek-narok-pojistence-3-co-s-tim.html', title: 'Co s tím. Pět reformních směrů, jak udržet nárok pojištěnce' },
      { href: '/clanek-ezkarta-ehealth.html', title: 'Šedesát dva ze sta. Český eHealth má EZKartu v telefonu' },
    ],
    strategies: ['oecd_hspa_cz', 'ehealth_2025_2035'],
    explainers: ['odpovednost_dostupnost', 'pacientske_organizace', 'nemocnicni_ombudsman'],
    related: [10, 12, 4],
    sources: [
      { name: 'OECD — Patient-Reported Indicator Surveys (PaRIS)', url: 'https://www.oecd.org/health/paris/' },
      { name: 'MZ ČR — Národní strategie elektronického zdravotnictví', url: 'https://www.mzcr.cz/' },
    ],
    contested: 'Vlastnictví dat pacientem zní eticky čistě, ale v praxi naráží na bezpečnost a interoperabilitu: kdo ručí za to, že pacient omylem nesdílí citlivá data nesprávně? A navigátor pro každou vážnou diagnózu je nákladný — sporné je, zda začít u onkologie, nebo plošně.',
  },
  {
    num: 4, slug: 'transparence',
    name: 'Transparence',
    deck: 'Data o českém zdravotnictví vycházejí jako roční PDF — zpoždění, žádné srovnání, neauditovatelné. Pacient před zákrokem nemá srovnatelné informace o úspěšnosti, čekací době a kvalitě péče v jednotlivých zařízeních.',
    why: {
      state: 'Co se neměří, nelze zlepšit. ÚZIS publikuje ročenky 1–2 roky zpožděně, KZP publikuje PUK jen pro vybrané indikátory, MZ vydává koncepce bez ověřitelných dat. Index eHealth adoption zaostává za OECD.',
      holds: 'Lékař volá nemocnice po telefonu, protože nezná aktuální kapacity. Pacient před plánovaným zákrokem rozhoduje na anekdotách. Data existují v NZIS, ale nejsou otevřená — chybí politická vůle i jednotná datová infrastruktura.',
      change: 'Národní open-data portál s anonymizovanými daty per IČO, denní/týdenní frekvence, otevřené API a HSPA rámec OECD jako oficiální měřítko.',
      risk: 'Bez transparentních dat se kvalita neměří, plýtvání neodhalí a veřejná debata o reformě stojí na dojmech místo na číslech.',
    },
    quote: 'Co se měří, lze zlepšit. Co se neměří, zůstává v anekdotě.',
    indicators: ['ehealth_adoption', 'spokojenost_informovani', 'spokojenost_pece'],
    actions: [
      { action: 'Národní open-data portál zdravotnictví — anonymizovaná data per IČO, otevřené API', lever: 'Zákon o NZIS 372/2011 + open-data povinnost', time: 'Rok 1–2' },
      { action: 'HSPA rámec OECD jako oficiální měřítko kvality (ČR přijala 2023, neimplementuje)', lever: 'Usnesení vlády + metodika ÚZIS', time: 'Rok 1' },
      { action: 'Per-hospital kvalitativní metriky publikované veřejně', lever: 'Reporting ÚZIS + NIKEZ', time: 'Rok 2' },
      { action: 'Pacient před zákrokem dostane comparison sheet svého pracoviště vs alternativ', lever: 'SZV + pacientský portál', time: 'Rok 3' },
    ],
    inspirations: [
      { flag: '🇬🇧 UK', name: 'NHS Digital', text: '<strong>NHS Find a hospital</strong> — pacient si srovná nemocnice podle outcome, čekací doby, infection rates. Celostátní, denně aktualizováno.' },
      { flag: '🇺🇸 USA', name: 'CMS Hospital Compare', text: '<strong>Hospital Compare</strong> — Medicare srovnává nemocnice podle 100+ metrik (mortality, readmissions, patient experience). Veřejné, sankcionované.' },
      { flag: '🇸🇪 Švédsko', name: 'Nationella kvalitetsregister', text: 'Přes 100 klinických registrů, otevřené výzkumníkům, povinný reporting per pracoviště. Tradice od 70. let.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Legislativní povinnost ÚZIS publikovat data otevřeně + API; HSPA jako oficiální měřítko' },
      { time: 'Rok 2', text: 'Per-hospital metrika pro 10 klinických oblastí (AMI, CMP, onko chirurgie, …)' },
      { time: 'Rok 3', text: 'Comparison sheet pro pacienta před plánovaným zákrokem' },
      { time: 'Rok 5', text: 'Plně auditní stopa všech kvalitativních metrik na národní úrovni' },
    ],
    articles: [
      { href: '/clanek-data-leci-cesko-2026.html', title: 'Data léčí Česko: konference, na které se začalo měřit' },
      { href: '/clanek-ehealth.html', title: '62 versus 70. Co index eHealth měří a proč v něm Česko zaostává' },
      { href: '/clanek-financovani-sha.html', title: 'Odkud jdou peníze a kam mizí. Anatomie financování' },
    ],
    strategies: ['oecd_hspa_cz', 'nikez_zdravotnictvi', 'ehds'],
    explainers: ['nzis', 'indiko_portal', 'hta'],
    related: [10, 1],
    sources: [
      { name: 'OECD HSPA Framework', url: 'https://www.oecd.org/health/health-systems/' },
      { name: 'ÚZIS ČR — NZIS', url: 'https://www.uzis.cz/' },
      { name: 'KZP — Portál ukazatelů kvality', url: 'https://puk.kzp.cz/' },
    ],
    contested: 'Transparence naráží na obavu z dezinterpretace: syrová per-hospital mortalita bez risk-adjustmentu může nespravedlivě poškodit centra, která berou nejtěžší případy. Sporné je, kolik kontextu k číslům přidat, aby data informovala, ne mátla — a kdo nese odpovědnost za chybný benchmark.',
  },
  {
    num: 5, slug: 'dostupne-leky',
    name: 'Dostupné léky běžné i moderní',
    deck: 'Dostupnost léčiv v Česku má více vrstev nedostatků: nejednotné lékárny, neznámý doplatek předem, omezené pravomoci lékárníků, chybějící systematická politika orphan léků a přes 2 200 aktivních výpadků (vs ~580 v 2019).',
    why: {
      state: 'Léková dostupnost se za 7 let proměnila z přechodné anomálie ve strukturální slabost. SÚKL eviduje denně rostoucí počet hlášení o přerušení dodávek; podíl kriticky dostupných LP roste.',
      holds: 'Strukturální příčiny jsou globální (koncentrace výroby účinných látek v Asii) i domácí (malý trh, reexport, slabý Emergency Stock). 10–15 % postižených léčiv nemá v ČR registrovanou náhradu.',
      change: 'Robustní Emergency Stock, rozšíření pravomocí lékárníků, online srovnávač doplatků a samostatný fond i HTA metodika pro orphan léky.',
      risk: 'Bez strukturálního řešení se výpadky stávají normou — pacient s chronickou nemocí shání lék po lékárnách a moderní terapie zůstávají nedostupné podle PSČ, ne podle diagnózy.',
    },
    quote: 'Léky nejsou luxusní zboží. Strukturální výpadky znamenají, že systém přestal fungovat — a pacienti to vědí.',
    indicators: ['vypadky_leciv_aktivni', 'lpod_share_critical', 'lekarny_per_100k', 'podil_vydaje_leky'],
    actions: [
      { action: 'Robustní Emergency Stock rozšířený na 500+ LP (nyní ~100 dle zák. 378/2007 § 77)', lever: 'Novela zák. 378/2007 Sb. o léčivech', time: 'Rok 2' },
      { action: 'Rozšíření pravomocí lékárníků — očkování, sezónní prevence, medication review', lever: 'Zákon o léčivech + kompetence nelékařů', time: 'Rok 4' },
      { action: 'Online srovnávač doplatků v reálném čase + vzdálené ověření dostupnosti', lever: 'SÚKL — datová povinnost distributorů', time: 'Rok 3' },
      { action: 'Orphan léky — samostatný fond, oddělená HTA metodika, předem stanovený strop', lever: 'Novela ZVZP + HTA legislativa', time: 'Rok 5' },
    ],
    inspirations: [
      { flag: '🇬🇧 UK', name: 'NHS Community Pharmacy', text: '<strong>Community Pharmacy Contractual Framework</strong> — lékárníci očkují, poskytují prevenci, medication review. Plně hrazeno NHS.' },
      { flag: '🇧🇪 Belgie', name: 'Medication Review', text: 'Lékárník placený za roční review léků chronicky nemocných. Strukturální záchyt interakcí a nedostupnosti.' },
      { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Skotsko', name: 'SMC', text: '<strong>Scottish Medicines Consortium</strong> — oddělený HTA pro orphan a moderní léky, transparentní rozhodování, předem stanovený cap.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Novela LPOD (456/2025 Sb.) — kategorie LP s omezenou dostupností. EU Critical Medicines Act doplnit do národního práva' },
      { time: 'Rok 2', text: 'Rozšíření Emergency Stock na 500+ LP + sankce za nehlášené přerušení' },
      { time: 'Rok 3', text: 'Online srovnávač doplatků v reálném čase' },
      { time: 'Rok 4', text: 'Rozšíření pravomocí lékárníků v očkování a prevenci' },
      { time: 'Rok 5', text: 'Orphan fond + samostatná HTA metodika operační' },
    ],
    articles: [
      { href: '/clanek-hta-jca-eu-2026.html', title: 'Joint Clinical Assessment startuje. Česko hodnotí léky' },
      { href: '/clanek-vzacna-onemocneni-strategie-2035.html', title: 'Vzácných nemocí je šest tisíc, pacientů půl milionu' },
    ],
    strategies: ['std_atc_ddd'],
    explainers: ['lpod_lekovy_trh_2026', 'lekova_dostupnost_vypadky', 'sukl', 'hta'],
    related: [7, 4],
    sources: [
      { name: 'SÚKL — Přehled hlášení o přerušení/ukončení dodávek (§ 33b)', url: 'https://www.sukl.cz/' },
      { name: 'EU — Critical Medicines Act (COM 2024/138)', url: 'https://health.ec.europa.eu/' },
    ],
    contested: 'Emergency Stock a národní zásoby zní bezpečně, ale vážou kapitál a léky s omezenou trvanlivostí se musí obměňovat — sporná je optimální velikost zásob. Reexport je legální v rámci jednotného trhu EU; jeho omezení naráží na evropské právo. Otevřená otázka: kolik dostupnosti lze koupit, než náklady převáží přínos.',
  },
  {
    num: 6, slug: 'zdravotne-socialni-pomezi',
    name: 'Zdravotně sociální pomezí',
    deck: 'Pacient po cévní mozkové příhodě, senior s demencí, terminálně nemocný v hospici — všichni padají do mezery mezi MZ a MPSV. „Sociální lůžko" v nemocnici znamená, že systém prohrál.',
    why: {
      state: 'Česká péče je administrativně rozdělena mezi dvě ministerstva — zdravotnictví a práce a sociálních věcí. Hospicových lůžek je málo, podíl úmrtí doma či v hospici je nízký a senioři tvoří většinu interních hospitalizací.',
      holds: 'Na pomezí, kterým prochází pacient po CMP nebo senior s demencí, nikdo neoptimalizuje celek. V nemocnici zůstává „na sociálním lůžku" déle, než je medicínsky nutné. Sociální systém nedoplácí výkony, které by oddálily náklady ve zdravotnictví.',
      change: 'Cross-financování mezi pojišťovnou a MPSV, posílení domácí a paliativní péče a přítomnost rodiny v nemocnici jako standard.',
      risk: 'Bez integrace obou systémů pacient dál „padá mezi židle", nemocnice slouží jako drahá náhrada za chybějící sociální službu a důstojný konec života zůstává privilegiem.',
    },
    quote: 'Pacient nežije v ministerstvu. Reforma propojuje oba systémy v rovině, ve které lidé skutečně žijí.',
    indicators: ['hospicova_pece_luzka', 'umrti_doma_nebo_hospici_pct', 'pracovnici_ltc_per_100_65plus', 'podil_senioru_na_internich_hospitalizacich', 'nadeje_doziti_zdravi_65'],
    actions: [
      { action: 'Cross-financování ZP ↔ MPSV — pojišťovna může hradit sociální službu, pokud sníží zdravotní náklady', lever: 'Mezirezortní zákon o integraci ZSS', time: 'Rok 1–2' },
      { action: 'Posílení domácí péče místo neoblíbených LDN', lever: 'SZV + úhrady mobilní specializované péče', time: 'Rok 2–4' },
      { action: 'Paliativní a hospicová péče jako standardní součást úhrad', lever: 'Strategie paliativní péče + ZVZP', time: 'Rok 3' },
      { action: 'Přítomnost rodiny v nemocnici jako základní právo (24/7)', lever: 'Zákon o zdravotních službách 372/2011', time: 'Rok 4' },
    ],
    inspirations: [
      { flag: '🇩🇰 Dánsko', name: 'Hjemmepleje', text: 'Domácí péče je první volba pro seniory — nemocnice je výjimka, ne pravidlo. Obce a regiony spolu-financují.' },
      { flag: '🇳🇱 Nizozemsko', name: 'Buurtzorg', text: 'Komunitní ošetřovatelská služba — týmy 10–12 sester, samosprávné, plný scope (zdravotní + sociální). Mezinárodně replikováno.' },
      { flag: '🇬🇧 UK', name: 'Integrated Care Systems', text: 'NHS + Local Authorities sdílejí rozpočet pro chronickou péči. Cíl: žádné silos.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Mezirezortní zákon o integraci zdravotně-sociálních služeb (analog dánského modelu)' },
      { time: 'Rok 2', text: 'Cross-financování pilot pro CMP rehabilitaci a péči o seniory s demencí' },
      { time: 'Rok 3', text: 'Hospic + paliativní péče v plné úhradě pojišťoven' },
      { time: 'Rok 4', text: 'Přítomnost rodiny v nemocnici jako default + posílení domácí péče' },
    ],
    articles: [
      { href: '/clanek-socialne-zdravotni-pomezi-2026.html', title: 'Sociálně-zdravotní pomezí: jak zákon 38/2025 Sb. mění laťku' },
      { href: '/clanek-reforma-dlouhodobe-pece-2026.html', title: 'Dlouhodobá péče v Česku: tichá strukturální krize' },
      { href: '/clanek-nadeje-doziti-zdravi.html', title: 'Sedm a tři čtvrtě roku ve zdraví po šedesátce' },
    ],
    strategies: ['strategie_paliativni_2035', 'napad'],
    explainers: ['zakony_zdravotnictvi'],
    related: [11, 13],
    sources: [
      { name: 'OECD — Long-term care resources and utilisation', url: 'https://www.oecd.org/health/long-term-care.htm' },
      { name: 'ÚZIS ČR — Hospicová a paliativní péče', url: 'https://www.uzis.cz/' },
    ],
    contested: 'Cross-financování mezi dvěma resorty s odlišnými rozpočtovými pravidly je administrativně náročné a hrozí přesouvání odpovědnosti („to platí ti druzí"). Sporné je, kdo má integraci řídit — zda nový mezirezortní orgán, nebo kraje. Domácí péče není levnější automaticky; bez dostatku personálu jen přesune zátěž na rodiny.',
  },
  {
    num: 7, slug: 'svetovy-klinicky-vyzkum',
    name: 'Světový klinický výzkum',
    deck: 'Česko má historicky silnou pozici v klinickém výzkumu — kardiologie (CZECH-1/2/3), neurologie, onkologie. Postupně ji ztrácíme: administrativní zátěž etických komisí, slabé pobídky, neefektivní nábor.',
    why: {
      state: 'Klinický výzkum přináší pacientům přístup k novým terapiím, nemocnicím prestiž a financování, ekonomice export know-how. Česko si v některých oborech (transplantace) drží světovou úroveň, ale celková pozice se zhoršuje.',
      holds: 'Počet trial sites klesá, granty se vyhýbají administrativní zátěži (etické komise v každé fakultní nemocnici zvlášť), talentovaní výzkumníci odcházejí za lepšími podmínkami.',
      change: 'Centrální etická komise, plná implementace EU Clinical Trials Regulation, pobídky pro aktivní pracoviště a národní biobanka.',
      risk: 'Bez akce ztratí Česko zbytky výzkumné infrastruktury — pacienti přijdou o předčasný přístup k inovativní léčbě a know-how odejde do zahraničí.',
    },
    quote: 'Klinický výzkum není luxus. Je to způsob, jak český pacient dostává léčbu, kterou ve standardní praxi ještě neuvidí.',
    indicators: ['transplantace_per_milion', 'prezit_rakoviny_5let'],
    actions: [
      { action: 'Centrální etická komise — jediná schvalovací jednotka místo komisí v každé FN', lever: 'Novela zák. 378/2007 + zák. o ZS', time: 'Rok 1' },
      { action: 'EU Clinical Trials Regulation (536/2014) plně implementovat — jednotný portál CTIS', lever: 'Nařízení EU CTR + národní adaptace', time: 'Rok 1–2' },
      { action: 'Pobídky pro pracoviště aktivní ve výzkumu — bonus k DRG, prioritní podpora', lever: 'Úhradová vyhláška + grantová schémata', time: 'Rok 2' },
      { action: 'Národní biobanka propojená s NOR a NRH', lever: 'Zákon o NZIS + výzkumná infrastruktura', time: 'Rok 3' },
    ],
    inspirations: [
      { flag: '🇩🇰 Dánsko', name: 'Trial Nation', text: 'Centralizovaná struktura pro klinické trials přes 5 univerzit + Národní biobanka. Dánsko nadprůměrně rekrutuje globální trials.' },
      { flag: '🇬🇧 UK', name: 'NIHR', text: '<strong>National Institute for Health Research</strong> — financuje výzkum přes NHS, povinný benchmark pro trial sites, sankce za pomalý nábor.' },
      { flag: '🇧🇪 Belgie', name: 'CTC + EMA', text: 'Belgie získala sídlo EMA + má vlastní Clinical Trial Centre — historicky silný research hub i přes malou populaci.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Centrální etická komise legislativně + implementace CTR/CTIS' },
      { time: 'Rok 2', text: 'Pobídkový systém pro trial sites (bonus k DRG) — pilot 5 fakultních nemocnic' },
      { time: 'Rok 3', text: 'Národní biobanka s propojením NOR/NRH operační' },
      { time: 'Rok 5', text: 'Cíl: Česko v top 5 EU per capita rekrutací klinických trials' },
    ],
    articles: [
      { href: '/clanek-transplantace-darcovstvi-organu.html', title: 'Tichý rekord. Jak Česko dohnalo Španělsko v dárcovství orgánů' },
      { href: '/clanek-vzacna-onemocneni-strategie-2035.html', title: 'Vzácných nemocí je šest tisíc, pacientů půl milionu' },
      { href: '/clanek-hta-jca-eu-2026.html', title: 'Joint Clinical Assessment startuje. Česko hodnotí léky' },
    ],
    strategies: ['eu4health_2021_2027', 'eu_cancer_mission', 'narodni_onkologicky_plan_2030'],
    explainers: ['hta', 'specializovana_centra'],
    related: [5, 4],
    sources: [
      { name: 'EU Clinical Trials Information System (CTIS)', url: 'https://euclinicaltrials.eu/' },
      { name: 'OECD — Health R&D and innovation', url: 'https://www.oecd.org/health/' },
    ],
    contested: 'Centrální etická komise zrychlí schvalování, ale kritici varují před ztrátou lokální znalosti pracoviště a koncentrací moci. Pobídky vázané na nábor mohou tlačit na kvantitu trial sites na úkor kvality dohledu nad pacienty. Sporné je i to, nakolik má stát výzkum dotovat versus nechat na farmaceutickém průmyslu.',
  },
  {
    num: 8, slug: 'prevence-jako-standard',
    name: 'Prevence jako standard',
    deck: 'KV mortalita ČR 463/100k vs EU-27 313. Účast na kolorektálním screeningu 28 % vs OECD 42 %. Denní kuřáci 16,4 % vs OECD 14,8 %. Výdaje na prevenci rostou pětkrát pomaleji než léčebná péče.',
    why: {
      state: 'Česko je v primární prevenci pod evropským průměrem. Důsledek: vysoká kardiovaskulární mortalita, pozdě zachycené nádory (akutní resekce kolorekta má 3× vyšší 90d mortalitu než elektivní), předčasné úmrtí mužů v produktivním věku.',
      holds: 'Investice do prevence je neviditelná, léčba následků viditelná. Politici raději financují léčbu — voliči vidí výsledek. Výdaje na prevenci stagnují na 2,7 % vs OECD 3,4 %.',
      change: 'Posun investic z léčby do prevence, opt-out screening (aktivní zvaní), zdanění alkoholu a tabáku jako WHO Best Buy a bonifikace praktiků za outcome.',
      risk: 'Bez systémové prevence zůstane Česko v čele evropských žebříčků preventabilní úmrtnosti — a každý rok odkladu znamená tisíce zbytečných úmrtí.',
    },
    quote: 'Investice do prevence je neviditelná. Léčba následků je viditelná. Politici raději financují léčbu — voliči vidí výsledek. Reforma musí být dlouhodobá vize, ne kvartální PR.',
    indicators: ['mortalita_kardiovaskularni', 'screening_kolorektalni', 'incidence_kolorektalni', 'kuractvi_denni', 'alkohol_spotreba'],
    actions: [
      { action: 'Navýšit financování prevence na ≥ 5 % zdravotních výdajů', lever: 'Úhradová vyhláška + zdravotní rozpočet', time: 'Rok 1–5' },
      { action: 'Aktivní zvaní u všech populačních screeningů (Nordic opt-out model)', lever: 'Screeningové programy + reporting ÚZIS', time: 'Rok 2' },
      { action: 'Zdanění alkoholu a tabáku jako WHO Best Buy — minimální cena za jednotku', lever: 'Zákon o spotřebních daních', time: 'Rok 1' },
      { action: 'Hrazená dentální hygiena pro děti a mladistvé do 18 let', lever: 'Seznam zdravotních výkonů (SZV)', time: 'Rok 3' },
      { action: 'Bonifikace praktiků za outcome dispenzarizovaných pacientů', lever: 'Kapitační smlouva + P4P', time: 'Rok 4' },
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
    articles: [
      { href: '/clanek-rakovina-tlusteho-streva.html', title: 'Tichá epidemie. Proč Česko prohrává souboj s rakovinou střeva' },
      { href: '/clanek-vydaje-prevence.html', title: 'Dvě a tři čtvrtě procenta. Proč Česko utrácí na prevenci málo' },
      { href: '/clanek-alkohol-spotreba.html', title: 'Čtrnáct litrů. Proč Česko pije nejvíc v OECD' },
      { href: '/clanek-koureni.html', title: 'Šestnáct procent kouří denně. Česko kleslo pod průměr EU' },
    ],
    strategies: ['zdravi_2030', 'who_ncd_action_plan', 'screening_program_kolorektalni', 'eu_beating_cancer_plan'],
    explainers: ['reforma_hygienicke_sluzby'],
    related: [9, 13],
    sources: [
      { name: 'WHO — Best Buys for NCD prevention', url: 'https://www.who.int/teams/noncommunicable-diseases/' },
      { name: 'OECD HCQI — Preventive care indicators', url: 'https://www.oecd.org/health/health-care-quality-indicators.htm' },
      { name: 'Eurostat — Causes of death (hlth_cd_asdr2)', url: 'https://ec.europa.eu/eurostat/' },
    ],
    contested: 'Daňová opatření na alkohol a tabák fungují populačně, ale jsou politicky toxická a regresivní (dopadají víc na nízkopříjmové). Opt-out screening zvyšuje účast, ale i náklady a riziko overdiagnózy. Sporné je, kde leží hranice mezi účinnou veřejnou prevencí a paternalismem státu.',
  },
  {
    num: 9, slug: 'reforma-stomatologie',
    name: 'Reforma stomatologie',
    deck: 'Dentální péče je v ČR rozdělená — část hrazená pojišťovnou, většina out-of-pocket. Pacient bez peněz nemá zuby. Dostupnost zubaře přijímajícího pojištěnce klesá. Děti jsou prevencí pokryté nedostatečně.',
    why: {
      state: 'Stomatologie je v Česku „druhořadá péče" — kapitální výkony jsou hrazené, ale moderní materiály, endodoncie nad rámec a vyšší prevence jsou out-of-pocket. Účast na preventivní zubní prohlídce je přibližně poloviční.',
      holds: 'Důsledek: socio-ekonomický gradient v zubním zdraví. Zubní hygiena u dětí prakticky neexistuje jako hrazená služba, dospělí ve středním věku ztrácejí zuby předčasně. Zubaři přijímající pojištěnce ubývají.',
      change: 'Hrazená dentální hygiena do 18 let, bonifikace zubařů za prevenci, posílení sítě a standardizace materiálů (konec amalgámu per EU 2024/1849).',
      risk: 'Bez reformy se zubní zdraví stane otevřeným měřítkem příjmu — a preventabilní onemocnění dutiny ústní dál zatěžují systém i pacienty.',
    },
    quote: 'Zubní zdraví je proxy ekonomické nerovnosti. V Česku ji nezakrýváme — vystavujeme ji v ústech každého pacienta.',
    indicators: ['stomatologove_per_1000', 'ucast_preventivni_prohlidky_stomatolog', 'platba_z_kapsy_pct'],
    actions: [
      { action: 'Hrazená dentální hygiena pro děti a mladistvé do 18 let', lever: 'Seznam zdravotních výkonů (SZV)', time: 'Rok 1' },
      { action: 'Standardizace materiálů — kompozit jako default pro frontální zuby, amalgám fade-out', lever: 'EU nařízení 2024/1849 + úhradová logika', time: 'Rok 2' },
      { action: 'Bonifikace zubařů za prevenci (méně kazů a extrakcí = vyšší úhrada)', lever: 'Úhradová vyhláška — stomatologie', time: 'Rok 3' },
      { action: 'Posílení sítě zubařů přijímajících pojištěnce — sankce za nedostupnost', lever: 'NV 307/2012 + smluvní podmínky', time: 'Rok 4' },
    ],
    inspirations: [
      { flag: '🇩🇪 Německo', name: 'KZV', text: 'Komplexní úhradový systém — pojišťovna hradí prevenci, restaurace, parodontologii. Pacient si platí jen kosmetiku/luxus.' },
      { flag: '🇸🇪 Švédsko', name: 'Free dental until 23', text: 'Dentální péče plně zdarma do 23 let — komplexní prevence + restaurace + ortho. Dospělí mají bonus systém.' },
      { flag: '🇬🇧 UK', name: 'NHS Dental', text: 'Model: tři pásma plateb (band 1, 2, 3), zbytek hradí stát. Pacient ví, kolik zaplatí předem.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Legislativní úprava hrazené dentální hygieny do 18 let' },
      { time: 'Rok 2', text: 'Standardizace materiálů (kompozit default pro frontální zuby)' },
      { time: 'Rok 3', text: 'Bonifikace zubařů za prevenci (méně kazů = větší úhrada)' },
      { time: 'Rok 4', text: 'Sankce pojišťoven za nedostupnost zubaře (analog NHS guarantee)' },
      { time: 'Rok 5', text: 'Onkologická prevence v rámci kontroly (skríning dutiny ústní)' },
    ],
    articles: [
      { href: '/clanek-vydaje-prevence.html', title: 'Dvě a tři čtvrtě procenta. Proč Česko utrácí na prevenci málo' },
    ],
    strategies: ['zdravi_2030'],
    explainers: ['stomatologie_reforma_3', 'spoluucast_pacienta'],
    related: [8, 2],
    sources: [
      { name: 'EU nařízení 2024/1849 — fade-out dentálního amalgámu', url: 'https://eur-lex.europa.eu/' },
      { name: 'OECD — Oral health indicators', url: 'https://www.oecd.org/health/' },
    ],
    contested: 'Plně hrazená dentální péče (švédský model) je nákladná a sporné je, kde nastavit hranici mezi „nutnou" a „kosmetickou" péčí. Sankce za nedostupnost mohou vytlačit zubaře z veřejného systému úplně, místo aby je nalákaly. Konec amalgámu zvedá náklady na kompozit — kdo doplatek nese.',
  },
  {
    num: 10, slug: 'data-a-informace',
    name: 'Data a informace ve službách pacienta',
    deck: 'Index eHealth adoption ČR 62/100 vs OECD 70. Pacient přesouvaný mezi pracovišti nese papírovou dokumentaci. Lékař telefonuje kvůli volnému lůžku. Záchranná služba nemá v terénu zdravotní záznam.',
    why: {
      state: 'Elektronizace, kterou Česko deklaruje 20 let, je úspěšná spíš v jednotlivostech (eRecept) než jako koherentní infrastruktura. Estonsko má plnohodnotný národní eHealth od 2008, Dánsko sundhed.dk od 2003.',
      holds: 'Chybí jednotné standardy a interoperabilita. Poskytovatelé používají nekompatibilní systémy, sdílení dat brání obavy z dohledu i absence vůle. Česko stále řeší standardy místo provozu.',
      change: 'Jednotné standardy (FHIR), sdílení dat mezi poskytovateli, pacientský portál přes BankID a elektronické plánování kapacit v reálném čase.',
      risk: 'Bez funkční datové infrastruktury se opakují vyšetření, ztrácí čas i peníze a kvalitu nelze měřit. Reforma transparence i prevence stojí na datech, která nejsou propojená.',
    },
    quote: 'Elektronizace zdravotnictví je infrastruktura. Ne projekt na jedno volební období — investice na 15–20 let.',
    indicators: ['ehealth_adoption', 'spokojenost_informovani'],
    actions: [
      { action: 'Jednotné standardy elektronizace — FHIR jako default, povinný interop', lever: 'Zákon 325/2021 Sb. o elektronizaci', time: 'Rok 1–2' },
      { action: 'Sdílení dat mezi poskytovateli — lékař vidí aktuální záznam při překladu', lever: 'NZIS + EHDS implementace', time: 'Rok 2–3' },
      { action: 'Pacientský portál přes BankID/eIdentity s plnou kontrolou přístupu (audit log)', lever: 'Zákon o elektronizaci + eGovernment', time: 'Rok 2–3' },
      { action: 'Elektronické plánování kapacit v reálném čase (čekací doby, volná lůžka)', lever: 'NZIS — datová povinnost poskytovatelů', time: 'Rok 3' },
    ],
    inspirations: [
      { flag: '🇪🇪 Estonsko', name: 'X-Road + e-Health', text: 'Od 2008 plnohodnotný národní eHealth — e-Prescription, e-Consultation, EHR s pacientskou kontrolou. Pacient vidí, kdo a kdy.' },
      { flag: '🇩🇰 Dánsko', name: 'sundhed.dk', text: 'Národní zdravotní portál od 2003, propojený s primární péčí přes MedCom. 80 %+ adopce.' },
      { flag: '🇫🇮 Finsko', name: 'Kanta', text: 'Osobní zdravotní záznam + e-Prescription + archiv vyšetření. Plně integrované do systému.' },
    ],
    timeline: [
      { time: 'Rok 1–2', text: 'Legislativní ukotvení standardů (FHIR, interop)' },
      { time: 'Rok 2–3', text: 'Pacientský portál přes BankID + audit log' },
      { time: 'Rok 3–5', text: 'Aktualizace softwaru poskytovatelů na jednotné standardy' },
      { time: 'Rok 3', text: 'Elektronické plánování kapacit operační' },
      { time: 'Rok 5+', text: 'Anonymizovaná data otevřená denně' },
    ],
    articles: [
      { href: '/clanek-ehealth.html', title: '62 versus 70. Co index eHealth měří a proč v něm Česko zaostává' },
      { href: '/clanek-ezkarta-ehealth.html', title: 'Šedesát dva ze sta. Český eHealth má EZKartu v telefonu' },
      { href: '/clanek-ehds-evropsky-prostor-zdravotni-data.html', title: 'Evropský prostor zdravotních dat: jak nařízení EHDS změní péči' },
      { href: '/clanek-kyberneticka-bezpecnost-zdravotnictvi-2026.html', title: 'Když ransomware vyřadí nemocnici. Zákon 264/2025 Sb., NIS2' },
    ],
    strategies: ['ehealth_2025_2035', 'ehds'],
    explainers: ['nzis', 'indiko_portal'],
    related: [4, 3],
    sources: [
      { name: 'OECD — Digital health / eHealth adoption', url: 'https://www.oecd.org/health/health-systems/' },
      { name: 'EU — European Health Data Space (EHDS)', url: 'https://health.ec.europa.eu/ehealth-digital-health-and-care/european-health-data-space_en' },
    ],
    contested: 'Sdílení zdravotních dat naráží na napětí mezi službou a dohledem — lékaři se obávají, že infrastruktura poslouží ke kontrole, ne k péči. Kybernetická bezpečnost je reálné riziko (ransomware už české nemocnice vyřadil). Sporné je tempo: tlak na rychlou adopci versus důkladná ochrana citlivých dat.',
  },
  {
    num: 11, slug: 'vzdelani-a-personal',
    name: 'Vzdělání a podmínky personálu',
    deck: 'Lékařské fakulty mají nedostatek kapacit. Sestry odcházejí ze systému. Vzdělávání je rigidní, vázané na vyhlášku, neumožňuje flexibilní kariérní cesty. Specializace jsou nedostupné v některých regionech.',
    why: {
      state: 'Personální krize je dlouhodobá. Lékařů má Česko mírně nad OECD, ale jejich rozložení je nerovnoměrné a chybí sestry, absolventi i celé specializace (psychiatři, geriatři, primární péče v periferii).',
      holds: 'Sestry odcházejí kvůli pracovním podmínkám a platům. Vzdělávací systém nereflektuje moderní potřeby (digitalizace, paliativní péče, multidisciplinární týmy). Kompetence nelékařů jsou úzce vymezené.',
      change: 'Navýšit kapacity fakult, zavést flexibilní kariérní cesty (advanced practice nurse), posílit kompetence nelékařů a regionální bonusy pro nedostatkové obory.',
      risk: 'Bez personálu nebude reforma, jen koncepce. Stárnoucí populace zvyšuje poptávku, zatímco síť poskytovatelů v regionech se ztenčuje.',
    },
    quote: 'Personál je nejhlubší pilíř systému. Bez personálu nebude reforma — jen koncepce.',
    indicators: ['lekari_per_1000', 'sestry_per_1000', 'absolventi_lekarstvi_per_100k', 'psychiatri_per_100k'],
    actions: [
      { action: 'Navýšení kapacit lékařských fakult + bonifikace nedostatkových specializací', lever: 'MŠMT + MZ — rozpočet vzdělávání', time: 'Rok 2' },
      { action: 'Flexibilní kariérní cesty — advanced practice nurse s rozšířenými kompetencemi', lever: 'Zákon 96/2004 Sb. o nelékařích', time: 'Rok 3' },
      { action: 'Posílení nelékařských kompetencí (vakcinace v lékárně, sesterská preskripce)', lever: 'Novela 96/2004 — kompetence 2026', time: 'Rok 1' },
      { action: 'Regionální bonusy pro nedostatkové specializace mimo Prahu', lever: 'Úhradová vyhláška + dotační tituly', time: 'Rok 2' },
    ],
    inspirations: [
      { flag: '🇳🇱 Nizozemsko', name: 'Verpleegkundig specialist', text: 'Advanced practice nurses s preskripčním právem v primární péči. Zpřístupňují systém + uvolňují lékaře.' },
      { flag: '🇬🇧 UK', name: 'NHS workforce plan 2023', text: 'Patnáctileté plánování personálu — kvóty fakult, retention programy, advanced practice role.' },
      { flag: '🇫🇮 Finsko', name: 'Sestry v primární péči', text: 'Sestry s preskripčním právem pro chronické nemoci. Decentralizovaný model.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Novela 96/2004 Sb. — sesterská preskripce + posílení nelékařských kompetencí' },
      { time: 'Rok 2', text: 'Navýšení kapacit LF + regionální bonusy pro nedostatkové specializace' },
      { time: 'Rok 3', text: 'Flexibilní kariérní cesty (advanced practice nurse program)' },
      { time: 'Rok 5+', text: 'Patnáctileté plánování personálu (NHS-style workforce plan)' },
    ],
    articles: [
      { href: '/clanek-pracovni-sila.html', title: 'Lékařů máme víc než OECD. Sester chybí. A absolventů taky' },
      { href: '/clanek-osetrovatelstvi-generacni-propast-2026.html', title: 'Generační propast v ošetřovatelství: proč nám chybí tisíce sester' },
      { href: '/clanek-okresni-nemocnice-personalni-krize.html', title: 'Pelhřimov, Znojmo a co dál. Personální krize okresních nemocnic' },
    ],
    strategies: ['zdravi_2030'],
    explainers: ['kompetence_nelekarske_2026', 'profesni_komory'],
    related: [6, 13],
    sources: [
      { name: 'OECD — Health workforce', url: 'https://www.oecd.org/health/health-workforce.htm' },
      { name: 'ÚZIS ČR — Personální kapacity ve zdravotnictví', url: 'https://www.uzis.cz/' },
    ],
    contested: 'Rozšiřování kompetencí nelékařů naráží na odpor části lékařské obce (obava o kvalitu a kompetenční spory). Navýšení kapacit fakult se projeví až za 10+ let a samo neřeší retenci. Sporné je, zda regionální bonusy stačí, nebo zda je třeba závazek odpracovat roky v regionu výměnou za hrazené studium.',
  },
  {
    num: 12, slug: 'prava-pacientu',
    name: 'Práva pacientů',
    deck: 'Pacient v Česku má teoretická práva, ale slabé vymahací mechanismy. Nemocniční ombudsman je novinka (povinný od 7/2026), jeho efektivita však závisí na lokální implementaci. Stížnosti se řeší pomalu a neviditelně.',
    why: {
      state: 'Pacient nespokojený s péčí má v ČR několik paralelních cest — pojišťovna, krajský úřad, MZ, ombudsman, soud. Žádná z nich není rychlá. Spokojenost s péčí je sice nad OECD, ale informovanost a vymahatelnost práv zaostávají.',
      holds: 'Nemocniční ombudsman zavedený novelou 290/2025 Sb. je krok správným směrem, ale závisí na implementaci. Bez standardizovaných lhůt a sankcí zůstává stížnost často bez odezvy.',
      change: 'Standardizovat stížnostní řízení (lhůta 30 dní, sankce), zavést pacientského advokáta pro vážné diagnózy, Patient Safety Incidents a mediaci sporů.',
      risk: 'Bez vymahatelnosti zůstanou práva pacientů na papíře — a důvěra v systém, kterou data ukazují jako křehkou, dál klesá.',
    },
    quote: 'Práva pacienta měříme tím, jak rychle dostane odpověď na stížnost. Ne tím, kolik paragrafů je v zákoně.',
    indicators: ['spokojenost_pece', 'spokojenost_informovani', 'unmet_need_medical'],
    actions: [
      { action: 'Nemocniční ombudsman — povinná role v každém poskytovateli s lůžkovou péčí', lever: 'Novela 290/2025 Sb. (úč. 1. 7. 2026)', time: 'Rok 1' },
      { action: 'Standardizace stížnostního řízení — max. lhůta 30 dní, sankce za nedodržení', lever: 'Zákon o zdravotních službách 372/2011', time: 'Rok 2' },
      { action: 'Patient Safety Incidents jako v aviaci — povinné hlášení, kultura učení z chyb', lever: 'Zákon o ZS + metodika ÚZIS', time: 'Rok 3' },
      { action: 'Pacientský advokát pro vážné diagnózy + mediátor sporů jako alternativa k soudu', lever: 'SZV + zákon o mediaci', time: 'Rok 4' },
    ],
    inspirations: [
      { flag: '🇩🇰 Dánsko', name: 'Patient Compensation', text: 'Bez-viny odškodňovací systém — pacient nemusí prokazovat „vinu" lékaře, jen že újma vznikla. Rychlé, jasné.' },
      { flag: '🇸🇪 Švédsko', name: 'No-fault insurance', text: 'Patient injury insurance — automatické odškodnění bez soudu pro definované újmy. Skandinávský model.' },
      { flag: '🇳🇱 Nizozemsko', name: 'IGJ', text: 'Silný inspekční orgán s pravomocí veřejně publikovat výsledky inspekcí per pracoviště.' },
    ],
    timeline: [
      { time: 'Rok 1', text: 'Implementace nemocničního ombudsmana (zákon 290/2025 Sb., účinnost 1. 7. 2026)' },
      { time: 'Rok 2', text: 'Standardizace stížnostního řízení + lhůty + sankce' },
      { time: 'Rok 3', text: 'Pilot Patient Safety Incidents systému (3 fakultní nemocnice)' },
      { time: 'Rok 4', text: 'Pacientský advokát pro onkologii a vážné diagnózy' },
      { time: 'Rok 5+', text: 'No-fault compensation model (skandinávský)' },
    ],
    articles: [
      { href: '/clanek-narok-pojistence-1-co-to-je.html', title: 'Co dnes skutečně máte nárok? Anatomie ústavního práva na péči' },
      { href: '/clanek-narok-pojistence-4-jak-definovat.html', title: 'Jak definovat nárok pojištěnce. Co, kdy a kde má pacient' },
    ],
    strategies: ['oecd_hspa_cz'],
    explainers: ['nemocnicni_ombudsman', 'novela_zakon_290_2025', 'pacientske_organizace'],
    related: [3, 2],
    sources: [
      { name: 'OECD — Patient safety indicators', url: 'https://www.oecd.org/health/patient-safety.htm' },
      { name: 'Novela 290/2025 Sb. — zákon o zdravotních službách', url: 'https://www.zakonyprolidi.cz/' },
    ],
    contested: 'No-fault odškodnění zrychluje kompenzaci, ale kritici varují, že oslabuje odpovědnost za chyby. Povinné hlášení incidentů funguje jen v kultuře bez trestání — sporné je, jak ji vybudovat v prostředí zvyklém hledat viníka. A pacientský advokát placený z pojištění zvedá náklady.',
  },
  {
    num: 13, slug: 'dusevni-zdravi',
    name: 'Dostupná péče o duševní zdraví',
    deck: 'Sebevražednost ČR 12,5/100k vs OECD 11. Antidepresiva 77 DDD/1000/den, mírně nad průměrem OECD — léky se předepisují, systém péče ne. Center duševního zdraví je málo, jejich pokrytí nerovnoměrné, personál malý.',
    why: {
      state: 'Reforma psychiatrické péče běží od 2013, vznikla síť Center duševního zdraví, ale jejich pokrytí je nerovnoměrné. Antidepresiv se předepisuje mírně nad průměrem OECD, zatímco psychiatrů je méně a hospitalizace jsou výrazně delší.',
      holds: 'Psychoterapie není zákonem definovaná profese, takže pojištění hradí nesystematicky. Děti a mladiství mají nejhorší dostupnost — dětských psychiatrů je kriticky málo.',
      change: 'Zákonná definice psychoterapeuta a systematická úhrada, rozšíření personálu CDZ, dostupnost dětské psychiatrie a posun zdrojů z lůžkové do komunitní péče.',
      risk: 'Bez systému péče zůstanou léky náhradou za léčbu. Neléčená duševní onemocnění zvyšují sebevražednost, pracovní neschopnost i zátěž rodin.',
    },
    quote: 'Antidepresiva nejsou náhrada za systém. Léků se v Česku předepisuje mírně nad průměrem OECD, ale dostupnost terapie výrazně zaostává.',
    indicators: ['sebevrazdy_per_100k', 'pouzivani_antidepresiv', 'psychiatri_per_100k', 'psychiatrie_prumerna_delka_hospitalizace'],
    actions: [
      { action: 'Zákonná definice psychoterapeuta + systematická úhrada psychoterapie', lever: 'Nový zákon o psychoterapii', time: 'Rok 1' },
      { action: 'Rozšíření personálu CDZ o sociální pracovníky, peer konzultanty, adiktology', lever: 'Reforma psychiatrie + úhrady ZP', time: 'Rok 2' },
      { action: 'Zvýšení dostupnosti dětské psychiatrie — kapacity + krajská distribuce', lever: 'Vzdělávání + síťové standardy', time: 'Rok 3' },
      { action: 'Posun zdrojů z lůžkové do komunitní péče (model Article 107)', lever: 'Úhradová vyhláška — psychiatrie', time: 'Rok 5+' },
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
    articles: [
      { href: '/clanek-sebevrazdy-dusevni-zdravi.html', title: 'Léky se předepisují, péče ne. Český paradox duševního zdraví' },
      { href: '/clanek-reforma-psychiatrie-13-let.html', title: 'Reforma psychiatrie po třinácti letech: co dotáhla a co ne' },
      { href: '/clanek-detska-psychiatrie-krize.html', title: 'Sto padesát sedm dětských psychiatrů na celé Česko' },
      { href: '/clanek-protidrogova-dusevni-politika-mz-2026.html', title: 'Protidrogová a duševně-zdravotní agenda se stěhuje na MZ' },
    ],
    strategies: ['reforma_dusevni_zdravi', 'who_mental_health_action_plan', 'eu_mental_health_strategy'],
    explainers: [],
    related: [11, 6],
    sources: [
      { name: 'OECD — Mental health', url: 'https://www.oecd.org/health/mental-health.htm' },
      { name: 'WHO — Mental Health Action Plan 2013–2030', url: 'https://www.who.int/teams/mental-health-and-substance-use/' },
      { name: 'ÚZIS ČR — Psychiatrická péče', url: 'https://www.uzis.cz/' },
    ],
    contested: 'Deinstitucionalizace (Itálie, Belgie) funguje jen tam, kde komunitní síť skutečně vznikne — jinak se pacienti ocitnou bez péče. Vysoká spotřeba antidepresiv nemusí být jen selhání: část odráží lepší záchyt depresí. Sporné je tempo přesunu lůžek a kdo nese riziko v přechodném období.',
  },
];

// --- Render helpery ---------------------------------------------------------

// AV srovnávací bar ČR vs benchmark (statický, bez JS). Normalizováno k max.
function renderDataSection(ids) {
  if (!Array.isArray(ids) || !ids.length) return '';
  const cards = ids.map(id => {
    const ind = INDICATORS[id];
    if (!ind) { console.warn(`  ⚠ indikátor ${id} nenalezen — karta přeskočena`); return ''; }
    const b = ind.benchmark ?? {};
    const benchVal = (b.eu ?? b.oecd);
    const benchLbl = (b.eu !== undefined && b.eu !== null) ? 'EU' : 'OECD';
    const benchParts = [];
    if (b.oecd !== undefined && b.oecd !== null) benchParts.push(`OECD ${cz(b.oecd)}`);
    if (b.eu !== undefined && b.eu !== null) benchParts.push(`EU ${cz(b.eu)}`);
    const bench = benchParts.length ? benchParts.join(' · ') : `Zdroj: ${ind.source?.name ?? '—'}`;
    const unit = ind.unit ? ` ${ind.unit}` : '';

    // Srovnávací bar jen když máme číselný benchmark i hodnotu
    let cmp = '';
    if (typeof ind.value === 'number' && typeof benchVal === 'number' && benchVal > 0) {
      const max = Math.max(ind.value, benchVal);
      const wCz = Math.round((ind.value / max) * 100);
      const wB = Math.round((benchVal / max) * 100);
      cmp = `
          <div class="mdc-cmp" aria-hidden="true">
            <span class="mdc-cmp-row"><span class="mdc-cmp-lbl">ČR</span><span class="mdc-cmp-track"><i class="mdc-cmp-fill mdc-cmp-fill-cz" style="width:${wCz}%"></i></span><span class="mdc-cmp-num">${cz(ind.value)}</span></span>
            <span class="mdc-cmp-row"><span class="mdc-cmp-lbl">${benchLbl}</span><span class="mdc-cmp-track"><i class="mdc-cmp-fill" style="width:${wB}%"></i></span><span class="mdc-cmp-num">${cz(benchVal)}</span></span>
          </div>`;
    }

    return `
        <a class="manifest-data-card" href="/indikator-${id}.html" data-indicator-id="${id}" data-indicator-domain="manifest">
          <div class="manifest-data-card-id">${id}</div>
          <div class="manifest-data-card-value">${cz(ind.value)}${unit}</div>
          <div class="manifest-data-card-name">${esc(ind.name)}</div>${cmp}
          <div class="manifest-data-card-bench">${bench} · ${ind.year}</div>
        </a>`;
  }).filter(Boolean).join('');
  if (!cards) return '';
  return `
    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Související data</div>
      <h3 class="manifest-sub-section-h">Co k tomu říká HSPA Monitor</h3>
      <p>Tato priorita se opírá o měřitelné indikátory. Hodnoty jsou živé — kliknutím se dostanete na detail indikátoru s trendem a metodikou. Pruhy srovnávají ČR s evropským, resp. OECD benchmarkem.</p>
      <div class="manifest-priority-data-grid">${cards}
      </div>
    </section>
`;
}

function renderActions(actions) {
  const rows = actions.map(a => `
        <li class="manifest-sub-action">
          <div class="manifest-sub-action-main">${a.action}</div>
          <div class="manifest-sub-action-meta">
            <span class="manifest-sub-action-lever"><span class="manifest-sub-action-tag">Páka</span> ${a.lever}</span>
            <span class="manifest-sub-action-time"><span class="manifest-sub-action-tag">Termín</span> ${a.time}</span>
          </div>
        </li>`).join('');
  return `
      <ul class="manifest-sub-actions">${rows}
      </ul>`;
}

function renderWhy(why) {
  if (typeof why === 'string') return `<p>${why}</p>`;
  return `
      <div class="manifest-sub-why">
        <div class="manifest-sub-why-item">
          <div class="manifest-sub-why-lbl">Současný stav</div>
          <p>${why.state}</p>
        </div>
        <div class="manifest-sub-why-item">
          <div class="manifest-sub-why-lbl">Co to drží</div>
          <p>${why.holds}</p>
        </div>
        <div class="manifest-sub-why-item manifest-sub-why-item-change">
          <div class="manifest-sub-why-lbl">Co se musí změnit</div>
          <p>${why.change}</p>
        </div>
        <div class="manifest-sub-why-item manifest-sub-why-item-risk">
          <div class="manifest-sub-why-lbl">Risk při nečinnosti</div>
          <p>${why.risk}</p>
        </div>
      </div>`;
}

function renderLinks(p) {
  const groups = [];

  if (Array.isArray(p.articles) && p.articles.length) {
    const items = p.articles.map(a => `<li><a href="${a.href}">${esc(a.title)}</a></li>`).join('');
    groups.push(`
        <div class="manifest-sub-links-group">
          <h4 class="manifest-sub-links-h">Související články</h4>
          <ul class="manifest-sub-links-list">${items}</ul>
        </div>`);
  }
  if (Array.isArray(p.strategies) && p.strategies.length) {
    const items = p.strategies.map(id => {
      const name = STRATEGIES[id] ?? id;
      return `<li><a href="/strategie.html?id=${encodeURIComponent(id)}">${esc(name)}</a></li>`;
    }).join('');
    groups.push(`
        <div class="manifest-sub-links-group">
          <h4 class="manifest-sub-links-h">Strategické dokumenty</h4>
          <ul class="manifest-sub-links-list">${items}</ul>
        </div>`);
  }
  if (Array.isArray(p.explainers) && p.explainers.length) {
    const items = p.explainers.map(id => {
      const name = EXPLAINERS[id] ?? id;
      return `<li><a href="/jak-funguje.html?id=${encodeURIComponent(id)}">${esc(name)}</a></li>`;
    }).join('');
    groups.push(`
        <div class="manifest-sub-links-group">
          <h4 class="manifest-sub-links-h">Vysvětlivky pojmů a procesů</h4>
          <ul class="manifest-sub-links-list">${items}</ul>
        </div>`);
  }
  if (Array.isArray(p.related) && p.related.length) {
    const items = p.related.map(num => {
      const rp = PRIORITIES.find(x => x.num === num);
      if (!rp) return '';
      const fn = `priorita-${String(rp.num).padStart(2, '0')}-${rp.slug}.html`;
      return `<li><a href="/manifest/${fn}">Priorita ${rp.num} · ${esc(rp.name)}</a></li>`;
    }).filter(Boolean).join('');
    groups.push(`
        <div class="manifest-sub-links-group">
          <h4 class="manifest-sub-links-h">Související priority manifestu</h4>
          <ul class="manifest-sub-links-list">${items}</ul>
        </div>`);
  }

  if (!groups.length) return '';
  return `
    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Souvislosti</div>
      <h3 class="manifest-sub-section-h">Kde si přečíst víc</h3>
      <div class="manifest-sub-links">${groups.join('')}
      </div>
    </section>
`;
}

function renderSourcesAndContested(p) {
  let out = '';
  if (typeof p.contested === 'string' && p.contested.trim()) {
    out += `
    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Otevřená debata</div>
      <h3 class="manifest-sub-section-h">Co je sporné</h3>
      <div class="manifest-sub-contested">
        <p>${p.contested}</p>
      </div>
    </section>
`;
  }
  if (Array.isArray(p.sources) && p.sources.length) {
    const items = p.sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.name)} ↗</a></li>`).join('');
    out += `
    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Zdroje</div>
      <h3 class="manifest-sub-section-h">Zdroje a další čtení</h3>
      <ul class="manifest-sub-sources">${items}
      </ul>
    </section>
`;
  }
  return out;
}

function renderPage(p) {
  const fileName = `priorita-${String(p.num).padStart(2, '0')}-${p.slug}.html`;
  const filePath = path.join(OUT_DIR, fileName);

  const inspirationsHtml = p.inspirations.map(i => `
        <article class="manifest-sub-inspiration-card">
          <div class="manifest-sub-inspiration-flag">${i.flag} · ${i.name}</div>
          <p class="manifest-sub-inspiration-text">${i.text}</p>
        </article>`).join('');

  const timelineHtml = p.timeline.map(t => `
        <li>
          <span class="manifest-sub-timeline-time">${t.time}</span>
          <span class="manifest-sub-timeline-text">${t.text}</span>
        </li>`).join('');

  const descr = p.deck.replace(/<[^>]+>/g, '');

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Priorita ${p.num} · ${p.name} — Manifest reformy zdravotnictví · HSPA Monitor</title>
<meta name="description" content="${esc(descr.slice(0, 160))}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article">
<meta property="og:locale" content="cs_CZ">
<meta property="og:title" content="Priorita ${p.num} · ${esc(p.name)} — Manifest reformy zdravotnictví">
<meta property="og:description" content="${esc(descr.slice(0, 200))}">
<meta property="og:image" content="/assets/brand/og-default.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="/assets/brand/og-default.png">
<link rel="canonical" href="https://hspa-cesko.cz/manifest/${fileName}">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="stylesheet" href="/src/styles.css">
</head>
<body>
<a class="skip-link" href="#content">Přeskočit na hlavní obsah</a>

<header class="topbar">
  <div class="brand">
    <a href="/index.html" class="brand-link"><h1><abbr class="hspa-abbr" title="Health System Performance Assessment">HSPA</abbr> <em>monitor</em>
      <small>skorezdravotnictvi.cz · Manifest · Priorita ${p.num}</small>
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
      <a href="/clanek-manifest-reforma-zdravotnictvi.html">← Zpět na hlavní manifest</a>
      · <a href="/manifest/">Všech 13 priorit</a>
    </nav>

    <header class="manifest-sub-header">
      <span class="manifest-sub-tag">Manifest · Priorita ${p.num} z 13</span>
      <h2 class="manifest-sub-title">${p.num} · ${p.name}</h2>
      <p class="manifest-sub-deck">${p.deck}</p>
    </header>

    <div class="manifest-sub-prose">
    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Proč to záleží</div>
      <h3 class="manifest-sub-section-h">Kontext: co dnes nefunguje</h3>
${renderWhy(p.why)}
      <blockquote class="manifest-sub-pullquote">${p.quote}</blockquote>
    </section>

    <section class="manifest-sub-section">
      <div class="manifest-sub-section-kicker">Konkrétní opatření</div>
      <h3 class="manifest-sub-section-h">Co konkrétně udělat — opatření, páka, termín</h3>
${renderActions(p.actions)}
    </section>
    </div>
${renderDataSection(p.indicators)}
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
${renderLinks(p)}${renderSourcesAndContested(p)}
    <aside class="manifest-sub-cta">
      <div class="manifest-sub-cta-kicker">Pokračovat ve čtení</div>
      <h3 class="manifest-sub-cta-h">Tato priorita je jedna ze 13. Vrátit se na hlavní manifest →</h3>
      <a class="manifest-sub-cta-link" href="/clanek-manifest-reforma-zdravotnictvi.html#manifestHeadline">Manifest reformy českého zdravotnictví ↑</a>
    </aside>
  </article>
</main>

<footer class="bottom" id="siteFooter"></footer>

<script type="module">
  import '/src/analytics.js';
  import { renderModuleNav, renderMastheadDate, loadGlossaryTerms } from '/src/page-shared.js';
  import { enhanceInlineGlossary } from '/src/glossary-inline.js';
  renderModuleNav('articles');
  renderMastheadDate();
  loadGlossaryTerms().then(terms => enhanceInlineGlossary(terms)).catch(() => {});
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
    // Absolutní URL — relativní `./X` se s Vercel cleanUrls + trailingSlash:false
    // ROZBÍJÍ (index.html se servíruje pod /manifest bez koncového /, browser
    // pak `./priorita-NN` parsuje do rootu → /priorita-NN → 404).
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
<meta property="og:type" content="website">
<meta property="og:locale" content="cs_CZ">
<meta property="og:title" content="Manifest · 13 priorit reformy českého zdravotnictví — HSPA Monitor">
<meta property="og:image" content="/assets/brand/og-default.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="/assets/brand/og-default.png">
<link rel="canonical" href="https://hspa-cesko.cz/manifest/index.html">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="stylesheet" href="/src/styles.css">
</head>
<body>
<a class="skip-link" href="#content">Přeskočit na hlavní obsah</a>

<header class="topbar">
  <div class="brand">
    <a href="/index.html" class="brand-link"><h1><abbr class="hspa-abbr" title="Health System Performance Assessment">HSPA</abbr> <em>monitor</em>
      <small>skorezdravotnictvi.cz · Manifest · 13 priorit</small>
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
      <a href="/clanek-manifest-reforma-zdravotnictvi.html">← Hlavní manifest</a>
    </nav>

    <header style="border-bottom: 2px solid var(--ink); padding-bottom: 22px; margin-bottom: 24px;">
      <div class="ed-kicker">Manifest reformy · index priorit</div>
      <h2 style="font-family: var(--serif); font-size: 36px; font-weight: 700; line-height: 1.15; margin: 8px 0 12px;">Třináct priorit, na kterých má smysl pracovat</h2>
      <p style="font-family: var(--serif); font-size: 17px; line-height: 1.55; color: var(--ink-mut); max-width: 720px;">
        Detailní rozbor každé z 13 priorit politického manifestu reformy českého zdravotnictví. Každá stránka obsahuje: <strong>proč to záleží</strong> (kontext + data), <strong>co konkrétně udělat</strong> (opatření, páka, termín), <strong>kde už to funguje</strong> (mezinárodní inspirace), <strong>souvislosti</strong> (články, strategie, vysvětlivky) a <strong>co je sporné</strong>.
      </p>
    </header>

    <section class="manifest-index-grid">${cardsHtml}
    </section>

    <aside class="manifest-sub-cta">
      <div class="manifest-sub-cta-kicker">Pokračovat ve čtení</div>
      <h3 class="manifest-sub-cta-h">Hlavní manifest — kontext, autoři, governance</h3>
      <a class="manifest-sub-cta-link" href="/clanek-manifest-reforma-zdravotnictvi.html">Průvodce reformou českého zdravotnictví →</a>
    </aside>
  </article>
</main>

<footer class="bottom" id="siteFooter"></footer>

<script type="module">
  import '/src/analytics.js';
  import { renderModuleNav, renderMastheadDate } from '/src/page-shared.js';
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
