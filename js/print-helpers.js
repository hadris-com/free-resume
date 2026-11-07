import { getPageMetrics } from "./page-layout.js";

export function createPrintHelpers({ getState, getResumePreviewElement }) {
  const PRINT_PAGE_SIZE_STYLE_ID = "dynamic-print-page-size";

  function getActivePageMetrics() {
    return getPageMetrics(getState().pageSize);
  }

  function syncPrintPageSize() {
    const { printLabel } = getActivePageMetrics();
    let styleElement = document.getElementById(PRINT_PAGE_SIZE_STYLE_ID);

    if (!(styleElement instanceof HTMLStyleElement)) {
      styleElement = document.createElement("style");
      styleElement.id = PRINT_PAGE_SIZE_STYLE_ID;
      document.head.append(styleElement);
    }

    styleElement.textContent = `@page { size: ${printLabel}; margin: 0; }`;
  }

  function createResumeFilename() {
    const state = getState();
    const profileName = String(state.profile.name ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return profileName ? `${profileName}-resume` : "resume";
  }

  function createSheet(index) {
    const sheet = document.createElement("div");
    sheet.className = "paper-sheet";
    sheet.style.setProperty("--sheet-index", String(index));
    const flow = document.createElement("div");
    flow.className = "paper-sheet-flow";
    sheet.append(flow);
    return sheet;
  }

  // Each printed fragment repeats the page's padding, so the height that fills the last sheet
  // counts that padding once per sheet, and the box's own height already includes it once.
  function fillSheets(page, pageCount) {
    const { heightPx } = getActivePageMetrics();
    const style = window.getComputedStyle(page);
    const paddingBlock = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    page.dataset.printPageCount = String(pageCount);
    page.style.setProperty("min-height", `${pageCount * heightPx - (pageCount - 1) * paddingBlock}px`, "important");

    // Content pushed to a later sheet can make any fixed height spill onto one more sheet, which
    // would print as a blank page. The last sheet then keeps its natural height instead.
    if (page.getClientRects().length > pageCount) {
      page.style.setProperty("min-height", "auto", "important");
    }
  }

  /*
   * Lay the resume out on separate sheets, broken just as print breaks it. A box of columns one
   * page tall goes through the browser's own fragmentation, so entries, headings and the repeated
   * page margin behave as in the PDF. Each sheet shows one column of its own copy of the resume.
   * Print itself uses only the first copy, laid out on real pages: see print.css.
   */
  function paginatePreview() {
    const previewElement = getResumePreviewElement();
    const page = previewElement?.querySelector(".resume-page");
    if (!page) {
      return;
    }

    syncPrintPageSize();
    page.style.removeProperty("min-height");
    delete page.dataset.printPageCount;

    const firstSheet = createSheet(0);
    firstSheet.firstElementChild.append(page);
    previewElement.replaceChildren(firstSheet);

    const pageCount = Math.max(1, page.getClientRects().length);
    fillSheets(page, pageCount);

    for (let index = 1; index < pageCount; index++) {
      const sheet = createSheet(index);
      sheet.inert = true;
      sheet.firstElementChild.append(page.cloneNode(true));
      previewElement.append(sheet);
    }
  }

  function openPdfDialog() {
    const previousTitle = document.title;
    document.title = createResumeFilename();
    paginatePreview();
    window.print();
    document.title = previousTitle;
  }

  return {
    createResumeFilename,
    paginatePreview,
    openPdfDialog
  };
}
