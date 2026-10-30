import type { Metadata } from "next";
import { adminFont as onest } from "@/features/admin/admin-font";
import { redirect } from "next/navigation";

import { LoginPageClient } from "@/components/auth/LoginPageClient";
import { storefrontFont } from "@/components/shell/storefront-font";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    next?: string;
    error?: string;
    verified?: string;
    registered?: string;
    password?: string;
    confirmPassword?: string;
  }>;
}) {
  const query = await searchParams;
  if (query.password || query.confirmPassword) {
    redirect("/login?error=registration-failed");
  }
  const mode = query.mode === "admin" ? "admin" : "customer";
  const fallback = mode === "admin" ? "/admin" : "/dashboard";
  const nextPath = safeNextPath(query.next, fallback);
  return (
    <div className={mode === "admin" ? `${onest.variable} font-[var(--font-admin)]` : storefrontFont.className}>
      <LoginPageClient
        mode={mode}
        nextPath={nextPath}
        verificationComplete={query.verified === "1"}
        registrationPending={query.registered === "verification-required"}
        registrationError={query.error === "registration-failed"}
        googleError={query.error === "google-failed"}
      />
    </div>
  );
}

function safeNextPath(value: string | undefined, fallback: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
