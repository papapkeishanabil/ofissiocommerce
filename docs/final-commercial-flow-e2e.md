# Final Commercial Flow E2E

Checkpoint Task A6 pada 1 Agustus 2026 memvalidasi alur staging dari katalog sampai order tanpa mengaktifkan payment, email, shipping, atau WooCommerce order write secara live.

## Produk test

- Produk: **JAKET TEST A3** (`JAK-A3-001`, WooCommerce product `#18`).
- Status: published dan valid untuk Ofissio, tanpa blocking issue.
- Taxonomy: kategori Jaket; industri Mining dan Corporate.
- Media: satu foto utama dan dua foto gallery dari WordPress Media Library.
- 3D: GLB private dari Supabase Storage, diakses melalui signed URL yang dapat diperbarui.
- MOQ 20 pcs, lead time 14 hari, mendukung bordir `left_chest` dan `center_back`.

## Expected pricing dan cart

Skenario menggunakan size matrix S 20, M 30, dan L 50, sehingga totalnya 100 pcs.

| Komponen | Perhitungan | Total |
| --- | ---: | ---: |
| Produk, tier 100–299 | 100 × Rp138.000 | Rp13.800.000 |
| Dada Kiri | 100 × Rp5.000 | Rp500.000 |
| Punggung Tengah | 100 × Rp15.000 | Rp1.500.000 |
| Bordir | dua zona, setup fee Rp0 | Rp2.000.000 |
| Estimasi akhir | produk + bordir | **Rp15.800.000** |

Cart staging menampilkan tier, kedua line bordir, subtotal bordir, total akhir, serta action Request Quotation. Cart snapshot memuat identitas produk, source/sourceId, SKU, model 3D, zona terpilih, quantity pricing, embroidery pricing/lines, dan total final.

## Quotation dan admin override

Smoke record `OF-QUO-20260801-96202DA4` dibuat dengan total awal Rp15.800.000. Quotation menyimpan size matrix, quantity tier, kedua zona, calculated price, dan pricing snapshot.

Admin mengubah status ke `under_review`, menambah internal note, lalu mengubah harga Dada Kiri menjadi Rp5.500/pcs. Harga original Rp5.000 tetap berada dalam snapshot, sedangkan breakdown final menjadi:

- produk Rp13.800.000;
- Dada Kiri Rp550.000;
- Punggung Tengah Rp1.500.000;
- total final **Rp15.850.000**.

Quotation kemudian ditandai `quoted` dan pengiriman customer tercatat melalui email provider mock.

## Customer accept dan convert to order

Customer berhasil menerima quotation. Reload tidak menggandakan event `customer_accepted`, dan internal note tidak terlihat pada response customer.

Konversi menghasilkan order `OF-QUO-96202DA4-DD33FA` dengan final product pricing, quantity tier, customization Rp2.050.000, pricing snapshot, dan quotation ID. Percobaan konversi kedua mengembalikan order yang sama (`idempotent=true`). Karena `WOOCOMMERCE_SYNC_ORDERS=false`, WooCommerce write tetap disabled dan tidak dianggap error.

## Notification dan email

Satu notification `order_created` dibuat untuk order tersebut. Sidebar Orders badge dan sticky popup menampilkannya tanpa auto-dismiss. Action **Saya Proses** mengubah status menjadi `acknowledged`; popup hilang dan counter turun ke nol. Notification tetap tersedia pada center `/admin/notifications` sebagai sudah diproses.

Email internal memiliki satu mock email log. Retry konversi tidak menggandakan notification atau email.

## Snapshot consistency

Master Dada Kiri sementara dinaikkan dari Rp5.000 menjadi Rp6.000. Quotation lama tetap menyimpan calculated snapshot Rp5.000 dan final override Rp5.500. Setelah smoke, master dikembalikan ke Rp5.000. Dengan demikian perubahan master hanya berlaku untuk kalkulasi baru.

## Ofistant

Pertanyaan `100 pcs jaket tambang bordir dada kiri dan punggung tengah berapa?` menghasilkan JAKET TEST A3, tier Rp138.000/pcs, Dada Kiri Rp5.000/pcs, Punggung Tengah Rp15.000/pcs, total Rp15.800.000, dan penjelasan bahwa harga final mengikuti quotation admin.

## Fallback dan keamanan

- Quantity di luar tier memakai regular price tanpa crash.
- Zona tidak didukung tidak dihitung.
- Zona tanpa master aktif masuk daftar harga yang perlu dikonfirmasi; sistem tidak mengarang harga.
- Missing image tetap menggunakan placeholder dan bukan blocking issue.
- Resolver GLB menghasilkan signed URL baru; kegagalan GLB ditangani error boundary.
- Anonymous/customer ditolak dari API admin, role tanpa permission mendapat 403, dan customer beda company mendapat 404.
- Secret tetap server-side dan `.env.local` tidak boleh di-track.

## Known limitations

- Auth customer dan admin masih mock.
- Email masih mock; iPaymu, shipping provider, dan WooCommerce order write live belum aktif.
- Browser test memerlukan akses jaringan ke domain Supabase agar signed GLB dapat dimuat; dengan akses staging, canvas dan console lulus.
- Harga final tetap memerlukan review quotation admin.

## Checklist sebelum payment/iPaymu

1. Aktifkan auth production dan mapping role database.
2. Verifikasi domain/sender email, lalu smoke Resend di staging.
3. Isi credential iPaymu melalui secret manager dan uji signature callback sandbox.
4. Pertahankan idempotency quotation, order, notification, email, dan payment callback.
5. Jalankan kembali seluruh command A6 serta browser smoke desktop/mobile.
