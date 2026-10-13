import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatPhone } from "@/lib/auth/phone";
import { getFinanceAnalytics } from "./finance";
import type { AdminBook, AdminOrder, AdminOverview, AdminUser, BookProductionStatus, OrderStatus } from "./types";

const demoUsers: AdminUser[] = [
  { id: "1", phone: "+77011234567", hasBookType: true, books: [{ typeName: "Маме", bookId: "b1" }, { typeName: "Сестре", bookId: null }], activated: true, role: "user", createdAt: "2026-08-31T10:20:00Z" },
  { id: "2", phone: "+77022345678", hasBookType: false, books: [], activated: true, role: "manager", createdAt: "2026-08-26T08:00:00Z" },
  { id: "3", phone: "+77033456789", hasBookType: false, books: [], activated: true, role: "admin", createdAt: "2026-08-20T08:00:00Z" },
  { id: "4", phone: "+77044567890", hasBookType: true, books: [{ typeName: "Папе", bookId: null }], activated: true, role: "user", createdAt: "2026-08-18T08:00:00Z" },
];

const demoOrders: AdminOrder[] = [
  { id: "1", number: "KB-1048", bookTitle: "История нашей семьи", customerName: "Айгуль Садыкова", customerEmail: "aigul@example.kz", status: "printing", total: 24900, createdAt: "2026-09-01T06:30:00Z" },
  { id: "2", number: "KB-1047", bookTitle: "Мама, расскажи мне", customerName: "Мадина Ермекова", customerEmail: "madina@example.kz", status: "editing", total: 21900, createdAt: "2026-08-31T11:10:00Z" },
  { id: "3", number: "KB-1046", bookTitle: "Наша история любви", customerName: "Ерлан Токтар", customerEmail: "yerlan@example.kz", status: "ready", total: 27900, createdAt: "2026-08-30T09:45:00Z" },
  { id: "4", number: "KB-1045", bookTitle: "Для любимой бабушки", customerName: "Алия Нурлан", customerEmail: "aliya@example.kz", status: "shipped", total: 24900, createdAt: "2026-08-28T14:20:00Z" },
];

const demoBooks: AdminBook[] = [
  { id: "b1", title: "История нашей семьи", typeName: "Маме", authorName: "Айгуль Садыкова", recipientName: "Маме", ownerPhone: "+7 (701) 123-45-67", progress: 74, status: "editing", createdAt: "2026-08-24T08:00:00Z", updatedAt: "2026-09-01T06:30:00Z" },
  { id: "b2", title: "Мама, расскажи мне", typeName: "Маме", authorName: "Мадина Ермекова", recipientName: "Маме", ownerPhone: "+7 (704) 456-78-90", progress: 42, status: "writing", createdAt: "2026-08-28T08:00:00Z", updatedAt: "2026-09-01T06:30:00Z" },
];

export async function getAdminUsers(): Promise<AdminUser[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return demoUsers;

  const { data: profiles } = await admin.from("profiles").select("id, role, phone_e164, book_type_id, activated_at, created_at").order("created_at", { ascending: false });
  if (!profiles) return [];
  return attachUserBooks(admin, profiles.map((profile) => ({ id: profile.id, phone: profile.phone_e164, hasBookType: Boolean(profile.book_type_id), books: [], activated: Boolean(profile.activated_at), role: profile.role, createdAt: profile.created_at })));
}

async function attachUserBooks(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, users: AdminUser[]): Promise<AdminUser[]> {
  const userIds = users.filter((user) => user.role === "user").map((user) => user.id);
  if (userIds.length === 0) return users;

  const { data, error } = await admin
    .from("book_entitlements")
    .select("owner_id, book_id, created_at, book_types(name)")
    .in("owner_id", userIds)
    .is("revoked_at", null)
    .order("created_at");
  if (error) return users;

  const booksByOwner = new Map<string, AdminUser["books"]>();
  for (const entitlement of data ?? []) {
    const bookType = Array.isArray(entitlement.book_types) ? entitlement.book_types[0] : entitlement.book_types;
    const books = booksByOwner.get(entitlement.owner_id) ?? [];
    books.push({ typeName: bookType?.name ?? "Книга", bookId: entitlement.book_id });
    booksByOwner.set(entitlement.owner_id, books);
  }
  return users.map((user) => ({ ...user, books: booksByOwner.get(user.id) ?? [] }));
}

