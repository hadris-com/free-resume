import { createCvTranslationGetter, createUiTranslationGetter } from "./i18n.js";
import { createEditorRenderers } from "./editor-renderers.js";
import { createFactories } from "./factories.js";
import { createPersistence } from "./persistence.js";
import { createPreviewRenderers, templateCatalog } from "./preview-renderers.js";
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
function applyTheme() {
  document.body.classList.toggle("theme-dark", state.theme === "dark");
  refs.themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));
}

function applyI18n() {
  document.documentElement.lang = state.uiLang;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (key) {
      element.textContent = getUiTranslation(key);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    if (key) {
      element.setAttribute("placeholder", getUiTranslation(key));
    }
  });

  refs.themeToggle.querySelector("[data-role='theme-label']").textContent =
    state.theme === "dark" ? getUiTranslation("actions.lightMode") : getUiTranslation("actions.darkMode");

  document.querySelectorAll(".lang-btn").forEach((button) => {
    const isActive = button.getAttribute("data-lang") === state.uiLang;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  document.querySelectorAll(".cv-lang-btn").forEach((button) => {
    const isActive = button.getAttribute("data-cv-lang") === state.cvLang;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  syncTemplateSelectUI();
  syncSectionToggles();
}

function syncSectionToggles() {
  document.querySelectorAll(".panel-section[data-section]").forEach((section) => {
    const sectionId = section.getAttribute("data-section");
    if (!sectionId) {
      return;
    }
    const isCollapsed = toBoolean(state.collapsedSections?.[sectionId], false);
    section.classList.toggle("is-collapsed", isCollapsed);

    const toggle = section.querySelector(".section-toggle");
    if (toggle instanceof HTMLButtonElement) {
      const label = isCollapsed ? getUiTranslation("actions.expand") : getUiTranslation("actions.collapse");
      toggle.classList.toggle("is-collapsed", isCollapsed);
      toggle.setAttribute("aria-expanded", String(!isCollapsed));
      toggle.setAttribute("aria-label", label);
      toggle.setAttribute("title", label);
    }
  });
}

function syncTemplateSelectUI() {
  if (!refs.templateSelectMenu || !refs.templateSelectValue || !refs.templateSelectTrigger) {
    return;
  }

  const options = refs.templateSelectMenu.querySelectorAll("[data-value]");
  let selectedLabel = "";
  options.forEach((option) => {
    const value = option.getAttribute("data-value");
    const isSelected = value === state.template;
    option.setAttribute("aria-selected", String(isSelected));
    if (isSelected) {
      selectedLabel = option.textContent?.trim() ?? "";
    }
  });

  if (!selectedLabel) {
    const fallback = refs.templateSelectMenu.querySelector(`[data-value="${state.template}"]`);
    selectedLabel = fallback?.textContent?.trim() ?? "";
  }

  if (selectedLabel) {
    refs.templateSelectValue.textContent = selectedLabel;
  }

  refs.templateSelectTrigger.setAttribute(
    "aria-expanded",
    String(refs.templateSelectWrapper?.classList.contains("is-open"))
  );

  if (refs.templateSelect) {
    refs.templateSelect.value = state.template;
  }
}

function closeTemplateSelect() {
  refs.templateSelectWrapper?.classList.remove("is-open");
  refs.templateSelectTrigger?.setAttribute("aria-expanded", "false");
}

function toggleTemplateSelect() {
  if (!refs.templateSelectWrapper || !refs.templateSelectTrigger) {
    return;
  }
  const nextOpen = !refs.templateSelectWrapper.classList.contains("is-open");
  refs.templateSelectWrapper.classList.toggle("is-open", nextOpen);
  refs.templateSelectTrigger.setAttribute("aria-expanded", String(nextOpen));
}

function updateSelectMenuPlacement(wrapper) {
  if (!wrapper) {
    return;
  }

  const menu = wrapper.querySelector(".custom-select-menu");
  if (!menu) {
    return;
  }

  const editorRect = refs.editorPanel?.getBoundingClientRect();
  const previewRect = refs.previewPanel?.getBoundingClientRect();
  const hasOverlap = editorRect && previewRect
    ? editorRect.top < previewRect.bottom && editorRect.bottom > previewRect.top
    : false;
  const isSideBySide = Boolean(hasOverlap);
  if (!isSideBySide) {
    wrapper.classList.remove("open-up");
    return;
  }

  const trigger = wrapper.querySelector(".custom-select-trigger") || wrapper;
  const triggerRect = trigger.getBoundingClientRect();
  const bounds = editorRect && editorRect.height > 0
    ? editorRect
    : { top: 0, bottom: window.innerHeight };

  const menuHeight = menu.scrollHeight;
  const spaceBelow = bounds.bottom - triggerRect.bottom;
  const spaceAbove = triggerRect.top - bounds.top;
  const shouldOpenUp = menuHeight > spaceBelow && spaceAbove > spaceBelow;

  wrapper.classList.toggle("open-up", shouldOpenUp);
}

function setSkillLevelSelectOpen(wrapper, open) {
  wrapper.classList.toggle("is-open", open);
  const trigger = wrapper.querySelector(".custom-select-trigger");
  if (trigger instanceof HTMLButtonElement) {
    trigger.setAttribute("aria-expanded", String(open));
  }
  if (open) {
    requestAnimationFrame(() => updateSelectMenuPlacement(wrapper));
  } else {
    wrapper.classList.remove("open-up");
  }
}

function closeSkillLevelSelects(exceptWrapper = null) {
  document.querySelectorAll(".skill-level-select.is-open").forEach((wrapper) => {
    if (exceptWrapper && wrapper === exceptWrapper) {
      return;
    }
    setSkillLevelSelectOpen(wrapper, false);
  });
}

function setLanguageLevelSelectOpen(wrapper, open) {
  wrapper.classList.toggle("is-open", open);
  const trigger = wrapper.querySelector(".custom-select-trigger");
  if (trigger instanceof HTMLButtonElement) {
    trigger.setAttribute("aria-expanded", String(open));
  }
  if (open) {
    requestAnimationFrame(() => updateSelectMenuPlacement(wrapper));
  } else {
    wrapper.classList.remove("open-up");
  }
}

function closeLanguageLevelSelects(exceptWrapper = null) {
  document.querySelectorAll(".language-level-select.is-open").forEach((wrapper) => {
    if (exceptWrapper && wrapper === exceptWrapper) {
      return;
    }
    setLanguageLevelSelectOpen(wrapper, false);
  });
}

function syncEditorPanelHeight() {
  if (!refs.editorPanel || !refs.previewPanel) {
    return;
  }

  const isDesktop = window.matchMedia("(min-width: 1181px)").matches;
  if (!isDesktop) {
    refs.editorPanel.style.height = "";
    refs.editorPanel.style.maxHeight = "";
    return;
  }

  const previewHeight = Math.round(refs.previewPanel.getBoundingClientRect().height);
  if (previewHeight > 0) {
    refs.editorPanel.style.height = `${previewHeight}px`;
    refs.editorPanel.style.maxHeight = `${previewHeight}px`;
  }
}

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
async function handleRawFileChange(event) {
  const target = event.target;

  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const file = target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const content = await file.text();
    const parsed = JSON.parse(content);
    const importedState = parseRawResumePayload(parsed);

    if (!importedState) {
      throw new Error("Invalid raw resume payload");
    }

    applyImportedState(importedState);
    sampleModeEnabled = false;
    syncStaticInputsFromState();
    applyTheme();
    applyI18n();
    renderDynamicEditors();
    renderPreview();
    syncSampleButtonState();
  } catch (error) {
    console.error(error);
    window.alert(getUiTranslation("errors.invalidRawFile"));
  } finally {
    target.value = "";
  }
}

function handleInput(event) {
  const target = event.target;

  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.id === "name-size-slider") {
    state.nameFontSize = Number(target.value) || 100;
    if (refs.nameSizeOutput) {
      refs.nameSizeOutput.textContent = `${state.nameFontSize}%`;
    }
    renderPreview();
    return;
  }

  if (target.dataset.profile) {
    state.profile[target.dataset.profile] = target.value;
    renderPreview();
    return;
  }

  if (target.dataset.field === "summary") {
    state.summary = target.value;
    renderPreview();
    return;
  }

  if (target.dataset.list && target.dataset.key) {
    const listName = target.dataset.list;
    const index = Number(target.dataset.index);
    const key = target.dataset.key;

    if (!Number.isNaN(index) && state[listName]?.[index]) {
      state[listName][index][key] =
        target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
      renderPreview();
    }
    return;
  }

  if (target.id === "template-select") {
    state.template = target.value;
    syncTemplateSelectUI();
    renderPreview();
    return;
  }

}

function setRepeatItemCollapsed(trigger, isCollapsed, collapsedTitleText = "") {
  const repeatItem = trigger.closest(".repeat-item");
  if (!repeatItem) {
    return;
  }

  repeatItem.classList.toggle("is-collapsed", isCollapsed);
  trigger.classList.toggle("is-collapsed", isCollapsed);
  trigger.setAttribute("aria-expanded", String(!isCollapsed));

  const toggleLabel = isCollapsed ? getUiTranslation("actions.expand") : getUiTranslation("actions.collapse");
  trigger.setAttribute("aria-label", toggleLabel);
  trigger.setAttribute("title", toggleLabel);

  const body = repeatItem.querySelector(".repeat-item-body");
  if (body) {
    body.setAttribute("aria-hidden", String(isCollapsed));
  }

  const collapsedTitle = repeatItem.querySelector(".skill-collapsed-title");
  if (collapsedTitle) {
    if (collapsedTitleText) {
      collapsedTitle.textContent = collapsedTitleText;
    }
    collapsedTitle.setAttribute("aria-hidden", String(!isCollapsed));
  }
}

function handleClick(event) {
  if (refs.templateSelectWrapper && !refs.templateSelectWrapper.contains(event.target)) {
    closeTemplateSelect();
  }

  if (!event.target.closest(".skill-level-select")) {
    closeSkillLevelSelects();
  }

  if (!event.target.closest(".language-level-select")) {
    closeLanguageLevelSelects();
  }

  const trigger = event.target.closest("button");

  if (!trigger) {
    return;
  }

  if (trigger.dataset.action === "toggle-template-select") {
    toggleTemplateSelect();
    return;
  }

  if (trigger.dataset.action === "select-template") {
    const value = trigger.getAttribute("data-value");
    if (value && templateCatalog[value]) {
      state.template = value;
      syncTemplateSelectUI();
      renderPreview();
    }
    closeTemplateSelect();
    return;
  }

  if (trigger.dataset.action === "toggle-skill-level-select") {
    const wrapper = trigger.closest(".skill-level-select");
    if (!wrapper) {
      return;
    }
    const nextOpen = !wrapper.classList.contains("is-open");
    closeSkillLevelSelects(wrapper);
    setSkillLevelSelectOpen(wrapper, nextOpen);
    return;
  }

  if (trigger.dataset.action === "select-skill-level") {
    const index = Number(trigger.getAttribute("data-index"));
    const value = trigger.getAttribute("data-value");
    if (!Number.isNaN(index) && value && state.skills[index]) {
      state.skills[index].level = value;
      renderDynamicEditors();
      renderPreview();
    }
    closeSkillLevelSelects();
    return;
  }

  if (trigger.dataset.action === "toggle-language-level-select") {
    const wrapper = trigger.closest(".language-level-select");
    if (!wrapper) {
      return;
    }
    const nextOpen = !wrapper.classList.contains("is-open");
    closeLanguageLevelSelects(wrapper);
    setLanguageLevelSelectOpen(wrapper, nextOpen);
    return;
  }

  if (trigger.dataset.action === "select-language-level") {
    const index = Number(trigger.getAttribute("data-index"));
    const value = trigger.getAttribute("data-value");
    if (!Number.isNaN(index) && value && state.languages[index]) {
      state.languages[index].level = value;
      renderDynamicEditors();
      renderPreview();
    }
    closeLanguageLevelSelects();
    return;
  }

  if (trigger.classList.contains("lang-btn")) {
    state.uiLang = trigger.getAttribute("data-lang") || "en";
    applyI18n();
    renderDynamicEditors();
    renderPreview();
    return;
  }

  if (trigger.classList.contains("cv-lang-btn")) {
    state.cvLang = trigger.getAttribute("data-cv-lang") || "en";
    applyI18n();
    renderPreview();
    return;
  }

  if (trigger.id === "theme-toggle") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    applyI18n();
    saveDraftToLocalStorage();
    return;
  }

  if (trigger.id === "add-experience-btn" || trigger.dataset.action === "add-experience") {
    state.experience.push(createExperience());
    renderDynamicEditors();
    renderPreview();
    return;
  }

  if (trigger.id === "add-education-btn") {
    state.education.push(createEducation());
    renderDynamicEditors();
    renderPreview();
    return;
  }

  if (trigger.id === "add-skill-btn" || trigger.dataset.action === "add-skill") {
    state.skills.push(createSkill());
    renderDynamicEditors();
    renderPreview();
    return;
  }

  if (trigger.id === "upload-raw-btn") {
    refs.rawFileInput?.click();
    return;
  }

  if (trigger.id === "sample-btn") {
    const nextState = sampleModeEnabled ? buildEmptyResumeState() : buildSampleResumeState();

    applyImportedState(nextState);
    sampleModeEnabled = !sampleModeEnabled;
    syncStaticInputsFromState();
    applyI18n();
    renderDynamicEditors();
    renderPreview();
    syncSampleButtonState();
    return;
  }

  if (trigger.id === "download-raw-btn") {
    downloadRawResume();
    return;
  }

  if (trigger.dataset.action === "remove-experience") {
    const index = Number(trigger.dataset.index);
    if (!Number.isNaN(index)) {
      state.experience.splice(index, 1);
      renderDynamicEditors();
      renderPreview();
    }
    return;
  }

  if (trigger.dataset.action === "toggle-experience") {
    const index = Number(trigger.dataset.index);
    if (!Number.isNaN(index) && state.experience[index]) {
      const nextCollapsed = !toBoolean(state.experience[index].isCollapsed, false);
      state.experience[index].isCollapsed = nextCollapsed;
      setRepeatItemCollapsed(trigger, nextCollapsed);
      saveDraftToLocalStorage();
    }
    return;
  }

  if (trigger.dataset.action === "remove-education") {
    const index = Number(trigger.dataset.index);
    if (!Number.isNaN(index)) {
      state.education.splice(index, 1);
      renderDynamicEditors();
      renderPreview();
    }
    return;
  }

  if (trigger.dataset.action === "toggle-education") {
    const index = Number(trigger.dataset.index);
    if (!Number.isNaN(index) && state.education[index]) {
      const nextCollapsed = !toBoolean(state.education[index].isCollapsed, false);
      state.education[index].isCollapsed = nextCollapsed;
      setRepeatItemCollapsed(trigger, nextCollapsed);
      saveDraftToLocalStorage();
    }
    return;
  }

  if (trigger.dataset.action === "remove-skill") {
    const index = Number(trigger.dataset.index);
    if (!Number.isNaN(index)) {
      state.skills.splice(index, 1);
      renderDynamicEditors();
      renderPreview();
    }
    return;
  }

  if (trigger.dataset.action === "toggle-location-placement") {
    state.alpineLocationInHeader = !toBoolean(state.alpineLocationInHeader, false);
    renderPreview();
    return;
  }

  if (trigger.dataset.action === "toggle-skill-levels") {
    state.showSkillLevels = !toBoolean(state.showSkillLevels, false);
    state.skills = state.skills.map((item) => ({ ...item, showLevel: state.showSkillLevels }));
    renderDynamicEditors();
    renderPreview();
    return;
  }

  if (trigger.id === "add-language-btn" || trigger.dataset.action === "add-language") {
    state.languages.push(createLanguage());
    renderDynamicEditors();
    renderPreview();
    return;
  }

  if (trigger.dataset.action === "remove-language") {
    const index = Number(trigger.dataset.index);
    if (!Number.isNaN(index)) {
      state.languages.splice(index, 1);
      renderDynamicEditors();
      renderPreview();
    }
    return;
  }

  if (trigger.dataset.action === "toggle-language-levels") {
    state.showLanguageLevels = !toBoolean(state.showLanguageLevels, false);
    state.languages = state.languages.map((item) => ({ ...item, showLevel: state.showLanguageLevels }));
    renderDynamicEditors();
    renderPreview();
    return;
  }

  if (trigger.dataset.action === "toggle-section") {
    const sectionId = trigger.getAttribute("data-section");
    if (!sectionId) {
      return;
    }
    if (sectionId === "template") {
      return;
    }
    const nextCollapsed = !toBoolean(state.collapsedSections?.[sectionId], false);
    state.collapsedSections = { ...state.collapsedSections, [sectionId]: nextCollapsed };
    syncSectionToggles();
    if (sectionId === "template" && nextCollapsed) {
      closeTemplateSelect();
    }
    return;
  }

  if (trigger.id === "pdf-btn") {
    openPdfDialog();
    return;
  }

  if (trigger.id === "privacy-btn") {
    refs.privacyModal?.showModal();
    return;
  }

  if (trigger.id === "privacy-close-btn") {
    refs.privacyModal?.close();
    try { localStorage.setItem("free-resume:privacy-ack", "1"); } catch {}
    return;
  }
}

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
