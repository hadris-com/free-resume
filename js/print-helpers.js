import { getPageMetrics } from "./page-layout.js";

export function createPrintHelpers({ getState, getResumePreviewElement, getUiTranslation }) {
  const PRINT_PAGE_SIZE_STYLE_ID = "dynamic-print-page-size";
  const PAGE_HEIGHT_ROUNDING_EPSILON = 1;

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

  function insertPageBreakMarkers() {
    const previewElement = getResumePreviewElement();
    const page = previewElement?.querySelector(".resume-page");
    const { heightPx } = getActivePageMetrics();
    if (!page) {
      return;
    }

    syncPrintPageSize();
    page.querySelectorAll(".page-break-line").forEach((el) => el.remove());
    page.style.minHeight = "";

    const totalHeight = page.scrollHeight;
    if (totalHeight <= heightPx) {
      return;
    }

    const pageCount = Math.ceil(Math.max(heightPx, totalHeight - PAGE_HEIGHT_ROUNDING_EPSILON) / heightPx);
    page.style.minHeight = `${pageCount * heightPx}px`;

    for (let i = 1; i < pageCount; i++) {
      const line = document.createElement("div");
      line.className = "page-break-line";
      line.style.top = `${i * heightPx}px`;
      line.dataset.label = `${getUiTranslation("labels.page")} ${i + 1}`;
      page.appendChild(line);
    }
  }

  function fillPrintPages() {
    const previewElement = getResumePreviewElement();
    const page = previewElement?.querySelector(".resume-page");
    const { heightPx } = getActivePageMetrics();
    if (!page) {
      return;
    }

    syncPrintPageSize();
    const previousValue = page.style.getPropertyValue("min-height");
    const previousPriority = page.style.getPropertyPriority("min-height");
    page.dataset.printMinHeightValue = previousValue;
    page.dataset.printMinHeightPriority = previousPriority;

    // Measure the content at its natural height instead of reusing the
    // preview-only min-height that was added for on-screen page markers.
    page.style.removeProperty("min-height");

    const totalHeight = Math.max(page.scrollHeight, page.offsetHeight, heightPx);
    const pageCount = Math.max(
      1,
      Math.ceil(Math.max(heightPx, totalHeight - PAGE_HEIGHT_ROUNDING_EPSILON) / heightPx)
    );
    page.dataset.printPageCount = String(pageCount);
    page.style.setProperty("min-height", `${pageCount * heightPx}px`, "important");
  }

  function restorePrintPages() {
    const previewElement = getResumePreviewElement();
    const page = previewElement?.querySelector(".resume-page");
    if (!page) {
      return;
    }

    const previousValue = page.dataset.printMinHeightValue ?? "";
    const previousPriority = page.dataset.printMinHeightPriority ?? "";

    if (previousValue) {
      page.style.setProperty("min-height", previousValue, previousPriority);
    } else {
      page.style.removeProperty("min-height");
    }

    delete page.dataset.printMinHeightValue;
    delete page.dataset.printMinHeightPriority;
    delete page.dataset.printPageCount;
  }

  function openPdfDialog() {
    const previousTitle = document.title;
    document.title = createResumeFilename();
    fillPrintPages();
    window.print();
    document.title = previousTitle;
    restorePrintPages();
  }

  return {
    createResumeFilename,
    insertPageBreakMarkers,
    fillPrintPages,
    restorePrintPages,
    openPdfDialog
  };
}
