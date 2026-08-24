# Plán: Rakovina — co teď (navigační průvodce onkologickým systémem)

**Stav:** návrh, čeká na schválení vlastníkem (session 2026-08-24).
**Datum:** 2026-08-24.
**Branch:** `claude/plan-onko` (zatím jen tento dokument, bez implementace).
**Cíl:** nová sekce `rakovina.html` + podstránky — **průvodce systémem, který
pacienta bude léčit**. Ne co je rakovina (to dělá LINKOS a pacientské
organizace líp), ale kam patřím, na co mám nárok, na co se ptát, čemu věřit.

---

## 0) Co už na webu je (inventura před psaním čehokoli)

Tohle není zelená louka. Před návrhem byla provedena inventura korpusu:

| Aktivum | Stav |
|---|---|
| `cesta-pacienta.html` + `data/cesta-pacienta.json` | **Už je to onkologická cesta**: 7 diagnóz (prs, kolorektum, děložní hrdlo, děložní sliznice, prostata, lymfom, oko) × 5 fází (prevence → příznaky → diagnostika → léčba → sledování). Adaptace infografik **Hlas pacientů + LINKOS** s atribucí a explicitní poznámkou „nenahrazuje". |
| Články | **37 onko-relevantních** z 259 (přežití prsu/plic, screeningy, centrové léky, radioterapie, PET, centralizace chirurgie 2027, onkologický koordinátor, paliativa, mobilní hospice, tamoxifen…) |
| Indikátory | **14** (5× screening pokrytí, 3× pětileté přežití, incidence prs/kolorektum, onko mortalita, paliativní kapacity) |
| Věstníky MZ | **22 položek o onko centrech**; klíčová částka **11/2025 „Organizace a hodnocení kvality onkologické péče v ČR"** |
| Série „nárok pojištěnce" | 4 díly (co to je → demografický tlak → co s tím → jak definovat) |
| `kompas.html` | osobní profil → „co se týká právě vás" (prevence a screeningy podle věku/pohlaví) |
| `pribeh-pacienta.html` | hra s personami, jedna z nich `prs_zena` |
| `kolonoskopie.html` | hloubkový datový pohled na kolorektální screening |
| Glosář | 246 pojmů, z toho **0 onkologických** ← díra |

