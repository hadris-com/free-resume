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

export const templateCatalog = {
  berlin: {
    renderer: "berlin",
    baseClass: "template-berlin"
  },
  aurora: {
    renderer: "aurora",
    baseClass: "template-aurora"
  },
  atelier: {
    renderer: "atelier",
    baseClass: "template-atelier"
  },
  noir: {
    renderer: "berlin",
    baseClass: "template-berlin",
    variantClass: "variant-noir"
  },
  fjord: {
    renderer: "berlin",
    baseClass: "template-berlin",
    variantClass: "variant-fjord"
  },
  solstice: {
    renderer: "aurora",
    baseClass: "template-aurora",
    variantClass: "variant-solstice"
  },
  bastion: {
    renderer: "aurora",
    baseClass: "template-aurora",
    variantClass: "variant-bastion"
  },
  slate: {
    renderer: "berlin",
    baseClass: "template-berlin",
    variantClass: "variant-slate"
  },
  kernel: {
    renderer: "berlin",
    baseClass: "template-berlin",
    variantClass: "variant-kernel"
  },
  alpine: {
    renderer: "alpine",
    baseClass: "template-alpine"
  }
};

export function createPreviewRenderers({ getState, getUiTranslation, getCvTranslation, normalizeSkillLevel }) {
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

  function getSummaryMarkup() {
    const { summary } = getState();
    return hasText(summary) ? `<p>${formatTextBlock(summary)}</p>` : "";
  }

  function getExperienceItems() {
    const { experience } = getState();
    return experience.filter((item) => hasObjectContent(item));
  }

  function getEducationItems() {
    const { education } = getState();
    return education.filter((item) => hasObjectContent(item));
  }

  function getSkillItems() {
    const { skills } = getState();
    return skills
      .map((item) => ({
        name: String(item.name ?? "").trim(),
        level: normalizeSkillLevel(item.level)
      }))
      .filter((item) => hasText(item.name));
  }

  function getLanguageItems() {
    const { languages } = getState();
    return languages
      .map((item) => ({
        name: String(item.name ?? "").trim(),
        level: normalizeSkillLevel(item.level)
      }))
      .filter((item) => hasText(item.name));
  }

  function renderExperienceEntries() {
    const state = getState();
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
    const state = getState();
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
    const { showSkillLevels } = getState();
    const skills = getSkillItems();
    const showLevels = toBoolean(showSkillLevels, false);

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
    const { showLanguageLevels } = getState();
    const languages = getLanguageItems();
    const showLevels = toBoolean(showLanguageLevels, false);

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

  function renderBerlinTemplate() {
    const state = getState();
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
    const state = getState();
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
    const state = getState();
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
    const state = getState();
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

  const rendererMap = {
    berlin: renderBerlinTemplate,
    aurora: renderAuroraTemplate,
    atelier: renderAtelierTemplate,
    alpine: renderAlpineTemplate
  };

  function resolveTemplate(template) {
    return templateCatalog[template] ? template : "alpine";
  }

  function getTemplateClasses(template) {
    const templateKey = resolveTemplate(template);
    const config = templateCatalog[templateKey];
    return `${config.baseClass}${config.variantClass ? ` ${config.variantClass}` : ""}`;
  }

  function renderTemplate(template) {
    const templateKey = resolveTemplate(template);
    const rendererName = templateCatalog[templateKey].renderer;
    return rendererMap[rendererName]();
  }

  function isResumeBlank() {
    const state = getState();
    const profileHasContent = Object.values(state.profile).some(hasText);
    const summaryHasContent = hasText(state.summary);
    const experienceHasContent = getExperienceItems().length > 0;
    const educationHasContent = getEducationItems().length > 0;
    const skillsHasContent = getSkillItems().length > 0;
    const languagesHasContent = getLanguageItems().length > 0;

    return !(profileHasContent || summaryHasContent || experienceHasContent || educationHasContent || skillsHasContent || languagesHasContent);
  }

  return {
    renderTemplate,
    getTemplateClasses,
    isResumeBlank
  };
}
