"use client";

import { useRouter } from "next/navigation";

import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function LoginPageClient({
  mode,
  nextPath,
}: {
  mode: "customer" | "admin";
  nextPath: string;
}) {
  const router = useRouter();
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
          <LoginForm onSuccess={() => router.replace(nextPath)} />
          {mode === "customer" ? (
            <details className="mt-6 border-t border-line pt-5">
              <summary className="cursor-pointer text-sm font-semibold text-brand-700">Belum punya akun?</summary>
              <div className="mt-5">
                <RegisterForm onSuccess={() => router.replace(nextPath)} />
              </div>
            </details>
          ) : null}
        </div>
      </section>
    </main>
  );
}
