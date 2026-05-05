// Detail stránka indikátoru — načtení indicators.json + regions.json + metodické karty,
// vykreslení trendu, SVG mapy krajů a kontextových sekcí.

import { renderRegionsMap, fmtVal } from './regions-map.js';

const DATA_URL = 'data/indicators.json';
const REGIONS_URL = 'data/regions.json';

const SIGNAL_LABEL = {
  good: 'Dobré',
  warn: 'Ke sledování',
  bad: 'Kritické',
  neutral: 'Bez benchmarku',
};
const SIGNAL_COLOR = {
  good: '#38761D',
  warn: '#B45F06',
  bad: '#990000',
  neutral: '#0B5394',
};
const DIRECTION_LABEL = {
  higher_is_better: '↑ vyšší = lepší',
  lower_is_better: '↓ nižší = lepší',
  context_dependent: '↔ kontextové',
};
const AREA_DESC = {
  'Výsledky': 'Co systém přináší pacientům — zdravotní stav, dožití, mortalita.',
  'Výstupy': 'Co systém produkuje — kvalita péče, dostupnost, výdaje.',
  'Procesy': 'Jak je péče poskytována — preventivní programy, screeningy, čekací doby.',
  'Struktury': 'Z čeho se systém skládá — personál, kapacity, infrastruktura.',
};

let _trendChart = null;

function getId() {
  const params = new URLSearchParams(location.search);
  return params.get('id');
}

function showError(msg) {
  const root = document.getElementById('detailRoot');
  root.innerHTML = `
    <div class="status error" style="margin-top:24px">
      ${escapeText(msg)}
      <p style="margin-top:8px"><a href="index.html">← Zpět na přehled indikátorů</a></p>
    </div>`;
}

