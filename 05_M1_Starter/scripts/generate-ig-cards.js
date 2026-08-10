#!/usr/bin/env node
// generate-ig-cards.js
// Generuje sociální karty v „stat-hero" stylu pro Instagram, Facebook a X:
// obří číslo jako vizuální hrdina na tmavém vysoce kontrastním pozadí, signální
// barva, úderný claim. Cílem je thumb-stopping grafika nativní pro daný feed —
// scroll-stopper, ne vsazený landscape web-cover.
//
// Tři formáty — jeden na každý tvar plochy, kterou sítě opravdu zobrazují:
//   • square    1080×1080  → IG/FB feed    → assets/social/ig/<slug>.png
//   • story     1080×1920  → Stories/Reels → assets/social/ig-story/<slug>.png
//     (9:16 s respektovanými IG safe-zónami — horní/dolní okraj zůstává volný
//      pro overlay UI: profil nahoře, odpovědní lišta / akce Reels dole)
//   • landscape 1600×900   → X/Twitter     → assets/social/x/<slug>.png
//     (16:9 — X čtvercový obrázek v timeline ořízne na šířku a ukrojí claim
//      i patičku; landscape se zobrazí celý. Bez CTA „odkaz v biu" — na X je
//      odkaz klikací přímo v postu.)
//
//   node scripts/generate-ig-cards.js                      # všechny, všechny formáty
//   node scripts/generate-ig-cards.js <slug> [<slug>]      # vybrané slugy
//   node scripts/generate-ig-cards.js --format story       # jen vertikální
//   node scripts/generate-ig-cards.js --format square      # jen čtvercové
//   node scripts/generate-ig-cards.js --format landscape   # jen 16:9 pro X
//   node scripts/generate-ig-cards.js --svg <slug>         # zapíše jen .svg náhled

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Tmavá brand paleta laděná na maximální kontrast v IG/FB feedu i ve Stories.
// Signální barvy jsou pro tmavé pozadí zesvětlené/sytější, aby „pálily".
const BG = '#16110b';        // teplá takřka-čerň (inkoust)
const PAPER = '#fbf8f1';     // hlavní text
const MUTED = '#a99e8c';     // kicker, doména, sekundární
const RULE = 'rgba(251,248,241,0.14)';
const TRACK = 'rgba(251,248,241,0.12)';
const SIGNAL = { bad: '#ff5a3c', warn: '#ffb53a', good: '#5fd083', neutral: PAPER };

// Geometrie obou formátů. Pozice jsou absolutní (Y baseline), aby šel layout
// snadno doladit. Story má vědomě prázdné safe-zóny nahoře (~280 px) a dole
// (~316 px) kvůli overlay UI Instagramu.
const LAYOUTS = {
  square: {
    W: 1080, H: 1080, M: 96,
    accentRuleY: 132, accentRuleW: 76,
    kickerY: 178, kickerFont: 26,
    heroBaseline: 500, heroSizes: { 2: 340, 3: 280, 4: 236, more: 196 },
    claimGap: 104, claimFont: 56, claimLineH: 66, claimWrap: 22, claimMaxLines: 4,
    barH: 28, barGap: 56,
    ctxGap: 48, ctxFont: 30, ctxLineH: 40,
    cta: null,
    footerLineY: 980, footerTextY: 1028, brandFont: 31, domainFont: 26,
    headFont: 66, headLineH: 78, headStartY: 430, headWrap: 22, headMaxLines: 4,
  },
  story: {
    W: 1080, H: 1920, M: 96,
    accentRuleY: 312, accentRuleW: 88,
    kickerY: 360, kickerFont: 30,
    heroBaseline: 880, heroSizes: { 2: 452, 3: 368, 4: 308, more: 248 },
    claimGap: 122, claimFont: 62, claimLineH: 76, claimWrap: 20, claimMaxLines: 5,
    barH: 32, barGap: 64,
    ctxGap: 56, ctxFont: 34, ctxLineH: 46,
    cta: { y: 1500, font: 30, text: 'Celý rozbor → odkaz v biu' },
    footerLineY: 1556, footerTextY: 1604, brandFont: 34, domainFont: 28,
    headFont: 88, headLineH: 102, headStartY: 700, headWrap: 18, headMaxLines: 5,
  },
  // 16:9 pro X. Nižší plocha než square → sazba je vodorovnější: menší hrdina,
  // širší zlom claimu (42 znaků místo 22), aby text zaplnil šířku a nevznikl
  // pruh prázdna vpravo. CTA je vypnuté — na X vede odkaz přímo z postu.
  landscape: {
    W: 1600, H: 900, M: 110,
    accentRuleY: 96, accentRuleW: 88,
    kickerY: 148, kickerFont: 28,
    heroBaseline: 420, heroSizes: { 2: 300, 3: 264, 4: 224, more: 188 },
    claimGap: 116, claimFont: 54, claimLineH: 68, claimWrap: 44, claimMaxLines: 3,
    barH: 26, barGap: 44,
    ctxGap: 62, ctxFont: 30, ctxLineH: 40, ctxWrap: 62,
    cta: null,
    footerLineY: 826, footerTextY: 872, brandFont: 32, domainFont: 27,
    headFont: 64, headLineH: 78, headStartY: 340, headWrap: 40, headMaxLines: 3,
  },
};

const OUT_DIRS = {
  square: resolve(ROOT, 'assets/social/ig'),
  story: resolve(ROOT, 'assets/social/ig-story'),
  landscape: resolve(ROOT, 'assets/social/x'),
};

