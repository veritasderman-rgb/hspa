# Balík PPO pro git — co kam patří

Obsah `pro-git/` zrcadlí strukturu repa `hspa`. Postup:

1. Zkopíruj `pro-git/05_M1_Starter/` přes stejnojmennou složku v repu
   (nové soubory: `ingest/ppo/**`, `PROMPT_PPO_ANALYZA.md`; nic nepřepisuje
   existující kód).
2. `PLAN-PPO.md` (v kořeni `D:\Data\ppo`) patří do `05_M1_Starter/PLAN-PPO.md`.
3. Zdrojová data jsou v `ingest/ppo/source/` — malé CSV/JSON + plný korpus
   `ppo_korpus_full.jsonl.gz` (16,5 MB; commitovat lze, do webu se nedostane).
   Zipy příloh (3,4 GB) do gitu NEpatří, zůstávají jen v `D:\Data\ppo`.
4. Ověření: `node ingest/ppo/run.js` → přegeneruje `ingest/ppo/out/*.json`;
   `node ingest/ppo/analyza-status.js` → fronta pro FÁZI 2.
5. Další krok podle `PROMPT_PPO_ANALYZA.md` (Claude Code, Sonnet subagenti).

Vygenerováno 21. 8. 2026 v Cowork session; report extrakce viz
`D:\Data\ppo\ppo_extrakce_report.md`.
