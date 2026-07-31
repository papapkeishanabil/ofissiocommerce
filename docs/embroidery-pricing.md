# Embroidery Pricing per Zone

Task A4 menempatkan pengaturan harga bordir di Ofissio Admin dan menyimpan sumber datanya pada WooCommerce product meta. WooCommerce tetap menjadi product source, sedangkan kalkulasi B2B dilakukan Ofissio agar cart, quotation, Ofistant, dan order sync memakai hasil yang sama.

## Zona yang tersedia

| Zone ID | Label | Harga default |
| --- | --- | ---: |
| `left_chest` | Dada Kiri | Rp5.000/pcs |
| `right_chest` | Dada Kanan | Rp5.000/pcs |
| `left_sleeve` | Lengan Kiri | Rp6.000/pcs |
| `right_sleeve` | Lengan Kanan | Rp6.000/pcs |
| `upper_back` | Punggung Atas | Rp10.000/pcs |
| `center_back` | Punggung Tengah | Rp15.000/pcs |

Nilai legacy `back` dan `middle_back` dinormalisasi ke `center_back`. Viewer 3D lama tetap memakai kontraknya sendiri dan tidak perlu diubah.

## Product meta

- `embroidery_pricing_enabled`: boolean.
- `embroidery_pricing_mode`: `flat_per_piece`.
- `embroidery_pricing`: JSON array zona.

Setiap zona menyimpan `zoneId`, `label`, `enabled`, `maxWidthCm`, `maxHeightCm`, `unitPrice`, `setupFee`, `pricingMode`, `showSetupFee`, dan `notes`.

## Formula

```text
zone subtotal = total quantity × unitPrice + setupFee
embroidery total = jumlah seluruh zone subtotal
estimated total = product subtotal A5 + embroidery total
```

Total quantity berasal dari seluruh size matrix. Setup fee default `0`; jika `0`, fee tidak ditampilkan dan tidak dibuat sebagai line terpisah. Jika lebih dari `0`, fee ditambahkan satu kali untuk zona tersebut dan ditampilkan eksplisit.

## Cara admin mengatur

1. Buka `/admin/products/new` atau `/admin/products/woocommerce/[id]`.
2. Aktifkan dukungan Bordir dan pilih zona pada section Customization.
3. Buka **Harga Bordir per Zona**.
4. Aktif/nonaktifkan zona, isi batas ukuran, harga per pcs, setup fee opsional, dan catatan.
5. Klik **Validasi Harga Bordir**.
6. Pada edit product, klik **Simpan Harga Bordir**. Create/update utama juga menyimpan field yang sama.

Unit price, lebar, dan tinggi zona aktif wajib lebih dari nol. Setup fee tidak boleh negatif. Pricing invalid ditolak client dan server.

## Customer, cart, dan quotation

Product detail menampilkan harga zona sebagai estimasi. Setelah customer menyimpan placement dari configurator 3D, calculator membaca zona unik dan quantity size matrix. Cart menyimpan pricing snapshot, lines, missing zones, customization total, dan final estimated total.

Quotation menyimpan original embroidery breakdown. Admin dapat override unit price dan setup fee per zona; server menghitung ulang total dan mencatat audit pricing. Zona tanpa pricing tetap boleh diajukan, tetapi ditandai perlu konfirmasi admin.

## Ofistant

Ofistant hanya menjawab dari `embroideryPricing` produk valid. Pertanyaan seperti `100 pcs jaket tambang bordir dada kiri dan punggung tengah` menghitung product tier A5 serta dua zona A4. Jika zona tidak punya harga, Ofistant menyatakan perlu konfirmasi admin dan tidak mengarang angka.

## Troubleshooting

- **Harga tidak muncul:** pastikan `supports_embroidery=true`, pricing enabled, dan meta `embroidery_pricing` berisi zona.
- **Zona tidak aktif:** aktifkan zona pada pricing dan pada field zona bordir produk.
- **Unit price kosong/0:** zona enabled harus memiliki harga lebih dari nol.
- **Pricing invalid:** gunakan tombol validasi; periksa ukuran maksimum dan setup fee negatif.
- **Harga perlu konfirmasi admin:** placement dipilih tetapi tidak memiliki zona pricing enabled.
- **Harga quotation berbeda:** admin dapat melakukan override sebelum quotation dikirim; original calculation tetap tersimpan.

## Security

Endpoint khusus `PATCH /api/admin/products/woocommerce/[id]/embroidery-pricing` memakai internal guard, RBAC `admin:catalog:update`, rate limit, validasi Zod, safe error, dan audit log. Customer tidak dapat menulis product meta.
