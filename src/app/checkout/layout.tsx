import type { ReactNode } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { WorkspaceHeader } from "@/components/shell/WorkspaceHeader";

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <WorkspaceHeader />
      <main className="flex-1">{children}</main>
      <AuthModal />
    </div>
  );
}
