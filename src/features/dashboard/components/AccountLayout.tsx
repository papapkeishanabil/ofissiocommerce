"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccountSidebar } from "./AccountSidebar";
import styles from "./DashboardOverview.module.css";

/** Uses the same account navigation, spacing and palette as the dashboard. */
export function AccountLayout({ active, children }: {
  active: "profile" | "cart";
  children: ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  return <div className={styles.shell} style={!isAuthenticated ? { gridTemplateColumns: "minmax(0, 1fr)" } : undefined}>
    {isAuthenticated && <AccountSidebar active={active} />}
    <div className={styles.content}>{children}</div>
  </div>;
}