**Závěr inventury:** klinická osa („co se bude dít s mojí nemocí") existuje.
Chybí **systémová osa** („co teď dělat se systémem") — a to je přesně to, co
umí jen tenhle web.

## 1) Pozicování — dvě osy, ne duplicita

```
cesta-pacienta.html   →  KLINICKÁ osa: co se bude dít s nemocí
                         (podle diagnózy × fáze; zdroj Hlas pacientů/LINKOS)

rakovina.html (nové)  →  SYSTÉMOVÁ osa: co teď dělat se systémem
                         (podle fáze; zdroj = vlastní data webu)
```

Obě stránky na sebe **vzájemně odkazují na úrovni fáze** (jsem v diagnostice →
tady je klinicky co čekat, tady je systémově co si zařídit).

**Redakční kontrakt sekce, jednou větou:** *Neříkáme vám, co máte za nemoc ani
jak se léčit. Ukazujeme, jak funguje systém, který vás bude léčit — a co v něm
můžete ovlivnit.*

Tím se problém „nenahrazovat pacientské organizace" neřeší disclaimerem, ale
strukturálně: obsazujeme místo, které nikdo jiný neobsadil, a na ostatní
aktivně odkazujeme (vazba na Hlas pacientů/LINKOS už na webu existuje).

**Vlajková ukázka, proč to má smysl:** Věstník 11/2025 ukládá komplexním
onkologickým centrům „multidisciplinární posuzování klinických případů,
včetně následného rozhodování o způsobu léčby a o jejím umístění v síti".
Tedy každý pacient v KOC má mít případ projednaný komisí. Skoro nikdo to neví
a nikdo se nezeptá — a je to v dokumentu, který jsme jako jediní zarchivovali
a zpřístupnili k hledání. Přesně tenhle typ informace je důvod sekce.

## 2) Vstup: rozcestník podle fáze, ne podle diagnózy

Otázky o systému jsou napříč diagnózami skoro stejné; diagnózami se zabývá
`cesta-pacienta.html`. Šest vstupů:

| Fáze | Vstupní otázka čtenáře |
|---|---|
| `cekam` | Čekám na výsledky — co se teď děje a jak dlouho to má trvat |
| `zacatek` | Mám diagnózu — kam patřím a kdo o mně rozhoduje |
| `lecba` | Jsem v léčbě — provoz, práce, peníze, kdy volat |
| `po-lecbe` | Po léčbě — dispenzarizace a návrat do života |
| `pokrocila` | Nemoc pokročila — paliativní péče jako aktivní volba |
| `blizky` | Jsem blízký člověk (často právě on hledá ve dvě ráno) |

## 3) Obsahové pilíře

**P1 — Kam patřím: mapa center.** Síť KOC/HOC z Věstníků, co které centrum
umí, spádovost, proč u složitých výkonů centralizace zvyšuje šanci (články
o centralizaci chirurgie 2027, radioterapii, PET). Klíčová věta: *máte právo
si říct o péči v centru a o druhý názor.*

**P2 — Na co mám nárok.** Vrstvy: standardní hrazená péče → centrové léky →
**§ 16 zák. 48/1997 Sb.** → doplatky a nadstandard → co dělat při zamítnutí
(revizní lékař, odvolání, lhůty). Staví na sérii nárok pojištěnce + článku
o centrových lécích. **Datová otázka ve stylu webu:** kolik žádostí podle § 16
se ročně podá a kolik schválí — pokud to pojišťovny nezveřejňují, je to samo
o sobě zjištění, které do sekce patří.

**P3 — Jak číst zprávu a na co se ptát.** Dekodér nálezu (histologie, TNM,
grading, receptory, mutace, R0 resekce, adjuvantní × neoadjuvantní) +
**tisknutelné karty otázek** po fázích. Ne generický seznam — otázky, které
mění rozhodnutí: *Je cílem vyléčení, nebo kontrola nemoci? Jaké jsou
alternativy? Co se stane, když si vezmu dva týdny na druhý názor? Byl můj
případ projednán v multidisciplinárním týmu a co doporučil? Přichází v úvahu
klinická studie?*

**P4 — Statistika a co (ne)říká o vás.** Nejcennější kus „nestrašit, ale
informovat" — a celý z vlastních dat: čísla přežití na webu (prs 81,4 %,
kolorektum 56,1 %, plíce 10,6 %) jsou z **kohorty 2014**. Člověk s diagnózou
v roce 2026 se dívá na výsledek léčby, která se mezitím změnila. Vysvětlit,
proč populační pětileté přežití není osobní prognóza, je zároveň
nejpoctivější a nejuklidňující text, jaký lze napsat.

**P5 — Životospráva a pohyb po vrstvách důkazu.** Explicitně rozdělit „víme
jistě / pravděpodobně / nevíme". Pohyb během a po léčbě má dnes silná data
(únava, kvalita života; u kolorektálního karcinomu i signál na přežití —
**před publikací ověřit** aktuální randomizované důkazy). Výživa: udržet váhu
a bílkoviny; „cukr krmí nádor" je mýtus; alkohol prokázaný karcinogen;
doplňky většinou nepomáhají a některé (vysokodávkové antioxidanty při
radioterapii) mohou škodit. Alternativní medicína bez moralizování: *skutečné
riziko není bylinka, ale odklad prokázané léčby.*

**P6 — Kde hledat dál a jak poznat, čemu věřit.** Kurátorovaná mapa
s popiskem „na co je dobrý": pacientské organizace (Hlas pacientů jako
střecha, Amelie, Mamma HELP, Dialog Jessenius, Onko Unie), LINKOS/ČOS pro
odborné postupy, MOÚ, NZIP, registr klinických studií. Plus krátký návod, jak
hodnotit zdroj (kdo, kdy, prodává něco, odkazuje na guidelines).

