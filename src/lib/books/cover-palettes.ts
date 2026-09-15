import type { BookPageBackground, CoverColorKey } from "./types";

export const COVER_PALETTES: { key: CoverColorKey; name: string; background: string; detail: string }[] = [
  { key: "wine", name: "Винный", background: "#592B33", detail: "#421F25" },
  { key: "berry", name: "Ягодный", background: "#633943", detail: "#4A2930" },
  { key: "terracotta", name: "Терракотовый", background: "#613A2D", detail: "#492A20" },
  { key: "navy", name: "Ночной синий", background: "#303F4D", detail: "#222D38" },
  { key: "umber", name: "Умбра", background: "#3B2F21", detail: "#2C2317" },
  { key: "olive", name: "Оливковый", background: "#49452C", detail: "#34311F" },
  { key: "ochre", name: "Охра", background: "#594928", detail: "#42351E" },
];

export const FRAME_COLOR_OPTIONS = [
  { name: "Светлый", background: "#FFFAF3" },
  { name: "Золотистый", background: "#C5A46D" },
  { name: "Чёрный", background: "#28241F" },
  ...COVER_PALETTES.map(({ name, background }) => ({ name, background })),
];

export const PAGE_BACKGROUND_OPTIONS: { key: BookPageBackground; name: string; background: string }[] = [
  { key: "white", name: "Белый", background: "#FFFFFF" },
  { key: "primary", name: "Зелёный", background: "#244A3D" },
  ...COVER_PALETTES.map(({ key, name, background }) => ({ key, name, background })),
];

export function normalizePageBackground(value: unknown): BookPageBackground {
  return PAGE_BACKGROUND_OPTIONS.some((option) => option.key === value) ? value as BookPageBackground : "white";
}

export function getPageBackgroundColor(value: BookPageBackground) {
  return PAGE_BACKGROUND_OPTIONS.find((option) => option.key === value)?.background ?? "#FFFFFF";
}
