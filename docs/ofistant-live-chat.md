# Chat langsung dengan tim Ofissio

Customer memilih **Hubungi tim Ofissio** di panel Ofistant. Customer harus masuk;
riwayat AI pada percakapan tersebut diteruskan ke tim setelah permintaan ini.
Status menjadi **Menunggu tim Ofissio** dan customer boleh menambahkan pesan.
Tidak ada janji waktu balasan atau klaim staf sedang online.

Staf membuka **Admin → Chat Customer** (`/admin/chats`), memilih antrean,
kemudian **Ambil percakapan**. Balasan tampil dengan nama staf di panel customer
yang sama. Akses diberikan kepada `super_admin`, `sales_admin`, dan `sales`
melalui permission `admin:chat:manage`. Hanya staf yang mengambil percakapan
dapat membalas atau menyelesaikannya. Staf perlu memantau inbox ini; fitur ini
tidak mengirim email, WhatsApp, ataupun notifikasi perangkat.

Pada semua halaman admin, indikator **Chat masuk** di header dan badge menu
**Chat Customer** menampilkan jumlah antrean menunggu, diperbarui setiap 10 detik
saat tab aktif. Klik indikator untuk membuka antrean. Jumlah 50 atau lebih
ditampilkan sebagai `50+`; indikator hilang setelah antrean diambil/diselesaikan.

Sesi customer dan admin menggunakan cookie login yang sama dalam satu profil
browser. Untuk menguji dua akun sekaligus, gunakan Incognito/profil browser
terpisah untuk customer dan login admin di jendela biasa. Ketika API menolak sesi,
inbox menghapus data lama, menghentikan polling antrean, dan menawarkan tombol
**Masuk kembali sebagai admin**; sesi customer tidak pernah diberi akses staf.

Customer atau staf dapat mengakhiri chat. AI kembali tersedia setelah chat
selesai; customer juga dapat membuka kembali chat tim. Riwayat tidak dihapus.
Polling pesan setiap 3,5 detik, antrean setiap 10 detik. Tidak perlu layanan
realtime atau dependency baru. Versi ini mendukung pesan teks, tanpa lampiran.

## Data dan keamanan

- Migration `042_ofistant_support.sql` bergantung pada `041_ofistant_history.sql`.
- Tabel `ofistant_support_sessions` dan `ofistant_support_messages` memakai RLS;
  akun anon/authenticated tidak dapat mengakses tabel atau menjalankan RPC.
- RPC hanya dipanggil backend menggunakan service role. Identitas dan hak staf
  berasal dari middleware/session, bukan body request.
- Customer terisolasi berdasarkan user **dan** company. Staf tidak dapat membaca
  percakapan AI yang belum diminta untuk diteruskan.
- Riwayat AI berasal dari data server. Pesan assistant buatan client tidak diterima.
- Lock percakapan menyerialkan claim, send, close, dan penyimpanan turn AI.
  Trigger menolak turn AI ketika chat tim aktif, termasuk race dengan handoff.
- UUID pesan membuat retry idempotent. Pesan gagal tetap menjadi draft di UI.
- POST memeriksa same-origin; API memeriksa role, schema, panjang pesan, rate limit,
  dan menggunakan `private, no-store`. Tidak ada fallback penyimpanan in-memory.
- Saat akun atau percakapan berubah, hasil request lama tidak diterapkan ke chat baru.

## Aktivasi

1. Uji migration 041+042 pada database PostgreSQL/Supabase terisolasi.
2. Backup database produksi dan verifikasi backup dapat dibaca.
3. Terapkan migration 042 secara sengaja ke database target, cek RLS dan RPC,
   lalu reload schema PostgREST (migration sudah mengirim NOTIFY).
4. Rilis kode dalam candidate terpisah dari rilis live. Pertahankan env dan data
   lama; tambahkan `OFISTANT_SUPPORT_ENABLED=true`. History juga harus aktif
   (`OFISTANT_HISTORY_ENABLED=true`) agar customer dapat melanjutkan riwayat.
5. Build, typecheck, dan uji preview sebelum mengganti symlink live secara atomik.
6. Verifikasi login customer/staf, antrean, balasan, reload, dan selesai chat.

Jangan aktifkan flag sebelum migration tersedia. Jika rollback diperlukan,
kembalikan symlink ke rilis sebelumnya; pertahankan tabel agar pesan tidak hilang.
Chat tim yang belum selesai harus ditutup sebelum mengaktifkan kembali AI pada
percakapan tersebut. Jangan drop tabel untuk rollback UI.

## Verifikasi implementasi

- `npx tsc --noEmit` dan ESLint untuk berkas yang berubah.
- `node scripts/test-ofistant-support-sql.mjs <URL-modul-PGlite>` menguji ownership,
  opt-in riwayat, penguncian AI, claim, retry, pagination, close/reopen, dan izin SQL.
- `.artifacts/ofistant-support/browser-results.json`: browser customer dan staf
  dengan viewport 1440 dan 390, API aplikasi asli dan PostgreSQL PGlite terisolasi
  melalui adapter RPC uji. Tidak menulis percakapan ke database produksi.
- Bukti screenshot berada di folder artifact yang sama. Adapter dan halaman demo
  hanya ada di workspace QA, tidak termasuk source/paket produksi.

Status aktivasi produksi dicatat terpisah pada artifact deployment. Lolos tes
lokal tidak berarti migration atau fitur telah aktif di live.
