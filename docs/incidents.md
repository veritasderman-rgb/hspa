# Registr incidentů

> Co se dostalo ke čtenáři a nemělo (GOVERNANCE.md § 9). Záznam do 24 hodin pro S1
> a S2, píše ho editor nebo porada, nikdy autorka incidentu. S3 (kosmetika) sem
> nepatří — opraví se v další rutině bez záznamu.
>
> Závažnost: **S1** poškození osoby nebo zdravotní riziko · **S2** publikovaný věcný
> omyl (číslo, tvrzení, zdroj, poškozená stránka) · **S3** drobnost.
>
> Nejnovější nahoře. Číslování `INC-RRRR-NNN`.

## Šablona

```markdown
## INC-RRRR-NNN · S? · RRRR-MM-DD · {krátký název}
- **Co se stalo**: jedna věta, co viděl čtenář.
- **Kde**: soubor / URL · **Od kdy do kdy**: publikováno … → opraveno … (doba expozice)
- **Dopad**: kolik stránek/čtenářů (z GA4, pokud je), zda šlo o osobu nebo zdravotní informaci.
- **Příčina**: proč to prošlo (která kontrola chyběla nebo selhala).
- **Oprava**: PR #… · revert / oprava / doplnění zdroje.
- **Prevence**: test / validátor / pravidlo, které to příště zachytí (PR #…), nebo „bez změny pravidel — proč".
- **Zjistil**: editor / čtenář / vnější audit / drift-check.
```

---

## INC-2026-002 · S2 · 2026-07-10 · Tři publikované články se renderovaly prázdné

- **Co se stalo**: tři články (`cmp-iktova-centra`, `cekaci-doby-kycel`, `platba-za-vysledek-vzp`)
  se čtenáři zobrazovaly bez textu.
- **Kde**: `05_M1_Starter/clanek-*.html` · **Od kdy do kdy**: neznámo → 2026-07-10 (zjištěno
  při link-auditu F1).
- **Dopad**: tři publikované články, bez osob a bez zdravotního rizika.
- **Příčina**: neuzavřený HTML komentář `<!-- audit:` v hlavičce souboru pohltil celý
  obsah; žádný test strukturu komentářů nekontroloval.
- **Oprava**: PR #761 (uzavření komentářů).
- **Prevence**: strukturální test HTML (`tests/html-structure.test.js`) a drift testy
  nad artefakty; auditní poznámky patří do uzavřeného komentáře podle `CLAUDE.md`.
- **Zjistil**: vnitřní audit (F1), ne čtenář.

## INC-2026-001 · S2 · 2026-06 · Duplicitní redakční čísla článků

- **Co se stalo**: v korpusu bylo 18 dvojic článků se stejným redakčním číslem.
- **Kde**: `05_M1_Starter/data/articles.json` · **Od kdy do kdy**: postupně od jara 2026
  → oprava se zavedením přidělování čísla až při publikaci.
- **Dopad**: zavádějící číslování pro čtenáře a archiv; bez osob a bez zdravotního rizika.
- **Příčina**: dva PR z jedné noci si vzaly totéž `max+1`; po „vezmi obojí" při konfliktu
  zůstaly duplicity; validátor duplicitu nehlídal.
- **Oprava**: přečíslování + `assignPublicationNumber` v publikačním cronu.
- **Prevence**: `validate:articles` odmítá duplicitní číslo i publikovaný článek bez
  čísla; drafty číslo nenastavují (`CLAUDE.md` → Publikační fronta).
- **Zjistil**: vnitřní audit.
