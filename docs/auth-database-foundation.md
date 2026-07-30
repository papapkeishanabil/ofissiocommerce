# Auth + database foundation

Phase 11 membuat fondasi auth/database production-ready tanpa mematikan mock flow.

## Default

```bash
DATABASE_PROVIDER=mock
AUTH_PROVIDER=mock
```

Default tetap mock agar Phase 1-10 tidak rusak dan development tidak membutuhkan Supabase env.

## Env baru

```bash
DATABASE_PROVIDER=mock
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AUTH_PROVIDER=mock
AUTH_SESSION_COOKIE_NAME=ofissio_session
```

`SUPABASE_SERVICE_ROLE_KEY` wajib server-side. Jangan pakai `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

## Auth foundation

Folder `src/features/auth/` menyediakan:

- runtime config;
- session type;
- mock auth provider;
- Supabase provider boundary;
- session helpers;
- repository interface;
- service functions seperti `getCurrentSession`, `requireUser`, `requireCompanyUser`, `getCurrentCompany`, `getUserRoles`, dan `hasPermission`.

Supabase sign-in belum aktif pada Phase 11. Boundary disiapkan agar implementasi staging bisa masuk tanpa mengganti call site API.

## Database foundation

Folder `src/features/database/` menyediakan:

- runtime config;
- database health;
- typed provider mode;
- client boundary placeholder;
- error classes.

Jika env Supabase/Postgres belum lengkap, provider fallback aman ke mock.

## Repository foundation

Folder `src/features/repositories/` menyediakan registry/interface untuk:

- company;
- user/company user;
- cart;
- order;
- payment;
- tracking;
- audit log;
- uploaded file.

Repository database masih skeleton/partial. Existing memory/mock store tetap aktif.

## API scope improvement

API checkout/payment/shipping/tracking tetap menerima payload mock untuk development, tetapi service call sekarang memakai `companyId`/`userId` dari session guard setelah company access check. Ini menyiapkan transisi ke server-side session real.
