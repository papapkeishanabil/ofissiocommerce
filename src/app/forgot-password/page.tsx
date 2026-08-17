import type { Metadata } from "next";

import { AuthRecoveryShell } from "@/components/auth/AuthRecoveryShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Lupa Password" };

export default function ForgotPasswordPage() {
  return (
    <AuthRecoveryShell
      eyebrow="Pemulihan akun"
      title="Lupa password?"
      description="Masukkan email akun Anda. Jika terdaftar, kami akan mengirim tautan untuk membuat password baru."
    >
      <ForgotPasswordForm />
    </AuthRecoveryShell>
  );
}
