# Pemeliharaan Panduan Admin Ofissio

Panduan operasional di `/admin/help` adalah bagian wajib dari setiap fitur internal.

## Definition of Done fitur admin

1. Tambahkan atau ubah menu pada `src/features/admin/admin.config.ts`.
2. Tambahkan atau perbarui entri yang sama pada `src/features/admin-guide/admin-guide.data.ts`.
3. Jelaskan tujuan, kapan menu digunakan, role, risiko, dan kaitannya dengan alur STK/CUS/PRO.
4. Tambahkan SOP terperinci pada `ADMIN_DETAILED_PROCEDURES`: prasyarat, tahap klik/input, hasil yang harus terlihat, checklist verifikasi, troubleshooting, dan menu berikutnya.
5. Gunakan bahasa operasional yang dipahami staf; hindari nama tabel, secret, atau istilah implementasi yang tidak diperlukan.
6. Jalankan `npm run check:admin-guide`, `npm run typecheck`, dan `npm run lint`.
7. Uji pencarian, filter role, tautan menu, keyboard, mobile, serta skenario end-to-end yang berubah.

`npm run build` menjalankan pemeriksaan panduan secara otomatis. Build akan gagal jika ada menu admin baru yang belum memiliki entri panduan lengkap.
