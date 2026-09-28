import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { DEFAULT_BOOK_PHOTO_TEXT, type BookAnswerTextSize, type BookBlankPage, type BookChapter, type BookChapterTitleSize, type BookCover, type BookPageImage, type BookPhotoText, type BookQuestion, type BookQuestionTextSize, type BookSummary, type BookTitlePageTitleSize, type BookType, type BookWithContent, type CoverTemplate } from "./types";
import { normalizeCoverColor, normalizePageBackground } from "./cover-palettes";
import { normalizeAnswerFormat } from "./answer-format";
import { isBookLanguage } from "./language";
import { getBookPageProgress } from "./progress";
import { getExpectedChapterCount, isRemovedBookTypeSlug } from "./catalog";

export type BookContentMode = "full" | "structure" | "cover" | "summary";
type InternalBookContentMode = BookContentMode | "progress";

export async function getCoverTemplates(): Promise<CoverTemplate[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from("cover_templates").select("id, slug, name, background_path, text_color, overlay_color, overlay_opacity").eq("is_active", true).order("sort_order");
  return (data ?? []).map((template) => ({
    id: template.id,
    slug: template.slug,
    name: template.name,
    backgroundPath: template.background_path,
    textColor: template.text_color,
    overlayColor: template.overlay_color,
    overlayOpacity: Number(template.overlay_opacity),
  }));
}

export async function getBookTypes(): Promise<BookType[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: types } = await supabase
    .from("book_types")
    .select("id, slug, name, question_catalog(count)")
    .eq("is_active", true)
    .order("sort_order");
  return (types ?? []).filter((type) => !isRemovedBookTypeSlug(type.slug)).map((type) => ({
    id: type.id,
    slug: type.slug,
    name: type.name,
    chapterCount: getExpectedChapterCount(type.slug),
    questionCount: type.question_catalog?.[0]?.count ?? 0,
  }));
}

export async function getBooks(limit?: number): Promise<BookSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const books: BookSummary[] = [];
  const pageSize = limit ?? 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author_name, recipient_name, language, status, production_status, progress, updated_at, book_types(name)")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) return [];
    books.push(...(data ?? []).map((book) => ({
      ...book,
      language: isBookLanguage(book.language) ? book.language : "ru",
      productionStatus: book.production_status ?? "writing",
      book_types: Array.isArray(book.book_types) ? (book.book_types[0] ?? null) : book.book_types,
    })) as BookSummary[]);
    if (limit || !data || data.length < pageSize) break;
  }
  return books;
}

export const getFirstBookId = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("books")
    .select("id")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
});

export async function getBookWithContent(bookId: string, content: BookContentMode = "full"): Promise<BookWithContent | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  return loadBookWithContent(supabase, bookId, content);
}

export async function getLastViewedQuestionId(bookId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("book_reading_positions")
    .select("question_id")
    .eq("book_id", bookId)
    .maybeSingle();
  return data?.question_id ?? null;
}

export async function getAdminBookWithContent(bookId: string, content: BookContentMode = "full"): Promise<BookWithContent | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return null;
  return loadBookWithContent(supabase, bookId, content);
}

export async function refreshBookPageProgress(supabase: SupabaseClient, bookId: string): Promise<number | null> {
  const book = await loadBookWithContent(supabase, bookId, "progress");
  if (!book) return null;
  const { error } = await supabase.from("books").update({ progress: book.progress }).eq("id", bookId).is("deleted_at", null);
  return error ? null : book.progress;
}

