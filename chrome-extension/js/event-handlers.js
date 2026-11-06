import { buildEntrySummary, isPresentValue } from "./entry-summary.js";
import { createFactories } from "./factories.js";
import { autosizeHighlight, highlightRowMarkup } from "./highlight-rows.js";
import { createCvTranslationGetter } from "./i18n.js";
import { resolvePageSize } from "./page-layout.js";
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
  openPdfDialog,
  showNotice
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
    setCollapsibleState,
    syncCollapsibleHeights,
    syncSectionToggles,
    toggleMoreMenu,
    closeMoreMenu,
    setMobileView
  } = uiControls;

  // Deep copy so later edits never leak into a pending undo.
  function takeSnapshot() {
    return structuredClone(state);
  }

  function restoreSnapshot(snapshot) {
    Object.assign(state, structuredClone(snapshot));
    syncStaticInputsFromState();
    applyTheme();
    applyI18n();
    renderDynamicEditors();
    renderPreview();
  }

  function showUndoNotice(message, snapshot) {
    showNotice({ message, onUndo: () => restoreSnapshot(snapshot) });
  }

  // Sample mode holds throwaway content: the first real edit makes the content the user's own.
  let sampleBackup = null;

  function leaveSampleMode() {
    if (getSampleModeEnabled()) {
      setSampleModeEnabled(false);
      sampleBackup = null;
      syncSampleButtonState();
    }
  }

  function removeListItem(listName, index) {
    const snapshot = takeSnapshot();
    leaveSampleMode();
    state[listName].splice(index, 1);
    renderDynamicEditors();
    renderPreview();
    showUndoNotice(getUiTranslation("notices.entryRemoved"), snapshot);
  }

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

      // Undoing an import in sample mode returns to the user's own content, not the sample.
      const snapshot = getSampleModeEnabled() && sampleBackup ? sampleBackup : takeSnapshot();
      applyImportedState(importedState);
      setSampleModeEnabled(false);
      sampleBackup = null;
      syncStaticInputsFromState();
      applyTheme();
      applyI18n();
      renderDynamicEditors();
      renderPreview();
      syncSampleButtonState();
      showUndoNotice(getUiTranslation("notices.resumeImported"), snapshot);
    } catch (error) {
      console.error(error);
      showNotice({ message: getUiTranslation("errors.invalidRawFile"), isError: true });
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
      syncCollapsibleHeights();
      renderPreview();
      return;
    }

    if (target.dataset.profile) {
      leaveSampleMode();
      state.profile[target.dataset.profile] = target.value;
      syncCollapsibleHeights();
      renderPreview();
      return;
    }

    if (target.dataset.field === "summary") {
      leaveSampleMode();
      state.summary = target.value;
      syncCollapsibleHeights();
      renderPreview();
      return;
    }

    if (target.dataset.presentToggle !== undefined && target instanceof HTMLInputElement) {
      setPresent(Number(target.dataset.index), target);
      return;
    }

    if (target.dataset.highlight !== undefined && target instanceof HTMLTextAreaElement) {
      autosizeHighlight(target);
      commitHighlights(target.closest(".highlights-list"));
      return;
    }

    if (target.dataset.list && target.dataset.key) {
      const listName = target.dataset.list;
      const index = Number(target.dataset.index);
      const key = target.dataset.key;

      if (!Number.isNaN(index) && state[listName]?.[index]) {
        leaveSampleMode();
        state[listName][index][key] =
          target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
        updateEntryRow(listName, index, target);
        syncCollapsibleHeights();
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

  // Keep the collapsed row text in step with typing, without re-rendering (which would drop focus).
  function updateEntryRow(listName, index, field) {
    if (listName !== "experience" && listName !== "education") {
      return;
    }
    const row = field.closest(".repeat-item")?.querySelector(".repeat-item-summary");
    if (!row) {
      return;
    }
    const summary = buildEntrySummary(listName, state[listName][index], getUiTranslation);
    const title = row.querySelector(".repeat-item-title");
    title.textContent = summary.title;
    title.classList.toggle("is-placeholder", summary.isEmpty);
    row.querySelector(".repeat-item-dates").textContent = summary.dates;
  }

  // ---- Experience dates: the Present switch stores plain text in `end`, so the JSON format is unchanged ----
  const endBeforePresent = new WeakMap();
  const getCvTranslation = createCvTranslationGetter(() => state.cvLang);

  function setPresent(index, toggle) {
    const item = state.experience[index];
    const endInput = toggle.closest(".repeat-item-body")?.querySelector('input[data-key="end"]');
    if (!item || !endInput) {
      return;
    }
    leaveSampleMode();
    if (toggle.checked) {
      if (!isPresentValue(item.end)) {
        endBeforePresent.set(item, item.end);
        item.end = getCvTranslation("placeholders.present");
      }
    } else if (isPresentValue(item.end)) {
      item.end = endBeforePresent.get(item) ?? "";
      endBeforePresent.delete(item);
    }
    endInput.value = item.end;
    endInput.disabled = toggle.checked;
    updateEntryRow("experience", index, endInput);
    renderPreview();
  }

  // ---- Experience highlights: one textarea row per line, stored back as a newline-separated string ----
  function highlightRows(list) {
    return Array.from(list.querySelectorAll(".highlight-input"));
  }

  function commitHighlights(list) {
    const item = list && state.experience[Number(list.dataset.index)];
    if (!item) {
      return;
    }
    leaveSampleMode();
    item.bullets = highlightRows(list)
      .map((input) => input.value)
      .filter((line) => line.trim() !== "")
      .join("\n");
    renderPreview();
    syncCollapsibleHeights();
  }

  function renumberHighlights(list) {
    const label = getUiTranslation("fields.highlightItem");
    highlightRows(list).forEach((input, i) => input.setAttribute("aria-label", `${label} ${i + 1}`));
  }

  function insertHighlightAfter(row, text) {
    const holder = document.createElement("div");
    holder.innerHTML = highlightRowMarkup(getUiTranslation, text, 0);
    const created = holder.firstElementChild;
    row.after(created);
    return created.querySelector(".highlight-input");
  }

  function focusHighlight(input, caret = input.value.length) {
    autosizeHighlight(input);
    input.focus();
    input.setSelectionRange(caret, caret);
  }

  function removeHighlightRow(row, { focus = true } = {}) {
    const list = row.parentElement;
    const rows = Array.from(list.children);
    if (rows.length === 1) {
      const only = row.querySelector(".highlight-input");
      only.value = "";
      autosizeHighlight(only);
      if (focus) {
        only.focus();
      }
    } else {
      const neighbour = row.previousElementSibling || row.nextElementSibling;
      const toPrevious = Boolean(row.previousElementSibling);
      row.remove();
      renumberHighlights(list);
      if (focus) {
        const input = neighbour.querySelector(".highlight-input");
        focusHighlight(input, toPrevious ? input.value.length : 0);
      }
    }
    commitHighlights(list);
  }

  function handleHighlightKeydown(event) {
    const input = event.target;
    if (!(input instanceof HTMLTextAreaElement) || input.dataset.highlight === undefined || event.isComposing) {
      return;
    }
    const row = input.closest(".highlight-row");
    const list = row.parentElement;

    if (event.key === "Enter" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const caret = input.selectionStart;
      const rest = input.value.slice(input.selectionEnd);
      input.value = input.value.slice(0, caret);
      const created = insertHighlightAfter(row, rest);
      renumberHighlights(list);
      autosizeHighlight(input);
      focusHighlight(created, 0);
      commitHighlights(list);
      return;
    }

    if (event.key === "Backspace" && input.value === "" && list.children.length > 1 && row.previousElementSibling) {
      event.preventDefault();
      removeHighlightRow(row);
    }
  }

  // Pasted multi-line text becomes several rows; stray list markers are dropped.
  function handleHighlightPaste(event) {
    const input = event.target;
    if (!(input instanceof HTMLTextAreaElement) || input.dataset.highlight === undefined) {
      return;
    }
    const text = event.clipboardData?.getData("text") ?? "";
    if (!/[\r\n]/.test(text)) {
      return;
    }
    event.preventDefault();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-•*·]\s+/, "").trim())
      .filter(Boolean);
    if (!lines.length) {
      return;
    }
    const row = input.closest(".highlight-row");
    const list = row.parentElement;
    const before = input.value.slice(0, input.selectionStart);
    const after = input.value.slice(input.selectionEnd);
    input.value = before + lines[0];
    let last = input;
    let caret = input.value.length;
    lines.slice(1).forEach((line, i, rest) => {
      const isLast = i === rest.length - 1;
      last = insertHighlightAfter(last.closest(".highlight-row"), isLast ? line + after : line);
      caret = line.length;
    });
    if (lines.length === 1) {
      input.value += after;
    }
    renumberHighlights(list);
    highlightRows(list).forEach(autosizeHighlight);
    focusHighlight(last, caret);
    commitHighlights(list);
  }

  [refs.experienceList].forEach((container) => {
    container?.addEventListener("keydown", handleHighlightKeydown);
    container?.addEventListener("paste", handleHighlightPaste);
    // Rows measured while hidden (collapsed or another mobile tab) get their real height once used.
    container?.addEventListener("focusin", (event) => {
      if (event.target instanceof HTMLTextAreaElement && event.target.dataset.highlight !== undefined) {
        autosizeHighlight(event.target);
      }
    });
  });

  // Wrapping changes with the panel width, so re-measure the rows.
  window.addEventListener("resize", () => {
    refs.experienceList?.querySelectorAll(".highlight-input").forEach(autosizeHighlight);
  });

  const listContainers = () => ({
    experience: refs.experienceList,
    education: refs.educationList,
    skills: refs.skillsList,
    languages: refs.languagesList
  });

  // A new entry opens expanded, so focus its first field.
  function addListItem(listName, factory) {
    leaveSampleMode();
    state[listName].push(factory());
    renderDynamicEditors();
    renderPreview();
    const items = listContainers()[listName]?.querySelectorAll(".repeat-item");
    items?.[items.length - 1]?.querySelector("input, textarea")?.focus();
  }

  function moveListItem(listName, index, direction) {
    const list = state[listName];
    const target = index + direction;
    if (!Array.isArray(list) || !list[index] || target < 0 || target >= list.length) {
      return;
    }
    leaveSampleMode();
    [list[index], list[target]] = [list[target], list[index]];
    renderDynamicEditors();
    renderPreview();
    const container = listContainers()[listName];
    const selector = (dir) => `[data-action="move-item"][data-index="${target}"][data-direction="${dir}"]`;
    const same = container?.querySelector(selector(direction));
    // At the end of the list the same direction is disabled; hand focus to the opposite control.
    (same && !same.disabled ? same : container?.querySelector(selector(-direction)))?.focus();
  }

  function setRepeatItemCollapsed(trigger, isCollapsed, collapsedTitleText = "") {
    const repeatItem = trigger.closest(".repeat-item");
    if (!repeatItem) {
      return;
    }

    setCollapsibleState(repeatItem, ".repeat-item-body", isCollapsed, { trigger, animate: true });
    // The row's own text is its accessible name; aria-expanded carries the state.
    trigger.removeAttribute("aria-label");
    trigger.removeAttribute("title");

    const collapsedTitle = repeatItem.querySelector(".skill-collapsed-title");
    if (collapsedTitle) {
      if (collapsedTitleText) {
        collapsedTitle.textContent = collapsedTitleText;
      }
      collapsedTitle.setAttribute("aria-hidden", String(!isCollapsed));
    }

    // The entry body is still animating, so measuring the section now would cache a partial height.
    // Let the section grow freely and measure once the entry body has settled.
    const sectionBody = repeatItem.closest(".section-body");
    if (sectionBody instanceof HTMLElement && !repeatItem.closest(".panel-section.is-collapsed")) {
      sectionBody.style.maxHeight = "none";
    }
    const body = repeatItem.querySelector(".repeat-item-body");
    body?.addEventListener("transitionend", (transitionEvent) => {
      if (transitionEvent.propertyName === "max-height") {
        syncCollapsibleHeights();
      }
    }, { once: true });
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

    if (!event.target.closest(".more-menu")) {
      closeMoreMenu();
    }

    const trigger = event.target.closest("button");

    if (!trigger) {
      return;
    }

    if (trigger.dataset.action === "remove-highlight") {
      // detail 0 means keyboard-activated: keep focus in the list. A tap or click should not summon a keyboard.
      removeHighlightRow(trigger.closest(".highlight-row"), { focus: event.detail === 0 });
      return;
    }

    if (trigger.dataset.action === "add-highlight") {
      const list = trigger.parentElement.querySelector(".highlights-list");
      const last = list.lastElementChild;
      const created = insertHighlightAfter(last, "");
      renumberHighlights(list);
      focusHighlight(created, 0);
      return;
    }

    if (trigger.dataset.action === "toggle-more-menu") {
      toggleMoreMenu();
      return;
    }

    if (trigger.dataset.view) {
      setMobileView(trigger.dataset.view);
      return;
    }

    // A menu item closes the menu, then runs as usual below.
    if (trigger.closest(".more-menu-list")) {
      closeMoreMenu({ restoreFocus: true });
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
        leaveSampleMode();
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
        leaveSampleMode();
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

    if (trigger.classList.contains("page-size-btn")) {
      state.pageSize = resolvePageSize(trigger.getAttribute("data-page-size"));
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

    if (trigger.dataset.action === "add-experience") {
      addListItem("experience", createExperience);
      return;
    }

    if (trigger.dataset.action === "add-education") {
      addListItem("education", createEducation);
      return;
    }

    if (trigger.dataset.action === "add-skill") {
      addListItem("skills", createSkill);
      return;
    }

    if (trigger.dataset.action === "move-item") {
      moveListItem(trigger.dataset.list, Number(trigger.dataset.index), Number(trigger.dataset.direction));
      return;
    }

    if (trigger.id === "upload-raw-btn") {
      refs.rawFileInput?.click();
      return;
    }

    if (trigger.id === "sample-btn") {
      if (getSampleModeEnabled()) {
        // Leaving sample mode puts back exactly what was there before, keeping current language and theme.
        const { uiLang, cvLang, theme } = state;
        const previous = sampleBackup ?? buildEmptyResumeState();
        Object.assign(state, structuredClone(previous), { uiLang, cvLang, theme });
        sampleBackup = null;
        setSampleModeEnabled(false);
      } else {
        sampleBackup = takeSnapshot();
        applyImportedState(buildSampleResumeState());
        setSampleModeEnabled(true);
      }
      applyTheme();
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
        removeListItem("experience", index);
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
        removeListItem("education", index);
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
        removeListItem("skills", index);
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

    if (trigger.dataset.action === "add-language") {
      addListItem("languages", createLanguage);
      return;
    }

    if (trigger.dataset.action === "remove-language") {
      const index = Number(trigger.dataset.index);
      if (!Number.isNaN(index)) {
        removeListItem("languages", index);
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
      const section = trigger.closest(".panel-section");
      if (section instanceof HTMLElement) {
        setCollapsibleState(section, ".section-body", nextCollapsed, { trigger, animate: true });
        syncCollapsibleHeights();
      } else {
        syncSectionToggles();
      }
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

  return {
    handleRawFileChange,
    handleInput,
    handleClick
  };
}
