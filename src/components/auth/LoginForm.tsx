// src/components/auth/LoginForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";

import { loginSchema, type LoginForm as LoginFormValues } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Input } from "@/components/ui/Input";

interface LoginFormProps {
  onSuccess?: () => void;
  /** When provided, a "Belum punya akun? Daftar" link renders below the submit
   *  button. The /login page passes nothing (its segmented tabs handle the
   *  login↔register switch); the global AuthModal passes a handler because it
   *  has no tab switcher of its own. */
  onSwitchToRegister?: () => void;
  quotationId?: string;
}

export function LoginForm({
  onSuccess,
  onSwitchToRegister,
  quotationId,
}: LoginFormProps) {
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setServerError(null);
    const r = await login(values.email, values.password, quotationId);
    setSubmitting(false);
    if (!r.ok) {
      setServerError(r.reason ?? "Login gagal.");
      return;
    }
    onSuccess?.();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700"
        >
          {serverError}
        </div>
      )}

      <Field
        label="Email"
        htmlFor="login-email"
        required
        error={errors.email?.message}
      >
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="nama@perusahaan.com"
          {...field("email")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="login-password"
        required
        error={errors.password?.message}
      >
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...field("password")}
        />
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Lupa password?
        </Link>
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Memproses..." : "Masuk"}
      </Button>

      {onSwitchToRegister ? (
        <p className="text-center text-[13px] leading-relaxed text-ink-subtle">
          Belum punya akun?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            Daftar di sini
          </button>
        </p>
      ) : null}
    </form>
  );
}
