import type { ReactNode } from "react";
import { WorkspaceTopbar } from "@/components/workspace/workspace-topbar";

type WorkspaceShellProps = {
  children: ReactNode;
  sidebar: ReactNode;
  admin?: boolean;
};

export function WorkspaceShell({ children, sidebar, admin = false }: WorkspaceShellProps) {
  return (
    <div className={`dashboard-shell${admin ? " admin-shell" : ""}`}>
      {sidebar}
      <main className="dashboard-main">
        <WorkspaceTopbar admin={admin} />
        <div className="workspace-content">{children}</div>
      </main>
    </div>
  );
}
