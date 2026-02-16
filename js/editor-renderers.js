import { escapeAttr, escapeHtml, hasText, toBoolean } from "./utils.js";

export function createEditorRenderers({
  state,
  refs,
  getUiTranslation,
  skillLevels,
  normalizeSkillLevel
}) {
  function renderExperienceEditor() {
    if (!state.experience.length) {
      refs.experienceList.innerHTML = `<p class="empty-list">${getUiTranslation("empty.experienceEditor")}</p>`;
      return;
    }

    refs.experienceList.innerHTML = state.experience
      .map(
        (item, index) => {
          const isCollapsed = toBoolean(item.isCollapsed, false);
          const toggleLabel = isCollapsed ? getUiTranslation("actions.expand") : getUiTranslation("actions.collapse");
          const roleLabel = hasText(item.role) ? escapeHtml(item.role) : "";
          const companyLabel = hasText(item.company) ? escapeHtml(item.company) : "";
          const titleLabel = roleLabel && companyLabel
            ? `${roleLabel} ${getUiTranslation("labels.at")} ${companyLabel}`
            : roleLabel || companyLabel || `${getUiTranslation("fields.experience")} ${index + 1}`;

          return `
        <article class="repeat-item${isCollapsed ? " is-collapsed" : ""}">
          <div class="repeat-item-head">
            <p class="repeat-item-title">${titleLabel}</p>
            <div class="repeat-item-actions">
              <button
                type="button"
                class="collapse-btn${isCollapsed ? " is-collapsed" : ""}"
                data-action="toggle-experience"
                data-index="${index}"
                aria-expanded="${!isCollapsed}"
                aria-label="${toggleLabel}"
                title="${toggleLabel}"
              >
                <span class="collapse-icon" aria-hidden="true"></span>
              </button>
              <button
                type="button"
                class="remove-icon-btn"
                data-action="remove-experience"
                data-index="${index}"
                aria-label="${getUiTranslation("actions.remove")}"
                title="${getUiTranslation("actions.remove")}"
              >
                <svg class="remove-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M9 3h6l1 2h4v2h-2l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7H4V5h4l1-2zm0 6v9h2V9H9zm4 0v9h2V9h-2z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>

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
              <label class="field-span-2">
                <span>${getUiTranslation("fields.itemLocation")}</span>
                <input type="text" data-list="experience" data-index="${index}" data-key="location" value="${escapeAttr(item.location)}" placeholder="${getUiTranslation("placeholders.location")}" />
              </label>
              <label>
                <span>${getUiTranslation("fields.startDate")}</span>
                <input type="text" data-list="experience" data-index="${index}" data-key="start" value="${escapeAttr(item.start)}" placeholder="${getUiTranslation("placeholders.startDateExample")}" />
              </label>
              <label>
                <span>${getUiTranslation("fields.endDate")}</span>
                <input type="text" data-list="experience" data-index="${index}" data-key="end" value="${escapeAttr(item.end)}" placeholder="${getUiTranslation("placeholders.present")}" />
              </label>
            </div>

            <label>
              <span>${getUiTranslation("fields.highlights")}</span>
            <textarea rows="3" class="highlights-textarea" data-list="experience" data-index="${index}" data-key="bullets">${escapeHtml(item.bullets)}</textarea>
            </label>
          </div>
        </article>
      `;
        }
      )
      .join("");

    const bottomAddBtn = `<button type="button" class="add-btn add-btn-bottom" data-action="add-experience">${getUiTranslation("actions.addExperience")}</button>`;
    refs.experienceList.innerHTML += bottomAddBtn;
  }

  function renderEducationEditor() {
    if (!state.education.length) {
      refs.educationList.innerHTML = `<p class="empty-list">${getUiTranslation("empty.educationEditor")}</p>`;
      return;
    }

    refs.educationList.innerHTML = state.education
      .map(
        (item, index) => {
          const isCollapsed = toBoolean(item.isCollapsed, false);
          const toggleLabel = isCollapsed ? getUiTranslation("actions.expand") : getUiTranslation("actions.collapse");
          const degreeLabel = hasText(item.degree) ? escapeHtml(item.degree) : "";
          const schoolLabel = hasText(item.school) ? escapeHtml(item.school) : "";
          const titleLabel = degreeLabel && schoolLabel
            ? `${degreeLabel} ${getUiTranslation("labels.at")} ${schoolLabel}`
            : degreeLabel || schoolLabel || `${getUiTranslation("fields.education")} ${index + 1}`;

          return `
        <article class="repeat-item${isCollapsed ? " is-collapsed" : ""}">
          <div class="repeat-item-head">
            <p class="repeat-item-title">${titleLabel}</p>
            <div class="repeat-item-actions">
              <button
                type="button"
                class="collapse-btn${isCollapsed ? " is-collapsed" : ""}"
                data-action="toggle-education"
                data-index="${index}"
                aria-expanded="${!isCollapsed}"
                aria-label="${toggleLabel}"
                title="${toggleLabel}"
              >
                <span class="collapse-icon" aria-hidden="true"></span>
              </button>
              <button
                type="button"
                class="remove-icon-btn"
                data-action="remove-education"
                data-index="${index}"
                aria-label="${getUiTranslation("actions.remove")}"
                title="${getUiTranslation("actions.remove")}"
              >
                <svg class="remove-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M9 3h6l1 2h4v2h-2l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7H4V5h4l1-2zm0 6v9h2V9H9zm4 0v9h2V9h-2z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>
          </div>

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
            </div>
          </div>
        </article>
      `;
        }
      )
      .join("");
  }

  function renderSkillsEditor() {
    if (!state.skills.length) {
      refs.skillsList.innerHTML = `<p class="empty-list">${getUiTranslation("empty.skillsEditor")}</p>`;
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
          <div class="skill-item-actions">
            <button
              type="button"
              class="remove-btn remove-icon-btn"
              data-action="remove-skill"
              data-index="${index}"
              aria-label="${getUiTranslation("actions.remove")}"
              title="${getUiTranslation("actions.remove")}"
            >
              <svg class="remove-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M9 3h6l1 2h4v2h-2l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7H4V5h4l1-2zm0 6v9h2V9H9zm4 0v9h2V9h-2z"
                  fill="currentColor"
                />
              </svg>
            </button>
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

    const bottomAddBtn = `<button type="button" class="add-btn add-btn-bottom" data-action="add-skill">${getUiTranslation("actions.addSkill")}</button>`;
    refs.skillsList.innerHTML = `${toggleMarkup}${skillsMarkup}${bottomAddBtn}`;
  }

  function renderLanguagesEditor() {
    if (!state.languages.length) {
      refs.languagesList.innerHTML = `<p class="empty-list">${getUiTranslation("empty.languagesEditor")}</p>`;
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
          <div class="skill-item-actions">
            <button
              type="button"
              class="remove-btn remove-icon-btn"
              data-action="remove-language"
              data-index="${index}"
              aria-label="${getUiTranslation("actions.remove")}"
              title="${getUiTranslation("actions.remove")}"
            >
              <svg class="remove-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M9 3h6l1 2h4v2h-2l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7H4V5h4l1-2zm0 6v9h2V9H9zm4 0v9h2V9h-2z"
                  fill="currentColor"
                />
              </svg>
            </button>
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

    const bottomAddBtn = `<button type="button" class="add-btn add-btn-bottom" data-action="add-language">${getUiTranslation("actions.addLanguage")}</button>`;
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
