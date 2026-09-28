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
      <DashboardHeader title="Настройки" description="Данные аккаунта и безопасность" />
      <section className="dashboard-section settings-list">
        <div className="settings-list__account">
          <div className="settings-list__heading">
            <div><h2>Номер телефона</h2><p>Ваш логин для входа в аккаунт</p></div>
            <span className="status-pill">{user?.isDevelopmentUser ? "Тестовый аккаунт" : roleLabels[user?.role ?? "user"]}</span>
          </div>
          <strong className="settings-list__phone">{user?.phone ? formatPhone(user.phone) : "Для этого аккаунта телефон ещё не указан"}</strong>
          <p>Если номер нужно изменить, обратитесь к администратору.</p>
        </div>
        <div className="settings-list__security">
          <div className="settings-list__heading">
            <div><h2>Безопасность</h2><p>Обновите пароль, если хотите защитить доступ к аккаунту.</p></div>
            <ChangePasswordForm />
          </div>
        </div>
      </section>
    </>
  );
}
