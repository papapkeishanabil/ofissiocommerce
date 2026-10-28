# Pendaftaran dan masuk dengan Google

Tombol Google tersedia di modal daftar/masuk dan halaman login customer. Nama dan email diambil dari akun Google yang terverifikasi. Akun baru menggunakan provisioning profil dan perusahaan yang sama dengan pendaftaran email; data WhatsApp dan perusahaan dilengkapi melalui profil perusahaan.

## Aktivasi

### Nilai untuk instalasi Ofissio saat ini

Konfigurasi lokal menunjuk ke `https://db.ofissio.com`. Authorized redirect URI pada Google Cloud harus menggunakan `https://db.ofissio.com/auth/v1/callback`, sesuai host Auth yang dipakai aplikasi, bukan contoh domain `PROJECT.supabase.co` di bawah.

Buka https://console.cloud.google.com/auth/clients dan buat OAuth client bertipe **Web application**, dengan nama **Ofissio Web**. Isi Authorized JavaScript origins dengan `https://ofissio.com` dan Authorized redirect URIs dengan `https://db.ofissio.com/auth/v1/callback`. Siapkan branding Ofissio, homepage `https://ofissio.com`, privacy policy `https://ofissio.com/legal/privacy-policy`, serta terms `https://ofissio.com/legal/terms-of-service` jika diminta Google. Jika audience masih Testing, tambahkan akun penguji pada Test users sebelum pengujian.

Jika Supabase dikelola sendiri melalui Docker, konfigurasi provider dilakukan pada service Auth, bukan melalui pengaturan provider Supabase Cloud. Nilai environment service Auth yang dibutuhkan:

```env
GOTRUE_EXTERNAL_GOOGLE_ENABLED=true
GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID=<client-id-dari-google>
GOTRUE_EXTERNAL_GOOGLE_SECRET=<client-secret-dari-google>
GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI=https://db.ofissio.com/auth/v1/callback
```

Tambahkan callback aplikasi `https://ofissio.com/api/auth/google**` dan URL localhost yang digunakan ke redirect allowlist Auth dengan mempertahankan URL lama. Verifikasi cara instalasi dan konfigurasi aktif di server sebelum mengubah environment atau membuat ulang container Auth. Domain khusus saja belum membuktikan instalasi self-hosted.

Dokumentasi self-hosted: https://supabase.com/docs/guides/self-hosting/self-hosted-oauth.

### Langkah untuk Supabase Cloud

1. Gunakan konfigurasi Supabase Auth yang sudah ada (`AUTH_PROVIDER=supabase`, URL, anon key, dan service role server).
2. Buat OAuth client bertipe Web application pada Google Cloud. Isi authorized redirect URI dengan `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Pada Supabase Authentication > Providers > Google, aktifkan Google dan masukkan Client ID serta Client Secret. Secret hanya disimpan pada konfigurasi provider Supabase.
4. Pada Supabase Authentication > URL Configuration, izinkan callback aplikasi `https://<domain>/api/auth/google**`. Tambahkan URL localhost yang setara untuk pengembangan. Wildcard ini mengakomodasi parameter flow acak; batasi ke domain dan path callback tersebut.
5. Uji akun baru, akun lama, pembatalan, serta masuk dari checkout dan tautan quotation dengan email penerima yang sesuai.

Alur memakai authorization code dengan PKCE SHA-256. Verifier disimpan dalam cookie HttpOnly selama 10 menit. Token ditukar di server dan disimpan melalui cookie sesi aplikasi. Jika provider belum aktif, tombol menampilkan pesan untuk menggunakan pendaftaran email.

Referensi: https://supabase.com/docs/guides/auth/social-login/auth-google dan https://supabase.com/docs/guides/auth/sessions/pkce-flow.

## Status pemeriksaan 28 Oktober 2026

Pembaruan aktivasi: operator menambahkan kredensial Google di `/opt/ofissio-supabase/.env` dan menerapkan `docker-compose.google.yml` bersama `docker-compose.yml` dan `docker-compose.ofissio.yml`. Container Auth healthy; settings API mengonfirmasi Google dan email aktif. Kredensial tidak disalin ke repository.

Untuk penerapan ulang, pertahankan ketiga file Compose:

```bash
docker compose -f docker-compose.yml -f docker-compose.ofissio.yml -f docker-compose.google.yml up -d --no-deps auth
```

Callback Google adalah `https://db.ofissio.com/auth/v1/callback`. Allowlist aplikasi mencakup `https://ofissio.com/api/auth/google**` dan `http://localhost:8000/api/auth/google**`. Aplikasi produksi memakai origin HTTPS dari `APP_URL` di balik reverse proxy. Provider aktif belum membuktikan login akun nyata berhasil sampai sesi aplikasi diuji.

Endpoint settings Supabase yang dikonfigurasi di lingkungan lokal berhasil diperiksa: provider email aktif, provider Google belum aktif. Lingkungan lokal belum memiliki Google Client ID, Google Client Secret, atau Supabase management access token. Service role database tidak memberikan akses pengelolaan konfigurasi provider.

Aktivasi membutuhkan OAuth client pada Google Cloud dan konfigurasi Google provider serta redirect allowlist pada dashboard Supabase. Isi Client Secret langsung pada dashboard Supabase.

Uji browser lokal desktop 1440px dan mobile 390px lolos untuk tombol pada tab daftar/masuk, fallback provider tidak aktif (respons disimulasikan), pemulihan tombol, tujuan kembali ke checkout, pesan callback gagal, tombol Google tersembunyi di halaman admin, serta akses ke tombol Daftar tanpa form terpotong. Login Google dengan akun nyata belum diuji karena provider belum aktif.
