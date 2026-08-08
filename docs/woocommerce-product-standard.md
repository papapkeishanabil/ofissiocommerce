# WooCommerce Ofissio Product Standard

WooCommerce Ofissio adalah sumber resmi untuk data katalog commerce: produk,
foto, kategori, harga dasar, SKU, variasi ukuran, dan stok internal. OfissioCommerce
tetap menangani pengalaman B2B, quotation, order, invoice, payment, shipping,
tracking, dan admin workbench.

## Struktur produk wajib

Gunakan satu **variable product** untuk satu model seragam.

| Elemen | Standar Ofissio |
| --- | --- |
| Parent product | Satu model, misalnya Kemeja Kantor KK-006 |
| Parent SKU | Kode model unik, misalnya `KK-006` |
| Product type | `Variable product` |
| Attribute | `Ukuran`, centang **Used for variations** |
| Variation | Satu variation untuk setiap ukuran yang dijual |
| Manage stock | Aktif per variation, bukan mengandalkan parent |
| Stock quantity | Diisi per variation, termasuk angka `0` |
| Price | Harga dasar parent wajib lebih dari nol |
| Image | Minimal satu foto utama; foto berikutnya menjadi gallery |
| Category | Minimal satu kategori WooCommerce |

Produk tanpa warna menggunakan SKU berikut:

```text
Parent: KK-006
KK-006-S
KK-006-M
KK-006-L
KK-006-XL
```

Jika warna menjadi variation, urutannya selalu kode model, warna, lalu ukuran:

```text
TG-055-CAMEL-M
TG-055-KHAKI-L
```

Gunakan huruf kapital, tanda hubung, dan SKU unik. Nama produk tidak digunakan
sebagai matching key stok. WooCommerce product/variation ID hanya mapping teknis.

## Checklist membuat produk

1. Buat atau edit produk melalui Ofissio Admin **Produk**.
2. Isi nama, Parent SKU, harga dasar, kategori, foto utama, dan metadata Ofissio.
3. Di WooCommerce, set product type menjadi **Variable product**.
4. Buat atribut **Ukuran**, aktifkan `Visible on product page` dan
   `Used for variations`.
5. Tambahkan opsi ukuran, misalnya `S`, `M`, `L`, `XL`.
6. Generate variation, lalu isi SKU sesuai format Parent SKU + ukuran.
7. Aktifkan **Manage stock** dan isi stock quantity pada setiap variation.
8. Isi low stock threshold per variation jika berbeda dari default Ofissio.
9. Periksa readiness produk di `/admin/products`.
10. Periksa matriks stok di detail produk admin.

## Product readiness

Produk baru dapat tampil di katalog customer jika seluruh syarat blocking ini
terpenuhi:

- status WooCommerce `publish`;
- Parent SKU tersedia;
- harga dasar tersedia;
- minimal satu foto utama;
- minimal satu kategori;
- MOQ lebih dari nol;
- lead time tersedia;
- fulfillment type valid;
- transaction mode valid;
- minimal satu industry;
- model GLB lengkap dan valid untuk produk yang menggunakan viewer 3D;
- jika `supports_embroidery=true`, minimal satu embroidery zone tersedia.

Foto gallery tambahan, deskripsi panjang, bahan, dan warna tetap merupakan
penyempurnaan non-blocking. Produk lama yang belum menjadi variable product diberi
warning standardisasi; admin harus menyelesaikan variation SKU sebelum stoknya
dapat dipercaya untuk operasional.

## Sample KL-007 dan KK-006

Contract check Ofissio memakai dua sample berikut:

```text
KL-007-S  KL-007-M  KL-007-L  KL-007-XL
KK-006-S  KK-006-M  KK-006-L  KK-006-XL
```

Script tidak mengubah data WooCommerce live. Jika output menampilkan `LIVE WARN`,
perbaiki product type, atribut Ukuran, SKU variation, `manage_stock`, atau
`stock_quantity` melalui langkah di atas. Ini mencegah checker menebak stok atau
menimpa data warehouse yang sebenarnya.

## Verifikasi

```powershell
npm run check:woocommerce
npm run check:woocommerce-stock
npm run check:woocommerce-product-standard
```

`check:woocommerce-product-standard` selalu menguji contract sample secara lokal.
Jika koneksi WooCommerce aktif, script juga membaca KL-007/KK-006 secara read-only
dan melaporkan gap live tanpa melakukan mutation.
