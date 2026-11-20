# Mluvená videa — hlasy, dialog, hudba a efekty (ElevenLabs)

Od 20. 11. 2026 smí videa na sociální sítě mluvit (rozhodnutí vydavatele, viz
`docs/decisions-log.md`). Němé varianty (žvatlání, titulky) zůstávají platné a jsou
záloha pro běh bez konektoru ElevenLabs.

## Co se změnilo

| | Němé video | Mluvené video |
|---|---|---|
| Délka na výšku | 8–20 s | 8–**60 s** (ideál 30–45 s) |
| Délka na šířku | ≤ 40 s | ≤ **90 s** |
| Zvuk | žvatlání / psací stroj, syntetický podkres | hlas postav, hudba a efekty ze souboru |
| Postavy | Kompík, nebo Florence | Kompík **+ host** (Florence nebo role z obsazení), dialog |
| Velikost MP4 | ≤ 3 MB | ≤ **6 MB** (`"crf": 25` až 27) |

Titulky zůstávají vždy: bublina (Kompík, host) nebo velké titulky (Florence). Většina
lidí pouští videa bez zvuku — video musí dávat smysl i němé.

## Obsazení — `social/reels/voices.json`

Jedna postava = jeden hlas napříč všemi videi. `voice_id` ber **jen** z tohoto souboru,
nikdy z paměti. Soubor nese i režijní poznámku ke každé postavě (jak mluví, jaké tagy).

| Postava | Charakter v dialogu |
|---|---|
| **Kompík** | zvídavý optimista: ptá se, tipuje, žasne. Říká to, co si myslí divák. |
| **Florence · AI** | suchá ironie, opravuje a dodává háček („Jenže…“). Vždy označená jako AI. |
| Sestra, Lékař, Pacient, Senior, Úředník, Záchranář | hlas role, ne osoby. Mluví za zkušenost, kterou článek dokládá. |

Pravidla (červené linie):
- Jen hlasy z knihovny ElevenLabs nebo hlasy **navržené z textového popisu** (Voice
  Design). **Nikdy klon hlasu skutečné osoby**, nikdy imitace politika, lékaře, moderátora.
- Žádný dětský hlas (role `dite` v dialogu nemluví).
- Koncová karta vždy nese `voice_credit` („ElevenLabs (syntetické hlasy)“), popisek
  příspěvku „Animace, text a hlasy: AI“. Florence se představuje jako AI.
- Host neříká nic, co není v článku. Role nemluví za skutečnou profesní skupinu
  („my sestry chceme…“) — jen popisuje, co dokládají data.
- Nový hlas nebo výměna hlasu postavy = změna `voices.json` v PR (třída C, vydavatel).

## Dialog ve scénáři (styl Kompík)

Beat `say`, `group` nebo `punch` s polem `speaker` říká host. Host přijde zprava
s první replikou, má bublinu se jmenovkou a pusu podle hlasitosti; Kompík ho poslouchá.

```json
{ "type": "say", "dur": 9.2, "emotion": "skeptic", "speaker": "florence", "guest_mood": "skeptic",
  "sfx": [{ "file": "social/reels/audio/sfx/record-scratch.mp3", "at": 0, "gain": 0.45 }],
  "line": "Jenže ty počítáš i *praktické sestry*.",
  "spoken": "[sarcastic] Jenže ty, Kompíku, počítáš i praktické sestry a asistenty. [short pause] A ti všeobecnou sestru plně nenahradí.",
  "voice": "social/reels/voice/duo-sestry-absolventi/03.mp3" }
```

| Pole | Význam |
|---|---|
| `speaker` | kdo mluví: `florence`, `sestra`, `lekar`, `pacient`, `senior`, `urednik`, `zachranar`. Bez pole mluví Kompík. |
| `guest` | host přijde už teď, ale ještě mlčí (jen u `say`; Kompík ho ohlásí) |
| `guest_mood`, `guest_gesture` | výraz hosta (Florence: její nálady a gesta; role: `happy`, `sad`, `wow`, `neutral`) |
| `speaker_label` | vlastní jmenovka na bublině (výchozí podle role) |
| `emotion` | emoce **Kompíka** — i když mluví host, Kompík reaguje |
| `line` | text bubliny (≤ 70 znaků), co divák čte |
| `spoken` | přesný text poslaný do hlasu, včetně tagů `[…]` (≤ 260 znaků). Čísla v něm hlídá validátor stejně jako v `line`. Povinné u mluveného videa na výšku. |
| `voice` | `social/reels/voice/<slug>/NN.mp3` |

Jeden host na scéně; druhý host vystřídá prvního. Skupiny postaviček a host se
snesou: host se zmenší do pravého rohu, Kompík zůstane uprostřed. Dialog s hostem je
zatím jen na výšku. Vzor: `scripts/duo-sestry-absolventi.json`.

`line` a `spoken` se smí lišit jen délkou: `spoken` může větu rozvést, ale nesmí
tvrdit nic, co `line` a fakta nenesou. Když video mluví, mluví celé — beat s replikou
bez `voice` validátor odmítne.

