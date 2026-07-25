// src/components/dashboard/CustomerDashboard.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useAuth } from "@/hooks/use-auth";
import { useCartCount, useCartHydrated } from "@/hooks/use-cart";
import { listOrders, listQuotations } from "@/lib/commerce/order-service";
import { roleLabel } from "@/types/account";
import {
  statusLabel,
  quotationStatusLabel,
} from "@/types/order";
import { formatIDR } from "@/types/product";
import {
  Briefcase,
  FileText,
  MapPin,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";

export function CustomerDashboard() {
  const { session, isAuthenticated, hydrated } = useAuth();
  const cartCount = useCartCount();
  const cartHydrated = useCartHydrated();

  const orders = useMemo(
    () => (session ? listOrders(session.company.id) : []),
    [session],
  );
  const quotations = useMemo(
    () => (session ? listQuotations(session.company.id) : []),
    [session],
  );

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Dashboard butuh login</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Masuk untuk melihat profil perusahaan, order, dan quotation Anda.
        </p>
        <ButtonLink href="/login" className="mt-5">
          Masuk
        </ButtonLink>
      </div>
    );
  }

  const { company, user } = session;
  const profileComplete =
    !!company.companyName &&
    !!company.industry &&
    company.employeeCount > 0 &&
    !!company.profileCompletedAt;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-8">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink lg:text-3xl">
          Halo, {user.fullName.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {roleLabel(user.role)} di{" "}
          <span className="font-semibold text-ink">
            {company.companyName || "(profil belum lengkap)"}
          </span>
        </p>
      </header>

      {/* Profile completion banner */}
      {!profileComplete && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div>
            <p className="text-sm font-bold text-amber-900">
              Lengkapi profil perusahaan
            </p>
            <p className="text-xs text-amber-800">
              Diperlukan untuk checkout & request quotation.
            </p>
          </div>
          <ButtonLink href="/dashboard/profile" size="sm">
            Lengkapi sekarang
          </ButtonLink>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Item di cart"
          value={cartHydrated ? String(cartCount) : "—"}
          href="/cart"
        />
        <StatCard
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Total order"
          value={String(orders.length)}
          href="#orders"
        />
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Quotation"
          value={String(quotations.length)}
          href="#quotations"
        />
        <StatCard
          icon={<MapPin className="h-4 w-4" />}
          label="Alamat"
          value={String(company.addresses.length)}
          href="/dashboard/addresses"
        />
      </div>

      {/* Company profile card */}
      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Briefcase className="h-4 w-4 text-brand-700" />
            Profil Perusahaan
          </h2>
          <ButtonLink href="/dashboard/profile" variant="ghost" size="sm">
            Edit
          </ButtonLink>
        </div>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <DL label="Nama" value={company.companyName || "—"} />
          <DL label="Industri" value={company.industry || "—"} />
          <DL label="Karyawan" value={String(company.employeeCount || 0)} />
          <DL label="Telepon" value={company.phone || "—"} />
          <DL label="PIC" value={`${company.picName} (${company.picEmail})`} />
          <DL label="NPWP" value={company.npwp || "—"} />
        </dl>
      </section>

      {/* Orders */}
      <section id="orders" className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <ShoppingBag className="h-4 w-4 text-brand-700" />
            Order
          </h2>
        </div>
        {orders.length === 0 ? (
          <EmptyRow text="Belum ada order." cta />
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-sm"
              >
                <div>
                  <Link
                    href={`/orders/${o.id}`}
                    className="font-semibold text-ink hover:text-brand-700"
                  >
                    {o.code}
                  </Link>
                  <p className="text-[11px] text-ink-muted">
                    {o.items.length} item · {formatIDR(o.total)}
                  </p>
                </div>
                <Badge tone="amber">{statusLabel(o.status)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quotations */}
      <section id="quotations" className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <FileText className="h-4 w-4 text-brand-700" />
            Quotation
          </h2>
        </div>
        {quotations.length === 0 ? (
          <EmptyRow text="Belum ada quotation." cta />
        ) : (
          <ul className="space-y-2">
            {quotations.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-sm"
              >
                <div>
                  <Link
                    href={`/quotes/${q.id}`}
                    className="font-semibold text-ink hover:text-brand-700"
                  >
                    {q.code}
                  </Link>
                  <p className="text-[11px] text-ink-muted">
                    {q.items.length} item diajukan
                  </p>
                </div>
                <Badge tone="brand">{quotationStatusLabel(q.status)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex justify-end">
        <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => {}}>
          Logout
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4 transition hover:border-brand-300 hover:bg-brand-50/30"
    >
      <span className="text-brand-700">{icon}</span>
      <span className="text-2xl font-bold text-ink">{value}</span>
      <span className="text-[11px] text-ink-muted">{label}</span>
    </Link>
  );
}

function DL({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

function EmptyRow({ text, cta }: { text: string; cta?: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-4 py-6 text-center text-sm text-ink-muted">
      <p>{text}</p>
      {cta && (
        <ButtonLink href="/catalog" variant="ghost" size="sm" className="mt-2">
          Mulai belanja
        </ButtonLink>
      )}
    </div>
  );
}
