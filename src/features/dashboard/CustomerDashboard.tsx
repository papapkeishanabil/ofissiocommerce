"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  FileText,
  FolderArchive,
  ImagePlus,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/use-auth";
import { useCartCount, useCartHydrated } from "@/hooks/use-cart";
import { useUIStore } from "@/stores/ui-store";
import { roleLabel } from "@/types/account";

import { ActiveOrdersList } from "./components/ActiveOrdersList";
import { DashboardSummaryCards } from "./components/DashboardSummaryCards";
import { OrderHistoryList } from "./components/OrderHistoryList";
import { QuotationList } from "./components/QuotationList";
import {
  cacheClientTrackingOrders,
  getDashboardTrackingSnapshot,
} from "@/features/tracking/tracking.service";
import type { CustomerTrackingOrder } from "@/features/tracking/tracking.types";

export function CustomerDashboard() {
  const { session, isAuthenticated, hydrated, isProfileComplete } = useAuth();
  const cartCount = useCartCount();
  const cartHydrated = useCartHydrated();
  const openAuth = useUIStore((s) => s.openAuth);
  const [serverOrders, setServerOrders] = useState<CustomerTrackingOrder[]>([]);

  const snapshot = useMemo(
    () =>
      getDashboardTrackingSnapshot(
        {
          companyId: session?.company.id,
          companyName: session?.company.companyName,
        },
        serverOrders,
      ),
    [serverOrders, session?.company.companyName, session?.company.id],
  );

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      companyId: session.company.id,
      companyName: session.company.companyName,
    });

    async function loadTrackingOrders() {
      try {
        const response = await fetch(`/api/tracking/orders?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          ok: boolean;
          dynamicOrders?: CustomerTrackingOrder[];
        };
        if (!response.ok || !result.ok) return;
        const dynamicOrders = result.dynamicOrders ?? [];
        setServerOrders(dynamicOrders);
        cacheClientTrackingOrders(dynamicOrders);
      } catch {
        if (!controller.signal.aborted) setServerOrders([]);
      }
    }

    void loadTrackingOrders();
    return () => controller.abort();
  }, [session]);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <ShieldCheck className="h-10 w-10 text-brand-600" />
        <h1 className="mt-3 text-lg font-bold text-ink">Dashboard butuh login</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Masuk untuk melihat tracking order, quotation, dokumen, dan konfigurasi tersimpan.
        </p>
        <Button className="mt-5" onClick={() => openAuth({ kind: "none" })}>
          Masuk / Daftar
        </Button>
      </div>
    );
  }

  const { company, user } = session;
  const defaultAddress =
    company.addresses.find((address) => address.isDefaultShipping) ??
    company.addresses[0] ??
    null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="type-eyebrow text-brand-700">Customer Dashboard</p>
          <h1 className="mt-2 text-2xl font-bold text-ink lg:text-3xl">
            Halo, {user.fullName.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {roleLabel(user.role)} di{" "}
            <span className="font-semibold text-ink">
              {company.companyName || "profil perusahaan"}
            </span>
          </p>
        </div>
        {!isProfileComplete && (
          <ButtonLink href="/dashboard/profile" size="sm" variant="outline">
            Lengkapi profil
          </ButtonLink>
        )}
      </header>

      <DashboardSummaryCards
        cartCount={cartHydrated ? cartCount : "-"}
        activeOrderCount={snapshot.activeOrders.length}
        quotationCount={snapshot.quotations.length}
        addressCount={company.addresses.length}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6">
          <section id="active-orders" aria-labelledby="active-orders-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="active-orders-heading" className="text-sm font-bold text-ink">
                Active orders
              </h2>
              <Badge tone="brand">{snapshot.activeOrders.length} berjalan</Badge>
            </div>
            <ActiveOrdersList orders={snapshot.activeOrders} />
          </section>

          <section id="quotations" aria-labelledby="quotations-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="quotations-heading" className="text-sm font-bold text-ink">
                Quotation
              </h2>
              <ButtonLink href="/quote" size="sm" variant="ghost">
                Request baru
              </ButtonLink>
            </div>
            <QuotationList quotations={snapshot.quotations} />
          </section>

          <section id="order-history" aria-labelledby="order-history-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="order-history-heading" className="text-sm font-bold text-ink">
                Order history
              </h2>
              <Badge tone="neutral">{snapshot.orderHistory.length} selesai</Badge>
            </div>
            <OrderHistoryList orders={snapshot.orderHistory} />
          </section>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <Building2 className="h-4 w-4 text-brand-700" />
              Profil perusahaan
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <InfoRow label="Nama" value={company.companyName || "-"} />
              <InfoRow label="Industri" value={company.industry || "-"} />
              <InfoRow label="Karyawan" value={String(company.employeeCount || 0)} />
              <InfoRow label="PIC" value={company.picName || user.fullName} />
              <InfoRow label="Email" value={company.picEmail || user.email} />
            </dl>
            <ButtonLink href="/dashboard/profile" size="sm" variant="outline" className="mt-4 w-full">
              Edit profil
            </ButtonLink>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
              <MapPin className="h-4 w-4 text-brand-700" />
              Alamat
            </h2>
            {defaultAddress ? (
              <div className="mt-3 rounded-xl bg-surface-muted p-3 text-xs text-ink-muted">
                <p className="font-bold text-ink">{defaultAddress.label}</p>
                <p className="mt-1">{defaultAddress.recipientName}</p>
                <p>
                  {defaultAddress.street}, {defaultAddress.city},{" "}
                  {defaultAddress.province} {defaultAddress.postalCode}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-ink-muted">
                Belum ada alamat pengiriman.
              </p>
            )}
            <ButtonLink href="/dashboard/addresses" size="sm" variant="ghost" className="mt-3 w-full">
              Kelola alamat
            </ButtonLink>
          </section>

          <PlaceholderPanel
            icon={<ImagePlus className="h-4 w-4 text-brand-700" />}
            title="Logo library"
            description="Placeholder penyimpanan logo perusahaan untuk order bordir berikutnya."
          />
          <PlaceholderPanel
            icon={<FileText className="h-4 w-4 text-brand-700" />}
            title="Invoice"
            description="Invoice dan dokumen pembayaran akan tampil di sini setelah backend dokumen aktif."
          />
          <PlaceholderPanel
            icon={<FolderArchive className="h-4 w-4 text-brand-700" />}
            title="Saved configuration"
            description="Konfigurasi 3D tersimpan dari Phase 4A akan menjadi library repeat order."
          />

          <section className="rounded-2xl border border-line bg-brand-50/60 p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
              <UserRound className="h-4 w-4" />
              Aksi customer
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-brand-800">
              Approve artwork, request revision, upload PO, contact sales, dan repeat order tersedia di halaman detail tracking masing-masing order.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

function PlaceholderPanel({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-2xl border border-dashed border-line bg-surface p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        {icon}
        {title}
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{description}</p>
    </section>
  );
}
