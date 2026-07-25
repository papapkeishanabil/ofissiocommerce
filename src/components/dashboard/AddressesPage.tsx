// src/components/dashboard/AddressesPage.tsx
"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { removeAddress } from "@/lib/auth/auth-service";
import { Building2, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CompanyAddressForm } from "@/components/company/CompanyAddressForm";

export function AddressesPage() {
  const { session, isAuthenticated, hydrated, refresh } = useAuth();
  const [openAdd, setOpenAdd] = useState(false);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return (
      <div className="mx-auto grid w-full max-w-md place-items-center px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-ink">Login diperlukan</h1>
      </div>
    );
  }

  const addresses = session.company.addresses;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Building2 className="h-6 w-6 text-brand-700" />
            Alamat
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Kelola alamat pengiriman & penagihan perusahaan.
          </p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </header>

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-ink">
            Belum ada alamat
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Tambahkan minimal satu alamat untuk checkout.
          </p>
          <Button className="mt-4" onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4" /> Tambah alamat
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-ink">{a.label}</span>
                    {a.isDefaultShipping && <Badge tone="brand">Kirim utama</Badge>}
                    {a.isDefaultBilling && <Badge tone="neutral">Tagih utama</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink">
                    {a.recipientName} · {a.recipientPhone}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {a.street}, {a.city}, {a.province} {a.postalCode}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Hapus ${a.label}`}
                  onClick={() => {
                    removeAddress(session.company.id, a.id);
                    refresh();
                  }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Tambah alamat"
        size="md"
      >
        <CompanyAddressForm
          onSuccess={() => {
            setOpenAdd(false);
            refresh();
          }}
        />
      </Modal>
    </div>
  );
}
