import type { AppRole } from "@/lib/auth/current-user";

export type AdminUser = {
  id: string;
  phone: string | null;
  bookTypeName: string | null;
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

export type BookProductionStatus = "writing" | "editing" | "printing" | "ready" | "delivery" | "received";

export type AdminBook = {
  id: string;
  title: string;
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
  salesTotal: number;
  salesChange: number;
  sales: SalesPoint[];
  recentBooks: AdminBook[];
};
