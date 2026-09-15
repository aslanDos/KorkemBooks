"use client";

import { useEffect } from "react";
import { Download } from "lucide-react";

export function PrintBookButton() {
  useEffect(() => { const timer = window.setTimeout(() => window.print(), 350); return () => window.clearTimeout(timer); }, []);
  return <button className="print-book-button" type="button" onClick={() => window.print()}><Download size={16} />Сохранить как PDF</button>;
}
