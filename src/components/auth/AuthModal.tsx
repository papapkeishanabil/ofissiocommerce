// src/components/auth/AuthModal.tsx
// Global auth modal. Driven by ui-store so any component can open it with
// an intent (checkout / request_quote / save_configuration / repeat_order).
// After successful auth, the intent is consumed and routed accordingly.
//
// Presentation only — the auth logic below (ui-store intent, mode switching,
// session-routing effect, quotationId threading) is untouched. This shell
// renders a premium brand header, a segmented Masuk/Daftar switcher, and the
// shared premium field treatment around the existing LoginForm / RegisterForm
// primitives. The generic <Modal> (portal, escape, scroll-lock, overlay) is
// reused as-is, with no title/description so its plain header is replaced.

"use client";

import { ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { quotationIdFromNextPath } from "@/features/auth/auth-navigation";
import { cn } from "@/lib/utils";

import { Modal } from "@/components/ui/Modal";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

export function AuthModal() {
  const router = useRouter();
  const open = useUIStore((s) => s.authModalOpen);
  const mode = useUIStore((s) => s.authMode);
  const setMode = useUIStore((s) => s.setAuthMode);
  const closeAuth = useUIStore((s) => s.closeAuth);
  const consumeIntent = useUIStore((s) => s.consumeIntent);
  const authIntent = useUIStore((s) => s.authIntent);
  const returnTo =
    authIntent.kind === "request_quote" ? authIntent.returnTo : undefined;
  const quotationId = returnTo ? quotationIdFromNextPath(returnTo) : null;

  // Watch auth state; when login/register succeeds while modal is open,
  // consume intent and route.
  const session = useAuthStore((s) => s.session);
  const [wasAuthed, setWasAuthed] = useState(false);
  useEffect(() => {
    if (open && !wasAuthed && session) {
      // just became authed inside the modal
      const intent = consumeIntent();
      closeAuth();
      if (intent.kind === "checkout") router.push("/checkout");
      else if (intent.kind === "request_quote") {
        router.push(intent.returnTo ?? "/quote");
      }
      else if (intent.kind === "none") router.push("/dashboard");
      // save_configuration / repeat_order handled at their origin later.
    }
    setWasAuthed(!!session);
  }, [session, open, wasAuthed, consumeIntent, closeAuth, router]);

  const isLogin = mode === "login";
  const headline = isLogin
    ? quotationId
      ? "Masuk untuk membuka quotation Anda"
      : "Masuk untuk melanjutkan"
    : "Daftar akun perusahaan Anda";
  const subhead = isLogin
    ? quotationId
      ? "Gunakan email penerima penawaran agar akun terhubung ke quotation."
      : "Lanjutkan checkout atau request quotation Anda."
    : "Satu dasbor untuk quotation, pesanan, dan invoice.";

  return (
    <Modal open={open} onClose={closeAuth} size="lg">
      {/* Full-bleed premium brand header. The negative margins counteract the
          generic Modal's px-5/py-4 content padding so the navy band reaches the
          card edges and top; the card's overflow-hidden + rounded-2xl clip the
          band's top corners into the card. */}
      <div data-customer-auth className="-mx-5 -mt-4">
        <div className="relative overflow-hidden bg-[#071c3a] px-5 py-5 text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute -bottom-10 -left-8 h-44 w-44 bg-[radial-gradient(circle,rgba(74,107,216,0.42),transparent_66%)]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="leading-none">
                  <p className="text-2xl font-bold tracking-tight">Ofissio<span className="text-ochre-500">.</span></p>
                  <p className="mt-1 text-[11px] text-brand-200">
                    B2B Workwear Commerce
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAuth}
                aria-label="Tutup"
                className="grid h-8 w-8 place-items-center rounded-lg text-brand-100 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            <h2 className="mt-4 text-[1.35rem] font-semibold leading-tight tracking-[-0.02em]">
              {headline}
            </h2>
            <p className="mt-1.5 text-[13px] leading-snug text-brand-100/90">
              {subhead}
            </p>
          </div>
        </div>

        {/* Body — centered to a comfortable form width inside the wider lg
            card so single-line fields keep premium proportions. */}
        <div className="mx-auto max-w-[460px] px-5 pb-5 pt-5">
          {/* Segmented switcher — drives setAuthMode, the same store action the
              old in-form switch used. No in-form login→register link is needed
              while the tab is present. */}
          <div
            role="group"
            aria-label="Mode autentikasi"
            className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-cool-50 p-1"
          >
            {([
              { id: "login" as const, label: "Masuk" },
              { id: "register" as const, label: "Daftar" },
            ]).map((t) => {
              const active = mode === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMode(t.id)}
                  aria-pressed={active}
                  className={cn(
                    "h-10 rounded-xl text-sm font-semibold tracking-tight transition-colors duration-200",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
                    active
                      ? "bg-surface text-ink shadow-soft-xs"
                      : "text-ink-subtle hover:text-ink",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Shared premium field/button treatment — identical to the /login
              page wrapper, so Masuk and Daftar look the same. Underlying
              Input/Button/Field primitives are untouched. */}
          <div className="mt-5 [&_input]:h-12 [&_input]:rounded-xl [&_input]:border-line [&_input]:bg-surface [&_input]:px-4 [&_input]:text-[15px] [&_input]:text-ink [&_input]:placeholder:text-ink-subtle [&_input]:transition-colors focus-within:[&_input]:border-brand-500 focus-within:[&_input]:ring-4 focus-within:[&_input]:ring-brand-100 [&_button[type=submit]]:h-12 [&_button[type=submit]]:rounded-xl [&_button[type=submit]]:bg-brand-700 [&_button[type=submit]]:text-[15px] [&_button[type=submit]]:font-semibold [&_button[type=submit]]:tracking-tight [&_button[type=submit]]:text-white [&_button[type=submit]]:shadow-soft-sm [&_button[type=submit]]:transition-all hover:[&_button[type=submit]]:-translate-y-0.5 hover:[&_button[type=submit]]:bg-brand-800 hover:[&_button[type=submit]]:shadow-soft-md">
            {isLogin ? (
              <LoginForm
                quotationId={quotationId ?? undefined}
                onSuccess={() => {
                  // useEffect will handle intent routing
                }}
              />
            ) : (
              <RegisterForm
                quotationId={quotationId ?? undefined}
                onSuccess={() => {
                  // useEffect will handle intent routing
                }}
                onSwitchToLogin={() => setMode("login")}
              />
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-ink-subtle">
            <ShieldCheck className="h-[13px] w-[13px] text-brand-600" />
            <span>Koneksi terenkripsi &amp; akses terverifikasi</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
