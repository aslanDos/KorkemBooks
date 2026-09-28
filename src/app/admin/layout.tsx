import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getCurrentUser } from "@/lib/auth/current-user";
import "../workspace.css";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return <WorkspaceShell admin sidebar={<AdminSidebar />}>{children}</WorkspaceShell>;
}
