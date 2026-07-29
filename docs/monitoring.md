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
