# social/reels — animované příspěvky (Kompík a Florence)

Renderer 10–20s vertikálních videí (9:16, 1080×1920, 30 fps) ve dvou stylech: „Kompík vysvětluje“ a „Florence komentuje“.
Postup, pravidla a formát scénáře: skill
[`.claude/skills/animovane-prispevky/`](../../../.claude/skills/animovane-prispevky/SKILL.md).

```bash
npm run reels:check                              # validace všech scénářů
npm run reels:render -- <slug> --sheet           # kontaktní arch → social/reels/out/ (gitignored)
npm run reels:render -- <slug> --frame 9.8       # jeden snímek
npm run reels:render -- <slug>                   # MP4 + plakát → assets/social/reels/
npm run brand:maskot                             # tvář, logo a modelový list → assets/brand/maskot/
```

| Soubor | Co dělá |
|---|---|
| `render.js` | CLI: validace, náhledy, enkódování (resvg → ffmpeg, AAC, loudnorm −15 LUFS) |
| `lib/styles.js` | volba stylu podle `script.style` (kompik · florence) |
| `lib/scene.js` | styl „Kompík vysvětluje": scénář → časová osa → SVG snímek; zvuk; validátor |
| `lib/florence-scene.js` | styl „Florence komentuje": titulky po kouscích, lampa, číslo; zvuk; validátor |
| `lib/facts.js` | společná faktová kázeň (citace z článku, žádné nedoložené číslo) |
| `lib/speech.js` | slabiky, časování řeči, lip-sync |
| `lib/audio.js` | syntéza: podkres, žvatlání, efekty, zápis WAV |
| `lib/anim.js` | easingy, tweeny, mrkání, deterministický šum |
| `lib/text.js` | fonty a přesné měření textu (zalamování bublin) |
| `lib/palette.js` | paleta (červená jen na střelce) |
| `characters/kompik.js` | maskot Kompík (póza, emoce, střelka, ruce) |
| `characters/cast.js` | vedlejší postavičky (role) |
| `characters/florence.js` | Florence, AI autorka (nálady, gesta, lampa, odznak AI) |
| `scripts/<slug>.json` | scénáře videí |
| `fonts/` | statické řezy Inter (OFL) — resvg neumí váhy variabilního fontu |

Vše je deterministické a offline (žádné API, žádné samply) — stejný scénář dá
stejné video. Testy: `tests/reels-engine.test.js`.
