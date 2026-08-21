# PROMPT — FÁZE 2: LLM analýza zápisů PPO (map → reduce)

Orchestrace pro Claude Code dle `PLAN-PPO.md` §4. Cíl: z plnotextového
korpusu (`ingest/ppo/source/ppo_korpus_full.jsonl.gz`) vytěžit strukturu
jednání všech skupin a syntézu „kdo skutečně rozhoduje a co se připravuje".

**Modely:** map + reduce 1 = **Sonnet** subagenti · reduce 2 = hlavní
(silnější) model · nic jiného. **Hlavní smyčka nikdy nečte texty zápisů** —
jen stavové výstupy `analyza-status.js`.

## Předpoklady

```bash
node ingest/ppo/run.js              # FÁZE 1 výstupy v ingest/ppo/out/
node ingest/ppo/analyza-status.js   # co zbývá (idempotentní resume)
```

## Krok 1 — MAP: jedna skupina = jeden Sonnet subagent

Pro každou skupinu ze `analyza-status.js` se `hotovo: false`:

1. Orchestrátor spustí `node ingest/ppo/korpus-slice.js <gid>` → soubor
   `/tmp/ppo-slice-<gid>.txt`. Stderr hlásí odhad tokenů; **> 60 k tokenů
   ⇒ dělit po letech** (`korpus-slice.js <gid> <rok>`); rok, který je sám
   > 60 k tokenů, se stránkuje třetím argumentem `cast/celkem`
   (`korpus-slice.js <gid> <rok> 2/5`). Dávky zpracovat postupně (nebo
   paralelně do `analyza/partial/skupina-<gid>-<značka>.json`)
   a deterministicky sloučit do `analyza/skupina-<gid>.json`
   (konkatenace `jednani` dle datumu, dedup dle doc_id, první ne-null
   `statut_shrnuti`/`pravidla`).
2. Sonnet subagent dostane výřez + tento úkol:

> Jsi analytik české zdravotní politiky. Dostáváš úplné texty dokumentů
> jedné pracovní skupiny MZ ČR (zápisy, usnesení, statut), chronologicky.
> Pro KAŽDÉ zjištěné jednání vrať objekt do pole `jednani`. Piš česky,
> stručně, jen co je v textu — nic nedomýšlej. Neznámé pole = null.
> Vrať POUZE validní JSON dle schématu:
>
> ```json
> {
>   "group_id": <int>,
>   "jednani": [{
>     "doc_id": "<z hlavičky DOKUMENT>",
>     "datum": "YYYY-MM-DD | null",
>     "temata": ["3–8 krátkých štítků"],
>     "rozhodnuti": ["výroky, o nichž bylo rozhodnuto/doporučeno"],
>     "ukoly": [{"co": "...", "kdo": "jméno/instituce | null", "termin": "text | null"}],
>     "aktivni_osoby": ["jména, kdo v zápise reálně vystupuje/úkoluje"],
>     "zminene_organizace": ["..."],
>     "zminene_dokumenty": ["vyhlášky, novely, koncepce..."],
>     "odkazy_na_jine_skupiny": ["název jiné PS/komise, je-li zmíněna"],
>     "stret_zajmu": ["zmínky o střetu zájmů/podjatosti na TOMTO jednání (deklarace, námitka, vyloučení z hlasování) — stručně, věcně; prázdné pole, když nic"],
>     "citace": ["max 2 krátké doslovné citace s uvedením kontextu"]
>   }],
>   "statut_shrnuti": "2–4 věty, jen pokud výřez obsahuje statut/jednací řád, jinak null",
>   "pravidla": {
>     "jmenovani": "kdo jmenuje členy | null",
>     "rozhodovani": "konsensus/hlasování + většina | null",
>     "kvorum": "text | null",
>     "stret_zajmu": "co statut/jednací řád říká o střetu zájmů (deklarace? vyloučení?) | null",
>     "zverejnovani": "co říká o zveřejňování zápisů/výstupů | null",
>     "kadence": "deklarovaná frekvence zasedání | null"
>   }
> }
> ```
>
> Pole `pravidla` vyplň JEN z dokumentů typu statut/jednaci_rad ve výřezu
> (jinak celé `pravidla: null`). Stanoviska a programy jsou ve výřezu
> ZKRÁCENÉ na úvod — nevytvářej z nich záznamy `jednani`, slouží jen jako
> kontext (co skupina posuzuje → témata, zmíněné dokumenty).

