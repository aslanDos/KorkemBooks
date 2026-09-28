import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getFirstBookId } from "@/lib/books/queries";
import "../workspace.css";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const hasBook = user.role === "user" ? Boolean(await getFirstBookId()) : false;

  return (
    <WorkspaceShell sidebar={<DashboardSidebar role={user.role} canCreateBook={user.role === "admin" || (user.role === "user" && !hasBook)} />}>
      {children}
    </WorkspaceShell>
  );
}
