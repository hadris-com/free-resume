export function createPrintHelpers({ getState, getResumePreviewElement, getUiTranslation }) {
  const PRINT_PAGE_HEIGHT = 1123;

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
    if (!page) {
      return;
    }

    page.querySelectorAll(".page-break-line").forEach((el) => el.remove());
    page.style.minHeight = "";

    const totalHeight = page.scrollHeight;
    if (totalHeight <= PRINT_PAGE_HEIGHT) {
      return;
    }

    const pageCount = Math.ceil(totalHeight / PRINT_PAGE_HEIGHT);
    page.style.minHeight = `${pageCount * PRINT_PAGE_HEIGHT}px`;

    for (let i = 1; i < pageCount; i++) {
      const line = document.createElement("div");
      line.className = "page-break-line";
      line.style.top = `${i * PRINT_PAGE_HEIGHT}px`;
      line.dataset.label = `${getUiTranslation("labels.page")} ${i + 1}`;
      page.appendChild(line);
    }
  }

  function fillPrintPages() {
    const previewElement = getResumePreviewElement();
    const page = previewElement?.querySelector(".resume-page");
    if (!page) {
      return;
    }

    const previousValue = page.style.getPropertyValue("min-height");
    const previousPriority = page.style.getPropertyPriority("min-height");
    page.dataset.printMinHeightValue = previousValue;
    page.dataset.printMinHeightPriority = previousPriority;

    const totalHeight = Math.max(page.scrollHeight, page.offsetHeight, PRINT_PAGE_HEIGHT);
    const pageCount = Math.max(1, Math.ceil(totalHeight / PRINT_PAGE_HEIGHT));
    page.style.setProperty("min-height", `${pageCount * PRINT_PAGE_HEIGHT}px`, "important");
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
