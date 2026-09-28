import type { BookLanguage } from "./types";

export const BOOK_LANGUAGES = [
  { value: "ru", label: "RU — Русский" },
  { value: "kk", label: "KZ — Қазақша" },
] as const satisfies ReadonlyArray<{ value: BookLanguage; label: string }>;

export type AvailableBookLanguage = (typeof BOOK_LANGUAGES)[number]["value"];

export function isAvailableBookLanguage(value: unknown): value is AvailableBookLanguage {
  return value === "ru" || value === "kk";
}

const CONTENT: Record<BookLanguage, {
  contents: string;
  chapter: string;
  prefaceTitle: string;
  preface: string[];
  signature: string;
}> = {
  ru: {
    contents: "Содержание",
    chapter: "Глава",
    prefaceTitle: "Предисловие",
    preface: [
      "У каждого человека есть история, достойная того, чтобы стать книгой. Эта книга появилась потому, что ваши воспоминания важны и ими хочется делиться.",
      "На этих страницах собраны знакомые места, случайные улыбки и события, из которых складывается жизнь. Здесь остаётся то, что легко потерять в повседневной спешке.",
      "Читайте её не торопясь. Возвращайтесь к любимым эпизодам, вспоминайте, разговаривайте и открывайте друг в друге то, о чём прежде не успели спросить.",
      "Пусть эта книга бережно хранит вашу историю и передаёт её тепло тем, кто будет листать её сегодня и много лет спустя.",
    ],
    signature: "С теплом,",
  },
  kk: {
    contents: "Мазмұны",
    chapter: "Тарау",
    prefaceTitle: "Алғысөз",
    preface: [
      "Әр адамның кітапқа айналуға лайық тарихы бар. Бұл кітап сіздің естеліктеріңіз маңызды болғандықтан және олармен бөліскіңіз келгендіктен дүниеге келді.",
      "Бұл беттерде таныс жерлер, кездейсоқ күлкілер және өмірді құрайтын оқиғалар жинақталған. Мұнда күнделікті қарбаласта оңай жоғалып кететін сәттер сақталады.",
      "Оны асықпай оқыңыз. Сүйікті сәттеріңізге қайта оралып, еске алып, әңгімелесіп, бұрын сұрап үлгермеген дүниелерді бір-біріңізден қайта ашыңыз.",
      "Бұл кітап сіздің тарихыңызды аялап сақтап, оның жылуын бүгін де, көп жылдардан кейін де парақтайтын жандарға жеткізсін.",
    ],
    signature: "Ізгі тілекпен,",
  },
  en: {
    contents: "Contents",
    chapter: "Chapter",
    prefaceTitle: "Preface",
    preface: [
      "Everyone has a story worthy of becoming a book. This book exists because your memories matter and deserve to be shared.",
      "These pages bring together familiar places, unexpected smiles, and the moments that shape a life. They preserve what can so easily be lost in the rush of everyday life.",
      "Read it slowly. Return to your favorite moments, remember, talk, and discover in one another the things you never had time to ask before.",
      "May this book preserve your story with care and share its warmth with everyone who turns its pages today and for many years to come.",
    ],
    signature: "With warmth,",
  },
};

export function getBookContent(language: BookLanguage) {
  return CONTENT[language] ?? CONTENT.ru;
}

export function getBookLanguageLabel(language: BookLanguage) {
  if (language === "en") return "EN — English";
  return BOOK_LANGUAGES.find((option) => option.value === language)?.label ?? "RU — Русский";
}

export function isBookLanguage(value: unknown): value is BookLanguage {
  return value === "ru" || value === "kk" || value === "en";
}
