/* eslint-disable @next/next/no-img-element -- Signed user uploads keep their natural ratio inside the printable page frame. */

import type { BookPageImage } from "@/lib/books/types";
import { getBookPhotoSlots } from "@/lib/books/photo-collage";

export function BookPagePhoto({ image, pageNumber }: { image: BookPageImage; pageNumber: number }) {
  const darkening = image.photoText.enabled ? image.photoText.darkening : 0;
  const imageFilter = `brightness(${Math.max(.3, 1 - darkening / 100)})`;
  const slots = getBookPhotoSlots(image);
  const layout = image.collageLayout ?? "single";
  return <div className={`preview-photo-page__frame book-photo-collage book-photo-collage--${layout}`}>
    {slots.map((slot) => <span className="book-photo-collage__slot" key={slot.id}><img
      className="preview-photo-page__image"
      src={slot.signedUrl}
      alt={`Фотография ${slot.slot} на странице ${pageNumber}`}
      style={{ filter: imageFilter, transform: `translate(${slot.cropX}%, ${slot.cropY}%) scale(${slot.cropScale})` }}
    /></span>)}
  </div>;
}