// Každá karta: buď „stat" režim (stat + claim), nebo „headline" režim.
//   stat        — velké číslo (hrdina). statSuffix jen pro symboly (% ×).
//   claim       — co číslo znamená (serif). Slovní jednotku (let/měsíců/mld)
//                 dej na začátek claimu, ne jako suffix.
//   context     — úderná pointa (volitelně).
//   barPct      — 0–100: nakreslí proporční pruh (jen pro procentní staty).
//   signal      — bad|warn|good|neutral → barva čísla a pruhu.
//   headline    — fallback bez čísla (velký serif nadpis).
// Žádná nová čísla z paměti — vše vychází z dříve schválených headline.
const MANIFEST = {
  'clanek-kojeni-obrat-porodnice': {
    kicker: 'Kojení · porodnice', signal: 'warn',
    stat: '44–96', statSuffix: '%',
    claim: 'Tak velký je rozdíl v plném kojení mezi českými porodnicemi.',
    context: 'Rozpětí nevysvětlí medicína, ale praxe oddělení.',
  },
  'clanek-plodnost-mladistvych': {
    kicker: 'Reprodukční zdraví · kraje', signal: 'warn',
    stat: '4×', claim: 'rozdíl v plodnosti mladistvých mezi Ústeckým krajem a Prahou.',
    context: 'Národní průměr (5,6 na 1000) tuto propast schová.',
  },
  'clanek-umela-preruseni-tehotenstvi': {
    kicker: 'Reprodukční zdraví', signal: 'good',
    stat: '4,9', claim: 'umělých přerušení na 1 000 žen — historické minimum v Česku.',
    context: 'Za poklesem stojí antikoncepce, kterou ČR neproplácí.',
  },
  'clanek-cholesterol-mapa-obci': {
    kicker: 'Prevence · data', signal: 'good',
    stat: '5,0', claim: 'Průměrný cholesterol Čechů klesl pod cílovou hodnotu — díky léčbě.',
    context: 'Kraje s vyšší úmrtností mají spíš nižší průměr — víc léčby.',
  },
  'clanek-luzka-dlouhodobe-pece': {
    kicker: 'Dlouhodobá péče', signal: 'bad',
    stat: '35,3', claim: 'lůžka dlouhodobé péče na 1 000 seniorů 65+ — o čtvrtinu pod evropským průměrem.',
    context: 'Kapacita roste pomaleji než populace seniorů — přepočteno klesá.',
  },
  'clanek-barometr-politickych-prohlaseni': {
    kicker: 'Governance · nástroj', signal: 'neutral',
    stat: '12', claim: 'vládních závazků převádíme na měřitelné checkpointy s daty.',
    context: 'Nový Barometr politických prohlášení + Ověřovna výroků.',
  },
  'clanek-poraneni-hraze': {
    kicker: 'Porodnictví · kvalita', signal: 'neutral',
    stat: '1,71', statSuffix: '%',
    claim: 'rodiček mělo závažné poranění hráze III.–IV. stupně (2022).',
    context: 'Mírně roste, jak správně ustupuje rutinní epiziotomie.',
  },
  'clanek-dekubity-nemocnice': {
    kicker: 'Kvalita · bezpečnost péče', signal: 'warn',
    stat: '4,3', statSuffix: '%',
    claim: 'pacientů má dekubitus podle šetření — registr eviduje jen 1,2 %.',
    context: 'Mezera není o horší péči, ale o tom, že se neměří jednotně.',
  },
  'clanek-perinatalni-umrtnost': {
    kicker: 'Kvalita péče · novorozenci', signal: 'good',
    stat: '4,8', claim: 'perinatální úmrtnost na 1 000 narozených — pod průměrem EU i všemi sousedy.',
    context: 'Za tím stojí centralizace do 12 perinatologických center.',
  },
  'clanek-ovoce-zelenina': {
    kicker: 'Prevence · výživa', signal: 'bad',
    stat: '7,7', statSuffix: '%', barPct: 8,
    claim: 'dospělých Čechů sní 5 porcí ovoce a zeleniny denně — půlka nesní žádnou.',
    context: 'Pod průměrem EU (12,4 %) a od roku 2014 klesá.',
  },
  'clanek-starnuti-lekaru': {
    kicker: 'Pracovní síla · lékaři', signal: 'warn',
    stat: '41', statSuffix: '%', barPct: 41,
    claim: 'českých lékařů je starších 55 let (2022) — nad průměrem EU.',
    context: 'U praktiků a pediatrů se podíl nad 60 let blíží polovině.',
  },
  'clanek-plne-kojeni-porodnice': {
    kicker: 'Kojení · porodnice', signal: 'warn',
    stat: '72,4', statSuffix: '%', barPct: 72,
    claim: 'bylo dno plného kojení při propuštění (2021). V roce 2000 to bylo ~90 %.',
    context: 'Novější data ukazují mírný obrat — 75,1 % v roce 2024.',
  },
  'clanek-darcovstvi-krve-plazma': {
    kicker: 'Dárcovství · krev', signal: 'neutral',
    stat: '133', claim: 'odběrů krve a plazmy na 1 000 obyvatel — nejvíc v Evropě.',
    context: 'Netáhne to dobročinnost, ale placený odběr plazmy.',
  },
  'clanek-vydaje-dusevni-zdravi': {
    kicker: 'Financování · duševní zdraví', signal: 'bad',
    stat: '4', statSuffix: '%', barPct: 4,
    claim: 'výdajů na zdravotnictví jde na duševní zdraví.',
    context: 'Zátěž nemocí je přitom ~15 %. EU15 dává kolem 7 %.',
  },
  'clanek-casna-operace-zlomeniny-kycle': {
    kicker: 'Kvalita péče · senioři', signal: 'warn',
    stat: '79', statSuffix: '%', barPct: 79,
    claim: 'seniorů se zlomeninou kyčle Česko odoperuje do 48 hodin.',
    context: 'Průměr OECD (80,1 %) na dosah, Německo ale 93,8 %.',
  },
  'clanek-dohodovaci-rizeni-2027-vysledek': {
    kicker: 'Financování · dohodovací řízení', signal: 'good',
    stat: '12/15', claim: 'segmentů se dohodlo na úhradách 2027. Loni jen 3 z 15.',
    context: '3 finančně největší segmenty ale zůstaly bez dohody — rozhodne úhradová vyhláška do konce října.',
  },
  'clanek-react-eu-nku-kontrola-2026': {
    kicker: 'Financování · kontrola', signal: 'warn',
    stat: '21', claim: 'měsíců ležel spektrometr za 1,46 mil. Kč nepoužitý v krabici.',
  },
  'clanek-centrum-onkologicke-prevence-mou-2026': {
    kicker: 'Prevence · investice', signal: 'good',
    stat: '1,12', claim: 'miliardy stojí nové Centrum onkologické prevence. Rozhodne ale účast.',
  },
  'clanek-klistova-encefalitida-proockovanost-2026': {
    kicker: 'Prevence · vakcinace', signal: 'bad',
    stat: '17', statSuffix: '%', barPct: 17,
    claim: 'Čechů je chráněno proti klíšťové encefalitidě.',
    context: 'A přitom hlásíme nejvíc případů v celé EU.',
  },
  'clanek-zaskrt-umrti-2026': {
    kicker: 'Prevence · vakcinace', signal: 'bad',
    stat: '57', claim: 'let bez úmrtí na záškrt. Teď v Česku přišlo druhé.',
  },
  'clanek-ai-act-zdravotnictvi-srpen-2026': {
    kicker: 'Digitalizace · regulace', signal: 'neutral',
    stat: '64', statSuffix: '%', barPct: 64,
    claim: 'nemocnic už používá AI. Od 2. 8. platí evropský AI Act.',
  },
  'clanek-nikez-jak-funguje-2026': {
    kicker: 'Kvalita péče',
    headline: 'Kdo měří kvalitu péče v Česku? Od roku 2023 institut NIKEZ.',
  },
  'clanek-zubni-kaz-deti': {
    kicker: 'Prevence · děti', signal: 'bad',
    stat: '4', statSuffix: '×', claim: 'víc zubních kazů mají české děti než německé.',
  },
  'clanek-epidemiologie-1-proc-verit-cislum': {
    kicker: 'Epidemiologie · díl 1/4', signal: 'neutral',
    stat: '1854', claim: 'Odmontovaná klika u londýnské pumpy. Tak se z dat zrodila epidemiologie.',
    context: 'Proč věřit číslům — od mapy cholery k reprodukčnímu číslu.',
  },
  'clanek-epidemiologie-2-ockovani-dukaz': {
    kicker: 'Prevence · vakcinace',
    headline: '154 milionů úmrtí odvrátilo očkování za 50 let.',
  },
  'clanek-veterinarni-antibiotika-one-health': {
    kicker: 'Antibiotika · One Health',
    headline: 'Česko: o třetinu méně veterinárních antibiotik než EU.',
  },
  'clanek-epidemiologie-4-nedovera-dezinformace': {
    kicker: 'Epidemiologie · díl 4/4', signal: 'good',
    stat: '+6,8', statSuffix: '%',
    claim: 'zvýšila proočkování jediná SMS připomínka. Důkaz z 690 tis. lidí.',
    context: 'Ukázat data nestačí — rozhoduje důvěra.',
  },
  'clanek-centra-dusevniho-zdravi': {
    kicker: 'Duševní zdraví · reforma', signal: 'warn',
    stat: '40', claim: 'center duševního zdraví funguje. Reforma slíbila 100.',
    context: 'Zhruba třetina cíle reformy.',
  },
  'clanek-epidemiologie-3-modely-rozhodovani': {
    kicker: 'Epidemiologie · díl 3/4', signal: 'good',
    stat: '40–90', statSuffix: '%',
    claim: 'o tolik snížila opatření přenos. Modely SEIR pak řídí rozhodnutí.',
    context: 'I nejlepší model klame, když se z něj udělá jistota.',
  },
  'clanek-pooperacni-sepse-2026': {
    kicker: 'Kvalita · bezpečnost péče', signal: 'warn',
    stat: '0,84', statSuffix: '%',
    claim: 'případů končí pooperační sepsí — přes 5 000 ročně.',
    context: 'Česko poprvé otevřelo národní data o této komplikaci.',
  },
  'clanek-dostupnost-radioterapie-2026': {
    kicker: 'Dostupnost · onkologie',
    headline: 'Jeden gama nůž, jedno protonové centrum na celé Česko.',
    context: 'Stát chce srovnat přístup k nejdražší radioterapii.',
  },
  'clanek-financovani-sha': {
    kicker: 'Financování · SHA', signal: 'neutral',
    stat: '696,7', claim: 'miliardy Kč stálo zdravotnictví v 2024 (8,6 % HDP).',
    context: 'Kdo platí, na co a komu — tři řezy rámce SHA.',
  },
  'clanek-rakovina-tlusteho-streva': {
    kicker: 'Prevence · onkologie', signal: 'warn',
    headline: 'Screening rakoviny střeva využívá jen necelá třetina oprávněných.',
    context: 'Včasný záchyt léčí. Přežití u nás zaostává.',
  },
  'clanek-darci-organu': {
    kicker: 'Dárcovství orgánů', signal: 'good',
    stat: '34,3', claim: 'zemřelých dárců na milion — třetí nejvíc v Evropě.',
    context: 'Průměr EU je 20,9. Drží to opt-out a koordinátoři.',
  },
  'clanek-plicni-screening-ucast': {
    kicker: 'Prevence · onkologie', signal: 'warn',
    stat: '2,7', statSuffix: '%', barPct: 3,
    claim: 'rizikových kuřáků prošlo screeningem plic za 3 roky.',
    context: 'Program běží od roku 2022. Dosah zůstává nízký.',
  },
  'clanek-rezistence-antibiotik': {
    kicker: 'Antibiotika · rezistence', signal: 'warn',
    stat: '19', statSuffix: '%', barPct: 19,
    claim: 'invazivní E. coli odolává ciprofloxacinu.',
    context: 'Mírně pod průměrem EU (22,5 %), ale zase roste.',
  },
  'clanek-obezita-jidelny-reforma': {
    kicker: 'Prevence · obezita', signal: 'bad',
    stat: '6', statSuffix: '/10', claim: 'dospělých Čechů má nadváhu nebo obezitu.',
    context: 'Každé čtvrté dítě 6–9 let taky. Páka je školní jídelna.',
  },
  'clanek-ncez-financovani-2027': {
    kicker: 'Digitalizace · financování',
    headline: 'Dotace na e-zdravotnictví dojdou. Provoz od 2027 platí stát.',
    context: 'Část agendy přejde do FN Ostrava.',
  },
  'clanek-koureni-adolescenti': {
    kicker: 'Prevence · mládež', signal: 'neutral',
    headline: '14 % patnáctiletých kouří. Kolem evropského průměru.',
    context: 'Posun je k nikotinu a e-cigaretám.',
  },
  'clanek-cerny-kasel-2024-epidemie': {
    kicker: 'Prevence · epidemie', signal: 'bad',
    stat: '21', claim: 'tisíc případů černého kašle v 2024 — nejvíc od 60. let.',
    context: '199,4 na 100 000 obyvatel, zhruba 4× průměr EU.',
  },
  'clanek-napoje-1-tekuty-cukr': {
    kicker: 'Prevence · cukr · díl 1/6', signal: 'bad',
    stat: '+25', statSuffix: '%',
    claim: 'vyšší riziko cukrovky 2. typu za každou denní sklenici.',
    context: 'Riziko nezmizí, ani když po nich člověk nepřibere.',
  },
  'clanek-napoje-2-mytus-stavy': {
    kicker: 'Prevence · cukr · díl 2/6', signal: 'warn',
    stat: '250', claim: 'ml „100%“ džusu má podobně cukru jako kola.',
    context: 'WHO ho počítá mezi volné cukry úplně stejně.',
  },
  'clanek-napoje-3-energetaky-deti': {
    kicker: 'Prevence · děti · díl 3/6', signal: 'bad',
    headline: 'Jedna plechovka energeťáku překročí denní limit kofeinu pro dítě.',
    context: 'Slazený nápoj plus velká dávka kofeinu.',
  },
  'clanek-napoje-4-alkohol-mytus': {
    kicker: 'Prevence · alkohol · díl 4/6', signal: 'bad',
    headline: 'Žádná dávka alkoholu není bez rizika (WHO 2023). J-křivka padla.',
    context: 'Alkohol je karcinogen 1. třídy.',
  },
  'clanek-napoje-5-co-pit': {
    kicker: 'Prevence · díl 5/6', signal: 'good',
    headline: 'Co pít? Výchozím nápojem je voda. Levná a bez rizika.',
    context: 'Výměna limonády za vodu snižuje riziko cukrovky.',
  },
  'clanek-napoje-6-dan-regulace': {
    kicker: 'Politika · daň · díl 6/6', signal: 'neutral',
    stat: '10', statSuffix: '%',
    claim: 'daň ze slazených nápojů ≈ zhruba stejný pokles prodejů.',
    context: 'Co na slazené nápoje funguje na úrovni politiky.',
  },
  'clanek-dlouhodoba-pece-vydaje': {
    kicker: 'Dlouhodobá péče · zdroje', signal: 'bad',
    stat: '3', statSuffix: '×',
    claim: 'méně profesionálních pečujících má Česko než průměr OECD.',
    context: 'Peníze jsou průměrné (1,9 % HDP), ruce vzácné.',
  },
  'clanek-deti-obezita-cosi': {
    kicker: 'Prevence · děti', signal: 'warn',
    stat: '26,3', statSuffix: '%', barPct: 26,
    claim: 'dětí 6–9 let má nadváhu nebo obezitu — každé čtvrté.',
    context: 'Pod průměrem EU (29,8 %), ale trend jde špatným směrem.',
  },
  'clanek-sebevrazdy-mladistvi': {
    kicker: 'Duševní zdraví · mladí', signal: 'bad',
    stat: '6,96',
    claim: 'sebevražd na 100 tis. náctiletých (15–19) — o dvě třetiny nad EU.',
    context: 'Druhá nejčastější příčina úmrtí dospívajících. Trend roste.',
  },
  'clanek-akutni-infarkt': {
    kicker: 'Kvalita péče · kardio', signal: 'good',
    stat: '5,2', statSuffix: '%',
    claim: 'úmrtnost do 30 dní po infarktu v ČR — evropská špička.',
    context: 'Průměr OECD 6,5 %. Kardiocentra drží celé Česko 24/7.',
  },
  'clanek-preventivni-prohlidka': {
    kicker: 'Prevence · praktik', signal: 'warn',
    stat: '48', statSuffix: '%', barPct: 48,
    claim: 'dospělých jde na preventivní prohlídku v doporučených 2 letech.',
    context: 'Druhá polovina ji vynechá — a každý na ni má nárok zdarma.',
  },
  'clanek-cmp-iktova-centra': {
    kicker: 'Kvalita péče · neuro', signal: 'warn',
    stat: '9,9', statSuffix: '%',
    claim: 'nemocniční úmrtnost po cévní mozkové příhodě v ČR.',
    context: 'Průměr OECD 7,7 %. Akutní léčbu máme, ztrácíme okolo ní.',
  },
  'clanek-hospitalizujeme-nejvic': {
    kicker: 'Nemocniční péče · lůžka', signal: 'bad',
    stat: '18', claim: 'tisíc hospitalizací na 100 tis. obyvatel — nejvíc v OECD.',
    context: 'Průměr OECD 14 600. Nejvíc nemocnice-centric v Evropě.',
  },
  'clanek-mamograf-rakovina-prsu': {
    kicker: 'Onkologie · screening', signal: 'warn',
    stat: '60', statSuffix: '%', barPct: 60,
    claim: 'žen 45–69 chodí na mamograf. Deset let se to nehýbe.',
    context: 'Průměr OECD 68 %, cíl WHO ≥ 70 %.',
  },
  'clanek-cervix-hpv': {
    kicker: 'Onkologie · HPV', signal: 'warn',
    stat: '69,8', statSuffix: '%', barPct: 70,
    claim: 'dívek je očkováno proti HPV (kohorta 13 let, 2023).',
    context: 'OECD 75 %, EU 72 %, cíl WHO 90 % do 2030.',
  },
  'clanek-platba-z-kapsy': {
    kicker: 'Financování · solidarita', signal: 'neutral',
    stat: '14,6', statSuffix: '%',
    claim: 'výdajů jde z kapsy pacientů (out-of-pocket), ČR 2023.',
    context: 'Zhruba na průměru EU (~15 %), pod OECD (~18 %).',
  },
  'clanek-lecitelna-mortalita': {
    kicker: 'Výsledky · kvalita léčby', signal: 'bad',
    stat: '107,2',
    claim: 'léčitelných úmrtí na 100 tis. obyvatel ročně (2023).',
    context: 'O čtvrtinu nad EU27 (86,8). Měří, co umí vyléčit samotný systém.',
  },
  'clanek-generika-biosimilars-uspora': {
    kicker: 'Financování · léky', signal: 'good',
    stat: '62,8', statSuffix: '%', barPct: 63,
    claim: 'objemu spotřebovaných léků tvoří generika — nad OECD (56 %).',
    context: 'Na penězích ale jen 19,5 % a podíl od roku 2010 klesá.',
  },
  'clanek-gender-pay-gap-zdravotnictvi': {
    kicker: 'Pracovní síla · odměňování', signal: 'bad',
    stat: '24,9', statSuffix: '%', barPct: 25,
    claim: 'o tolik míň vydělají ženy za hodinu než muži ve zdravotnictví a sociální péči.',
    context: 'Pátá nejvyšší propast v EU/EEA — a od roku 2021 se znovu rozevírá.',
  },
  'clanek-medikalizace-verejneho-zdravi': {
    kicker: 'Veřejné zdraví · koncept',
    headline: 'Veřejné zdraví není ambulance. Když z prevence uděláme diagnózu, léčíme následky místo příčin.',
  },
  'clanek-ai-zdravotnictvi-1-vstricnost': {
    kicker: 'Digitalizace · AI (1/2)',
    headline: 'Největší přínos AI v medicíně dnes není diagnóza, ale vrácený čas lékaře.',
  },
  'clanek-ai-zdravotnictvi-2-lecba': {
    kicker: 'Digitalizace · AI (2/2)',
    headline: 'AI už čte mamografy na úrovni lékaře. V objevu antibiotik zatím slibuje víc, než dokázala.',
  },

  // — Doplněno: karty pro zbývající publikované články (stat/headline z doložených čísel) —
  'clanek-dusevni-zdravi-matek-moodpass': { kicker: 'Duševní zdraví · matky', signal: 'bad', stat: '75', statSuffix: '%', barPct: 75, claim: 'rizikových žen po porodu nedostane v Česku odbornou pomoc.', context: 'Duševní poruchu má na konci šestinedělí 13,6 % matek. Řešení: MoodPass.' },
  'clanek-adaptivni-evaluace': { kicker: 'Reforma · evaluace', signal: 'neutral', context: 'Contribution analysis: ptej se, jakou měrou přispěla, ne zda to způsobila.', headline: 'V komplexním systému nikdy nedokážete, že za výsledek může jedna reforma.' },
  'clanek-reforma-dlouhodobe-pece-2026': { kicker: 'Dlouhodobá péče · LTC', signal: 'bad', stat: '1,4', statSuffix: '%', claim: 'HDP dává Česko na dlouhodobou péči — o čtyři desetiny pod OECD.', context: 'Počet lidí 65+ vzroste z 2,1 na 3,0 milionu do roku 2050.' },
  'clanek-screening-rakoviny-plic': { kicker: 'Onkologie · plíce', signal: 'bad', stat: '50', claim: 'úmrtí na 100 tis. na rakovinu plic — mezi nejvyššími v OECD.', context: 'Screening nízkodávkovým CT je od roku 2022, reálná účast ale mizivá.' },
  'clanek-vakcinace': { kicker: 'Prevence · očkování', signal: 'warn', stat: '83,7', statSuffix: '%', barPct: 84, claim: 'dětí do 2 let má očkování MMR. Práh imunity je 95 %.', context: 'Proti chřipce se očkuje jen 24,5 % seniorů. Cíl WHO je 75 %.' },
  'clanek-kardiovaskularni-mortalita': { kicker: 'Kardio · mortalita', signal: 'bad', stat: '48', statSuffix: '%', claim: 'vyšší kardiovaskulární úmrtnost v ČR než průměr EU-27.', context: 'Nemocniční úmrtnost po infarktu 4,6 % je přitom mezi nejlepšími v OECD.' },
  'clanek-platba-za-vysledek-vzp': { kicker: 'Financování · úhrady', signal: 'warn', stat: '90', statSuffix: '%', barPct: 90, claim: 'úhrad VZP dnes platí za výkon, ne za výsledek léčby.', context: 'Value-based reforma startuje pilotně v září 2026.' },
  'clanek-narok-pojistence-1-co-to-je': { kicker: 'Nárok pojištěnce · právo', signal: 'neutral', stat: '580', claim: 'miliard Kč ročně jde na nárok, který zákon nedefinuje.', context: 'Obsah nároku dovozuje až judikatura Ústavního soudu a § 16 zákona.' },
  'clanek-hospicova-pece': { kicker: 'Paliativní péče · hospic', signal: 'warn', stat: '70', statSuffix: '%', barPct: 70, claim: 'Čechů umírá v nemocnici — i když stejně tolik chce zemřít doma.', context: 'Hospicových lůžek má Česko 5,0 na 100 tis. — třetina pod standardem EU.' },
  'clanek-digi-2-jak-funguje-api': { kicker: 'Digitalizace · data', signal: 'neutral', context: 'API je jen dohodnutá přepážka, přes kterou si dva počítače předají data.', headline: 'Zdravotnická data nezůstávají ve státním skladu — zůstávají u lékaře.' },
  'clanek-mobilni-paliativni-tymy': { kicker: 'Paliativní péče · doma', signal: 'bad', stat: '4,6', statSuffix: '/mil.', claim: 'týmů mobilní paliativní péče — necelá polovina minima EAPC.', context: 'Doporučení EAPC je 10 na milion. Umřít doma chce většina Čechů.' },
  'clanek-nadstandardy-2-irsko-kanada': { kicker: 'Nadstandardy · zahraničí', signal: 'bad', stat: '3', statSuffix: '×', claim: 'déle čekají v Německu veřejně pojištění než ti se soukromým.', context: 'I zdánlivě fungující dvousložkový systém dělí přístup podle peněz.' },
  'clanek-preziti-karcinom-prsu': { kicker: 'Onkologie · přežití', signal: 'warn', stat: '81,4', statSuffix: '%', barPct: 81, claim: 'pětileté přežití po diagnóze karcinomu prsu v ČR.', context: 'Průměr OECD 84,3 %. Na screening chodí jen 54,5 % žen.' },
  'clanek-komplexita-reforem': { kicker: 'Reforma · komplexita', signal: 'neutral', context: 'Detailní plán shora selhává. Chování mění pravidla a cíle, ne parametry.', headline: 'Zdravotnictví není stroj. Je to systém, který se mění až s vnějším šokem.' },
  'clanek-centralizace-chirurgie-2027': { kicker: 'Chirurgie · centralizace', signal: 'bad', stat: '11,76', statSuffix: '%', barPct: 12, claim: 'úmrtnost do 90 dní po resekci jater v malých nemocnicích.', context: 'Ve velkém centru 6,15 %. Skoro dvojnásobek na stejném výkonu.' },
  'clanek-detska-psychiatrie-krize': { kicker: 'Duševní zdraví · děti', signal: 'bad', stat: '157', claim: 'dětských a dorostových psychiatrů na celé Česko.', context: 'Skoro polovina blízko důchodu. Rodiny čekají 4–8 měsíců.' },
  'clanek-cekani-specialista': { kicker: 'Dostupnost · specialista', signal: 'bad', stat: '28', claim: 'dní čeká Čech na ambulantního specialistu — OECD 18.', context: 'Přesto hlásíme nejnižší nenaplněnou potřebu v EU. Zvykli jsme si.' },
  'clanek-alkohol-spotreba': { kicker: 'Životní styl · alkohol', signal: 'bad', stat: '14', claim: 'litrů čistého alkoholu na osobu ročně — špička OECD.', context: 'Metrika OECD (recorded) 11,2 l vs průměr 8,5. Politická volba.' },
  'clanek-novela-paliativni-pece': { kicker: 'Paliativní péče · nárok', signal: 'bad', stat: '30–35', statSuffix: '%', claim: 'pacientů reálně dostane specializovanou paliativní péči.', context: 'Potřebuje ji 70–80 tis. lidí ročně. Zákon lékaře nevytvoří.' },
  'clanek-narok-pojistence-2-demograficky-tlak': { kicker: 'Nárok · demografie', signal: 'bad', stat: '240', claim: 'tisíc seniorů 75+ v nejvyšší závislosti v roce 2050.', context: 'Dnes 115 tisíc — dvojnásobek. Lékařů i plátců přitom ubývá.' },
  'clanek-jednodenni-chirurgie-katarakta': { kicker: 'Chirurgie · efektivita', signal: 'good', stat: '98,7', statSuffix: '%', barPct: 99, claim: 'operací šedého zákalu v ČR proběhne bez přenocování.', context: 'Průměr OECD 94,5 %. Tichý úspěch, Česko ve špičce.' },
  'clanek-digi-3-dve-vrstvy-ncez': { kicker: 'Digitalizace · NCEZ', signal: 'neutral', context: 'Postavit páteř je jedna věc, ufinancovat ji po evropských dotacích druhá.', headline: 'E-zdravotnictví běží ve dvou vrstvách: staré ostrovy a nová páteř NCEZ.' },
  'clanek-azv-zdravotnicky-vyzkum': { kicker: 'Financování · výzkum', signal: 'bad', stat: '2', claim: 'aplikační výsledky z 415 plánovaných za 3 miliardy.', context: 'Místo nich 2 945 publikací. Přínos v praxi nikdo nesledoval.' },
  'clanek-nadstandardy-3-cesky-narok': { kicker: 'Nárok · nadstandardy', signal: 'good', stat: '0,3', statSuffix: '%', claim: 'Čechů uvádí nenaplněnou potřebu péče — nejlepší v EU.', context: 'Průměr EU 2,4 %. Rovný přístup, který se snadno ztrácí.' },
  'clanek-systemove-mapovani-paky': { kicker: 'Reforma · páky změny', signal: 'neutral', context: 'Systémová mapa ukáže, kde malý zásah udělá velký rozdíl.', headline: 'Nejsilnější páky reformy nejsou peníze, ale pravidla, cíle a paradigma.' },
  'clanek-teorie-zmeny': { kicker: 'Reforma · metodika', signal: 'neutral', context: 'Teorie změny říká PROČ. Strategie říká jen CO.', headline: 'Skoro každá reforma má cíl. Málokterá popíše, proč by k němu měla vést.' },
  'clanek-ehds-evropsky-prostor-zdravotni-data': { kicker: 'Digitalizace · EHDS', signal: 'warn', stat: '13', claim: 'měsíců zbývá Česku na zřízení úřadu pro zdravotní data.', context: 'Nařízení EU 2025/327 platí, ale zákon i governance zaostávají.' },
  'clanek-uhradova-vyhlaska': { kicker: 'Financování · úhrady', signal: 'neutral', stat: '556', claim: 'miliard korun rozdělí každý rok jediná úhradová vyhláška.', context: 'Jeden dokument řídí platby 14 segmentům — od praktiků po nemocnice.' },
  'clanek-ehealth': { kicker: 'Digitalizace · eHealth', signal: 'warn', stat: '62', claim: 'bodů má český index digitalizace zdravotnictví ze sta.', context: 'Průměr OECD 70. eRecept máme, sdílení dokumentace ne.' },
  'clanek-prezit-rakoviny': { kicker: 'Onkologie · přežití', signal: 'bad', stat: '56,1', statSuffix: '%', barPct: 56, claim: 'pětileté přežití u rakoviny tlustého střeva v ČR.', context: 'Průměr OECD 61,2 %. Hlavní příčina: pozdější záchyt.' },
  'clanek-platba-statu-statni-pojistenci': { kicker: 'Financování · rozpočet', signal: 'neutral', stat: '155', claim: 'miliard korun platí stát ročně za 5,9 milionu pojištěnců.', context: 'Zhruba 28 % příjmů pojištění. Největší páka v rukou vlády.' },
  'clanek-narok-pojistence-3-co-s-tim': { kicker: 'Reforma · nárok pojištěnce', signal: 'neutral', stat: '5', claim: 'reformních směrů může udržet nárok pojištěnce udržitelným.', context: 'Šestá cesta — plošně přidat peníze bez reforem — problém jen prohloubí.' },
  'clanek-umrti-doma-hospic': { kicker: 'Konec života · hospic', signal: 'warn', stat: '7', claim: 'z deseti Čechů umírá v nemocnici, ne doma nebo v hospici.', context: 'Doma či v hospici jen 26,2 % (OECD 32 %). Chybí mobilní hospice.' },
  'clanek-digi-4-povinne-dobrovolne-2026': { kicker: 'Digitalizace · pravidla', signal: 'neutral', stat: '1', claim: 'jediná plošně nová povinnost roku 2026: ePoukaz.', context: 'Mýtus, že „od ledna musí lékaři všechno naráz", neplatí.' },
  'clanek-nesplnena-potreba-zubni-pece': { kicker: 'Dostupnost · stomatologie', signal: 'bad', stat: '5', statSuffix: '×', claim: 'častěji odkládají zubaře nejchudší Češi než nejbohatší.', context: 'Celkem 1,3 % (pod EU), ale zuby platíme nejvíc z kapsy.' },
  'clanek-datova-patere-lock-in': { kicker: 'Digitalizace · data', signal: 'bad', stat: '159', claim: 'milionů Kč padlo na e-zdravotnictví — cíle nesplněny.', context: 'NKÚ: 0 ze 4 registrů k termínu, klíčové projekty 6 let ve skluzu.' },
  'clanek-rizeni-podle-vysledku': { kicker: 'Řízení systému · výsledky', signal: 'neutral', context: 'Sbíráme data a platíme za výkony — ale neřídíme podle výsledků.', headline: 'Česko ví, kolik stojí den na JIP. Neví, o kolik dní života ho prodloužil.' },
  'clanek-vzacna-onemocneni-strategie-2035': { kicker: 'Vzácná onemocnění', signal: 'bad', stat: '5', claim: 'let čeká pacient se vzácnou nemocí na diagnózu.', context: '6 000 diagnóz, půl milionu Čechů. Strategie 2026–2035 to má zkrátit.' },
  'clanek-nadeje-doziti-zdravi': { kicker: 'Stárnutí · kvalita života', signal: 'bad', stat: '7,7', claim: 'let ve zdraví zbývá českému seniorovi po 65.', context: 'Průměr EU 9,4. Propast 1,7 roku — skoro dekáda v omezení.' },
  'clanek-pracovni-sila': { kicker: 'Pracovní síla · lékaři', signal: 'warn', stat: '4,2', claim: 'lékaře na 1 000 obyvatel — víc než OECD (3,9).', context: 'Problém není počet, ale distribuce a úzké kompetence sester.' },
  'clanek-ezkarta-ehealth': { kicker: 'Digitalizace · eHealth', signal: 'bad', stat: '62', barPct: 62, claim: 'bodů ze sta — český eHealth index. OECD má 70.', context: 'Pilot EZKarty propadl testem; dva ze tří lékařů nezná Patient Summary.' },
  'clanek-transplantace-darcovstvi-organu': { kicker: 'Transplantace · orgány', signal: 'good', stat: '975', claim: 'transplantovaných orgánů — český rekord roku 2025 (+23 meziročně).', context: '341 zemřelých dárců, 31,9 na milion — Česko v top 10 světa.' },
  'clanek-prihranicni-zachranka-cr-sk-2026': { kicker: 'Dostupnost · záchranka', signal: 'good', context: 'Nejbližší posádka vyjede přes hranici — 3 české a 4 slovenské kraje.', headline: 'U infarktu nerozhoduje hranice, ale čas. Smlouva ČR–SR to mění.' },
  'clanek-data-leci-cesko-2026': { kicker: 'Reforma · kvalita péče', signal: 'neutral', context: 'NIKEZ, ÚZIS a INDIKO staví měření kvality péče na veřejná data.', headline: 'Česko dlouho platilo za objem. Teď začíná měřit, kolik stojí kvalita.' },
  'clanek-digi-5-strategie-ehds-2030': { kicker: 'Digitalizace · strategie', signal: 'neutral', context: 'Strategie 2025–2035, EHDS 2029. Co je závazné a co jen sliby.', headline: 'Slíbený termín digitalizace: je v zákoně, nebo jen v projevu?' },
  'clanek-umrtnost-predavkovani-drogy': { kicker: 'Závislosti · předávkování', signal: 'good', stat: '10,3', claim: 'úmrtí na milion na předávkování drogami v ČR.', context: 'Průměr EU 22,5 — Česko méně než polovina, špička EU.' },
  'clanek-ukazatele-dashboard': { kicker: 'Řízení systému · data', signal: 'neutral', context: 'Vyber pár tracer metrik. Číslo mění řízení, až když mění rozhodnutí.', headline: 'Dashboard s padesáti ukazateli neřídí. Řídí malá sada těch správných.' },
  'clanek-ja-heroes-workforce-2026': { kicker: 'Personál · workforce', signal: 'good', stat: '27', claim: 'vyškolených odborníků: Česko poprvé staví model plánování personálu.', context: 'Projekt JA HEROES, 8,75 mil. €, 19 zemí. Datový rámec zůstává ČR.' },
  'clanek-financovani-segmenty-2026': { kicker: 'Financování · segmenty', signal: 'neutral', stat: '459', claim: 'miliard Kč rozdělily zdravotní pojišťovny za rok 2023.', context: '42 226 Kč na pojištěnce. 56 % do nemocnic, jen 28 % do ambulancí.' },
  'clanek-pyll': { kicker: 'Mortalita · prevence', signal: 'bad', stat: '+19', statSuffix: '%', claim: 'vyšší odvratitelná úmrtnost v Česku než v EU (2022).', context: 'Preventabilní 195/100k vs 168, léčitelná 113 vs 90 — hůř léčíme.' },
  'clanek-pohyb': { kicker: 'Životní styl · pohyb', signal: 'bad', stat: '33', statSuffix: '%', barPct: 33, claim: 'dospělých Čechů splňuje doporučení WHO pro pohyb.', context: 'OECD průměr 40 %. Self-report navíc nadhodnocuje o 30–60 %.' },
  'clanek-spotreba-antibiotik': { kicker: 'Bezpečnost · antibiotika', signal: 'good', stat: '15,0', claim: 'dávek na 1000 obyvatel a den — pod evropským průměrem.', context: 'EU/EEA 18,3, OECD 16. Rezerva je v nemocnicích, ne v ambulanci.' },
  'clanek-socialne-zdravotni-pomezi-2026': { kicker: 'Dlouhodobá péče', signal: 'warn', stat: '553 000', claim: 'osob závislých na péči v ČR — do roku 2050 jich bude 826 000.', context: 'Veřejné výdaje na LTC jen 0,8 % HDP vs 1,5–2,2 % v EU-15.' },
  'clanek-czechsex-stav-ceska': { kicker: 'Sexuální zdraví', signal: 'bad', stat: '95', statSuffix: '%', barPct: 95, claim: 'lidí se sexuální potíží nevyhledá odbornou péči.', context: 'Jen 5 % žen a 4,6 % mužů s problémem šlo k lékaři.' },
  'clanek-narok-pojistence-4-jak-definovat': { kicker: 'Nárok pojištěnce', signal: 'neutral', context: '§ 13 říká CO, ale ne KDY a KDE. Časová norma v zákoně chybí.', headline: 'Máte nárok na účinnou péči — ne na to, kdy a kde ji dostanete.' },
  'clanek-ohca-zachrana-srdce': { kicker: 'Záchranná péče · OHCA', signal: 'bad', stat: '9,4', statSuffix: '%', barPct: 9, claim: 'lidí přežije mimonemocniční zástavu srdce v ČR.', context: 'OECD průměr 12,8 %. Laickou resuscitaci dělá jen třetina svědků.' },
  'clanek-jaterni-mortalita-alkohol': { kicker: 'Mortalita · alkohol', signal: 'bad', stat: '19,5', claim: 'úmrtí na nemoci jater na 100 tis. — o 43 % nad průměrem EU.', context: 'Slovensko 27,5, Rakousko 14,8. Cena za 14,4 l alkoholu na osobu.' },
  'clanek-platit-za-vysledek-vbhc': { kicker: 'Financování · incentivy', signal: 'neutral', stat: '691', claim: 'milionů liber stál anglický QOF ročně — bez dopadu na mortalitu.', context: 'Největší platba za výkon na světě — a Goodhart platí dvojnásob.' },
  'clanek-protidrogova-dusevni-politika-mz-2026': { kicker: 'Duševní zdraví · politika', signal: 'neutral', context: 'Věcná logika, nebo ztráta postavení nad resorty? Spor není nový.', headline: 'Protidrogová a duševní agenda míří po 33 letech pod ministerstvo.' },
  'clanek-reforma-primarni-pece-2027': { kicker: 'Primární péče', signal: 'bad', stat: '33', statSuffix: '%', barPct: 33, claim: 'praktických lékařů pro dospělé je starší 60 let.', context: 'Průměr 56,2 let. Ročně ubývá 110 až 180 praktiků.' },
  'clanek-nosokomialni-infekce': { kicker: 'Bezpečnost péče', signal: 'warn', stat: '6,5', statSuffix: '%', barPct: 7, claim: 'hospitalizovaných v Česku si odnese infekci z nemocnice.', context: 'Průměr OECD 5,5 %, EU 7,1 %. Polovina je preventabilní.' },
  'clanek-bmi-obezita': { kicker: 'Životní styl · obezita', signal: 'bad', stat: '60', statSuffix: '%', barPct: 60, claim: 'dospělých Čechů má nadváhu nebo obezitu (BMI 25+).', context: 'Průměr OECD 55 %. Diabetes 9,5 % vs. 7 % v OECD.' },
  'clanek-vydaje-zdravotnictvi': { kicker: 'Financování', signal: 'neutral', stat: '696,7', claim: 'miliardy Kč stálo české zdravotnictví v roce 2024.', context: '8,6 % HDP, 64 tisíc na osobu. Průměr OECD 9,3 %.' },
  'clanek-osetrovatelstvi-generacni-propast-2026': { kicker: 'Pracovní síla · sestry', signal: 'bad', stat: '30', claim: 'tisíc úvazků sester chybí Česku do dvanácti let.', context: 'Přes 13 tis. úvazků ohroženo odchodem do důchodu. Program za 13 mld. Kč.' },
  'clanek-czechsex-verejne-zdravi': { kicker: 'Sexuální zdraví', signal: 'bad', stat: '21,4', statSuffix: '%', barPct: 21, claim: 'žen má klinicky významnou sexuální dysfunkci.', context: 'Jen 5 % z nich vyhledalo péči. 95 % zůstává bez pomoci.' },
  'clanek-vakcinace-pneumokok-seniori': { kicker: 'Prevence · vakcinace', signal: 'bad', stat: '5,5', statSuffix: '%', barPct: 6, claim: 'Čechů nad 65 let je očkováno proti pneumokokům.', context: 'Průměr OECD 50 %, Británie 70 %. Vakcínu pojišťovny hradí.' },
  'clanek-diabeticke-amputace': { kicker: 'Diabetes · chronická péče', signal: 'bad', stat: '12,1', claim: 'amputací nohou na 100 tisíc diabetiků — o třetinu víc než OECD.', context: 'Průměr OECD 9,5, Dánsko 5,9. Preventabilní komplikace.' },
  'clanek-zdrava-skola-szu': { kicker: 'Prevence · děti', signal: 'neutral', context: 'Program Škola podporující zdraví tu je desítky let — jen dobrovolně.', headline: 'Zdravý oběd nestačí. O zdraví dítěte rozhoduje celý chod školy.' },
  'clanek-governance-nezavislost': { kicker: 'Řízení · governance', signal: 'neutral', context: 'Belgie to řeší: nezávislá věda, mezirezort, veřejný portál.', headline: 'Kdo měří, nesmí být tím, kdo je měřen. Jinak čísla nemají váhu.' },
  'clanek-manifest-reforma-zdravotnictvi': { kicker: 'Manifest · reforma', signal: 'neutral', context: '13 priorit — od rychlých výher po dlouhodobé investice.', headline: 'Zdravotnictví nereformujete za jedno volební období. Dá se ale začít.' },
  'clanek-vydaje-prevence': { kicker: 'Financování · prevence', signal: 'bad', stat: '2,7', statSuffix: '%', barPct: 3, claim: 'běžných výdajů na zdravotnictví jde v ČR na prevenci.', context: 'Průměr OECD 3,2 %, špička 6,9 % (Kanada). Ani ne polovina.' },
  'clanek-ambulantni-kontakty': { kicker: 'Primární péče', signal: 'warn', stat: '11,2', claim: 'návštěvy lékaře ročně — dvakrát víc než průměrný Evropan.', context: 'Průměr OECD 6,8. Vysoké číslo není ukazatel kvality.' },
  'clanek-pm25-spinavy-vzduch': { kicker: 'Životní prostředí · PM2.5', signal: 'bad', stat: '14,1', claim: 'mikrogramu PM2.5 na m³ v českém vzduchu.', context: 'Doporučení WHO je 5 — trojnásobek. IARC karcinogen třídy 1.' },
  'clanek-cekaci-doby-kycel': { kicker: 'Čekací doby · kyčel', signal: 'warn', stat: '118', claim: 'dní na náhradu kyčle — o třetinu déle než v OECD.', context: 'Průměr OECD 85 dní. Česko nemá národní záruku čekání.' },
  'clanek-okresni-nemocnice-personalni-krize': { kicker: 'Síť nemocnic · personál', signal: 'bad', stat: '11', claim: 'z 12 internistů v Pelhřimově dalo výpověď naráz.', context: 'Znojmo, Děčín, Rychnov — jeden vzorec, žádný garant.' },
  'clanek-czechsex-sexualni-nasili': { kicker: 'Bezpečnost · násilí', signal: 'bad', stat: '16,8', statSuffix: '%', barPct: 17, claim: 'žen v ČR zažilo znásilnění nebo jeho pokus.', context: '93 % obětí to nikdy nenahlásilo. Skoro každá šestá žena.' },
  'clanek-psychiatricke-hospitalizace-reforma-2026': { kicker: 'Duševní zdraví', signal: 'bad', stat: '43', claim: 'dní leží pacient v psychiatrii — nejdéle v OECD.', context: 'Průměr OECD 19 dní. Chybí komunitní péče, reforma stojí.' },
  'clanek-hiv-nove-diagnozy': { kicker: 'Prevence · HIV', signal: 'warn', stat: '293', claim: 'nových případů HIV v roce 2025 — a křivka roste.', context: 'Evropa klesá, Česko roste. PrEP pojištění nehradí.' },
  'clanek-nemocnice-v-horku': { kicker: 'Klima a zdraví', signal: 'bad', stat: '61 700', claim: 'úmrtí z horka v Evropě v létě 2022.', context: 'Vrchol úmrtí a příjmů do 2 dnů od rekordu. Klimatizace jen přesouvá.' },
  'clanek-posledni-mile-implementace': { kicker: 'Reforma · implementace', signal: 'neutral', context: 'Skuteční tvůrci politiky nejsou ti, kdo ji píší, ale ti, kdo ji denně aplikují.', headline: 'Reforma neselže na papíře, ale na poslední míli — u lékaře a sestry.' },
  'clanek-onkologicky-koordinator-2026': { kicker: 'Onkologie · koordinace', signal: 'neutral', context: 'Diagnostické okno do onkologické komise někdy přesahuje 4–6 týdnů.', headline: 'Od ledna 2026 provede pacienta od nálezu k léčbě koordinátor.' },
  'clanek-deficit-pojisteni-2026': { kicker: 'Financování · deficit', signal: 'bad', stat: '12–19', claim: 'miliard Kč deficit veřejného zdravotního pojištění pro rok 2026.', context: 'VZP samostatně −12,7 mld. Rezervy pojišťoven ~32 mld a klesají.' },
  'clanek-vyhnutelne-hospitalizace': { kicker: 'Primární péče · ACSC', signal: 'bad', stat: '592', claim: 'hospitalizací na 100 tisíc, kterým měla zabránit ambulantní péče.', context: 'Průměr OECD 473 — Česko je o 25 % výš. Slabá primární péče.' },
  'clanek-koureni': { kicker: 'Tabák · mladí', signal: 'bad', stat: '35,6', statSuffix: '%', barPct: 36, claim: 'mladých vapérů 15–24 už bere nejsilnější nikotin.', context: 'V roce 2022 jen 5 %. Sedminásobek za tři roky (SZÚ NAUTA 2025).' },
  'clanek-novela-elektronizace-2026': { kicker: 'eHealth · identita', signal: 'warn', stat: '56', statSuffix: '%', barPct: 56, claim: 'dospělých Čechů má aktivní digitální identitu (NIA).', context: '5 mil uživatelů — úzké hrdlo přístupu k novým eHealth službám.' },
  'clanek-kyberneticka-bezpecnost-zdravotnictvi-2026': { kicker: 'Kyberbezpečnost', signal: 'bad', stat: '10', statSuffix: '%', barPct: 10, claim: 'opatření kyberbezpečnosti je v českých nemocnicích plně funkčních.', context: '65 % nefunguje nebo chybí. Lhůta zákona končí v listopadu 2026.' },
  'clanek-epiziotomie': { kicker: 'Porodnictví · epiziotomie', signal: 'bad', stat: '27,8', statSuffix: '%', barPct: 28, claim: 'vaginálních porodů v Česku končí nástřihem hráze.', context: 'Medián EU 20 %, Nizozemsko pod 5 %. WHO: jen při indikaci.' },
  'clanek-nizka-porodna-hmotnost': { kicker: 'Perinatální zdraví · NPH', signal: 'warn', stat: '7,9', statSuffix: '%', barPct: 8, claim: 'novorozenců v ČR váží při narození pod 2 500 g.', context: 'Průměr OECD 6,8 %. Ročně ~800 dětí navíc — každé třinácté.' },
  'clanek-deficit-vzp-2026': { kicker: 'Financování · VZP', signal: 'bad', stat: '12,7', claim: 'miliardy Kč plánovaný deficit VZP pro rok 2026.', context: 'Celý systém až ~19 mld. Rezervní fondy vydrží zhruba 2 roky.' },
  'clanek-vedro-a-telo': { kicker: 'Klima · vedra', signal: 'bad', stat: '61 700', claim: 'úmrtí z horka v Evropě v létě 2022.', context: 'Vrchol úmrtí a příjmů přijde do 2 dnů od teplotního rekordu.' },
  'clanek-pacientske-vysledky-proms': { kicker: 'Pacient · PROMs', signal: 'neutral', context: 'PROMs a PREMs — hlas pacienta, který v hodnocení nejvíc chybí.', headline: 'Hodnocení umí spočítat lůžka i mortalitu. Zřídka se ptá pacienta.' },
  'clanek-polypragmazie-senioru': { kicker: 'Bezpečnost preskripce', signal: 'bad', stat: '51', statSuffix: '%', barPct: 51, claim: 'seniorů 65+ užívá souběžně pět a více léků.', context: 'Průměr OECD ~33 %. Česko mezi 4 nejhoršími zeměmi OECD.' },
  'clanek-institut-verejneho-zdravi': { kicker: 'Veřejné zdraví · reforma', signal: 'neutral', stat: '17', claim: 'institucí sloučí reforma hygienické služby do jedné agentury.', context: '14 KHS, SZÚ a 2 ústavy, 4 200 lidí. Od 1925 nejhlubší přestavba.' },
  'clanek-reforma-psychiatrie-13-let': { kicker: 'Duševní zdraví · reforma', signal: 'warn', stat: '13', claim: 'let reformy psychiatrie: úspěchy padají s každou výměnou vlády.', context: 'Síť CDZ vznikla, hospitalizace klesla — bez zákona ale inovace mizí.' },
  'clanek-sebevrazdy-dusevni-zdravi': { kicker: 'Duševní zdraví', signal: 'warn', stat: '12,5', claim: 'sebevražd na 100 000 obyvatel v ČR — nad průměrem OECD.', context: 'Průměr OECD 11. Antidepresiv 84 DDD vs 67 — léky ano, péče ne.' },
  'clanek-reforma-pohotovosti-290-2025': { kicker: 'Dostupnost · pohotovost', signal: 'warn', stat: '16', claim: 'samostatných pohotovostí pro dospělé zaniklo od ledna 2026.', context: 'Nově je LPS povinná u 96 urgentů. Organizují ji pojišťovny, ne kraje.' },
  'clanek-hta-jca-eu-2026': { kicker: 'HTA · úhrady', signal: 'bad', stat: '0', claim: 'hodnotících orgánů pro výkony a screening v ČR. SÚKL řeší jen léky.', context: 'Dohodovací řízení 2027 dělí 580 mld Kč bez HTA pro výkony.' },
  'clanek-vakcinace-hexa-deti': { kicker: 'Prevence · očkování', signal: 'bad', stat: '86', statSuffix: '%', barPct: 86, claim: 'dětí má kompletní základní očkování — pod prahem imunity.', context: 'V roce 2020 to bylo 97 %. Práh kolektivní imunity je 95 %.' },
  'clanek-digi-1-co-to-je': { kicker: 'Digitalizace · série', signal: 'neutral', context: 'eRecept od 2018, eNeschopenka od 2020 — používáte to, aniž víte.', headline: 'Digitalizace není jedna databáze. Data zůstávají u lékaře, síť je propojí.' },
  'clanek-stret-zajmu-vyziva-kojencu': { kicker: 'Veřejné zdraví · etika', signal: 'bad', context: 'Komerční vliv teče dál přes odborné společnosti napojené na výrobce.', headline: 'Komise pro výživu kojenců vyřadila střet zájmů. Za dva roky ho pustila zpět.' },
  'clanek-nadstandardy-1-otevrene-dvere': { kicker: 'Nadstandardy', signal: 'neutral', stat: '12', claim: 'let leží otevřené dveře k nadstandardům — nikdo jimi neprošel.', context: 'Ústavní soud 2013 nadstandardy nezakázal. Pokus 2025 (Válek) neprošel.' },
  'clanek-predcasne-porody-centralizace': { kicker: 'Porodnictví · předčasné porody', signal: 'good', stat: '6,4', statSuffix: '%', claim: 'dětí se v Česku rodí předčasně — pod evropským průměrem 7,4 %.', context: '85,9 % velmi předčasných porodů proběhne ve 12 centrech.' },
  'clanek-prevalence-dusevnich-poruch': { kicker: 'Duševní zdraví · prevalence', signal: 'bad', stat: '27,2', statSuffix: '%', barPct: 27, claim: 'dospělých Čechů má aktuální duševní poruchu (2022).', context: '61 až 93 % z nich se nikdy neléčí.' },
  'clanek-nadumrtnost-cesko': { kicker: 'Odolnost systému · nadúmrtnost', signal: 'good', stat: '2,6', statSuffix: '%', claim: 'nadúmrtnost Česka v roce 2024 — pod průměrem EU (3,6 %).', context: 'V roce 2021 to bylo 26,3 % — mezi nejhoršími na světě.' },
  'clanek-nahrada-kolenniho-kloubu': { kicker: 'Ortopedie · objem péče', signal: 'neutral', stat: '212,4', claim: 'náhrad kolenního kloubu na 100 000 obyvatel (2024) — nad průměrem EU.', context: 'Za tři roky víc než dvojnásobek (2021: 103,4).' },
  'clanek-spalnicky-usa-2026': { kicker: 'Vakcinace · spalničky', signal: 'bad', stat: '2 371', claim: 'případů spalniček v USA k 30. 7. 2026 — nejvíc od roku 1991.', context: 'Proočkovanost MMR před školou 92,5 %. Práh imunity je 95 %.' },
  'clanek-podil-prakticti-lekari': { kicker: 'Dostupnost · primární péče', signal: 'bad', stat: '16,9', statSuffix: '%', barPct: 17, claim: 'lékařů v Česku jsou praktici — průměr OECD je kolem 23 %.', context: 'Lékařů má Česko dost (4,2 na 1 000). Chybí generalisté.' },
  'clanek-detska-psychiatrie-akutni-luzka': { kicker: 'Duševní zdraví · děti', signal: 'neutral', stat: '4 067', claim: 'akutních psychiatrických hospitalizací dětí do 19 let (2023).', context: 'Téměř dvojnásobek proti roku 2013. Chybí ambulance, ne lůžka.' },
  'clanek-szu-pripominky-nivz': { kicker: 'Reforma veřejného zdraví', signal: 'warn', stat: '11', claim: 'okruhů výhrad poslal SZÚ k reformě, která ho má pohltit.', context: 'Sedm zůstává bez odezvy, jedna se vyvinula přesně opačně.' },
  'clanek-klistova-encefalitida': { kicker: 'Prevence · nákazy z klíšťat', signal: 'bad', stat: '670', claim: 'hlášených případů klíšťové encefalitidy za rok 2024 — nejvíc v celé EU.', context: '6,1 na 100 tisíc obyvatel proti průměru EU/EEA 0,81. Očkováno je 17 % Čechů.' },
  'clanek-deti-ambulantni-psychiatrie': { kicker: 'Duševní zdraví · děti', signal: 'neutral', stat: '65 000', claim: 'dětí do 19 let ročně projde psychiatrickou ambulancí (2023).', context: 'Na neakutní vyšetření se čeká typicky 6 měsíců. Psychiatrů pro děti je 157–200.' },
};

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Zalamování podle ~počtu znaků na řádek. */
function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) { lines.push(line.trim()); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line.trim());
  return lines;
}

