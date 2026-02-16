import { createCvTranslationGetter, createUiTranslationGetter } from "./i18n.js";
import { createEditorRenderers } from "./editor-renderers.js";
import { createEventHandlers } from "./event-handlers.js";
import { createFactories } from "./factories.js";
import { createPersistence } from "./persistence.js";
import { createPreviewRenderers, templateCatalog } from "./preview-renderers.js";
import { createUiControls } from "./ui-controls.js";
import { toBoolean } from "./utils.js";

// State and DOM references
const skillLevels = ["beginner", "intermediate", "advanced", "expert"];

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

function normalizeSkillLevel(level) {
  return skillLevels.includes(level) ? level : "intermediate";
}

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

// Draft persistence and raw import/export
const {
  sanitizeResumeState,
  parseRawResumePayload,
  loadDraftFromLocalStorage,
  saveDraftToLocalStorage,
  downloadRawResume
} = createPersistence({
  getState: () => state,
  templateCatalog,
  normalizeSkillLevel
});

function syncStaticInputsFromState() {
  refs.templateSelect.value = state.template;
  syncTemplateSelectUI();

  document.querySelectorAll("[data-profile]").forEach((input) => {
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const key = input.dataset.profile;
    if (!key) {
      return;
    }

    input.value = state.profile[key] ?? "";
  });

  if (refs.nameSizeSlider) {
    refs.nameSizeSlider.value = String(state.nameFontSize);
  }
  if (refs.nameSizeOutput) {
    refs.nameSizeOutput.textContent = `${state.nameFontSize}%`;
  }

  const summaryField = refs.editorPanel.querySelector("[data-field='summary']");
  if (summaryField instanceof HTMLTextAreaElement) {
    summaryField.value = state.summary;
  }
}

function applyImportedState(nextState) {
  state.uiLang = nextState.uiLang;
  state.cvLang = nextState.cvLang;
  state.template = nextState.template;
  state.theme = nextState.theme;
  state.showSkills = nextState.showSkills || nextState.skills.length > 0;
  state.showSkillLevels = toBoolean(nextState.showSkillLevels, false);
  state.showLanguageLevels = toBoolean(nextState.showLanguageLevels, false);
  state.nameFontSize = nextState.nameFontSize ?? 100;
  state.alpineLocationInHeader = toBoolean(nextState.alpineLocationInHeader, false);
  state.profile = nextState.profile;
  state.summary = nextState.summary;
  state.experience = nextState.experience;
  state.education = nextState.education;
  state.skills = nextState.skills.map((item) => ({
    ...item,
    showLevel: state.showSkillLevels
  }));
  state.languages = (nextState.languages || []).map((item) => ({
    ...item,
    showLevel: state.showLanguageLevels
  }));
}

