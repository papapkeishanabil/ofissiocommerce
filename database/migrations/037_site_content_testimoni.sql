-- Section testimoni (§08) — kartu kutipan ulasan marketplace.
-- Registri kode (content.schema.ts) sudah menerima key 'testimoni'; CHECK
-- constraint dari migrasi 025 masih mengenumerasi section lama sehingga
-- penyimpanan row baru akan ditolak. Constraint di-drop dan dibuat ulang
-- dengan 'testimoni' masuk daftar. Row yang ada tidak tersentuh.
--
-- Jalankan manual di Supabase SQL Editor (staging lalu produksi).

alter table site_content drop constraint site_content_section_check;

alter table site_content add constraint site_content_section_check check (section in (
  'hero','trust','bisnis_naik_kelas','industri','paket','bordir',
  'cara_order','korporasi','produk_pilihan','testimoni','cta'
));
