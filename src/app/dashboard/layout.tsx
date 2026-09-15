import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getBooks } from "@/lib/books/queries";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const hasBook = (await getBooks(1)).length > 0;

  return (
    <WorkspaceShell sidebar={<DashboardSidebar role={user.role} canCreateBook={!hasBook} />}>
      {children}
    </WorkspaceShell>
  );
}