export type AdminUsersPageQuery = {
  role: "all" | "user" | "manager" | "admin";
  status: "all" | "active" | "inactive";
  q: string;
  sort: "phone" | "role" | "created" | "status";
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
};

export async function getAdminUsersPage(input: AdminUsersPageQuery): Promise<{ users: AdminUser[]; total: number }> {
  const admin = createSupabaseAdminClient();
  const offset = (input.page - 1) * input.pageSize;
  if (!admin) {
    const roleNames = { admin: "Администратор", manager: "Менеджер", user: "Пользователь" };
    const digits = input.q.replace(/\D/g, "");
    const filtered = demoUsers
      .filter((user) => input.role === "all" || user.role === input.role)
      .filter((user) => input.status === "all" || user.activated === (input.status === "active"))
      .filter((user) => !input.q || (user.phone ?? "").includes(input.q) || Boolean(digits && (user.phone ?? "").replace(/\D/g, "").includes(digits)))
      .sort((left, right) => {
        const comparison = input.sort === "phone" ? (left.phone ?? "").localeCompare(right.phone ?? "", "ru")
          : input.sort === "role" ? roleNames[left.role].localeCompare(roleNames[right.role], "ru")
            : input.sort === "status" ? Number(left.activated) - Number(right.activated)
              : new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        return input.direction === "asc" ? comparison : -comparison;
      });
    return { users: filtered.slice(offset, offset + input.pageSize), total: filtered.length };
  }

  let query = admin.from("profiles").select("id, role, phone_e164, book_type_id, activated_at, created_at", { count: "exact" });
  if (input.role !== "all") query = query.eq("role", input.role);
  if (input.status === "active") query = query.not("activated_at", "is", null);
  if (input.status === "inactive") query = query.is("activated_at", null);
  const digits = input.q.replace(/\D/g, "");
  if (input.q && !digits) return { users: [], total: 0 };
  if (digits) query = query.ilike("phone_e164", `%${digits}%`);

  const orderColumn = input.sort === "phone" ? "phone_e164" : input.sort === "created" ? "created_at" : input.sort === "status" ? "activated_at" : "role";
  const { data, count, error } = await query
    .order(orderColumn, { ascending: input.direction === "asc", nullsFirst: input.direction === "asc" })
    .order("id", { ascending: true })
    .range(offset, offset + input.pageSize - 1);
  if (error) return { users: [], total: 0 };
  const users = (data ?? []).map((profile) => ({ id: profile.id, phone: profile.phone_e164, hasBookType: Boolean(profile.book_type_id), books: [], activated: Boolean(profile.activated_at), role: profile.role, createdAt: profile.created_at } satisfies AdminUser));
  return {
    total: count ?? 0,
    users: await attachUserBooks(admin, users),
  };
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
  const books: AdminBook[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.from("books").select("id, owner_id, title, author_name, recipient_name, progress, production_status, created_at, updated_at, profiles!books_owner_id_fkey(phone_e164), book_types(name)").is("deleted_at", null).order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
    if (error) return [];
    books.push(...(data ?? []).map((book) => {
      const profile = Array.isArray(book.profiles) ? book.profiles[0] : book.profiles;
      const bookType = Array.isArray(book.book_types) ? book.book_types[0] : book.book_types;
      return {
        id: book.id,
        title: book.title,
        typeName: bookType?.name ?? "Не указан",
        authorName: book.author_name,
        recipientName: book.recipient_name,
        ownerPhone: profile?.phone_e164 ? formatPhone(profile.phone_e164) : "Телефон не указан",
        progress: book.progress,
        status: (book.production_status ?? "writing") as BookProductionStatus,
        createdAt: book.created_at,
        updatedAt: book.updated_at,
      };
    }));
    if (!data || data.length < 1000) break;
  }
  return books;
}

