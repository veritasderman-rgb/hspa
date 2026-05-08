# Drafts — pracovní obsah, není zveřejněn

Tato složka obsahuje obsah, který je v redakční přípravě. **Není načítán frontendem** ani Vercelem do hlavního dashboardu. K publikaci je nutné:

| Typ obsahu | Jak publikovat |
|---|---|
| `clanek-*.html` (článek) | (1) Přesunout do rootu `05_M1_Starter/` (sourozenec `index.html`), (2) přidat záznam do `data/articles.json`, (3) odebrat `<meta name="robots" content="noindex, nofollow">` z `<head>`. |
| `explainer-*.json` | (1) Aktualizovat `verified_at` a `verification_status: "ok"`, (2) zkopírovat objekt (bez pole `_draft_note`) do `data/explainers.json` jako další položku v poli `explainers`, (3) propojit s odpovídajícími indikátory v `linked_indicators`. |

## Aktuální drafty (8. 5. 2026)

### `clanek-porodnice-regiony.html`
Odborný článek 4+ A4 o transformaci porodnické sítě v ČR — ekonomika malých porodnic, mezinárodní zkušenost s centralizací (NL, DK, UK), regionální gradient dostupnosti, právní rámec (vyhláška 99/2012, NV 307/2012, zákon 372/2011, novela 290/2025) a otevřená reformní debata. Vychází z aktuálních epizod 2023–2026 (Děčín, Rychnov nad Kněžnou, Prachatice).

### `clanek-novela-290-2025-prava-pacientu.html`
Komplexní rozbor novely 290/2025 Sb. z perspektivy práv pacientů — co konkrétně přidává a co zůstává jen v deklaraci.

### `clanek-vakcinace-lekarny-nelekari.html`
Odborný článek 4+ A4 o reformě kompetencí nelékařských povolání (druhá legislativní priorita ministra Vojtěcha pro 2026) — vakcinace v lékárně, sesterská preskripce, kompetence záchranářů a fyzioterapeutů. Mezinárodní paralely (UK NHS Pharmacy First, Francie décret 2019-357, Portugalsko, Polsko). Strukturální tlak (stárnutí, nedostatek praktiků, lékárenská hustota 26,7/100k vs OECD 30,4), právní rámec (zákon 96/2004 Sb., vyhláška 55/2011 Sb.), tarifní logika SZV a otevřené otázky odpovědnosti. Linkováno na nový HSPA indikátor `lekarny_per_100k`.

### `explainer-paliativni-pece-novela.json`
Systémový explainer k senátní novele zákona 372/2011 Sb. (předložila senátorka Procházková, únor 2026), která zavádí subjektivní nárok pacienta na paliativní péči a institut KDPS (kontinuální hluboká paliativní sedace). Vysvětluje právní novinky, klinickou rovinu (vztah ke eutanazii), strukturální slabiny (chybějící financování, registr DNR, kapacity MSPT po krajích). Status k 8. 5. 2026: 1. čtení v Senátu.

### `clanek-novela-leciva-lpod-2026.html`
Odborný článek 4+ A4 o novele zákona o léčivech 456/2025 Sb. (účinnost 1. 6. 2026) — největší propacientská změna lékové legislativy za 15 let. Vysvětluje novou kategorii LPOD (Léčivé přípravky s omezenou dostupností), §33b–§33f (zákaz reexportu, sustaining supply, denní reportování skladů, alokační proporcionalita), čtyři proudy způsobující výpadky (asijská API, paralelní obchod, úhradové prostředí, single-source generika), mezinárodní kontext (Slovensko 2017, EMA ESMP 2025, EU Critical Medicines Act). Linkováno na nový HSPA indikátor `lpod_share_critical`.

### `clanek-reforma-stomatologie-3-amalgam.html`
Odborný článek 4+ A4 o Reformě stomatologie 3 — konec dentálního amalgámu (EU nařízení 2024/1849, Minamatská úmluva), nová úhradová logika (kompozitní výplně jako základní hrazená varianta), strukturální deficit zubařů v krajích (0,61–1,04/1000), putovní zubní pohotovosti po novele 290/2025 Sb. v 10 krajích bez dohody (Karlovarský: rotace mezi Chebem, KV, Sokolovem, dojezd 30–60 km). Linkováno na rozšířený regionální datasety pro `stomatologove_per_1000`.
