# Discovery report — 2026-06-20

Běh denní rutiny (PROMPT_DAILY_ROUTINE.md, 5 fází). Discovery proti primárním
strojově dohledatelným zdrojům (WebFetch / WebSearch). Železné pravidlo: co není
ověřené z primárního zdroje, nezůstává. Uživatel pro tento běh opět explicitně
zdůraznil: **„Naprosto zásadní je validace a ověření všech zdrojů!!!!"**

20. 6. 2026 je **sobota**. Poslední discovery report v repu = 2026-06-19
(ARTICLE-WRITE clanek-dohodovaci-rizeni-2027-vysledek, výsledek DŘ 2027).

Startovní stav: `npm run validate:all` zelené (146 indikátorů, 144 článků prošlo
publikační hygienou; strategie 36, explainery 35, prevence 9, dohodovací řízení
9 dimenzí / 44 sad, financing OK, clinical-quality 35). Žádná regrese.

## Procházené primární zdroje (stav fetch k 20. 6. 2026)

| # | Zdroj | URL | Stav | Nález |
|---|---|---|---|---|
| 1 | **ÚZIS — aktuality** | uzis.cz/index.php?pg=aktuality | ✅ 200 | Nejnovější **15. 6.** (NRPATV číselník toxikologie — salbutamol + syntetické kanabinoidy; registrová údržba, **bez HSPA-implikace**). 10. 6. čestná členství. **Žádná nová datová vlna od posledního běhu.** |
| 2 | **MZ ČR — tiskové zprávy** | mzd.gov.cz/tiskove-centrum/tiskove-zpravy/ | ✅ 200 | 18. 6. „Rekordní shoda ve zdravotnictví: DŘ 2027" (již zpracováno 19. 6.). 15. 6. ministr Vojtěch v Lucemburku (Rada EU, dostupnost léčiv). 14. 6. opatření vlády +24 mld (již v korpusu). Nic nového po 18. 6. |
| 3 | **ČSÚ — aktuality** | csu.gov.cz/aktuality | ✅ 200 | 16. 6. Demografie 2/2026 (journal); 12. 6. Pohyb obyvatelstva Q1 2026; 11. 6. „Zdravotní péče 2024 = 64 tis. Kč/osobu" (rutinní SHA). Žádná nová indikátorová vlna. |
| 4 | **VZP — aktuality** | vzp.cz/o-nas/aktuality | ⚠️ jen nav | Strana vrací jen navigaci; segmentová dohoda k DŘ 2027 již zachycena 19. 6. |
| 5 | **zakonyprolidi.cz — aktuálně** | zakonyprolidi.cz/cs/aktualne | ⚠️ 403 | Anti-bot. Žádný strojově ověřený **nový** normativní akt v gesci MZ ČR netvrdím. Úhradová vyhláška 2027 teprve přijde (Sbírka do konce října 2026 — avizovaný termín). |
| 6 | **OECD / Eurostat / WHO** | oecd.org, ec.europa.eu/eurostat | ✅ 200 | Nejnovější ucelená vlna = Health at a Glance 2025 + Country Health Profile 2025 (12/2025, již reflektováno). Žádná nová vlna v 6/2026. |
| 7 | **SÚKL — výpadky léčiv** | sukl.gov.cz/.../registr-vypadku-leciv | ⚠️ 404 | URL přesměrována; bez strojově ověřeného nového kritického výpadku netvrdím. |

## Nové indikátory / datasety

- (žádné nové) — ÚZIS NRPATV = údržba číselníku; ČSÚ Demografie 2/2026 = journal.
- Kontrola: pooperační sepse (MZ TZ 2. 6. 2026, PUK) — **již v korpusu**
  (clanek-pooperacni-sepse-2026, publ. 2. 6.). Žádný nový event.

## Nové legislativní normy / sněmovní tisky

- Bez strojově ověřeného **nového** normativního aktu v gesci MZ ČR k 20. 6. 2026.

## Aktualizace existujících dat / dění (vlna)

- Žádná nová vlna od běhu 19. 6. Výsledek DŘ 2027 (18. 6.) byl zpracován včera
  (clanek-dohodovaci-rizeni-2027-vysledek, ve frontě na 2026-07-02).

## Doporučení pro routing fáze

- **HOT:** žádný nový primárně-doložitelný event (DŘ 2027 výsledek vyřešen 19. 6.).
- **WARM:** žádný živý článek nevyžaduje akutní revizi kvůli nové vlně.
- **COLD → FALLBACK-AUDIT:** discovery bez nového dění → přepnutí na fallback
  routine = audit nejstaršího auditovaného článku (`last_reviewed` > 30 dní).
  Nejstarší: **clanek-prezit-rakoviny** (last_reviewed 2026-05-12 = 39 dní),
  zároveň numericky náročný (rakovina, přežití, incidence) → nejvyšší riziko
  nepřesnosti. Ideální cíl pro source-verification audit.
