# Manuální ZPP data

Soubory `{payer_code}-{year}.json` slouží jako **fallback** pro ZPP PDF parser.
Když PDF download selže (offline prostředí, změněná URL) nebo parser nedokáže
spolehlivě extrahovat tabulku, `ingest/fetchers/zpp_pdf.js` použije tyto JSONy.

## Struktura

```json
{
  "payer": "111",
  "payer_name": "VZP",
  "year": 2024,
  "origin": "manual",
  "parsed": true,
  "source_note": "...",
  "total_tis_kc": 290000000,
  "segments": {
    "luzkova":       163000000,
    "ambulantni":     65000000,
    "stomatologie":    9500000,
    "leky":           29000000,
    "prostredky":      7000000,
    "lazne":           4500000,
    "doprava_zzs":     5500000,
    "ostatni":         6500000
  }
}
```

## Segmenty

Klíče v `segments` musí odpovídat `id` v `ingest/mapping/zpp_segments.json`.
Hodnoty jsou v **tisících Kč** (typicky odpovídá agregátu „ZFZP — výdaje na
zdravotní služby" v ZPP).

## Kódy pojišťoven

| Kód | ZP |
|-----|-----|
| 111 | VZP ČR |
| 201 | VoZP |
| 205 | ČPZP |
| 207 | OZP |
| 209 | ZPŠ |
| 211 | ZP MV ČR |
| 213 | RBP |
