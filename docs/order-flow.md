# Order flow

Ofissio order dari quotation mengikuti alur berikut:

`quotation accepted/quoted → admin convert → order + payment foundation + tracking → admin order notification → process routing`

Konversi bersifat idempotent. Retry tidak membuat order, notification, atau email order baru kedua. Kegagalan notification/email tidak membatalkan order yang sudah tersimpan.

Order baru menghasilkan event `order_created` untuk admin. Status `unread` dan `read` tetap dihitung sebagai pekerjaan yang belum diambil. Action Saya Proses mengubah notification menjadi `acknowledged`. Saat admin membuat process order fulfillment/customization/production, notification terkait otomatis menjadi `resolved`.

Rincian UI, env, RBAC, serta troubleshooting tersedia di `docs/admin-notifications.md`.
