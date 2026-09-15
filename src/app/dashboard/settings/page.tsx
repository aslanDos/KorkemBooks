import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { formatPhone } from "@/lib/auth/phone";

const roleLabels = {
  admin: "Администратор",
  manager: "Менеджер",
  user: "Пользователь",
} as const;

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <>
      <DashboardHeader title="Настройки" description="Управляйте аккаунтом и настройками korkembooks" />
      <section className="dashboard-section settings-list">
        <div>
          <h2>Номер телефона</h2>
          <p>{user?.phone ? formatPhone(user.phone) : "Для этого аккаунта телефон ещё не указан"}</p>
          <p>Номер используется как логин. Для его изменения обратитесь к администратору.</p>
          <span className="status-pill">{user?.isDevelopmentUser ? "Тестовый аккаунт" : roleLabels[user?.role ?? "user"]}</span>
        </div>
        <div><h2>Изменить пароль</h2><p>Используйте не менее восьми символов.</p><ChangePasswordForm /></div>
        <div><h2>Уведомления</h2><p>Настройки напоминаний о работе над книгой появятся позднее.</p><span className="status-pill">Скоро</span></div>
        <div><h2>Язык интерфейса</h2><p>Русский</p><span className="status-pill">По умолчанию</span></div>
      </section>
    </>
  );
}