function heroSizeFor(stat, sizes) {
  const n = String(stat).length;
  if (n <= 2) return sizes[2];
  if (n === 3) return sizes[3];
  if (n === 4) return sizes[4];
  return sizes.more;
}

function eyebrow(L, kicker, accent) {
  return `
  <rect x="${L.M}" y="${L.accentRuleY}" width="${L.accentRuleW}" height="10" rx="5" fill="${accent}"/>
  <text class="kicker" x="${L.M}" y="${L.kickerY}">${escapeXml(kicker)}</text>`;
}

function footer(L) {
  return `
  <line x1="${L.M}" y1="${L.footerLineY}" x2="${L.W - L.M}" y2="${L.footerLineY}" stroke="${RULE}" stroke-width="1.5"/>
  <text class="brand" x="${L.M}" y="${L.footerTextY}">HSPA Monitor</text>
  <text class="domain" x="${L.W - L.M}" y="${L.footerTextY}" text-anchor="end">skorezdravotnictvi.cz</text>`;
}

function ctaBlock(L, accent) {
  if (!L.cta) return '';
  return `
  <text class="cta" x="${L.M}" y="${L.cta.y}"><tspan fill="${PAPER}">${escapeXml(L.cta.text.replace(' → odkaz v biu', ''))}</tspan><tspan fill="${accent}"> → odkaz v biu</tspan></text>`;
}

