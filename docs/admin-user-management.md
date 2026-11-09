# Edit dan hapus Tim Ofissio

Aktif di produksi pada 9 November 2026, rilis `20261109-admin-users-v1`, baseline `20261109-embroidery-review-20c19f17`. Tidak ada migrasi database atau perubahan nama, peran, status, dan password staf asli selama pengujian.

## Penggunaan

Pada `/admin/users`, pemilik izin `admin:user:update` mendapatkan tombol **Edit** pada setiap user. Editor menampilkan email sebagai identitas tetap, form nama dengan tombol **Simpan nama**, dan form **Password baru / Konfirmasi password baru** dengan tombol **Ganti password**. Penyimpanan nama dan password dilakukan terpisah. Password mengikuti kebijakan existing minimal 10 dan maksimal 128 karakter, tidak menampilkan password lama, tidak disimpan pada profil atau audit, dan dikosongkan dari form setelah berhasil diperbarui.

User dengan izin lihat saja tidak memperoleh kontrol mutasi. Akun sendiri boleh mengganti nama/password, tetapi tidak dapat mengubah peran/status sendiri atau menghapus akun sendiri. Peran dan status akun sistem tetap dilindungi. Password Super Admin hanya bisa diganti oleh pemilik akun tersebut; Super Admin lain masih bisa mengedit nama tetapi tidak mengganti passwordnya. Kontrol peran/status untuk peran terkelola yang sudah ada tetap tersedia.

Tombol **Hapus** tersedia untuk akun Admin Ofissio, Customer Care, dan CS Full Custom selain akun yang sedang dipakai. Konfirmasi meminta admin mengetik email user. Tombol **Nonaktifkan** tetap tersedia untuk pencabutan akses sementara. Editor dan konfirmasi berada di luar tabel yang dapat digeser agar form tetap pas pada layar mobile. Fokus berpindah ke input editor/konfirmasi dan kembali ke tombol pemicu ketika ditutup/dibatalkan.

## API dan konsistensi

- `PATCH /api/admin/users/[id]`: menerima nama, peran, dan/atau status, menolak properti tidak dikenal. Nama disimpan pada `internal_user_profiles`, sumber nama identitas internal yang dibaca middleware. Perubahan nama tidak menyentuh credential login.
- `POST /api/admin/users/[id]/password`: validasi UUID, izin update user, rate limit, panjang/konfirmasi password, dan perlindungan Super Admin. Mengirim password hanya ke API admin Auth di server. Audit hanya merekam bahwa password diubah.
- `DELETE /api/admin/users/[id]`: validasi UUID/izin/email konfirmasi, menolak akun sendiri dan akun sistem. Akun yang juga memiliki profil customer atau company membership tidak boleh dihapus dari layar ini; admin diarahkan untuk menonaktifkan akses internal saja.

Urutan hapus: nonaktifkan profil internal, soft-delete identitas login melalui Supabase Auth (`should_soft_delete: true`), lalu hapus baris profil internal. Identitas auth dipertahankan sebagai referensi dan tidak menjalankan cascade-delete record bisnis. Soft-delete auth tidak dapat dipulihkan. Jika provider gagal, profil tetap nonaktif dan dipertahankan untuk retry; UI memuat ulang daftar untuk menunjukkan status terkini. Jika Auth sudah tidak menemukan akun (404), cleanup profil tetap dapat dilanjutkan. Akses internal tidak lagi lolos middleware yang mensyaratkan profil aktif. Riwayat order, chat, dan audit tidak dihapus oleh operasi ini.

Rujukan API utama: [Supabase admin updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid), [admin deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), dan [bentuk REST should_soft_delete](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/GoTrueAdminApi.ts). Tidak ada service-role key yang dikirim ke browser.

## Validasi

`npx tsx --require ./scripts/register-server-only.cjs scripts/test-admin-user-management.ts` menguji service/route dengan fetch yang hanya mengizinkan domain fixture: nama, password terpisah, validasi/privilege escalation, akun sendiri/Super Admin, relasi customer, kegagalan provider dan retry 404, soft deletion, otorisasi handler, serta audit tanpa password.

`node .artifacts/admin-user-management/build.cjs` lalu `python scripts/webtest-admin-user-management.py` menguji komponen React aktual melalui server HTTP lokal dan seluruh API di-mock. Desktop 1440 dan mobile 390 mencakup editor nama, mismatch password tanpa request, retry dan pengosongan password, email konfirmasi salah, batal hapus, kegagalan/retry hapus, update status nonaktif, proteksi akun, mode lihat saja, serta tanpa overflow/error runtime. Screenshot dan hasil di `.artifacts/admin-user-management/`.

TypeScript dan ESLint file terkait diperiksa. Detector desain memberi satu peringatan statis pada class conditional badge status lama: branch aktif memakai emerald/emerald, branch nonaktif memakai slate/slate; bukan gray pada latar emerald. Tidak ada perubahan yang diperlukan untuk peringatan tersebut.

Belum diuji dengan credential user nyata atau endpoint Supabase nyata. Pengujian route langsung mengasumsikan header identitas yang sudah diverifikasi middleware; tidak menguji ulang seluruh middleware produksi. Build dan deployment produksi telah berhasil; mutasi akun nyata tidak dijalankan sebagai pengujian.

## Verifikasi rilis

Patch tujuh file runtime, satu tes dan satu dokumentasi mempertahankan 1.344 file baseline di luar patch. Typegen, TypeScript, lint, tes security/service/route dengan provider fixture, prebuild dan build produksi lulus. Browser kandidat dan domain publik yang terautentikasi memeriksa desktop 1440 dan mobile 390: editor terbuka, password tersamarkan/kosong, batal edit tidak mengubah nama, akun sendiri tanpa tombol hapus, email konfirmasi dan batal hapus, penolakan akses anonim/header palsu, serta penolakan payload invalid sebelum mutasi. Profil staf sebelum dan sesudah pengujian dibandingkan dan identik; tidak ada request tulis dari browser. Keberhasilan mutasi nama/password/hapus diuji pada fixture, bukan user nyata. Tidak ada runtime error atau overflow dokumen.

Sesi QA login sementara dicabut setelah pemeriksaan. Homepage, katalog, login dan cart tetap 200; API admin anonim tetap 401. Persiapan awal tertahan guard disk sebelum kandidat dibuat. Hanya tujuh folder `.next/cache` dari rilis Oktober yang tidak aktif dibersihkan, dengan path terverifikasi; rilis aktif/rollback dan seluruh kode/data bisnis dipertahankan. Ruang kosong meningkat dari sekitar 1.670 MiB menjadi 4.263 MiB sebelum build. Daftar path ada di `.artifacts/admin-users-deploy-20261109/cache-cleanup.json`.

Bukti: `.artifacts/admin-users-deploy-20261109/deployment-result.json`, `production-browser.json`, dan screenshot. Log/manifes server: `/var/www/ofissio.com/deployments/20261109-admin-users-v1/`. Rollback: `/var/www/ofissio.com/releases/20261109-embroidery-review-20c19f17`. Deployment berupa patch terisolasi; tidak dilakukan commit/push workspace yang memuat pekerjaan lain.
