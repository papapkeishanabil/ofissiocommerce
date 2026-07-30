# Payment Security - Ofissio Phase 23

Security rules:

- Customer tidak bisa mark payment paid.
- Browser return URL tidak mengubah payment status.
- Callback iPaymu fail-closed jika signature invalid.
- Amount callback harus sama dengan payment record.
- Reference callback harus cocok dengan payment record.
- Callback duplicate idempotent.
- Raw provider payload tidak dikembalikan ke client.
- Secret iPaymu tidak boleh masuk client bundle.
- `.env.local` tidak boleh tracked.

Public response hanya boleh berisi:

- payment id
- order id
- status
- amount
- payment URL jika tersedia
- expiry
- invoice/document pointer aman

Do not expose:

- `IPAYMU_API_KEY`
- `IPAYMU_VA`
- raw callback payload penuh
- storage key/bucket private
- provider stack trace

Migration `008_ipaymu_payment.sql` wajib dijalankan manual sebelum staging iPaymu persistence test penuh.
