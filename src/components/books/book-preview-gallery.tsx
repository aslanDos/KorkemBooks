"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Crop, FilePlus2, FileText, GripVertical, ImagePlus, List, Move, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { BookPhotoDialog } from "@/components/books/book-photo-dialog";
import { BookPagePhoto } from "@/components/books/book-page-photo";
import { BookPhotoText, hasVisiblePhotoText } from "@/components/books/book-photo-text";
import { BookTitlePage } from "@/components/books/book-title-page";
import { BookChapterPage } from "@/components/books/book-chapter-page";
import { BookPrefacePage } from "@/components/books/book-preface-page";
import { RichAnswerEditor, RichAnswerText } from "@/components/books/rich-answer-editor";
import type { AnswerFormat, BookBlankPage, BookPageImage, BookPhotoText as BookPhotoTextSettings, BookWithContent } from "@/lib/books/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveAnswerAction, saveReadingPositionAction } from "@/app/dashboard/books/write-actions";
import { paginateBookAnswer } from "@/lib/books/pagination";
import { getPageBackgroundColor, normalizePageBackground } from "@/lib/books/cover-palettes";
import { sliceAnswerFormat } from "@/lib/books/answer-format";
import { getBookFooterLabel } from "@/lib/books/page-footer";

const PHOTO_TEXT_SIZES: BookPhotoTextSettings["size"][] = [10, 12, 14, 16, 20];
const PHOTO_TEXT_POSITIONS: Array<{ value: BookPhotoTextSettings["position"]; label: string }> = [
  { value: "top", label: "Сверху" },
  { value: "middle", label: "По центру" },
  { value: "bottom", label: "Снизу" },
];
const PHOTO_TEXT_TONES: Array<{ value: BookPhotoTextSettings["tone"]; label: string }> = [
  { value: "auto", label: "Авто" },
  { value: "light", label: "Светлый" },
  { value: "dark", label: "Тёмный" },
];

function photoTextRow(bookId: string, imageId: string, settings: BookPhotoTextSettings) {
  return {
    image_id: imageId,
    book_id: bookId,
    enabled: settings.enabled,
    content: settings.content,
    text_size: settings.size,
    placement: settings.placement,
    position: settings.position,
    tone: settings.tone,
    image_darkening: Math.min(50, settings.darkening),
    text_shadow: settings.textShadow,
  };
}



