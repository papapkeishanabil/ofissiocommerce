// src/app/not-found.tsx

import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto grid w-full max-w-xl place-items-center px-4 py-20 text-center">
      <p className="text-6xl font-black text-brand-600">404</p>
      <h1 className="mt-3 text-xl font-bold text-ink">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Produk atau halaman yang Anda cari tidak tersedia.
      </p>
      <ButtonLink href="/catalog" className="mt-5">
        Kembali ke katalog
      </ButtonLink>
      <Link
        href="/"
        className="mt-3 text-xs font-medium text-brand-700 hover:underline"
      >
        atau ke beranda
      </Link>
    </div>
  );
}
