import type { BookPhotoText as BookPhotoTextSettings } from "@/lib/books/types";

export function BookPhotoText({ settings }: { settings: BookPhotoTextSettings }) {
  if (!settings.enabled || !settings.content.trim()) return null;
  const darkText = settings.tone === "dark";
  const shadowOpacity = settings.textShadow / 100 * .8;
  const shadowBlur = 2 + settings.textShadow / 10;
  const textShadow = settings.textShadow === 0
    ? "none"
    : `0 1px ${shadowBlur}px rgb(${darkText ? "255 255 255" : "0 0 0"} / ${shadowOpacity})`;

  return (
    <div className={`preview-photo-text preview-photo-text--${settings.position} preview-photo-text--tone-${settings.tone}`}>
      <p className={`preview-photo-text__content preview-photo-text__content--size-${settings.size}`} style={{ textShadow }}>
        {settings.content}
      </p>
    </div>
  );
}
