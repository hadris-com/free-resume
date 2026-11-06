const NOTICE_DURATION_MS = 8000;

// Transient notices: a polite status region (optional Undo button) and an alert region for errors.
// DOM is only touched when a notice is first shown, never at import time.
export function createNotices({ getUiTranslation }) {
  let statusRegion = null;
  let alertRegion = null;
  let timerId = null;

  function ensureRegions() {
    if (statusRegion) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "notice-region";

    statusRegion = document.createElement("div");
    statusRegion.setAttribute("aria-live", "polite");
    alertRegion = document.createElement("div");

    wrapper.append(statusRegion, alertRegion);
    document.body.append(wrapper);
  }

  function clearNotice() {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
    if (statusRegion) {
      statusRegion.replaceChildren();
      alertRegion.replaceChildren();
    }
  }

  function showNotice({ message, isError = false, onUndo = null }) {
    ensureRegions();
    clearNotice();

    const notice = document.createElement("div");
    notice.className = `notice${isError ? " notice-error" : ""}`;
    if (isError) {
      notice.setAttribute("role", "alert");
    }

    const text = document.createElement("span");
    text.className = "notice-text";
    text.textContent = message;
    notice.append(text);

    if (onUndo) {
      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "notice-action";
      undoBtn.textContent = getUiTranslation("actions.undo");
      undoBtn.addEventListener("click", () => {
        clearNotice();
        onUndo();
      });
      notice.append(undoBtn);
    }

    (isError ? alertRegion : statusRegion).append(notice);
    timerId = window.setTimeout(clearNotice, NOTICE_DURATION_MS);
  }

  return { showNotice, clearNotice };
}
