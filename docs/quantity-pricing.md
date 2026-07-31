# Quantity Pricing

Task A5 menambahkan harga per pcs bertingkat berdasarkan **total quantity seluruh ukuran**. Contoh S 20 + M 30 + L 50 dihitung sebagai 100 pcs dan memakai tier yang mencakup quantity 100.

## Sumber data

Admin mengatur tier dari Ofissio Admin agar operasional tetap satu pintu, sedangkan data canonical disimpan sebagai WooCommerce product meta:

- `quantity_pricing_enabled`: boolean, default `true`;
- `quantity_pricing_mode`: `fixed_unit_price`;
- `quantity_basis`: `total_order_qty`;
- `quantity_pricing_tiers`: JSON array.

Contoh:

```json
[
  { "minQty": 20, "maxQty": 49, "unitPrice": 150000, "label": "20-49 pcs" },
  { "minQty": 50, "maxQty": 99, "unitPrice": 145000, "label": "50-99 pcs" },
  { "minQty": 100, "maxQty": 299, "unitPrice": 138000, "label": "100-299 pcs" },
  { "minQty": 300, "maxQty": 499, "unitPrice": 130000, "label": "300-499 pcs" },
  { "minQty": 500, "maxQty": null, "unitPrice": 125000, "label": "500+ pcs" }
]
```

WooCommerce dapat mengembalikan meta sebagai JSON string maupun array/object yang sudah diparse. Mapper Ofissio menerima keduanya. JSON invalid tidak membuat aplikasi crash; tier menjadi kosong dan readiness menampilkan warning non-blocking.

## Cara admin mengisi

1. Buka `/admin/products/new` atau `/admin/products/woocommerce/[id]`.
2. Buka section **Harga & Diskon Quantity**.
3. Aktifkan harga quantity, lalu isi Min Qty, Max Qty, Harga / pcs, dan Label Tier.
4. Kosongkan Max Qty hanya pada tier terakhir.
5. Klik **Validasi Tier**. Overlap, harga nol, rentang terbalik, atau lebih dari satu tier tanpa batas akan ditolak.
6. Pada edit, klik **Simpan Harga Quantity**. Pada create, tier ikut tersimpan saat **Buat Produk**.

**Reset dari Harga Regular** membuat satu tier dari MOQ sampai tanpa batas dengan harga regular. Label kosong dibuat otomatis, misalnya `500+ pcs`.

## Kalkulasi

Sistem mencari tier dengan aturan `minQty <= totalQty` dan `maxQty == null || totalQty <= maxQty`. Jika cocok, `subtotal = totalQty × unitPrice tier`. Jika harga quantity nonaktif, tier kosong/invalid, atau tidak ada rentang yang cocok, sistem memakai `regular_price` WooCommerce.

Product detail dan cart menampilkan tier aktif serta hint tier berikutnya yang lebih murah. Checkout menghitung ulang server-side dari product service; harga kiriman browser tidak dipercaya.

## Cart dan quotation

Cart menyimpan snapshot `regularPrice`, `finalUnitPrice`, `quantityTierLabel`, `quantityPricingBasis`, `quantityPricingMode`, `quantityTierApplied`, `totalQty`, dan `subtotal`. Perubahan quantity per ukuran menghitung ulang tier dari total line.

Quotation request menghitung ulang dari product service, menyimpan original calculated price dan tier label, lalu memberi admin field override. Harga final tetap mengikuti review admin. Audit pricing menyimpan jumlah override dan original calculated price tanpa raw provider payload.

Saat order disinkronkan, WooCommerce menerima harga final Ofissio. Metadata order/line meliputi `ofissio_quantity_tier_label`, `ofissio_quantity_basis`, `ofissio_quantity_pricing_mode`, `ofissio_final_unit_price`, dan `ofissio_total_qty`. WooCommerce menjadi catatan transaksi, bukan kalkulator tier B2B.

## Ofistant

Ofistant hanya menjawab harga dari hasil catalog API server. Pertanyaan seperti `100 pcs jaket tambang` membaca produk aktif dan tier canonical. Jika tier tidak tersedia, jawabannya meminta konfirmasi admin dan tidak mengarang diskon. Semua nilai tetap disebut sebagai estimasi sampai quotation admin final.

## Troubleshooting

- **Harga tidak berubah:** pastikan pricing aktif, total quantity masuk rentang tier, dan simpan meta berhasil.
- **Tier overlap:** periksa bahwa Min Qty tier berikutnya lebih besar dari Max Qty sebelumnya.
- **Tier kosong:** tambah minimal satu tier atau nonaktifkan harga quantity untuk memakai harga regular.
- **MOQ tidak sama dengan tier:** MOQ tetap field terpisah. Readiness memberi warning jika tier pertama lebih tinggi dari MOQ.
- **Harga quotation berbeda:** admin dapat melakukan override; original calculated price dan tier tetap tersimpan untuk audit.

Validasi murni dapat dijalankan dengan `npm run test:quantity-pricing`.
