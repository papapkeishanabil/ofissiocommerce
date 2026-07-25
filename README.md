# Ofissio

> Conversational B2B commerce platform untuk pengadaan seragam kerja perusahaan.

**Status:** Phase 1 — Commerce Foundation (dummy data, no AI/payment/shipping/3D yet).

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (CSS-first config)
- Zustand (cart state, persisted to localStorage)
- lucide-react (icons)

## Quick start
```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts
| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Jalankan dev server |
| `npm run build` | Build produksi |
| `npm run start` | Serve hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` strict check |

## Layout
- **Desktop (lg+):** Ofistant panel kiri persistent (400px) + commerce workspace kanan (flex).
- **Mobile (<lg):** Workspace full-width; Ofistant = floating button (kanan-bawah) → bottom sheet; cart badge di header.

## Phase 1 cakupan
- Application shell split-panel (responsive)
- Ofistant placeholder (welcome + 8 quick choices industri)
- Homepage, catalog (filter by `?industri=`), product detail
- Size quantity matrix (qty per S/M/L/XL/2XL/3XL) + MOQ validation
- Cart (persisted localStorage) dengan editor per ukuran

Lihat `docs/roadmap.md` untuk peta fase selanjutnya.
