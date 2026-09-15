export function fitRenderedCoverTitlePanel(panel: HTMLElement) {
  if (!panel.closest(".colored-cover-spread--template")) return;
  const side = panel.parentElement;
  if (!side?.clientHeight) return;
  const maximumHeight = side.clientHeight * .8;
  panel.style.setProperty("--cover-panel-text-scale", "1");
  if (panel.offsetHeight <= maximumHeight) return;

  // Grow naturally first; reduce text only when the panel would leave the cover.
  let lower = .5;
  let upper = 1;
  for (let index = 0; index < 10; index++) {
    const middle = (lower + upper) / 2;
    panel.style.setProperty("--cover-panel-text-scale", String(middle));
    if (panel.offsetHeight <= maximumHeight) lower = middle;
    else upper = middle;
  }
  panel.style.setProperty("--cover-panel-text-scale", String(lower));
}