export type AdminBooksPageQuery = {
  status: "all" | BookProductionStatus;
  q: string;
  sort: "title" | "progress" | "created" | "status";
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
};

export async function getAdminBooksPage(input: AdminBooksPageQuery): Promise<{ books: AdminBook[]; total: number }> {
  const admin = createSupabaseAdminClient();
  const offset = (input.page - 1) * input.pageSize;
  if (!admin) {
    const needle = input.q.toLowerCase();
    const filtered = demoBooks
      .filter((book) => input.status === "all" || book.status === input.status)
      .filter((book) => !needle || `${book.title} ${book.authorName} ${book.recipientName} ${book.ownerPhone} ${book.typeName}`.toLowerCase().includes(needle))
      .sort((left, right) => {
        const comparison = input.sort === "title" ? left.title.localeCompare(right.title, "ru")
          : input.sort === "progress" ? left.progress - right.progress
            : input.sort === "status" ? left.status.localeCompare(right.status)
              : new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        return input.direction === "asc" ? comparison : -comparison;
      });
    return { books: filtered.slice(offset, offset + input.pageSize), total: filtered.length };
  }

  let query = admin.from("books")
    .select("id, owner_id, title, author_name, recipient_name, progress, production_status, created_at, updated_at, profiles!books_owner_id_fkey(phone_e164), book_types(name)", { count: "exact" })
    .is("deleted_at", null);
  if (input.status !== "all") query = query.eq("production_status", input.status);

  const search = input.q.replace(/[,%()]/g, " ").trim();
  if (input.q && !search) return { books: [], total: 0 };
  if (search) {
    const digits = search.replace(/\D/g, "");
    const [{ data: owners }, { data: types }] = await Promise.all([
      digits ? admin.from("profiles").select("id").ilike("phone_e164", `%${digits}%`) : Promise.resolve({ data: [] as Array<{ id: string }> }),
      admin.from("book_types").select("id").ilike("name", `%${search}%`),
    ]);
    const filters = [`title.ilike.%${search}%`, `author_name.ilike.%${search}%`, `recipient_name.ilike.%${search}%`];
    if (owners?.length) filters.push(`owner_id.in.(${owners.map((owner) => owner.id).join(",")})`);
    if (types?.length) filters.push(`type_id.in.(${types.map((type) => type.id).join(",")})`);
    query = query.or(filters.join(","));
  }

  const orderColumn = input.sort === "title" ? "title" : input.sort === "progress" ? "progress" : input.sort === "status" ? "production_status" : "created_at";
  const { data, count, error } = await query.order(orderColumn, { ascending: input.direction === "asc" }).order("id", { ascending: true }).range(offset, offset + input.pageSize - 1);
  if (error) return { books: [], total: 0 };
  return {
    total: count ?? 0,
    books: (data ?? []).map((book) => {
      const profile = Array.isArray(book.profiles) ? book.profiles[0] : book.profiles;
      const bookType = Array.isArray(book.book_types) ? book.book_types[0] : book.book_types;
      return { id: book.id, title: book.title, typeName: bookType?.name ?? "Не указан", authorName: book.author_name, recipientName: book.recipient_name, ownerPhone: profile?.phone_e164 ? formatPhone(profile.phone_e164) : "Телефон не указан", progress: book.progress, status: (book.production_status ?? "writing") as BookProductionStatus, createdAt: book.created_at, updatedAt: book.updated_at };
    }),
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [users, books, finances] = await Promise.all([getAdminUsers(), getAdminBooks(), getFinanceAnalytics("month")]);
  const salesTotal = "error" in finances ? null : finances.allReceived;
  const financeBuckets = "error" in finances ? [] : finances.buckets.slice(-7);
  return {
    userCount: users.filter((user) => user.role === "user").length,
    managerCount: users.filter((user) => user.role === "manager").length,
    adminCount: users.filter((user) => user.role === "admin").length,
    activeBooks: books.filter((book) => book.status !== "received").length,
    salesTotal,
    financeBuckets,
    recentBooks: books.slice(0, 5),
  };
}
