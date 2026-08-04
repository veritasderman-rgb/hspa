# Plán: Meta kampaň (Facebook + Instagram) — růst odběratelů

> **Cíl:** získat odběratele na FB stránce *Skóre zdravotnictví Česko* a na IG
> `skorezdravotnictvi`, s důrazem na lidi, kteří ve zdravotnictví pracují.
>
> **Status:** návrh k odsouhlasení. Nic není v Meta založeno.
> Navazuje na [`social-copywriting-manual.md`](social-copywriting-manual.md)
> (tón, háky, délky) a [`../05_M1_Starter/PROMPT_SOCIAL_ROUTINE.md`](../05_M1_Starter/PROMPT_SOCIAL_ROUTINE.md)
> (organická distribuce přes Buffer).

---

## 1. Výchozí stav (ověřeno v účtu, 2026-08-03)

| Položka | Zjištění |
|---|---|
| Reklamní účet | `53321504` · aktivní · CZK · platební metoda připojena |
| Minimální denní rozpočet | **21,33 Kč** / ad set |
| FB stránka | *Skóre zdravotnictví Česko* — `1141275922399131`, propagovatelná pod účtem |
| Instagram | `skorezdravotnictvi` — připojen v Bufferu; propojení s ad accountem nutno ověřit v Ads Manageru |
| **Historie kampaní pro tuto stránku** | **žádná** — účet odjel jen Aikido / MLmag / Ensana |
| **Meta Pixel na webu** | **není** — běží pouze GA4 (`G-DVH1RPVTM4`) + Vercel Analytics |
| Obsahový fond | 178 publikovaných článků, 8 rubrik, 5 tematických linií |
| Grafika | tmavé „stat-hero" karty 1080×1080 + 1080×1920 (`assets/social/`) |

**Důsledek:** jde o studený start. Nemáme pixel, nemáme remarketingová publika,
nemáme seed pro lookalike. První fáze kampaně proto **není o odběratelích, ale
o vybudování publika**, ze kterého se odběratelé teprve dají levně získat.

---

## 2. Co na Metě jde a nejde koupit (čti dřív než cokoli jiného)

Tohle rozhoduje o celé architektuře:

1. **Facebook odběratele (Page likes) koupit lze.** Cíl *Engagement* →
   umístění konverze *Facebook stránka* → performance goal *Page likes*.
2. **Instagram odběratele koupit NELZE.** Meta nemá follower objective pro IG.
   Nejblíž je *Engagement → Profile visits*. Followeři jsou až druhotný efekt
   návštěvy profilu — proto u IG rozhoduje kvalita profilu, ne rozpočet.
3. **Levné lajky jsou past.** Kampaň na page likes s širokým cílením v ČR umí
   vyrobit odběratele za pár korun, ale s nulovým zájmem. Algoritmus pak měří
   engagement rate proti nafouknuté základně a **sníží organický dosah** —
   u značky stojící na důvěryhodnosti je to čistá ztráta.
4. **Zdravotnické cílení je omezené.** Meta v roce 2022 zrušila detailní cílení
   podle zdravotních stavů. Profesní zájmy zůstaly, ale v ČR jsou řídké —
   Češi si do profilu zaměstnavatele a pracovní pozici vyplňují málo.

**Z toho plyne hlavní strategické rozhodnutí:**

> Zdravotníky **necílíme demograficky, cílíme je obsahem.** Pustíme obsah tak
> oborově specifický, že ho rozklikne jen člověk z branže — a teprve z těch,
> kdo zareagovali, postavíme publikum, kterému nabídneme odběr.

Tohle je spolehlivější než Meta job-title cílení a zároveň to řeší problém
kvality odběratelů.

---

## 3. Segmenty publika

### A1 · Klinický personál — jádro
Lékaři, sestry, farmaceuti, záchranáři, fyzioterapeuti, laboranti.
Univerzum v ČR řádově 150–200 tis. lidí.

**Páky v Metě:**
- **Vzdělání — lékařské fakulty** (nejsilnější dostupná páka): 1./2./3. LF UK,
  LF UK Hradec Králové, LF UK Plzeň, LF MU Brno, LF UP Olomouc, LF OU Ostrava
- Zájmy: *Medicine*, *Nursing*, *Health care*, *Physician*, *Medical school*
- Zaměstnavatelé: velké nemocnice (FN Motol, IKEM, VFN, FN Brno, FN Olomouc…)

> Zájem *Medicine* je v ČR silně naředěný laiky se zájmem o zdraví.
> Slouží jako hrubý filtr, ne jako přesné cílení.

### A2 · Management a plátci — nejcennější, ale nejmenší
Ředitelé nemocnic, zdravotní pojišťovny, kraje, MZČR, ÚZIS, ČLK.

