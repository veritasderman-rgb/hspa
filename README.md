# Zdravé Česko — HSPA Dashboard

Veřejný portál pro hodnocení výkonnosti zdravotního systému ČR podle metodiky **OECD HSPA**.
Inspirováno belgickým modelem **Healthy Belgium**. Cíl: srozumitelně, datově podložené,
v jednom místě.

🌐 **Produkce:** [zdrave-cesko.cz](https://zdrave-cesko.cz) (deploy via Vercel)
📂 **Aktivní kód:** [`05_M1_Starter/`](05_M1_Starter/)
📖 **Vývojářská dokumentace:** [`docs/`](docs/)

## Co projekt aktuálně obsahuje

| | |
|---|---|
| 📊 **80 HSPA indikátorů** | Naděje dožití, mortality, screening, prevence, finance, lidské zdroje… Datový kontrakt v `data/indicators.json`, denní snapshoty. |
| 📰 **65+ článků** | Long-form journalism k jednotlivým indikátorům a reformním tématům. Article Visuals designsystem (timeline, srovnání, flow, animované countery). |
| 📚 **110 termínů glossary** | Inline rozbalovací definice v textu článků, samostatná stránka `glosar.html`. |
| 🗺️ **Krajský dashboard** | 14 krajů × klíčové indikátory + OIS 11-47 (struktura pojištěnců dle ZP × kraj × okres). |
| 🧭 **8 tematických linií** | Mentální zdraví, prevence, senioři, equity, dlouhodobá péče, finance, eHealth, kvalita. |
| 🎯 **6 dimenzí kvality** | Přístupnost, efektivita, kvalita, equity, udržitelnost, bezpečnost. |
| 🧪 **~260 testů** | Frontend smoke testy, ingest fetchery, transform logika, signal výpočty. |
| 🤖 **Automatický ingest** | GitHub Actions cron 06:00 UTC → fetch ÚZIS/ČSÚ/OECD/Eurostat/SÚKL → transform → commit → Vercel rebuild. |

### Stránky webu

| URL | Účel |
|---|---|
| `index.html` | Homepage — hub matrix, dimenze, finance, podcast, denní ticker |
| `clanky.html` | Hub všech článků (matrix podle area + topic, filtry) |
| `clanek-*.html` | 65 dlouhých článků (jeden HTML soubor = jeden článek) |
| `hspa-prehled.html` | HSPA rámec — 4 oblasti × 12 domén × indikátory |
| `tematicke-linie.html` | 8 tematických linií (každá agreguje články + indikátory) |
| `kraje.html` | Mapa krajů + krajský dashboard |
| `pojistenci.html` | OIS 11-47 (pojištěnci ZP × kraj × okres) |
| `prevence.html` | Vakcinace + screeningy |
| `strategie.html` | Národní strategické dokumenty + jejich analýza |
| `glosar.html` | Glosář 110 odborných pojmů |
| `o-projektu.html`, `jak-funguje.html`, `redakce.html` | Meta-stránky o projektu |
| `indicator.html?id=…` | Detail jednoho indikátoru |

Detailní popis každé stránky + JS moduly viz [`docs/site-architecture.md`](docs/site-architecture.md).

## Rychlý start (vývoj)

```bash
cd 05_M1_Starter
npm install
npm test          # ~260 testů musí projít
npm run serve     # http://localhost:8080
```

## Architektura ve zkratce

```
GitHub Actions cron (06:00 UTC)
  ↓ npm run ingest
ingest/fetchers/* (ÚZIS, ČSÚ, OECD, Eurostat, SÚKL)
  ↓ npm run transform
data/indicators.json + data/snapshot-YYYY-MM-DD.json
  ↓ git commit + push
Vercel auto-deploy → CDN → uživatel
```

Frontend je čistý ES Modules + vanilla DOM (žádný build krok, žádný framework).
Data fetchuje výhradně z `data/*.json` — nezná původní zdroje.

Plný popis viz [`05_M1_Starter/CLAUDE.md`](CLAUDE.md) (pro AI agenty i lidi).

## Podkladové materiály v repozitáři

| Adresář | Obsah |
|---|---|
| `01_Prototyp_Dashboard/` | Původní statický prototyp (zastaralý, jen pro historickou referenci) |
| `02_Strategicky_dokument/` | 15stránkový strategický plán DOCX (vize, governance, rozpočet) |
| `03_Prezentace/` | 16slidová stakeholder prezentace PPTX |
| `04_Plan_napojeni_na_API/` | Plány milníků M1–M11 + Vercel deploy plán |
| `05_M1_Starter/` | **Aktivní produkční kód** — vše vyvíjené tady |
| `06_…`, `07_…`, `08_…` | Plán redesignu, plán prevence, politický program |
| `docs/` | Vývojářská dokumentace (site-architecture, visual-components, data-model) |
| `AUDIT_*.md`, `STATUS_*.md`, `VISUAL_INVENTORY_*.md` | Auditní záznamy a inventáře (k datu) |
| `BACKLOG.md`, `planUXDesign.md`, `PROMPT_DAILY_ROUTINE.md` | Aktivní pracovní dokumenty |

## Hlavní zdroje dat

- **OECD HSPA Rámec pro ČR (2023)** — 122 indikátorů, struktura 4 × 12 × 28
- **NZIS (ÚZIS)** — 26 zdravotních registrů, NRPZS pro lidské zdroje
- **ČSÚ DataStat** — demografie, naděje dožití, populace
- **OECD Health at a Glance / SDMX** — mezinárodní benchmarky
- **Eurostat** — EU benchmarky (life expectancy, mortality, SHA)
- **SÚKL** — léčiva, výpadky léčiv
- **NRC** — indikátory kvality (nosokomiální infekce, mortalita po AMI/CMP)

## Licence a kontakt

Data jsou agregovaná, veřejně dostupná (žádné PII).
Více v [`o-projektu.html`](05_M1_Starter/o-projektu.html) a [`redakce.html`](05_M1_Starter/redakce.html).

---
*Verze 2.0 · produkce · květen 2026*
