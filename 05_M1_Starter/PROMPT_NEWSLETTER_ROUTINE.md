# PROMPT — Týdenní newsletter (čtvrtek → odeslání pátek 11:00)

Rutina pro AI agenta (Claude session s Brevo přístupem). Spouští se **každý
čtvrtek**; výstupem je kampaň v Brevu **naplánovaná na nejbližší pátek 11:00**
(Europe/Prague) na všechny aktuální odběratele, plus aktualizovaná evidence
`data/newsletter-log.json` v repu. Mezi čtvrtkem a pátkem 11:00 je záměrné
okno na lidskou kontrolu — kampaň lze v Brevu zrušit nebo upravit.

> **Automatizace:** rutina běží i bez ruční session — GitHub Actions
> `.github/workflows/newsletter-weekly.yml` (čtvrtek 07:33 UTC) spouští
> `node scripts/newsletter-run.js`, což je tento runbook jako kód (výběr,
> Florence přes API, builder, Brevo, log). Ruční spuštění: workflow_dispatch
> v GitHubu, lokální test `node scripts/newsletter-run.js --offline`
> (bez API) nebo `--dry-run` (bez zápisu do Breva/logu). Tento dokument
> zůstává referencí pravidel a fallbackem pro interaktivní běh.

---

## Vstupy a nástroje

| Co | Kde |
|---|---|
| Publikované články | `data/articles.json` (`published: true`, `date` ≤ dnes) |
| Indikátory | `data/indicators.json` |
| Evidence odeslaného | `data/newsletter-log.json` — **jediný zdroj pravdy**, co už v newsletteru bylo |
| Šablona / builder | `node scripts/newsletter-build.js spec.json > newsletter.html` |
| Brevo | MCP tools (`mcp__Brevo__*`), fallback přímé API s klíčem `BREVO_API_KEY` (viz env Vercelu / správce). Cílový list id **2** (všichni odběratelé), odesílatel **HSPA Monitor · Skóre zdravotnictví `<josef@josefpavlovic.cz>`** |
| Styl | `docs/social-copywriting-manual.md` (hlavní věc do 1. věty, věcně ale poutavě, žádné vykřičníky) + persona Florence (`autor-florence.html`) |

## Krok 0 — Prerekvizity

1. Čerstvý main: `git checkout main && git pull origin main`, branch
   `claude/newsletter-YYYY-MM-DD`, a **přejdi do `05_M1_Starter/`**
   (`cd 05_M1_Starter`) — všechny cesty níže (`data/…`, `scripts/…`)
   jsou relativní k tomuto adresáři.
2. Ověř Brevo přístup (MCP `get_account`, nebo `curl -H "api-key: …" https://api.brevo.com/v3/account`).
3. Spočítej datum **nejbližšího pátku** a `scheduledAt = YYYY-MM-DDT11:00:00+02:00` (v zimě `+01:00` — použij aktuální offset Europe/Prague!).

## Krok A — Výběr obsahu

1. Načti `data/articles.json` a `data/newsletter-log.json`. Kandidáti =
   publikované, viditelné (`date` ≤ dnes) a **jejich slug není v žádné
   kampani v logu**.
2. Vyber **3–4 články**: primárně nejnovější podle `date`; je-li nových málo
   nebo se hodí tematicky, přidej **max 1 starší kus „Z archivu"** (starší
   než ~60 dní, nadčasový — série, explainer, prevence). První vybraný =
   hlavní karta (hero).
   - Méně než 2 nové články a žádný vhodný archivní → **vydání přeskoč**,
     napiš to uživateli a skonči (nic neplánuj, log neměň).
3. Vyber **1 indikátor** z `data/indicators.json` pro Florencin úvod —
   přednostně: čerstvě aktualizovaný, se zajímavým signálem, nebo tematicky
   ladí s hlavním článkem. Nepoužívej indikátor, který byl `featured_indicator`
   v posledních ~4 kampaních v logu.

## Krok B — Florencin úvod (a) + anotace

Úvod (`intro` ve specu): **120–180 slov, 2–4 odstavce**, struktura:
1. Pozdrav odběratelům a jedna věta, čím tenhle týden žije portál.
2. Komentář k **hlavnímu článku** — proč stojí za přečtení, jedno konkrétní
   číslo nebo pointa (ne převyprávění).
