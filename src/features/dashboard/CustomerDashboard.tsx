"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { DashboardOverview } from "./components/DashboardOverview";
import {
  cacheClientTrackingOrders,
  getDashboardTrackingSnapshot,
} from "@/features/tracking/tracking.service";
import type {
  CustomerQuotationTracking,
  CustomerTrackingOrder,
} from "@/features/tracking/tracking.types";

import { mapQuotationToTracking } from "@/features/quotation/quotation.mapper";
import type { QuotationRequestRecord } from "@/features/quotation/quotation.types";
import type { AuthSession } from "@/types/account";

export function CustomerDashboard() {
  const { session, isAuthenticated, hydrated, isProfileComplete } = useAuth();
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

  return <DashboardOverview session={session} profileComplete={isProfileComplete} orders={snapshot.activeOrders} history={snapshot.orderHistory} quotations={dashboardQuotations} />;
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
