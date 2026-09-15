import type { BookProductionStatus } from "@/lib/admin/types";

const bookLabels: Record<BookProductionStatus, string> = { writing: "Написание", editing: "Редактура", printing: "Печать", ready: "Готово", delivery: "Доставка", received: "Получен" };
export function BookStatusPill({ status }: { status: BookProductionStatus }) { return <span className={`order-status order-status--${status}`}>{bookLabels[status]}</span>; }