function buildSampleResumeState() {
  return sanitizeResumeState({
    uiLang: state.uiLang,
    cvLang: state.cvLang,
    template: state.template,
    theme: state.theme,
    showSkills: true,
    showSkillLevels: false,
    alpineLocationInHeader: state.alpineLocationInHeader,
    profile: {
      name: "Lena Hoffmann",
      title: "Senior Product Designer",
      email: "lena.hoffmann@example.com",
      phone: "+49 30 1234 5678",
      location: "Berlin, Germany",
      website: "lenahoffmann.design",
      linkedin: "linkedin.com/in/lenahoffmann",
      github: "github.com/lenahoffmann"
    },
    summary:
      "Product designer with 8+ years building end-to-end digital products for SaaS and consumer platforms. I turn research into clear interaction systems, partner closely with engineering, and ship accessible interfaces that improve adoption and retention.",
    experience: [
      {
        role: "Senior Product Designer",
        company: "Nordlicht Cloud",
        location: "Berlin, Germany",
        start: "Jan 2022",
        end: "Present",
        bullets:
          "Led redesign of onboarding flow, reducing drop-off by 29%.\nBuilt a component library with design tokens used across 4 product teams.\nPartnered with PM and engineering to ship roadmap features every sprint."
      },
      {
        role: "Product Designer",
        company: "Blueframe Labs",
        location: "Berlin, Germany",
        start: "Mar 2018",
        end: "Dec 2021",
        bullets:
          "Created responsive UX patterns for dashboard, billing, and analytics modules.\nRan usability tests and converted findings into prioritized product improvements.\nDefined interaction specs and states to speed up implementation handoff."
      },
      {
        role: "UX Designer",
        company: "Helio Commerce",
        location: "Berlin, Germany",
        start: "Jun 2016",
        end: "Feb 2018",
        bullets:
          "Redesigned checkout and account flows, improving conversion and repeat purchases.\nCollaborated with engineers to implement a reusable UI kit across web surfaces.\nMapped customer journeys and identified friction points across the funnel."
      },
      {
        role: "Visual Designer",
        company: "Brightside Agency",
        location: "Berlin, Germany",
        start: "Sep 2014",
        end: "May 2016",
        bullets:
          "Delivered brand and digital design systems for early-stage technology clients.\nProduced high-fidelity web and marketing assets with clear design rationale.\nSupported stakeholder workshops to align design direction and business goals."
      },
      {
        role: "Design Intern",
        company: "Studio Mitte",
        location: "Berlin, Germany",
        start: "Jun 2013",
        end: "Aug 2014",
        bullets:
          "Assisted with wireframes, prototypes, and visual explorations for client projects.\nPrepared design specs and asset exports for front-end implementation.\nContributed to user interviews and synthesized notes into actionable insights."
      }
    ],
    education: [
      {
        degree: "B.A. in Interaction Design",
        school: "Berlin University of the Arts",
        location: "Berlin, Germany",
        start: "Sep 2012",
        end: "Jun 2016"
      }
    ],
    skills: [
      { name: "Product Strategy", level: "expert", showLevel: false },
      { name: "UX Research", level: "advanced", showLevel: false },
      { name: "Interaction Design", level: "expert", showLevel: false },
      { name: "Design Systems", level: "advanced", showLevel: false },
      { name: "Figma", level: "expert", showLevel: false },
      { name: "Prototyping", level: "advanced", showLevel: false },
      { name: "Accessibility", level: "advanced", showLevel: false },
      { name: "HTML/CSS", level: "intermediate", showLevel: false }
    ],
    languages: [
      { name: "German", level: "expert", showLevel: false },
      { name: "English", level: "advanced", showLevel: false },
      { name: "Spanish", level: "intermediate", showLevel: false }
    ]
  });
}

function buildEmptyResumeState() {
  return sanitizeResumeState({
    uiLang: state.uiLang,
    cvLang: state.cvLang,
    template: state.template,
    theme: state.theme,
    showSkills: false,
    showSkillLevels: false,
    showLanguageLevels: false,
    alpineLocationInHeader: state.alpineLocationInHeader,
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
  });
}

function syncSampleButtonState() {
  if (!refs.sampleBtn) {
    return;
  }

  refs.sampleBtn.setAttribute("aria-pressed", String(sampleModeEnabled));
}

// Editor item factories
const { createExperience, createEducation, createSkill, createLanguage } = createFactories({
  getState: () => state
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
const {
  applyTheme,
  applyI18n,
  syncSectionToggles,
  syncTemplateSelectUI,
  closeTemplateSelect,
  toggleTemplateSelect,
  setSkillLevelSelectOpen,
  closeSkillLevelSelects,
  setLanguageLevelSelectOpen,
  closeLanguageLevelSelects,
  syncEditorPanelHeight
} = createUiControls({
  state,
  refs,
  getUiTranslation
});

function renderPreview() {
  refs.resumePreview.className = `resume-preview ${getTemplateClasses(state.template)}`;
  refs.resumePreview.innerHTML = renderTemplate(state.template);
  refs.resumePreview.style.setProperty("--name-font-scale", state.nameFontSize / 100);
  refs.blankPill.hidden = !isResumeBlank();
  insertPageBreakMarkers();
  syncEditorPanelHeight();
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
  applyTheme,
  applyI18n,
  renderDynamicEditors,
  renderPreview,
  syncSampleButtonState,
  getSampleModeEnabled: () => sampleModeEnabled,
  setSampleModeEnabled: (value) => {
    sampleModeEnabled = value;
  },
  syncTemplateSelectUI,
  closeTemplateSelect,
  toggleTemplateSelect,
  closeSkillLevelSelects,
  setSkillLevelSelectOpen,
  closeLanguageLevelSelects,
  setLanguageLevelSelectOpen,
  createExperience,
  createEducation,
  createSkill,
  createLanguage,
  buildEmptyResumeState,
  buildSampleResumeState,
  downloadRawResume,
  saveDraftToLocalStorage,
  openPdfDialog,
  syncSectionToggles
});

// App bootstrap
function init() {
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
