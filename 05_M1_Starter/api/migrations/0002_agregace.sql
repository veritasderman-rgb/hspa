-- 0002_agregace.sql — view s agregáty odpovědí (balíček P2.4).
--
-- Řádek = jedna hodnota jedné otázky v jedné sadě a kolikrát byla zvolena.
-- `odpovedi` je objekt { otazka_id: hodnota | [hodnoty] }:
--   - skalár (radio, otevřený text) se bere jako jedna hodnota,
--   - pole (zaškrtávací políčka) se rozbalí na jednu hodnotu na prvek.
-- Klíče s doplňkovým textem ("<otazka>_upresneni") se do agregátu nepočítají:
-- jsou to volné texty, nikdy se nezveřejňují jako sloupce grafu.
-- Do veřejného JSON se dostanou jen otázky s nabídkou (`moznosti`) a hodnoty
-- z nabídky — filtruje api/_dotaznik-agregace.js podle definice sady.

create or replace view dotaznik_agregace as
select
  o.sada_id,
  e.key         as otazka_id,
  v.hodnota     as hodnota,
  count(*)::int as pocet
from dotaznik_odpoved o
cross join lateral jsonb_each(o.odpovedi) as e(key, value)
cross join lateral jsonb_array_elements_text(
  case when jsonb_typeof(e.value) = 'array' then e.value else jsonb_build_array(e.value) end
) as v(hodnota)
where jsonb_typeof(o.odpovedi) = 'object'
  and e.key not like '%\_upresneni'
group by o.sada_id, e.key, v.hodnota;
