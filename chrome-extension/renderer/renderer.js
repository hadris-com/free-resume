/**
 * Renderer script — mirrors the init flow in js/app.js but without
 * the editor, event handlers, persistence, or state-sync modules.
 *
 * Reads resume state from chrome.storage.session (written by popup.js),
 * wires up the same rendering/print modules as the main app, renders the CV
 * HTML into the page, and triggers the browser print dialog.
 *
 * All JS module paths resolve to chrome-extension/js/ after running
 * sync-assets.sh from the repo root.
 */

import { createPreviewRenderers, templateCatalog } from "../js/preview-renderers.js";
import { createResumeNormalization, normalizeSkillLevel } from "../js/resume-normalization.js";
import { createCvTranslationGetter, createUiTranslationGetter } from "../js/i18n.js";
import { createPrintHelpers } from "../js/print-helpers.js";
import { getPageMetrics } from "../js/page-layout.js";

const resumeEl = document.getElementById("resume-preview");
const errorEl = document.getElementById("error-message");

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = "block";
  resumeEl.style.display = "none";
}

async function main() {
  // Read state stored by popup.js
  const result = await chrome.storage.session.get(["resumeState"]);
  const raw = result?.resumeState;

  if (!raw) {
    showError("No resume data found. Please use the extension popup on a LinkedIn profile page.");
    return;
  }

  // Sanitize + normalise (enforces field limits and valid defaults)
  const { sanitizeResumeState } = createResumeNormalization({ templateCatalog });
  const state = sanitizeResumeState(raw);

  // Wire i18n getters (same pattern as app.js)
  const getUiTranslation = createUiTranslationGetter(() => state.uiLang);
  const getCvTranslation = createCvTranslationGetter(() => state.cvLang);

  // Wire renderer
  const { renderTemplate, getTemplateClasses } = createPreviewRenderers({
    getState: () => state,
    getUiTranslation,
    getCvTranslation,
    normalizeSkillLevel
  });

  // Wire print helpers
  const { openPdfDialog } = createPrintHelpers({
    getState: () => state,
    getResumePreviewElement: () => resumeEl,
    getUiTranslation
  });

  // Apply page dimensions as CSS custom properties (same as renderPreview() in app.js)
  const { widthPx, heightPx } = getPageMetrics(state.pageSize);
  resumeEl.className = `resume-preview ${getTemplateClasses(state.template)}`;
  resumeEl.style.setProperty("--page-width", `${widthPx}px`);
  resumeEl.style.setProperty("--page-height", `${heightPx}px`);
  resumeEl.style.setProperty("--name-font-scale", String(state.nameFontSize / 100));

  // Render CV HTML
  resumeEl.innerHTML = renderTemplate(state.template);

  // Wait for fonts, then wait two animation frames for layout reflow before
  // printing — fillPrintPages() inside openPdfDialog() needs accurate heights.
  await document.fonts.ready;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      openPdfDialog();
    });
  });
}

main().catch((err) => {
  console.error("[free-resume renderer]", err);
  showError(`Rendering failed: ${err.message}`);
});
