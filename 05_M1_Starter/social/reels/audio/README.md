# social/reels/audio — hudba a efekty ze souboru

Sdílená zvuková knihovna mluvených videí (ElevenLabs Music a Sound Effects). Soubory
jsou v gitu, render zůstává offline. Scénář na ně odkazuje poli `music` (podkres)
a `beats[].sfx` (efekt v čase). Hudba je mono MP3 96 kb/s, ať repo nebobtná.

| Soubor | Co to je | Prompt (ElevenLabs) |
|---|---|---|
| `music/hrava-pizzicato.mp3` | hravý podkres pro Kompíka a dialogy, 45 s, 108 BPM, bez zpěvu (ověřeno přepisem Scribe: prázdný) | „Instrumental background bed for a short animated explainer video. Playful and curious, light pizzicato strings, soft marimba and ukulele, gentle brushed percussion, 108 BPM, C major, steady and unobtrusive so a voiceover sits on top, no vocals, no big build-ups, loopable, 45 seconds.“ |
| `sfx/record-scratch.mp3` | „počkat!“ — skřípnutí desky při vstupu oponenta, 1 s | „Short comedic record scratch, vinyl needle scratch stopping the music abruptly, dry, close, one second“ |

Nový soubor = řádek v této tabulce (prompt, délka, k čemu je). Podkres vždy ověř
přepisem (Speech to Text): text musí vyjít prázdný, jinak je v něm zpěv.
