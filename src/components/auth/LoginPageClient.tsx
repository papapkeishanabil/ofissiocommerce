"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Factory,
  FileText,
  MailCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { quotationIdFromNextPath } from "@/features/auth/auth-navigation";

import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

type Tab = "login" | "register";

interface BenefitItem {
  label: string;
  detail: string;
  icon: LucideIcon;
}

// Brand-panel value rows. Borderless icon+text rows (not cards) so they read as
// a benefit list, never as nested cards inside the auth surface.
const REGISTER_BENEFITS: BenefitItem[] = [
  { label: "Quotation tersimpan", detail: "Lanjutkan kapan saja", icon: ShoppingBag },
  { label: "Pesanan & invoice", detail: "Terpantau di satu tempat", icon: ReceiptText },
  { label: "Verifikasi email", detail: "Akun aman & terverifikasi", icon: MailCheck },
];

const ADMIN_WORKFLOWS: BenefitItem[] = [
  { label: "Quotation", detail: "Review & tindak lanjut", icon: FileText },
  { label: "Invoice", detail: "Status transaksi", icon: ReceiptText },
  { label: "Produksi", detail: "Pantau progres kerja", icon: Factory },
];

export function LoginPageClient({
  mode,
  nextPath,
  verificationComplete = false,
  registrationPending = false,
  registrationError = false,
  googleError = false,
}: {
  mode: "customer" | "admin";
  nextPath: string;
  verificationComplete?: boolean;
  registrationPending?: boolean;
  registrationError?: boolean;
  googleError?: boolean;
}) {
  const router = useRouter();
  const canRegister = mode === "customer";
  // Pure presentation state — drives which form renders. On a server-side
  // registration failure we land the user on the register tab so they can retry
  // without re-expanding anything. Auth logic is untouched (server redirects,
  // store, schema all live elsewhere).
  const [tab, setTab] = useState<Tab>(
    canRegister && registrationError ? "register" : "login",
  );
  const quotationId = quotationIdFromNextPath(nextPath);
  const isAdmin = mode === "admin";
  const isRegister = canRegister && tab === "register";

  const brandHeadline = isAdmin
    ? "Semua proses, satu workspace."
    : isRegister
      ? "Daftar akun perusahaan Anda."
      : "Selamat datang kembali di Ofissio.";
  const brandSubhead = isAdmin
    ? "Pantau quotation, invoice, dan produksi dalam satu dasbor terverifikasi."
    : isRegister
      ? "Satu dasbor untuk quotation, pesanan, invoice, dan progres produksi seragam kerja Anda."
      : "Lanjutkan quotation, pesanan, dan kebutuhan seragam perusahaan Anda.";
  const brandItems: BenefitItem[] | null = isAdmin
    ? ADMIN_WORKFLOWS
    : isRegister
      ? REGISTER_BENEFITS
      : null;

  const heading = isAdmin
    ? "Masuk ke workspace"
    : isRegister
      ? "Buat akun perusahaan Anda"
      : "Masuk ke akun Anda";
  const subtext = isAdmin
    ? "Gunakan kredensial internal Anda untuk mengakses operations suite."
    : isRegister
      ? quotationId
        ? "Gunakan email penerima quotation agar akun otomatis terhubung ke penawaran Anda."
        : "Hanya butuh beberapa detik. Pengguna pertama otomatis menjadi Admin Perusahaan."
      : "Gunakan email dan password yang telah terdaftar.";

  return (
    <main data-customer-auth={!isAdmin || undefined} className="relative isolate grid min-h-dvh w-full place-items-center overflow-hidden bg-cool-100 px-4 py-[clamp(1rem,3.5vh,2.5rem)] text-ink sm:px-6 lg:px-10">
      <section className="relative grid w-full max-w-[1120px] overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft-lg lg:h-[min(760px,calc(100dvh-5rem))] lg:min-h-[620px] lg:grid-cols-[1.02fr_0.98fr]">
        {/* ===== LEFT — brand panel ===== */}
        <div className="relative flex overflow-hidden bg-brand-900 p-7 text-white sm:p-8 lg:p-9 xl:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute bottom-0 left-0 h-72 w-full bg-[radial-gradient(circle_at_bottom_left,rgba(74,107,216,0.42),transparent_66%)]" />
          </div>

          <div className="relative z-10 flex w-full flex-col">
            <div className="flex items-center gap-3">
              {isAdmin && <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-white text-lg font-extrabold text-brand-700">
                O
              </span>}
              <div>
                <p className={isAdmin ? "text-[15px] font-bold leading-none" : "text-3xl font-bold tracking-tight"}>Ofissio{!isAdmin && <span className="text-ochre-500">.</span>}</p>
                <p className="mt-1 text-[11px] text-brand-200">
                  {isAdmin ? "Operations suite" : "B2B Workwear Commerce"}
                </p>
              </div>
            </div>

            <div className="my-auto py-8 lg:py-[clamp(1.5rem,4vh,3rem)]">
              <h1 className="max-w-md overflow-visible text-[2.15rem] font-semibold leading-[1.15] tracking-[-0.04em] sm:text-[2.6rem]">
                {brandHeadline}
              </h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-brand-100/90 sm:text-[15px]">
                {brandSubhead}
              </p>

              {brandItems ? (
                <ul
                  className="mt-8 grid gap-3"
                  aria-label={isRegister ? "Keuntungan akun" : "Alur kerja utama"}
                >
                  {brandItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.label} className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-100">
                          <Icon className="h-[17px] w-[17px]" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight text-white">
                            {item.label}
                          </p>
                          <p className="text-[11px] leading-tight text-brand-200/80">
                            {item.detail}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-brand-200/80">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Akses terlindungi dan terverifikasi</span>
            </div>
          </div>
        </div>

        {/* ===== RIGHT — form panel ===== */}
        <div className="flex items-center p-7 sm:p-9 lg:block lg:min-h-0 lg:overflow-y-auto lg:p-10 xl:p-12">
          <div className="mx-auto w-full max-w-[420px]">
            {canRegister ? (
              <div
                role="group"
                aria-label="Mode autentikasi"
                className="mb-7 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-cool-50 p-1"
              >
                {([
                  { id: "login" as const, label: "Masuk" },
                  { id: "register" as const, label: "Daftar" },
                ]).map((t) => {
                  const active = (isRegister ? "register" : "login") === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      aria-pressed={active}
                      className={[
                        "h-10 rounded-xl text-sm font-semibold tracking-tight transition-colors duration-200",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
                        active
                          ? "bg-surface text-ink shadow-soft-xs"
                          : "text-ink-subtle hover:text-ink",
                      ].join(" ")}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className="mb-6 grid h-11 w-11 place-items-center rounded-2xl border border-line bg-cool-50 text-brand-700 lg:hidden">
                <ShieldCheck className="h-5 w-5" />
              </span>
            )}

            <div className="mb-7">
              <h2 className="text-[1.75rem] font-semibold tracking-[-0.035em] text-ink-strong">
                {heading}
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-subtle">{subtext}</p>
            </div>

            {verificationComplete ? (
              <div
                role="status"
                className="mb-4 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-800"
              >
                <CheckCircle2 className="mt-0.5 h-[15px] w-[15px] shrink-0" />
                Email berhasil diverifikasi. Silakan masuk untuk melanjutkan.
              </div>
            ) : null}
            {registrationPending ? (
              <div
                role="status"
                className="mb-4 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-800"
              >
                <CheckCircle2 className="mt-0.5 h-[15px] w-[15px] shrink-0" />
                Akun berhasil dibuat. Periksa email Anda, klik tautan verifikasi, lalu kembali ke sini untuk masuk.
              </div>
            ) : null}
            {registrationError ? (
              <div
                role="alert"
                className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700"
              >
                <AlertCircle className="mt-0.5 h-[15px] w-[15px] shrink-0" />
                Pendaftaran belum dapat diproses. Periksa kembali data Anda, pastikan email valid, lalu coba kembali.
              </div>
            ) : null}
            {googleError && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700">Proses masuk dengan Google dibatalkan atau belum berhasil. Coba kembali, pilih akun Google dengan email yang sesuai, atau gunakan email dan password.</p>}

            {/* Shared premium field/button treatment — applies to whichever form
                is active. Keeps the two tabs visually identical. The underlying
                UI primitives (Input/Button/Field) are untouched. */}
            <div className="[&_input]:h-12 [&_input]:rounded-xl [&_input]:border-line [&_input]:bg-surface [&_input]:px-4 [&_input]:text-[15px] [&_input]:text-ink [&_input]:placeholder:text-ink-subtle [&_input]:transition-colors focus-within:[&_input]:border-brand-500 focus-within:[&_input]:ring-4 focus-within:[&_input]:ring-brand-100 [&_button[type=submit]]:h-12 [&_button[type=submit]]:rounded-xl [&_button[type=submit]]:bg-brand-700 [&_button[type=submit]]:text-[15px] [&_button[type=submit]]:font-semibold [&_button[type=submit]]:tracking-tight [&_button[type=submit]]:text-white [&_button[type=submit]]:shadow-soft-sm [&_button[type=submit]]:transition-all hover:[&_button[type=submit]]:-translate-y-0.5 hover:[&_button[type=submit]]:bg-brand-800 hover:[&_button[type=submit]]:shadow-soft-md">
              {isRegister ? (
                <RegisterForm
                  quotationId={quotationId ?? undefined}
                  onSuccess={() => router.replace(nextPath)}
                  onSwitchToLogin={() => setTab("login")}
                />
              ) : (
                <LoginForm
                  allowGoogle={!isAdmin}
                  quotationId={quotationId ?? undefined}
                  onSuccess={() => router.replace(nextPath)}
                />
              )}
            </div>

            <div className="mt-7 flex items-center justify-between gap-4 border-t border-line pt-5 text-[11px] text-ink-subtle">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-[13px] w-[13px]" /> Koneksi terenkripsi
              </span>
              <span className="inline-flex items-center gap-1.5">
                {isAdmin ? "Operations workspace" : "Platform Ofissio"}
                <ArrowRight className="h-[13px] w-[13px]" />
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
