# Persistence strategy

Phase 14 menambahkan repository factory untuk memindahkan data penting Ofissio dari memory/mock menuju Supabase secara bertahap.

## Mode mock

Default development:

```env
DATABASE_PROVIDER=mock
STORAGE_PROVIDER=mock
```

Mode ini tetap memakai in-memory/global store dan object storage mock. Flow customer yang sudah stabil tidak dipaksa bergantung ke cloud.

## Mode Supabase

Aktif hanya jika:

```env
DATABASE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Repository Supabase memakai server-only PostgREST helper. `SUPABASE_SERVICE_ROLE_KEY` tidak diimport dari Client Component dan tidak boleh memakai prefix `NEXT_PUBLIC_`.

## Repository factory

`src/features/repositories/repository.factory.ts` memilih adapter:

- `mock/*` jika provider mock atau env Supabase belum lengkap.
- `supabase/*` jika `DATABASE_PROVIDER=supabase` dan env lengkap.

## Siap persistent pada Phase 14

Priority 1:

- quotations
- quotation_items
- email_logs
- uploaded_files metadata
- company_logos

Priority 2 foundation:

- orders
- payments
- tracking_records
- audit_logs

Priority 3 masih mock:

- carts
- cart_items
- cart_item_size_matrix
- cart_item_customizations

## Migrasi bertahap

1. Jalankan schema di Supabase staging.
2. Set `DATABASE_PROVIDER=supabase`.
3. Test `/api/health`.
4. Test upload logo, request quotation, dan dashboard quotation.
5. Baru setelah stabil, aktifkan order/payment/tracking persistence penuh.

## Known limitation

- Supabase live test diskip jika env belum tersedia.
- Storage binary Supabase masih boundary; metadata sudah repository-ready.
- Payment/shipping/WooCommerce live belum diaktifkan.
- Auth production/JWT company claim belum final.
- RLS masih draft dan belum diaktifkan otomatis.
