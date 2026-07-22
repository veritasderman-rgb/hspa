# Skóre zdravotnictví 2026 — Zdroje a metodika
## Datový základ knihy, citační pravidla, poznámky k ověření

> Tento dokument zajišťuje **důvěryhodnost knihy**. Popisuje, odkud data
> pocházejí, jak se počítá signál (dobrý/varovný/špatný), jak čerstvá data jsou,
> a jak správně citovat. Sazeč z něj vytvoří **zadní matter** (kapitola „Metodika
> a zdroje") a **jednotný formát popisků pod grafy**.

---

## 1. Rámec HSPA — o co jde

**HSPA = Health System Performance Assessment.** Metodika hodnocení výkonnosti
zdravotního systému (WHO 2000; Murray–Frenk; rozpracováno OECD, 2023). Odpovídá
na otázku: *„Dostává společnost za peníze a úsilí vložené do zdravotnictví to,
co má — zdraví, dostupnost, kvalitu, bezpečnost, efektivitu a spravedlnost?"*

Kniha používá **dvě osy** současně (jako web):

**A) Čtyři oblasti OECD HSPA Czech Framework** (primární členění dat):

| Oblast | Otázka | Příklad indikátoru |
|---|---|---|
| **Výsledky** | Jak dopadá zdraví lidí? | Naděje dožití, preventabilní mortalita |
| **Výstupy** | Co systém produkuje? | Screeningové pokrytí, proočkovanost |
| **Procesy** | Jak péče probíhá? | Čekací doby, koordinace |
| **Struktury** | Z čeho systém stojí? | Lékaři/sestry na 1000, financování |

**B) Šest dimenzí kvality** (editorial členění knihy do dílů):
Zdraví · Dostupnost · Kvalita · Bezpečnost · Efektivita · Spravedlnost
(WHO/Murray–Frenk). 67+ indikátorů je namapováno na tyto dimenze.

Kniha je členěna primárně podle **6 dimenzí** (čtenářsky srozumitelné), oblast
OECD se uvádí jako sekundární štítek u každého indikátoru.

## 2. Datové zdroje

Všechna data jsou **agregovaná, veřejná, bez osobních údajů**. Frontend webu čte
harmonizovaný datový kontrakt (`data/indicators.json`); ten vzniká z těchto
primárních zdrojů:

| Zdroj | Co dodává | Typ |
|---|---|---|
| **ÚZIS ČR** (Ústav zdravotnických informací a statistiky) | Zdravotnická statistika ČR — kapacity, výkony, mortalita, screeningy | Národní registr |
| **ČSÚ** (Český statistický úřad) | Demografie, naděje dožití, příjmy, socioekonomika | Národní statistika |
| **OECD** | Health at a Glance, mezinárodní benchmark | Mezinárodní |
| **Eurostat** | EU srovnání, unmet need, SDMX datasety | Mezinárodní (EU) |
| **SÚKL** (Státní ústav pro kontrolu léčiv) | Výpadky léčiv, dostupnost přípravků | Národní registr |
| **NZIP, MZ ČR, VZP, dohodovací řízení** | Strategie, úhrady, nároky pojištěnce | Národní / plátce |

**Provoz:** data se stahují automatizovaně (GitHub Actions, denně 06:00 UTC),
harmonizují a publikují. `User-Agent: ZdraveCesko-HSPA/1.0`, max 1×/den (rate
limit). Historie datového kontraktu je uložena v denních snapshotech.

## 3. Jak se počítá signál

Každý indikátor má **signál** — barevný stav vůči benchmarku (OECD/EU):

```
computeSignal(hodnota, benchmark, směr, prahy)
  směr:  higher_is_better | lower_is_better | context_dependent
  prahy: { good: 2, warn: 5 }  (v %)

  good    (▲):  odchylka od benchmarku > +good %
  warn    (●):  −warn % ≤ odchylka ≤ +good %
  bad     (▼):  odchylka < −warn %
  neutral (—):  chybí benchmark nebo směr = context_dependent
```

**Do knihy:** signál se tiskne vždy jako **tvar + barva + slovo** (▲ lepší /
● kolem / ▼ horší / — kontext), aby fungoval i černobíle a pro barvoslepé.
Legenda signálů je součástí úvodní metodické dvoustrany a opakuje se v patičce
scorecardových stran.

