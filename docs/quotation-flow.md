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
