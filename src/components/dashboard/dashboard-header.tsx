
type DashboardHeaderProps = { title: string; description?: string };

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    </header>
  );
}
