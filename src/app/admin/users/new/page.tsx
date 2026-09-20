import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { CreateUserForm } from "@/components/admin/create-user-form";

export default function NewAdminUserPage() { return <><DashboardHeader title="Новый аккаунт" description="Создание пользователя или менеджера" /><Link className="admin-back" href="/admin/users"><ArrowLeft size={15} />К пользователям</Link><section className="admin-card admin-form-card"><div><p className="eyebrow">Доступ</p><h2>Данные пользователя</h2><p>Логином будет номер телефона. После создания аккаунта вы получите одноразовую ссылку, по которой пользователь задаст свой пароль.</p></div><CreateUserForm /></section></>; }
