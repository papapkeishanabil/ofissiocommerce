// src/components/dashboard/AddressesPage.tsx
"use client";

import { useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import type { Address } from "@/types/account";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CompanyAddressForm } from "@/components/company/CompanyAddressForm";

export function AddressesPage() {
  const { session, isAuthenticated, hydrated, refresh } = useAuth();
  const [openAdd, setOpenAdd] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteAddress(address: Address) {
    if (!window.confirm(`Hapus alamat ${address.label}?`)) return;
    setPageError(null);
    setDeletingId(address.id);
    try {
      const response = await fetch(
        `/api/company/addresses/${encodeURIComponent(address.id)}`,
        { method: "DELETE" },
      );
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "Alamat belum dapat dihapus.");
      }
      await refresh();
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Alamat belum dapat dihapus.",
      );
    } finally {
      setDeletingId(null);
    }
  }

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
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Alamat" },
        ]}
        className="mb-4"
      />
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

      {pageError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {pageError}
        </div>
      )}

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
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${a.label}`}
                    onClick={() => setEditingAddress(a)}
                    className="grid h-11 w-11 place-items-center rounded-xl text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus ${a.label}`}
                    disabled={deletingId === a.id}
                    onClick={() => void deleteAddress(a)}
                    className="grid h-11 w-11 place-items-center rounded-xl text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-wait disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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

      <Modal
        open={Boolean(editingAddress)}
        onClose={() => setEditingAddress(null)}
        title="Edit alamat"
        size="md"
      >
        {editingAddress && (
          <CompanyAddressForm
            address={editingAddress}
            onSuccess={() => {
              setEditingAddress(null);
              refresh();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
