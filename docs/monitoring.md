# Monitoring and logging plan

Saat ini foundation audit log dan safe error response sudah tersedia. Provider monitoring production belum dipilih.

## Event yang wajib dimonitor

- Checkout error.
- Payment create error.
- Payment callback failure.
- Shipping rate error.
- WooCommerce product sync error.
- WooCommerce order sync error.
- 3D model load failure.
- Upload validation failure.
- Login/auth failure.
- Ofistant failed action.
- Security events.
- Rate limit events.
- Email delivery failure.
- Resend API failure.
- Dashboard/tracking API failure.

## Logging

- Gunakan server logs untuk error teknis.
- Gunakan audit logs untuk security/payment/checkout events.
- Jangan log API key, token, callback signature, atau file customer mentah.
- Gunakan `LOG_LEVEL=info` sebagai default.

## Alert recommendation

Tambahkan alert untuk:

- Payment callback failure.
- Payment status mismatch.
- WooCommerce sync failure.
- Email delivery failure.
- 3D model load failure rate tinggi.
- Spike rate limit/security event.

## Future providers

Provider bisa berupa Sentry, Datadog, Grafana/Loki, atau layanan hosting yang sudah dipakai. Pilih satu stack observability sebelum production.

## Operational review

- Review log harian minggu pertama launch.
- Review checkout/payment failure tiap hari.
- Review WooCommerce sync jika order sync diaktifkan.
- Simpan runbook incident singkat untuk support/sales.

## Health endpoint

`GET /api/health` adalah probe read-only dan tidak mencetak credential. Field
utama yang dimonitor:

- `status`: `ok` atau `degraded`;
- `databaseStatus` dan `schemaStatus`;
- provider/configured auth, storage, email, payment, shipping, WooCommerce;
- `stockCustomerVisible` harus selalu `false`.

Jangan menambahkan raw provider response, stack trace, connection string, key,
token, atau service-role ke response health. Poll interval awal 60 detik dengan
timeout 10 detik; alert setelah 3 kegagalan berturut-turut.

## Severity dan respons

| Severity | Contoh | Respons awal |
| --- | --- | --- |
| P1 | data lintas company, callback salah menandai paid, database unavailable | segera freeze write/escalate |
| P2 | login massal gagal, provider payment/shipping gagal, PDF tidak tersedia | 15 menit |
| P3 | email individual gagal, Woo sync pending, upload gagal terisolasi | jam kerja |
| P4 | warning metadata produk atau retry non-kritis | backlog terjadwal |

Alert P1/P2 harus memiliki owner dan jalur eskalasi di luar aplikasi. Console
browser bukan monitoring production.

## Metrik minimum

- HTTP 5xx/4xx per route dan latency p50/p95/p99.
- Login/register success, rejected, dan rate-limited.
- Quotation created/sent/accepted/converted serta email failed.
- Payment create/callback valid/invalid/manual-review dan amount mismatch.
- Shipping rate/create/webhook valid/invalid serta shipment stuck.
- Upload rejected/failure berdasarkan tipe file, tanpa filename sensitif.
- WooCommerce read/write failure, retry, dan sync lag.
- Database/schema health, storage signed URL failure, dan umur backup terakhir.

## Logging aman

- Gunakan correlation/request ID dan entity ID non-secret.
- Metadata audit disanitasi secara rekursif dan string dibatasi panjangnya.
- Jangan log password, token, cookie, Authorization, signature, full provider
  payload, API key, service-role, atau isi artwork.
- Customer/admin hanya menerima pesan aman; raw stack hanya pada observability
  dengan akses terbatas.
- Retensi log/audit final harus disetujui bisnis, security, dan legal.

## Dashboard harian operations

- quotation/order yang membutuhkan tindakan;
- payment manual review dan callback rejected;
- shipment gagal/stuck;
- email gagal;
- Woo sync pending/failed;
- database/storage health;
- umur backup dan hasil restore drill terakhir.

Gunakan [rollback-sop.md](./rollback-sop.md) untuk containment/rollback dan
[backup-and-restore.md](./backup-and-restore.md) untuk pemulihan data.
