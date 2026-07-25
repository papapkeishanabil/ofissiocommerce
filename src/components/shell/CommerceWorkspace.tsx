// src/components/shell/CommerceWorkspace.tsx
// The right-side dynamic commerce workspace. Wider than Ofistant panel
// because product detail & size matrix need room.

import type { ReactNode } from "react";

import { WorkspaceHeader } from "./WorkspaceHeader";

interface CommerceWorkspaceProps {
  children: ReactNode;
}

export function CommerceWorkspace({ children }: CommerceWorkspaceProps) {
  return (
    <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
      <WorkspaceHeader />
      {/* Independent scroll container so the workspace scrolls separately
          from the Ofistant panel. */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </main>
  );
}
