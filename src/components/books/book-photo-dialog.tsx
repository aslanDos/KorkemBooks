"use client";

import { useEffect, useRef, useState } from "react";
import { Columns2, Grid2X2, ImagePlus, LoaderCircle, Rows2, Trash2, Upload, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_BOOK_PHOTO_TEXT, type BookCollageImage, type BookPageImage, type BookPhotoLayout } from "@/lib/books/types";
import { BOOK_PHOTO_LAYOUTS, getBookPhotoSlots, getPhotoLayoutSlotCount } from "@/lib/books/photo-collage";
import { prepareImageUpload, SUPPORTED_IMAGE_INPUT, SUPPORTED_IMAGE_TYPES } from "@/lib/books/image-upload";
import { deleteBookPageImageAction, refreshBookProgressAction } from "@/app/dashboard/books/page-actions";

const MAX_FILE_SIZE = 6 * 1024 * 1024;

type PhotoDialogPage = {
  id: string;
  pageNumber: number;
  prompt: string;
  image: BookPageImage | null;
  placement: BookPageImage["placement"];
  insertPosition?: number;
  targetSlot?: number;
  requestedLayout?: BookPhotoLayout;
};

type SlotDraft = { file: File; previewUrl: string };
type UploadedPhoto = { id: string; slot: number; storagePath: string; mimeType: string; sizeBytes: number; signedUrl: string };

const layoutIcons = { single: ImagePlus, two_columns: Columns2, two_rows: Rows2, four_grid: Grid2X2 } as const;

