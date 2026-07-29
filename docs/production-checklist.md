# Production checklist

## Pre-launch

- [ ] Domain aktif.
- [ ] HTTPS aktif.
- [ ] Env production lengkap.
- [ ] Auth provider production siap.
- [ ] Database production siap.
- [ ] Storage production siap.
- [ ] Storage bucket customer private.
- [ ] Signed URL private file berjalan.
- [ ] SVG sanitization aktif.
- [ ] Antivirus/file scanning aktif atau risk exception terdokumentasi.
- [ ] RLS/company isolation production siap.
- [ ] Secret tidak ada di Git.
- [ ] `.env.local` tidak ter-commit.
- [ ] `.env.production` tidak ter-commit.
- [ ] Build production lulus.
- [ ] Typecheck lulus.
- [ ] Lint lulus.
- [ ] Security smoke test lulus.
- [ ] Backup plan tersedia.
- [ ] Monitoring plan tersedia.
- [ ] Privacy Policy siap.
- [ ] Terms & Conditions siap.
- [ ] Refund/return policy siap.
- [ ] Contact page siap.
- [ ] Email sender domain verified.
- [ ] Resend API key production siap.
- [ ] WooCommerce production configured.
- [ ] WooCommerce products punya GLB valid.
- [ ] Produk tanpa GLB tidak tampil.
- [ ] iPaymu callback URL registered.
- [ ] iPaymu signature live verified.
- [ ] Shipping provider credentials siap.
- [ ] GLB model hosting aman.
- [ ] File upload customer company-scoped.
- [ ] CSP tidak memblokir GLB.
- [ ] Test transaction berhasil.
- [ ] Test quotation berhasil.
- [ ] Test email berhasil.
- [ ] Test tracking berhasil.
- [ ] Test mobile berhasil.
- [ ] Test order sync WooCommerce berhasil.
- [ ] Test restore backup berhasil.

## Post-launch

- [ ] Monitor checkout error.
- [ ] Monitor payment callback.
- [ ] Monitor email delivery.
- [ ] Monitor 3D model load.
- [ ] Monitor WooCommerce sync.
- [ ] Monitor failed login.
- [ ] Monitor upload failure.
- [ ] Cek backup pertama.
- [ ] Cek order pertama manual.
- [ ] Cek quotation pertama manual.
- [ ] Cek customer reply email.
- [ ] Review audit log harian minggu pertama.
