import { AdminBadge, adminStatusTone } from "@/features/admin/components/AdminBadge";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import {
  ADMIN_TABLE_CLASS,
  AdminPageHeader,
  AdminTableShell,
} from "@/features/admin/components/AdminSurface";
import { listAdminUploads } from "@/features/admin/admin.service";
import { formatAdminDate, formatFileSize } from "@/features/admin/admin.utils";

export default async function AdminUploadsPage() {
  const uploads = await listAdminUploads({}, { includeSignedUrls: true });
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Uploads / Logos"
        title="Customer uploaded file metadata"
        description="Provider, bucket, file type, dan status terlihat untuk operasional. Storage key dan service role tidak ditampilkan."
      />
      {uploads.length === 0 ? (
        <AdminEmptyState title="Belum ada upload" />
      ) : (
        <AdminTableShell>
          <table className={`${ADMIN_TABLE_CLASS} min-w-[1180px]`}>
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3">File ID</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Bucket</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">MIME</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Security</th>
                <th className="px-4 py-3">View</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((file) => (
                <tr key={file.id} className="align-top">
                  <td className="px-4 py-3 break-all font-mono text-xs font-bold text-ink">{file.id}</td>
                  <td className="px-4 py-3 break-all text-ink-muted">{file.companyId}</td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={file.storageProvider === "supabase" ? "success" : "neutral"}>
                      {file.storageProvider}
                    </AdminBadge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{file.storageBucket}</td>
                  <td className="px-4 py-3">{file.fileType}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{file.originalFilename}</div>
                    <div className="text-xs text-ink-muted">{file.safeFilename}</div>
                  </td>
                  <td className="px-4 py-3">{file.mimeType}</td>
                  <td className="px-4 py-3">{formatFileSize(file.sizeBytes)}</td>
                  <td className="px-4 py-3"><AdminBadge tone={adminStatusTone(file.status)}>{file.status}</AdminBadge></td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    <div>scan: {file.scanStatus}</div>
                    <div>sanitize: {file.sanitizedStatus}</div>
                  </td>
                  <td className="px-4 py-3">
                    {file.signedUrl ? (
                      <a
                        href={file.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center rounded-full bg-brand-700 px-3 py-1.5 text-xs font-black text-white hover:bg-brand-800"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700">
                        signed URL unavailable
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatAdminDate(file.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      )}
    </div>
  );
}