3. Komentář k **vybranému indikátoru** — hodnota + benchmark + rok lidskou
   řečí („Česko 118 dní, průměr EU 95 — VZP, 2024") a co z toho plyne.
4. Krátké rozloučení.

Anotace článků: 1–3 věty, vlastními slovy (ne kopie perexu), každá karta
končí přirozeně — bez „klikněte zde".

**Hlas Florence:** první osoba, věcně ale s lehkostí (viz „technologický
rohlík" z úvodního vydání — max 1 takový vtip na vydání), žádné vykřičníky,
žádné AI klišé („v dnešní uspěchané době", „pojďme se podívat"), čísla vždy
se zdrojem a rokem.

### Blok mimo redakci (volitelné pole `promo`)

Odkaz mimo portál — vlastní projekt provozovatele, partnerská akce apod. —
**nesmí jít do karty článku**: builder u článků vynucuje doménu
`skorezdravotnictvi.cz` právě proto, aby se komerční odkaz nedal vydávat za
redakční doporučení. Pro takový obsah je pole `promo`, které se renderuje
až za tlačítkem „Všechny články", v přerušovaném inkoustovém rámu místo
červené linky článků.

Pravidla: nejvýše jeden blok na vydání; `kicker` musí obsahovat slovo
„mimo redakci"; text píše redakce v běžném hlase, ale **ne v první osobě
Florence** — ta mluví za portál, ne za inzerci. Tvrzení o cizím webu si
před odesláním ověř (že slibovaný návod tam opravdu je), stejně jako u
každého jiného čísla v newsletteru.

## Krok C — Jazyková kontrola (b)

Projdi celý text (úvod + anotace + subject + preheader) checklist em:

- [ ] České uvozovky „takto", pomlčka – (ne spojovník -), trojtečka …
- [ ] Čísla česky: desetinná čárka, mezera v tisících (10 000), % s mezerou
- [ ] Žádné anglicismy a kalky („v rámci", „adresovat problém", „excited")
- [ ] Konzistentní vykání odběratelům
- [ ] Žádné vykřičníky, žádný marketingový křik („neuvěřitelné", „šokující")
- [ ] Jednotky a zkratky s pevnou mezerou (mld. Kč, tis.)
- [ ] Subject ≤ 65 znaků, hlavní sdělení v první polovině; preheader doplňuje,
      neopakuje subject
- [ ] Přečti nahlas: zní to jako člověk, ne jako překlad?

## Krok D — Sestavení a naplánování (c)

1. Zapiš spec JSON (struktura viz hlavička `scripts/newsletter-build.js`):
   `subject`, `previewText`, `edition_label` („týdenní přehled · D. měsíce RRRR"),
   `intro`, `articles[]` (hero první; archivní kus s `"badge": "Z archivu"`).
2. `node scripts/newsletter-build.js spec.json > newsletter.html`
3. **Vizuální kontrola**: otevři HTML v headless prohlížeči, screenshot,
   zkontroluj zlomy, diakritiku, odkazy (každý musí vést na existující URL —
   ověř `curl -sIL` → 200).
4. Založ kampaň v Brevu:
   - name: `HSPA newsletter — YYYY-MM-DD (pátek)`
   - sender: `{"name":"HSPA Monitor · Skóre zdravotnictví","email":"josef@josefpavlovic.cz"}`
   - replyTo: `josef@josefpavlovic.cz`, recipients: `{"listIds":[2]}`
   - subject + previewText ze specu, htmlContent z builderu
   - **scheduledAt** = pátek 11:00 Europe/Prague (krok 0.3)
   - Free plán nepodporuje `tag` — nepoužívat.
5. Ověř zpětným GET kampaně: status je naplánovaný, `scheduledAt` sedí,
   `recipients.lists = [2]`, HTML obsahuje všechny články.

## Krok E — Evidence (d) + commit

1. Do `data/newsletter-log.json` → `campaigns[]` přidej záznam:
   ```json
   {
     "brevo_campaign_id": <id>,
     "name": "HSPA newsletter — YYYY-MM-DD (pátek)",
     "subject": "…",
     "scheduled_for": "YYYY-MM-DDT11:00:00+02:00",
     "articles": ["clanek-…​.html", "…"],
     "featured_indicator": "<indicator_id>"
   }
   ```
2. Commit (`content(newsletter): vydání YYYY-MM-DD — 4 články + <indikátor>`),
   push, PR podle standardního workflow (nikdy přímo do main).
   **Log se committuje hned po naplánování** — i kdyby se kampaň v Brevu
   ručně zrušila, je lepší článek omylem nepoužít znovu než poslat duplicitně.

## Krok F — Report uživateli

Krátká zpráva: subject, seznam článků (+ který je hero, který z archivu),
vybraný indikátor, čas odeslání, odkaz na kampaň v Brevu a připomínka, že
**do pátku 11:00 lze kampaň v Brevu zrušit či upravit**.

---

## Zásady

- **Nikdy neposílat hned** — vždy `scheduledAt` pátek 11:00; čtvrteční běh
  je záměrně den předem.
- **Duplicita je horší než vynechání** — když si nejsi jistý, jestli článek
  už byl, chovej se, jako by byl.
- Odkazy vždy absolutní `https://skorezdravotnictvi.cz/…`; odhlašovací tag
  `{{ unsubscribe }}` nechat beze změny.
- Žádná čísla bez zdroje a roku — platí i pro úvod Florence.
- Pokud Brevo vrátí chybu (IP autorizace, limit free plánu 300 e-mailů/den),
  nic neopakuj naslepo — reportuj uživateli přesnou chybu.

## Věstníky MZ v newsletteru

Do sekce novinek přidej krátkou zmínku, pokud od minulého vydání vyšla nová
částka Věstníku MZ (`data/vestniky.json`, pole `datum`): jedna věta co
obsahuje + odkaz na archiv `/vestniky-mz`. Bez nové částky sekci vynech.
