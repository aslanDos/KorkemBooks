import { z } from "zod";
import { BOOK_WRITING_STYLE_VALUES, DEFAULT_BOOK_WRITING_STYLE } from "./writing-style";
import { BOOK_GENDER_VALUES } from "./personalization";

const writingStyleSchema = z.enum(BOOK_WRITING_STYLE_VALUES);
const genderSchema = z.union([z.enum(BOOK_GENDER_VALUES), z.literal("neutral")]).default("neutral");
const backCoverTextSchema = z.string().trim().max(1000, "Текст для обложки слишком длинный").default("");

export const createBookSchema = z.object({
  title: z.string().trim().min(1, "Введите название книги").max(200, "Название слишком длинное"),
  authorName: z.string().trim().min(1, "Введите имя автора").max(120, "Имя автора слишком длинное"),
  recipientName: z.string().trim().max(120, "Имя получателя слишком длинное").default(""),
  authorGender: genderSchema,
  recipientGender: genderSchema,
  backCoverText: backCoverTextSchema,
  writingStyle: writingStyleSchema.default(DEFAULT_BOOK_WRITING_STYLE),
});

export const updateBookSchema = z.object({
  authorName: z.string().trim().min(1, "Введите имя автора").max(120, "Имя автора слишком длинное"),
  bookId: z.string().uuid("Книга не найдена"),
  title: z.string().trim().min(1, "Введите название книги").max(200, "Название слишком длинное"),
  recipientName: z.string().trim().max(120, "Имя получателя слишком длинное").default(""),
  authorGender: genderSchema,
  recipientGender: genderSchema,
  backCoverText: backCoverTextSchema,
  writingStyle: writingStyleSchema.optional(),
});
