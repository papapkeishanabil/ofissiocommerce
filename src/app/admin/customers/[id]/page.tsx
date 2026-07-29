import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { getAdminCustomerDetail } from "@/features/admin/admin.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const detail = await getAdminCustomerDetail(id);
  if (!detail) notFound();
  return (
    <div className="space-y-5">
      <Link href="/admin/customers" className="text-sm font-bold text-brand-700">
        ← Back to customers
      </Link>
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-700">Customer company</p>
            <h2 className="mt-1 text-2xl font-black text-ink">{detail.customer.companyName}</h2>
            <p className="break-all text-sm text-ink-muted">{detail.customer.companyId}</p>
          </div>
          <AdminBadge tone={adminStatusTone(detail.customer.status)}>{detail.customer.status}</AdminBadge>
        </div>
      </section>
      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
          <h3 className="font-black text-ink">Quotations</h3>
          {detail.quotations.length === 0 ? <AdminEmptyState title="Belum ada quotation" /> : (
            <div className="mt-3 space-y-2">
              {detail.quotations.map((item) => (
                <Link key={item.id} href={`/admin/quotations/${item.id}`} className="block rounded-2xl bg-slate-50 p-3 text-sm font-bold text-brand-700">
                  {item.quotationNumber}
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
          <h3 className="font-black text-ink">Orders</h3>
          {detail.orders.length === 0 ? <AdminEmptyState title="Belum ada order" /> : (
            <div className="mt-3 space-y-2">
              {detail.orders.map((item) => (
                <Link key={item.id} href={`/admin/orders/${item.id}`} className="block rounded-2xl bg-slate-50 p-3 text-sm font-bold text-brand-700">
                  {item.orderNumber}
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-soft-sm">
          <h3 className="font-black text-ink">Uploads</h3>
          {detail.uploads.length === 0 ? <AdminEmptyState title="Belum ada upload" /> : (
            <div className="mt-3 space-y-2">
              {detail.uploads.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                  <p className="font-bold text-ink">{item.originalFilename}</p>
                  <p className="break-all text-xs text-ink-muted">{item.id}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
