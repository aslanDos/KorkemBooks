export function fitRenderedChapterTitle(page: HTMLElement) {
  const title = page.querySelector<HTMLElement>("h2");
  if (!title || !page.clientWidth || !page.clientHeight) return;
  title.style.setProperty("--chapter-title-scale", "1");
  const availableWidth = title.clientWidth;
  if (!availableWidth) return;
  const pageStyle = getComputedStyle(page);
  const label = page.querySelector<HTMLElement>(":scope > span");
  const labelHeight = page.classList.contains("preview-chapter-page--vertical") || !label
    ? 0 : label.offsetHeight + parseFloat(getComputedStyle(label).marginBottom);
  const availableHeight = Math.max(1, page.clientHeight - parseFloat(pageStyle.paddingTop) - parseFloat(pageStyle.paddingBottom) - labelHeight);
  const measure = document.createElement("div");
  measure.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;white-space:pre;font:inherit;letter-spacing:inherit;";
  title.append(measure);
  try {
    let longestWord = "";
    let longestWidth = 0;
    // NBSP-linked phrases are measured as one unit, just like browser wrapping.
    for (const word of (title.firstChild?.textContent ?? "").split(/[\t\n\r\f ]+/u)) {
      measure.textContent = word;
      if (measure.offsetWidth > longestWidth) {
        longestWord = word;
        longestWidth = measure.offsetWidth;
      }
    }
    measure.textContent = longestWord;
    const fits = (scale: number) => {
      title.style.setProperty("--chapter-title-scale", String(scale));
      return measure.offsetWidth <= availableWidth && title.offsetHeight <= availableHeight;
    };
    if (fits(1)) return;
    let lower = 0;
    let upper = 1;
    for (let index = 0; index < 14; index++) {
      const middle = (lower + upper) / 2;
      if (fits(middle)) lower = middle;
      else upper = middle;
    }
    title.style.setProperty("--chapter-title-scale", String(lower));
  } finally {
    measure.remove();
  }
}
