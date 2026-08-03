import type { ReactNode } from "react";

import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceTopBar } from "./WorkspaceTopBar";

interface CommerceWorkspaceProps { children: ReactNode; }

export function CommerceWorkspace({ children }: CommerceWorkspaceProps) {
  return (
    <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
      <div className="lg:hidden"><WorkspaceHeader /></div>
      <WorkspaceTopBar />
      <div data-workspace-scroll className="flex-1 overflow-y-auto">
        <div>{children}</div>
      </div>
    </main>
  );
}
