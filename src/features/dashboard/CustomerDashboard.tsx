"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  FileText,
  FolderArchive,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
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
import type {
  CustomerQuotationTracking,
  CustomerTrackingOrder,
} from "@/features/tracking/tracking.types";
import { CompanyLogoLibrary } from "@/features/company-assets/components/CompanyLogoLibrary";
import { mapQuotationToTracking } from "@/features/quotation/quotation.mapper";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import type { AuthSession } from "@/types/account";

export function CustomerDashboard() {
  const { session, isAuthenticated, hydrated, isProfileComplete } = useAuth();
  const cartCount = useCartCount();
  const cartHydrated = useCartHydrated();
  const openAuth = useUIStore((s) => s.openAuth);
  const [serverOrders, setServerOrders] = useState<CustomerTrackingOrder[]>([]);
  const [serverQuotations, setServerQuotations] = useState<
    CustomerQuotationTracking[]
  >([]);

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
  const dashboardQuotations = useMemo(() => {
    const seen = new Set<string>();
    return [...serverQuotations, ...snapshot.quotations].filter((quotation) => {
      if (seen.has(quotation.id)) return false;
      seen.add(quotation.id);
      return true;
    });
  }, [serverQuotations, snapshot.quotations]);

  useEffect(() => {
    if (!session) return;
    const activeSession = session;
    const controller = new AbortController();
      const params = new URLSearchParams({
        companyId: activeSession.company.id,
        userId: activeSession.user.id,
        companyName: activeSession.company.companyName,
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

    async function loadQuotations() {
      try {
        const response = await fetch(`/api/quotation?${params}`, {
          cache: "no-store",
          headers: authHeaders(activeSession),
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          ok: boolean;
          quotations?: QuotationRequestRecord[];
        };
        if (!response.ok || !result.ok) return;
        setServerQuotations(
          (result.quotations ?? []).map((quotation) =>
            mapQuotationToTracking(quotation),
          ),
        );
      } catch {
        if (!controller.signal.aborted) setServerQuotations([]);
      }
    }

    void loadTrackingOrders();
    void loadQuotations();
    return () => controller.abort();
  }, [session]);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8">
        <div className="h-28 w-full animate-pulse rounded-3xl bg-slate-200" />
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
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">Dashboard butuh login</h1>
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
  const firstName = user.fullName.split(" ")[0];
  const defaultAddress =
    company.addresses.find((address) => address.isDefaultShipping) ??
    company.addresses[0] ??
    null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
      <Breadcrumbs
        items={[{ label: "Beranda", href: "/" }, { label: "Dashboard" }]}
        className="mb-4"
      />
      {/* Hero banner */}
      <section className="animate-fade-in-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 shadow-glow-brand">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-60 w-60 rounded-full bg-ochre-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6 p-6 lg:p-8">
          <div className="min-w-0">
            <p className="type-eyebrow text-brand-200">Customer Dashboard</p>
            <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white lg:text-[2rem] lg:leading-[1.1]">
              Halo, {firstName}.
            </h1>
            <p className="mt-1.5 text-sm text-brand-100">
              {roleLabel(user.role)} di{" "}
              <span className="font-semibold text-white">
                {company.companyName || "profil perusahaan"}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isProfileComplete && (
              <Link
                href="/dashboard/profile"
                className="inline-flex h-9 items-center rounded-full border border-white/25 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Lengkapi profil
              </Link>
            )}
            <Link
              href="/catalog"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-brand-700 shadow-soft-sm transition hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.97]"
            >
              Mulai order
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <DashboardSummaryCards
        cartCount={cartHydrated ? cartCount : "-"}
        activeOrderCount={snapshot.activeOrders.length}
        quotationCount={dashboardQuotations.length}
        addressCount={company.addresses.length}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <section
            id="active-orders"
            aria-labelledby="active-orders-heading"
            className="animate-fade-in-up"
            style={{ animationDelay: "80ms" }}
          >
            <SectionHeader
              title="Active orders"
              headingId="active-orders-heading"
              trailing={
                <Badge tone="brand">{snapshot.activeOrders.length} berjalan</Badge>
              }
            />
            <ActiveOrdersList orders={snapshot.activeOrders} />
          </section>

          <section
            id="quotations"
            aria-labelledby="quotations-heading"
            className="animate-fade-in-up"
            style={{ animationDelay: "140ms" }}
          >
            <SectionHeader
              title="Quotation"
              headingId="quotations-heading"
              trailing={
                <ButtonLink href="/quote" size="sm" variant="ghost">
                  Request baru
                </ButtonLink>
              }
            />
            <QuotationList quotations={dashboardQuotations} />
          </section>

          <section
            id="order-history"
            aria-labelledby="order-history-heading"
            className="animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            <SectionHeader
              title="Order history"
              headingId="order-history-heading"
              trailing={
                <Badge tone="neutral">{snapshot.orderHistory.length} selesai</Badge>
              }
            />
            <OrderHistoryList orders={snapshot.orderHistory} />
          </section>
        </div>

        <aside className="space-y-4">
          <section className={asideCard}>
            <AsideTitle icon={<Building2 className="h-4 w-4" />}>
              Profil perusahaan
            </AsideTitle>
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

          <section className={asideCard}>
            <AsideTitle icon={<MapPin className="h-4 w-4" />}>Alamat</AsideTitle>
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

          <CompanyLogoLibrary />
          <PlaceholderPanel
            icon={<FileText className="h-4 w-4" />}
            title="Invoice"
            description="Invoice dan dokumen pembayaran akan tampil di sini setelah backend dokumen aktif."
          />
          <PlaceholderPanel
            icon={<FolderArchive className="h-4 w-4" />}
            title="Saved configuration"
            description="Konfigurasi 3D tersimpan dari Phase 4A akan menjadi library repeat order."
          />

          <section className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-brand-100/60 p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="mt-3 text-sm font-bold text-brand-900">Aksi customer</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-brand-800/90">
              Approve artwork, request revision, upload PO, contact sales, dan repeat order tersedia di halaman detail tracking masing-masing order.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4">
            <AsideTitle icon={<UserRound className="h-4 w-4" />}>Bantuan</AsideTitle>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Butuh bantuan? Hubungi tim sales atau buka Ofistant di sisi kiri layar untuk panduan pengadaan.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}

const asideCard =
  "rounded-2xl border border-line bg-surface p-5 shadow-soft-sm transition-shadow hover:shadow-soft-md";

function SectionHeader({
  title,
  headingId,
  trailing,
}: {
  title: string;
  headingId: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2
        id={headingId}
        className="flex items-center gap-2.5 text-sm font-bold text-ink"
      >
        <span className="h-4 w-1.5 rounded-full bg-brand-600" aria-hidden />
        {title}
      </h2>
      {trailing}
    </div>
  );
}

function AsideTitle({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold text-ink">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </span>
      {children}
    </h2>
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
    <section className="rounded-2xl border border-dashed border-line bg-surface/60 p-5">
      <h2 className="flex items-center gap-2.5 text-sm font-bold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-muted text-ink-subtle">
          {icon}
        </span>
        {title}
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{description}</p>
    </section>
  );
}

function authHeaders(session: AuthSession): HeadersInit {
  return {
    "x-ofissio-company-id": session.company.id,
    "x-ofissio-company-name": session.company.companyName,
    "x-ofissio-user-id": session.user.id,
    "x-ofissio-user-email": session.user.email,
    "x-ofissio-user-name": session.user.fullName,
    "x-ofissio-role": session.user.role,
  };
}
