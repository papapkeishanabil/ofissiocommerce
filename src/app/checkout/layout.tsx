import type { ReactNode } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";
import styles from "./CheckoutLayout.module.css";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.shell} flex min-h-dvh flex-col`}>
      <WorkspaceHeader />
      <main className="flex-1">{children}</main>
      <AuthModal />
    </div>
  );
}
