-- Industry vocabulary sync for the remaining drifted rows (migration 033).
-- Same drift as 032 (logistics): live `industries` rows were seeded from
-- migration 010 and never received the aliases later added to the code
-- defaults (catalog-taxonomy.defaults.ts), so Ofistant/catalog queries using
-- those aliases — e.g. "seragam perhotelan", "seragam BUMN", "seragam
-- minimarket" — never resolved an industry filter.
-- Idempotent: union keeps existing admin-added synonyms; safe to re-run.

update public.industries as industry
set synonyms = (
      select coalesce(array_agg(distinct alias), '{}'::text[])
      from unnest(array_cat(industry.synonyms, missing.aliases)) as alias
    ),
    updated_at = now()
from (
  values
    ('hospitality',    array['perhotelan']::text[]),
    ('government',     array['bumn', 'bumdes', 'pemda']),
    ('education',      array['universitas', 'akademik', 'kuliah']),
    ('healthcare',     array['apotek', 'apotik', 'health care']),
    ('retail',         array['minimarket', 'kelontong', 'dept store', 'department store']),
    ('food-beverage',  array['barista', 'kedai', 'warung makan', 'food and beverage'])
) as missing(slug, aliases)
where industry.slug = missing.slug;
