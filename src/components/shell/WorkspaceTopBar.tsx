"use client";

import { WorkspaceHeader } from "./WorkspaceHeader";

export function WorkspaceTopBar() {
  return (
    <div className="relative z-30 hidden shrink-0 lg:block">
      <div className="h-14">
        <WorkspaceHeader />
      </div>
    </div>
  );
}
