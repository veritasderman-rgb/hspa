-- 0001_dotaznik.sql — tabulky pro dotazníky srovnávače pojišťoven (balíček P2.4).
--
-- Definice dotazníků zůstává v data/pojistovny-otazky.json (v repu, verzovaná).
-- Do databáze jdou jen odpovědi a hashe jednorázových tokenů.
-- Soukromí (GOVERNANCE § 2 bod 5): žádné osobní údaje, žádná IP adresa
-- (rate limit běží v paměti funkce), u adresných sad je respondentem
-- instituce (kód ZP / organizace), ne osoba.
--
-- Skript je idempotentní: lze ho pustit opakovaně.

create extension if not exists pgcrypto;  -- gen_random_uuid() i na starších verzích Postgresu

create table if not exists dotaznik_token (
  id             uuid primary key default gen_random_uuid(),
  token_hash     text not null unique,            -- sha256 (hex) tokenu; token samotný se neukládá
  sada_id        text not null,
  respondent_typ text not null check (respondent_typ in ('pojistovna', 'pacientska_organizace', 'verejnost')),
  respondent_kod text,                            -- kód ZP (111, 201, …) nebo zkratka organizace
  platny_do      timestamptz,                     -- null = bez omezení
  pouzit_at      timestamptz,                     -- null = zatím nepoužit
  vytvoren_at    timestamptz not null default now()
);

create table if not exists dotaznik_odpoved (
  id             uuid primary key default gen_random_uuid(),
  sada_id        text not null,
  sada_verze     text not null,
  respondent_typ text not null check (respondent_typ in ('pojistovna', 'pacientska_organizace', 'verejnost')),
  respondent_kod text,                            -- u veřejnosti vždy null
  odpovedi       jsonb not null,                  -- { "otazka_id": "hodnota" | ["hodnota", …] }
  odeslano_at    timestamptz not null default now(),
  token_id       uuid references dotaznik_token (id)
);

create index if not exists dotaznik_odpoved_sada_odeslano_idx
  on dotaznik_odpoved (sada_id, odeslano_at);

create index if not exists dotaznik_token_sada_idx
  on dotaznik_token (sada_id);
