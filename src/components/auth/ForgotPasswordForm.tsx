"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  forgotPasswordFormSchema,
  type ForgotPasswordForm as ForgotPasswordValues,
} from "@/schemas/auth";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Permintaan belum dapat diproses.");
        return;
      }
      setMessage("Jika email terdaftar, kami telah mengirim tautan pemulihan. Periksa inbox dan folder spam.");
    } catch {
      setError("Layanan pemulihan belum dapat dihubungi.");
    } finally {
      setSubmitting(false);
    }
  });

  if (message) {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
        <CheckCircle2 aria-hidden="true" className="mb-3 h-6 w-6 text-emerald-600" />
        <p className="font-semibold">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <Field label="Email akun" htmlFor="recovery-email" required error={errors.email?.message} hint="Gunakan email yang dipakai saat mendaftar.">
        <div className="relative">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input id="recovery-email" type="email" autoComplete="email" autoFocus placeholder="nama@perusahaan.com" className="pl-11" {...register("email")} />
        </div>
      </Field>
      <Button type="submit" className="w-full" disabled={submitting} aria-busy={submitting}>
        {submitting ? "Mengirim..." : "Kirim tautan pemulihan"}
      </Button>
    </form>
  );
}