export function BookPhotoDialog({ bookId, defaultRoundedCorners, defaultHideFooter, page, onClose, onImageSave, onImageDelete }: {
  bookId: string;
  defaultRoundedCorners: boolean;
  defaultHideFooter: boolean;
  page: PhotoDialogPage | null;
  onClose: () => void;
  onImageSave: (questionId: string, image: BookPageImage) => void;
  onImageDelete: (questionId: string, imageId: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [layout, setLayout] = useState<BookPhotoLayout>("single");
  const [drafts, setDrafts] = useState<Record<number, SlotDraft>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [convertingSlots, setConvertingSlots] = useState<Set<number>>(new Set());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (page && dialog && !dialog.open) {
      setLayout(page.requestedLayout ?? page.image?.collageLayout ?? "single");
      dialog.showModal();
    }
    if (!page && dialog?.open) dialog.close();
  }, [page]);

  function clearDrafts() {
    Object.values(drafts).forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
    setDrafts({});
  }

  function resetAndClose() {
    if (pending) return;
    clearDrafts();
    setLayout("single");
    setError("");
    onClose();
  }

  function chooseLayout(nextLayout: BookPhotoLayout) {
    clearDrafts();
    setLayout(nextLayout);
    setError("");
  }

  async function acceptFile(slot: number, nextFile?: File) {
    setError("");
    if (!nextFile) return;
    if (nextFile.size > MAX_FILE_SIZE) { setError("Каждый файл должен быть не больше 6 МБ."); return; }
    if (!nextFile.size) { setError("Файл фотографии пуст."); return; }
    setConvertingSlots((current) => new Set(current).add(slot));
    try {
      const preparedFile = await prepareImageUpload(nextFile);
      if (!SUPPORTED_IMAGE_TYPES.has(preparedFile.type)) throw new Error("Выберите фотографию в формате HEIC, JPEG, PNG или WebP.");
      if (preparedFile.size > MAX_FILE_SIZE) throw new Error("После обработки фотография превышает 6 МБ.");
      setDrafts((current) => {
        if (current[slot]) URL.revokeObjectURL(current[slot].previewUrl);
        return { ...current, [slot]: { file: preparedFile, previewUrl: URL.createObjectURL(preparedFile) } };
      });
    } catch (conversionError) {
      setError(conversionError instanceof Error ? conversionError.message : "Не удалось обработать фотографию.");
    } finally {
      setConvertingSlots((current) => { const next = new Set(current); next.delete(slot); return next; });
    }
  }

  async function uploadFile(slot: number, draft: SlotDraft, userId: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !page) throw new Error("Supabase не настроен.");
    const extension = draft.file.type === "image/png" ? "png" : draft.file.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${userId}/${bookId}/${page.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("book-images").upload(storagePath, draft.file, { contentType: draft.file.type, cacheControl: "3600", upsert: false });
    if (uploadError) throw new Error("Не удалось загрузить одну из фотографий.");
    const { data: signed, error: signedError } = await supabase.storage.from("book-images").createSignedUrl(storagePath, 3600);
    if (signedError || !signed?.signedUrl) {
      await supabase.storage.from("book-images").remove([storagePath]);
      throw new Error("Фотография загружена, но не удалось открыть предпросмотр.");
    }
    return { id: crypto.randomUUID(), slot, storagePath, mimeType: draft.file.type, sizeBytes: draft.file.size, signedUrl: signed.signedUrl } satisfies UploadedPhoto;
  }

  async function uploadPhotos() {
    if (!page || pending) return;
    const currentSlotCount = page.image ? getPhotoLayoutSlotCount(page.image.collageLayout) : 0;
    const targetSlots = page.image && page.requestedLayout
      ? Array.from({ length: Math.max(0, getPhotoLayoutSlotCount(page.requestedLayout) - currentSlotCount) }, (_, index) => currentSlotCount + index + 1)
      : page.image ? [page.targetSlot ?? 1] : Array.from({ length: getPhotoLayoutSlotCount(layout) }, (_, index) => index + 1);
    if (targetSlots.some((slot) => !drafts[slot])) { setError(targetSlots.length > 1 ? "Добавьте фотографию в каждый блок коллажа." : "Выберите фотографию."); return; }
    setPending(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("Supabase не настроен."); setPending(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Сессия истекла. Войдите снова."); setPending(false); return; }

    const uploaded: UploadedPhoto[] = [];
    try {
      for (const slot of targetSlots) uploaded.push(await uploadFile(slot, drafts[slot], user.id));
      if (page.image && page.requestedLayout) await changeLayout(page.image, page.requestedLayout, uploaded);
      else if (page.image) await replaceSlot(page.image, page.targetSlot ?? 1, uploaded[0]);
      else await createPhotoPage(uploaded, user.id);
      clearDrafts();
      onClose();
    } catch (uploadFailure) {
      if (uploaded.length) await supabase.storage.from("book-images").remove(uploaded.map((item) => item.storagePath));
      setError(uploadFailure instanceof Error ? uploadFailure.message : "Не удалось сохранить фотографии.");
    } finally { setPending(false); }
  }

  async function createPhotoPage(uploaded: UploadedPhoto[], userId: string) {
    if (!page) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase не настроен.");
    const primary = uploaded[0];
    const metadataResult = await supabase.rpc("append_book_page_image", { target_book_id: bookId, target_question_id: page.id, target_owner_id: userId, target_storage_path: primary.storagePath, target_mime_type: primary.mimeType, target_size_bytes: primary.sizeBytes }).single();
    const row = metadataResult.data as { id: string; position: number } | null;
    if (metadataResult.error || !row) throw new Error("Фотографии загружены, но не удалось создать страницу.");

    const collageImages = uploaded.slice(1).map(toCollageImage);
    const { error: collageError } = await supabase.from("book_page_images").update({ collage_layout: layout, collage_images: serializeCollageImages(collageImages) }).eq("id", row.id);
    if (collageError) { await supabase.rpc("delete_book_page_image", { target_image_id: row.id }); throw new Error("Не удалось сохранить макет коллажа."); }
    const placementResult = await supabase.rpc("place_book_question_photo", { target_image_id: row.id, target_placement: page.placement, target_position: page.insertPosition ?? null }).single();
    const placedPage = placementResult.data as { id: string; position: number } | null;
    if (placementResult.error || !placedPage) { await supabase.rpc("delete_book_page_image", { target_image_id: row.id }); throw new Error("Не удалось выбрать место для новой страницы."); }
    await refreshBookProgressAction(bookId);
    onImageSave(page.id, {
      id: row.id, pageId: placedPage.id, storagePath: primary.storagePath, signedUrl: primary.signedUrl, mimeType: primary.mimeType, sizeBytes: primary.sizeBytes,
      displayMode: "contain", pageBackground: "burgundy", roundedCorners: defaultRoundedCorners, hideFooter: defaultHideFooter, photoText: { ...DEFAULT_BOOK_PHOTO_TEXT },
      placement: page.placement, cropX: 0, cropY: 0, cropScale: 1, collageLayout: layout, collageImages, position: placedPage.position,
    });
  }

  async function replaceSlot(image: BookPageImage, slot: number, uploaded: UploadedPhoto) {
    if (!page) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase не настроен.");
    let nextImage = image;
    let oldPath = image.storagePath;
    if (slot === 1) {
      const { error: updateError } = await supabase.from("book_page_images").update({ storage_path: uploaded.storagePath, mime_type: uploaded.mimeType, size_bytes: uploaded.sizeBytes }).eq("id", image.id);
      if (updateError) throw new Error("Не удалось заменить фотографию.");
      nextImage = { ...image, storagePath: uploaded.storagePath, signedUrl: uploaded.signedUrl, mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes };
    } else {
      const previous = image.collageImages.find((item) => item.slot === slot);
      if (!previous) throw new Error("Фотография коллажа не найдена.");
      oldPath = previous.storagePath;
      const replacement = toCollageImage(uploaded);
      const collageImages = image.collageImages.map((item) => item.slot === slot ? replacement : item);
      const { error: updateError } = await supabase.from("book_page_images").update({ collage_images: serializeCollageImages(collageImages) }).eq("id", image.id);
      if (updateError) throw new Error("Не удалось заменить фотографию коллажа.");
      nextImage = { ...image, collageImages };
    }
    await supabase.storage.from("book-images").remove([oldPath]);
    onImageSave(page.id, nextImage);
  }

  async function changeLayout(image: BookPageImage, requestedLayout: BookPhotoLayout, uploaded: UploadedPhoto[]) {
    if (!page) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase не настроен.");
    const requiredChildren = getPhotoLayoutSlotCount(requestedLayout) - 1;
    const added = uploaded.map(toCollageImage);
    const combined = [...image.collageImages, ...added].sort((a, b) => a.slot - b.slot);
    const collageImages = combined.slice(0, requiredChildren);
    const removed = combined.slice(requiredChildren);
    const { error: updateError } = await supabase.from("book_page_images").update({ collage_layout: requestedLayout, collage_images: serializeCollageImages(collageImages) }).eq("id", image.id);
    if (updateError) throw new Error("Не удалось изменить макет коллажа.");
    if (removed.length) await supabase.storage.from("book-images").remove(removed.map((item) => item.storagePath));
    onImageSave(page.id, { ...image, collageLayout: requestedLayout, collageImages });
  }

  async function deletePhotoPage() {
    if (!page?.image || pending) return;
    setPending(true);
    setError("");
    const result = await deleteBookPageImageAction({ bookId, imageId: page.image.id });
    if (result.error) { setError("Не удалось удалить фотостраницу."); setPending(false); return; }
    onImageDelete(page.id, page.image.id);
    setPending(false);
    onClose();
  }

  const existingSlots = page?.image ? getBookPhotoSlots(page.image) : [];
  const currentSlotCount = page?.image ? getPhotoLayoutSlotCount(page.image.collageLayout) : 0;
  const visibleSlots = page?.image && page.requestedLayout
    ? Array.from({ length: Math.max(0, getPhotoLayoutSlotCount(page.requestedLayout) - currentSlotCount) }, (_, index) => currentSlotCount + index + 1)
    : page?.image ? [page.targetSlot ?? 1] : Array.from({ length: getPhotoLayoutSlotCount(layout) }, (_, index) => index + 1);
  const canSave = !convertingSlots.size && visibleSlots.every((slot) => drafts[slot]);
  const isLayoutChange = Boolean(page?.image && page.requestedLayout);
  const removesPhotos = Boolean(page?.image && page.requestedLayout && getPhotoLayoutSlotCount(page.requestedLayout) < currentSlotCount);

  return <dialog ref={dialogRef} className="book-photo-dialog" onCancel={(event) => { event.preventDefault(); resetAndClose(); }}>
    <div className="book-photo-dialog__panel">
      <header><div><p className="eyebrow">Страница {page?.pageNumber}</p><h2>{isLayoutChange ? "Изменить макет коллажа?" : page?.image ? `Изменить фото ${page.targetSlot ?? 1}` : "Добавить фотостраницу"}</h2></div><button type="button" disabled={pending} onClick={resetAndClose} aria-label="Закрыть"><X size={19} /></button></header>
      <p className="book-photo-dialog__question">{page?.prompt}</p>
      {!page?.image && <fieldset className="book-photo-layout-picker"><legend>Выберите макет</legend><div>{BOOK_PHOTO_LAYOUTS.map((option) => {
        const Icon = layoutIcons[option.value];
        return <button type="button" className={layout === option.value ? "is-selected" : ""} aria-pressed={layout === option.value} onClick={() => chooseLayout(option.value)} key={option.value}><Icon size={23} /><strong>{option.label}</strong><small>{option.description}</small></button>;
      })}</div></fieldset>}
      {isLayoutChange && <div className={`book-photo-layout-change-note${removesPhotos ? " is-warning" : ""}`}><strong>{BOOK_PHOTO_LAYOUTS.find((option) => option.value === page?.requestedLayout)?.label}</strong><p>{removesPhotos ? "Лишние фотографии будут удалены из этой страницы после подтверждения." : visibleSlots.length ? `Добавьте ещё ${visibleSlots.length} ${visibleSlots.length === 1 ? "фотографию" : "фотографии"} для нового макета.` : "Фотографии сохранятся, изменится только их расположение."}</p></div>}
      <div className={`book-photo-upload-grid book-photo-upload-grid--${page?.image && !page.requestedLayout ? "single" : layout}`}>
        {visibleSlots.map((slot) => {
          const current = existingSlots.find((item) => item.slot === slot);
          const shownUrl = drafts[slot]?.previewUrl || current?.signedUrl || "";
          return <label className={`book-photo-dropzone${shownUrl ? " book-photo-dropzone--filled" : ""}`} key={slot} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void acceptFile(slot, event.dataTransfer.files[0]); }} style={shownUrl ? { backgroundImage: `url("${shownUrl}")` } : undefined}>
            <input className="book-photo-file-input" type="file" accept={SUPPORTED_IMAGE_INPUT} disabled={pending || convertingSlots.has(slot)} onChange={(event) => { void acceptFile(slot, event.target.files?.[0]); event.target.value = ""; }} />
            {!shownUrl && <><span>{convertingSlots.has(slot) ? <LoaderCircle className="spin" size={22} /> : <ImagePlus size={22} />}</span><strong>{convertingSlots.has(slot) ? "Обрабатываем HEIC…" : `Фото ${slot}`}</strong><small>HEIC, JPEG, PNG или WebP · до 6 МБ</small></>}
            {shownUrl && <span className="book-photo-dropzone__replace"><Upload size={15} />{drafts[slot] ? "Выбрать другое" : "Заменить фото"}</span>}
          </label>;
        })}
      </div>
      {error && <p className="book-photo-dialog__error" role="alert">{error}</p>}
      <footer>
        {page?.image && !isLayoutChange && <button className="book-photo-delete" type="button" onClick={() => void deletePhotoPage()} disabled={pending}><Trash2 size={16} />Удалить страницу</button>}
        <button className="book-photo-cancel" type="button" onClick={resetAndClose} disabled={pending}>Отмена</button>
        <button className="book-photo-save" type="button" onClick={() => void uploadPhotos()} disabled={!canSave || pending}>{pending ? <LoaderCircle className="spin" size={17} /> : <Upload size={16} />}{isLayoutChange ? "Изменить макет" : page?.image ? "Заменить" : layout === "single" ? "Добавить" : "Создать коллаж"}</button>
      </footer>
    </div>
  </dialog>;
}

function toCollageImage(uploaded: UploadedPhoto): BookCollageImage {
  return { ...uploaded, cropX: 0, cropY: 0, cropScale: 1 };
}

function serializeCollageImages(images: BookCollageImage[]) {
  return images.map((image) => ({
    id: image.id,
    slot: image.slot,
    storagePath: image.storagePath,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    cropX: image.cropX,
    cropY: image.cropY,
    cropScale: image.cropScale,
  }));
}
