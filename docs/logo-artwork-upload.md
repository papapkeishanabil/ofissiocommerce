# Logo and artwork upload

## Format

Logo:

- PNG
- JPG/JPEG
- SVG, ditandai `sanitizedStatus=required`

Artwork/dokumen:

- PDF
- XLSX
- PNG
- JPG/JPEG
- SVG untuk artwork, tetap perlu sanitization production

## Rekomendasi logo bordir

- Gunakan PNG transparan resolusi tinggi.
- Gunakan logo dengan stroke cukup tebal untuk area bordir kecil.
- Hindari teks terlalu tipis.
- Default maksimum logo: `MAX_LOGO_UPLOAD_MB=10`.

## Logo library

1. Customer/company user dengan role `company_admin` atau `purchasing` upload logo.
2. Binary masuk ke provider aktif (`mock` atau `supabase`).
3. Metadata masuk ke `uploaded_files`.
4. Registrasi logo masuk ke `company_logos`.
5. Preview memakai signed URL.
6. Jika server restart dan provider `supabase`, logo tetap tampil karena binary tersimpan live.
7. Jika signed URL expired, UI mengambil ulang dari API saat logo library dimuat.

## Permission

Customer role:

- `company_admin`: boleh upload, register, delete, dan lihat company logo.
- `purchasing`: boleh upload, register, delete, dan lihat company logo.
- `approver`: hanya boleh lihat company logo.
- `viewer`: hanya boleh lihat company logo.
- `finance`: hanya boleh lihat file/logo yang relevan untuk company; tidak perlu upload logo.

Company scope selalu berasal dari session customer. Endpoint customer tidak menerima `companyId` dari body upload atau payload logo registration.

Internal admin:

- `super_admin`, `sales`, dan `support` boleh melihat semua upload melalui `/admin/uploads`.
- Upload logo atas nama customer belum aktif.
- Jika nanti dibutuhkan, route-nya harus eksplisit, misalnya `/admin/customers/[id]/logos`, dan wajib memakai internal guard serta selected `companyId` dari path.

## Studio Bordir / 3D configurator

- Upload lokal tetap cepat dengan object URL/browser preview.
- Setelah upload sukses, placement menyimpan `logoFileId`.
- Cart dan checkout menggunakan `logoFileId`, bukan binary mentah.
- Konfigurasi lama dapat mengambil preview lewat signed URL.
- `/3d/kk-006.glb` tetap local public asset dan tidak diubah Phase 20.
- Role `approver`, `viewer`, dan `finance` tidak bisa upload logo dari configurator.

## Preview unavailable

Jika object storage tidak menemukan binary atau signed URL tidak bisa dibuat, UI menampilkan preview unavailable/ikon file. Tidak boleh 500 dan tidak boleh membocorkan raw provider error.