Na Metě prakticky netargetovatelné. **Nedávat sem placený rozpočet.**
Tahle skupina se získává obsahem a lookalike publiky, ne cílením.

### A3 · Health-policy okolí
Zdravotničtí novináři, analytici, akademici, pacientské organizace, farma.
Zájmy: *Public health*, *Health policy*, *Health economics*, *Journalism*.
Malé, ale mimořádně dobře sdílející publikum — dělá druhotný dosah.

### A4 · Poučená veřejnost — objemový motor
30–60 let, VŠ vzdělání, zájem o data, veřejnou politiku, ekonomiku.

Bez tohoto segmentu kampaň nemá objem a CPM u úzkých publik vyletí.
A4 dělá dosah a sdílení; A1 a A3 dělají hodnotu.

**Doporučené rozdělení rozpočtu:** A1 40 % · A4 35 % · A3 25 % · A2 nula
(řeší se organicky a přes lookalike).

---

## 4. Architektura kampaně

### Fáze 0 — technická příprava (před spuštěním, ~1 den práce)

- [ ] **Nasadit Meta Pixel** na `skorezdravotnictvi.cz`. Bez něj neexistuje
      webové remarketingové publikum ani kvalitní lookalike. Musí respektovat
      stávající consent (GA4 už jede s Consent Mode v2 a výchozím `denied`) —
      pixel nesmí střílet před souhlasem.
- [ ] Ověřit, že IG je **Professional account** a je propojený se stránkou
      i s ad accountem (jinak nejde IG umístění pod vlastní IG identitou).
- [ ] Připravit **méně textové varianty** stat-hero karet. Naše karty jsou
      záměrně textové (dobré pro organiku), v placeném feedu ale text-heavy
      kreativa dostává nižší dosah. Na každý koncept chceme A/B: plná karta
      vs. karta s jedním velkým číslem.
- [ ] Doplnit FB stránku i IG bio o jasnou větu, co odběratel dostane
      (viz §6 — hodnota, ne prosba).

### Fáze 1 — „Filtr" (týdny 1–3)
**Účel: zjistit, kdo reaguje, a nasbírat publikum. Ne odběratelé.**

- Cíl kampaně: *Engagement* (post engagement) + paralelně *Traffic* na web
- 3 ad sety = 3 hypotézy: **A1** (fakulty + zájmy), **A3** (policy zájmy),
  **A4** (broad, jen věk + vzdělání — ať se algoritmus učí sám)
- 4–6 kreativ z §5, každá ve dvou grafických variantách
- Umístění: FB feed + IG feed + Stories (vertikální karty už máme)
- Rozpočet: **~250 Kč/den** (≈ 5 000 Kč/měsíc)

**Výstup fáze:** custom audiences — engagers stránky, engagers IG, video
viewers, návštěvníci webu (pokud je pixel). To je surovina pro fázi 2.

### Fáze 2 — „Konverze na odběratele" (týdny 3–6)

- **Facebook:** *Engagement → Page likes*, cílené **výhradně na custom
  audiences z fáze 1**. Tím se vyhneme junk odběratelům — oslovujeme jen lidi,
  kteří už na náš obsah reagovali.
- **Instagram:** *Engagement → Profile visits* na tatáž publika.
  Followery nekupujeme, kupujeme návštěvu profilu — o konverzi rozhodne
  bio, pinned posty a highlights.
- **Lookalike 1 %** z nejkvalitnějšího seedu (nejlépe web visitors, jinak
  engagers) — tímhle se dostaneme i k A2, kam cílení nedosáhne.

### Fáze 3 — „Motor" (od týdne 6, always-on)

- Evergreen sada 3–4 nejvýkonnějších kreativ na nízkém rozpočtu
- Týdenní přírůstek: nejsilnější nový článek
- Remarketingová kaskáda: web/engagement → follow ask

---

## 5. Kreativní koncepty (z reálného korpusu)

Řazeno podle síly pro odborné publikum:

**K1 · „Vaše pracoviště v číslech" — nejsilnější insider hook**
Plné kojení při propuštění: mezi porodnicemi rozdíl **44 až 96 %**.
Kdokoli pracuje v porodnici, chce vidět, kde je ta jeho. Osobní zainteresovanost
je nejlepší filtr, jaký máme.

**K2 · „Co se vůbec neměří"**
Dekubity: Česko přesně neví, kolik jich má.
Profesionál to zná zevnitř a chybějící data ho štvou → komentuje, doplňuje,
sdílí. Komentáře od odborníků jsou navíc sociální důkaz pro ostatní.

**K3 · „Jsme v tom světová špička"**
Přežití novorozenců — Česko na špici, a není to náhoda.
**Strategicky důležité:** čeští zdravotníci jsou zvyklí na kritiku. Obsah,
který jim dá zaslouženou zásluhu, putuje jejich sítěmi zadarmo. Tenhle koncept
očekávám nejlevnější na dosah.

