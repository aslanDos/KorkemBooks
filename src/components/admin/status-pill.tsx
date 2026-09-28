import type { BookProductionStatus } from "@/lib/admin/types";
import { BOOK_PRODUCTION_LABELS } from "@/lib/books/production-status";

export function BookStatusPill({ status }: { status: BookProductionStatus }) { return <span className={`order-status order-status--${status}`}>{BOOK_PRODUCTION_LABELS[status]}</span>; }
