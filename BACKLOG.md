# HSPA Monitor — Backlog

> **Aktualizováno: 2026-05-31** na základě úplného auditu historických plánů vs. reálný stav kódu.
> Formát: každá otevřená položka má **stav, příčinu, konkrétní plán a blocker**, aby byla rovnou proveditelná.

## Legenda
- **P0** kritické (blokuje hodnotu/důvěryhodnost) · **P1** důležité · **P2** vylepšení · **P3** vize
- Stav: ✅ hotovo · 🟡 částečně · ❌ chybí · ⛔ blokováno (creds/síť/editorial)

---

## ✅ Vyřešeno v tomto auditním PR (2026-05-31)

| Co | Detail |
|---|---|
| **Rozbitý detail indikátoru** | `src/indicator.js` měl syntaktickou chybu (`review-pending:` bez uvozovek) → modul se nenaparsoval → `indicator.html?id=…` byl v produkci nefunkční. Opraveno. |
| **Červený publikační gate** | `clanek-rezistence-antibiotik.html` měl viditelný redakční banner „Status: review-pending" → `validate:all` failoval. Banner odstraněn (obsah zůstává). |
| **Verifikační odznak indikátorů** | `transform.js` nepřenášel `verification_status` z metodické karty → odznak v UI byl mrtvý. Doplněn pass-through (14 indikátorů). |
| **Footer 404 „Metodické karty"** | Odkaz mířil na adresář `indicators/` (bez indexu). Přesměrováno na `hspa-prehled.html`. |
| **Noční údržbová rutina** | Přidán `scripts/nightly-scan.js` + `PROMPT_NIGHTLY_ROUTINE.md` (sweep korpusu). |
| **Verifikační odznak indikátorů (INDIKO-VERIFY)** | Jednotný helper `resolveVerificationStatus`/`verifBadgeHtml` v `page-shared.js`; odznak se zobrazí na všech indikátorech (odvození z `origin`), sjednoceny 3 rozcházející se logiky v `indicator.js`+`app.js`. Bez změny dat. 6 testů. |

---

## 🔴 P0 — kritické otevřené

### DATA-LIVE · Živý ingest reálně neběží
**Stav:** ❌ / ⛔ · **97 z 98 indikátorů má `origin: seed`, jen 1 `live`.**
**Příčina:** 14 fetcherů (`ingest/fetchers/`) i orchestrátor (`run.js`) existují a jsou volané, ale do `ingest/cache/` nedodávají použitelná data → `transform.js` padá na seed fallback. Gate `MIN_LIVE_RATIO` v `.github/workflows/refresh.yml` je nastaven na **`0.0`** (vypnutý), takže cron navzdory tomu nepadá.
**Plán práce:**
1. Přidat do `refresh.yml` (nebo samostatný `scan:ingest`) **per-fetcher smoke log** — kolik observací každý zdroj vrátil, ať je vidět, který selhává.
2. Opravovat fetchery po jednom, začít stabilními JSON API: **ČSÚ DataStat** (`csu.js`) a **OECD SDMX** (`oecd.js`), pak Eurostat JSON-stat. Ověřit mapping `data_source.primary.dataset` v metodických kartách vs. extractory v `transform.js`.
3. Postupně zvedat `MIN_LIVE_RATIO` (0.05 → 0.2 → …) tak, jak roste pokrytí — gate tím začne reálně hlídat regresi.
**Blocker:** vyžaduje síťový egress na ÚZIS/ČSÚ/OECD/Eurostat (network policy prostředí) + ladění endpointů. *V sandboxu bez sítě nelze dokončit — nutné v CI nebo s povolenou sítí.*

---

## 🟠 P1 — důležité otevřené

### ~~INDIKO-VERIFY-DATA · Verifikační odznak indikátorů~~ ✅ HOTOVO (2026-06-01)
**Vyřešeno:** odznak se odvozuje z `origin` přímo ve frontendu (sdílený helper
`resolveVerificationStatus` v `page-shared.js`): `seed` → ilustrativní, `live` →
předběžné, explicitní `verified` → ověřeno. Zobrazí se na všech indikátorech;
sjednoceny dříve rozcházející se logiky v `indicator.js` a `app.js`. Bez změny dat.
**Navazuje:** až poběží DATA-LIVE, živé+ověřené hodnoty dostanou explicitní
`verified` v metodické kartě (helper ho upřednostní před odvozením z origin).

### EXPLAINER-VERIFY · Doověřit 20 z 31 explainerů
**Stav:** 🟡 / ⛔ · 31 explainerů má `documents`, ale jen **11 `verification_status: ok`**, 20× `needs_verification`.
**Plán:** projít 20 explainerů, ověřit klíčová tvrzení proti primárním zdrojům (per železné pravidlo denní rutiny), přepnout na `ok`. **Blocker:** editorial + web access.

