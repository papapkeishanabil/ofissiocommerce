"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "./AppShell";

interface RouteAwareShellProps {
  children: ReactNode;
}

export function RouteAwareShell({ children }: RouteAwareShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginRoute = pathname === "/login";

  if (isAdminRoute || isLoginRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