**K4 · „Týká se to vaší profese"**
41 % českých lékařů je starších 55 let; každý druhý praktik brzy do důchodu.
Existenciální téma oboru — vysoká míra sdílení mezi kolegy.

**K5 · „Mýtus vs. data"**
Roky se psalo, že ČR u šedého zákalu zaostává (~36 %). Realita: 98,7 % operací
bez přenocování. Ukazuje naši metodickou hodnotu — opravujeme čísla veřejně.

**K6 · „Držíme politiku za slovo" — produktová, ne článková**
Barometr politických prohlášení. Tohle není článek, ale nástroj — nejlepší
důvod k *odběru* (má smysl sledovat průběžně). Nasadit až ve fázi 2 jako
follow ask.

---

## 6. Jak formulovat výzvu k odběru

Nikdy „dejte nám like". Vždy **co odběratel dostane**:

> Každý den jedno doložené číslo o českém zdravotnictví.
> Zdroj u každého údaje. Když se ukáže, že je číslo špatně, opravíme ho veřejně.
> 👉 Sledujte Skóre zdravotnictví Česko

Pro odborné publikum (fáze 2, A1):

> Píšeme o vašem oboru daty, ne dojmy. Srovnání s OECD a EU, rozpady po krajích
> a po pracovištích, metodika u každého indikátoru.
> Sledujte, ať vám neuteče, když se čísla pohnou.

Platí pravidla z copy manuálu: hlavní věc do první věty, žádné hodnotící soudy
bez čísla, žádný clickbait, 3–6 hashtagů.

---

## 7. Rozpočet a měření

| Fáze | Délka | Rozpočet | Primární metrika |
|---|---|---|---|
| 1 · Filtr | 3 týdny | 250 Kč/den (~5 000 Kč) | CTR, cena za zapojení, velikost publika |
| 2 · Konverze | 3 týdny | 300 Kč/den (~6 000 Kč) | cena za odběratele, míra zapojení nových |
| 3 · Motor | průběžně | 100–150 Kč/den | organický dosah, přírůstek odběratelů |

**Test celkem: ~11 000 Kč na 6 týdnů.** Účet zvládne i výrazně méně
(minimum je 21,33 Kč/den na ad set), ale pod ~150 Kč/den se algoritmus neučí
a data nejsou průkazná.

**KPI, na kterém záleží:** ne cena za lajk, ale **podíl nových odběratelů,
kteří do 14 dnů zareagují na organický příspěvek.** Tohle je jediné číslo,
které rozliší skutečné publikum od nakoupeného.

**Guardrail:** klesne-li průměrný engagement rate stránky po spuštění fáze 2
o víc než pětinu, kampaň zastavit a přecílit — kupujeme špatné lidi.

Konkrétní cílové ceny záměrně nestanovuju předem. Pro tuhle stránku neexistují
žádná historická data a benchmarky z jiných oborů by byly jen dojem —
skutečné hodnoty budeme mít po prvním týdnu fáze 1.

---

## 8. Rizika a otevřené otázky

| Riziko | Dopad | Ošetření |
|---|---|---|
| Meta job-title cílení je v ČR řídké | úzká publika, vysoké CPM | cílit obsahem, ne demografií (§2) |
| Nakoupení odběratelé sníží organický dosah | poškození značky | fáze 2 jen na custom audiences + guardrail §7 |
| IG followery nelze kupovat | omezená kontrola | optimalizace profilu + profile visits |
| Chybí pixel | slabý remarketing, horší lookalike | fáze 0 — nasadit před startem |
| Text-heavy karty | nižší výkon v placeném feedu | A/B varianty s jedním velkým číslem |
| Zdravotnická témata a moderace | zamítnutí kreativy | držet věcný tón bez zdravotních tvrzení vůči jednotlivci |

**Otevřené otázky k rozhodnutí:**
1. Nasadit Meta Pixel na produkci? (bez něj kampaň funguje, ale hůř)
2. Kolik jsi ochoten dát do testu — držet se 11 000 Kč na 6 týdnů, nebo jinak?
3. Chceme cílit celou ČR, nebo začít krajsky (levnější test, navazuje na
   krajský dashboard)?

---

## 9. Co udělám po odsouhlasení

1. Založím kampaně, ad sety a kreativy **ve stavu PAUSED** — nic se nespustí
   samo a nic neutratí, dokud to v Ads Manageru neodklikneš.
2. Připravím texty všech inzerátů podle copy manuálu.
3. Vygeneruju A/B varianty grafik (`npm run ig:cards`).
4. Předám kontrolní seznam k ručnímu spuštění.

**Bez výslovného pokynu nespouštím žádnou placenou kampaň.**
