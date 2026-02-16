import { createFactories } from "./factories.js";
import { templateCatalog } from "./preview-renderers.js";
import { toBoolean } from "./utils.js";

export function createEventHandlers({
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
  getSampleModeEnabled,
  setSampleModeEnabled,
  buildEmptyResumeState,
  buildSampleResumeState,
  downloadRawResume,
  saveDraftToLocalStorage,
  openPdfDialog
}) {
  const { createExperience, createEducation, createSkill, createLanguage } = createFactories({
    getState: () => state
  });
  const {
    applyTheme,
    applyI18n,
    syncTemplateSelectUI,
    closeTemplateSelect,
    toggleTemplateSelect,
    closeSkillLevelSelects,
    setSkillLevelSelectOpen,
    closeLanguageLevelSelects,
    setLanguageLevelSelectOpen,
    syncSectionToggles
  } = uiControls;

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
      setSampleModeEnabled(false);
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
      const nextState = getSampleModeEnabled() ? buildEmptyResumeState() : buildSampleResumeState();

      applyImportedState(nextState);
      setSampleModeEnabled(!getSampleModeEnabled());
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
      const nextCollapsed = !toBoolean(state.collapsedSections?.[sectionId], false);
      state.collapsedSections = { ...state.collapsedSections, [sectionId]: nextCollapsed };
      syncSectionToggles();
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

  return {
    handleRawFileChange,
    handleInput,
    handleClick
  };
}
