import { buildEntrySummary, isPresentValue } from "./entry-summary.js";
import { autosizeHighlight, highlightRowMarkup, splitBullets } from "./highlight-rows.js";
import { escapeAttr, escapeHtml, toBoolean } from "./utils.js";

export function createEditorRenderers({
  state,
  refs,
  getUiTranslation,
  skillLevels,
  normalizeSkillLevel
}) {
  const removeIcon = `
                <svg class="remove-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M9 3h6l1 2h4v2h-2l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7H4V5h4l1-2zm0 6v9h2V9H9zm4 0v9h2V9h-2z"
                    fill="currentColor"
                  />
                </svg>`;

  function moveButtons(listName, index, total) {
    const upLabel = getUiTranslation("actions.moveUp");
    const downLabel = getUiTranslation("actions.moveDown");
    return `
              <button type="button" class="remove-icon-btn move-btn move-up" data-action="move-item" data-list="${listName}" data-index="${index}" data-direction="-1" aria-label="${upLabel}" title="${upLabel}"${index === 0 ? " disabled" : ""}>
                <span class="move-icon" aria-hidden="true"></span>
              </button>
              <button type="button" class="remove-icon-btn move-btn move-down" data-action="move-item" data-list="${listName}" data-index="${index}" data-direction="1" aria-label="${downLabel}" title="${downLabel}"${index === total - 1 ? " disabled" : ""}>
                <span class="move-icon" aria-hidden="true"></span>
              </button>`;
  }

  function removeButton(action, index, extraClass = "") {
    const label = getUiTranslation("actions.remove");
    return `
              <button type="button" class="${extraClass}remove-icon-btn" data-action="${action}" data-index="${index}" aria-label="${label}" title="${label}">${removeIcon}
              </button>`;
  }

  // One quiet row: the single add control for a list, whether it is empty or not.
  function addRow(action, labelKey) {
    return `<button type="button" class="add-row" data-action="${action}"><span class="add-row-plus" aria-hidden="true">+</span>${getUiTranslation(labelKey)}</button>`;
  }

  function entryHead(listName, item, index, total, isCollapsed) {
    const summary = buildEntrySummary(listName, item, getUiTranslation);
    return `
          <div class="repeat-item-head">
            <button type="button" class="repeat-item-toggle${isCollapsed ? " is-collapsed" : ""}" data-action="toggle-${listName}" data-index="${index}" aria-expanded="${!isCollapsed}">
              <span class="collapse-icon" aria-hidden="true"></span>
              <span class="repeat-item-summary">
                <span class="repeat-item-title${summary.isEmpty ? " is-placeholder" : ""}">${escapeHtml(summary.title)}</span>
                <span class="repeat-item-dates">${escapeHtml(summary.dates)}</span>
              </span>
            </button>
            <div class="repeat-item-actions">${moveButtons(listName, index, total)}${removeButton(`remove-${listName}`, index)}
            </div>
          </div>`;
  }

  function renderExperienceEditor() {
    if (!state.experience.length) {
      refs.experienceList.innerHTML = addRow("add-experience", "actions.addExperience");
      return;
    }

    refs.experienceList.innerHTML = state.experience
      .map(
        (item, index) => {
          const isCollapsed = toBoolean(item.isCollapsed, false);
          const isPresent = isPresentValue(item.end);

          return `
        <article class="repeat-item${isCollapsed ? " is-collapsed" : ""}">
          ${entryHead("experience", item, index, state.experience.length, isCollapsed)}

          <div class="repeat-item-body is-collapsable" aria-hidden="${isCollapsed}">
            <div class="repeat-item-grid experience-grid">
              <label class="field-span-2">
                <span>${getUiTranslation("fields.jobTitle")}</span>
                <input type="text" data-list="experience" data-index="${index}" data-key="role" value="${escapeAttr(item.role)}" placeholder="${getUiTranslation("placeholders.jobTitle")}" />
              </label>
              <label class="field-span-2">
                <span>${getUiTranslation("fields.company")}</span>
                <input type="text" data-list="experience" data-index="${index}" data-key="company" value="${escapeAttr(item.company)}" placeholder="${getUiTranslation("placeholders.company")}" />
              </label>
              <label class="field-span-4">
                <span>${getUiTranslation("fields.itemLocation")}</span>
                <input type="text" data-list="experience" data-index="${index}" data-key="location" value="${escapeAttr(item.location)}" placeholder="${getUiTranslation("placeholders.location")}" />
              </label>
              <label class="field-span-2">
                <span>${getUiTranslation("fields.startDate")}</span>
                <input type="text" data-list="experience" data-index="${index}" data-key="start" value="${escapeAttr(item.start)}" placeholder="${getUiTranslation("placeholders.startDateExample")}" />
              </label>
              <div class="field-span-2 end-field">
                <label>
                  <span>${getUiTranslation("fields.endDate")}</span>
                  <input type="text" data-list="experience" data-index="${index}" data-key="end" value="${escapeAttr(item.end)}" placeholder="${getUiTranslation("placeholders.present")}"${isPresent ? " disabled" : ""} />
                </label>
                <label class="present-toggle">
                  <input type="checkbox" role="switch" class="switch-input" data-present-toggle data-list="experience" data-index="${index}"${isPresent ? " checked" : ""} />
                  <span>${getUiTranslation("placeholders.present")}</span>
                </label>
              </div>
              <p class="field-hint">${getUiTranslation("fields.dateHint")}</p>
            </div>

            <div class="highlights-field" role="group" aria-label="${escapeAttr(getUiTranslation("fields.highlightsList"))}">
              <span class="highlights-label" aria-hidden="true">${getUiTranslation("fields.highlightsList")}</span>
              <div class="highlights-list" data-list="experience" data-index="${index}">${highlightRows(item.bullets)}</div>
              <button type="button" class="add-row highlight-add" data-action="add-highlight" data-list="experience" data-index="${index}"><span class="add-row-plus" aria-hidden="true">+</span>${getUiTranslation("actions.addHighlight")}</button>
            </div>
          </div>
        </article>
      `;
        }
      )
      .join("");

    refs.experienceList.innerHTML += addRow("add-experience", "actions.addExperience");
    refs.experienceList.querySelectorAll(".highlight-input").forEach(autosizeHighlight);
  }

  // One row per non-empty line; an entry with none still shows one empty row to type into.
  function highlightRows(bullets) {
    const lines = splitBullets(bullets);
    return (lines.length ? lines : [""]).map((line, i) => highlightRowMarkup(getUiTranslation, line, i + 1)).join("");
  }

  function renderEducationEditor() {
    if (!state.education.length) {
      refs.educationList.innerHTML = addRow("add-education", "actions.addEducation");
      return;
    }

    refs.educationList.innerHTML = state.education
      .map(
        (item, index) => {
          const isCollapsed = toBoolean(item.isCollapsed, false);

          return `
        <article class="repeat-item${isCollapsed ? " is-collapsed" : ""}">
          ${entryHead("education", item, index, state.education.length, isCollapsed)}

          <div class="repeat-item-body is-collapsable" aria-hidden="${isCollapsed}">
            <div class="repeat-item-grid">
              <label>
                <span>${getUiTranslation("fields.degree")}</span>
                <input type="text" data-list="education" data-index="${index}" data-key="degree" value="${escapeAttr(item.degree)}" placeholder="${getUiTranslation("placeholders.degree")}" />
              </label>
              <label>
                <span>${getUiTranslation("fields.school")}</span>
                <input type="text" data-list="education" data-index="${index}" data-key="school" value="${escapeAttr(item.school)}" placeholder="${getUiTranslation("placeholders.school")}" />
              </label>
              <label>
                <span>${getUiTranslation("fields.itemLocation")}</span>
                <input type="text" data-list="education" data-index="${index}" data-key="location" value="${escapeAttr(item.location)}" placeholder="${getUiTranslation("placeholders.location")}" />
              </label>
              <label>
                <span>${getUiTranslation("fields.startDate")}</span>
                <input type="text" data-list="education" data-index="${index}" data-key="start" value="${escapeAttr(item.start)}" placeholder="${getUiTranslation("placeholders.educationStartYear")}" />
              </label>
              <label>
                <span>${getUiTranslation("fields.endDate")}</span>
                <input type="text" data-list="education" data-index="${index}" data-key="end" value="${escapeAttr(item.end)}" placeholder="${getUiTranslation("placeholders.educationEndYear")}" />
              </label>
              <p class="field-hint">${getUiTranslation("fields.dateHint")}</p>
            </div>
          </div>
        </article>
      `;
        }
      )
      .join("");

    refs.educationList.innerHTML += addRow("add-education", "actions.addEducation");
  }

  function renderSkillsEditor() {
    if (!state.skills.length) {
      refs.skillsList.innerHTML = addRow("add-skill", "actions.addSkill");
      return;
    }

    const showSkillLevels = toBoolean(state.showSkillLevels, false);
    const toggleLabel = showSkillLevels ? getUiTranslation("fields.hideSkillLevels") : getUiTranslation("fields.showSkillLevels");
    const toggleMarkup = `
    <div class="skills-toolbar">
      <button
        type="button"
        class="skill-level-toggle${showSkillLevels ? " is-active" : ""}"
        data-action="toggle-skill-levels"
        aria-pressed="${showSkillLevels}"
      >
        ${toggleLabel}
      </button>
    </div>
  `;

    const skillsMarkup = state.skills
      .map(
        (item, index) => {
          const selectedLevel = normalizeSkillLevel(item.level);

          return `
        <article class="repeat-item skill-item">
          <div class="skill-item-actions">${moveButtons("skills", index, state.skills.length)}${removeButton("remove-skill", index, "remove-btn ")}
          </div>

          <div class="repeat-item-body">
            <div class="repeat-item-grid skill-editor-grid">
              <label>
                <span>${getUiTranslation("fields.skillName")}</span>
                <input type="text" data-list="skills" data-index="${index}" data-key="name" value="${escapeAttr(item.name)}" placeholder="${getUiTranslation("placeholders.skill")}" />
              </label>
              <label>
                <span>${getUiTranslation("fields.skillLevel")}</span>
                <div class="custom-select skill-level-select" data-index="${index}">
                  <button
                    type="button"
                    class="custom-select-trigger"
                    data-action="toggle-skill-level-select"
                    data-index="${index}"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                  >
                    <span class="custom-select-value">${getUiTranslation(`levels.${selectedLevel}`)}</span>
                    <span class="custom-select-chevron" aria-hidden="true"></span>
                  </button>
                  <div class="custom-select-menu" role="listbox">
                    ${skillLevels
                      .map(
                        (level) =>
                          `<button type="button" class="custom-select-option" role="option" data-action="select-skill-level" data-index="${index}" data-value="${level}" aria-selected="${selectedLevel === level}">${getUiTranslation(
                            `levels.${level}`
                          )}</button>`
                      )
                      .join("")}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </article>
      `;
        }
      )
      .join("");

    const bottomAddBtn = addRow("add-skill", "actions.addSkill");
    refs.skillsList.innerHTML = `${toggleMarkup}${skillsMarkup}${bottomAddBtn}`;
  }

  function renderLanguagesEditor() {
    if (!state.languages.length) {
      refs.languagesList.innerHTML = addRow("add-language", "actions.addLanguage");
      return;
    }

    const showLanguageLevels = toBoolean(state.showLanguageLevels, false);
    const toggleLabel = showLanguageLevels ? getUiTranslation("fields.hideLanguageLevels") : getUiTranslation("fields.showLanguageLevels");
    const toggleMarkup = `
    <div class="skills-toolbar">
      <button
        type="button"
        class="skill-level-toggle${showLanguageLevels ? " is-active" : ""}"
        data-action="toggle-language-levels"
        aria-pressed="${showLanguageLevels}"
      >
        ${toggleLabel}
      </button>
    </div>
  `;

    const languagesMarkup = state.languages
      .map(
        (item, index) => {
          const selectedLevel = normalizeSkillLevel(item.level);

          return `
        <article class="repeat-item skill-item">
          <div class="skill-item-actions">${moveButtons("languages", index, state.languages.length)}${removeButton("remove-language", index, "remove-btn ")}
          </div>

          <div class="repeat-item-body">
            <div class="repeat-item-grid skill-editor-grid">
              <label>
                <span>${getUiTranslation("fields.languageName")}</span>
                <input type="text" data-list="languages" data-index="${index}" data-key="name" value="${escapeAttr(item.name)}" placeholder="${getUiTranslation("placeholders.language")}" />
              </label>
              <label>
                <span>${getUiTranslation("fields.languageLevel")}</span>
                <div class="custom-select language-level-select" data-index="${index}">
                  <button
                    type="button"
                    class="custom-select-trigger"
                    data-action="toggle-language-level-select"
                    data-index="${index}"
                    aria-haspopup="listbox"
                    aria-expanded="false"
                  >
                    <span class="custom-select-value">${getUiTranslation(`levels.${selectedLevel}`)}</span>
                    <span class="custom-select-chevron" aria-hidden="true"></span>
                  </button>
                  <div class="custom-select-menu" role="listbox">
                    ${skillLevels
                      .map(
                        (level) =>
                          `<button type="button" class="custom-select-option" role="option" data-action="select-language-level" data-index="${index}" data-value="${level}" aria-selected="${selectedLevel === level}">${getUiTranslation(
                            `levels.${level}`
                          )}</button>`
                      )
                      .join("")}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </article>
      `;
        }
      )
      .join("");

    const bottomAddBtn = addRow("add-language", "actions.addLanguage");
    refs.languagesList.innerHTML = `${toggleMarkup}${languagesMarkup}${bottomAddBtn}`;
  }

  function renderDynamicEditors() {
    renderExperienceEditor();
    renderEducationEditor();
    renderSkillsEditor();
    renderLanguagesEditor();
  }

  return {
    renderDynamicEditors
  };
}