function styleBlock(L, accent, statFont) {
  return `
    .kicker { font-family: 'Inter', system-ui, sans-serif; font-size: ${L.kickerFont}px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; fill: ${accent}; }
    .hero { font-family: 'Inter', system-ui, sans-serif; font-size: ${statFont}px; font-weight: 800; letter-spacing: -4px; fill: ${accent}; }
    .hero-suffix { font-size: ${Math.round(statFont * 0.42)}px; font-weight: 800; }
    .claim { font-family: 'Source Serif 4', Georgia, serif; font-size: ${L.claimFont}px; font-weight: 700; letter-spacing: -0.4px; fill: ${PAPER}; }
    .context { font-family: 'Inter', system-ui, sans-serif; font-size: ${L.ctxFont}px; font-weight: 600; fill: ${accent}; }
    .head { font-family: 'Source Serif 4', Georgia, serif; font-size: ${L.headFont}px; font-weight: 700; letter-spacing: -0.6px; fill: ${PAPER}; }
    .cta { font-family: 'Inter', system-ui, sans-serif; font-size: ${L.cta ? L.cta.font : 30}px; font-weight: 700; }
    .brand { font-family: 'Source Serif 4', Georgia, serif; font-size: ${L.brandFont}px; font-weight: 700; fill: ${PAPER}; }
    .domain { font-family: 'Inter', system-ui, sans-serif; font-size: ${L.domainFont}px; font-weight: 600; fill: ${MUTED}; }`;
}

