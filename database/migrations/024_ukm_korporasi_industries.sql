-- Reconstructed from catalog-taxonomy.defaults.ts at commit d1b7c33.
-- Requires public.industries from schema.sql / migration 010.
-- Review and test in an isolated database before applying to production.
-- WooCommerce products, categories, attributes and media are not modified.

begin;

insert into public.industries (
  id, name, slug, description, active, synonyms, sort_order
) values
  ('industry-bengkel', 'Bengkel', 'bengkel', 'Seragam bengkel motor, mobil, dan toko sparepart.', true, array['bengkel','bengkel motor','bengkel mobil','workshop','montir'], 200),
  ('industry-grosir', 'Grosir', 'grosir', 'Seragam pegawai toko grosir dan distributor.', true, array['grosir','toko grosir','grosir sembako','distributor'], 210),
  ('industry-laundry', 'Laundry', 'laundry', 'Seragam staf laundry dan cuci kiloan.', true, array['laundry','laundry kiloan','cuci kiloan','dry clean'], 220),
  ('industry-salon', 'Salon', 'salon', 'Seragam barbershop, salon, dan layanan kecantikan.', true, array['salon','barbershop','barber','salon kecantikan'], 230),
  ('industry-bangunan', 'Bangunan', 'bangunan', 'Seragam toko bangunan dan material.', true, array['toko bangunan','bangunan','material bangunan'], 240),
  ('industry-sparepart', 'Sparepart', 'sparepart', 'Seragam staf toko sparepart.', true, array['sparepart','spare part','toko sparepart','undercarriage'], 250),
  ('industry-petshop', 'Petshop', 'petshop', 'Seragam staf pet shop dan pet store.', true, array['pet shop','petshop','pet store','hewan'], 260),
  ('industry-maritim', 'Maritim', 'maritim', 'Seragam maritim, pelabuhan, dan awak kapal.', true, array['maritim','laut','kapal','pelabuhan','abk','awak kapal'], 290)
on conflict (slug) do nothing;

-- Existing rows and administrator edits are preserved on a repeated run.
commit;
