import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getBookTypes } from "@/lib/books/queries";

export default async function NewManagerUserPage() {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "manager") redirect("/dashboard");
  const bookTypes = await getBookTypes();

  return <>
    <DashboardHeader title="Новый аккаунт" description="Создание аккаунта пользователя" />
    <section className="dashboard-section admin-form-card">
      <div><p className="eyebrow">Доступ</p><h2>Данные пользователя</h2><p>Укажите номер телефона, тип получателя и язык книги. После создания аккаунта вы получите одноразовую ссылку для установки пароля.</p></div>
      <CreateUserForm bookTypes={bookTypes} allowManagerRole={false} />
    </section>
  </>;
}
