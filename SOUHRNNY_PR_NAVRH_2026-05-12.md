# Souhrnný PR návrh (konsolidace otevřených tematických změn)

Datum: 2026-05-12
Branch: `work`

## Vstupní PR témata zahrnutá do souhrnu

Na základě historie změn byly konsolidovány tyto PR větve/témata:
- #245 – audit a oprava článku „přežití rakoviny“
- #243 – oprava zastaralých počtů indikátorů (index/o projektu/tematické linie)
- #238 – audit a oprava článku „cervix/HPV“
- #237 – copy/obsahové korekce (včetně čísel indikátorů)

## Posouzení duplicit

### 1) Článek `clanek-prezit-rakoviny.html`
- Commity `57e5c31` a `3bda04c` mění stejnou oblast (audit + následná upřesňující fixace citace).
- Hodnocení: **nejde o konflikt**, ale o **navazující změny**; v souhrnném PR má být ponechán finální stav po obou commitech.

### 2) Článek `clanek-cervix-hpv.html`
- Commity `97b166e` a `94b9ab1` opět mění stejný článek (nejprve auditní doplnění, následně zpřesnění interpretace hodnot).
- Hodnocení: **nejde o duplicitu k odstranění**, jde o iteraci nad stejným tématem.

### 3) Stránka `o-projektu.html`
- Commity `13b7781` a `3781ed9` oba zasahují do indikátorové aritmetiky/počtů.
- Hodnocení: zde je **reálný překryv**; souhrnný PR má obsahovat pouze výsledný text a vyhnout se duplicitnímu popisu v PR zprávě.

### 4) Auditní dokument `AUDIT_CLANKY_2026-05-08.md`
- Je upravován napříč tématy #245 a #238.
- Hodnocení: změny jsou tematicky oddělené (jiné články), ale v souhrnném PR je vhodné je reportovat po sekcích, ne jako samostatné „fix fixů“.

## Návrh finálního souhrnného PR

## Titulek
`chore(content): souhrn auditních oprav článků + sjednocení indikátorových počtů`

## Popis (draft)
Tento souhrnný PR slučuje obsahové a auditní změny původně rozdělené do více PR (#245, #243, #238, #237) do jedné konzistentní revize.

### Co je zahrnuto
1. **Auditní zpřesnění článku o přežití rakoviny**
   - ověření zdrojů a zpřesnění citací
   - finalizace textace ve `clanek-prezit-rakoviny.html`
2. **Auditní zpřesnění článku cervix/HPV**
   - vysvětlení rozdílů metrik (52,3 % vs. 74,7 %) dle věku/agregace
   - finalizace textace ve `clanek-cervix-hpv.html`
3. **Sjednocení indikátorových počtů a aritmetiky**
   - aktualizace zastaralých počtů (67 → 73)
   - sjednocení navazujících textů v `index.html`, `o-projektu.html`, `tematicke-linie.html`
4. **Konsolidace auditního logu**
   - sloučení dílčích auditních doplnění v `AUDIT_CLANKY_2026-05-08.md`

### Deduplicační pravidla použitá při sloučení
- U souborů s vícenásobnými zásahy (`clanek-prezit-rakoviny.html`, `clanek-cervix-hpv.html`, `o-projektu.html`) je zachován pouze **finální výsledný stav**, nikoli duplicitní mezikroky v popisu změn.
- V PR popisu jsou změny seskupené podle tématu, ne podle pořadí původních PR.

### Rizika / body pro review
- Ověřit, že všechna čísla indikátorů jsou konzistentní napříč stránkami.
- Ověřit, že auditní citace v článcích odpovídají textu v auditním markdownu.

