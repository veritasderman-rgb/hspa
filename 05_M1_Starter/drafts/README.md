# Drafts — pracovní obsah, není zveřejněn

Tato složka obsahuje obsah, který je v redakční přípravě. **Není načítán frontendem** ani Vercelem do hlavního dashboardu. K publikaci je nutné:

| Typ obsahu | Jak publikovat |
|---|---|
| `clanek-*.html` (článek) | (1) Přesunout do rootu `05_M1_Starter/` (sourozenec `index.html`), (2) přidat záznam do `data/articles.json`, (3) odebrat `<meta name="robots" content="noindex, nofollow">` z `<head>`. |
| `explainer-*.json` | (1) Aktualizovat `verified_at` a `verification_status: "ok"`, (2) zkopírovat objekt (bez pole `_draft_note`) do `data/explainers.json` jako další položku v poli `explainers`, (3) propojit s odpovídajícími indikátory v `linked_indicators`. |

## Aktuální drafty (8. 5. 2026)

### `clanek-porodnice-regiony.html`
Odborný článek 4+ A4 o transformaci porodnické sítě v ČR — ekonomika malých porodnic, mezinárodní zkušenost s centralizací (NL, DK, UK), regionální gradient dostupnosti, právní rámec (vyhláška 99/2012, NV 307/2012, zákon 372/2011, novela 290/2025) a otevřená reformní debata. Vychází z aktuálních epizod 2023–2026 (Děčín, Rychnov nad Kněžnou, Prachatice).

### `explainer-paliativni-pece-novela.json`
Systémový explainer k senátní novele zákona 372/2011 Sb. (předložila senátorka Procházková, únor 2026), která zavádí subjektivní nárok pacienta na paliativní péči a institut KDPS (kontinuální hluboká paliativní sedace). Vysvětluje právní novinky, klinickou rovinu (vztah ke eutanazii), strukturální slabiny (chybějící financování, registr DNR, kapacity MSPT po krajích). Status k 8. 5. 2026: 1. čtení v Senátu.
