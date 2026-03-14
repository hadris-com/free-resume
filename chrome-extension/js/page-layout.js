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

export function getPageMetrics(pageSize) {
  return pageSizeCatalog[resolvePageSize(pageSize)];
}
