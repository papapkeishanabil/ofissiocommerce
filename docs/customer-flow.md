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

