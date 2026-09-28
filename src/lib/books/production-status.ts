export type BookProductionStatus = "writing" | "editing" | "approval" | "printing" | "ready" | "delivery" | "received";

export const BOOK_PRODUCTION_LABELS: Record<BookProductionStatus, string> = {
  writing: "Написание",
  editing: "Редактура",
  approval: "На согласовании",
  printing: "Печать",
  ready: "Готово",
  delivery: "Доставка",
  received: "Получена",
};

export const BOOK_PRODUCTION_DESCRIPTIONS: Record<BookProductionStatus, string> = {
  writing: "Продолжайте отвечать на вопросы и оформлять книгу.",
  editing: "Команда проверяет текст и готовит макет книги.",
  approval: "Посмотрите готовый макет и подтвердите его или попросите внести правки.",
  printing: "Макет подтверждён и передан в печать.",
  ready: "Книга напечатана и готова к передаче.",
  delivery: "Книга передаётся вам выбранным способом.",
  received: "Книга у вас. Спасибо, что сохранили свою историю с нами.",
};
