import { z } from "zod";

export const createBookSchema = z.object({
  title: z.string().trim().min(1, "Введите название книги").max(200, "Название слишком длинное"),
  authorName: z.string().trim().min(1, "Введите имя автора").max(120, "Имя автора слишком длинное"),
  recipientName: z.string().trim().max(120, "Имя получателя слишком длинное").default(""),
});

export const updateBookSchema = z.object({
  authorName: z.string().trim().min(1, "Введите имя автора").max(120, "Имя автора слишком длинное"),
  bookId: z.string().uuid("Книга не найдена"),
  title: z.string().trim().min(1, "Введите название книги").max(200, "Название слишком длинное"),
  recipientName: z.string().trim().max(120, "Имя получателя слишком длинное").default(""),
});