export function BookPreviewGallery({ book, initialQuestionId }: { book: BookWithContent; initialQuestionId?: string }) {
  const [images, setImages] = useState<Record<string, BookPageImage[]>>(() => Object.fromEntries(book.chapters.flatMap((chapter) => chapter.questions.map((question) => [question.id, question.images]))));
  const [blankPages, setBlankPages] = useState<Record<string, BookBlankPage[]>>(() => Object.fromEntries(book.chapters.flatMap((chapter) => chapter.questions.map((question) => [question.id, question.blankPages]))));
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [formats, setFormats] = useState<Record<string, AnswerFormat>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>(() => Object.fromEntries(book.chapters.flatMap(chapter => chapter.questions.map(question => [question.id, question.answer]))));
  const [savedFormats, setSavedFormats] = useState<Record<string, AnswerFormat>>(() => Object.fromEntries(book.chapters.flatMap(chapter => chapter.questions.map(question => [question.id, question.answerFormat]))));
  const dirtyIds = Object.keys(answers).filter(id => answers[id] !== savedAnswers[id] || JSON.stringify(formats[id]) !== JSON.stringify(savedFormats[id]));
  const dirty = dirtyIds.length > 0;
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  useEffect(() => {
    if (!dirty && !saving) return;
    const onUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const onLink = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[href]") && !window.confirm("Есть несохранённый текст. Уйти без сохранения?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onLink, true);
    return () => { window.removeEventListener("beforeunload", onUnload); document.removeEventListener("click", onLink, true); };
  }, [dirty, saving]);
  const pages = useMemo(() => {
    const storyPages = book.chapters.flatMap((chapter, chapterIndex) => [
      { chapter, chapterIndex, kind: "chapter" as const, key: `chapter-${chapter.id}` },
      ...chapter.questions.flatMap((question) => {
        const answer = answers[question.id] ?? question.answer;
        const answerFormat = formats[question.id] ?? question.answerFormat;
        let answerOffset = 0;
        const questionPages = paginateBookAnswer(question.prompt, answer, { question: book.questionTextSize, answer: book.answerTextSize }).map((answerPart, answerPageIndex) => {
          const pageFormat = sliceAnswerFormat(answerFormat, answerOffset, answerOffset + answerPart.length);
          const page = { ...question, answer, answerFormat, answerPart, answerPageFormat: pageFormat, answerPageIndex, chapter, kind: "question" as const, key: answerPageIndex === 0 ? `question-${question.id}` : `question-${question.id}-continuation-${answerPageIndex}`, questionId: question.id };
          answerOffset += answerPart.length + 1;
          return page;
        });
        const attachmentPages = [
          ...(images[question.id] ?? []).map((image) => ({ ...question, image, chapter, kind: "photo" as const, key: `photo-${image.id}`, questionId: question.id, placement: image.placement, position: image.position })),
          ...(blankPages[question.id] ?? []).map((blankPage) => ({ ...question, blankPage, chapter, kind: "blank" as const, key: `blank-${blankPage.id}`, questionId: question.id, placement: blankPage.placement, position: blankPage.position })),
        ].sort((a, b) => a.position - b.position);
        return [...attachmentPages.filter((page) => page.placement === "before"), ...questionPages, ...attachmentPages.filter((page) => page.placement === "after")];
      }),
    ]).map((page, index) => ({ ...page, pageNumber: index + 5 }));
    const contents = book.chapters.map((chapter, index) => ({
      id: chapter.id,
      title: chapter.title,
      chapterNumber: index + 1,
      pageNumber: storyPages.find((page) => page.kind === "chapter" && page.chapter.id === chapter.id)?.pageNumber ?? null,
    }));
    return [
      { kind: "opening-blank" as const, key: "opening-blank", pageNumber: 1 },
      { kind: "title" as const, key: "title", pageNumber: 2 },
      { kind: "preface" as const, key: "preface", pageNumber: 3 },
      { kind: "contents" as const, key: "contents", pageNumber: 4, contents },
      ...storyPages,
    ];
  }, [book.chapters, book.questionTextSize, book.answerTextSize, images, blankPages, answers, formats]);
  const [activePageKey, setActivePageKey] = useState<string | undefined>(() => { const questions = book.chapters.flatMap(chapter => chapter.questions); const question = questions.find(q => q.id === initialQuestionId) ?? questions.find(q => !q.answer.trim()) ?? questions[0]; return question ? `question-${question.id}` : "preface"; });
  const [photoDialogTarget, setPhotoDialogTarget] = useState<{ questionId: string; imageId: string | null; placement: BookPageImage["placement"]; insertPosition?: number } | null>(null);
  const [layoutError, setLayoutError] = useState("");
  const [layoutPending, setLayoutPending] = useState(false);
  const [applyRoundingToAll, setApplyRoundingToAll] = useState(false);
  const [applyFooterRemovalToAll, setApplyFooterRemovalToAll] = useState(false);
  const [cropEditor, setCropEditor] = useState<{ questionId: string; image: BookPageImage; x: number; y: number; scale: number } | null>(null);
  const [cropPending, setCropPending] = useState(false);
  const [cropError, setCropError] = useState("");
  const cropDragRef = useRef<{ pointerId: number; clientX: number; clientY: number; x: number; y: number } | null>(null);
  const photoTextSaveTimerRef = useRef<number | null>(null);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const pageTypeDialogRef = useRef<HTMLDialogElement>(null);
  const savedPositionRef = useRef<string | undefined>(undefined);
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const active = pages.find((page) => page.key === activePageKey) ?? pages[0];
  type PreviewQuestionPage = Extract<(typeof pages)[number], { kind: "question" }>;
  type PreviewAttachmentPage = Extract<(typeof pages)[number], { kind: "photo" | "blank" }>;
  const editable = active.kind === "question" ? active : active.kind === "photo" || active.kind === "blank" ? pages.find((page): page is PreviewQuestionPage => page.kind === "question" && page.questionId === active.questionId) : null;
  const questions = pages.filter((page): page is PreviewQuestionPage => page.kind === "question" && page.answerPageIndex === 0);
  const questionIndex = questions.findIndex(page => page.questionId === (editable?.kind === "question" ? editable.questionId : ""));
  const questionSequence = editable ? pages.filter((page): page is PreviewQuestionPage | PreviewAttachmentPage => (page.kind === "question" || page.kind === "photo" || page.kind === "blank") && page.questionId === editable.questionId) : [];
  const activeQuestionPageIndex = questionSequence.findIndex((page) => page.key === active.key);

  useEffect(() => () => {
    if (photoTextSaveTimerRef.current !== null) window.clearTimeout(photoTextSaveTimerRef.current);
  }, []);

  useEffect(() => {
    if (!editable || savedPositionRef.current === editable.questionId) return;
    savedPositionRef.current = editable.questionId;
    void saveReadingPositionAction({ bookId: book.id, questionId: editable.questionId });
  }, [book.id, editable]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new ResizeObserver(() => setScale(Math.min(1, Math.max(.2, (stage.clientWidth - 32) / 400))));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const saveText = useCallback(async () => {
    const pendingIds = Object.keys(answers).filter(id => answers[id] !== savedAnswers[id] || JSON.stringify(formats[id]) !== JSON.stringify(savedFormats[id]));
    if (!pendingIds.length || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      for (const id of pendingIds) {
        const answer = answers[id];
        const answerFormat = formats[id] ?? savedFormats[id];
        const result = await saveAnswerAction({ questionId: id, answerText: answer, answerFormat });
        if (result.error) { setSaveError(result.error); return; }
        setSavedAnswers(current => ({ ...current, [id]: answer }));
        setSavedFormats(current => ({ ...current, [id]: answerFormat }));
      }
    } catch { setSaveError("Не удалось сохранить ответ. Попробуйте ещё раз."); }
    finally { savingRef.current = false; setSaving(false); }
  }, [answers, formats, savedAnswers, savedFormats]);

  useEffect(() => {
    if (!dirty || saving || saveError) return;
    const timeout = window.setTimeout(() => { void saveText(); }, 900);
    return () => window.clearTimeout(timeout);
  }, [dirty, saving, saveError, saveText]);
  const photoSourcePage = photoDialogTarget ? pages.find((page) => page.kind === "question" && page.questionId === photoDialogTarget.questionId) ?? null : null;
  const photoDialogImage = photoDialogTarget?.imageId ? (images[photoDialogTarget.questionId] ?? []).find((image) => image.id === photoDialogTarget.imageId) ?? null : null;
  const photoDialogPageNumber = photoSourcePage && photoDialogTarget
    ? photoDialogImage
      ? pages.find((page) => page.kind === "photo" && page.image.id === photoDialogImage.id)?.pageNumber ?? photoSourcePage.pageNumber + 1
      : active.kind === "photo" || active.kind === "blank"
        ? Math.max(1, active.pageNumber + (photoDialogTarget.insertPosition === active.position ? -1 : 1))
        : Math.max(1, photoSourcePage.pageNumber + (photoDialogTarget.placement === "before" ? -1 : 1))
    : 0;

  function nextAttachmentPosition() {
    if (active.kind === "photo" || active.kind === "blank") return { questionId: active.questionId, placement: active.placement, position: active.position + 1 };
    if (active.kind === "question") return { questionId: active.questionId, placement: "after" as const, position: 1 };
    return null;
  }

  function addPhoto() {
    const target = nextAttachmentPosition();
    if (target) setPhotoDialogTarget({ questionId: target.questionId, imageId: null, placement: target.placement, insertPosition: target.position });
    pageTypeDialogRef.current?.close();
  }

  async function addBlankPage() {
    const target = nextAttachmentPosition();
    pageTypeDialogRef.current?.close();
    if (!target || layoutPending) return;
    setLayoutPending(true);
    setLayoutError("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error();
      const result = await supabase.rpc("append_book_question_blank", {
        target_book_id: book.id,
        target_question_id: target.questionId,
        target_placement: target.placement,
        target_position: target.position,
      }).single();
      const data = result.data as { id: string; placement: string; position: number; background_style: string } | null;
      const error = result.error;
      if (error || !data) throw new Error();
      const createdPage: BookBlankPage = { id: data.id, pageBackground: normalizePageBackground(data.background_style), placement: data.placement === "before" ? "before" : "after", position: data.position };
      setImages((current) => ({ ...current, [target.questionId]: (current[target.questionId] ?? []).map((image) => image.placement === target.placement && image.position >= data.position ? { ...image, position: image.position + 1 } : image) }));
      setBlankPages((current) => ({
        ...current,
        [target.questionId]: [
          ...(current[target.questionId] ?? []).map((page) => page.placement === target.placement && page.position >= data.position ? { ...page, position: page.position + 1 } : page),
          createdPage,
        ].sort((a, b) => a.position - b.position),
      }));
      setActivePageKey(`blank-${data.id}`);
    } catch { setLayoutError("Не удалось добавить пустую страницу."); }
    finally { setLayoutPending(false); }
  }

  async function changeDisplayMode(mode: BookPageImage["displayMode"]) {
    if (layoutPending || !active || active.kind !== "photo" || active.image.displayMode === mode) return;
    setLayoutPending(true);
    const previous = active.image.displayMode;
    setLayoutError("");
    setImages((current) => ({ ...current, [active.questionId]: (current[active.questionId] ?? []).map((image) => image.id === active.image.id ? { ...image, displayMode: mode } : image) }));
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error();
      const { error } = await supabase.from("book_page_images").update({ display_mode: mode }).eq("id", active.image.id);
      if (error) throw error;
    } catch {
      setImages((current) => ({ ...current, [active.questionId]: (current[active.questionId] ?? []).map((image) => image.id === active.image.id ? { ...image, displayMode: previous } : image) }));
      setLayoutError("Не удалось сохранить расположение фотографии.");
    } finally { setLayoutPending(false); }
  }

  function updatePhotoTextInState(imageId: string, settings: BookPhotoTextSettings) {
    setImages((current) => Object.fromEntries(Object.entries(current).map(([questionId, questionImages]) => [
      questionId,
      questionImages.map((image) => image.id === imageId ? { ...image, photoText: settings } : image),
    ])));
  }

  async function persistPhotoText(imageId: string, settings: BookPhotoTextSettings) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error();
    const { error } = await supabase.from("book_photo_texts").upsert(photoTextRow(book.id, imageId, settings), { onConflict: "image_id" });
    if (error) throw error;
  }

  function changePhotoTextDraft(patch: Partial<BookPhotoTextSettings>) {
    if (active.kind !== "photo") return;
    const imageId = active.image.id;
    const next = { ...active.image.photoText, ...patch };
    if (typeof patch.content === "string") next.content = patch.content.slice(0, 300);
    updatePhotoTextInState(imageId, next);
    if (photoTextSaveTimerRef.current !== null) window.clearTimeout(photoTextSaveTimerRef.current);
    photoTextSaveTimerRef.current = window.setTimeout(() => {
      photoTextSaveTimerRef.current = null;
      void persistPhotoText(imageId, next).catch(() => setLayoutError("Не удалось сохранить текст фотографии."));
    }, 650);
  }

  function changePhotoTextContent(content: string) {
    changePhotoTextDraft({ content });
  }

  async function changePhotoTextSettings(patch: Partial<BookPhotoTextSettings>) {
    if (active.kind !== "photo" || layoutPending) return;
    if (photoTextSaveTimerRef.current !== null) {
      window.clearTimeout(photoTextSaveTimerRef.current);
      photoTextSaveTimerRef.current = null;
    }
    const previous = active.image.photoText;
    const next = { ...previous, ...patch };
    const imageId = active.image.id;
    setLayoutPending(true);
    setLayoutError("");
    updatePhotoTextInState(imageId, next);
    try {
      await persistPhotoText(imageId, next);
    } catch {
      updatePhotoTextInState(imageId, previous);
      setLayoutError("Не удалось сохранить оформление текста фотографии.");
    } finally { setLayoutPending(false); }
  }

  async function changePhotoRounding(roundedCorners: boolean, applyToAll = applyRoundingToAll) {
    if (active.kind !== "photo" || active.image.displayMode !== "contain" || layoutPending) return;
    const previousImages = images;
    const activeImageId = active.image.id;
    setLayoutPending(true);
    setLayoutError("");
    setImages((current) => Object.fromEntries(Object.entries(current).map(([questionId, questionImages]) => [
      questionId,
      questionImages.map((image) => applyToAll || image.id === activeImageId ? { ...image, roundedCorners } : image),
    ])));
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error();
      const query = supabase.from("book_page_images").update({ rounded_corners: roundedCorners });
      const { error } = applyToAll ? await query.eq("book_id", book.id) : await query.eq("id", activeImageId);
      if (error) throw error;
    } catch {
      setImages(previousImages);
      if (applyToAll) setApplyRoundingToAll(false);
      setLayoutError(applyToAll ? "Не удалось применить скругление ко всем фотографиям." : "Не удалось сохранить скругление фотографии.");
    } finally { setLayoutPending(false); }
  }

  async function changePhotoFooterHidden(hideFooter: boolean, applyToAll = applyFooterRemovalToAll) {
    if (active.kind !== "photo" || layoutPending) return;
    const previousImages = images;
    const activeImageId = active.image.id;
    setLayoutPending(true);
    setLayoutError("");
    setImages((current) => Object.fromEntries(Object.entries(current).map(([questionId, questionImages]) => [
      questionId,
      questionImages.map((image) => applyToAll || image.id === activeImageId ? { ...image, hideFooter } : image),
    ])));
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error();
      const query = supabase.from("book_page_images").update({ hide_footer: hideFooter });
      const { error } = applyToAll ? await query.eq("book_id", book.id) : await query.eq("id", activeImageId);
      if (error) throw error;
    } catch {
      setImages(previousImages);
      if (applyToAll) setApplyFooterRemovalToAll(false);
      setLayoutError(applyToAll ? "Не удалось убрать колонтитулы у всех фотографий." : "Не удалось сохранить настройку колонтитула фотографии.");
    } finally { setLayoutPending(false); }
  }

  async function movePage(direction: number) {
    if ((active.kind !== "photo" && active.kind !== "blank") || layoutPending) return;
    const questionId = active.questionId;
    const siblings = pages.filter((page): page is PreviewAttachmentPage => (page.kind === "photo" || page.kind === "blank") && page.questionId === questionId && page.placement === active.placement);
    const activePageId = active.kind === "photo" ? active.image.pageId : active.blankPage.id;
    const siblingIndex = siblings.findIndex((page) => (page.kind === "photo" ? page.image.pageId : page.blankPage.id) === activePageId);
    const targetSibling = siblings[siblingIndex + direction];
    if (!targetSibling) return;
    const targetPageId = targetSibling.kind === "photo" ? targetSibling.image.pageId : targetSibling.blankPage.id;
    const previousPosition = active.position;
    const nextPosition = targetSibling.position;
    setLayoutPending(true);
    setLayoutError("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error();
      const { data, error } = await supabase.rpc("reorder_book_question_page", { target_page_id: activePageId, target_position: nextPosition });
      if (error || !data) throw new Error();
      setImages((current) => ({ ...current, [questionId]: (current[questionId] ?? []).map((image) => image.pageId === activePageId ? { ...image, position: nextPosition } : image.pageId === targetPageId ? { ...image, position: previousPosition } : image) }));
      setBlankPages((current) => ({ ...current, [questionId]: (current[questionId] ?? []).map((page) => page.id === activePageId ? { ...page, position: nextPosition } : page.id === targetPageId ? { ...page, position: previousPosition } : page) }));
    } catch { setLayoutError("Не удалось изменить порядок страниц."); }
    finally { setLayoutPending(false); }
  }

  async function deleteBlankPage() {
    if (active.kind !== "blank" || layoutPending) return;
    const deletedPage = active.blankPage;
    const questionId = active.questionId;
    setLayoutPending(true);
    setLayoutError("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error();
      const { data, error } = await supabase.rpc("delete_book_question_blank", { target_page_id: deletedPage.id });
      if (error || !data) throw new Error();
      setImages((current) => ({ ...current, [questionId]: (current[questionId] ?? []).map((image) => image.placement === deletedPage.placement && image.position > deletedPage.position ? { ...image, position: image.position - 1 } : image) }));
      setBlankPages((current) => ({ ...current, [questionId]: (current[questionId] ?? []).filter((page) => page.id !== deletedPage.id).map((page) => page.placement === deletedPage.placement && page.position > deletedPage.position ? { ...page, position: page.position - 1 } : page) }));
      setActivePageKey(`question-${questionId}`);
    } catch { setLayoutError("Не удалось удалить пустую страницу."); }
    finally { setLayoutPending(false); }
  }

  async function deletePhotoPage() {
    if (active.kind !== "photo" || layoutPending) return;
    const deletedImage = active.image;
    const questionId = active.questionId;
    setLayoutPending(true);
    setLayoutError("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error();
      const { data: deletedStoragePath, error } = await supabase.rpc("delete_book_page_image", { target_image_id: deletedImage.id });
      if (error || !deletedStoragePath) throw new Error();
      await supabase.storage.from("book-images").remove([deletedStoragePath]);
      setImages((current) => ({
        ...current,
        [questionId]: (current[questionId] ?? [])
          .filter((image) => image.id !== deletedImage.id)
          .map((image) => image.placement === deletedImage.placement && image.position > deletedImage.position ? { ...image, position: image.position - 1 } : image),
      }));
      setBlankPages((current) => ({
        ...current,
        [questionId]: (current[questionId] ?? []).map((page) => page.placement === deletedImage.placement && page.position > deletedImage.position ? { ...page, position: page.position - 1 } : page),
      }));
      setActivePageKey(`question-${questionId}`);
    } catch { setLayoutError("Не удалось удалить фотографию."); }
    finally { setLayoutPending(false); }
  }

  async function saveCrop() {
    if (!cropEditor || cropPending) return;
    setCropPending(true);
    setCropError("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error();
      const { error } = await supabase.from("book_page_images").update({ crop_x: cropEditor.x, crop_y: cropEditor.y, crop_scale: cropEditor.scale }).eq("id", cropEditor.image.id);
      if (error) throw error;
      setImages((current) => ({ ...current, [cropEditor.questionId]: (current[cropEditor.questionId] ?? []).map((image) => image.id === cropEditor.image.id ? { ...image, cropX: cropEditor.x, cropY: cropEditor.y, cropScale: cropEditor.scale } : image) }));
      setCropEditor(null);
    } catch { setCropError("Не удалось сохранить кадрирование фотографии."); }
    finally { setCropPending(false); }
  }

  function renderPage(page: (typeof pages)[number], thumbnail = false) {
    if (page.kind === "opening-blank") return <div className="preview-opening-blank" aria-label="Первая пустая страница" />;

    if (page.kind === "title") return <BookTitlePage authorName={book.author_name} title={book.title} titleSize={book.titlePageTitleSize} />;

    if (page.kind === "preface") return <BookPrefacePage />;

    if (page.kind === "contents") return <div className="preview-contents-page">
      <h2>Содержание</h2>
      <ol>{page.contents.map((entry) => <li key={entry.id}><span className="preview-contents-page__chapter-number">{String(entry.chapterNumber).padStart(2, "0")}</span><span className="preview-contents-page__title">{entry.title}</span><i aria-hidden="true" /><b>{entry.pageNumber ?? "—"}</b></li>)}</ol>
    </div>;

    if (page.kind === "chapter") return <BookChapterPage chapterNumber={page.chapterIndex + 1} title={page.chapter.title} style={book.chapterPageStyle} titleSize={book.chapterTitleSize} background={book.pageBackground} />;

    if (page.kind === "photo") return <div className={`preview-photo-page preview-photo-page--${page.image.displayMode}${book.pageBackground !== "white" ? " preview-page-background--colored" : ""}${page.image.roundedCorners ? " preview-photo-page--rounded" : ""}${page.image.displayMode === "contain" && hasVisiblePhotoText(page.image.photoText) && page.image.photoText.placement === "below" ? " preview-photo-page--text-below" : ""}${thumbnail ? " preview-photo-page--thumbnail" : ""}`} style={{ background: getPageBackgroundColor(book.pageBackground) }}>
      <BookPagePhoto image={page.image} pageNumber={page.pageNumber} />
      <BookPhotoText settings={page.image.photoText} displayMode={page.image.displayMode} />
      {thumbnail && <span className="preview-photo-page__drag-hint" aria-hidden="true"><GripVertical size={10} /></span>}
    </div>;

    if (page.kind === "blank") return <div className={`preview-blank-page${book.pageBackground !== "white" ? " preview-page-background--colored" : ""}`} style={{ background: getPageBackgroundColor(book.pageBackground) }} aria-label={`Пустая страница ${page.pageNumber}`} />;

    return <>
      <div className="preview-page__content">
        <div className="preview-page__body">
          {page.answerPageIndex === 0 && <p className="preview-page__question">{page.prompt}</p>}
          {page.answerPart.trim() && <p className="preview-page__answer"><RichAnswerText text={page.answerPart} format={page.answerPageFormat} /></p>}
        </div>
      </div>
    </>;
  }

  return <section className="book-spread-viewer" aria-label="Предпросмотр книги">
    <div className="book-editor-controls">
    <div className="book-editor-savebar"><span role="status">{saveError ? "Не удалось сохранить" : saving || dirty ? "Сохраняется…" : "Сохранено"}</span>{saveError && <button type="button" disabled={saving} onClick={() => void saveText()}>Повторить сохранение</button>}</div>
    <div className="book-spread-toolbar">
      <button type="button" aria-haspopup="dialog" onClick={() => {
        setExpandedChapterId(editable?.kind === "question" ? editable.chapter.id : null);
        drawerRef.current?.showModal();
        requestAnimationFrame(() => drawerRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" }));
      }}><List size={17} />Все вопросы <span>{questions.filter(q => q.answer.trim()).length} / {questions.length}</span></button>
    </div>
    {/* Масштабирование предпросмотра временно скрыто. */}
    </div>
    {saveError && <p role="alert" className="preview-layout-error">{saveError}</p>}
    {layoutError && <p role="alert" className="preview-layout-error">{layoutError}</p>}
    <div className="book-editor-layout">
    <aside className="book-inline-editor">
      {editable && <nav className="book-question-pages" aria-label="Страницы текущего вопроса">
        <div><strong>Страницы вопроса</strong><span>{questionSequence.length}</span></div>
        <div>{questionSequence.map((page) => <button key={page.key} type="button" className={page.key === active.key ? "is-active" : ""} aria-current={page.key === active.key ? "page" : undefined} onClick={() => setActivePageKey(page.key)}>
          {page.kind === "question" ? <FileText size={15} /> : page.kind === "photo" ? <ImagePlus size={15} /> : <FilePlus2 size={15} />}
          {page.kind === "question" ? `Текст${page.answerPageIndex ? ` ${page.answerPageIndex + 1}` : ""}` : page.kind === "photo" ? "Фото" : "Пустая"}
        </button>)}<button className="book-question-pages__add" type="button" aria-haspopup="dialog" onClick={() => pageTypeDialogRef.current?.showModal()}><Plus size={15} />Добавить</button></div>
      </nav>}
      {active.kind === "chapter" ? <div className="book-page-variant-picker"><span className="book-inline-editor__chapter">Оформление страницы главы</span><strong>Выберите вариант</strong><button className="is-selected" type="button" aria-pressed="true"><span><small>Глава {active.chapterIndex + 1}</small><b>{active.chapter.title}</b></span><em>Классический</em><Check size={15} /></button><p>Сейчас доступен один вариант. Новые оформления можно будет добавить сюда позже.</p></div> : active.kind === "photo" ? <div className="book-photo-page-settings" aria-busy={layoutPending}>
        <div className="book-page-settings-heading"><span className="book-inline-editor__chapter">Фотография · Страница {active.pageNumber}</span><div><button type="button" aria-label="Переместить страницу раньше" title="Переместить раньше" disabled={layoutPending || active.position <= 1} onClick={() => void movePage(-1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Переместить страницу позже" title="Переместить позже" disabled={layoutPending || !pages.some(page => (page.kind === "photo" || page.kind === "blank") && page.questionId === active.questionId && page.placement === active.placement && page.position > active.position)} onClick={() => void movePage(1)}><ChevronRight size={18} /></button><button className="book-page-settings-heading__delete" type="button" aria-label="Удалить страницу" title="Удалить страницу" disabled={layoutPending} onClick={() => void deletePhotoPage()}><Trash2 size={17} /></button></div></div>
        <p>Фото привязано к этому вопросу. Добавьте следующую страницу, чтобы собрать цепочку фотографий.</p>
        <strong>Настройки страницы</strong>
        <div className="book-photo-page-settings__preview">
          <BookPagePhoto image={active.image} pageNumber={active.pageNumber} settings />
          <button className="book-photo-page-settings__replace" type="button" onClick={() => setPhotoDialogTarget({ questionId: active.questionId, imageId: active.image.id, placement: active.image.placement })}><ImagePlus size={16} />Заменить</button>
          <button className="book-photo-page-settings__crop" type="button" onClick={() => { setCropError(""); setCropEditor({ questionId: active.questionId, image: active.image, x: active.image.cropX, y: active.image.cropY, scale: active.image.cropScale }); }}><Crop size={16} />Кадрировать</button>
        </div>
        <fieldset className="book-photo-display-picker"><legend>Расположение фотографии</legend><div>
          <button type="button" className={active.image.displayMode === "contain" ? "is-selected" : ""} aria-pressed={active.image.displayMode === "contain"} disabled={layoutPending} onClick={() => void changeDisplayMode("contain")}>С полями</button>
          <button type="button" className={active.image.displayMode === "full" ? "is-selected" : ""} aria-pressed={active.image.displayMode === "full"} disabled={layoutPending} onClick={() => void changeDisplayMode("full")}>На всю страницу</button>
        </div></fieldset>
        <section className="book-photo-text-settings" aria-label="Текст на странице с фотографией">
          <div className="book-photo-text-settings__toggle"><span><strong>Текст на странице</strong><small>Добавить короткий текст к фотографии</small></span><button className="book-setting-toggle" type="button" role="switch" aria-label="Добавить текст на страницу с фотографией" aria-checked={active.image.photoText.enabled} disabled={layoutPending} onClick={() => void changePhotoTextSettings({ enabled: !active.image.photoText.enabled })}><span /></button></div>
          {active.image.photoText.enabled && <div className="book-photo-text-settings__body">
            <label className="book-photo-text-settings__input"><span>Текст</span><textarea value={active.image.photoText.content} maxLength={300} placeholder="Введите короткую подпись или цитату" disabled={layoutPending} onChange={(event) => changePhotoTextContent(event.target.value)} onBlur={(event) => {
              if (photoTextSaveTimerRef.current !== null) {
                window.clearTimeout(photoTextSaveTimerRef.current);
                photoTextSaveTimerRef.current = null;
              }
              void persistPhotoText(active.image.id, { ...active.image.photoText, content: event.currentTarget.value }).catch(() => setLayoutError("Не удалось сохранить текст фотографии."));
            }} /><small>{active.image.photoText.content.length}/300</small></label>
            <fieldset className="book-photo-text-settings__sizes"><legend>Размер</legend><div>{PHOTO_TEXT_SIZES.map((size) => <button key={size} type="button" className={active.image.photoText.size === size ? "is-selected" : ""} aria-pressed={active.image.photoText.size === size} disabled={layoutPending} onClick={() => void changePhotoTextSettings({ size })}>{size}</button>)}</div></fieldset>
            {active.image.displayMode === "contain" && <fieldset className="book-photo-text-settings__placement"><legend>Размещение</legend><div>
              <button type="button" className={active.image.photoText.placement === "overlay" ? "is-selected" : ""} aria-pressed={active.image.photoText.placement === "overlay"} disabled={layoutPending} onClick={() => void changePhotoTextSettings({ placement: "overlay" })}>На фото</button>
              <button type="button" className={active.image.photoText.placement === "below" ? "is-selected" : ""} aria-pressed={active.image.photoText.placement === "below"} disabled={layoutPending} onClick={() => void changePhotoTextSettings({ placement: "below" })}>Под фото</button>
            </div></fieldset>}
            {(active.image.displayMode === "full" || active.image.photoText.placement === "overlay") && <fieldset className="book-photo-text-settings__positions"><legend>Положение</legend><div>{PHOTO_TEXT_POSITIONS.map((option) => <button key={option.value} type="button" className={active.image.photoText.position === option.value ? "is-selected" : ""} aria-pressed={active.image.photoText.position === option.value} disabled={layoutPending} onClick={() => void changePhotoTextSettings({ position: option.value })}>{option.label}</button>)}</div></fieldset>}
            <fieldset className="book-photo-text-settings__choices"><legend>Цвет текста</legend><div>{PHOTO_TEXT_TONES.map((option) => <button key={option.value} type="button" className={active.image.photoText.tone === option.value ? "is-selected" : ""} aria-pressed={active.image.photoText.tone === option.value} disabled={layoutPending} onClick={() => void changePhotoTextSettings({ tone: option.value })}>{option.label}</button>)}</div></fieldset>
            <label className="book-photo-text-settings__range"><span><strong>Затемнение фотографии</strong><output>{active.image.photoText.darkening}%</output></span><input type="range" min="0" max="50" step="5" value={active.image.photoText.darkening} disabled={layoutPending} onChange={(event) => changePhotoTextDraft({ darkening: Number(event.target.value) })} /></label>
            <label className="book-photo-text-settings__range"><span><strong>Тень текста</strong><output>{active.image.photoText.textShadow}%</output></span><input type="range" min="0" max="100" step="5" value={active.image.photoText.textShadow} disabled={layoutPending} onChange={(event) => changePhotoTextDraft({ textShadow: Number(event.target.value) })} /></label>
          </div>}
        </section>
        {active.image.displayMode === "contain" && <section className="book-photo-rounding-settings" aria-label="Скругление фотографии">
          <div><span><strong>Скруглить фотографию</strong><small>Смягчить углы фотографии на странице</small></span><button className="book-setting-toggle" type="button" role="switch" aria-label="Скруглить фотографию" aria-checked={active.image.roundedCorners} disabled={layoutPending} onClick={() => { const next = !active.image.roundedCorners; if (!next) setApplyRoundingToAll(false); void changePhotoRounding(next); }}><span /></button></div>
          {active.image.roundedCorners && <div className="book-photo-rounding-settings__apply-all"><span><strong>Применить ко всем фото</strong><small>Использовать это скругление для всей книги</small></span><button className="book-setting-toggle" type="button" role="switch" aria-label="Применить скругление ко всем фотографиям в книге" aria-checked={applyRoundingToAll} disabled={layoutPending} onClick={() => { const next = !applyRoundingToAll; setApplyRoundingToAll(next); if (next) void changePhotoRounding(active.image.roundedCorners, true); }}><span /></button></div>}
        </section>}
        <section className="book-photo-rounding-settings" aria-label="Колонтитулы фотографии">
          <div><span><strong>Убрать колонтитулы</strong><small>Скрыть подпись и номер на этой странице</small></span><button className="book-setting-toggle" type="button" role="switch" aria-label="Убрать колонтитулы с фотографии" aria-checked={active.image.hideFooter} disabled={layoutPending} onClick={() => { const next = !active.image.hideFooter; if (!next) setApplyFooterRemovalToAll(false); void changePhotoFooterHidden(next); }}><span /></button></div>
          {active.image.hideFooter && <div className="book-photo-rounding-settings__apply-all"><span><strong>Применить ко всем фото</strong><small>Убрать колонтитулы со всех фотографий книги</small></span><button className="book-setting-toggle" type="button" role="switch" aria-label="Убрать колонтитулы со всех фотографий книги" aria-checked={applyFooterRemovalToAll} disabled={layoutPending} onClick={() => { const next = !applyFooterRemovalToAll; setApplyFooterRemovalToAll(next); if (next) void changePhotoFooterHidden(active.image.hideFooter, true); }}><span /></button></div>}
        </section>
      </div> : active.kind === "blank" ? <div className="book-blank-page-settings" aria-busy={layoutPending}>
        <div className="book-page-settings-heading"><span className="book-inline-editor__chapter">Пустая страница · Страница {active.pageNumber}</span><div><button type="button" aria-label="Переместить страницу раньше" title="Переместить раньше" disabled={layoutPending || active.position <= 1} onClick={() => void movePage(-1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Переместить страницу позже" title="Переместить позже" disabled={layoutPending || !pages.some(page => (page.kind === "photo" || page.kind === "blank") && page.questionId === active.questionId && page.placement === active.placement && page.position > active.position)} onClick={() => void movePage(1)}><ChevronRight size={18} /></button><button className="book-page-settings-heading__delete" type="button" aria-label="Удалить страницу" title="Удалить страницу" disabled={layoutPending} onClick={() => void deleteBlankPage()}><Trash2 size={17} /></button></div></div>
        <p>Она останется пустой в готовой книге и сохранит своё место в последовательности этого вопроса.</p>
        <strong>Пустая страница</strong>
        <div className={`book-blank-page-settings__preview${book.pageBackground !== "white" ? " preview-page-background--colored" : ""}`} style={{ background: getPageBackgroundColor(book.pageBackground) }}><FilePlus2 size={28} /><span>Без текста и фотографий</span></div>
      </div> : editable?.kind === "question" ? <>
        <span className="book-inline-editor__chapter">{editable.chapter.title} · {questionIndex + 1} из {questions.length}</span>
        <label>{editable.prompt}</label>
        <RichAnswerEditor key={editable.questionId} value={editable.answer} format={editable.answerFormat} onChange={(answer, answerFormat) => { setAnswers(current => ({ ...current, [editable.questionId]: answer })); setFormats(current => ({ ...current, [editable.questionId]: answerFormat })); setSaveError(""); }} />
        <small>{editable.answer.length} символов</small>
        <div className="book-inline-editor__navigation"><button type="button" disabled={questionIndex <= 0} onClick={() => setActivePageKey(questions[questionIndex - 1].key)}>Предыдущий вопрос</button><button type="button" disabled={questionIndex >= questions.length - 1} onClick={() => setActivePageKey(questions[questionIndex + 1].key)}>Следующий вопрос</button></div>
      </> : <p>Выберите вопрос или страницу с историей, чтобы начать писать. Начальные страницы, предисловие и содержание формируются автоматически.</p>}
    </aside>
    <div className="book-editor-preview">
    <div className="book-spread-stage" ref={stageRef} aria-label={`Страница ${active.pageNumber} книги`}>
      <div className="book-spread-paper book-spread-paper--single" style={{ zoom: scale }}>
        <div key={active.key} className="book-spread-leaf is-selected">
          <div className={`preview-page preview-page--font-${book.pageFont} preview-page--question-size-${book.questionTextSize} preview-page--answer-size-${book.answerTextSize}${active.kind === "photo" ? " preview-page--photo" : ""}${active.kind === "title" ? " preview-page--title" : ""}${active.kind === "chapter" ? " preview-page--chapter" : ""}`}>{renderPage(active)}{active.kind !== "opening-blank" && active.kind !== "title" && active.kind !== "preface" && active.kind !== "contents" && active.kind !== "chapter" && active.kind !== "blank" && !(active.kind === "photo" && active.image.hideFooter) && <footer className="preview-page__footer"><p className="preview-page__chapter">{getBookFooterLabel({ pageNumber: active.pageNumber, authorName: book.author_name, bookTitle: book.title, showAuthor: book.showFooterAuthor, showTitle: book.showFooterTitle })}</p><span className="preview-page__number">{active.pageNumber}</span></footer>}</div>
          <button className="book-spread-select" type="button" aria-label={`Страница ${active.pageNumber}${active.kind === "photo" ? ". Двойное нажатие открывает кадрирование" : ""}`} aria-pressed="true" onDoubleClick={() => { if (active.kind === "photo") { setCropError(""); setCropEditor({ questionId: active.questionId, image: active.image, x: active.image.cropX, y: active.image.cropY, scale: active.image.cropScale }); } }} />
        </div>
      </div>
    </div>
    {questionSequence.length > 1 && activeQuestionPageIndex >= 0 && <nav className="book-question-page-navigation" aria-label="Перелистывание страниц текущего вопроса">
      <button type="button" aria-label="Предыдущая страница вопроса" disabled={activeQuestionPageIndex === 0} onClick={() => setActivePageKey(questionSequence[activeQuestionPageIndex - 1].key)}><ChevronLeft size={20} /></button>
      <span aria-live="polite"><strong>{activeQuestionPageIndex + 1}</strong>/{questionSequence.length}</span>
      <button type="button" aria-label="Следующая страница вопроса" disabled={activeQuestionPageIndex === questionSequence.length - 1} onClick={() => setActivePageKey(questionSequence[activeQuestionPageIndex + 1].key)}><ChevronRight size={20} /></button>
    </nav>}
    </div></div>
    <dialog ref={pageTypeDialogRef} className="book-page-type-dialog" aria-labelledby="book-page-type-title" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="book-page-type-dialog__panel">
        <header><div><p className="eyebrow">Для текущего вопроса</p><h2 id="book-page-type-title">Добавить страницу</h2></div><button type="button" aria-label="Закрыть" onClick={() => pageTypeDialogRef.current?.close()}><X size={19} /></button></header>
        <p>Фотография или пустая страница появится сразу после выбранной.</p>
        <div className="book-page-type-grid">
          <button type="button" onClick={addPhoto}><span><ImagePlus size={22} /></span><strong>Фотография</strong><small>Добавить одну или собрать цепочку из нескольких фото</small></button>
          <button type="button" disabled={layoutPending} onClick={() => void addBlankPage()}><span><FilePlus2 size={22} /></span><strong>Пустая страница</strong><small>Оставить страницу без текста и изображения</small></button>
        </div>
      </div>
    </dialog>
    <dialog ref={drawerRef} className="writer-drawer" aria-labelledby="book-questions-title" onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      <div className="writer-drawer__panel">
        <header className="writer-drawer__header"><h2 id="book-questions-title">Все вопросы</h2><button type="button" onClick={() => drawerRef.current?.close()} aria-label="Закрыть вопросы"><X size={20} /></button></header>
        <nav className="writer-outline" aria-label="Вопросы книги">
          {book.chapters.map((chapter, chapterIndex) => {
            const chapterQuestions = questions.filter(q => q.chapter.id === chapter.id);
            const expanded = expandedChapterId === chapter.id;
            return <div className="writer-outline__chapter" key={chapter.id}>
              <button type="button" className={expanded ? "writer-outline__expanded" : ""} aria-expanded={expanded} onClick={() => setExpandedChapterId(expanded ? null : chapter.id)}><b>{String(chapterIndex + 1).padStart(2, "0")}</b><span><strong>{chapter.title}</strong><small>{chapterQuestions.filter(q => q.answer.trim()).length} из {chapterQuestions.length}</small></span><ChevronDown className="writer-outline__chevron" size={15} /></button>
              {expanded && <div className="writer-outline__questions">{chapterQuestions.map((q) => <button key={q.key} type="button" className={`writer-outline__question${editable?.kind === "question" && editable.questionId === q.questionId ? " writer-outline__question--active" : ""}`} aria-current={editable?.kind === "question" && editable.questionId === q.questionId ? "page" : undefined} onClick={() => { setActivePageKey(q.key); drawerRef.current?.close(); }}><span className="writer-outline__question-number">{questions.findIndex(question => question.questionId === q.questionId) + 1}</span><span className="writer-outline__question-text">{q.prompt}</span>{q.answer.trim() && <Check size={13} aria-label="Есть ответ" />}</button>)}</div>}
            </div>;
          })}
        </nav>
      </div>
    </dialog>
    {cropEditor && <dialog open className="book-crop-dialog" aria-labelledby="book-crop-title" onCancel={(event) => { event.preventDefault(); if (!cropPending) setCropEditor(null); }}>
      <div className="book-crop-dialog__panel">
        <header><div><p className="eyebrow">Ручное кадрирование</p><h2 id="book-crop-title">Настройте фотографию</h2></div><button type="button" aria-label="Закрыть" disabled={cropPending} onClick={() => setCropEditor(null)}><X size={19} /></button></header>
        <div
          className={`book-crop-viewport book-crop-viewport--${cropEditor.image.displayMode}`}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); cropDragRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: cropEditor.x, y: cropEditor.y }; }}
          onPointerMove={(event) => { const drag = cropDragRef.current; if (!drag || drag.pointerId !== event.pointerId) return; const bounds = event.currentTarget.getBoundingClientRect(); setCropEditor((current) => current ? { ...current, x: Math.max(-50, Math.min(50, drag.x + (event.clientX - drag.clientX) / bounds.width * 100)), y: Math.max(-50, Math.min(50, drag.y + (event.clientY - drag.clientY) / bounds.height * 100)) } : current); }}
          onPointerUp={(event) => { if (cropDragRef.current?.pointerId === event.pointerId) cropDragRef.current = null; }}
          onPointerCancel={() => { cropDragRef.current = null; }}
        ><div style={{ backgroundImage: `url("${cropEditor.image.signedUrl}")`, transform: `translate(${cropEditor.x}%, ${cropEditor.y}%) scale(${cropEditor.scale})` }} /><span><Move size={16} />Перетаскивайте фотографию</span></div>
        <label className="book-crop-scale"><span>Масштаб</span><input type="range" min="1" max="3" step="0.01" value={cropEditor.scale} onChange={(event) => setCropEditor({ ...cropEditor, scale: Number(event.target.value) })} /><output>{Math.round(cropEditor.scale * 100)}%</output></label>
        {cropError && <p className="book-photo-dialog__error" role="alert">{cropError}</p>}
        <footer><button type="button" disabled={cropPending} onClick={() => setCropEditor({ ...cropEditor, x: 0, y: 0, scale: 1 })}><RotateCcw size={16} />Сбросить</button><button type="button" disabled={cropPending} onClick={() => setCropEditor(null)}>Отмена</button><button type="button" disabled={cropPending} onClick={() => void saveCrop()}>{cropPending ? "Сохраняется…" : "Сохранить"}</button></footer>
      </div>
    </dialog>}
    <BookPhotoDialog
      bookId={book.id}
      page={photoSourcePage?.kind === "question" && photoDialogTarget ? { id: photoSourcePage.questionId, pageNumber: photoDialogPageNumber, prompt: photoSourcePage.prompt, image: photoDialogImage, placement: photoDialogTarget.placement, insertPosition: photoDialogTarget.insertPosition } : null}
      onClose={() => setPhotoDialogTarget(null)}
      onImageSave={(questionId, image) => {
        setImages((current) => {
          const existing = current[questionId] ?? [];
          if (existing.some((item) => item.id === image.id)) return { ...current, [questionId]: existing.map((item) => item.id === image.id ? image : item) };
          const shifted = existing.map((item) => item.placement === image.placement && item.position >= image.position ? { ...item, position: item.position + 1 } : item);
          return { ...current, [questionId]: [...shifted, image].sort((a, b) => a.position - b.position) };
        });
        setBlankPages((current) => ({ ...current, [questionId]: (current[questionId] ?? []).map((page) => page.placement === image.placement && page.position >= image.position ? { ...page, position: page.position + 1 } : page) }));
        setActivePageKey(`photo-${image.id}`);
      }}
      onImageDelete={(questionId, imageId) => {
        const deletedImage = (images[questionId] ?? []).find((image) => image.id === imageId);
        setImages((current) => ({ ...current, [questionId]: (current[questionId] ?? []).filter((image) => image.id !== imageId).map((image) => deletedImage && image.placement === deletedImage.placement && image.position > deletedImage.position ? { ...image, position: image.position - 1 } : image) }));
        if (deletedImage) setBlankPages((current) => ({ ...current, [questionId]: (current[questionId] ?? []).map((page) => page.placement === deletedImage.placement && page.position > deletedImage.position ? { ...page, position: page.position - 1 } : page) }));
        setActivePageKey(`question-${questionId}`);
      }}
    />
  </section>;
}
