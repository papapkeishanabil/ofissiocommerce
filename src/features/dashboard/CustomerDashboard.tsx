"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { DashboardOverview } from "./components/DashboardOverview";
import { loadCustomerTrackingSnapshot } from "@/features/tracking/tracking-client";
import type { DashboardTrackingSnapshot } from "@/features/tracking/tracking.types";
import type { AuthSession } from "@/types/account";
import type { AccountView } from "./components/AccountSidebar";

export function CustomerDashboard({ initialView = "overview" }: { initialView?: AccountView }) {
  const { session, isAuthenticated, hydrated, isProfileComplete } = useAuth();
  const openAuth = useUIStore((s) => s.openAuth);

  if (!hydrated) return <DashboardLoading />;

  if (!isAuthenticated || !session) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-24 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">Dashboard butuh login</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Masuk untuk melihat tracking order, penawaran, dokumen, dan konfigurasi tersimpan.
        </p>
        <Button className="mt-5" onClick={() => openAuth({ kind: "none" })}>
          Masuk / Daftar
        </Button>
      </div>
    );
  }

  // Remount account data when the user/company changes; old responses and
  // transaction state must not be displayed for the next session.
  return <AuthenticatedDashboard
    key={`${session.user.id}:${session.company.id}:${initialView}`}
    initialView={initialView}
    session={session}
    profileComplete={isProfileComplete}
  />;
}

type DashboardLoadResult =
  | { attempt: number; ok: true; snapshot: DashboardTrackingSnapshot }
  | { attempt: number; ok: false };

function AuthenticatedDashboard({ session, profileComplete, initialView }: {
  initialView: AccountView;
  session: AuthSession;
  profileComplete: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<DashboardLoadResult | null>(null);
  const companyId = session.company.id;
  const companyName = session.company.companyName;
  const userId = session.user.id;

  useEffect(() => {
    const controller = new AbortController();
    void loadCustomerTrackingSnapshot({ companyId, companyName, userId, signal: controller.signal })
      .then((snapshot) => {
        if (!controller.signal.aborted) setResult({ attempt, ok: true, snapshot });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ attempt, ok: false });
      });
    return () => controller.abort();
  }, [attempt, companyId, companyName, userId]);

  if (!result || result.attempt !== attempt) return <DashboardLoading />;
  if (!result.ok) {
    return <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div role="alert" className="rounded-2xl border border-line bg-surface p-6">
        <h1 className="text-lg font-bold text-ink">Data akun belum dapat dimuat</h1>
        <p className="mt-2 text-sm text-ink-muted">Daftar pesanan dan penawaran belum dapat diperiksa. Silakan coba lagi.</p>
        <Button className="mt-4" onClick={() => setAttempt((value) => value + 1)}>Coba lagi</Button>
      </div>
    </div>;
  }
  return <DashboardOverview
    initialView={initialView}
    session={session}
    profileComplete={profileComplete}
    orders={result.snapshot.activeOrders}
    history={result.snapshot.orderHistory}
    quotations={result.snapshot.quotations}
  />;
}

function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-cool-200" />
      <div className="mt-3 h-5 w-80 animate-pulse rounded-lg bg-cool-100" />
      <div className="mt-8 grid grid-cols-3 gap-4" role="status" aria-label="Memuat dashboard">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-cool-100" />
        ))}
      </div>
      <div className="mt-8 h-64 animate-pulse rounded-2xl bg-cool-100" />
    </div>
  );
}