function escapeText(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function yoyPct(trend) {
  if (!Array.isArray(trend) || trend.length < 2) return 0;
  const last = trend[trend.length - 1]?.value;
  const prev = trend[trend.length - 2]?.value;
  if (last == null || prev == null || prev === 0) return 0;
  return ((last - prev) / prev) * 100;
}

function gapToOECD(indicator) {
  const oecd = indicator.benchmark?.oecd;
  if (oecd == null || oecd === 0) return null;
  return ((indicator.value - oecd) / oecd) * 100;
}

// ====== KONTEXT KAŽDÉHO INDIKÁTORU (co ho ovlivňuje, proč je důležitý) ======
// Mapování id → { drivers (faktory), why (proč je důležitý), levers (páky reformy) }
// Cíl: každá karta ukazuje smysluplný kontext, ne jen čísla.
const INDICATOR_CONTEXT = {
  nadeje_doziti_total: {
    why: 'Naděje dožití při narození je syntetický ukazatel zachycující úmrtnostní poměry napříč všemi věky. Slouží jako hlavní souhrnný indikátor zdravotního stavu populace v rámcích WHO i OECD.',
    drivers: ['Životní styl (kouření, alkohol, obezita)', 'Kvalita kardiovaskulární a onkologické péče', 'Socioekonomický gradient (vzdělání, příjem)', 'Kvalita vzduchu a životní prostředí', 'Dostupnost specializované péče v regionu'],
    levers: ['Plnění Národní strategie podpory zdraví (Zdraví 2030)', 'Snížení podílu kuřáků (cíl: < 20 %)', 'Cílené screeningy v periferních krajích', 'Investice do prevence kardiovaskulárních onemocnění'],
  },
  nadeje_doziti_zeny: {
    why: 'Genderový rozdíl v naději dožití (~5 let ve prospěch žen) je v ČR srovnatelný s evropským průměrem; klíčové je sledovat i naději dožití ve zdraví, kde je rozdíl mnohem menší (~1 rok).',
    drivers: ['Nižší výskyt rizikového chování u žen historicky', 'Lepší adherence k preventivním programům (mamograficky, cervikální cytologie)', 'Vyšší kontaktní frekvence s primární péčí'],
    levers: ['Cílená prevence kardiovaskulárních nemocí u žen po menopauze', 'Posílení podpory zdraví v dolních příjmových kvintilech'],
  },
  nadeje_doziti_zdravi_65: {
    why: 'Healthy Life Years (HLY) zachycují dobu, kterou senior prožije bez závažných omezení. Je klíčový pro plánování dlouhodobé péče a pracovní účasti seniorů. ČR je dlouhodobě pod průměrem EU.',
    drivers: ['Prevalence chronických onemocnění (diabetes, CHOPN, KVN)', 'Kapacita rehabilitační a geriatrické péče', 'Sociální podpora pro seniory v domácím prostředí', 'Frailty (křehkost) ve věku 65+'],
    levers: ['Rozvoj integrované péče o seniory', 'Národní program prevence pádů', 'Geriatrická revize medikace (deprescripce)'],
  },
  mortalita_kardiovaskularni: {
    why: 'KVN jsou nejčastější příčinou úmrtí v ČR (~40 %). Standardizovaná mortalita umožňuje srovnání bez vlivu věkové struktury. ČR je v EU v horní polovině.',
    drivers: ['Hypertenze (35 % populace, kontrola < 50 %)', 'Hypercholesterolemie', 'Kouření', 'Obezita a fyzická inaktivita', 'Pozdní záchyt fibrilace síní', 'Dostupnost intervenční kardiologie a STEMI sítě'],
    levers: ['Národní kardiovaskulární program', 'STEMI síť (door-to-balloon ≤ 60 min)', 'Statinová prevence v primární péči', 'Cílený screening fibrilace síní u 65+'],
  },
  mortalita_onkologicka: {
    why: 'Onkologická mortalita odráží jak prevenci a screeningy (záchyt v časném stádiu), tak kvalitu onkologické léčby. ČR má rozdíly mezi kraji až 30 %.',
    drivers: ['Tabáková a alkoholová expozice', 'Pokrytí screeningových programů (kolorektální, prsu, cervix)', 'Dostupnost komplexních onkologických center', 'Časový interval od podezření k diagnóze a zahájení léčby'],
    levers: ['Plán proti rakovině 2030', 'Rozšíření zvacího systému screeningu', 'Sjednocení komplexních onkologických center', 'Genomická diagnostika a personalizovaná léčba'],
  },
  mortalita_preventabilni: {
    why: 'Preventabilní mortalita (úmrtí, kterým bylo možné předejít efektivní zdravotní intervencí < 75 let věku) je hlavní indikátor výkonu zdravotnictví. ČR má jednu z nejvyšších v EU.',
    drivers: ['Pozdní záchyt onemocnění v primární péči', 'Slabá prevence v marginalizovaných skupinách', 'Nerovnoměrná dostupnost specializované péče v regionech', 'Tabáková a alkoholová epidemie'],
    levers: ['Posílení primární péče (gatekeeping)', 'Zlepšení screeningových programů', 'Cílené intervence v sociálně vyloučených lokalitách'],
  },
  mortalita_inhosp_ami: {
    why: 'In-hospital mortalita po akutním infarktu myokardu je standardní OECD HCQI ukazatel kvality akutní kardiologie. Klesá v zemích s rozvinutou STEMI sítí.',
    drivers: ['Door-to-balloon time', 'Hustota katetrizačních laboratoří', 'Kvalita pre-hospital péče (ZZS)', 'Včasná diagnostika EKG v terénu'],
    levers: ['STEMI síť (závazné dojezdové časy)', 'EKG v terénu s telekonzultací', 'Standardizace léčebných protokolů'],
  },
  mortalita_inhosp_cmp: {
    why: 'Časná hospitalizační mortalita po cévní mozkové příhodě reflektuje kvalitu iktové péče (stroke unit) a včasnost trombolýzy / trombektomie.',
    drivers: ['Iktové centra (síť 13 KCC + 32 IC)', 'Rychlost CT/MRI vyšetření', 'Kvalifikace personálu (interdisciplinarita)', 'Dostupnost trombektomie do 6 hodin'],
    levers: ['Iktový program (Cerebrovaskulární program)', 'Telemedicína mezi IC a KCC', 'Veřejná osvěta (FAST kampaň)'],
  },
  cekaci_doba_kycel: {
    why: 'Čekací doba na elektivní totální endoprotézu je klíčový OECD HCQI ukazatel dostupnosti plánované péče. Indikuje kapacitu ortopedie a alokaci výkonů.',
    drivers: ['Personální kapacita ortopedů (vždy nedostatek)', 'Lůžková kapacita po operaci', 'Úhradová politika pojišťoven', 'Pandemie COVID-19 prohloubila nedoplatky'],
    levers: ['Jednodenní chirurgie (zkrácení LOS)', 'Optimalizace OP plánu', 'Zvýšení rezidenčních míst v ortopedii', 'Centralizace výkonů s vyšší kapacitou'],
  },
  cekaci_doby_specialist: {
    why: 'Doba čekání na první vyšetření u ambulantního specialisty (kardiolog, neurolog, dermatolog atd.) je klíčový indikátor dostupnosti. V ČR pro řadu oborů > 3 měsíce.',
    drivers: ['Nedostatek ambulantních specialistů (hl. v perif. krajích)', 'Asymetrická dostupnost mezi kraji (Praha vs. Vysočina)', 'Stárnutí populace ambulantních lékařů', 'Smluvní politika pojišťoven'],
    levers: ['Síťová vyhláška 307/2012 Sb. (dosud slabá vymahatelnost)', 'Rozšíření telemedicínských konzultací', 'Posílení primární péče jako gatekeepera'],
  },
  cezarsky_rez_pct: {
    why: 'Podíl porodů císařským řezem nad doporučovaných 10–15 % WHO indikuje nadužívání. ČR má ~28 %, EU ~25 %.',
    drivers: ['Nárůst rodiček 35+', 'Defenzivní medicína (právní odpovědnost)', 'Komfort plánování (elektivní SC)', 'Vágní indikační kritéria'],
    levers: ['Závazné indikační guideliny ČGPS', 'Audit indikací (peer review)', 'Edukace rodiček o vaginálním porodu', 'Bonifikace nemocnic s nižším SC%'],
  },
  screening_kolorektalni: {
    why: 'Kolorektální karcinom je 2. nejčastější onkologickou diagnózou v ČR. Účast ve screeningu nad 60 % redukuje mortalitu o 30–40 %.',
    drivers: ['Pasivní vs. aktivní zvací systém', 'Důvěra v praktického lékaře', 'Dostupnost koloskopistických center', 'Strach pacientů z procedury'],
    levers: ['Adresné zvací dopisy (od 2014)', 'Posílení screeningových center', 'Zjednodušení odběru testu (online objednávka)'],
  },
  screening_mamograficky: {
    why: 'Mamografický screening (45–69 let, à 2 roky) je hlavní preventivní opatření proti karcinomu prsu. WHO cíl 70 % účast.',
    drivers: ['Aktivní zvací systém pojišťoven', 'Síť screeningových center (~70 v ČR)', 'Důvěra v gynekologa', 'Strach z výsledku'],
    levers: ['Zlepšení adresnosti zvánek', 'Mobilní mamografy v perif. regionech', 'Zkrácení čekací doby na výsledek'],
  },
  screening_cervix: {
    why: 'Cervikální cytologie redukuje mortalitu na karcinom děložního čípku o 80 %. ČR má dlouhodobě nadprůměr v EU.',
    drivers: ['Dostupnost gynekologa', 'HPV vakcinace (od 2012)', 'Aktivní zvací systém'],
    levers: ['Co-testing HPV + cytologie (od 2025)', 'Rozšíření HPV vakcinace na chlapce'],
  },
  vakcinace_mmr_deti: {
    why: 'Proočkovanost MMR ≥ 95 % je nutná pro herd immunity proti spalničkám. ČR pod hranicí, opakované epidemie 2018–2024.',
    drivers: ['Vakcinační skepse (sociální média)', 'Odmítání povinného očkování', 'Slabší kontaktní frekvence dětí ze sociálně vyloučených lokalit'],
    levers: ['Edukační kampaně', 'Sankce za odmítnutí povinného očkování (kontroverzní)', 'Cílená imunizace v exkluzích'],
  },
  vakcinace_chripka_65: {
    why: 'Proočkovanost proti chřipce u 65+ je hlavní preventivní opatření proti chřipkové sezónní mortalitě. WHO cíl 75 %.',
    drivers: ['Slabá osvěta', 'Nízká participace praktiků', 'Mýty o nežádoucích účincích'],
    levers: ['Kampaně doporučení od praktického lékaře', 'Vakcinace v lékárnách', 'Bezplatná vakcína pro 65+'],
  },
  spotreba_antibiotik: {
    why: 'Spotřeba antibiotik měřená v DDD/1000 obyvatel/den je klíčový ukazatel rezistence. ČR má dlouhodobě nadprůměr ve srovnání s EU.',
    drivers: ['Nadužívání v ambulantní péči (zejména pediatrie)', 'Slabá diagnostika virových vs. bakteriálních infekcí', 'Tlak pacientů na předpis'],
    levers: ['Národní antibiotický program (NAP)', 'Rapid testy CRP / strep testy', 'Stewardship programy v nemocnicích'],
  },
  rezistence_antibiotik_ecoli: {
    why: 'Procento E. coli rezistentní k cefalosporinům 3. generace je standardní ECDC indikátor. ČR má rostoucí trend.',
    drivers: ['Nadspotřeba širokospektrých antibiotik', 'Slabá izolace MDR pacientů v nemocnicích', 'Veterinární spotřeba antibiotik'],
    levers: ['Antibiotický stewardship', 'Zlepšení nemocniční hygieny', 'Restrikce reservních antibiotik'],
  },
  hospitalizace_na_100k: {
    why: 'Míra hospitalizací indikuje, jak je péče řešena ambulantně vs. lůžkově. ČR má dlouhodobě nadprůměr (preference hospitalizace).',
    drivers: ['Slabší ambulantní specializovaná péče', 'Úhradové motivace (DRG case-rate)', 'Tradice "nechat si pacienta v nemocnici"', 'Stárnutí populace'],
    levers: ['Posílení ambulantní péče', 'Jednodenní chirurgie', 'Domácí hospitalizace (po vzoru Dánska)'],
  },
  prumerna_delka_hospitalizace: {
    why: 'Average Length of Stay (ALOS) je standardní OECD ukazatel efektivity nemocnic. ČR má v některých oborech > EU průměru.',
    drivers: ['DRG úhrady (motivace držet pacienta déle)', 'Slabá návaznost na následnou péči', 'Sociální propustky (chybí umístění do LDN)'],
    levers: ['Trim-point regulace v DRG', 'Posílení sítě následné péče', 'Domácí péče (home care)'],
  },
  readmise_30d_ami: {
    why: '30denní readmise po IM ukazatel kvality post-hospitalizační péče. Indikuje, jak je pacient připraven na propuštění.',
    drivers: ['Kvalita propouštěcího dokumentu', 'Návaznost na ambulantního kardiologa', 'Adherence k medikaci', 'Sekundární prevence'],
    levers: ['Strukturovaný discharge planning', 'Time-to-cardiologist do 14 dní', 'Pacientská edukace'],
  },
  bezpecnost_padu_nemocnice: {
    why: 'Pády v nemocnicích jsou nejčastější nežádoucí událost u hospitalizovaných seniorů. Indikuje kvalitu ošetřovatelské péče.',
    drivers: ['Kapacita ošetřovatelského personálu (sestry / lůžko)', 'Vybavení (zábradlí, anti-skid)', 'Polypragmazie (psychofarmaka)', 'Frailty pacientů'],
    levers: ['Standard kvality ošetřovatelské péče', 'Skríning rizika pádu (Morse scale)', 'Programy prevence pádů'],
  },
  spokojenost_pece: {
    why: 'PREMs (Patient Reported Experience Measures) jsou klíčový OECD HCQI ukazatel zaměřený na percepci pacienta.',
    drivers: ['Kvalita komunikace s personálem', 'Čekací doby ve špitalu', 'Informovanost o léčbě', 'Hotelová úroveň prostředí'],
    levers: ['Standardizovaný PREMs sběr (návrh ÚZIS)', 'Bonifikace poskytovatelů s vyšším skóre'],
  },
  spokojenost_informovani: {
    why: 'Subindikátor spokojenosti — jak dobře je pacient informován o léčbě, alternativách a rizicích. Klíč pro shared decision making.',
    drivers: ['Časová kapacita lékaře (typ. 10–15 min/pacient)', 'Komunikační dovednosti (slabě v kurikulu)', 'Dostupnost edukačních materiálů'],
    levers: ['Strukturovaný informovaný souhlas', 'Tréninky komunikace pro rezidenty', 'Pacientské edukační portály'],
  },
  ehealth_adoption: {
    why: 'eHealth pokrytí (eRecept, eNeschopenka, ePoukaz, EHR, telemedicína) indikuje digitální zralost systému.',
    drivers: ['eRecept povinný od 2018', 'Slabá interoperabilita IS poskytovatelů', 'Chybí národní pacientský EHR portál (Národní zdravotní informační systém je v běhu)'],
    levers: ['Národní strategie eHealth 2030', 'Standardy interoperability (HL7 FHIR)', 'Pacientský přístup k vlastní zdrav. dokumentaci'],
  },
  lekari_per_1000: {
    why: 'Hustota lékařů je strukturální ukazatel dostupnosti. ČR ~4,1/1000 ob., nadprůměr v OECD (3,7), ale s vysokou regionální variabilitou.',
    drivers: ['Migrace mladých lékařů do Německa/Rakouska', 'Stárnutí lékařské populace (medián > 50 let)', 'Centralizace v Praze a Brně', 'Limitované rezidenční kvóty'],
    levers: ['Stipendijní programy MZČR pro perif. kraje', 'Posílení rezidenčních míst', 'Atraktivita perif. nemocnic (housing, kariéra)'],
  },
  sestry_per_1000: {
    why: 'Hustota sester je hlavní limit kapacity lůžkové péče. ČR pod průměrem OECD, prohlubuje se kontinuálně.',
    drivers: ['Nízká atraktivita povolání (mzdy, směnnost)', 'Migrace do soukromého sektoru a do zahraničí', 'Slabá role sester v multioborové péči'],
    levers: ['Mzdový systém + bonifikace', 'Rozšíření kompetencí sester (advanced practice)', 'Stipendijní programy'],
  },
  ct_per_milion: {
    why: 'Hustota CT skenerů indikuje diagnostickou kapacitu. ČR má nadprůměr v OECD, ale s nerovnoměrným rozložením.',
    drivers: ['Investice z fondů EU', 'Komerční diagnostická centra', 'Bonifikace pojišťoven za diagnostické výkony'],
    levers: ['Optimalizace sítě (excessivní v některých regionech)', 'Národní program racionálního využití zobrazovacích metod'],
  },
  mri_per_milion: {
    why: 'MRI je drahá modalita pro neurologickou, ortopedickou a onkologickou diagnostiku. ČR mírně pod průměrem OECD, čekací doby > EU.',
    drivers: ['Vysoká pořizovací cena (~30 mil. Kč)', 'Personální zátěž (radiolog + technik)', 'Centralizace v lůžkových zařízeních'],
    levers: ['Investice z OP Zdraví', 'Telediagnóza (centralizace popisu)', 'Optimalizace indikací (chyby z duplicit)'],
  },
  postele_akutni_per_1000: {
    why: 'Hustota akutních lůžek indikuje strukturální kapacitu lůžkové péče. ČR má dlouhodobě nadprůměr OECD (~4,5 vs. 3,5).',
    drivers: ['Historická síť okresních nemocnic', 'Slabá ambulantní péče → kompenzace lůžkovou', 'DRG úhrady motivují k vyšší obsazenosti'],
    levers: ['Restrukturalizace nemocniční sítě (kontroverzní)', 'Konverze akutních lůžek na následnou péči', 'Posílení ambulantní specializované péče'],
  },
  obezita_prevalence: {
    why: 'Obezita (BMI ≥ 30) je rizikový faktor diabetu, KVN a onkologie. ČR má prevalenci ~25 % dospělé populace, nad průměrem EU.',
    drivers: ['Stravovací zvyklosti (vysoký podíl rafinovaných sacharidů)', 'Sedavý životní styl', 'Socioekonomický gradient', 'Slabá osvěta v primární péči'],
    levers: ['Národní akční plán proti obezitě', 'Daň ze sladkých nápojů (dosud zamítnuto)', 'Zlepšení školního stravování', 'Bariatrická chirurgie indikace'],
  },
  alkohol_spotreba: {
    why: 'ČR má nejvyšší spotřebu alkoholu v EU (~14 l čistého alkoholu/os./rok). Příčina ~5 % všech úmrtí.',
    drivers: ['Kulturní akceptace alkoholu', 'Nízká cena (akcíz < EU průměr)', 'Slabá restrikce reklamy', 'Tradiční toleranci'],
    levers: ['Zvýšení akcízu na alkohol', 'Restrikce reklamy', 'Programy léčby závislostí (AT centra)'],
  },
  kuractvi_denni: {
    why: 'Podíl denních kuřáků je vůdčí preventabilní příčina úmrtí. ČR má cca 22 %, klesající trend.',
    drivers: ['Cena cigaret', 'Restrikce reklamy a kuřáckých prostor', 'Edukační programy ve školách', 'Dostupnost cessačních programů'],
    levers: ['Zvýšení akcízu na tabák', 'Plain packaging (po Austrálii)', 'Cessační poradenství v primární péči'],
  },
  pm25_expozice: {
    why: 'Roční střední expozice PM2.5 je hlavní environmentální riziko. WHO doporučuje ≤ 5 μg/m³, ČR ~13 μg/m³.',
    drivers: ['Hnědé uhlí v Severních Čechách a na Ostravsku', 'Lokální topeniště (kotle 1.+2. třídy)', 'Doprava (NOx + PM)', 'Sekundární aerosoly z chemie'],
    levers: ['Kotlíkové dotace', 'Nízkoemisní zóny v aglomeracích', 'Konec uhelné energetiky', 'Elektromobilita'],
  },
  incidence_kolorektalni: {
    why: 'ČR má historicky jednu z nejvyšších incidenci kolorektálního karcinomu v Evropě. Klesající trend díky screeningu.',
    drivers: ['Stravovací zvyklosti (uzeniny, červené maso)', 'Obezita', 'Nedostatek fyzické aktivity', 'Genetická predispozice'],
    levers: ['Pokrytí screeningu', 'Edukace stravování', 'Časný záchyt v rizikových rodinách (Lynchův syndrom)'],
  },
  incidence_prsu: {
    why: 'Karcinom prsu je nejčastější ženský nádor. Incidence v ČR roste, ale díky screeningu klesá mortalita.',
    drivers: ['Pozdní těhotenství', 'Hormonální substituce po menopauze', 'Obezita', 'Genetické faktory (BRCA1/2)'],
    levers: ['Pokrytí screeningu (cíl 70 %)', 'Genetické poradenství v rizikových rodinách', 'Životní styl (fyz. aktivita)'],
  },
  ambulantni_kontakty_per_capita: {
    why: 'Počet ambulantních kontaktů na osobu/rok indikuje intenzitu primární a specializované ambulantní péče. ČR má dlouhodobě nejvyšší v EU.',
    drivers: ['Slabý gatekeeping primární péče', 'Možnost přímého přístupu ke specialistovi', 'Krátké konzultace (5–10 min)', 'Systémové motivace (kapitace + výkonové)'],
    levers: ['Posílení role praktiků (gatekeeping)', 'Telekonzultace pro standardní dotazy', 'Pacientská edukace (kdy NE k lékaři)'],
  },
  kontrola_hypertenze: {
    why: 'Procento hypertoniků s kontrolovaným krevním tlakem (< 140/90) indikuje kvalitu chronické péče. ČR má ~50 %, EU ~55 %.',
    drivers: ['Adherence k medikaci', 'Frekvence kontrol (typicky 6 měsíců)', 'Životní styl (sůl, alkohol, váha)', 'Diagnostika v primární péči'],
    levers: ['Integrované klinické dráhy hypertenze', 'Domácí monitoring TK (úhrada)', 'Cílené remindery praktiků'],
  },
  sebevrazdy_per_100k: {
    why: 'Sebevražednost je klíčový ukazatel mentálního zdraví. ČR má cca 13/100k, mírně nad průměrem EU.',
    drivers: ['Dostupnost psychiatrické péče (čekací doby > 3 měsíce)', 'Stigmatizace duševních nemocí', 'Sociální izolace seniorů', 'Závislost na alkoholu'],
    levers: ['Reforma psychiatrické péče (CDZ, multidisciplinární týmy)', 'Linky důvěry', 'Restrikce přístupu k prostředkům'],
  },
  vydaje_zdravotnictvi_hdp: {
    why: 'Výdaje na zdravotnictví v % HDP indikují prioritizaci sektoru. ČR je v EU pod průměrem (~7,8 % vs. 9,2 %).',
    drivers: ['Růst HDP vs. růst nákladů péče', 'Stárnutí populace', 'Inovace (drahé biologické léky)', 'Mzdový tlak'],
    levers: ['Vyšší transfer ze státního rozpočtu', 'Zvýšení sazby pojistného', 'Rozšíření spoluúčastí (kontroverzní)'],
  },
  vydaje_leky_hdp: {
    why: 'Výdaje na léky v % HDP indikují farmaceutickou intenzitu péče. ČR má průměrnou hodnotu, ale s rostoucím podílem inovativních léků.',
    drivers: ['Stárnutí populace', 'Růst preskripčních inovativních léků', 'Patentové cliffs (generizace)', 'Centralizovaný nákup vs. tržní cena'],
    levers: ['Centralizovaný nákup (společný EU)', 'Promotion generik', 'HTA hodnocení nových léčiv'],
  },
  platba_z_kapsy_pct: {
    why: 'Out-of-pocket platby pacienta jako % všech výdajů na zdravotnictví indikují finanční zátěž domácností. ČR ~14 %, EU ~15 %.',
    drivers: ['Doplatky za léky', 'Stomatologie (mimo VZP)', 'Estetické a alternativní výkony', 'Soukromé pojištění (rostoucí)'],
    levers: ['Rozšíření plně hrazených léků', 'Kontrola doplatků za léky', 'Ochrana před katastrofickými výdaji (cap)'],
  },
  nesplnene_potreby_pece: {
    why: 'Self-reported unmet needs jsou klíčový OECD/EU indikátor sociální dostupnosti. ČR má extrémně nízké hodnoty (1–2 %), zatímco některé jihoevropské země hlásí 6–10 %.',
    drivers: ['Dostupnost péče bez doplatků pro většinu segmentů', 'Pojišťovny jako jediný platce → nízká finanční bariéra', 'Sociální gradient v reportingu (nižší vzdělání reportuje méně přes percepci)', 'Nezohledněné jsou neviditelné bariéry (čas, doprava, byrokracie)'],
    levers: ['Stratifikace dat dle příjmového kvintilu (zatím neúplná)', 'Měření čekacích dob jako přímý indikátor přístupu', 'Sledování stomatologie zvlášť (kde jsou doplatky vysoké)'],
  },
};

function defaultContext(indicator) {
  return {
    why: `Indikátor patří do oblasti HSPA „${indicator.area}" / domény „${indicator.domain}". Jeho sledování umožňuje porovnat výkonnost ČR s OECD/EU benchmarky a identifikovat regionální disparity.`,
    drivers: ['Faktory ovlivňující tento indikátor jsou popsány v přidružené metodické kartě a strategiích.'],
    levers: ['Reformní páky jsou dále rozpracovány v sekci Strategie a v relevantních explainerech.'],
  };
}

// ====== HLAVNÍ RENDER ======

async function loadAll(id) {
  const [indResp, regResp] = await Promise.all([
    fetch(DATA_URL).then(r => r.ok ? r.json() : null),
    fetch(REGIONS_URL).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);
  if (!indResp) throw new Error('Nepodařilo se načíst data/indicators.json');
  const indicator = indResp.indicators.find(i => i.id === id);
  if (!indicator) throw new Error(`Indikátor "${id}" nebyl nalezen.`);
  const dataset = regResp?.datasets?.find(d => d.id === id) ?? null;

  // Metodická karta (volitelně)
  let card = null;
  try {
    const r = await fetch(indicator.method_card_url);
    if (r.ok) card = await r.json();
  } catch { /* pokračuj bez karty */ }

  // Cross-links
  let strategies = [], explainers = [];
  try {
    const [s, e] = await Promise.all([
      fetch('data/strategies.json').then(r => r.ok ? r.json() : { strategies: [] }).catch(() => ({ strategies: [] })),
      fetch('data/explainers.json').then(r => r.ok ? r.json() : { explainers: [] }).catch(() => ({ explainers: [] })),
    ]);
    strategies = s.strategies?.filter(x => (x.linked_indicators ?? []).includes(id)) ?? [];
    explainers = e.explainers?.filter(x => (x.linked_indicators ?? []).includes(id)) ?? [];
  } catch { /* okay */ }

  return { indicator, dataset, card, strategies, explainers };
}

function renderHeader(indicator) {
  const sigClass = indicator.signal || 'neutral';
  const sigLabel = SIGNAL_LABEL[sigClass] || '';
  const yoy = yoyPct(indicator.trend);
  const yoyAbs = Math.abs(yoy);
  const trendArrow = Math.abs(yoy) < 0.5 ? '→' : (yoy > 0 ? '↑' : '↓');
  const direction = indicator.direction ?? 'context_dependent';
  const isImprovement = direction !== 'context_dependent' && (
    (direction === 'higher_is_better' && yoy > 0) ||
    (direction === 'lower_is_better' && yoy < 0)
  );
  const yoyClass = Math.abs(yoy) < 0.5 ? 'flat' : (isImprovement ? 'good' : 'bad');

  const oecdGap = gapToOECD(indicator);
  const oecdGapHTML = oecdGap != null
    ? `<span class="id-bm-row">vs. OECD: <strong>${(oecdGap > 0 ? '+' : '')}${oecdGap.toFixed(1)} %</strong> (${indicator.benchmark.oecd} ${indicator.unit})</span>`
    : '';
  const euBenchHTML = indicator.benchmark?.eu != null
    ? `<span class="id-bm-row">EU: <strong>${indicator.benchmark.eu}</strong> ${indicator.unit}</span>`
    : '';
  const oecdBestHTML = indicator.benchmark?.oecd_best != null
    ? `<span class="id-bm-row">Nejlepší v OECD: <strong>${indicator.benchmark.oecd_best}</strong> ${indicator.unit}</span>`
    : '';

  return `
    <header class="id-header">
      <a class="back-link" href="index.html">← Všechny indikátory</a>
      <div class="id-area-tag">${escapeText(indicator.area)} · ${escapeText(indicator.domain)}${indicator.subdomain ? ' · ' + escapeText(indicator.subdomain) : ''}</div>
      <h2>${escapeText(indicator.name)}</h2>
      <div class="id-summary">
        <div class="id-big">
          <span class="id-value">${indicator.value}</span>
          <span class="id-unit">${escapeText(indicator.unit)}</span>
          <span class="id-year">${indicator.year ?? ''}</span>
        </div>
        <div class="id-meta">
          <span class="signal-pill ${sigClass}">${escapeText(sigLabel)}</span>
          <span class="id-direction" title="Směr ukazatele">${DIRECTION_LABEL[direction] ?? direction}</span>
          <span class="id-trend trend-${yoyClass}" title="Meziroční změna">${trendArrow} ${yoyAbs.toFixed(1)} % YoY</span>
        </div>
        <div class="id-bm">
          ${oecdGapHTML}
          ${euBenchHTML}
          ${oecdBestHTML}
        </div>
      </div>
      <p class="id-area-desc">${escapeText(AREA_DESC[indicator.area] || '')}</p>
    </header>
  `;
}

function renderTrendChart(indicator) {
  if (!Array.isArray(indicator.trend) || indicator.trend.length < 2) return;
  const canvas = document.getElementById('idTrendCanvas');
  if (!canvas) return;
  if (_trendChart) { _trendChart.destroy(); _trendChart = null; }

  const color = SIGNAL_COLOR[indicator.signal] || SIGNAL_COLOR.neutral;
  const labels = indicator.trend.map(t => t.year);
  const datasets = [{
    label: 'ČR',
    data: indicator.trend.map(t => t.value),
    borderColor: color, backgroundColor: color + '22',
    fill: true, tension: 0.3, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5,
  }];
  if (indicator.benchmark?.oecd != null) {
    datasets.push({
      label: 'OECD průměr',
      data: labels.map(() => indicator.benchmark.oecd),
      borderColor: '#4A90D9', backgroundColor: 'transparent',
      borderDash: [6, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }
  if (indicator.benchmark?.eu != null) {
    datasets.push({
      label: 'EU průměr',
      data: labels.map(() => indicator.benchmark.eu),
      borderColor: '#E69138', backgroundColor: 'transparent',
      borderDash: [3, 3], borderWidth: 1.5, pointRadius: 0, fill: false,
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // eslint-disable-next-line no-undef
  _trendChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: reducedMotion ? { duration: 0 } : { duration: 600 },
      plugins: {
        legend: { display: datasets.length > 1, position: 'top', labels: { font: { size: 12 }, boxWidth: 16 } },
        tooltip: { displayColors: true },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: { grid: { color: '#EDF2F7' }, ticks: { font: { size: 12 }, maxTicksLimit: 5 } },
      },
    },
  });
}

function renderRegionsTable(dataset) {
  if (!dataset) return '';
  const dir = dataset.direction ?? 'higher_is_better';
  const betterHigher = dir !== 'lower_is_better';
  const sorted = [...dataset.regions].sort((a, b) => betterHigher ? b.value - a.value : a.value - b.value);

  const rows = sorted.map((r, idx) => {
    const diff = (r.value - dataset.country_avg);
    const diffSign = diff > 0 ? '+' : '';
    const diffCls = (betterHigher ? diff > 0 : diff < 0) ? 'pos' : (diff === 0 ? '' : 'neg');
    return `<tr data-code="${r.code}">
      <td class="rk-rank">${idx + 1}.</td>
      <td>${escapeText(r.name)}</td>
      <td class="rk-val">${fmtVal(r.value, '')}</td>
      <td class="diff ${diffCls}">${diffSign}${diff.toFixed(1)}</td>
    </tr>`;
  }).join('');

  return `
    <table class="id-regions-table" id="idRegionsTable">
      <thead><tr>
        <th></th>
        <th>Kraj</th>
        <th>${escapeText(dataset.unit)}</th>
        <th>Δ od ČR (${dataset.country_avg})</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderRegionsSection(dataset) {
  if (!dataset) {
    return `
      <section class="id-section">
        <h3>Regionální rozpad</h3>
        <p class="id-empty-region">Pro tento indikátor zatím není k dispozici detailní krajský rozpad. Pracujeme na doplnění z NRPZS / NRH / krajských statistik ÚZIS.</p>
      </section>`;
  }
  return `
    <section class="id-section" id="idRegionsSection">
      <h3>Regionální rozpad po krajích</h3>
      <p class="id-section-note">Hexagonální mapa zachovává geografické pořadí krajů (sever ↑, západ ←). Kliknutím na kraj zvýrazníte řádek v tabulce. Zelený rámeček = nejlepší kraj, červený = nejhorší.</p>
      <div class="id-regions-grid">
        <div class="id-map-wrap">
          <svg id="idRegionsMap" class="rmap-svg" xmlns="http://www.w3.org/2000/svg"></svg>
          <div class="id-map-legend">
            <span><i class="lg-dot" style="background:#38761D"></i> Lepší než průměr ČR</span>
            <span><i class="lg-dot" style="background:#990000"></i> Horší než průměr ČR</span>
            <span class="lg-note">Kraj: <strong>${dataset.country_avg}</strong> ${escapeText(dataset.unit)} (${dataset.year})</span>
          </div>
        </div>
        <div class="id-regions-table-wrap">
          ${renderRegionsTable(dataset)}
        </div>
      </div>
    </section>
  `;
}

function renderContextSection(indicator) {
  const ctx = INDICATOR_CONTEXT[indicator.id] || defaultContext(indicator);
  const driversList = (ctx.drivers || []).map(d => `<li>${escapeText(d)}</li>`).join('');
  const leversList = (ctx.levers || []).map(d => `<li>${escapeText(d)}</li>`).join('');
  return `
    <section class="id-section id-context">
      <h3>Proč je tento indikátor důležitý</h3>
      <p class="id-why">${escapeText(ctx.why)}</p>
      <div class="id-context-grid">
        <div class="id-context-block">
          <h4>Co indikátor ovlivňuje</h4>
          <ul class="id-list">${driversList}</ul>
        </div>
        <div class="id-context-block">
          <h4>Reformní páky</h4>
          <ul class="id-list">${leversList}</ul>
        </div>
      </div>
    </section>
  `;
}

function renderTrendSection(indicator) {
  const hasChart = Array.isArray(indicator.trend) && indicator.trend.length >= 2;
  if (!hasChart) {
    return `<section class="id-section">
      <h3>Vývoj v čase</h3>
      <p class="id-section-note">Pro tento indikátor není k dispozici delší časová řada.</p>
    </section>`;
  }
  return `
    <section class="id-section">
      <h3>Vývoj v čase</h3>
      <p class="id-section-note">Trend ČR (souvislá křivka) v porovnání s benchmarky OECD a EU (přerušované linie).</p>
      <div class="id-trend-wrap"><canvas id="idTrendCanvas" aria-label="Graf vývoje indikátoru v čase"></canvas></div>
    </section>
  `;
}

function renderMethodSection(card, indicator) {
  if (!card) {
    return `<section class="id-section">
      <h3>Metodika</h3>
      <p class="id-section-note">Detailní metodická karta není dostupná. Základní data:</p>
      <dl class="id-method">
        <dt>Jednotka</dt><dd>${escapeText(indicator.unit)}</dd>
        <dt>Zdroj</dt><dd>${escapeText(indicator.source?.name || '—')}</dd>
      </dl>
    </section>`;
  }
  return `
    <section class="id-section">
      <h3>Metodika a definice</h3>
      <dl class="id-method">
        <dt>Definice</dt><dd>${escapeText(card.definition || '—')}</dd>
        <dt>Jednotka</dt><dd>${escapeText(card.unit || indicator.unit)}</dd>
        <dt>Směr</dt><dd>${DIRECTION_LABEL[card.direction] || card.direction || '—'}</dd>
        <dt>Frekvence</dt><dd>${escapeText(card.frequency || '—')}</dd>
        <dt>Garanti</dt><dd>${escapeText((card.stewards || []).join(', ') || '—')}</dd>
        ${card.signal_thresholds ? `<dt>Prahy signálu</dt><dd>good ≥ ${card.signal_thresholds.good} %, warn nad −${card.signal_thresholds.warn} %</dd>` : ''}
        ${card.method_notes ? `<dt>Metodika</dt><dd>${escapeText(card.method_notes)}</dd>` : ''}
        ${card.limitations ? `<dt>Omezení</dt><dd>${escapeText(card.limitations)}</dd>` : ''}
      </dl>
    </section>
  `;
}

function renderCrossLinks(strategies, explainers) {
  if (!strategies.length && !explainers.length) return '';
  let html = `<section class="id-section"><h3>Souvislosti</h3>`;
  if (strategies.length) {
    html += `<h4 class="id-cross-h">Strategie</h4><div class="chip-row">`;
    html += strategies.slice(0, 8).map(s =>
      `<a class="chip chip-strategy" href="strategie.html?id=${encodeURIComponent(s.id)}">${escapeText(s.title)}</a>`
    ).join('');
    html += `</div>`;
  }
  if (explainers.length) {
    html += `<h4 class="id-cross-h" style="margin-top:14px">Vysvětlení</h4><div class="chip-row">`;
    html += explainers.map(e =>
      `<a class="chip chip-explainer" href="jak-funguje.html?id=${encodeURIComponent(e.id)}">${escapeText(e.title)}</a>`
    ).join('');
    html += `</div>`;
  }
  html += `</section>`;
  return html;
}

function renderSourceSection(indicator, card) {
  const src = indicator.source;
  return `
    <section class="id-section id-source">
      <h3>Zdroj dat</h3>
      <p class="id-source-line">
        <strong>${escapeText(src?.name || '—')}</strong>
        ${src?.url ? `· <a href="${src.url}" target="_blank" rel="noopener">${escapeText(src.url)}</a>` : ''}
      </p>
      <p class="id-source-meta">
        Aktualizováno ${escapeText(src?.fetched_at?.slice(0, 10) || '—')} ·
        Origin: ${escapeText(src?.origin || '—')} ·
        <a href="${indicator.method_card_url}">Surová metodická karta (JSON)</a>
      </p>
    </section>
  `;
}

function renderAll(payload) {
  const { indicator, dataset, card, strategies, explainers } = payload;
  document.title = `${indicator.name} · Zdravé Česko`;
  const root = document.getElementById('detailRoot');
  root.innerHTML = `
    ${renderHeader(indicator)}
    ${renderTrendSection(indicator)}
    ${renderRegionsSection(dataset)}
    ${renderContextSection(indicator)}
    ${renderMethodSection(card, indicator)}
    ${renderCrossLinks(strategies, explainers)}
    ${renderSourceSection(indicator, card)}
  `;

  renderTrendChart(indicator);
  if (dataset) {
    const svg = document.getElementById('idRegionsMap');
    renderRegionsMap(svg, dataset, {
      onHover: (region) => highlightRow(region.code),
      onClick: (region) => highlightRow(region.code, true),
    });
  }
}

function highlightRow(code, scrollInto = false) {
  document.querySelectorAll('#idRegionsTable tbody tr').forEach(tr => {
    tr.classList.toggle('rk-active', tr.dataset.code === code);
  });
  if (scrollInto) {
    const row = document.querySelector(`#idRegionsTable tbody tr[data-code="${code}"]`);
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ====== INIT ======

(async () => {
  const id = getId();
  if (!id) {
    showError('Chybí parametr ?id=… v URL.');
    return;
  }
  try {
    const payload = await loadAll(id);
    renderAll(payload);
  } catch (err) {
    showError(err.message || String(err));
  }
})();
