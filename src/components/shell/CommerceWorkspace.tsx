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
    <main className="flex min-h-dvh flex-1 flex-col">
      <WorkspaceHeader />
      <div className="flex-1">{children}</div>
    </main>
  );
}
