/* eslint-disable @next/next/no-img-element -- Signed user uploads keep their natural ratio inside the printable page frame. */

import type { BookPageImage } from "@/lib/books/types";

export function BookPagePhoto({ image, pageNumber, settings = false }: { image: BookPageImage; pageNumber: number; settings?: boolean }) {
  const darkening = image.photoText.enabled ? image.photoText.darkening : 0;
  const imageFilter = `brightness(${Math.max(.3, 1 - darkening / 100)})`;
  if (settings) return <div className="book-photo-page-settings__image-frame">
    <img
      className={`book-photo-page-settings__image${image.roundedCorners ? " is-rounded" : ""}`}
      src={image.signedUrl}
      alt={`Выбранная фотография на странице ${pageNumber}`}
      style={{ filter: imageFilter, transform: `translate(${image.cropX}%, ${image.cropY}%) scale(${image.cropScale})` }}
    />
  </div>;

  return <div className="preview-photo-page__frame">
    <img
      className="preview-photo-page__image"
      src={image.signedUrl}
      alt={`Фотография на странице ${pageNumber}`}
      style={{ filter: imageFilter, transform: `translate(${image.cropX}%, ${image.cropY}%) scale(${image.cropScale})` }}
    />
  </div>;
}
