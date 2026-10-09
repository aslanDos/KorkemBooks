export const BOOK_GENDER_VALUES = ["female", "male"] as const;

export type BookGender = (typeof BOOK_GENDER_VALUES)[number];

export function normalizeBookGender(value: unknown): BookGender | null {
  return value === "female" || value === "male" ? value : null;
}

export function getBookGenderLabel(value: BookGender | null) {
  if (value === "female") return "В женском роде";
  if (value === "male") return "В мужском роде";
  return "Нейтральное обращение";
}
