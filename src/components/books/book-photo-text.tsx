import type { BookPhotoText as BookPhotoTextSettings } from "@/lib/books/types";

export function BookPhotoText({ settings, displayMode }: { settings: BookPhotoTextSettings; displayMode: "contain" | "full" }) {
  if (!settings.enabled || !settings.content.trim()) return null;
  const placement = displayMode === "full" ? "overlay" : settings.placement;
  const length = settings.content.trim().length;
  const density = length > 180 ? "long" : length > 80 ? "medium" : "short";
  const darkText = settings.tone === "dark" || (settings.tone === "auto" && placement === "below");
  const shadowOpacity = settings.textShadow / 100 * .8;
  const shadowBlur = 2 + settings.textShadow / 10;
  const textShadow = settings.textShadow === 0
    ? "none"
    : `0 1px ${shadowBlur}px rgb(${darkText ? "255 255 255" : "0 0 0"} / ${shadowOpacity})`;

  return (
    <div className={`preview-photo-text preview-photo-text--${placement} preview-photo-text--${settings.position} preview-photo-text--tone-${settings.tone} preview-photo-text--${density}`}>
      <p className={`preview-photo-text__content preview-photo-text__content--size-${settings.size}`} style={{ textShadow }}>
        {settings.content}
      </p>
    </div>
  );
}

export function hasVisiblePhotoText(settings: BookPhotoTextSettings) {
  return settings.enabled && Boolean(settings.content.trim());
}
