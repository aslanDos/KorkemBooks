import type { BookPageBackground, CoverColorKey } from "./types";

export const COVER_PALETTES: { key: CoverColorKey; name: string; background: string; detail: string }[] = [
  { key: "black", name: "Чёрный", background: "#2F2F2F", detail: "#1C1C1C" },
  { key: "gray", name: "Серый", background: "#8A8A8A", detail: "#686868" },
  { key: "burgundy", name: "Бордовый", background: "#592B33", detail: "#421F25" },
  { key: "olive", name: "Оливковый", background: "#49452C", detail: "#34311F" },
  { key: "navy", name: "Тёмно-синий", background: "#303F4D", detail: "#222D38" },
  { key: "terracotta", name: "Терракотовый", background: "#613A2D", detail: "#492A20" },
];

export const FRAME_COLOR_OPTIONS = [
  { name: "Светлый", background: "#FFFAF3" },
  { name: "Золотистый", background: "#C5A46D" },
  { name: "Чёрный", background: "#28241F" },
  ...COVER_PALETTES.map(({ name, background }) => ({ name, background })),
];

export const PAGE_BACKGROUND_OPTIONS: { key: BookPageBackground; name: string; background: string }[] = [
  ...COVER_PALETTES.map(({ key, name, background }) => ({ key, name, background })),
];

export function normalizePageBackground(value: unknown): BookPageBackground {
  if (PAGE_BACKGROUND_OPTIONS.some((option) => option.key === value)) return value as BookPageBackground;
  if (value === "wine" || value === "berry") return "burgundy";
  if (value === "umber") return "black";
  if (value === "primary" || value === "ochre") return "olive";
  return "burgundy";
}

export function normalizeCoverColor(value: unknown): CoverColorKey {
  return normalizePageBackground(value);
}

export function getPageBackgroundColor(value: BookPageBackground) {
  return PAGE_BACKGROUND_OPTIONS.find((option) => option.key === value)?.background ?? "#592B33";
}
