import type { Metadata } from "next";

import { AuthRecoveryShell } from "@/components/auth/AuthRecoveryShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return (
    <AuthRecoveryShell
      eyebrow="Keamanan akun"
      title="Buat password baru"
      description="Gunakan password yang unik dan belum pernah Anda gunakan untuk akun ini."
    >
      <ResetPasswordForm />
    </AuthRecoveryShell>
  );
}
