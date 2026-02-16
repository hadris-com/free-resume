import { translations } from "./translations.js";
import { createEditorRenderers } from "./editor-renderers.js";
import { createFactories } from "./factories.js";
import { createPersistence } from "./persistence.js";
import {
  buildLink,
  buildPhoneMarkup,
  buildSocialLink,
  escapeAttr,
  escapeHtml,
  formatTextBlock,
  hasObjectContent,
  hasText,
  toBoolean
} from "./utils.js";

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
function getUiTranslation(key) {
  return translations[state.uiLang]?.[key] ?? translations.en[key] ?? key;
}

function getCvTranslation(key) {
  return translations[state.cvLang]?.[key] ?? translations.en[key] ?? key;
}

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

const locationIconSvg = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;

function buildLocationToggle(location, isInHeader, extraClass = "", textClass = "location-text") {
  if (!hasText(location)) {
    return "";
  }

  const toggleLabel = isInHeader ? getUiTranslation("actions.moveLocationToDetails") : getUiTranslation("actions.moveLocationToHeader");
  const classes = ["location-toggle", "has-tooltip", extraClass].filter(Boolean).join(" ");

  return `<button type="button" class="${classes}" data-action="toggle-location-placement" data-tooltip="${escapeAttr(toggleLabel)}" aria-label="${escapeAttr(toggleLabel)}">${locationIconSvg}<span class="${textClass}">${escapeHtml(location)}</span></button>`;
}

function formatRange(start, end) {
  const cleanStart = String(start ?? "").trim();
  const cleanEnd = String(end ?? "").trim();

  if (!cleanStart && !cleanEnd) {
    return "";
  }

  if (cleanStart && cleanEnd) {
    return `${cleanStart} - ${cleanEnd}`;
  }

  if (cleanStart) {
    return `${cleanStart} - ${getCvTranslation("placeholders.present")}`;
  }

  return cleanEnd;
}

// Preview data selectors
function getSummaryMarkup() {
  return hasText(state.summary) ? `<p>${formatTextBlock(state.summary)}</p>` : "";
}

function getExperienceItems() {
  return state.experience.filter((item) => hasObjectContent(item));
}

function getEducationItems() {
  return state.education.filter((item) => hasObjectContent(item));
}

function getSkillItems() {
  return state.skills
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      level: normalizeSkillLevel(item.level)
    }))
    .filter((item) => hasText(item.name));
}

function getLanguageItems() {
  return state.languages
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      level: normalizeSkillLevel(item.level)
    }))
    .filter((item) => hasText(item.name));
}

