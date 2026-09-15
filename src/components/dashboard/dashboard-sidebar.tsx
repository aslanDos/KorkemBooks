import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import type { AppRole } from "@/lib/auth/current-user";

export function DashboardSidebar({ role, canCreateBook }: { role: AppRole; canCreateBook: boolean }) {
  return <WorkspaceSidebar role={role} canCreateBook={canCreateBook} />;
}
