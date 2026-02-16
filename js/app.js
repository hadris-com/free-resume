import { createCvTranslationGetter, createUiTranslationGetter } from "./i18n.js";
import { createEditorRenderers } from "./editor-renderers.js";
import { createEventHandlers } from "./event-handlers.js";
import { createPersistence } from "./persistence.js";
import { createPreviewRenderers, templateCatalog } from "./preview-renderers.js";
import { createResumeNormalization, normalizeSkillLevel, skillLevels } from "./resume-normalization.js";
import { createSampleStateBuilders } from "./sample-state.js";
import { createStateSync } from "./state-sync.js";
import { createUiControls } from "./ui-controls.js";

// State and DOM references
const state = {
  uiLang: "en",
  cvLang: "en",
  template: "alpine",
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

const refs = {
  templateSelect: document.getElementById("template-select"),
  templateSelectWrapper: document.getElementById("template-select-wrapper"),
  templateSelectTrigger: document.getElementById("template-select-trigger"),
  templateSelectValue: document.getElementById("template-select-value"),
  templateSelectMenu: document.getElementById("template-select-menu"),
  themeToggle: document.getElementById("theme-toggle"),
  downloadRawBtn: document.getElementById("download-raw-btn"),
  uploadRawBtn: document.getElementById("upload-raw-btn"),
  sampleBtn: document.getElementById("sample-btn"),
  rawFileInput: document.getElementById("raw-file-input"),
  resumePreview: document.getElementById("resume-preview"),
  previewPanel: document.querySelector(".preview-panel"),
  experienceList: document.getElementById("experience-list"),
  educationList: document.getElementById("education-list"),
  skillsList: document.getElementById("skills-list"),
  languagesList: document.getElementById("languages-list"),
  blankPill: document.getElementById("blank-pill"),
  editorPanel: document.querySelector(".editor-panel"),
  nameSizeSlider: document.getElementById("name-size-slider"),
  nameSizeOutput: document.getElementById("name-size-output"),
  privacyModal: document.getElementById("privacy-modal")
};

let sampleModeEnabled = false;

// Shared utilities
const getUiTranslation = createUiTranslationGetter(() => state.uiLang);
const getCvTranslation = createCvTranslationGetter(() => state.cvLang);

function createResumeFilename() {
  const profileName = String(state.profile.name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return profileName ? `${profileName}-resume` : "resume";
}

function openPdfDialog() {
  const previousTitle = document.title;
  document.title = createResumeFilename();
  fillPrintPages();
  window.print();
  document.title = previousTitle;
  restorePrintPages();
}

function fillPrintPages() {}
function restorePrintPages() {}

const { renderTemplate, getTemplateClasses, isResumeBlank } = createPreviewRenderers({
  getState: () => state,
  getUiTranslation,
  getCvTranslation,
  normalizeSkillLevel
});

const { sanitizeResumeState } = createResumeNormalization({
  templateCatalog
});

// Draft persistence and raw import/export
const { parseRawResumePayload, loadDraftFromLocalStorage, saveDraftToLocalStorage, downloadRawResume } = createPersistence({
  getState: () => state,
  sanitizeResumeState
});

const { buildSampleResumeState, buildEmptyResumeState } = createSampleStateBuilders({
  getState: () => state,
  sanitizeResumeState
});

// Editor rendering
const { renderDynamicEditors } = createEditorRenderers({
  state,
  refs,
  getUiTranslation,
  skillLevels,
  normalizeSkillLevel
});

// UI synchronization and layout helpers
const uiControls = createUiControls({
  state,
  refs,
  getUiTranslation
});

const { syncStaticInputsFromState, applyImportedState, syncSampleButtonState } = createStateSync({
  state,
  refs,
  uiControls,
  getSampleModeEnabled: () => sampleModeEnabled
});

function renderPreview() {
  refs.resumePreview.className = `resume-preview ${getTemplateClasses(state.template)}`;
  refs.resumePreview.innerHTML = renderTemplate(state.template);
  refs.resumePreview.style.setProperty("--name-font-scale", state.nameFontSize / 100);
  refs.blankPill.hidden = !isResumeBlank();
  insertPageBreakMarkers();
  uiControls.syncEditorPanelHeight();
  saveDraftToLocalStorage();
}

function insertPageBreakMarkers() {
  const page = refs.resumePreview.querySelector(".resume-page");
  if (!page) return;

  page.querySelectorAll(".page-break-line").forEach((el) => el.remove());
  page.style.minHeight = "";

  const pageHeight = 1123;
  const totalHeight = page.scrollHeight;
  if (totalHeight <= pageHeight) return;

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

// Event handlers
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
  openPdfDialog
});

// App bootstrap
function init() {
  const { applyTheme, applyI18n, syncSectionToggles, syncEditorPanelHeight } = uiControls;

  const savedDraft = loadDraftFromLocalStorage();
  if (savedDraft) {
    applyImportedState(savedDraft);
  }

  syncStaticInputsFromState();

  applyTheme();
  applyI18n();
  renderDynamicEditors();
  renderPreview();
  syncSampleButtonState();
  syncSectionToggles();

  refs.rawFileInput?.addEventListener("change", handleRawFileChange);
  refs.editorPanel.addEventListener("input", handleInput);
  refs.editorPanel.addEventListener("change", handleInput);
  window.addEventListener("resize", syncEditorPanelHeight);
  window.addEventListener("beforeprint", fillPrintPages);
  window.addEventListener("afterprint", restorePrintPages);
  document.addEventListener("click", handleClick);

  if ("ResizeObserver" in window && refs.previewPanel) {
    const previewPanelObserver = new ResizeObserver(() => {
      syncEditorPanelHeight();
    });
    previewPanelObserver.observe(refs.previewPanel);
  }

  refs.privacyModal?.addEventListener("click", (event) => {
    if (event.target === refs.privacyModal) {
      refs.privacyModal.close();
      try { localStorage.setItem("free-resume:privacy-ack", "1"); } catch {}
    }
  });

}

init();
