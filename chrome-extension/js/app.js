import { createEditorRenderers } from "./editor-renderers.js";
import { createEventHandlers } from "./event-handlers.js";
import { createCvTranslationGetter, createUiTranslationGetter } from "./i18n.js";
import { createNotices } from "./notices.js";
import { createPersistence } from "./persistence.js";
import { getPageMetrics } from "./page-layout.js";
import { createPrintHelpers } from "./print-helpers.js";
import { createPreviewRenderers, retiredTemplates, templateCatalog } from "./preview-renderers.js";
import { createResumeNormalization, normalizeSkillLevel, skillLevels } from "./resume-normalization.js";
import { createSampleStateBuilders } from "./sample-state.js";
import { createStateSync } from "./state-sync.js";
import { createUiControls } from "./ui-controls.js";

// App-owned state (single source of truth for resume data and UI toggles).
const state = {
  uiLang: "en",
  cvLang: "en",
  template: "alpine",
  pageSize: "a4",
  theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  showSkills: false,
  showSkillLevels: false,
  showLanguageLevels: false,
  nameFontSize: 100,
  alpineLocationInHeader: false,
  collapsedSections: {},
  profile: {
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    github: ""
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  languages: []
};

// Cached DOM references used across modules.
const refs = {
  templateSelect: document.getElementById("template-select"),
  templateSelectWrapper: document.getElementById("template-select-wrapper"),
  templateSelectTrigger: document.getElementById("template-select-trigger"),
  templateSelectValue: document.getElementById("template-select-value"),
  templateSelectMenu: document.getElementById("template-select-menu"),
  themeToggle: document.getElementById("theme-toggle"),
  sampleBtn: document.getElementById("sample-btn"),
  rawFileInput: document.getElementById("raw-file-input"),
  resumePreview: document.getElementById("resume-preview"),
  firstRun: document.getElementById("first-run"),
  firstRunSample: document.getElementById("first-run-sample"),
  previewPanel: document.querySelector(".preview-panel"),
  workspace: document.getElementById("workspace"),
  saveStatusText: document.getElementById("save-status-text"),
  experienceList: document.getElementById("experience-list"),
  educationList: document.getElementById("education-list"),
  skillsList: document.getElementById("skills-list"),
  languagesList: document.getElementById("languages-list"),
  moreMenu: document.getElementById("more-menu"),
  moreMenuTrigger: document.getElementById("more-menu-trigger"),
  moreMenuList: document.getElementById("more-menu-list"),
  editorPanel: document.querySelector(".editor-panel"),
  nameSizeSlider: document.getElementById("name-size-slider"),
  nameSizeOutput: document.getElementById("name-size-output"),
  privacyModal: document.getElementById("privacy-modal")
};

let sampleModeEnabled = false;

// The bootstrap render saves too: on a blank resume, that is not news until the user changes something.
let saveStatusEnabled = false;

// i18n getters resolve labels against the currently selected UI/CV language.
const getUiTranslation = createUiTranslationGetter(() => state.uiLang);
const getCvTranslation = createCvTranslationGetter(() => state.cvLang);

// Normalization enforces consistent resume shape before save/load/sample import.
const { sanitizeResumeState, validateResumeShape } = createResumeNormalization({
  templateCatalog,
  retiredTemplates
});

// Persistence handles localStorage draft lifecycle + raw JSON import/export.
const { parseRawResumePayload, loadDraftFromLocalStorage, saveDraftToLocalStorage: persistDraftToLocalStorage, downloadRawResume } = createPersistence({
  getState: () => state,
  sanitizeResumeState,
  validateResumeShape
});

// Sample builders generate blank/sample states using the same sanitizer.
const { buildSampleResumeState, buildEmptyResumeState } = createSampleStateBuilders({
  getState: () => state,
  sanitizeResumeState
});

// UI controls apply visual/UI-only effects (theme, i18n text, panel sizing, toggles).
const uiControls = createUiControls({
  state,
  refs,
  getUiTranslation
});

// State sync maps state <-> static form controls and imported payload updates.
const { syncStaticInputsFromState, applyImportedState, syncSampleButtonState } = createStateSync({
  state,
  refs,
  uiControls,
  getSampleModeEnabled: () => sampleModeEnabled,
  isResumeBlank: () => isResumeBlank()
});

// Print helpers lay the preview out on sheets and open the print dialog.
const { paginatePreview, openPdfDialog } = createPrintHelpers({
  getState: () => state,
  getResumePreviewElement: () => refs.resumePreview
});

// Preview renderers generate template HTML and compute preview-related flags/classes.
const { renderTemplate, getTemplateClasses, isResumeBlank } = createPreviewRenderers({
  getState: () => state,
  getUiTranslation,
  getCvTranslation,
  normalizeSkillLevel
});

// Notices show transient messages, with an optional Undo action.
const { showNotice } = createNotices({ getUiTranslation });

// Editor renderers generate repeatable editor sections (experience, education, etc.).
const { renderDynamicEditors } = createEditorRenderers({
  state,
  refs,
  getUiTranslation,
  skillLevels,
  normalizeSkillLevel
});

// Sample content is never persisted: a reload after loading the sample returns to the user's own draft.
function saveDraftToLocalStorage() {
  if (sampleModeEnabled) {
    uiControls.setSaveStatusVisible(false);
    return;
  }

  const saved = persistDraftToLocalStorage();
  uiControls.setSaveStatusVisible(saved && saveStatusEnabled);
}

// Rebuild preview DOM from current state and persist draft after every render.
function renderPreview() {
  const { widthPx, heightPx, fillSlackPx = 0 } = getPageMetrics(state.pageSize);
  const previewScrollTop = refs.previewPanel.scrollTop;

  refs.resumePreview.className = `resume-preview ${getTemplateClasses(state.template)}`;
  refs.resumePreview.innerHTML = renderTemplate(state.template);
  refs.resumePreview.style.setProperty("--page-width", `${widthPx}px`);
  refs.resumePreview.style.setProperty("--page-height", `${heightPx}px`);
  refs.resumePreview.style.setProperty("--flow-height", `${heightPx - fillSlackPx}px`);
  refs.resumePreview.style.setProperty("--name-font-scale", state.nameFontSize / 100);
  paginatePreview();
  // Rebuilding the sheets collapses the panel for a moment, which would drop its scroll position.
  refs.previewPanel.scrollTop = previewScrollTop;
  uiControls.syncCollapsibleHeights();
  uiControls.syncPaperFit();
  saveDraftToLocalStorage();
  syncSampleButtonState();
  uiControls.setFirstRunVisible(isResumeBlank() && !sampleModeEnabled);
}

// Event handlers orchestrate user actions across all modules.
const { handleRawFileChange, handleInput, handleClick } = createEventHandlers({
  state,
  refs,
  parseRawResumePayload,
  getUiTranslation,
  applyImportedState,
  syncStaticInputsFromState,
  uiControls,
  renderDynamicEditors,
  renderPreview,
  syncSampleButtonState,
  getSampleModeEnabled: () => sampleModeEnabled,
  setSampleModeEnabled: (value) => {
    sampleModeEnabled = value;
  },
  buildEmptyResumeState,
  buildSampleResumeState,
  downloadRawResume,
  saveDraftToLocalStorage,
  openPdfDialog,
  showNotice
});

// App bootstrap: load draft, sync UI, render once, then attach listeners.
function init() {
  const { applyTheme, applyI18n, syncSectionToggles, syncCollapsibleHeights, syncPaperFit } = uiControls;

  const savedDraft = loadDraftFromLocalStorage();
  if (savedDraft) {
    applyImportedState(savedDraft);
  }
  saveStatusEnabled = !isResumeBlank();

  syncStaticInputsFromState();

  applyTheme();
  applyI18n();
  renderDynamicEditors();
  renderPreview();
  syncSampleButtonState();
  syncSectionToggles();
  saveStatusEnabled = true;

  refs.rawFileInput?.addEventListener("change", handleRawFileChange);
  refs.editorPanel.addEventListener("input", handleInput);
  refs.editorPanel.addEventListener("change", handleInput);
  window.addEventListener("resize", syncCollapsibleHeights);
  document.addEventListener("click", handleClick);
  refs.moreMenu?.addEventListener("keydown", uiControls.handleMoreMenuKeydown);
  refs.templateSelectWrapper?.addEventListener("keydown", uiControls.handleTemplateSelectKeydown);
  // A late font can change where the pages break. A template's own fonts only start loading once
  // it's shown, which can be after `ready`, so paginate again whenever fonts finish loading.
  const repaginate = () => {
    const previewScrollTop = refs.previewPanel.scrollTop;
    paginatePreview();
    refs.previewPanel.scrollTop = previewScrollTop;
  };
  document.fonts?.ready.then(repaginate);
  document.fonts?.addEventListener?.("loadingdone", repaginate);

  if ("ResizeObserver" in window && refs.previewPanel) {
    new ResizeObserver(syncPaperFit).observe(refs.previewPanel);
  }

  refs.privacyModal?.addEventListener("click", (event) => {
    if (event.target === refs.privacyModal) {
      refs.privacyModal.close();
      try { localStorage.setItem("free-resume:privacy-ack", "1"); } catch {}
    }
  });

}

init();