function buildStatCard(meta, L) {
  const { kicker, signal, stat, statSuffix, claim, context, barPct } = meta;
  const accent = SIGNAL[signal] || PAPER;
  const statFont = heroSizeFor(stat, L.heroSizes);
  const suffix = statSuffix
    ? `<tspan class="hero-suffix" dx="8" fill="${accent}">${escapeXml(statSuffix)}</tspan>` : '';

  const claimLines = wrap(claim, L.claimWrap);
  if (claimLines.length > L.claimMaxLines) {
    throw new Error(`Claim se nevejde (>${L.claimMaxLines} řádky) pro „${stat}${statSuffix || ''}": ${claim} — zkrať copy v MANIFESTU.`);
  }
  const claimStartY = L.heroBaseline + L.claimGap;
  const claimSvg = claimLines
    .map((l, i) => `<text class="claim" x="${L.M}" y="${claimStartY + i * L.claimLineH}">${escapeXml(l)}</text>`)
    .join('\n  ');
  let cursorY = claimStartY + (claimLines.length - 1) * L.claimLineH;

  // Pruh i pointa se mohou zobrazit současně (pruh → pak pointa pod ním).
  const blocks = [];
  if (typeof barPct === 'number') {
    const barY = cursorY + L.barGap;
    const barW = L.W - L.M * 2;
    const fillW = Math.max(10, Math.round(barW * Math.min(100, barPct) / 100));
    blocks.push(`
  <rect x="${L.M}" y="${barY}" width="${barW}" height="${L.barH}" rx="${L.barH / 2}" fill="${TRACK}"/>
  <rect x="${L.M}" y="${barY}" width="${fillW}" height="${L.barH}" rx="${L.barH / 2}" fill="${accent}"/>`);
    cursorY = barY + L.barH;
  }
  if (context) {
    const ctxLines = wrap(context, L.ctxWrap || 40).slice(0, 2);
    const ctxStartY = cursorY + L.ctxGap;
    blocks.push(ctxLines
      .map((l, i) => `<text class="context" x="${L.M}" y="${ctxStartY + i * L.ctxLineH}">${escapeXml(l)}</text>`)
      .join('\n  '));
  }
  const extra = blocks.join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.W} ${L.H}" width="${L.W}" height="${L.H}" role="img" aria-label="${escapeXml(stat + (statSuffix || '') + ' — ' + claim)}">
  <defs><style>${styleBlock(L, accent, statFont)}
  </style></defs>
  <rect width="${L.W}" height="${L.H}" fill="${BG}"/>
  ${eyebrow(L, kicker, accent)}
  <text class="hero" x="${L.M - 4}" y="${L.heroBaseline}">${escapeXml(stat)}${suffix}</text>
  ${claimSvg}
  ${extra}
  ${ctaBlock(L, accent)}
  ${footer(L)}
