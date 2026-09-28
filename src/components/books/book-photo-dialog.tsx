"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_BOOK_PHOTO_TEXT, type BookPageImage } from "@/lib/books/types";
import { deleteBookPageImageAction, refreshBookProgressAction } from "@/app/dashboard/books/page-actions";

const MAX_FILE_SIZE = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type PhotoDialogPage = {
  id: string;
  pageNumber: number;
  prompt: string;
  image: BookPageImage | null;
  placement: BookPageImage["placement"];
  insertPosition?: number;
};

export function BookPhotoDialog({
  bookId,
  defaultRoundedCorners,
  defaultHideFooter,
  page,
  onClose,
  onImageSave,
  onImageDelete,
}: {
  bookId: string;
  defaultRoundedCorners: boolean;
  defaultHideFooter: boolean;
  page: PhotoDialogPage | null;
  onClose: () => void;
  onImageSave: (questionId: string, image: BookPageImage) => void;
  onImageDelete: (questionId: string, imageId: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (page && dialog && !dialog.open) dialog.showModal();
    if (!page && dialog?.open) dialog.close();
  }, [page]);

  function resetAndClose() {
    if (pending) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    if (inputRef.current) inputRef.current.value = "";
    setError("");
    onClose();
  }

  function acceptFile(nextFile?: File) {
    setError("");
    if (!nextFile) return;
    if (!ALLOWED_TYPES.has(nextFile.type)) {
      setError("Выберите фотографию в формате JPEG, PNG или WebP.");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError("Файл должен быть не больше 6 МБ.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  async function uploadPhoto() {
    if (!page || !file) return;
    setPending(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase не настроен.");
      setPending(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Сессия истекла. Войдите снова.");
      setPending(false);
      return;
    }

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${user.id}/${bookId}/${page.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("book-images").upload(storagePath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      setError("Не удалось загрузить фотографию. Проверьте Storage и попробуйте снова.");
      setPending(false);
      return;
    }

    const metadataResult = page.image
      ? await supabase.from("book_page_images").update({
          storage_path: storagePath,
          mime_type: file.type,
          size_bytes: file.size,
        }).eq("id", page.image.id).select("id, position").single()
      : await supabase.rpc("append_book_page_image", {
          target_book_id: bookId,
          target_question_id: page.id,
          target_owner_id: user.id,
          target_storage_path: storagePath,
          target_mime_type: file.type,
          target_size_bytes: file.size,
        }).single();
    const row = metadataResult.data as { id: string; position: number } | null;
    const metadataError = metadataResult.error;

    if (metadataError || !row) {
      await supabase.storage.from("book-images").remove([storagePath]);
      setError("Фотография загружена, но не удалось прикрепить её к странице.");
      setPending(false);
      return;
    }

    let pageId = page.image?.pageId ?? row.id;
    let pagePosition = page.image?.position ?? row.position;
    if (!page.image) {
      const placementResult = await supabase.rpc("place_book_question_photo", {
        target_image_id: row.id,
        target_placement: page.placement,
        target_position: page.insertPosition ?? null,
      }).single();
      const placedPage = placementResult.data as { id: string; position: number } | null;
      const placementError = placementResult.error;
      if (placementError || !placedPage) {
        await supabase.rpc("delete_book_page_image", { target_image_id: row.id });
        await supabase.storage.from("book-images").remove([storagePath]);
        setError("Не удалось выбрать место для новой страницы.");
        setPending(false);
        return;
      }
      pageId = placedPage.id;
      pagePosition = placedPage.position;
    }

    const { data: signed } = await supabase.storage.from("book-images").createSignedUrl(storagePath, 3600);
    if (page.image?.storagePath) await supabase.storage.from("book-images").remove([page.image.storagePath]);
    await refreshBookProgressAction(bookId);
    onImageSave(page.id, {
      id: row.id,
      pageId,
      storagePath,
      signedUrl: signed?.signedUrl ?? previewUrl,
      mimeType: file.type,
      sizeBytes: file.size,
      displayMode: page.image?.displayMode ?? "contain",
      pageBackground: page.image?.pageBackground ?? "burgundy",
      roundedCorners: page.image?.roundedCorners ?? defaultRoundedCorners,
      hideFooter: page.image?.hideFooter ?? defaultHideFooter,
      photoText: page.image?.photoText ?? { ...DEFAULT_BOOK_PHOTO_TEXT },
      placement: page.image?.placement ?? page.placement,
      cropX: page.image?.cropX ?? 0,
      cropY: page.image?.cropY ?? 0,
      cropScale: page.image?.cropScale ?? 1,
      position: pagePosition,
    });
    setPending(false);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    if (inputRef.current) inputRef.current.value = "";
    onClose();
  }

  async function deletePhoto() {
    if (!page?.image) return;
    setPending(true);
    setError("");
    const result = await deleteBookPageImageAction({ bookId, imageId: page.image.id });
    if (result.error) {
      setError("Не удалось удалить фотографию.");
      setPending(false);
      return;
    }
    onImageDelete(page.id, page.image.id);
    setPending(false);
    onClose();
  }

  const shownUrl = previewUrl || page?.image?.signedUrl || "";

  return <dialog ref={dialogRef} className="book-photo-dialog" onCancel={(event) => { event.preventDefault(); resetAndClose(); }} onClose={() => { if (page && !pending) resetAndClose(); }}>
    <div className="book-photo-dialog__panel">
      <header>
        <div><p className="eyebrow">Страница {page?.pageNumber}</p><h2>{page?.image ? "Изменить фотографию" : "Добавить фотографию"}</h2></div>
        <button type="button" onClick={resetAndClose} aria-label="Закрыть"><X size={19} /></button>
      </header>
      <p className="book-photo-dialog__question">{page?.prompt}</p>
      <button
        className={`book-photo-dropzone${shownUrl ? " book-photo-dropzone--filled" : ""}`}
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); acceptFile(event.dataTransfer.files[0]); }}
        style={shownUrl ? { backgroundImage: `url("${shownUrl}")` } : undefined}
      >
        {!shownUrl && <><span><ImagePlus size={25} /></span><strong>Выберите или перетащите фото</strong><small>JPEG, PNG или WebP · до 6 МБ</small></>}
        {shownUrl && <span className="book-photo-dropzone__replace"><Upload size={15} />Выбрать другое фото</span>}
      </button>
      <input ref={inputRef} className="book-photo-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => acceptFile(event.target.files?.[0])} />
      {error && <p className="book-photo-dialog__error" role="alert">{error}</p>}
      <footer>
        {page?.image && <button className="book-photo-delete" type="button" onClick={deletePhoto} disabled={pending}><Trash2 size={16} />Удалить</button>}
        <button className="book-photo-cancel" type="button" onClick={resetAndClose} disabled={pending}>Отмена</button>
        <button className="book-photo-save" type="button" onClick={uploadPhoto} disabled={!file || pending}>{pending ? <LoaderCircle className="spin" size={17} /> : <Upload size={16} />}{page?.image ? "Заменить" : "Добавить"}</button>
      </footer>
    </div>
  </dialog>;
}
