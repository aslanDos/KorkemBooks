const AUTH_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Неверная электронная почта или пароль",
  "Email not confirmed": "Сначала подтвердите электронную почту",
  "User already registered": "Пользователь с такой почтой уже зарегистрирован",
  "Token has expired or is invalid": "Ссылка истекла или недействительна",
  "New password should be different from the old password.": "Новый пароль должен отличаться от старого",
};

export function getAuthErrorMessage(message: string) {
  return AUTH_MESSAGES[message] ?? "Не удалось выполнить запрос. Попробуйте ещё раз";
}