**Doplňkové (fáze 4):** práce a peníze (neschopenka, invalidní důchod,
příspěvek na péči, ošetřovné, cestovné — bývá to nejčastější neuspokojená
informační potřeba; navazuje na rozpracovaný text o posudkové službě),
klinické studie, samostatná větev pro blízké a pečující.

## 4) Dataset `data/onko-navigace.json`

Kurátorovaný soubor ve stejném duchu jako `data/rozhodovani.json`.

```json
{
  "version": "1.0",
  "updated_at": "2026-08-24",
  "pozn": "Navigační, ne léčebný obsah. Klinickou osu drží data/cesta-pacienta.json.",
  "faze": [{
    "id": "zacatek",
    "label": "Mám diagnózu, začínáme",
    "otazka": "Kam patřím a kdo o mně rozhoduje?",
    "shrnuti": "2–3 věty orientace, druhá osoba, bez čísel",
    "kroky": [{
      "co": "Ověřte si, že váš případ jde do multidisciplinárního týmu",
      "proc": "Věstník 11/2025 to ukládá komplexním onkologickým centrům",
      "doklad": { "typ": "vestnik", "rok": 2025, "cislo": 11, "url": "https://mzd.gov.cz/vestnik/vestnik-11-2025/" }
    }],
    "otazky_k_tisku": ["Byl můj případ projednán v MDT a co komise doporučila?"],
    "narok": ["centrova_lecba", "par16"],
    "clanky": ["clanek-onkologicky-koordinator-2026.html"],
    "indikatory": ["prezit_karcinom_prsu_5let"],
    "cesta_pacienta_faze": "diagnostika"
  }],
  "narok": [{
    "id": "par16",
    "label": "§ 16 — úhrada výjimečné péče",
    "kdy": "Kdy na to vůbec dojde",
    "jak": ["Krok 1…", "Krok 2…"],
    "lhuty": "co říká zákon",
    "kdyz_zamitnou": "…",
    "pravni_ramec": "§ 16 zák. č. 48/1997 Sb.",
    "clanky": ["clanek-centrove-leky-2026.html"]
  }],
  "zdroje_dal": [{
    "id": "hlas-pacientu",
    "nazev": "Hlas pacientů",
    "url": "https://www.hlaspacientu.cz",
    "na_co": "střešní platforma pacientských organizací; kontakty a podpora",
    "typ": "pacientska_organizace"
  }],
  "evidence": [{
    "id": "pohyb",
    "tvrzeni": "Pohyb během a po léčbě snižuje únavu a zlepšuje kvalitu života",
    "sila": "silna | stredni | nejista",
    "zdroj": "guideline/studie + rok",
    "co_to_neznamena": "…"
  }]
}
```

Validátor `ingest/validate-onko.js` (do `npm run validate:all`): každý krok má
`doklad` nebo `pravni_ramec`; každé tvrzení v `evidence` má `sila` i
`co_to_neznamena`; všechny odkazované články, indikátory a fáze
`cesta_pacienta_faze` musí existovat.

## 5) Stránky a moduly

- `rakovina.html` + `src/rakovina.js` — hub: `.ed-hero`, rozcestník šesti
  fází, pod ním pilíře jako karty; skeleton dle `jak-se-rozhoduje.html`.
- Detail fáze buď `?faze=zacatek` na téže stránce (preferováno — méně
  souborů, sdílený stav), nebo samostatné podstránky, pokud SEO vyhraje.
- **Tisk**: karty otázek musí jít vytisknout na jednu stránku (`@media print`
  už v `styles.css` je) — lidé si je berou s sebou.
- CSS namespace `.onk-*`; po úpravě `styles.css` vždy `npm run build:css`
  lokálně, ale **minifikát ani ostatní generované artefakty do PR nepatří**.
