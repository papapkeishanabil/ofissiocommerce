import Link from "next/link";

import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import {
  ADMIN_TABLE_CLASS,
  AdminPageHeader,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";
import { listAdminCustomers } from "@/features/admin/admin.service";
import { formatAdminDate } from "@/features/admin/admin.utils";

export default async function AdminCustomersPage() {
  const customers = await listAdminCustomers();
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Customers"
        title="Company operational overview"
        description="Menggabungkan company table dan jejak operasional quotation, order, upload, serta status customer untuk admin internal."
      />
      {customers.length === 0 ? (
        <AdminEmptyState title="Belum ada company" />
      ) : (
        <AdminTableShell>
          <table className={`${ADMIN_TABLE_CLASS} min-w-[920px]`}>
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Employees</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Quotations</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.companyId}>
                  <td className="px-4 py-3">
                    <div className="font-bold text-ink">{customer.companyName}</div>
                    <div className="break-all text-xs text-ink-muted">{customer.companyId}</div>
                  </td>
                  <td className="px-4 py-3">{customer.industry ?? "-"}</td>
                  <td className="px-4 py-3">{customer.employeeCount ?? "-"}</td>
                  <td className="px-4 py-3"><AdminBadge tone={adminStatusTone(customer.status)}>{customer.status}</AdminBadge></td>
                  <td className="px-4 py-3">{customer.userCount}</td>
                  <td className="px-4 py-3">{customer.quotationCount}</td>
                  <td className="px-4 py-3">{customer.orderCount}</td>
                  <td className="px-4 py-3">{formatAdminDate(customer.createdAt)}</td>
                  <td className="px-4 py-3"><Link href={`/admin/customers/${customer.companyId}`} className="font-bold text-brand-700">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      )}
    </div>
  );
}
