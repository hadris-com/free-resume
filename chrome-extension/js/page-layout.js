export const pageSizeCatalog = {
  a4: {
    widthPx: 794,
    heightPx: 1123,
    printLabel: "A4"
  },
  letter: {
    widthPx: 816,
    heightPx: 1056,
    printLabel: "Letter"
  }
};

export function resolvePageSize(pageSize) {
  return Object.prototype.hasOwnProperty.call(pageSizeCatalog, pageSize) ? pageSize : "a4";
}

/*
 * WebKit (Safari, and every browser on iOS) prints at its own scale: it lays a page out 1.25 times
 * the paper's size in points, so an A4 sheet is 744 x 1052 CSS pixels there instead of 794 x 1123.
 * The preview uses the same sheet, so in those browsers it breaks lines and pages as the PDF does.
 * The printed page holds a fraction of a pixel less than that, so a line that just reaches the
 * sheet's foot moves to the next page in print: the preview's sheets are `fillSlackPx` shorter.
 * `font: -apple-system-body` is only supported by WebKit.
 */
const webkitPageSizes = {
  a4: { widthPx: 744, heightPx: 1052, fillSlackPx: 4 },
  letter: { widthPx: 765, heightPx: 990, fillSlackPx: 4 }
};

export const printsAtWebKitScale = typeof CSS !== "undefined" && CSS.supports?.("font", "-apple-system-body") === true;

export function getPageMetrics(pageSize) {
  const resolved = resolvePageSize(pageSize);
  const metrics = pageSizeCatalog[resolved];
  return printsAtWebKitScale ? { ...metrics, ...webkitPageSizes[resolved] } : metrics;
}
