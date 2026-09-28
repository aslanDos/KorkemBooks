import type { AppRole } from "@/lib/auth/current-user";
import type { BookProductionStatus } from "@/lib/books/production-status";

export type AdminUser = {
  id: string;
  phone: string | null;
  hasBookType: boolean;
  role: AppRole;
  createdAt: string;
};

export type OrderStatus = "new" | "editing" | "printing" | "ready" | "shipped" | "cancelled";

export type AdminOrder = {
  id: string;
  number: string;
  bookTitle: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
};

export type SalesPoint = { label: string; value: number };

export type { BookProductionStatus } from "@/lib/books/production-status";

export type AdminBook = {
  id: string;
  title: string;
  typeName: string;
  authorName: string;
  recipientName: string;
  ownerPhone: string;
  progress: number;
  status: BookProductionStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminOverview = {
  userCount: number;
  managerCount: number;
  adminCount: number;
  activeBooks: number;
  salesTotal: number | null;
  sales: SalesPoint[];
  recentBooks: AdminBook[];
};
