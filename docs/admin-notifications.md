# Admin notifications

Admin notifications adalah inbox operasional internal Ofissio. Task A6.1 mengaktifkan event `order_created` saat quotation berhasil dikonversi menjadi Ofissio order.

## Alur order baru

1. Konversi quotation menyimpan order dan tracking seperti sebelumnya.
2. Service membuat satu notification unik berdasarkan `type + entity_type + entity_id`.
3. Sidebar menghitung notification order berstatus `unread` atau `read`.
4. Sticky popup menampilkan maksimal tiga order `unread` terbaru dan tidak auto-dismiss.
5. Email internal dikirim atau dicatat mock jika fitur email order diaktifkan.

Retry konversi quotation mengembalikan order lama dan melakukan reconciliation notification. Unique index mencegah notification ganda. Email hanya diproses ketika notification masih `pending` dan belum memiliki `email_id`.

## Badge dan status

- `unread`: muncul di popup dan dihitung badge Orders.
- `read`: popup disembunyikan, tetapi tetap dihitung badge karena order belum diambil tim.
- `acknowledged`: admin menyatakan “Saya Proses”; popup dan badge berkurang.
- `resolved`: tindak lanjut selesai atau process order sudah dibuat; tidak dihitung badge.

Membuka halaman Orders saja tidak mengubah status. Membuka entity dari popup menandainya `read`, bukan `acknowledged`.

## Sticky popup

Popup tersedia di seluruh route `/admin/*`, berada di kanan bawah desktop dan menjadi kartu bawah responsif pada mobile. Popup memiliki action keyboard-accessible: Lihat Order, Tandai Dibaca, dan Saya Proses. Jika ada lebih dari tiga order unread, link `+X notifikasi lainnya` membuka `/admin/notifications`.

Admin shell melakukan polling summary setiap 15 detik. Polling dilewati saat tab tersembunyi dan dilanjutkan ketika tab kembali aktif. Gangguan jaringan tidak menimbulkan spam console.

## Email order baru

```env
ORDER_NOTIFICATION_EMAIL_ENABLED=false
ORDER_NOTIFICATION_EMAILS=sales@example.com,admin@example.com
```

`ORDER_NOTIFICATION_EMAILS` menerima daftar email dipisahkan koma. Dengan `EMAIL_PROVIDER=mock`, pengiriman membuat email log berstatus `mocked`. Default fitur ini nonaktif. Jika penerima kosong, order tetap sukses dan notification menyimpan error aman.

Saat Resend aktif, delivery dapat dipantau di `/admin/settings/email`. Claim email
dan key `order_created_email:{orderId}` tetap menjadi boundary idempotensi, jadi
retry convert tidak melakukan pengiriman ulang.

Subject: `Order Baru Masuk - {orderNumber}`. Body memuat order, customer, company, total, product summary, timestamp, dan link admin. Key idempotensi: `order_created_email:{orderId}`.

## Permission dan keamanan

Permission `admin:notification:view` serta `admin:notification:update` diberikan kepada `super_admin`, `sales`, dan `product_admin`. Endpoint tetap memakai internal guard, rate limit, validasi, safe error, dan audit log. Customer/anonymous tidak memiliki akses. Supabase service-role dan credential email tidak pernah dikirim ke client.

## Troubleshooting

- Badge tidak hilang: status `read` memang tetap dihitung; pilih Saya Proses atau Resolve.
- Popup tidak muncul: cek notification masih `unread`, permission role, serta response `/api/admin/notifications/summary`.
- Email tidak terkirim: cek flag, daftar penerima, `EMAIL_PROVIDER`, `EMAIL_ENABLED`, dan `email_status` notification.
- Duplicate notification: pastikan migration 012 dan unique index sudah diterapkan.
- Role 403: role harus memiliki permission notification pada konfigurasi admin.

Browser Notification API tidak diaktifkan pada task ini. Sticky in-app popup adalah source utama karena notifikasi browser/OS tidak menjamin persistensi sampai diklik.

## Checkpoint A6

Konversi order `OF-QUO-96202DA4-DD33FA` membuat tepat satu `order_created` dan satu email mock. Popup dan badge muncul saat status `unread`. Action **Saya Proses** mengubahnya menjadi `acknowledged`, menghilangkan popup, dan menurunkan counter menjadi nol. Retry convert tetap idempotent.
