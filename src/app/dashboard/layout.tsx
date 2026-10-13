import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAvailableBookEntitlements } from "@/lib/books/queries";
import "../workspace.css";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const canCreateUserBook = user.role === "user" ? (await getAvailableBookEntitlements()).length > 0 : false;

  return (
    <WorkspaceShell sidebar={<DashboardSidebar role={user.role} canCreateBook={user.role === "admin" || canCreateUserBook} />}>
      {children}
    </WorkspaceShell>
  );
}