- **Doplnit ~40 onko pojmů do glosáře** (dnes 0 z 246) — inline rozbalování
  `glossary-inline.js` je pro tenhle obsah ideální.

## 6) Co tam NEpatří

- Symptom checker a obsah typu „mám rakovinu?" — to je vyděsivý vektor.
- Doporučení léčby podle diagnózy, individuální prognostické kalkulačky.
- Diskusní fórum (dělají pacientské organizace, vyžaduje moderaci).
- Encyklopedie diagnóz — od toho je `cesta-pacienta.html` a LINKOS.

## 7) Editorial: přísnější režim než zbytek webu

Chyba v článku o Věstníku je trapas; chyba tady může někoho poškodit.

1. **Jmenovaný odborný recenzent** u každé stránky — rozšířit `audit-status`
   o `medical_reviewer` a `review_due`.
2. **Expirace 12 měsíců** (onkologie stárne rychle: nové léky, nové úhrady)
   místo obvyklé lhůty; hlídá nightly skener.
3. **Každé tvrzení kotvené** ve guideline (Modrá kniha ČOS, ESMO) nebo
   v registru → `data/claims.json`.
4. **Tón**: druhá osoba, žádné metafory boje a prohry, žádné číslo bez věty
   o tom, co (ne)říká o čtenáři, žádné falešné sliby.

## 8) Partnerství — udělat dřív než první řádek kódu

Vazba na **Hlas pacientů + LINKOS** už na webu existuje (`cesta-pacienta.json`
je adaptace jejich infografik s atribucí). Rozšířit ji:

- Oslovit je + jednoho onkologa z KOC s konkrétní otázkou: **„na co se vás
  lidé ptají a nemáte jim kam dát odkaz?"** → empirický obsahový brief místo
  odhadu.
- Výsledek: z potenciálního sporu o teritorium se stane distribuční kanál
  a získá se odborný recenzent, kterého sekce stejně potřebuje.

## 9) Fáze implementace

| Fáze | Obsah | PR |
|---|---|---|
| 1 | Rozcestník 6 fází + karty otázek (P3) + mapa center (P1) + zdroje dál (P6) | 1–2 |
| 2 | Nárok a § 16 (P2) + sociální nárok (práce, peníze) | 1 |
| 3 | Statistika a co neříká (P4) + životospráva a pohyb (P5) | 1–2 |
| 4 | Klinické studie + větev pro blízké + onko pojmy do glosáře | 1 |

Průřezově: vzájemné odkazy s `cesta-pacienta.html`, `kompas.html`,
`prevence.html`, `vestniky-mz.html` a `jak-se-rozhoduje.html`.

## 10) Testy

- `tests/onko.test.js`: drift datasetu proti validátoru; existence všech
  odkazovaných článků/indikátorů/fází; každý krok má doklad nebo právní
  rámec; každé evidence tvrzení má `sila` + `co_to_neznamena`.
- Odkazy `cesta_pacienta_faze` musí sedět na `data/cesta-pacienta.json`.
- Nav + sitemap + a11y (`visual-a11y.yml`) jako u ostatních stránek.

## 11) Otevřené otázky pro vlastníka

1. **Název sekce.** „Rakovina! Co teď dál…" má dobré jádro („co teď" je přesně
   otázka čtenáře), ale vykřičník se čte poplašně. Návrh: **„Rakovina: co teď"**
   s podtitulem o průvodci systémem.
2. **URL a vztah k `pro-pacienty.html`** — má být sekce samostatný vstup
   z hlavní nav, nebo podsekce rozcestníku pro pacienty?
3. **Rozsah § 16 dat** — chceme se pokusit získat počty žádostí/schválení od
   pojišťoven (žádost dle 106/1999 Sb. jako u zápisů PPO)?
4. **Odborný garant** — kdo, a řešíme ho před fází 1, nebo až před publikací?
