"use client";

import { useState, type FormEvent } from "react";
import { MailCheck, Send } from "lucide-react";

import { useAdminNotifications } from "@/features/admin-notifications/components/AdminNotificationProvider";

interface TestEmailResponse {
  ok?: boolean;
  provider?: "mock" | "resend" | "smtp";
  status?: "queued" | "sent" | "failed" | "skipped" | "mocked";
  emailLogId?: string;
  message?: string;
}

export function AdminEmailTestForm({ defaultTo }: { defaultTo: string }) {
  const { request } = useAdminNotifications();
  const [to, setTo] = useState(defaultTo);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestEmailResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const response = await request("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(to.trim() ? { to: to.trim() } : {}),
      });
      const payload = (await response.json().catch(() => ({}))) as TestEmailResponse;
      setResult({
        ...payload,
        ok: response.ok && payload.ok === true,
        message:
          payload.message ??
          (response.ok
            ? "Test email berhasil diproses."
            : "Test email belum dapat diproses."),
      });
    } catch {
      setResult({ ok: false, message: "Koneksi ke endpoint email belum tersedia." });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="test-email-to" className="text-sm font-bold text-ink">
          Email penerima test
        </label>
        <p id="test-email-hint" className="mt-1 text-xs leading-5 text-ink-muted">
          Kosongkan untuk memakai EMAIL_TEST_TO, penerima notifikasi order pertama,
          atau SALES_QUOTATION_EMAIL.
        </p>
        <input
          id="test-email-to"
          name="to"
          type="email"
          autoComplete="email"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          aria-describedby="test-email-hint"
          placeholder="nama@domain-terverifikasi.com"
          className="mt-2 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        aria-busy={sending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {sending ? "Mengirim test..." : "Send Test Email"}
      </button>

      <div aria-live="polite" aria-atomic="true">
        {result ? (
          <div
            role={result.ok ? "status" : "alert"}
            className={`rounded-xl border px-4 py-3 text-sm ${
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-start gap-2">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-bold">{result.message}</p>
                {result.provider && result.status ? (
                  <p className="mt-1 text-xs">
                    Provider {result.provider} · status {result.status}
                    {result.emailLogId ? ` · log ${result.emailLogId}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
