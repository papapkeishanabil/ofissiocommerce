import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";

export function AuthRecoveryShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-cool-100 px-4 py-8 text-ink sm:px-6">
      <div aria-hidden="true" className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div aria-hidden="true" className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-orange-200/35 blur-3xl" />

      <section className="relative grid w-full max-w-[960px] overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft-lg md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden min-h-[590px] flex-col justify-between overflow-hidden bg-brand-900 p-9 text-white md:flex">
          <div aria-hidden="true" className="absolute -right-20 -top-16 h-64 w-64 rounded-full border border-white/10 bg-white/5" />
          <Link href="/" className="relative text-xl font-black tracking-[-0.04em] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            OFISSIO
          </Link>
          <div className="relative space-y-5">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <LockKeyhole aria-hidden="true" className="h-7 w-7" />
            </span>
            <div className="space-y-3">
              <h2 className="max-w-sm text-3xl font-extrabold leading-tight tracking-[-0.035em]">
                Akses akun Anda tetap aman.
              </h2>
              <p className="max-w-sm text-sm leading-6 text-white/70">
                Tautan pemulihan bersifat pribadi dan hanya berlaku dalam waktu terbatas.
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-2 text-xs font-semibold text-white/60">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Dilindungi Supabase Auth
          </div>
        </div>

        <div className="flex min-h-[560px] flex-col justify-center p-6 sm:p-10 lg:p-14">
          <Link
            href="/login"
            className="mb-9 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-ink-subtle hover:text-brand-700 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Kembali ke login
          </Link>
          <div className="mb-8 space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">{eyebrow}</p>
            <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.035em] sm:text-4xl">{title}</h1>
            <p className="max-w-lg text-sm leading-6 text-ink-subtle">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
