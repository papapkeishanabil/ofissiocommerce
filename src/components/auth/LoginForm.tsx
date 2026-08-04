// src/components/auth/LoginForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { loginSchema, type LoginForm as LoginFormValues } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Input } from "@/components/ui/Input";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
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
    const r = await login(values.email, values.password);
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
          className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
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

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Memproses..." : "Masuk"}
      </Button>

      {onSwitchToRegister && (
        <p className="text-center text-xs text-ink-muted">
          Belum punya akun?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-brand-700 hover:underline"
          >
            Daftar di sini
          </button>
        </p>
      )}
    </form>
  );
}