</svg>`;
}

function buildHeadlineCard(meta, L) {
  const { kicker, signal, headline, context } = meta;
  const accent = SIGNAL[signal] || PAPER;
  const lines = wrap(headline, L.headWrap).slice(0, L.headMaxLines);
  const headSvg = lines
    .map((l, i) => `<text class="head" x="${L.M}" y="${L.headStartY + i * L.headLineH}">${escapeXml(l)}</text>`)
    .join('\n  ');
  const ctxY = L.headStartY + (lines.length - 1) * L.headLineH + 72;
  const ctxSvg = context
    ? `<text class="context" x="${L.M}" y="${ctxY}">${escapeXml(context)}</text>` : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.W} ${L.H}" width="${L.W}" height="${L.H}" role="img" aria-label="${escapeXml(headline)}">
  <defs><style>${styleBlock(L, accent, 200)}
  </style></defs>
  <rect width="${L.W}" height="${L.H}" fill="${BG}"/>
  ${eyebrow(L, kicker, accent)}
  ${headSvg}
  ${ctxSvg}
  ${ctaBlock(L, accent)}
  ${footer(L)}
</svg>`;
}

export function buildSvg(slug, meta, format = 'square') {
  const L = LAYOUTS[format] || LAYOUTS.square;
  return meta.stat ? buildStatCard(meta, L) : buildHeadlineCard(meta, L);
}

