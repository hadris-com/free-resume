import { getPageMetrics, printsAtWebKitScale } from "./page-layout.js";

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

  // The sheets the resume spans: the columns of the flow, counted from their overall width.
  // Safari before 27 reports a box broken across columns as a single rect, so counting the page's
  // rects there found one sheet however long the resume was.
  function sheetsSpanned(flow) {
    return Math.max(1, Math.round(flow.scrollWidth / flow.offsetWidth));
  }

  // Each printed fragment repeats the page's padding, so the height that fills the last sheet
  // counts that padding once per sheet, and the box's own height already includes it once.
  function fillSheets(page, flow, pageCount) {
    // WebKit's printed page is a fraction of a pixel off the sheet, so a full-height fill there
    // keeps a few pixels short of it rather than spill onto a blank page.
    const { heightPx, fillSlackPx = 0 } = getActivePageMetrics();
    const style = window.getComputedStyle(page);
    const paddingBlock = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    page.dataset.printPageCount = String(pageCount);
    // A variable rather than an inline min-height, so print.css can drop it where print pages
    // aren't the size the preview assumes.
    page.style.setProperty("--fill-height", `${pageCount * heightPx - (pageCount - 1) * paddingBlock - fillSlackPx}px`);

    // Content pushed to a later sheet can make any fixed height spill onto one more sheet, which
    // would print as a blank page. The last sheet then keeps its natural height instead.
    if (sheetsSpanned(flow) > pageCount) {
      page.style.setProperty("--fill-height", "auto");
    }
  }

  // The padding a printed fragment of `element` would repeat at the top of a page: that of each
  // box around it that clones its decoration, up to the page.
  function repeatedPaddingTop(element, page) {
    let total = 0;
    for (let box = element.parentElement; box; box = box.parentElement) {
      const style = window.getComputedStyle(box);
      if ((style.boxDecorationBreak || style.webkitBoxDecorationBreak) === "clone") {
        total += Number.parseFloat(style.paddingTop) || 0;
      }
      if (box === page) {
        break;
      }
    }
    return total;
  }

  // An entry with bullets taller than this share of a page may break between its bullets.
  const SPLITTABLE_ENTRY_SHARE = 0.25;

  // Marks the entries that print.css lets break between bullets. Measured whole, before any of
  // them breaks, in the page's own pixels so the preview's zoom doesn't change the answer.
  function markSplittableEntries(page, flow) {
    const { widthPx, heightPx } = getActivePageMetrics();
    const scale = flow.getBoundingClientRect().width / widthPx || 1;
    const entries = [...page.querySelectorAll(".entry")];
    entries.forEach((entry) => entry.classList.remove("entry-splittable"));
    const tall = entries.filter((entry) => {
      if (entry.querySelectorAll(":scope > ul > li").length < 2) {
        return false;
      }
      const height = [...entry.getClientRects()].reduce((sum, rect) => sum + rect.height, 0) / scale;
      return height > heightPx * SPLITTABLE_ENTRY_SHARE;
    });
    tall.forEach((entry) => entry.classList.add("entry-splittable"));
  }

  // Where a gap must go so a sheet opens with `element`: before the whole entry when that
  // element is the start of a splittable entry's bullets, since the title keeps its first bullet,
  // and never inside a grid or flex box, where the gap would take a cell and shift the others.
  function sheetOpener(element, page) {
    let opener = element.matches(".entry-splittable > ul, .entry-splittable > ul > li:first-child") ? element.closest(".entry") : element;
    while (opener.parentElement && opener.parentElement !== page && /grid|flex/.test(window.getComputedStyle(opener.parentElement).display)) {
      opener = opener.parentElement;
    }
    return opener;
  }

  /*
   * WebKit (Safari, iOS) doesn't repeat a box's padding on the next page, so a later sheet would
   * start at its very top edge. Before each element that opens a later sheet, add a gap as tall as
   * the padding Chrome repeats, which also forces the break there: a column break in the preview
   * and a page break in print, so the PDF breaks where the preview does. Sheet by sheet, because
   * each gap pushes the rest of the content down.
   */
  function insertSheetGaps(page, flow) {
    const { widthPx } = getActivePageMetrics();
    const elements = [...page.querySelectorAll("*")];

    for (let sheet = 1; sheet < sheetsSpanned(flow) && sheet < 50; sheet++) {
      const origin = flow.getBoundingClientRect();
      const scale = origin.width / widthPx || 1;
      const columnWidth = widthPx * scale;
      const sheetOf = (rect) => Math.floor((rect.left - origin.left + 1) / columnWidth);
      // Every piece of content on this sheet, to tell what sits above what.
      const onSheet = [];
      for (const element of elements) {
        for (const rect of element.getClientRects()) {
          if ((rect.width || rect.height) && sheetOf(rect) === sheet) {
            onSheet.push({ element, rect });
          }
        }
      }
      const atTopOfColumn = (element, first) =>
        !onSheet.some(
          ({ element: other, rect }) =>
            other !== element &&
            !other.contains(element) &&
            !element.contains(other) &&
            rect.bottom <= first.top + 1 &&
            rect.right > first.left &&
            rect.left < first.right
        );
      const opening = elements.filter((element) => {
        const rects = element.getClientRects();
        const first = rects[0];
        if (!first || !(first.width || first.height)) {
          return false;
        }
        // Starts this sheet's column, with nothing above it...
        if (sheetOf(first) === sheet) {
          return atTopOfColumn(element, first);
        }
        // ...or should stay whole but WebKit split it onto this sheet, as it does inside a grid.
        return (
          rects.length > 1 &&
          sheetOf(first) === sheet - 1 &&
          sheetOf(rects[1]) === sheet &&
          /avoid/.test(window.getComputedStyle(element).breakInside || window.getComputedStyle(element).pageBreakInside)
        );
      });
      // The outermost element that opens the sheet in each column, not its first descendants.
      const openers = [...new Set(opening.map((element) => sheetOpener(element, page)))];
      for (const element of openers.filter((element) => !openers.some((other) => other !== element && other.contains(element)))) {
        const gap = document.createElement("div");
        gap.className = "sheet-gap";
        gap.setAttribute("aria-hidden", "true");
        gap.style.height = `${repeatedPaddingTop(element, page)}px`;
        element.before(gap);
      }
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
    page.style.removeProperty("--fill-height");
    delete page.dataset.printPageCount;

    const firstSheet = createSheet(0);
    firstSheet.firstElementChild.append(page);
    previewElement.replaceChildren(firstSheet);

    page.querySelectorAll(".sheet-gap").forEach((gap) => gap.remove());
    markSplittableEntries(page, firstSheet.firstElementChild);
    if (printsAtWebKitScale) {
      insertSheetGaps(page, firstSheet.firstElementChild);
    }

    const pageCount = sheetsSpanned(firstSheet.firstElementChild);
    fillSheets(page, firstSheet.firstElementChild, pageCount);

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
