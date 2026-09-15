import { z } from "zod";
import { normalizePhone } from "./phone";

const emailSchemaValue = z.string().trim().toLowerCase().email("Введите корректную почту");

export const signInSchema = z.object({
  login: z.string().trim().min(1, "Введите номер телефона"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
}).transform((value, context) => {
  const phone = normalizePhone(value.login);
  const legacyEmail = emailSchemaValue.safeParse(value.login);
  if (!phone && !legacyEmail.success) {
    context.addIssue({ code: "custom", path: ["login"], message: "Введите корректный номер телефона" });
    return z.NEVER;
  }
  return { login: phone ?? value.login.toLowerCase(), password: value.password };
});

export const newPasswordSchema = z.object({
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
  passwordConfirmation: z.string().optional(),
}).refine((value) => !value.passwordConfirmation || value.password === value.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "Пароли не совпадают",
});

export const emailSchema = z.object({
  email: emailSchemaValue,
});
