# Samostatná doména pro pohotovosti — druhý výstup repa

**Stav (12. 9. 2026): build a shell hotové v repu, čeká na kroky mimo repo (doména, Vercel, Plausible).**

## Rozhodnutí

Vyhledávání pohotovostí („Kde je nejbližší pohotovost, která má otevřeno“ + 75 okresních stránek) se vyvádí
na vlastní doménu jako **druhý výstup téhož repa**, ne jako oddělený projekt. Důvody (rozbor 7. 9. 2026):

- Uživatel pohotovostí je ve stresu, na mobilu, často v noci; přichází z Googlu na dotaz „pohotovost Klatovy“ a
  HSPA ho nezajímá. Na HSPA Monitoru dostával celý shell dashboardu: navigaci, masthead, newsletter a popupy
  („Týdny zdraví“, vedra). Newsletter popup u člověka, který hledá dětskou pohotovost ve tři ráno, je škodlivý.
- Nástroj přitom vznikl z analýzy reformy 290/2025 a jeho zjištění (registr pohotovostí s provozní dobou neexistuje,
  kraje mají otevřená data jen ze čtvrtiny, dojezdová bílá místa) jsou HSPA obsah — ten na HSPA Monitoru zůstává.
- Neutrální servisní značka se dá nabídnout krajům, záchrankám a NZIP k odkazování; PWA s offline režimem se
  s vlastní ikonou a jménem chová jako aplikace.

**Dělba:** nová doména = vyhledávání, „Co dělat teď“, rozcestník „Kam s tím?“, poradní linky ZZS, EN/UK, okresní
stránky, offline režim, hlášení změn. HSPA Monitor = dojezdová analýza, pokrytí po krajích, plnění zákonného
minima, kontext reformy (indikátory + článek) a odkaz „najít pohotovost“ na novou doménu.

## Doména

Podle rešerše v registru CZ.NIC (7. 9. 2026) jsou `pohotovosti.cz` (MITON, od 2010) i `pohotovost.cz` obsazené.
Volné kandidáty: **kdejepohotovost.cz** (doslova to, co lidé píší do Googlu — výchozí v konfiguraci),
najdipohotovost.cz, otevrenapohotovost.cz, nejblizsipohotovost.cz, mapapohotovosti.cz. Vyhnout se všemu, co
evokuje oficiální službu (155, ZZS, „státní“).

Doména je jediná hodnota, kterou je při změně nutné přepsat: `data/pohotovosti-site.json` → `host` + `url`.

## Co je v repu

| Soubor | Role |
|---|---|
| `data/pohotovosti-site.json` | doména, název, popis, odkazy zpět na HSPA, volitelná doména Plausible |
| `scripts/build-pohotovosti-site.js` (`npm run build:pohotovosti-site`) | vyrobí `dist-pohotovosti/` (gitignored): `index.html` z `pohotovosti.html`, `<okres>.html` z `pohotovost-<okres>.html`, podmnožina `src/`, data pohotovostí, service worker, manifest, sitemap, robots, 404, `vercel.json` |
| `src/pohotovosti-shell.js` | odlehčený shell — v distu nahrazuje `src/page-shared.js` (stejné exporty: bez navigace, mastheadu, newsletteru a popupů; patička s provozovatelem; „Souvislosti“ vedou absolutně na HSPA) |
| `src/pohotovosti.js`, `src/pohotovost-okres.js` | registrace SW: v samostatném režimu (`window.POH_SITE.standalone`) scope `/` |
| `tests/pohotovosti-site.test.js` | build do temp adresáře: shell bez navigace/newsletteru, canonical na vlastní doméně, absolutní odkazy na HSPA, SW cesty, sitemap/manifest/vercel.json, pokrytí exportů shellu |

Odkazy v obsahu se při buildu přepisují: `pohotovosti.html` → `/`, `pohotovost-<okres>.html` → `/<okres>`,
ostatní stránky HSPA Monitoru → `https://skorezdravotnictvi.cz/<stránka>` (absolutně), `src/`, `assets/`, `data/` → od kořene.
Datový pipeline (ingest, transform, drift-check, `build:pohotovosti-okresy`) zůstává jeden; samostatný web se
z něj jen sestavuje. **Přebuild = každý deploy** (Vercel spouští build command), takže web má vždy data z mainu.

## Kroky mimo repo (redakce)

1. **Doména**: koupit u registrátora (výchozí `kdejepohotovost.cz`; jiná → přepsat `host`/`url` v `data/pohotovosti-site.json`).
2. **Vercel — nový projekt** nad týmž GitHub repem:
   - Root Directory `05_M1_Starter`, Framework Preset *Other*
   - Build Command `npm run build:pohotovosti-site`
   - Output Directory `dist-pohotovosti`
   - Production Branch `main`; Ignored Build Step lze nechat výchozí (build je levný)
   - Domains: přidat doménu, nastavit DNS podle pokynu Vercelu (A/CNAME)
3. **Plausible** (volitelné): založit web pro novou doménu a název domény zapsat do
   `data/pohotovosti-site.json` → `analytics.plausible_domain`; build pak přidá Plausible skript i CSP výjimku.
4. **Přepnutí HSPA Monitoru** (až doména odpovídá, samostatný PR):
   - do `05_M1_Starter/vercel.json` přidat 301 přesměrování (JSON níže),
   - v `src/page-shared.js` → `SITE_TOOLS` položka `pohotovosti` odkazuje na `https://kdejepohotovost.cz/`,
   - v `scripts/generate-sitemap.js` vynechat `/pohotovosti.html` a `pohotovost-*.html` z hlavní sitemap,
   - v `sw-pohotovosti.js` hlavního webu nic — po přesměrování ho prohlížeč odregistruje sám (scope už nemá stránky),
   - do článku/indikátoru o pohotovostech doplnit odkaz „najít pohotovost“ na novou doménu.

```json
"redirects": [
  { "source": "/pohotovosti", "destination": "https://kdejepohotovost.cz/", "permanent": true },
  { "source": "/pohotovosti.html", "destination": "https://kdejepohotovost.cz/", "permanent": true },
  { "source": "/pohotovost-:okres", "destination": "https://kdejepohotovost.cz/:okres", "permanent": true },
  { "source": "/pohotovost-:okres.html", "destination": "https://kdejepohotovost.cz/:okres", "permanent": true }
]
```

Stránky jsou několik týdnů staré, SEO reset je zanedbatelný; 301 zachová, co Google stihl zaindexovat.

## Co ještě zbývá (follow-up)

- **Ořezaný CSS.** Dist zatím nese celý `styles.min.css` (~470 kB, po kompresi ~70 kB). Bezpečný ořez vyžaduje
  seznam tříd generovaných v JS (`poh-*`, `av-*`, `ed-*`, `tool-sibling-*`, `empty-state*`) a vizuální kontrolu;
  udělat až s Playwright screenshoty obou stránek na mobilu.
- **Vložitelný widget** „nejbližší pohotovost“ pro weby obcí a nemocnic (iframe/`<script>` na `/embed`).
- **Vlastní ikona PWA** (dnes kompas HSPA) a OG obrázek s názvem webu.
- **Nabídka odkazu** krajům, ZZS a NZIP až po přepnutí domény.