3. Výstup ulož do `ingest/ppo/analyza/skupina-<gid>.json` — zatím bez
   pole `profil` (doplní krok 2). Po každé skupině spusť
   `node ingest/ppo/analyza-validate.js <gid>`; při chybě vrať TÉMUŽ
   subagentovi chybovou hlášku k opravě (max 2 pokusy, pak zapiš do
   `analyza/CHYBY.md` a pokračuj).

Paralelismus: klidně 3–4 subagenti najednou, skupiny jsou nezávislé.

## Krok 2 — REDUCE 1: profil skupiny (Sonnet)

Pro každou hotovou skupinu subagent dostane: `skupina-<gid>.json` (svůj
výstup mapy) + záznam skupiny z `ingest/ppo/out/skupiny.json` (metadata,
kadence, profesní mix). Úkol:

> Doplň do JSON pole `profil`:
> ```json
> {"profil": {
>   "co_dela": "2–3 odstavce: co skupina reálně dělá (vs. formální účel)",
>   "hlavni_temata": [{"tema": "...", "obdobi": "2023–2026", "stav": "připravuje se | rozhodnuto | usnulo"}],
>   "co_se_pripravuje": ["konkrétní věci v přípravě k dnešku"],
>   "otevrene_ukoly": [{"co": "...", "kdo": null, "od": "YYYY-MM"}],
>   "kdo_vystupuje": [{"jmeno": "...", "role_v_praxi": "např. fakticky řídí agendu"}],
>   "transparentnost": {"zapisy_zverejnovane": true, "posledni_zapis": "YYYY-MM-DD", "hodnoceni": "1 věta"}
> }}
> ```
> Každé tvrzení musí být opřené o `jednani` (nevymýšlej). U `kdo_vystupuje`
> vycházej z `aktivni_osoby` napříč jednáními.

Zapiš zpět do téhož souboru; `analyza-validate.js` pak musí hlásit OK.

## Krok 3 — REDUCE 2: syntéza napříč (hlavní model, 1 běh)

Vstupy (vše už zhuštěné): všechna `profil` pole + `out/sit.json`
(centrality) + `out/skupiny.json` (kadence). Výstup
`ingest/ppo/analyza/synteza.json`:

```json
{
  "zebricek_vlivu": [{"person_id": 1, "jmeno": "...", "duvod": "kombinace rolí, centrality a výskytu v úkolech", "skupiny": [1,2]}],
  "mapa_temat": [{"tema": "...", "skupiny": [1,2], "stav": "...", "poznamka": "duplicitní/koordinované?"}],
  "co_se_pripravuje": [{"co": "...", "kde": [1], "horizont": "..."}],
  "izolovane_skupiny": [{"group_id": 1, "proc": "..."}],
  "komunikace_mezi_skupinami": {"shrnuti": "...", "pary": [{"a": 1, "b": 2, "kanal": "sdílení členové | křížové odkazy v zápisech"}]},
  "zjisteni": [{"teze": "doložitelné tvrzení pro článek", "doklad_doc_ids": ["..."], "skupiny": [1]}]
}
```

Pravidlo: `zjisteni[].doklad_doc_ids` musí odkazovat na existující
dokumenty — bez dokladu tezi vyřaď. 10–15 zjištění stačí.

## Krok 4 — kontrola a commit

```bash
node ingest/ppo/analyza-validate.js --all
git checkout -b claude/ppo-analyza && git add ingest/ppo && git commit
```

Poté FÁZE 3 (build `data/ppo-*.json`) dle PLAN-PPO.md §5.

## Mantinely (PLAN-PPO.md §7)

- Vstup výzvy ≤ 60 k tokenů; dělení po letech přes `korpus-slice.js`.
- Každý mezivýstup hned na disk; session je postradatelná, resume přes
  `analyza-status.js`.
- Reduce čte jen JSON výstupy, nikdy původní texty.
- Validace deterministicky (`analyza-validate.js`), ne „přečti a zkontroluj".
- Nic se nedomýšlí: prázdný zápis ⇒ prázdná pole, ne odhady.
