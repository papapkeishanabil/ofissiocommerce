-- Ofistant/catalog industry vocabulary sync (migration 032).
-- Problem: the live `industries` row for Logistics drifted behind the code
-- defaults — the singular English form "logistic" and the aliases
-- "ekspedisi"/"pengiriman"/"cargo kecil" were missing, so queries like
-- "kemeja untuk logistic" never resolved the Logistics industry filter
-- (Ofistant answered as if no products existed).
-- Idempotent: union keeps existing admin-added synonyms; safe to re-run.

update public.industries
set synonyms = (
  select coalesce(array_agg(distinct alias), '{}'::text[])
  from unnest(array_cat(
    synonyms,
    array['logistic', 'ekspedisi', 'pengiriman', 'cargo kecil']
  )) as alias
),
updated_at = now()
where slug = 'logistics';
