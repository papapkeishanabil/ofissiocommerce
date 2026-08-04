// src/components/auth/AuthModal.tsx
// Global auth modal. Driven by ui-store so any component can open it with
// an intent (checkout / request_quote / save_configuration / repeat_order).
// After successful auth, the intent is consumed and routed accordingly.

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { quotationIdFromNextPath } from "@/features/auth/auth-navigation";

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

  return (
    <Modal
      open={open}
      onClose={closeAuth}
      size="sm"
      title={mode === "login" ? "Masuk ke Ofissio" : "Daftar akun Ofissio"}
      description={
        mode === "login"
          ? "Masuk untuk melanjutkan checkout atau request quotation."
          : "Buat akun perusahaan Anda dalam 1 menit."
      }
    >
      {mode === "login" ? (
        <LoginForm
          quotationId={quotationId ?? undefined}
          onSuccess={() => {
            // useEffect will handle intent routing
          }}
          onSwitchToRegister={() => setMode("register")}
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
    </Modal>
  );
}
