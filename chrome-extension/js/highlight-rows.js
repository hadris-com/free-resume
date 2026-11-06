import { escapeAttr, escapeHtml } from "./utils.js";

// Highlights are stored as one newline-separated string; the editor shows one row per non-empty line.
export function splitBullets(value) {
  return String(value ?? "")
    .split("\n")
    .filter((line) => line.trim() !== "");
}

// Markup for one editable highlight row. `number` is 1-based, for the screen-reader label.
export function highlightRowMarkup(getUiTranslation, text, number) {
  const label = `${getUiTranslation("fields.highlightItem")} ${number}`;
  const remove = getUiTranslation("actions.removeHighlight");
  return `<div class="highlight-row"><textarea rows="1" class="highlight-input" data-highlight aria-label="${escapeAttr(label)}" placeholder="${escapeAttr(getUiTranslation("placeholders.highlight"))}">${escapeHtml(text)}</textarea><button type="button" class="highlight-remove" data-action="remove-highlight" aria-label="${escapeAttr(remove)}" title="${escapeAttr(remove)}"><span aria-hidden="true">&times;</span></button></div>`;
}

export function autosizeHighlight(textarea) {
  textarea.style.height = "auto";
  // A hidden panel measures 0; keep the natural one-row height then.
  if (textarea.scrollHeight > 0) {
    const border = textarea.offsetHeight - textarea.clientHeight;
    textarea.style.height = `${textarea.scrollHeight + border}px`;
  }
}
