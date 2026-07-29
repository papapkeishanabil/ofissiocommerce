# Fulfillment, Customization & Production Flow

## Sales Order vs Process Order

Sales Order / Commerce Order adalah transaksi customer. Process Order adalah dokumen kerja internal untuk menjalankan transaksi tersebut.

## Fulfillment Order

Dipakai untuk produk standar tanpa custom.

Flow:

1. Picking
2. Packing
3. Ready to ship
4. Shipped
5. Completed

## Customization Order

Dipakai untuk produk standar dengan logo, bordir, sablon, DTF, atau nama.

Flow:

1. Pull stock
2. Artwork check
3. Embroidery / print / name
4. QC custom
5. Packing
6. Ready to ship

## Production Order / SPK Produksi

Dipakai untuk custom design, model khusus, bahan khusus, atau desain khusus.

Flow:

1. Design approval
2. Material prep
3. Cutting
4. Sewing
5. Embroidery / print
6. Finishing
7. QC
8. Packing
9. Ready to ship

## Kapan dibuat

- Produk standar tanpa custom → Fulfillment Order.
- Produk standar + logo/bordir/sablon/nama → Customization Order.
- Custom design/model/bahan/desain khusus → Production Order / SPK.

## Customer stock behavior

Produk standar tidak menampilkan “out of stock” ke customer. Jika stok internal kurang, admin melihat `replenishment_status = needed`, lalu replenishment ditangani sebagai proses internal.

## Tracking customer-friendly

Customer hanya melihat status sederhana, bukan detail task internal:

- Order sedang diproses
- Pesanan masuk proses custom
- Pesanan masuk persiapan produksi
- Pesanan sedang dikemas
- Pesanan siap dikirim
