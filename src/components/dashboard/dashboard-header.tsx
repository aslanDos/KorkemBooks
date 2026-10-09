
import type { ReactNode } from "react";

type DashboardHeaderProps = { title: string; description?: string; action?: ReactNode };

export function DashboardHeader({ title, description, action }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action && <div className="dashboard-header__action">{action}</div>}
    </header>
  );
}
