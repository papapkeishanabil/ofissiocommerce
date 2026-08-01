# Customer flow

Dokumen ini merangkum flow customer yang sudah tersedia di staging MVP.

## Browse product

1. Customer membuka `/catalog`.
2. Produk yang tampil harus memiliki data produk lengkap dan GLB valid.
3. Produk KK-006 membuka `/product/kemeja-kantor-kk-006`.
4. Tombol `Preview 3D & Bordir Logo` membuka konfigurator 3D.

## Logo dan bordir

1. Customer memilih zona bordir.
2. Customer upload logo jika role mengizinkan:
   - `company_admin`
   - `purchasing`
3. Role `viewer`, `approver`, dan `finance` tidak boleh upload logo.
4. File tersimpan private dan hanya diakses melalui signed URL.
5. Placement logo ikut tersimpan ke cart, quotation, dan order.

## Quotation

1. Customer memilih quantity minimal MOQ.
2. Customer request quotation.
3. Sistem menyimpan quotation dan mengirim email foundation/mock.
4. Customer membuka `/quotes/[id]`.
5. Customer hanya melihat data aman:
   - item;
   - harga final jika sudah quoted;
   - status;
   - PDF quotation jika tersedia.
6. Internal notes, sales notes, storage key, dan raw provider data tidak tampil ke customer.
7. Customer dapat accept/reject/request revision sesuai status.

## Harga quantity

1. Product detail menampilkan tier harga jika data tersedia.
2. Quantity dihitung dari total seluruh ukuran; S 20 + M 30 + L 50 berarti 100 pcs.
3. Harga dan subtotal diperbarui saat size matrix berubah.
4. Cart menampilkan tier aktif dan jumlah menuju tier berikutnya yang lebih murah.
5. Checkout/quotation menghitung ulang server-side. Jika pricing nonaktif atau tidak ada tier cocok, harga regular WooCommerce dipakai.
6. Harga quotation tetap menunggu review final admin.

## Order dan payment

1. Setelah quotation accepted, admin convert ke order.
2. Customer membuka `/orders/[id]`.
3. Payment panel menampilkan status payment dan link/placeholder yang aman.
4. Di staging, payment memakai mock.
5. Return page payment tidak menandai order paid.
6. Paid status hanya melalui callback/complete flow yang tervalidasi.

## Tracking dan shipment

1. Setelah payment/order diproses, customer melihat tracking customer-friendly.
2. Process order task internal tidak tampil mentah ke customer.
3. Replenishment internal tidak tampil ke customer.
4. Shipment manual menampilkan provider, resi, tracking URL, dan status jika tersedia.
5. Ofistant boleh menjawab status/resi hanya dari data shipment/tracking yang ada.

## Mobile

Customer route utama harus tetap responsif tanpa horizontal overflow:

- `/catalog`
- `/product/kemeja-kantor-kk-006`
- `/quote`
- `/quotes/[id]`
- `/orders/[id]`

Pada produk yang mendukung bordir, customer melihat **Harga Bordir Estimasi** dari master global yang difilter berdasarkan zona produk. Setelah memilih placement pada configurator 3D, product detail dan cart menampilkan subtotal produk A5, line bordir per zona, setup fee hanya bila diaktifkan, serta total estimasi. Zona nonaktif, hilang, atau tidak didukung tidak diberi harga rekaan dan dijelaskan dengan aman.

## Checkpoint commercial A6

Flow staging tervalidasi dengan JAKET TEST A3: customer mencari produk Mining, membuka gallery dan canvas 3D, mengisi S 20 + M 30 + L 50, memilih Dada Kiri serta Punggung Tengah, lalu menambahkan estimasi Rp15.800.000 ke cart. Request quotation menghitung ulang harga server-side. Detail hasil lengkap tersedia di [final-commercial-flow-e2e.md](final-commercial-flow-e2e.md).