async function loadBookWithContent(supabase: SupabaseClient, bookId: string, content: InternalBookContentMode = "full"): Promise<BookWithContent | null> {
  const includeChapters = content !== "cover";
  const includeAttachments = content === "full" || content === "summary" || content === "progress";
  const includeCover = content !== "progress";
  const { data: book } = await supabase
    .from("books")
    .select("id, title, author_name, recipient_name, language, status, progress, updated_at, page_font, production_status, title_page_title_size, chapter_page_style, chapter_title_size, question_text_size, answer_text_size, show_footer_author, show_footer_title, round_photos, hide_photo_footers, page_background_style, book_types(name)")
    .eq("id", bookId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!book) return null;

  // The book lookup above remains the access boundary; RLS applies to every query.
  const [{ data: chapterRows }, { data: coverRow }, { data: answerRows }, { data: imageRows }, { data: pageRows }, { data: questionData }] = await Promise.all([
    !includeChapters ? Promise.resolve({ data: [] }) : supabase
    .from("chapters")
    .select("id, title, position")
    .eq("book_id", bookId)
    .is("deleted_at", null)
    .order("position"),
    !includeCover ? Promise.resolve({ data: null }) : supabase
    .from("book_covers")
    .select("template_id, show_author, show_recipient, custom_background_path, title_position, font_style, text_tone, overlay_strength, color_key, cover_style, colored_back, background_inside_frame, show_frame, frame_style, frame_color, show_back_text, spine_letter_spacing, spine_author_name, title_size, author_size, back_text_tone, cover_templates(id, slug, name, background_path, text_color, overlay_color, overlay_opacity)")
    .eq("book_id", bookId)
    .maybeSingle(),
    includeChapters ? supabase.from("answers").select("question_id, answer_text, answer_format").eq("book_id", bookId) : Promise.resolve({ data: [] }),
    includeAttachments ? supabase.from("book_page_images").select("id, question_id, storage_path, mime_type, size_bytes, display_mode, placement, crop_x, crop_y, crop_scale, rounded_corners, hide_footer, position, book_photo_texts(enabled, content, text_size, placement, position, tone, image_darkening, text_shadow)").eq("book_id", bookId).order("position") : Promise.resolve({ data: [] }),
    includeAttachments ? supabase.from("book_question_pages").select("id, question_id, image_id, kind, placement, position, background_style").eq("book_id", bookId).order("position") : Promise.resolve({ data: [] }),
    includeChapters ? supabase.from("questions").select("id, chapter_id, catalog_id, prompt, position").eq("book_id", bookId).is("deleted_at", null).order("position") : Promise.resolve({ data: [] }),
  ]);

  const chapters = (chapterRows ?? []) as Omit<BookChapter, "questions">[];
  const paths = [...new Set((imageRows ?? []).map((image) => image.storage_path))];
  const [{ data: signed }, customBackgroundSigned] = await Promise.all([
    content === "full" && paths.length
      ? supabase.storage.from("book-images").createSignedUrls(paths, 3600)
      : Promise.resolve({ data: [] }),
    content !== "progress" && coverRow?.custom_background_path
      ? supabase.storage.from("book-cover-images").createSignedUrl(coverRow.custom_background_path, 3600)
      : Promise.resolve(null),
  ]);
  let questions: (BookQuestion & { chapter_id: string })[] = [];

  if (chapters.length > 0) {
    const questionRows = (questionData ?? []) as (Omit<BookQuestion & { chapter_id: string }, "answer" | "images" | "blankPages"> & { catalog_id: string | null })[];
    const answersByQuestion = new Map((answerRows ?? []).map((answer) => [answer.question_id, answer.answer_text]));
    const formatsByQuestion = new Map((answerRows ?? []).map((answer) => [answer.question_id, normalizeAnswerFormat(answer.answer_format, answer.answer_text.length)]));
    const urls = new Map((signed ?? []).map((image) => [image.path, image.signedUrl]));
    const pageByImageId = new Map((pageRows ?? []).filter((page) => page.kind === "photo" && page.image_id).map((page) => [page.image_id, page]));
    const signedImages = (imageRows ?? []).map((image) => {
      const page = pageByImageId.get(image.id);
      return [image.question_id, {
        id: image.id,
        pageId: page?.id ?? image.id,
        storagePath: image.storage_path,
        signedUrl: urls.get(image.storage_path) ?? "",
        mimeType: image.mime_type,
        sizeBytes: image.size_bytes,
        displayMode: image.display_mode === "full" ? "full" : "contain",
        pageBackground: normalizePageBackground(page?.background_style),
        roundedCorners: Boolean(image.rounded_corners),
        hideFooter: Boolean(image.hide_footer),
        photoText: normalizeBookPhotoText(image.book_photo_texts),
        placement: (page?.placement ?? image.placement) === "before" ? "before" : "after",
        cropX: Number(image.crop_x ?? 0),
        cropY: Number(image.crop_y ?? 0),
        cropScale: Number(image.crop_scale ?? 1),
        position: page?.position ?? image.position,
      } satisfies BookPageImage] as const;
    });
    const imagesByQuestion = new Map<string, BookPageImage[]>();
    for (const [questionId, image] of signedImages) {
      const current = imagesByQuestion.get(questionId) ?? [];
      current.push(image);
      imagesByQuestion.set(questionId, current);
    }
    for (const current of imagesByQuestion.values()) current.sort((a, b) => a.position - b.position);
    const blankPagesByQuestion = new Map<string, BookBlankPage[]>();
    for (const page of (pageRows ?? []).filter((item) => item.kind === "blank")) {
      const current = blankPagesByQuestion.get(page.question_id) ?? [];
      current.push({ id: page.id, pageBackground: normalizePageBackground(page.background_style), placement: page.placement === "before" ? "before" : "after", position: page.position });
      blankPagesByQuestion.set(page.question_id, current);
    }
    for (const current of blankPagesByQuestion.values()) current.sort((a, b) => a.position - b.position);
    questions = questionRows.map((question) => ({
      ...question,
      catalogId: question.catalog_id,
      answer: answersByQuestion.get(question.id) ?? "",
      answerFormat: formatsByQuestion.get(question.id) ?? normalizeAnswerFormat(null),
      images: imagesByQuestion.get(question.id) ?? [],
      blankPages: blankPagesByQuestion.get(question.id) ?? [],
    }));
  }

  const typeRelation = Array.isArray(book.book_types) ? book.book_types[0] : book.book_types;
  const coverRelation = coverRow ? (Array.isArray(coverRow.cover_templates) ? coverRow.cover_templates[0] : coverRow.cover_templates) : null;
  const cover = coverRow && coverRelation ? {
    templateId: coverRow.template_id,
    showAuthor: coverRow.show_author,
    showRecipient: coverRow.show_recipient,
    customBackgroundPath: coverRow.custom_background_path,
    customBackgroundUrl: customBackgroundSigned?.data?.signedUrl ?? null,
    titlePosition: coverRow.title_position,
    fontStyle: coverRow.font_style,
    textTone: coverRow.text_tone,
    overlayStrength: Number(coverRow.overlay_strength),
    colorKey: normalizeCoverColor(coverRow.color_key),
    style: coverRow.cover_style ?? "solid",
    coloredBack: coverRow.colored_back ?? false,
    backgroundInsideFrame: coverRow.background_inside_frame ?? false,
    showFrame: coverRow.show_frame ?? true,
    frameStyle: coverRow.frame_style === "ver1" ? "ver1" : "ver2",
    frameColor: coverRow.frame_color ?? null,
    showBackText: coverRow.show_back_text ?? true,
    spineLetterSpacing: Math.max(0, Math.min(50, Math.round(Number(coverRow.spine_letter_spacing ?? 10)))),
    spineAuthorName: coverRow.spine_author_name ?? "",
    titleSize: Number(coverRow.title_size ?? 24),
    authorSize: Number(coverRow.author_size ?? 10),
    backTextTone: coverRow.back_text_tone ?? "dark",
    template: {
      id: coverRelation.id,
      slug: coverRelation.slug,
      name: coverRelation.name,
      backgroundPath: coverRelation.background_path,
      textColor: coverRelation.text_color,
      overlayColor: coverRelation.overlay_color,
      overlayOpacity: Number(coverRelation.overlay_opacity),
    },
  } satisfies BookCover : null;

  const loadedBook = {
    id: book.id,
    title: book.title,
    author_name: book.author_name,
    recipient_name: book.recipient_name,
    language: isBookLanguage(book.language) ? book.language : "ru",
    status: book.status,
    progress: book.progress,
    updated_at: book.updated_at,
    typeName: typeRelation?.name ?? "Книга",
    productionStatus: book.production_status ?? "writing",
    pageFont: "literata",
    titlePageTitleSize: normalizeTitlePageTitleSize(book.title_page_title_size),
    chapterPageStyle: book.chapter_page_style === "numeral" || book.chapter_page_style === "vertical" ? book.chapter_page_style : "default",
    chapterTitleSize: normalizeChapterTitleSize(book.chapter_title_size),
    questionTextSize: normalizeQuestionTextSize(book.question_text_size),
    answerTextSize: normalizeAnswerTextSize(book.answer_text_size),
    showFooterAuthor: book.show_footer_author !== false,
    showFooterTitle: book.show_footer_title !== false,
    roundPhotos: Boolean(book.round_photos),
    hidePhotoFooters: Boolean(book.hide_photo_footers),
    pageBackground: normalizePageBackground(book.page_background_style),
    cover,
    chapters: chapters.map((chapter) => ({
      ...chapter,
      questions: questions.filter((question) => question.chapter_id === chapter.id),
    })),
  } as BookWithContent;

  if (includeAttachments) loadedBook.progress = getBookPageProgress(loadedBook).progress;
  return loadedBook;
}

