# Git push checklist

Jangan push otomatis dari Codex. Jalankan checklist ini sebelum push.

## Pre-push

- [ ] `git status` dicek.
- [ ] Tidak ada `.env`.
- [ ] Tidak ada `.env.local`.
- [ ] Tidak ada `.env.production`.
- [ ] Tidak ada API key.
- [ ] Tidak ada secret.
- [ ] Tidak ada `.server-dev.log`.
- [ ] Tidak ada `debug.log`.
- [ ] Tidak ada `.next`.
- [ ] Tidak ada `node_modules`.
- [ ] File besar sudah dipertimbangkan.

## GLB

`public/3d/kk-006.glb` berukuran sekitar 28 MB dan masih wajar untuk development. Jika jumlah GLB bertambah atau ukurannya membesar, gunakan Git LFS atau object storage/CDN.

## Command manual

```bash
git status
npm run typecheck
npm run lint
npm run build
git add .
git commit -m "chore: complete phase 9 production readiness"
git push origin <branch-name>
```
