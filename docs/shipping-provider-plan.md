# Shipping Provider Plan

Phase 24 tidak mengaktifkan API ekspedisi live. Pondasi provider disiapkan agar fase berikutnya bisa menambah integrasi tanpa mengubah flow admin.

## Provider enum foundation

- `manual`
- `jne`
- `jnt`
- `sicepat`
- `anteraja`
- `cargo`
- `pickup`

## Env future

Belum wajib pada Phase 24:

- `SHIPPING_PROVIDER`
- `SHIPPING_PROVIDER_API_ENABLED`
- provider API key/secret sesuai vendor

Jangan memakai `NEXT_PUBLIC_*` untuk secret shipping.

## Rencana fase berikutnya

1. Pilih provider staging.
2. Tambah server-side provider adapter.
3. Validasi signature/callback jika provider mendukung callback.
4. Simpan payload provider yang sudah disanitasi.
5. Tetap tampilkan fallback manual jika provider unavailable.
