import type { ReactNode } from "react";

import { WorkspaceFooter } from "./WorkspaceFooter";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

interface CommerceWorkspaceProps { children: ReactNode; }

export function CommerceWorkspace({ children }: CommerceWorkspaceProps) {
  return (
    <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
      <div className="lg:hidden"><WorkspaceHeader /></div>
      <WorkspaceTopBar />
      {/* Footer lives inside the scroll area so it naturally sits below
          long content (same placement as before the B2B redesign). */}
      <div data-workspace-scroll className="relative flex-1 overflow-y-auto">
        <div>{children}</div>
        <WorkspaceFooter />
      </div>
    </main>
  );
}
