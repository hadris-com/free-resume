export function createPrintHelpers({ getState, getResumePreviewElement, getUiTranslation }) {
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

    const pageHeight = 1123;
    const totalHeight = page.scrollHeight;
    if (totalHeight <= pageHeight) {
      return;
    }

    const pageCount = Math.ceil(totalHeight / pageHeight);
    page.style.minHeight = `${pageCount * pageHeight}px`;

    for (let i = 1; i < pageCount; i++) {
      const line = document.createElement("div");
      line.className = "page-break-line";
      line.style.top = `${i * pageHeight}px`;
      line.dataset.label = `${getUiTranslation("labels.page")} ${i + 1}`;
      page.appendChild(line);
    }
  }

  function fillPrintPages() {}
  function restorePrintPages() {}

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
