import Link from "next/link";
import { AlertTriangle, Building2, Mail, MapPin, Phone } from "lucide-react";

import type {
  AdminOrderAddressSnapshot,
  AdminOrderCustomerSnapshot,
} from "@/features/admin/admin.types";

import { AdminSectionCard } from "./AdminSectionCard";

export function AdminOrderCustomerPanel({ customer }: { customer: AdminOrderCustomerSnapshot }) {
  const missingShipping = !customer.shippingAddress;
  return (
    <AdminSectionCard
      icon={Building2}
      tone="neutral"
      title="Customer dan alamat"
      description="Kontak operasional serta alamat yang dipakai untuk penagihan dan pengiriman."
      actions={
        <Link
          href={`/admin/customers/${encodeURIComponent(customer.companyId)}`}
          className="inline-flex min-h-9 items-center rounded-lg border border-line bg-white px-3 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
        >
          Buka customer
        </Link>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <div>
          <h3 className="text-lg font-extrabold text-ink">{customer.companyName}</h3>
          {customer.legalName && customer.legalName !== customer.companyName ? (
            <p className="mt-1 text-sm text-ink-muted">{customer.legalName}</p>
          ) : null}
          {customer.industry ? (
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-brand-700">
              {customer.industry}
            </p>
          ) : null}
          <dl className="mt-4 space-y-3 text-sm">
            <ContactRow icon={Building2} label="PIC" value={customer.picName ?? "Belum tersedia"} />
            <ContactRow icon={Mail} label="Email" value={customer.picEmail ?? "Belum tersedia"} />
            <ContactRow
              icon={Phone}
              label="Telepon / WhatsApp"
              value={customer.picWhatsapp ?? customer.phone ?? "Belum tersedia"}
            />
          </dl>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AddressBlock title="Alamat pengiriman" address={customer.shippingAddress} />
          <AddressBlock title="Alamat penagihan" address={customer.billingAddress} />
        </div>
      </div>

      {missingShipping ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-bold">Alamat pengiriman belum lengkap.</span>{" "}
            Lengkapi data customer sebelum cek ongkir atau membuat shipment Biteship.
          </p>
        </div>
      ) : null}
    </AdminSectionCard>
  );
}

function ContactRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
      <div>
        <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
        <dd className="break-words font-bold text-ink">{value}</dd>
      </div>
    </div>
  );
}

function AddressBlock({ title, address }: { title: string; address: AdminOrderAddressSnapshot | null }) {
  return (
    <section className="min-w-0 rounded-xl bg-slate-50 p-4">
      <h4 className="flex items-center gap-2 text-sm font-extrabold text-ink">
        <MapPin className="h-4 w-4 text-brand-700" aria-hidden="true" />
        {title}
      </h4>
      {address ? (
        <address className="mt-3 not-italic text-sm leading-6 text-ink-muted">
          <span className="block font-bold text-ink">{address.recipientName}</span>
          <span className="block">{address.recipientPhone}</span>
          <span className="mt-1 block">{address.street}</span>
          <span className="block">
            {address.city}, {address.province} {address.postalCode}
          </span>
          <span className="mt-2 inline-flex rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink-muted ring-1 ring-line">
            {address.label}
          </span>
        </address>
      ) : (
        <p className="mt-3 text-sm font-semibold text-amber-800">Belum tersedia</p>
      )}
    </section>
  );
}
