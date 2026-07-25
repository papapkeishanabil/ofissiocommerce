// src/components/shell/AppShell.tsx
// Split-shell layout:
//  - Desktop (lg+): persistent Ofistant panel left (400px) + commerce workspace right (flex).
//  - Mobile (<lg): single column workspace full-width; Ofistant = floating button + bottom sheet.

import type { ReactNode } from "react";

import { AuthModal } from "@/components/auth/AuthModal";
import { CommerceWorkspace } from "./CommerceWorkspace";
import { OfistantPanel } from "./OfistantPanel";
import { MobileOfistantFab } from "./MobileOfistantFab";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-surface-muted lg:flex-row">
      {/* Desktop: persistent left panel */}
      <aside className="hidden lg:flex lg:h-dvh lg:w-[400px] lg:shrink-0 lg:overflow-hidden lg:border-r lg:border-line lg:bg-surface">
        <OfistantPanel />
      </aside>

      {/* Right workspace (always visible, wider) */}
      <CommerceWorkspace>{children}</CommerceWorkspace>

      {/* Mobile: floating Ofistant trigger + bottom sheet */}
      <MobileOfistantFab />

      {/* Global auth modal (driven by ui-store) */}
      <AuthModal />
    </div>
  );
}
