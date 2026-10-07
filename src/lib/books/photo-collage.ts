import type { BookPageImage, BookPhotoLayout } from "./types";

export const BOOK_PHOTO_LAYOUTS: Array<{ value: BookPhotoLayout; label: string; description: string; slots: number }> = [
  { value: "single", label: "1 фото", description: "Одна фотография на странице", slots: 1 },
  { value: "two_columns", label: "2 рядом", description: "Две вертикальные области", slots: 2 },
  { value: "two_rows", label: "2 друг под другом", description: "Две горизонтальные области", slots: 2 },
  { value: "four_grid", label: "2 × 2", description: "Четыре фотографии", slots: 4 },
];

const BOOK_PHOTO_LAYOUT_COPY: Record<BookPhotoLayout, { kk: { label: string; description: string } }> = {
  single: { kk: { label: "1 фотосурет", description: "Беттегі бір фотосурет" } },
  two_columns: { kk: { label: "2 қатар", description: "Екі тік аймақ" } },
  two_rows: { kk: { label: "2 бірінің астында", description: "Екі көлденең аймақ" } },
  four_grid: { kk: { label: "2 × 2", description: "Төрт фотосурет" } },
};

export function getPhotoLayoutCopy(layout: BookPhotoLayout, locale: "ru" | "kk") {
  const fallback = BOOK_PHOTO_LAYOUTS.find((option) => option.value === layout) ?? BOOK_PHOTO_LAYOUTS[0];
  return locale === "kk" ? BOOK_PHOTO_LAYOUT_COPY[layout].kk : { label: fallback.label, description: fallback.description };
}

export type BookPhotoSlot = {
  id: string;
  slot: number;
  storagePath: string;
  signedUrl: string;
  mimeType: string;
  sizeBytes: number;
  cropX: number;
  cropY: number;
  cropScale: number;
  primary: boolean;
};

export function getPhotoLayoutSlotCount(layout: BookPhotoLayout) {
  return BOOK_PHOTO_LAYOUTS.find((option) => option.value === layout)?.slots ?? 1;
}

export function getBookPhotoSlots(image: BookPageImage): BookPhotoSlot[] {
  return [{
    id: image.id,
    slot: 1,
    storagePath: image.storagePath,
    signedUrl: image.signedUrl,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    cropX: image.cropX,
    cropY: image.cropY,
    cropScale: image.cropScale,
    primary: true,
  }, ...(image.collageImages ?? []).map((item) => ({ ...item, primary: false }))].sort((a, b) => a.slot - b.slot);
}
