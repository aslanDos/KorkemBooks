import { fitSpineText, SPINE_AUTHOR_LETTER_SPACING } from "./spine-text-fit";

export function fitRenderedSpine(spine: HTMLElement, tracking: number) {
  const titleSlot = spine.querySelector<HTMLElement>(".colored-cover-spine__title-slot");
  const titleText = titleSlot?.querySelector("strong");
  const coverWidth = spine.closest<HTMLElement>(".colored-cover-spread")?.clientWidth ?? 0;
  if (!titleSlot || !titleText || !coverWidth || !titleSlot.clientHeight) return;

  titleText.style.maxWidth = "none";
  const titleFit = fitSpineText({ width: titleSlot.clientWidth, height: titleSlot.clientHeight }, tracking, (scale, spacing) => {
    titleText.style.fontSize = `${coverWidth * .01969 * scale}px`;
    titleText.style.letterSpacing = `${spacing}em`;
    // Horizontal title is rotated 90°, so its measured axes swap.
    return { width: titleText.offsetHeight, height: titleText.offsetWidth };
  });
  titleText.style.fontSize = `${coverWidth * .01969 * titleFit.scale}px`;
  titleText.style.letterSpacing = `${titleFit.spacing}em`;
  titleText.style.maxWidth = `${titleSlot.clientHeight}px`;

  const authorSlot = spine.querySelector<HTMLElement>(".colored-cover-spine__author-slot");
  const authorText = spine.querySelector<HTMLElement>(".colored-cover-spine__author");
  let authorTruncated = false;
  if (authorSlot && authorText) {
    const lines = Array.from(authorText.children) as HTMLElement[];
    for (const line of lines) line.style.maxHeight = "none";
    const authorFit = fitSpineText({ width: authorSlot.clientWidth, height: authorSlot.clientHeight }, SPINE_AUTHOR_LETTER_SPACING, (scale, spacing) => {
      authorText.style.fontSize = `${coverWidth * .01313 * scale}px`;
      authorText.style.letterSpacing = `${spacing}em`;
      return { width: authorText.offsetWidth, height: authorText.offsetHeight };
    });
    authorText.style.fontSize = `${coverWidth * .01313 * authorFit.scale}px`;
    authorText.style.letterSpacing = `${authorFit.spacing}em`;
    for (const line of lines) line.style.maxHeight = `${authorSlot.clientHeight}px`;
    authorTruncated = authorFit.truncated;
  }
  return titleFit.truncated || authorTruncated;
}
