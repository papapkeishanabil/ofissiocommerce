import type { ReactNode } from "react";

import { AuthModal } from "@/components/auth/AuthModal";
import { CommerceWorkspace } from "./CommerceWorkspace";
import { OfistantRail } from "./OfistantRail";
import { ChromeRouteSync } from "./ChromeRouteSync";
import { ChromeBodySync } from "./ChromeBodySync";
import { MobileOfistantFab } from "./MobileOfistantFab";

interface AppShellProps { children: ReactNode; }

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-surface-muted lg:flex-row">
      <ChromeRouteSync />
      <ChromeBodySync />
      <OfistantRail />
      <CommerceWorkspace>{children}</CommerceWorkspace>
      <MobileOfistantFab />
      <AuthModal />
    </div>
  );
}