## 4. Čerstvost a stav ověření dat

Kniha je **ročenka s pevným datovým řezem**. Dva metadatové rozměry:

**a) Čerstvost** (`freshness.json`): jak staré je poslední pozorování.
- Web hlídá: varování > 7 dní, chyba > 30 dní od očekávané aktualizace.
- V knize se u každého indikátoru uvádí **rok datového bodu** (např. „2024") a
  v metodice **datum uzávěrky knihy** (datový řez).

**b) Stav ověření** (dvojí režim indikátoru):
- **Ověřeno (živý zdroj)** — hodnota pochází z živého napojení na zdroj.
- **Ilustrativní (seed)** — hodnota je nasazená ručně jako reprezentativní
  odhad, dokud není zapojen živý zdroj (viz `PLAN-VERIFIKACE-INDIKATORU.md`).

> **Redakční pravidlo pro knihu:** Ilustrativní hodnoty musí být **viditelně
> označené** (marginální značka „Ilustrativní" + poznámka v metodice). Nikdy
> neprezentovat seed jako ověřené číslo. Pokud je podíl ilustrativních hodnot u
> některé dimenze vysoký, uvést to v úvodu dílu. Tím kniha zůstává poctivá.

## 5. Stav ověření článků (audit)

Články mají `audit-status` (z `data/articles.json`):

| Status | Do knihy |
|---|---|
| `verified` | ✅ zařadit bez výhrad |
| `review-pending` / `partial` | ⚠️ zařadit lze, ale čísla znovu zkontrolovat proti datovému řezu; případně marginální poznámka |
| `flagged` / `draft-flagged` / `needs-rewrite` | ❌ **nezařazovat** (otevřený problém) |
| `draft` (bez blokátoru) | zvážit; před zařazením povýšit ověřením |

**Registr tvrzení (`claims.json`):** web vede registr kvantitativních tvrzení z
článků s detekcí driftu (číslo v článku vs. aktuální data). Před finální sazbou
projít claims proti datovému řezu — čísla v knize musí sedět k datu uzávěrky.

## 6. Citační pravidla (jednotný formát)

**Popisek pod grafem/tabulkou** (grotesk 7 pt, tlumený inkoust):
```
Zdroj: {název zdroje}, {rok dat}. {Volitelně: benchmark OECD/EU, rok}.
[Ilustrativní hodnota — viz Metodika]   ← jen u seed dat
```
Příklad: `Zdroj: ČSÚ, 2024. Benchmark OECD 81,1 (2023).`

**Citace knihy jako celku** (do tiráže + zadního matteru):
```
Skóre zdravotnictví 2026: Jak jsme na tom. Nezávislé hodnocení výkonnosti
českého zdravotního systému podle rámce OECD HSPA. skorezdravotnictvi.cz,
{rok vydání}. Datový řez k {datum uzávěrky}.
```

**QR / trvalé odkazy:** každý graf a hra odkazuje na živou verzi na webu
(indikátor: `skorezdravotnictvi.cz/indicator?id={id}`). QR bloky generuje sázecí
session z URL uvedených u grafů v `03-grafy-spec.md`.

## 7. Uzávěrka a verzování ročenky

- **Datový řez:** doplní se při finalizaci (poslední snapshot `data/snapshot-*.json`
  před uzávěrkou). Do metodiky uvést konkrétní datum.
- **Verze:** „ročník 2026". Případné dotisky uvádět jako „2026, 2. dotisk" se
  stejným datovým řezem (data se nemění mezi dotisky téhož ročníku).
- **Reprodukovatelnost:** protože web archivuje denní snapshoty, je datový řez
  knihy plně dohledatelný a citovatelný.

---

### Co z tohoto dokumentu vzniká v knize
1. **Kapitola „Metodika a zdroje"** (zadní matter) — §1–§4, §7.
2. **Jednotný popisek pod grafy** — §6.
3. **Legenda signálů** — §3 (úvodní dvoustrana + patičky datových stran).
4. **Poznámka o ilustrativních datech** — §4b, kde relevantní.
5. **Tiráž a citace** — §6.
