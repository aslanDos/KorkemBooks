import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { getBookTypes } from "@/lib/books/queries";

export default async function NewAdminUserPage() { const bookTypes = await getBookTypes(); return <><DashboardHeader title="Новый аккаунт" description="Создание пользователя или менеджера" /><Link className="admin-back" href="/admin/users"><ArrowLeft size={15} />К пользователям</Link><section className="admin-card admin-form-card"><div><p className="eyebrow">Доступ</p><h2>Данные пользователя</h2><p>Укажите номер телефона и заранее назначьте тип получателя и язык книги. После создания аккаунта вы получите одноразовую ссылку для установки пароля.</p></div><CreateUserForm bookTypes={bookTypes} /></section></>; }