## Výroba hlasu (jedno video)

Konektor ElevenLabs (`creative_*`). Repo nemá API klíč; všechno jde přes konektor.

1. **Scénář** s `line` a `spoken`, zatím bez `voice`. `npm run reels:check` projde jako němé video.
2. **Flow**: `creative_create_flow` (název `HSPA reels · <slug>`), jeho `flow_id` do všech volání.
3. **Repliky**: pro každý beat `creative_generate_speech` s `model_id: "eleven_v4"`,
   `voice_id` z `voices.json`, `prompt` = `spoken`. Počet variant nech výchozí (2 záběry).
   Volání pošli najednou. **Nikdy neopakuj volání jako „retry“** — účtuje se znovu.
4. **Stav**: `creative_get_flow_run_status` s `flow_id` a všemi `session_ids`, dokud není
   `all_completed`. Výsledek nese `duration_secs` a `content_url` každého záběru.
5. **Výběr záběru**: ber kratší z dvojice, pokud se délkou liší o víc než 15 %
   (delší záběr mívá zadrhnutí nebo přidaná slova); jinak první.
6. **Stažení** `curl -sS -o social/reels/voice/<slug>/NN.mp3 '<content_url>'`
   a doplnění `voice` do beatů.
7. **Časování**: `node social/reels/render.js <slug> --fit-voice` nastaví `dur` beatů
   podle naměřené řeči a zapíše `timing.json`. U tabule (`board`) dolaď `at` ručně.
8. **Kontrola výslovnosti** (povinná, když replika nese číslo, zkratku nebo cizí
   jméno): `creative_generate_in_flow` s `node_type: "speech-to-text"`,
   `connect_from: [<node_id repliky>]`. Přepis musí říkat totéž číslo jako `spoken`.
   Když ne, přepiš `spoken` (číslo slovy, zkratku rozepiš) a vygeneruj beat znovu —
   to není retry, je to nový text.
9. Dál jako u němého videa: arch → render → `ffprobe` → testy.

### Jak psát `spoken` (model `eleven_v4`)

- Tagy v hranatých závorkách říkají, **jak** se věta řekne, a platí do dalšího tagu:
  `[curious]`, `[excited]`, `[surprised]`, `[nervous]`, `[sarcastic]`, `[warmly]`,
  `[dramatically]`, `[whispers]`, `[sighs]`, `[gasps]`, `[chuckles]`, `[short pause]`.
  Jeden až dva tagy na repliku. Režijní pokyny (`[usmívá se]`) model nehraje.
- Čísla piš **slovy** („třicet devět“, „šestnáct celých jedna“) — výslovnost je pak
  jistá a validátor čísla slovy nekontroluje strojově, proto je hlídáš proti `facts[]` ty.
- Zkratky rozepiš („OECD“ → „vyspělých zemí“ nebo „ó é cé dé“), procenta slovem.
- Interpunkce dělá rytmus: čárka krátká pauza, tři tečky delší, vykřičník energii.
- Oslovení dělá dialog živým („Jenže ty, Kompíku…“), ale šetři jím.

## Hudba a efekty — `social/reels/audio/`

- `"music": "social/reels/audio/music/<název>.mp3"` nahradí syntetický podkres;
  `music_gain` (výchozí 0,2). Pod hlasem se hudba sama ztiší.
- `"sfx": [{ "file": "social/reels/audio/sfx/<název>.mp3", "at": 0.4, "gain": 0.5 }]`
  u beatu přidá efekt v čase `at` od začátku beatu.
- Knihovna je **sdílená**: nejdřív použij, co v ní je (`audio/README.md`). Nový efekt
  vyrob, jen když ho scéna opravdu potřebuje (`node_type: "sfx"`, model
  `eleven_text_to_sound_v3`, 1–2 s). Nový podkres nejvýš jeden týdně
  (`node_type: "music"`, `eleven_music_v2_5`, 45 s, v promptu „instrumental, no vocals“).
- Podkres před použitím ověř přepisem (krok 8): text musí vyjít **prázdný**. Model
  má výchozí nastavení se zpěvem a zpěv pod hlasem video zničí.
- Hudbu ulož mono 96 kb/s: `ffmpeg -i in.mp3 -ac 1 -b:a 96k out.mp3`.
- Vestavěné efekty (plop, pop, plácnutí, trombon) zůstávají — jsou svázané s animací.

## Kredity (naměřeno 20. 11. 2026)

| Co | Cena |
|---|---|
| Hlas `eleven_v4` | ≈ 1 kredit / znak `spoken` (včetně tagů), × počet záběrů |
| Efekt | ≈ 17 kreditů / s, × počet variant |
| Hudba 45 s | ≈ 900 kreditů / variantu |
| Přepis (kontrola) | ≈ 250 kreditů / 45 s zvuku |
| Dialog 40 s (8 replik, 2 záběry) | ≈ 1 150 kreditů |

Před dražším krokem (hudba, víc než 4 varianty) zavolej totéž s `estimate_only: true`.
Rutina má denní strop 4 000 kreditů a týdenní 1 nový podkres; víc jen na pokyn vydavatele.