function renderExperienceEntries() {
  const entries = getExperienceItems();

  if (!entries.length) {
    return "";
  }

  const entryClass = state.template === "alpine" ? "entry entry-marked" : "entry";

  return entries
    .map((item) => {
      const role = hasText(item.role) ? item.role : getCvTranslation("placeholders.jobTitle");
      const company = hasText(item.company) ? item.company : "";
      const location = hasText(item.location) ? item.location : "";
      const metaInline = company
        ? `${getCvTranslation("labels.at")} ${company}${location ? ` · ${location}` : ""}`
        : location;
      const dateRange = formatRange(item.start, item.end);
      const bullets = String(item.bullets ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      return `
        <article class="${entryClass}">
          <h4 class="entry-title">
            <span class="entry-role">${escapeHtml(role)}</span>
            ${metaInline ? `<span class="entry-meta-inline">${escapeHtml(metaInline)}</span>` : ""}
          </h4>
          ${dateRange ? `<p class="entry-meta entry-meta-block">${escapeHtml(dateRange)}</p>` : ""}
          ${bullets.length ? `<ul>${bullets.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderEducationEntries() {
  const entries = getEducationItems();

  if (!entries.length) {
    return "";
  }

  const entryClass = state.template === "alpine" ? "entry entry-marked" : "entry";

  return entries
    .map((item) => {
      const degree = hasText(item.degree) ? item.degree : getCvTranslation("placeholders.degree");
      const schoolLocation = [item.school, item.location].filter(hasText).join(" · ");

      return `
        <article class="${entryClass}">
          <div class="entry-topline">
            <h4 class="entry-title">${escapeHtml(degree)}</h4>
            <span class="entry-meta">${escapeHtml(formatRange(item.start, item.end))}</span>
          </div>
          ${schoolLocation ? `<p class="entry-company">${escapeHtml(schoolLocation)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderSkillsMarkup() {
  const skills = getSkillItems();
  const showLevels = toBoolean(state.showSkillLevels, false);

  if (!skills.length) {
    return "";
  }

  return `
    <div class="skill-cloud">
      ${skills
        .map((skill) => {
          const levelMarkup = showLevels
            ? `<span class="skill-chip-level">${getCvTranslation(`levels.${skill.level}`)}</span>`
            : "";

          return `<span class="skill-chip"><span>${escapeHtml(skill.name)}</span>${levelMarkup}</span>`;
        })
        .join("")}
    </div>
  `;
}

function renderLanguagesMarkup() {
  const languages = getLanguageItems();
  const showLevels = toBoolean(state.showLanguageLevels, false);

  if (!languages.length) {
    return "";
  }

  return `
    <div class="skill-cloud">
      ${languages
        .map((lang) => {
          const levelMarkup = showLevels
            ? `<span class="skill-chip-level">${getCvTranslation(`levels.${lang.level}`)}</span>`
            : "";

          return `<span class="skill-chip"><span>${escapeHtml(lang.name)}</span>${levelMarkup}</span>`;
        })
        .join("")}
    </div>
  `;
}

// Template renderers
function renderBerlinTemplate() {
  const name = hasText(state.profile.name) ? state.profile.name : getCvTranslation("placeholders.noName");
  const title = hasText(state.profile.title) ? state.profile.title : getCvTranslation("placeholders.noTitle");
  const locationInHeader = toBoolean(state.alpineLocationInHeader, false);
  const summaryMarkup = getSummaryMarkup();
  const experienceMarkup = renderExperienceEntries();
  const educationMarkup = renderEducationEntries();
  const skillsMarkup = renderSkillsMarkup();
  const languagesMarkup = renderLanguagesMarkup();
  const locationButton = buildLocationToggle(state.profile.location, locationInHeader, "resume-location-toggle");

  const detailsList = [
    state.profile.email ? `<li>${buildLink(state.profile.email)}</li>` : "",
    state.profile.phone ? `<li>${buildPhoneMarkup(state.profile.phone)}</li>` : "",
    !locationInHeader && locationButton ? `<li>${locationButton}</li>` : ""
  ]
    .filter(Boolean)
    .join("");

  const linksList = [
    state.profile.website ? `<li>${buildLink(state.profile.website)}</li>` : "",
    state.profile.linkedin ? `<li>${buildSocialLink(state.profile.linkedin, "linkedin")}</li>` : "",
    state.profile.github ? `<li>${buildSocialLink(state.profile.github, "github")}</li>` : ""
  ]
    .filter(Boolean)
    .join("");

  const mainSections = [
    summaryMarkup ? `<section><h3 class="section-label">${getCvTranslation("sections.summary")}</h3>${summaryMarkup}</section>` : "",
    experienceMarkup
      ? `<section><h3 class="section-label">${getCvTranslation("sections.experience")}</h3>${experienceMarkup}</section>`
      : "",
    educationMarkup ? `<section><h3 class="section-label">${getCvTranslation("sections.education")}</h3>${educationMarkup}</section>` : ""
  ]
    .filter(Boolean)
    .join("");

  const sidebarSections = [
    detailsList ? `<section><h3 class="section-label">${getCvTranslation("sections.details")}</h3><ul class="details-list">${detailsList}</ul></section>` : "",
    linksList ? `<section><h3 class="section-label">${getCvTranslation("sections.links")}</h3><ul class="links-list">${linksList}</ul></section>` : "",
    skillsMarkup ? `<section><h3 class="section-label">${getCvTranslation("sections.skills")}</h3>${skillsMarkup}</section>` : "",
    languagesMarkup ? `<section><h3 class="section-label">${getCvTranslation("sections.languages")}</h3>${languagesMarkup}</section>` : ""
  ]
    .filter(Boolean)
    .join("");

  return `
    <article class="resume-page">
      <header class="resume-header">
        <h1 class="resume-name">${escapeHtml(name)}</h1>
        <p class="resume-role">${escapeHtml(title)}</p>
        ${locationInHeader && locationButton ? `<p class="resume-location">${locationButton}</p>` : ""}
      </header>

      <div class="resume-columns${mainSections && sidebarSections ? "" : " single-column"}">
        ${mainSections ? `<div>${mainSections}</div>` : ""}
        ${sidebarSections ? `<aside>${sidebarSections}</aside>` : ""}
      </div>
    </article>
  `;
}

function renderAuroraTemplate() {
  const name = hasText(state.profile.name) ? state.profile.name : getCvTranslation("placeholders.noName");
  const title = hasText(state.profile.title) ? state.profile.title : getCvTranslation("placeholders.noTitle");
  const locationInHeader = toBoolean(state.alpineLocationInHeader, false);
  const summaryMarkup = getSummaryMarkup();
  const skillsMarkup = renderSkillsMarkup();
  const languagesMarkup = renderLanguagesMarkup();
  const locationButton = buildLocationToggle(state.profile.location, locationInHeader, "aurora-location-toggle");

  const details = [
    state.profile.email ? `<li>${buildLink(state.profile.email)}</li>` : "",
    state.profile.phone ? `<li>${buildPhoneMarkup(state.profile.phone)}</li>` : "",
    !locationInHeader && locationButton ? `<li>${locationButton}</li>` : ""
  ]
    .filter(Boolean)
    .join("");

  const links = [
    state.profile.website ? `<li>${buildLink(state.profile.website)}</li>` : "",
    state.profile.linkedin ? `<li>${buildSocialLink(state.profile.linkedin, "linkedin")}</li>` : "",
    state.profile.github ? `<li>${buildSocialLink(state.profile.github, "github")}</li>` : ""
  ]
    .filter(Boolean)
    .join("");

  const experienceEntries = getExperienceItems();
  const educationEntries = getEducationItems();

  const sideSections = [
    summaryMarkup ? `<section><h3 class="section-label">${getCvTranslation("sections.summary")}</h3>${summaryMarkup}</section>` : "",
    details ? `<section><h3 class="section-label">${getCvTranslation("sections.details")}</h3><ul>${details}</ul></section>` : "",
    links ? `<section><h3 class="section-label">${getCvTranslation("sections.links")}</h3><ul>${links}</ul></section>` : "",
    skillsMarkup ? `<section><h3 class="section-label">${getCvTranslation("sections.skills")}</h3>${skillsMarkup}</section>` : "",
    languagesMarkup ? `<section><h3 class="section-label">${getCvTranslation("sections.languages")}</h3>${languagesMarkup}</section>` : ""
  ]
    .filter(Boolean)
    .join("");

  const mainSections = [
    experienceEntries.length
      ? `<section>
            <h3 class="section-label">${getCvTranslation("sections.experience")}</h3>
            <ul class="timeline">${experienceEntries
              .map((item) => {
                const role = hasText(item.role) ? item.role : getCvTranslation("placeholders.jobTitle");
                const company = hasText(item.company) ? item.company : "";
                const location = hasText(item.location) ? item.location : "";
                const metaInline = company
                  ? `${getCvTranslation("labels.at")} ${company}${location ? ` · ${location}` : ""}`
                  : location;
                const dateRange = formatRange(item.start, item.end);
                const bullets = String(item.bullets ?? "")
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean);

                return `
                        <li>
                          <h4 class="entry-title">
                            <span class="entry-role">${escapeHtml(role)}</span>
                            ${metaInline ? `<span class="entry-meta-inline">${escapeHtml(metaInline)}</span>` : ""}
                          </h4>
                          ${dateRange ? `<p class="entry-meta entry-meta-block">${escapeHtml(dateRange)}</p>` : ""}
                          ${bullets.length ? `<ul>${bullets.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
                        </li>
                      `;
              })
              .join("")}</ul>
          </section>`
      : "",
    educationEntries.length
      ? `<section>
            <h3 class="section-label">${getCvTranslation("sections.education")}</h3>
            ${educationEntries
              .map((item) => {
                const degree = hasText(item.degree) ? item.degree : getCvTranslation("placeholders.degree");
                const meta = [item.school, item.location].filter(hasText).join(" · ");

                return `
                        <article class="entry">
                          <div class="entry-topline">
                            <h4 class="entry-title">${escapeHtml(degree)}</h4>
                            <span class="entry-meta">${escapeHtml(formatRange(item.start, item.end))}</span>
                          </div>
                          ${meta ? `<p class="entry-company">${escapeHtml(meta)}</p>` : ""}
                        </article>
                      `;
              })
              .join("")}
          </section>`
      : ""
  ]
    .filter(Boolean)
    .join("");

  return `
    <article class="resume-page">
      <header class="aurora-banner">
        <h1 class="aurora-name">${escapeHtml(name)}</h1>
        <p class="aurora-role">${escapeHtml(title)}</p>
        ${locationInHeader && locationButton ? `<p class="aurora-location">${locationButton}</p>` : ""}
      </header>

      <div class="aurora-shell${sideSections && mainSections ? "" : " single-pane"}">
        ${sideSections ? `<aside class="aurora-side">${sideSections}</aside>` : ""}
        ${mainSections ? `<div class="aurora-main">${mainSections}</div>` : ""}
      </div>
    </article>
  `;
}

function renderAlpineTemplate() {
  const name = hasText(state.profile.name) ? state.profile.name : getCvTranslation("placeholders.noName");
  const title = hasText(state.profile.title) ? state.profile.title : getCvTranslation("placeholders.noTitle");
  const location = state.profile.location;
  const summaryMarkup = getSummaryMarkup();
  const experienceMarkup = renderExperienceEntries();
  const educationMarkup = renderEducationEntries();
  const locationInHeader = toBoolean(state.alpineLocationInHeader, false);

  const metaParts = [escapeHtml(title)].filter(Boolean).join("");

  const phoneIcon = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.86.32 1.7.59 2.5a2 2 0 0 1-.45 2.11L9 10.91a16 16 0 0 0 4.09 4.09l1.58-1.25a2 2 0 0 1 2.11-.45c.8.27 1.64.47 2.5.59A2 2 0 0 1 22 16.92z"/></svg>`;
  const locationButton = buildLocationToggle(
    location,
    locationInHeader,
    "alpine-pin alpine-location-toggle",
    "alpine-detail-meta"
  );
  const phoneMarkup = hasText(state.profile.phone)
    ? `<span class="alpine-pin alpine-phone">${phoneIcon}<span class="alpine-detail-meta">${escapeHtml(state.profile.phone)}</span></span>`
    : "";

  const detailsList = [
    !locationInHeader && locationButton ? `<li>${locationButton}</li>` : "",
    state.profile.email ? `<li>${buildLink(state.profile.email)}</li>` : "",
    phoneMarkup ? `<li>${phoneMarkup}</li>` : ""
  ].filter(Boolean).join("");

  const linksList = [
    state.profile.website ? `<li>${buildLink(state.profile.website)}</li>` : "",
    state.profile.linkedin ? `<li>${buildSocialLink(state.profile.linkedin, "linkedin")}</li>` : "",
    state.profile.github ? `<li>${buildSocialLink(state.profile.github, "github")}</li>` : ""
  ]
    .filter(Boolean)
    .join("");

  const skills = getSkillItems();
  const showSkillLevels = toBoolean(state.showSkillLevels, false);
  const skillsList = skills.length
    ? `<ul class="alpine-skills">${skills
        .map((skill) => {
          const levelMarkup = showSkillLevels
            ? `<span class="alpine-skill-level">${getCvTranslation(`levels.${skill.level}`)}</span>`
            : "";
          return `<li>${escapeHtml(skill.name)}${levelMarkup}</li>`;
        })
        .join("")}</ul>`
    : "";

  const languages = getLanguageItems();
  const showLanguageLevels = toBoolean(state.showLanguageLevels, false);
  const languagesList = languages.length
    ? `<ul class="alpine-skills">${languages
        .map((lang) => {
          const levelMarkup = showLanguageLevels
            ? `<span class="alpine-skill-level">${getCvTranslation(`levels.${lang.level}`)}</span>`
            : "";
          return `<li>${escapeHtml(lang.name)}${levelMarkup}</li>`;
        })
        .join("")}</ul>`
    : "";

  const sidebarSections = [
    detailsList ? `<section><h3 class="alpine-dot-heading">${getCvTranslation("sections.details")}</h3><ul class="alpine-details">${detailsList}</ul></section>` : "",
    linksList ? `<section><h3 class="alpine-dot-heading">${getCvTranslation("sections.links")}</h3><ul class="alpine-links">${linksList}</ul></section>` : "",
    skillsList ? `<section><h3 class="alpine-dot-heading">${getCvTranslation("sections.skills")}</h3>${skillsList}</section>` : "",
    languagesList ? `<section><h3 class="alpine-dot-heading">${getCvTranslation("sections.languages")}</h3>${languagesList}</section>` : ""
  ].filter(Boolean).join("");

  const iconProfile = `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"/><path fill="currentColor" d="M4 20a8 8 0 0 1 16 0v1H4z"/></svg>`;
  const iconWork = `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 3h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v3H2V9a2 2 0 0 1 2-2h4V5a2 2 0 0 1 2-2zm0 4h4V5h-4z"/><path fill="currentColor" d="M2 13h8v2h4v-2h8v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/></svg>`;
  const iconEdu = `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 1 7l11 5 9-4.09V17h2V7L12 2z"/><path fill="currentColor" d="M5 12v5c0 2.21 3.13 4 7 4s7-1.79 7-4v-5l-7 3-7-3z"/></svg>`;

  const mainSections = [
    summaryMarkup
      ? `<section class="alpine-main-section"><h3 class="alpine-icon-heading">${iconProfile} ${getCvTranslation("sections.summary")}</h3><div class="alpine-section-body">${summaryMarkup}</div></section>`
      : "",
    experienceMarkup
      ? `<section class="alpine-main-section"><h3 class="alpine-icon-heading">${iconWork} ${getCvTranslation("sections.experience")}</h3><div class="alpine-section-body">${experienceMarkup}</div></section>`
      : "",
    educationMarkup
      ? `<section class="alpine-main-section"><h3 class="alpine-icon-heading">${iconEdu} ${getCvTranslation("sections.education")}</h3><div class="alpine-section-body">${educationMarkup}</div></section>`
      : ""
  ].filter(Boolean).join("");

  return `
    <article class="resume-page">
      <header class="alpine-header">
        <h1 class="alpine-name">${escapeHtml(name)}</h1>
        <p class="alpine-meta">${metaParts}</p>
        ${locationInHeader && locationButton ? `<p class="alpine-meta alpine-meta-location">${locationButton}</p>` : ""}
      </header>
      <div class="alpine-body${sidebarSections && mainSections ? "" : " alpine-single"}">
        ${sidebarSections ? `<aside class="alpine-sidebar">${sidebarSections}</aside>` : ""}
        ${mainSections ? `<div class="alpine-main">${mainSections}</div>` : ""}
      </div>
    </article>
  `;
}

function renderAtelierTemplate() {
  const name = hasText(state.profile.name) ? state.profile.name : getCvTranslation("placeholders.noName");
  const title = hasText(state.profile.title) ? state.profile.title : getCvTranslation("placeholders.noTitle");
  const locationInHeader = toBoolean(state.alpineLocationInHeader, false);
  const summaryMarkup = getSummaryMarkup();
  const experienceMarkup = renderExperienceEntries();
  const educationMarkup = renderEducationEntries();
  const skillsMarkup = renderSkillsMarkup();
  const languagesMarkup = renderLanguagesMarkup();
  const locationButton = buildLocationToggle(state.profile.location, locationInHeader, "atelier-location-toggle");

  const links = [
    state.profile.website ? `<li>${buildLink(state.profile.website)}</li>` : "",
    state.profile.linkedin ? `<li>${buildSocialLink(state.profile.linkedin, "linkedin")}</li>` : "",
    state.profile.github ? `<li>${buildSocialLink(state.profile.github, "github")}</li>` : ""
  ]
    .filter(Boolean)
    .join("");

  const details = [
    state.profile.email ? `<li>${buildLink(state.profile.email)}</li>` : "",
    state.profile.phone ? `<li>${buildPhoneMarkup(state.profile.phone)}</li>` : "",
    !locationInHeader && locationButton ? `<li>${locationButton}</li>` : ""
  ]
    .filter(Boolean)
    .join("");

  const mainCards = [
    summaryMarkup ? `<section class="card"><h3 class="section-label">${getCvTranslation("sections.summary")}</h3>${summaryMarkup}</section>` : "",
    experienceMarkup
      ? `<section class="card"><h3 class="section-label">${getCvTranslation("sections.experience")}</h3>${experienceMarkup}</section>`
      : "",
    educationMarkup ? `<section class="card"><h3 class="section-label">${getCvTranslation("sections.education")}</h3>${educationMarkup}</section>` : ""
  ]
    .filter(Boolean)
    .join("");

  const sideCards = [
    details ? `<section class="card"><h3 class="section-label">${getCvTranslation("sections.details")}</h3><ul>${details}</ul></section>` : "",
    links ? `<section class="card"><h3 class="section-label">${getCvTranslation("sections.links")}</h3><ul>${links}</ul></section>` : "",
    skillsMarkup ? `<section class="card"><h3 class="section-label">${getCvTranslation("sections.skills")}</h3>${skillsMarkup}</section>` : "",
    languagesMarkup ? `<section class="card"><h3 class="section-label">${getCvTranslation("sections.languages")}</h3>${languagesMarkup}</section>` : ""
  ]
    .filter(Boolean)
    .join("");

  return `
    <article class="resume-page">
      <header class="atelier-head">
        <h1 class="atelier-name">${escapeHtml(name)}</h1>
        <p class="atelier-role">${escapeHtml(title)}</p>
        ${locationInHeader && locationButton ? `<p class="atelier-location">${locationButton}</p>` : ""}
      </header>

      <div class="atelier-grid${mainCards && sideCards ? "" : " single-column"}">
        ${mainCards ? `<div>${mainCards}</div>` : ""}
        ${sideCards ? `<aside>${sideCards}</aside>` : ""}
      </div>
    </article>
  `;
}

const templateCatalog = {
  berlin: {
    render: renderBerlinTemplate,
    baseClass: "template-berlin"
  },
  aurora: {
    render: renderAuroraTemplate,
    baseClass: "template-aurora"
  },
  atelier: {
    render: renderAtelierTemplate,
    baseClass: "template-atelier"
  },
  noir: {
    render: renderBerlinTemplate,
    baseClass: "template-berlin",
    variantClass: "variant-noir"
  },
  fjord: {
    render: renderBerlinTemplate,
    baseClass: "template-berlin",
    variantClass: "variant-fjord"
  },
  solstice: {
    render: renderAuroraTemplate,
    baseClass: "template-aurora",
    variantClass: "variant-solstice"
  },
  bastion: {
    render: renderAuroraTemplate,
    baseClass: "template-aurora",
    variantClass: "variant-bastion"
  },
  slate: {
    render: renderBerlinTemplate,
    baseClass: "template-berlin",
    variantClass: "variant-slate"
  },
  kernel: {
    render: renderBerlinTemplate,
    baseClass: "template-berlin",
    variantClass: "variant-kernel"
  },
  alpine: {
    render: renderAlpineTemplate,
    baseClass: "template-alpine"
  }
};

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
function isResumeBlank() {
  const profileHasContent = Object.values(state.profile).some(hasText);
  const summaryHasContent = hasText(state.summary);
  const experienceHasContent = getExperienceItems().length > 0;
  const educationHasContent = getEducationItems().length > 0;
  const skillsHasContent = getSkillItems().length > 0;
  const languagesHasContent = getLanguageItems().length > 0;

  return !(profileHasContent || summaryHasContent || experienceHasContent || educationHasContent || skillsHasContent || languagesHasContent);
}

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
  const templateConfig = templateCatalog[state.template] ?? templateCatalog.alpine;
  refs.resumePreview.className =
    `resume-preview ${templateConfig.baseClass}${templateConfig.variantClass ? ` ${templateConfig.variantClass}` : ""}`;
  refs.resumePreview.innerHTML = templateConfig.render();
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
    line.dataset.label = `page ${i + 1}`;
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
