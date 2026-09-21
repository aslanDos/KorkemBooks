import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatPhone } from "@/lib/auth/phone";
import type { AdminBook, AdminOrder, AdminOverview, AdminUser, BookProductionStatus, OrderStatus } from "./types";

const demoUsers: AdminUser[] = [
  { id: "1", phone: "+77011234567", bookTypeName: "Маме", role: "user", createdAt: "2026-08-31T10:20:00Z" },
  { id: "2", phone: "+77022345678", bookTypeName: null, role: "manager", createdAt: "2026-08-26T08:00:00Z" },
  { id: "3", phone: "+77033456789", bookTypeName: null, role: "admin", createdAt: "2026-08-20T08:00:00Z" },
  { id: "4", phone: "+77044567890", bookTypeName: "Мужу", role: "user", createdAt: "2026-08-18T08:00:00Z" },
];

const demoOrders: AdminOrder[] = [
  { id: "1", number: "KB-1048", bookTitle: "История нашей семьи", customerName: "Айгуль Садыкова", customerEmail: "aigul@example.kz", status: "printing", total: 24900, createdAt: "2026-09-01T06:30:00Z" },
  { id: "2", number: "KB-1047", bookTitle: "Мама, расскажи мне", customerName: "Мадина Ермекова", customerEmail: "madina@example.kz", status: "editing", total: 21900, createdAt: "2026-08-31T11:10:00Z" },
  { id: "3", number: "KB-1046", bookTitle: "Наша история любви", customerName: "Ерлан Токтар", customerEmail: "yerlan@example.kz", status: "ready", total: 27900, createdAt: "2026-08-30T09:45:00Z" },
  { id: "4", number: "KB-1045", bookTitle: "Для любимой бабушки", customerName: "Алия Нурлан", customerEmail: "aliya@example.kz", status: "shipped", total: 24900, createdAt: "2026-08-28T14:20:00Z" },
];

const demoBooks: AdminBook[] = [
  { id: "b1", title: "История нашей семьи", authorName: "Айгуль Садыкова", recipientName: "Маме", ownerPhone: "+7 (701) 123-45-67", progress: 74, status: "editing", createdAt: "2026-08-24T08:00:00Z", updatedAt: "2026-09-01T06:30:00Z" },
  { id: "b2", title: "Мама, расскажи мне", authorName: "Мадина Ермекова", recipientName: "Маме", ownerPhone: "+7 (704) 456-78-90", progress: 42, status: "writing", createdAt: "2026-08-28T08:00:00Z", updatedAt: "2026-09-01T06:30:00Z" },
];

export async function getAdminUsers(): Promise<AdminUser[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return demoUsers;

  const { data: profiles } = await admin.from("profiles").select("id, role, phone_e164, created_at, book_types(name)").order("created_at", { ascending: false });
  if (!profiles) return [];
  return profiles.map((profile) => {
    const bookType = Array.isArray(profile.book_types) ? profile.book_types[0] : profile.book_types;
    return { id: profile.id, phone: profile.phone_e164, bookTypeName: bookType?.name ?? null, role: profile.role, createdAt: profile.created_at };
  });
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return demoOrders;
  const { data, error } = await admin.from("orders").select("id, order_number, customer_name, customer_email, status, total_amount, created_at, books(title)").order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((order) => {
    const book = Array.isArray(order.books) ? order.books[0] : order.books;
    return { id: order.id, number: order.order_number, bookTitle: book?.title ?? "Книга", customerName: order.customer_name, customerEmail: order.customer_email, status: order.status as OrderStatus, total: Number(order.total_amount), createdAt: order.created_at };
  });
}

export async function getAdminBooks(): Promise<AdminBook[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return demoBooks;
  const { data: books, error } = await admin.from("books").select("id, owner_id, title, author_name, recipient_name, progress, production_status, created_at, updated_at, profiles!books_owner_id_fkey(phone_e164)").is("deleted_at", null).order("created_at", { ascending: false });
  if (error || !books) return [];
  return books.map((book) => {
    const profile = Array.isArray(book.profiles) ? book.profiles[0] : book.profiles;
    return {
      id: book.id,
      title: book.title,
      authorName: book.author_name,
      recipientName: book.recipient_name,
      ownerPhone: profile?.phone_e164 ? formatPhone(profile.phone_e164) : "Телефон не указан",
      progress: book.progress,
      status: (book.production_status ?? "writing") as BookProductionStatus,
      createdAt: book.created_at,
      updatedAt: book.updated_at,
    };
  });
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [users, orders, books] = await Promise.all([getAdminUsers(), getAdminOrders(), getAdminBooks()]);
  const completed = orders.filter((order) => order.status !== "cancelled");
  const salesTotal = completed.reduce((sum, order) => sum + order.total, 0);
  const sales = [128000, 176000, 149000, 218000, 194000, 267000, Math.max(salesTotal, 231000)].map((value, index) => ({ label: ["Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен"][index], value }));
  return {
    userCount: users.filter((user) => user.role === "user").length,
    managerCount: users.filter((user) => user.role === "manager").length,
    adminCount: users.filter((user) => user.role === "admin").length,
    activeBooks: books.filter((book) => book.status !== "received").length,
    salesTotal,
    salesChange: 18.4,
    sales,
    recentBooks: books.slice(0, 5),
  };
}
