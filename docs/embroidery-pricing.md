# Global Embroidery Pricing Master

Harga bordir Ofissio adalah master global, bukan harga per produk. Supabase table `embroidery_pricing_zones` menjadi source of truth untuk enam zona: `left_chest`, `right_chest`, `left_sleeve`, `right_sleeve`, `upper_back`, dan `center_back`.

## Operasional admin

1. Jalankan migration `database/migrations/011_global_embroidery_pricing.sql` satu kali melalui Supabase SQL Editor.
2. Buka `/admin/pricing/embroidery` atau menu **Harga Bordir**.
3. Atur status aktif, batas ukuran, harga per pcs, setup fee, serta catatan.
4. Aktifkan **Terapkan setup fee** hanya bila setup fee memang harus masuk kalkulasi.
5. Simpan master. Perubahan berlaku untuk transaksi baru; cart dan quotation menyimpan snapshot agar histori tidak berubah.

Role `super_admin` dan `product_admin` dapat mengubah master. Role internal lain yang memiliki `admin:catalog:view` hanya dapat melihat. Endpoint mutasi dilindungi RBAC, rate limit, Zod validation, safe error response, dan audit `embroidery_pricing_updated`/`embroidery_pricing_update_failed`.

## Kontrak produk

Produk hanya menyimpan `supports_embroidery` dan `embroidery_zones`. Form produk tidak menyimpan harga per zona. Metadata WooCommerce lama `embroidery_pricing*` tidak dihapus, tetapi hanya ditampilkan sebagai peringatan kompatibilitas dan tidak pernah digunakan sebagai sumber hitung.

## Rumus

Untuk setiap zona aktif yang didukung produk:

```text
zone subtotal = total qty × unit price + setup fee (hanya jika show_setup_fee=true)
embroidery total = jumlah seluruh zone subtotal
estimated total = product subtotal + embroidery total
```

Zona tidak didukung, nonaktif, atau tidak ditemukan tidak diberi harga rekaan. UI/Ofistant menjelaskan bahwa zona tidak tersedia atau memerlukan konfirmasi.

## Integrasi

- Public safe read: `GET /api/customization/embroidery-pricing` (hanya zona aktif, tanpa informasi storage/secret).
- Admin read/write: `GET|PATCH /api/admin/pricing/embroidery`.
- Product detail memfilter master berdasarkan zona produk.
- Cart dan checkout menghitung ulang dari master lalu menyimpan snapshot.
- Quotation menyimpan snapshot dan tetap mendukung admin override.
- Ofistant memakai master yang sama dan menolak zona yang tidak didukung produk.

## Test

Jalankan `npm run test:embroidery-pricing`. Test mencakup multi-zona, setup fee aktif/nonaktif, zona tidak didukung, harga hilang, parsing metadata legacy, dan readiness non-blocking.
