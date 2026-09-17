"use client";

import Link from "next/link";
import { MessageCircle, Save, UserCheck } from "lucide-react";
import { useState } from "react";

import type { AdminNotification } from "../admin-notification.types";
import type { SupportTicketContact } from "../support-ticket.service";
import { useAdminNotifications } from "./AdminNotificationProvider";

export function SupportTicketWorkspace({ initialTicket, contact }: { initialTicket: AdminNotification; contact: SupportTicketContact }) {
  const { request, refresh } = useAdminNotifications();
  const [ticket, setTicket] = useState(initialTicket);
  const [note, setNote] = useState(String(initialTicket.metadata.followupNote ?? ""));
  const [nextFollowupAt, setNextFollowupAt] = useState(toLocalInput(String(initialTicket.metadata.nextFollowupAt ?? "")));
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ticketNumber = ticket.entityNumber ?? ticket.entityId;
  const whatsappNumber = normalizeWhatsapp(contact.picWhatsapp);
  const whatsappText = `Halo Pak/Bu ${contact.picName}, saya dari Ofissio. Kami menerima permintaan konsultasi Full Custom/Production dengan nomor tiket ${ticketNumber}. Saya akan membantu menggali kebutuhan desain, bahan, ukuran, jumlah, dan target waktunya.`;
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}` : null;

  async function update(action: "contact_started" | "save_followup" | "waiting_customer" | "resolve") {
    setBusy(true); setMessage(null);
    try {
      const response = await request(`/api/admin/support-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note, nextFollowupAt: nextFollowupAt ? new Date(nextFollowupAt).toISOString() : null }),
      });
      const result = await response.json().catch(() => ({})) as { notification?: AdminNotification; message?: string };
      if (!response.ok || !result.notification) throw new Error(result.message ?? "Tiket belum dapat diperbarui.");
      setTicket(result.notification); setMessage(action === "contact_started" ? "Follow-up WhatsApp dimulai dan tercatat." : "Perubahan tiket tersimpan.");
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tiket belum dapat diperbarui."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <section className="rounded-2xl border border-line bg-white p-6 shadow-soft-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-700">Tiket konsultasi Full Custom</p><h1 className="mt-2 text-2xl font-black text-ink">{ticketNumber}</h1><p className="mt-1 text-sm text-ink-muted">{ticket.title}</p></div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">{followupLabel(ticket)}</span>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Perusahaan" value={contact.companyName} /><Info label="PIC" value={contact.picName} /><Info label="WhatsApp" value={contact.picWhatsapp || "Belum tersedia"} /><Info label="Email" value={contact.picEmail || "Belum tersedia"} />
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-ink-subtle">Permintaan customer</p><p className="mt-2 text-sm leading-6 text-ink">{String(ticket.metadata.reason ?? ticket.message)}</p></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DeliveryStatus
          label="Email ke CS"
          status={ticket.emailStatus}
          detail={ticket.emailError ?? (ticket.emailStatus === "sent" ? "Email berhasil dikirim ke CS Full Custom aktif." : "Menunggu proses pengiriman email.")}
        />
        <DeliveryStatus
          label="Push ke perangkat CS"
          status={String((ticket.metadata.pushDispatch as { status?: string } | undefined)?.status ?? "unknown")}
          detail={pushDetail(ticket)}
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" onClick={() => void update("contact_started")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> Hubungi customer via WhatsApp</a> : <span className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Nomor WhatsApp PIC belum tersedia.</span>}
        <Link href={`/admin/quotations/new?ticket=${encodeURIComponent(ticket.id)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-bold text-brand-800"><UserCheck className="h-4 w-4" /> Buat brief Full Custom</Link>
      </div>
    </section>
    <section className="rounded-2xl border border-line bg-white p-6 shadow-soft-sm">
      <h2 className="text-lg font-bold text-ink">Catatan follow-up CS</h2><p className="mt-1 text-sm text-ink-muted">Rekap hasil WhatsApp agar kebutuhan customer tidak hilang dan dapat diteruskan menjadi brief.</p>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={7} placeholder="Catat desain, bahan, warna, ukuran, quantity, target waktu, file referensi, dan hal yang masih perlu dikonfirmasi." className="mt-4 w-full rounded-xl border border-line p-4 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
      <label className="mt-4 block text-sm font-bold text-ink">Jadwal follow-up berikutnya<input type="datetime-local" value={nextFollowupAt} onChange={(event) => setNextFollowupAt(event.target.value)} className="mt-2 block min-h-11 w-full max-w-sm rounded-xl border border-line px-3 text-sm" /></label>
      <div className="mt-5 flex flex-wrap gap-3"><button disabled={busy} onClick={() => void update("save_followup")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" /> Simpan catatan</button><button disabled={busy} onClick={() => void update("waiting_customer")} className="min-h-11 rounded-xl border border-line px-4 text-sm font-bold text-ink">Menunggu jawaban customer</button><button disabled={busy} onClick={() => void update("resolve")} className="min-h-11 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800">Tutup tiket</button></div>
      {message ? <p className="mt-3 text-sm font-semibold text-brand-700" role="status">{message}</p> : null}
      {ticket.metadata.assignedTo ? <p className="mt-4 text-xs text-ink-muted">Ditangani oleh {String(ticket.metadata.assignedTo)}{ticket.metadata.contactedAt ? `, follow-up dimulai ${new Date(String(ticket.metadata.contactedAt)).toLocaleString("id-ID")}` : ""}</p> : null}
    </section>
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-line bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-ink-subtle">{label}</p><p className="mt-1 break-words text-sm font-semibold text-ink">{value}</p></div>; }
function DeliveryStatus({ label, status, detail }: { label: string; status: string; detail: string }) { const success = status === "sent" || status === "mocked"; return <div className={`rounded-xl border p-3 ${success ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase text-ink-subtle">{label}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${success ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{deliveryLabel(status)}</span></div><p className="mt-2 text-xs leading-5 text-ink-muted">{detail}</p></div>; }
function deliveryLabel(status: string) { if (status === "sent") return "Terkirim"; if (status === "mocked") return "Simulasi"; if (status === "partial") return "Sebagian"; if (status === "no_subscribers") return "Belum ada perangkat"; if (status === "not_configured") return "Belum dikonfigurasi"; if (status === "pending") return "Menunggu"; if (status === "failed") return "Gagal"; return "Belum tersedia"; }
function pushDetail(ticket: AdminNotification) { const dispatch = ticket.metadata.pushDispatch as { eligible?: number; sent?: number; failed?: number; status?: string } | undefined; if (!dispatch) return "Status push belum tersedia untuk tiket lama."; if (dispatch.status === "no_subscribers") return "Belum ada perangkat CS yang menekan Aktifkan notifikasi."; if (dispatch.status === "not_configured") return "Konfigurasi VAPID belum tersedia saat tiket dibuat."; return `${Number(dispatch.sent ?? 0)} dari ${Number(dispatch.eligible ?? 0)} perangkat menerima push${Number(dispatch.failed ?? 0) ? `; ${Number(dispatch.failed)} gagal` : ""}.`; }
function normalizeWhatsapp(value: string) { const digits = value.replace(/\D/g, ""); if (!digits) return ""; if (digits.startsWith("0")) return `62${digits.slice(1)}`; return digits; }
function toLocalInput(value: string) { if (!value) return ""; const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16); }
function followupLabel(ticket: AdminNotification) { const value = String(ticket.metadata.followupStatus ?? ticket.status); if (value === "contact_started") return "Follow-up dimulai"; if (value === "waiting_customer") return "Menunggu customer"; if (value === "resolved") return "Selesai"; return value === "unread" ? "Baru" : "Sedang ditinjau"; }
