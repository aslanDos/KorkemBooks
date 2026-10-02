import type { BookProductionStatus } from "./production-status";

export type BookType = {
  id: string;
  slug: string;
  name: string;
  chapterCount: number;
  questionCount: number;
};

export type BookLanguage = "ru" | "kk" | "en";

export type CoverTemplate = {
  id: string;
  slug: string;
  name: string;
  backgroundPath: string;
  textColor: string;
  overlayColor: string | null;
  overlayOpacity: number;
};

export type BookCover = {
  templateId: string;
  showAuthor: boolean;
  showRecipient: boolean;
  customBackgroundPath: string | null;
  customBackgroundUrl: string | null;
  titlePosition: CoverTitlePosition;
  fontStyle: CoverFontStyle;
  textTone: CoverTextTone;
  overlayStrength: number;
  colorKey: CoverColorKey;
  style: CoverStyle;
  coloredBack: boolean;
  backgroundInsideFrame: boolean;
  showFrame: boolean;
  frameStyle: "ver1" | "ver2";
  frameColor: string | null;
  showBackText: boolean;
  spineLetterSpacing: number;
  spineAuthorName: string;
  titleSize: number;
  authorSize: number;
  backTextTone: CoverTextTone;
  template: CoverTemplate;
};

export type CoverColorKey = "black" | "gray" | "burgundy" | "olive" | "navy" | "terracotta";
export type CoverStyle = "solid" | "template";

export type CoverTitlePosition = "top" | "center" | "bottom";
export type CoverFontStyle = "playfair" | "forum" | "manrope";
export type CoverTextTone = "dark" | "light";

export type BookSummary = {
  id: string;
  title: string;
  author_name: string;
  recipient_name: string;
  language: BookLanguage;
  status: "draft" | "in_progress" | "completed" | "archived";
  productionStatus: BookProductionStatus;
  progress: number;
  updated_at: string;
  book_types: { name: string } | null;
};

export type BookQuestion = {
  id: string;
  catalogId?: string | null;
  prompt: string;
  promptEditedByOwner: boolean;
  position: number;
  answer: string;
  answerFormat: AnswerFormat;
  images: BookPageImage[];
  blankPages: BookBlankPage[];
};

export type AnswerMarkType = "bold" | "italic" | "underline";

export type AnswerFormat = {
  version: 1;
  marks: Array<{ type: AnswerMarkType; from: number; to: number }>;
};

export type BookPageBackground = CoverColorKey;

export type BookPhotoTextSize = 10 | 12 | 14 | 16 | 20;
export type BookPhotoTextPosition = "top" | "middle" | "bottom";
export type BookPhotoTextTone = "auto" | "light" | "dark";

export type BookPhotoText = {
  enabled: boolean;
  content: string;
  size: BookPhotoTextSize;
  position: BookPhotoTextPosition;
  tone: BookPhotoTextTone;
  darkening: number;
  textShadow: number;
};

export const DEFAULT_BOOK_PHOTO_TEXT: BookPhotoText = {
  enabled: false,
  content: "",
  size: 12,
  position: "bottom",
  tone: "auto",
  darkening: 0,
  textShadow: 40,
};

export type BookPhotoLayout = "single" | "two_columns" | "two_rows" | "four_grid";

export type BookCollageImage = {
  id: string;
  slot: number;
  storagePath: string;
  signedUrl: string;
  mimeType: string;
  sizeBytes: number;
  cropX: number;
  cropY: number;
  cropScale: number;
};

export type BookPageImage = {
  id: string;
  pageId: string;
  storagePath: string;
  signedUrl: string;
  mimeType: string;
  sizeBytes: number;
  displayMode: "contain" | "full";
  pageBackground: BookPageBackground;
  roundedCorners: boolean;
  hideFooter: boolean;
  photoText: BookPhotoText;
  placement: "before" | "after";
  cropX: number;
  cropY: number;
  cropScale: number;
  collageLayout: BookPhotoLayout;
  collageImages: BookCollageImage[];
  position: number;
};

export type BookBlankPage = {
  id: string;
  pageBackground: BookPageBackground;
  placement: "before" | "after";
  position: number;
};

export type BookChapter = {
  id: string;
  title: string;
  position: number;
  questions: BookQuestion[];
};

export type BookWithContent = Omit<BookSummary, "book_types"> & {
  typeName: string;
  productionStatus: BookProductionStatus;
  pageFont: BookPageFont;
  titlePageTitleSize: BookTitlePageTitleSize;
  chapterPageStyle: BookChapterPageStyle;
  chapterTitleSize: BookChapterTitleSize;
  questionTextSize: BookQuestionTextSize;
  answerTextSize: BookAnswerTextSize;
  showFooterAuthor: boolean;
  showFooterTitle: boolean;
  roundPhotos: boolean;
  hidePhotoFooters: boolean;
  pageBackground: BookPageBackground;
  chapters: BookChapter[];
  cover: BookCover | null;
};

export type BookPageFont = "literata";
export const BOOK_TITLE_PAGE_TITLE_SIZES = [16, 18, 20, 22, 24] as const;
export type BookTitlePageTitleSize = (typeof BOOK_TITLE_PAGE_TITLE_SIZES)[number];
export type BookChapterPageStyle = "default" | "numeral" | "vertical";
export const BOOK_CHAPTER_TITLE_SIZES = [6, 8, 10, 12, 14] as const;
export type BookChapterTitleSize = (typeof BOOK_CHAPTER_TITLE_SIZES)[number];
export const BOOK_QUESTION_TEXT_SIZES = [8, 10, 12, 14, 16] as const;
export type BookQuestionTextSize = (typeof BOOK_QUESTION_TEXT_SIZES)[number];
export const BOOK_ANSWER_TEXT_SIZES = [14, 16, 18, 20, 22] as const;
export type BookAnswerTextSize = (typeof BOOK_ANSWER_TEXT_SIZES)[number];
