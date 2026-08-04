"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { quotationIdFromNextPath } from "@/features/auth/auth-navigation";

import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function LoginPageClient({
  mode,
  nextPath,
  verificationComplete = false,
  registrationPending = false,
  registrationError = false,
}: {
  mode: "customer" | "admin";
  nextPath: string;
  verificationComplete?: boolean;
  registrationPending?: boolean;
  registrationError?: boolean;
}) {
  const router = useRouter();
  const registerDetailsRef = useRef<HTMLDetailsElement>(null);
  const quotationId = quotationIdFromNextPath(nextPath);
  return (
    <main className="mx-auto grid min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl place-items-center px-4 py-10">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-white shadow-soft-md md:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-brand-900 p-7 text-white md:p-10">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-lg font-bold text-brand-900">O</span>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
            {mode === "admin" ? "Internal operations" : "Customer workspace"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {mode === "admin" ? "Masuk ke Ofissio Admin" : "Masuk ke Ofissio"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-blue-100">
            Session dilindungi cookie HTTP-only dan akses selalu diverifikasi di server.
          </p>
        </div>
        <div className="p-7 md:p-10">
          {verificationComplete ? (
            <div role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800">
              Email berhasil diverifikasi. Silakan masuk untuk melanjutkan ke quotation Anda.
            </div>
          ) : null}
          {registrationPending ? (
            <div role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-3 text-xs leading-5 text-emerald-800">
              Akun berhasil dibuat. Periksa email Anda dan klik tautan verifikasi, lalu kembali ke halaman ini untuk masuk.
            </div>
          ) : null}
          {registrationError ? (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-3 text-xs leading-5 text-red-700">
              Pendaftaran belum dapat diproses. Pastikan Anda memakai email penerima quotation dan coba kembali.
            </div>
          ) : null}
          <LoginForm
            quotationId={quotationId ?? undefined}
            onSuccess={() => router.replace(nextPath)}
          />
          {mode === "customer" ? (
            <details ref={registerDetailsRef} className="mt-6 border-t border-line pt-5">
              <summary className="cursor-pointer text-sm font-semibold text-brand-700">Belum punya akun?</summary>
              <div className="mt-5">
                <RegisterForm
                  quotationId={quotationId ?? undefined}
                  onSuccess={() => router.replace(nextPath)}
                  onSwitchToLogin={() => {
                    registerDetailsRef.current?.removeAttribute("open");
                  }}
                />
              </div>
            </details>
          ) : null}
        </div>
      </section>
    </main>
  );
}
