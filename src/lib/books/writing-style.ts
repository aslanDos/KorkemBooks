export const BOOK_WRITING_STYLE_VALUES = ["live_story", "warm_story", "literary_story"] as const;
export type BookWritingStyle = (typeof BOOK_WRITING_STYLE_VALUES)[number];

export const DEFAULT_BOOK_WRITING_STYLE: BookWritingStyle = "warm_story";

export function normalizeBookWritingStyle(value: unknown): BookWritingStyle {
  return BOOK_WRITING_STYLE_VALUES.includes(value as BookWritingStyle) ? value as BookWritingStyle : DEFAULT_BOOK_WRITING_STYLE;
}

export const BOOK_WRITING_STYLE_COPY = {
  ru: {
    live_story: { label: "Живой рассказ", description: "Просто и естественно — как в разговоре с близким", assistant: "Естественность и ваш голос" },
    warm_story: { label: "Тёплая история", description: "Плавно, душевно и выразительно", assistant: "Тепло и выразительность" },
    literary_story: { label: "Литературный рассказ", description: "Образно, атмосферно и эмоционально", assistant: "Образность и атмосфера" },
  },
  kk: {
    live_story: { label: "Жанды әңгіме", description: "Жақын адаммен сөйлескендей қарапайым әрі табиғи", assistant: "Табиғилық және өз даусыңыз" },
    warm_story: { label: "Жылы хикая", description: "Жатық, шынайы әрі әсерлі", assistant: "Жылылық және әсерлілік" },
    literary_story: { label: "Көркем әңгіме", description: "Бейнелі, атмосфералы және эмоцияға толы", assistant: "Бейнелілік және атмосфера" },
  },
} as const;
