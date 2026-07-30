# Storage security

Phase 20 security foundation:

1. Private bucket untuk logo, artwork, dokumen, dan future GLB admin.
2. Preview/download melalui signed URL, bukan public URL permanen.
3. Extension allowlist aktif.
4. MIME allowlist aktif.
5. Size limit aktif:
   - logo: 10 MB default
   - document/artwork: 20 MB default
   - GLB future admin: 100 MB default
6. Filename sanitize aktif.
7. Storage key dibuat server-side.
8. Storage key mengandung company id, file type, year/month, dan random id.
9. Company isolation dicek sebelum detail/signed URL/delete.
10. Customer UI tidak menampilkan bucket/key/provider error detail.
11. Admin uploads boleh melihat provider/bucket/file type/status, tetapi tidak melihat service role atau full storage key.
12. Upload success/failure, signed URL creation, delete, dan validation failure dicatat ke audit log.
13. Customer upload memakai `companyId` dari session; `companyId` dari body/form customer upload ditolak atau diabaikan.
14. Company logo write dibatasi ke role customer `company_admin` dan `purchasing`.
15. Role customer `approver`, `viewer`, dan `finance` hanya dapat melihat logo/file company-scoped.
16. Internal admin dapat melihat upload melalui route admin yang memakai internal guard, tetapi tidak dapat upload logo atas nama customer melalui endpoint customer.

## Role guard logo upload

- `POST /api/files/upload` untuk `company_logo` dan `embroidery_logo` membutuhkan permission `company_logo:write`.
- `POST /api/company/logos` dan `DELETE /api/company/logos/[id]` juga membutuhkan `company_logo:write`.
- Endpoint customer menolak header internal admin untuk flow upload/register/delete logo sampai route khusus seperti `/admin/customers/[id]/logos` dibuat.
- Response customer disanitasi; `storageKey`, `storageBucket`, provider internals, dan service role key tidak dikirim ke customer response.

## Known limitation

- Antivirus scan belum aktif; status masih foundation/TODO.
- SVG sanitization penuh belum aktif; SVG ditandai perlu sanitization.
- Supabase Storage RLS/object policies final masih perlu production hardening setelah auth production final.
- Admin upload atas nama customer belum tersedia.
- Product GLB admin upload belum aktif.
- Monitoring provider belum aktif.