### DUSEK-CONTENT · Obsah z Duškova briefu
**Stav:** ❌ / ⛔ · z `CLAUDE_BRIEF_HSPA_DUSEK_2026-05-14`:
- **6 odborných článků** (dohodovací řízení, CZ-DRG, intenzivní/následná péče, interna, predikce, care complexity).
- **8 nových klinických indikátorů** (obložnost IP, přežití na UPV…) — metodické karty už existují s `review-pending`, chybí datový sourcing a hodnoty.
**Plán:** zpracovat přes denní rutinu (1 článek/den), indikátory napojit na PUK/ÚZIS data. **Blocker:** editorial + datový sourcing.

### CLINICAL-V2 · Kvalita péče — V2 UX
**Stav:** 🟡 · jádro (PUK+INDIKO, `kvalita-pece.html`, 35 indikátorů) hotové; chybí V2 z `PLAN-KVALITA-PECE-V2`:
- story hook (postavy), 2-sloupcový grid, animované čítače (`av-counter` při scrollu), fix unicode word-boundary v klinickém glosáři.
**Plán:** aplikovat existující `av-counter` animaci, 2-sloupcové CSS, napsat úvodní příběh; ověřit a opravit regex glosáře reprodukcí selhání.

---

## 🟡 P2 — vylepšení

| ID | Položka | Stav | Plán / blocker |
|---|---|---|---|
| GA4-BACKEND | Sběr GA4 statistik | 🟡/⛔ | Frontend eventy (Level 1) + `ga4-stats.yml` hotové, ale žádná `data/ga4-stats.json`. Plán: nastavit GA4 service-account secret, zapnout výstup workflow, zobrazit v `site-stats.js`. **Blocker: credentials.** |
| STRAT-STORY | Storytelling vrstva strategií (4-vrstvý flow Národní·Sektorové·EU·Standardy) | 🟡 / 👁️ | `strategie.html` existuje; doplnit flow diagram. **Blocker: vizuální verifikace** (net-new UI). |
| IND-STORY | Mini-příběh komponenta u indikátorů | 🟡 / 👁️ | Články příběhy mají, indikátory ne. **Blocker: vizuální verifikace.** |
| PREV-PERSONA | Personalizace prevence (životní fáze: mladá rodina / 40+ / 65+) | 🟡 / 👁️ | `prevence.html` existuje; přidat filtr. **Blocker: vizuální verifikace.** |
| NARRATIVE-TPL | 4-krokový narrative jako šablona na všechny analytické sekce | 🟡 / 👁️ | Existuje v hero (`.ed-narrative`), zobecnit. **Blocker: vizuální verifikace.** |
| SVG-PAKY | Interaktivní SVG schéma „pák" (klikací sloup-střecha-páky) | ❌ / 👁️ | Net-new vizualizace. **Blocker: vizuální verifikace.** |
| DARK-MODE | Tmavý režim | 🟡 / 👁️ | Web je důsledně na CSS proměnných (602× `--ink`…), ALE **~190 hardcoded hex + 59 rgba v CSS + 25 inline barev v HTML** by v dark režimu „prosvítilo". Pořádné řešení = projít stovky míst + **vizuální verifikace v prohlížeči** (v sandboxu není headless browser). Nedělat naslepo. |

> **👁️ Blocker „vizuální verifikace":** tyto položky jsou net-new UI/UX, jejichž kvalitu nelze potvrdit bez běžícího prohlížeče (sandbox nemá headless Chrome/Playwright). Dělat je naslepo by riskovalo rozbití layoutu — vědomě odloženo, dokud nebude k dispozici prohlížeč nebo lidská vizuální kontrola na Vercel preview.

## 🔵 P3 — vize
- **PROMs/PREMs roadmap** — sběr pacientských outcomes (zmíněno jako gap na `hspa-prehled.html`).
- Rozšíření datových zdrojů (SHARE, EHIS vlny) jak přibývají.

---

## 🚫 Záměrně odstraněno — NEVRACET (viz `docs/decisions-log.md`)
- **Persona/audience switcher UI** (PR #402/#405) — „nemělo měřitelnou funkci". `tldr_expert`/`tldr_policy` zůstávají v datech jako podklad; UI přepínač se nevrací bez měřitelného plánu.
- **Score widget v hlavičce** (masthead-score, PR #402) — ozdobný, smazán ze všech HTML.

---

## ✅ Hotové (historie — neřešit)
M1–M11 (datový kontrakt, frontend, fetchery, transform, ingest cron, validace, freshness gate, Vercel+CSP, snapshoty). 
Dále dokončeno a ověřeno auditem: tematické linie (5), inline glosář (auto-wrap, 188 termínů), newsletter (MailerLite), social/distribuce pipeline, accountability strategií (34/34), manifest reformy + 9 substránek, prevence (9 karet se zdroji), krajský dashboard + pojištěnci, finance dashboard (sankey/donut), dohodovací řízení, klinická kvalita PUK+INDIKO (jádro), homepage redesign, JSON-LD (`schema.js`), visual-a11y workflow, publikační fronta + auto-generování coverů, série „Digitální zdravotnictví".
