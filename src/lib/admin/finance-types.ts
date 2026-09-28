export type FinanceKind = "deposit" | "payment" | "refund" | "printing" | "delivery" | "other_cost";
export type FinancePeriod = "day" | "week" | "month";
export type FinanceEntry = {
  id: string;
  bookId: string;
  kind: FinanceKind;
  amount: number;
  occurredOn: string;
  note: string;
  createdAt: string;
  voidedAt: string | null;
};
export type BookFinance = {
  price: number | null;
  entries: FinanceEntry[];
  deposit: number;
  received: number;
  refunds: number;
  printing: number;
  delivery: number;
  otherCosts: number;
  costs: number;
  cashResult: number;
  outstanding: number | null;
};

export const FINANCE_KIND_LABELS: Record<FinanceKind, string> = {
  deposit: "Предоплата",
  payment: "Остальная оплата",
  refund: "Возврат клиенту",
  printing: "Печать",
  delivery: "Доставка",
  other_cost: "Другой расход",
};
