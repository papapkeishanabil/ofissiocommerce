# Supabase Auth production

Task D mengganti trust boundary mock menjadi Supabase Auth untuk production,
tanpa menghapus fallback development. Session browser disimpan dalam cookie
HTTP-only. Middleware memverifikasi access token ke Supabase Auth, melakukan
refresh jika diperlukan, membaca role dari database, lalu meneruskan identity
terverifikasi ke API/server components.

## Setup Supabase

1. Aktifkan Email provider di **Supabase > Authentication > Providers**.
2. Atur Site URL dan Redirect URLs untuk staging/production.
3. Tentukan apakah email confirmation wajib.
4. Jalankan `database/migrations/015_supabase_auth_production.sql` di staging.
5. Isi env staging dan jalankan `npm run check:auth`.

```bash
AUTH_PROVIDER=supabase
AUTH_MODE=production
AUTH_REQUIRE_EMAIL_VERIFICATION=true
ADMIN_DEV_BYPASS=false
INTERNAL_DEV_HEADERS_ENABLED=false

NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PUBLIC_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SERVER_SECRET
```

`NEXT_PUBLIC_SUPABASE_URL` dan anon key boleh tersedia di client. Service role
harus berada di server secret manager dan tidak boleh memakai prefix
`NEXT_PUBLIC_`.

## Membuat admin pertama

1. Buat user melalui Supabase Authentication dashboard.
2. Salin UUID user tersebut.
3. Jalankan SQL dengan UUID dan identitas yang benar:

```sql
insert into internal_user_profiles (auth_user_id, name, email, role, status)
values (
  'AUTH_USER_UUID',
  'Nama Admin',
  'admin@ofissio.com',
  'super_admin',
  'active'
);
```

Jangan menyimpan password pada seed atau repository. Login admin memakai halaman
`/login?mode=admin`; role selalu dibaca dari `internal_user_profiles`.

## Role dan permission

Customer role canonical:

- `customer_admin`
- `customer_user`

Internal role canonical:

- `sales_admin`
- `production_admin`
- `finance_admin`
- `super_admin`

Role legacy customer/internal tetap dikenali sementara sebagai compatibility
bridge. Permission dicek kembali pada server route; penyembunyian menu sidebar
hanya lapisan UX, bukan security boundary.

## Company isolation

- Membership canonical tersimpan di `company_memberships`.
- Middleware mengambil `company_id` dari membership milik `auth.uid()`, bukan
  request body/header browser.
- Quotation, order, payment, cart, dan file tetap diperiksa oleh server guard.
- RLS membership-scoped menjadi defense-in-depth untuk akses dengan anon JWT.
- Repository internal memakai service role dan karena itu wajib selalu melewati
  server RBAC/company guard.

## Development policy

Mock auth hanya diperbolehkan dengan `AUTH_MODE=development`.

```bash
AUTH_PROVIDER=mock
AUTH_MODE=development
ADMIN_DEV_BYPASS=true
INTERNAL_DEV_HEADERS_ENABLED=true
```

Dua flag terakhir harus diaktifkan eksplisit hanya pada workstation development.
Middleware menghapus semua header identitas dari browser sebelum membangun
identity baru. Pada production, kedua flag diabaikan walaupun salah konfigurasi.

## Session lifecycle

- Access token dan refresh token disimpan dalam cookie HTTP-only.
- Middleware memvalidasi access token melalui Supabase Auth.
- Access token kedaluwarsa dicoba refresh sekali menggunakan refresh token.
- Logout memanggil Supabase logout dan menghapus kedua cookie.
- Token/session/refresh token tidak boleh ditulis ke audit log.

## Known gaps

- Migration 015 harus diterapkan manual sebelum `AUTH_PROVIDER=supabase` aktif.
- Service-role repository bypass RLS; server guards tetap mandatory.
- Registration awal membuat company placeholder. Customer melengkapi profil di
  dashboard setelah email verification/login.
- Multi-company switch belum diaktifkan; server memilih satu membership aktif.