function renderCard(slug, meta, format) {
  const svg = buildSvg(slug, meta, format);
  const L = LAYOUTS[format];
  const outDir = OUT_DIRS[format];
  // resvg je dostupný jen tam, kde jsou devDependencies (CI / lokál).
  return import('@resvg/resvg-js').then(({ Resvg }) => {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: L.W } }).render().asPng();
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const out = resolve(outDir, `${slug}.png`);
    writeFileSync(out, png);
    return out;
  });
}

async function main() {
  let args = process.argv.slice(2);
  const svgOnly = args.includes('--svg');
  args = args.filter(a => a !== '--svg');

  let formats = ['square', 'story', 'landscape'];
  const fmtIdx = args.indexOf('--format');
  if (fmtIdx !== -1) {
    const val = args[fmtIdx + 1];
    if (!LAYOUTS[val]) { console.error(`⚠️  Neznámý formát „${val}". Použij square|story|landscape.`); process.exit(1); }
    formats = [val];
    args.splice(fmtIdx, 2);
  }

  const slugs = args.length ? args : Object.keys(MANIFEST);
  for (const slug of slugs) {
    const meta = MANIFEST[slug];
    if (!meta) { console.error(`⚠️  Nemám entry v MANIFESTU pro: ${slug} — přeskakuji.`); continue; }
    for (const format of formats) {
      if (svgOnly) {
        const outDir = OUT_DIRS[format];
        if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
        const out = resolve(outDir, `${slug}.svg`);
        writeFileSync(out, buildSvg(slug, meta, format));
        console.log(`✓ ${out}`);
      } else {
        const out = await renderCard(slug, meta, format);
        console.log(`✓ ${out}`);
      }
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