function normalizeChapterTitleSize(value: unknown): BookChapterTitleSize {
  const size = Number(value) as BookChapterTitleSize;
  return ([6, 8, 10, 12, 14] as const).includes(size) ? size : 10;
}

function normalizeTitlePageTitleSize(value: unknown): BookTitlePageTitleSize {
  const size = Number(value) as BookTitlePageTitleSize;
  return ([16, 18, 20, 22, 24] as const).includes(size) ? size : 20;
}

function normalizeBookPhotoText(value: unknown): BookPhotoText {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!relation || typeof relation !== "object") return { ...DEFAULT_BOOK_PHOTO_TEXT };
  const row = relation as Record<string, unknown>;
  const numericSize = Number(row.text_size);
  const size = ([10, 12, 14, 16, 20] as const).find((option) => option === numericSize) ?? 12;
  const placement = row.placement === "below" ? "below" : "overlay";
  const position = typeof row.position === "string" && row.position.startsWith("top")
    ? "top"
    : typeof row.position === "string" && row.position.startsWith("middle")
      ? "middle"
      : "bottom";
  const tone = row.tone === "light" || row.tone === "dark" ? row.tone : "auto";
  return {
    enabled: row.enabled === true,
    content: typeof row.content === "string" ? row.content : "",
    size,
    placement,
    position,
    tone,
    darkening: Math.max(0, Math.min(50, Math.round(Number(row.image_darkening) || 0))),
    textShadow: Math.max(0, Math.min(100, Math.round(Number(row.text_shadow) || 0))),
  };
}

function normalizeQuestionTextSize(value: unknown): BookQuestionTextSize {
  const size = Number(value) as BookQuestionTextSize;
  return ([8, 10, 12, 14, 16] as const).includes(size) ? size : 12;
}

function normalizeAnswerTextSize(value: unknown): BookAnswerTextSize {
  const size = Number(value) as BookAnswerTextSize;
  return ([14, 16, 18, 20, 22] as const).includes(size) ? size : 18;
}
