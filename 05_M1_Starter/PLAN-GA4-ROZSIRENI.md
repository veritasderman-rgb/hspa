# Plán: Rozšíření Google Analytics 4 měření na HSPA Monitoru

**Stav:** ready for review.
**Datum:** 2026-05-29.
**Branch:** `claude/plan-ga4-rozsireni`.
**Cíl:** ze základního page_view trackingu posunout HSPA Monitor k bohatému přehledu, jaký obsah a jaké interakce na portálu skutečně fungují.

---

## 0) Současný stav

**`src/analytics.js`** dnes injectuje:

1. **Vercel Web Analytics** (`/_vercel/insights/script.js`) — bezcookieové měření, page views, basic geo
2. **Google Analytics 4** (`G-DVH1RPVTM4`) s Consent Mode v2:
   - `ad_storage`, `ad_user_data`, `ad_personalization` = denied (žádný remarketing)
   - `analytics_storage` = granted (od PR #415)
   - `anonymize_ip: true`

**Žádné custom eventy se neposílají.** Veškerý insight je z toho, co GA4 měří automaticky:
- page_view, user_engagement, scroll (90 %), session_start, first_visit
- Optional Enhanced measurement v GA Admin (toggleable bez kódu): outbound clicks, site search, file downloads, video engagement

→ Víme **kolik lidí přijde a kam**, ale **nevíme, co dělají uvnitř stránky**.

---

## 1) Tři úrovně rozšíření

### Úroveň 1 — Custom eventy core ✓ (1 PR, ~1–2 hodiny)

**Cíl:** Vědět, co na stránce skutečně klikají.

**Zapnout v GA Admin (bez kódu):**
- Enhanced measurement → vše ON (scroll depth, outbound clicks, site search, file downloads, video)
  - Outbound clicks pokryjí PUK, ÚZIS, OECD, Eurostat odkazy
  - Site search pokryje fulltext na portálu (`?q=`)

**Implementovat custom eventy (`src/analytics.js` rozšíření):**

| Event | Selector / trigger | Parametry | Frekvence |
|---|---|---|---|
| `indicator_click` | `.hub-cell[data-indicator-id]`, `.related-card[href*="indicator.html"]` | `indicator_id`, `domain`, `signal`, `source_page` | high |
| `glossary_term_open` | `.cq-gloss-term[data-term]`, `.glossary-abbr` | `term`, `source_page` | medium |
| `patient_story_expand` | `.cq-catalog-item details[open]` toggle | `indicator_id`, `section` | medium |
| `external_source_click` | `<a target="_blank" rel="noopener">` na puk/uzis/oecd domény | `source`, `host`, `from_page` | high |

**Implementační vzor:**

```js
// src/analytics.js – přidat na konec souboru
function trackEvent(name, params = {}) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);
}

function bindClickEvents() {
  if (typeof document === 'undefined') return;
  // Indicator card clicks (delegovaně)
  document.addEventListener('click', (e) => {
    // Indicator click
    const ind = e.target.closest('[data-indicator-id], a[href*="indicator.html?id="]');
    if (ind) {
      const id = ind.dataset.indicatorId
        ?? new URL(ind.href, location.origin).searchParams.get('id');
      if (id) trackEvent('indicator_click', {
        indicator_id: id,
        source_page: location.pathname,
        domain: ind.dataset.indicatorDomain ?? null,
      });
      return;
    }
    // External source click (PUK, UZIS, OECD, atd.)
    const link = e.target.closest('a[target="_blank"][href^="http"]');
    if (link) {
      try {
        const url = new URL(link.href);
        const externalHosts = ['puk.kancelarzp.cz', 'indiko.cz', 'uzis.cz', 'oecd.org',
                               'eurostat.ec.europa.eu', 'sukl.cz', 'szu.cz'];
        const matched = externalHosts.find(h => url.hostname.includes(h));
        if (matched) trackEvent('external_source_click', {
          source: matched.split('.')[0],
          host: url.hostname,
          from_page: location.pathname,
        });
      } catch { /* ignore */ }
    }
    // Glossary term open (cq-gloss-term button)
    const term = e.target.closest('.cq-gloss-term[data-term]');
    if (term) trackEvent('glossary_term_open', {
      term: term.dataset.term,
      source_page: location.pathname,
    });
  });

  // Patient story details/summary toggle
  document.addEventListener('toggle', (e) => {
    const det = e.target.closest('.cq-catalog-item');
    if (det && det.open) trackEvent('patient_story_expand', {
      indicator_id: det.querySelector('.cq-catalog-name')?.textContent?.trim() ?? 'unknown',
      section: det.closest('.cq-catalog-section')?.querySelector('.cq-catalog-section-h')?.textContent?.trim() ?? null,
    });
  }, true);
}

if (!isLocal) {
  // ... existing GA4 init ...
  bindClickEvents();
}
```

**Co se v GA4 reportu objeví:**
- Reports → Engagement → Events: 4 nové custom eventy
- Reports → Engagement → Event: indicator_click → top indicator_id
- Explore → Custom report: glossary_term_open seřazený podle počtu klíčení
- Po 24 hodinách: které termíny lidé klíčejí nejvíc → kandidáti na lepší vysvětlení v textu

**Soubory ke změně:**
- `src/analytics.js` (+ ~80 řádků)
- Žádné HTML změny (delegated event listenery na document)

**Test plan:**
- [ ] Lokální: otevřít DevTools → Network → filter `collect?` → kliknout indikátor → vidět event
- [ ] GA4 DebugView v reálném čase (vyžaduje `?gtm_debug=x` query param nebo Chrome extension)

---

### Úroveň 2 — Engagement & funnel (1 PR, ~3 hodiny)

**Cíl:** Vědět, **které sekce drží pozornost** a **které lidi „proscrollují"**.

**Co přidat na top of Úroveň 1:**

| Event | Trigger | Parametry |
|---|---|---|
| `section_visible` | IntersectionObserver 50 % v viewportu po 1+ s | `section_id`, `section_title`, `pos_in_page` |
| `scroll_depth` | 25 %, 50 %, 75 %, 100 % | `depth_pct`, `time_to_reach_ms` |
| `article_read` | scroll > 80 % AND dwell > 30 s | `article_slug`, `audit_status`, `topics` |
| `share_click` | klik na share tlačítko / copy URL | `channel` (twitter/linkedin/facebook/email/copy), `url` |
| `nav_dropdown_open` | hover/focus na submenu (Indikátory ▼, Financování ▼) | `parent_id` |
| `audio_play` | `<audio>` nebo podcast iframe interakce | `podcast_id` |

**IntersectionObserver helper:**

```js
function trackSectionVisibility() {
  if (typeof IntersectionObserver === 'undefined') return;
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const id = el.id || el.getAttribute('aria-labelledby') || el.dataset.sectionId;
      if (!id || seen.has(id)) return;
      seen.add(id);
      trackEvent('section_visible', {
        section_id: id,
        section_title: el.querySelector('h2, h3, h4')?.textContent?.trim().slice(0, 80),
        pos_in_page: Math.round(el.getBoundingClientRect().top + window.scrollY),
      });
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('section[id], section[aria-labelledby], .hspa-dims-section').forEach(s => io.observe(s));
}
```

**Co se v GA4 reportu objeví:**
- Explore → Funnel: page_view → section_visible (§ I) → section_visible (§ II) → ... → article_read
  → Vidíte, kde čtenáři odpadávají (např. po § I většina pryč → § II je špatný hook)
- Reports → Event: scroll_depth → top depth_pct → poznáte „bouncing point" stránky
- Reports → article_read filtrovaný podle `topics` (financování, AMR, onkologie) → co se reálně čte
- Audience segments: „čtenáři" (article_read ≥ 5) vs „skimmeri" (scroll_depth max 25 %)

**Soubory ke změně:**
- `src/analytics.js` (+ ~150 řádků)
- Některé HTML stránky doplnit `id=` nebo `data-section-id=` na sekcích, pokud chybí

**Test plan:**
- [ ] Lokální: scroll-test → vidět 25/50/75/100 events v DevTools
- [ ] GA4 DebugView: section_visible eventy v real-time

---

### Úroveň 3 — Public mini-dashboard z GA4 API (1 PR, ~1 den)

**Cíl:** Otevřená meta-transparentnost — **portál ukazuje, jak je sám čten**.

**Architektura:**

```
GitHub Actions cron (06:00 UTC denně)
    ↓
script: scripts/fetch-ga4-stats.js
    ├─ čte GA4 Data API (Google Analytics Data API v1beta)
    ├─ vyžaduje GA_SERVICE_ACCOUNT_KEY (JSON) jako GH Secret
    └─ vrací top eventy posledních 7/30 dnů
    ↓
zapíše data/analytics-public.json (gitignored ze ZAPNOUT? viz níže)
    ↓
nová stránka: o-projektu.html → nová sekce „Statistiky portálu"
    nebo: /statistiky.html (samostatná)
    ↓
src/analytics-public.js renderuje:
    ├─ Top 10 indikátorů týdne (z indicator_click)
    ├─ Top 10 článků týdne (z page_view filter na clanek-*)
    ├─ Co lidé hledají v glosáři (z glossary_term_open)
    ├─ Odkud přicházejí (z `source / medium`)
    ├─ Top sdílené články (ze share_click)
    └─ Trend návštěvnosti za 30 dnů (line chart)
```

**Nový NPM script v `package.json`:**

```json
"fetch:ga4": "node scripts/fetch-ga4-stats.js",
"ga4:setup": "node scripts/ga4-setup-instructions.js"
```

**Nový GitHub Action workflow `.github/workflows/ga4-stats.yml`:**

```yaml
name: GA4 stats refresh
on:
  schedule:
    - cron: '15 6 * * *'  # 06:15 UTC daily
  workflow_dispatch:
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: cd 05_M1_Starter && npm ci
      - name: Fetch GA4 stats
        env:
          GA_SERVICE_ACCOUNT_KEY: ${{ secrets.GA_SERVICE_ACCOUNT_KEY }}
          GA_PROPERTY_ID: ${{ secrets.GA_PROPERTY_ID }}
        run: cd 05_M1_Starter && node scripts/fetch-ga4-stats.js
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'data: GA4 stats refresh'
          file_pattern: '05_M1_Starter/data/analytics-public.json'
```

**Dependency:** `@google-analytics/data` (oficiální Google client)

```bash
npm install --save @google-analytics/data
```

**Setup kroky (jednorázové, dokumentace v `scripts/ga4-setup-instructions.js`):**

1. V Google Cloud Console → vytvořit Service Account
2. Stáhnout JSON klíč → uložit do GH Secret `GA_SERVICE_ACCOUNT_KEY`
3. V GA Admin → Account Access Management → přidat service-account e-mail jako Viewer
4. Property ID najít v GA Admin → Property Settings → uložit do GH Secret `GA_PROPERTY_ID`

**Co publikujeme veřejně:**

`data/analytics-public.json` — agregované statistiky, **žádné osobní údaje**:

```json
{
  "version": "1.0",
  "generated_at": "2026-05-29T06:15:00Z",
  "period": { "from": "2026-05-22", "to": "2026-05-29" },
  "top_indicators": [
    { "id": "mortalita_inhosp_ami", "clicks": 1247, "name": "AMI mortalita" },
    { "id": "nadeje_doziti_total", "clicks": 982, "name": "Naděje dožití" }
  ],
  "top_articles": [
    { "slug": "clanek-deficit-vzp-2026", "views": 3210, "avg_engagement_s": 184 }
  ],
  "top_glossary_terms": [
    { "term": "MDT", "opens": 412 },
    { "term": "trombektomie", "opens": 287 }
  ],
  "traffic_sources": [
    { "source": "google", "users": 4523 },
    { "source": "twitter", "users": 821 },
    { "source": "(direct)", "users": 612 }
  ],
  "share_breakdown": [
    { "channel": "linkedin", "count": 234 },
    { "channel": "twitter", "count": 198 }
  ],
  "traffic_trend_30d": [
    { "date": "2026-04-30", "users": 1234 },
    ...
  ]
}
```

**Nová stránka / sekce (volba):**

**Možnost A:** Nová sekce v `o-projektu.html` „Co lidé na portálu čtou" (jednodušší, vidí ji každý, kdo přijde na O projektu).

**Možnost B:** Samostatná stránka `/statistiky.html` v patičce + nav (transparentnost-první, ale jen málokdo navštíví).

**Doporučení: Možnost A** — nasazení rychlejší, statistiky se přirozeně objevují v rámci „Kdo, co a proč" o projektu.

**Co lidem ukáže:**
- „Tento týden lidé nejvíc klíčeli na 30denní AMI mortalitu — 1 247× klik" → potvrzení, že akutní kardio je téma
- „Nejhledanější odborný pojem: MDT (412×)" → kandidát na rozšíření inline vysvětlení
- „65 % návštěvníků přichází z Googlu" → SEO funguje
- „Top sdílení: LinkedIn 234, Twitter 198, Facebook 89"

**Soubory ke změně:**
- Nový `scripts/fetch-ga4-stats.js` (~120 řádků)
- Nový `.github/workflows/ga4-stats.yml`
- Nový `src/analytics-public.js` renderer (~80 řádků)
- Úpravy `o-projektu.html` (přidat sekci) + CSS (~50 řádků)
- `package.json` — `@google-analytics/data` dep + scripts
- Nový `data/analytics-public.json` (auto-generovaný, commit do repa) — **NE gitignored**, jinak by nebyla viditelná na produkci

**Test plan:**
- [ ] Lokální: `GA_SERVICE_ACCOUNT_KEY=$(cat key.json) GA_PROPERTY_ID=12345 npm run fetch:ga4` → vidět JSON v data/
- [ ] Lokálně otevřít `o-projektu.html` → vidět vykreslenou sekci s daty
- [ ] CI: pull GH Action → GA4 stats refresh proběhne → commit změny

---

## 2) Časový a effortový odhad

| Úroveň | Soubory | LOC | Čas | PR |
|---|---|---|---|---|
| 1 — Custom eventy core | 1 | ~80 | 1–2 h | 1 |
| 2 — Engagement & funnel | 1–3 | ~150 | 3 h | 1 |
| 3 — Public mini-dashboard | 5+ | ~250 | ~1 den | 1 |
| **Celkem** | | **~480** | **~1,5 dne** | **3** |

---

## 3) Rizika a mitigace

| Riziko | Dopad | Mitigace |
|---|---|---|
| GA4 zahltí debug stream při high-volume eventech | latence/quota | Throttle scroll_depth + section_visible (jen unique per session) |
| Privacy concern u glossary_term_open (co lidé nerozumí) | reputační | Aggregated only, žádný user_id v ekonomice |
| Service Account key se objeví v repu | bezpečnostní | Pouze GH Secret, nikdy v kódu; gitignore `*.json` v rootu |
| GA4 změní API | scraper selže | Pin verzi `@google-analytics/data`, sledovat changelog |
| Cookieless režim porušíme (analytics_storage = granted) | GDPR | Sledovat consent change; pokud user změní v cookie banneru, GA respektuje |

---

## 4) GDPR a transparentnost

Současný setup je vhodně nastavený:
- `analytics_storage = granted` (legitimní zájem analytiky pro veřejný portál bez ads)
- `ad_*` všechno denied (žádný remarketing)
- IP anonymized
- Žádné PII v custom event parametrech

**Doplnit při Úrovni 1+:**
- `o-projektu.html` → sekce „Soukromí a data" s vysvětlením co měříme a proč
- Link v patičce „Soukromí" → krátký FAQ
- Žádný cookie banner není nutný (cookieless měření přes ConsentMode)

---

## 5) Schvalovací bod

Tento plán čeká na schválení uživatelem. Otázky před implementací:

1. **Pořadí:** Implementujeme postupně (1 → 2 → 3) nebo skočit rovnou na Úroveň 3?
2. **Mini-dashboard umístění:** Sekce v `o-projektu.html` nebo samostatná `/statistiky.html`?
3. **GA Property ID + Service Account:** Můžeme dostat do GH Secrets, nebo to nejdřív nastavit ručně?
4. **Privacy disclosure:** Chceš zároveň dodat sekci „Co měříme a proč" do o-projektu.html?

Po `OK` přejdu k implementaci Úrovně 1 jako prvního PR.

---

*Generated by Claude Code.*
