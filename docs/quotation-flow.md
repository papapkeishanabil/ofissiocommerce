# Quotation Flow

## Harga quantity

Quotation request tidak mempercayai harga dari browser. Server mengambil ulang produk dari product service, menjumlahkan seluruh size matrix, memilih quantity tier, lalu menyimpan:

- total quantity;
- regular price;
- calculated/final unit price awal;
- label tier;
- pricing basis dan mode;
- subtotal line.

Admin melihat original calculated price dan dapat mengisi override/final unit price. Event `pricing_updated` dan audit log mencatat jumlah item yang di-override. Setelah quotation disetujui dan dikonversi, order serta WooCommerce sync memakai harga final admin, bukan menghitung tier ulang.

Lihat [quantity-pricing.md](quantity-pricing.md) untuk format tier dan fallback.

## Breakdown bordir Task A4

Quotation item mengambil ulang master harga bordir global di server, memfilternya dengan zona yang didukung produk, lalu menyimpan selected zones, pricing snapshot, calculated embroidery lines, embroidery total, missing pricing zones, customization total, dan final estimated total. Admin pricing editor dapat override unit price serta setup fee per zona. Original calculated embroidery price disertakan pada event/audit pricing; WooCommerce order sync menerima final line total dan meta breakdown dari Ofissio.

Lihat [embroidery-pricing.md](embroidery-pricing.md) untuk format zona, setup fee, dan fallback konfirmasi admin.

## Checkpoint A6: snapshot dan override

Quotation test 100 pcs menyimpan calculated total Rp15.800.000. Override admin hanya mengubah Dada Kiri dari Rp5.000 menjadi Rp5.500/pcs sehingga final menjadi Rp15.850.000; calculated snapshot tetap Rp5.000. Customer accept bersifat idempotent, dan convert kedua mengembalikan order yang sama tanpa notification/email duplikat. Perubahan master setelah quotation dibuat tidak menghitung ulang histori.
