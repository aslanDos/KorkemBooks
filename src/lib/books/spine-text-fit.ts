type TextSize = { width: number; height: number };

export const SPINE_AUTHOR_LETTER_SPACING = .05;

export function fitSpineText(bounds: TextSize, requestedSpacing: number, measure: (scale: number, spacing: number) => TextSize) {
  const spacing = Math.max(0, Math.min(.5, requestedSpacing));
  const minScale = .6;
  const fits = (scale: number, tracking: number) => {
    const size = measure(scale, tracking);
    return size.width <= bounds.width && size.height <= bounds.height;
  };
  if (fits(1, spacing)) return { scale: 1, spacing, truncated: false };

  // Keep the requested tracking if a readable smaller font is sufficient.
  if (fits(minScale, spacing)) {
    let lower = minScale;
    let upper = 1;
    for (let i = 0; i < 10; i++) {
      const middle = (lower + upper) / 2;
      if (fits(middle, spacing)) lower = middle;
      else upper = middle;
    }
    return { scale: lower, spacing, truncated: false };
  }

  // At the minimum font size, reduce tracking before resorting to ellipsis.
  if (fits(minScale, 0)) {
    let lower = 0;
    let upper = spacing;
    for (let i = 0; i < 10; i++) {
      const middle = (lower + upper) / 2;
      if (fits(minScale, middle)) lower = middle;
      else upper = middle;
    }
    return { scale: minScale, spacing: lower, truncated: false };
  }
  return { scale: minScale, spacing: 0, truncated: true };
}

export function splitSpineAuthor(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length <= 2) return words;
  let split = 1;
  let smallestDifference = Infinity;
  for (let index = 1; index < words.length; index++) {
    const difference = Math.abs(words.slice(0, index).join(" ").length - words.slice(index).join(" ").length);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      split = index;
    }
  }
  return [words.slice(0, split).join(" "), words.slice(split).join(" ")];
}
