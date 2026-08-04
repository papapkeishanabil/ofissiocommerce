import type { Metadata } from "next";

import { LoginPageClient } from "@/components/auth/LoginPageClient";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string; error?: string }>;
}) {
  const query = await searchParams;
  const mode = query.mode === "admin" ? "admin" : "customer";
  const fallback = mode === "admin" ? "/admin" : "/dashboard";
  const nextPath = safeNextPath(query.next, fallback);
  return <LoginPageClient mode={mode} nextPath={nextPath} />;
}

function safeNextPath(value: string | undefined, fallback: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
