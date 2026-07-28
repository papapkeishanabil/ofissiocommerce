// src/components/shell/CommerceWorkspace.tsx
// The right-side dynamic commerce workspace. Wider than Ofistant panel
// because product detail & size matrix need room.

import type { ReactNode } from "react";

import { WorkspaceFooter } from "./WorkspaceFooter";
import { WorkspaceHeader } from "./WorkspaceHeader";

interface CommerceWorkspaceProps {
  children: ReactNode;
}

export function CommerceWorkspace({ children }: CommerceWorkspaceProps) {
  return (
    <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
      <WorkspaceHeader />
      {/* Independent scroll container so the workspace scrolls separately
          from the Ofistant panel. Footer lives inside the scroll area so it
          naturally sits below long content. */}
      <div data-workspace-scroll className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex-1">{children}</div>
        <WorkspaceFooter />
      </div>
    </main>
  );
}
