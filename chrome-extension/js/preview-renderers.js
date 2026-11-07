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
    renderer: "columns",
    baseClass: "template-columns",
    variantClass: "variant-noir"
  },
  fjord: {
    renderer: "fjord",
    baseClass: "template-fjord"
  },
  solstice: {
    renderer: "solstice",
    baseClass: "template-solstice"
  },
  bastion: {
    renderer: "bastion",
    baseClass: "template-bastion"
  },
  slate: {
    renderer: "columns",
    baseClass: "template-columns",
    variantClass: "variant-slate"
  },
  kernel: {
    renderer: "kernel",
    baseClass: "template-kernel"
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
      return `${cleanStart} – ${cleanEnd}`;
    }

    if (cleanStart) {
      return `${cleanStart} – ${getCvTranslation("placeholders.present")}`;
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

  // Every entry in every template: the title and date share a line, and the org sits below them.
  function renderEntry({ title, org, date, bullets = [] }) {
    return `
        <article class="entry">
          <div class="entry-topline">
            <h4 class="entry-title">${escapeHtml(title)}</h4>
            ${date ? `<span class="entry-date">${escapeHtml(date)}</span>` : ""}
          </div>
          ${org ? `<p class="entry-org">${escapeHtml(org)}</p>` : ""}
          ${bullets.length ? `<ul>${bullets.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>` : ""}
        </article>
      `;
  }

  function renderExperienceEntries() {
    return getExperienceItems()
      .map((item) =>
        renderEntry({
          title: hasText(item.role) ? item.role : getCvTranslation("placeholders.jobTitle"),
          org: [item.company, item.location].filter(hasText).join(" · "),
          date: formatRange(item.start, item.end),
          bullets: String(item.bullets ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        })
      )
      .join("");
  }

  function renderEducationEntries() {
    return getEducationItems()
      .map((item) =>
        renderEntry({
          title: hasText(item.degree) ? item.degree : getCvTranslation("placeholders.degree"),
          org: [item.school, item.location].filter(hasText).join(" · "),
          date: formatRange(item.start, item.end)
        })
      )
      .join("");
  }

  function renderTagList(items, showLevels) {
    if (!items.length) {
      return "";
    }

    return `<ul class="tag-list">${items
      .map((item) => {
        const level = showLevels ? `<span class="tag-level">${getCvTranslation(`levels.${item.level}`)}</span>` : "";
        return `<li>${escapeHtml(item.name)}${level}</li>`;
      })
      .join("")}</ul>`;
  }

  function renderSkillsMarkup() {
    return renderTagList(getSkillItems(), toBoolean(getState().showSkillLevels, false));
  }

  function renderLanguagesMarkup() {
    return renderTagList(getLanguageItems(), toBoolean(getState().showLanguageLevels, false));
  }

  function renderSection(labelKey, body, className = "") {
    if (!body) {
      return "";
    }

    const classAttr = className ? ` class="${className}"` : "";
    return `<section${classAttr}><h3 class="section-label">${getCvTranslation(`sections.${labelKey}`)}</h3>${body}</section>`;
  }

  function renderList(items, className) {
    return items.length ? `<ul class="${className}">${items.join("")}</ul>` : "";
  }

  // What every template except Alpine shows at the top or in its contact lists.
  function getIdentity() {
    const state = getState();
    const { profile } = state;
    const locationInHeader = toBoolean(state.alpineLocationInHeader, false);
    const locationButton = buildLocationToggle(profile.location, locationInHeader);

    return {
      name: escapeHtml(hasText(profile.name) ? profile.name : getCvTranslation("placeholders.noName")),
      title: escapeHtml(hasText(profile.title) ? profile.title : getCvTranslation("placeholders.noTitle")),
      headerLocation: locationInHeader && locationButton ? `<p class="resume-location">${locationButton}</p>` : "",
      details: [
        profile.email ? `<li>${buildLink(profile.email)}</li>` : "",
        profile.phone ? `<li>${buildLink(profile.phone)}</li>` : "",
        !locationInHeader && locationButton ? `<li>${locationButton}</li>` : ""
      ].filter(Boolean),
      links: [
        profile.website ? `<li>${buildLink(profile.website)}</li>` : "",
        profile.linkedin ? `<li>${buildSocialLink(profile.linkedin, "linkedin", { plain: true })}</li>` : "",
        profile.github ? `<li>${buildSocialLink(profile.github, "github", { plain: true })}</li>` : ""
      ].filter(Boolean)
    };
  }

  // Header above a main column and a side column, shared by Noir and Slate.
  function renderColumnsTemplate() {
    const identity = getIdentity();
    const main = [
      renderSection("summary", getSummaryMarkup()),
      renderSection("experience", renderExperienceEntries()),
      renderSection("education", renderEducationEntries())
    ].join("");
    const side = [
      renderSection("details", renderList(identity.details, "contact-list")),
      renderSection("links", renderList(identity.links, "contact-list")),
      renderSection("skills", renderSkillsMarkup()),
      renderSection("languages", renderLanguagesMarkup())
    ].join("");

    return `
    <article class="resume-page">
      <header class="resume-header">
        <h1 class="resume-name">${identity.name}</h1>
        <p class="resume-role">${identity.title}</p>
        ${identity.headerLocation}
      </header>

      <div class="resume-columns${main && side ? "" : " single-column"}">
        ${main ? `<div>${main}</div>` : ""}
        ${side ? `<aside>${side}</aside>` : ""}
      </div>
    </article>
  `;
  }

  // A side column on the left, with the work history running down a timeline.
  function renderAuroraTemplate() {
    const identity = getIdentity();
    const experience = renderExperienceEntries();
    const education = renderEducationEntries();
    const side = [
      renderSection("summary", getSummaryMarkup()),
      renderSection("details", renderList(identity.details, "contact-list")),
      renderSection("links", renderList(identity.links, "contact-list")),
      renderSection("skills", renderSkillsMarkup()),
      renderSection("languages", renderLanguagesMarkup())
    ].join("");
    const main = [
      renderSection("experience", experience ? `<div class="timeline">${experience}</div>` : ""),
      renderSection("education", education ? `<div class="timeline">${education}</div>` : "")
    ].join("");

    return `
    <article class="resume-page">
      <header class="aurora-head">
        <h1 class="aurora-name">${identity.name}</h1>
        <p class="aurora-role">${identity.title}</p>
        ${identity.headerLocation}
      </header>

      <div class="aurora-shell${side && main ? "" : " single-pane"}">
        ${side ? `<aside class="aurora-side">${side}</aside>` : ""}
        ${main ? `<div class="aurora-main">${main}</div>` : ""}
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

    const sidebarSections = [
      renderSection("details", detailsList && `<ul class="contact-list">${detailsList}</ul>`),
      renderSection("links", linksList && `<ul class="contact-list">${linksList}</ul>`),
      renderSection("skills", renderSkillsMarkup()),
      renderSection("languages", renderLanguagesMarkup())
    ].join("");

    const iconProfile = `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"/><path fill="currentColor" d="M4 20a8 8 0 0 1 16 0v1H4z"/></svg>`;
    const iconWork = `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 3h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v3H2V9a2 2 0 0 1 2-2h4V5a2 2 0 0 1 2-2zm0 4h4V5h-4z"/><path fill="currentColor" d="M2 13h8v2h4v-2h8v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/></svg>`;
    const iconEdu = `<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 1 7l11 5 9-4.09V17h2V7L12 2z"/><path fill="currentColor" d="M5 12v5c0 2.21 3.13 4 7 4s7-1.79 7-4v-5l-7 3-7-3z"/></svg>`;

    const mainSections = [
      summaryMarkup
        ? `<section class="alpine-main-section"><h3 class="section-label alpine-icon-heading">${iconProfile} ${getCvTranslation("sections.summary")}</h3><div class="alpine-section-body"><article class="entry">${summaryMarkup}</article></div></section>`
        : "",
      experienceMarkup
        ? `<section class="alpine-main-section"><h3 class="section-label alpine-icon-heading">${iconWork} ${getCvTranslation("sections.experience")}</h3><div class="alpine-section-body">${experienceMarkup}</div></section>`
        : "",
      educationMarkup
        ? `<section class="alpine-main-section"><h3 class="section-label alpine-icon-heading">${iconEdu} ${getCvTranslation("sections.education")}</h3><div class="alpine-section-body">${educationMarkup}</div></section>`
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

  // Berlin keeps its original look: its own entries, chips and date format, outside the shared rules.
  function formatBerlinRange(start, end) {
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

  function renderBerlinExperience() {
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
        const dateRange = formatBerlinRange(item.start, item.end);
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

  function renderBerlinEducation() {
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
            <span class="entry-meta">${escapeHtml(formatBerlinRange(item.start, item.end))}</span>
          </div>
          ${schoolLocation ? `<p class="entry-company">${escapeHtml(schoolLocation)}</p>` : ""}
        </article>
      `;
      })
      .join("");
  }

  function renderBerlinSkills() {
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

  function renderBerlinLanguages() {
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
    const experienceMarkup = renderBerlinExperience();
    const educationMarkup = renderBerlinEducation();
    const skillsMarkup = renderBerlinSkills();
    const languagesMarkup = renderBerlinLanguages();
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

  // Editorial: one column of text under a large name, with the lists set as running text.
  function renderAtelierTemplate() {
    const identity = getIdentity();
    const contact = [...identity.details, ...identity.links];
    const lists = [renderSection("skills", renderSkillsMarkup()), renderSection("languages", renderLanguagesMarkup())].join("");

    return `
    <article class="resume-page">
      <header class="atelier-head">
        <h1 class="atelier-name">${identity.name}</h1>
        <p class="atelier-role">${identity.title}</p>
        ${identity.headerLocation}
        ${renderList(contact, "contact-line")}
      </header>
      ${renderSection("summary", getSummaryMarkup())}
      ${renderSection("experience", renderExperienceEntries())}
      ${renderSection("education", renderEducationEntries())}
      ${lists ? `<div class="atelier-lists">${lists}</div>` : ""}
    </article>
  `;
  }

  // Ledger: a margin column holds the labels and dates, with the content in a column beside it.
  function renderBastionTemplate() {
    const identity = getIdentity();
    const contact = [...identity.details, ...identity.links];

    return `
    <article class="resume-page">
      <header class="bastion-head">
        <h1 class="bastion-name">${identity.name}</h1>
        <p class="bastion-role">${identity.title}</p>
        ${identity.headerLocation}
      </header>
      ${renderSection("details", renderList(contact, "contact-line"), "bastion-row")}
      ${renderSection("summary", getSummaryMarkup(), "bastion-row")}
      ${renderSection("experience", renderExperienceEntries(), "bastion-dated")}
      ${renderSection("education", renderEducationEntries(), "bastion-dated")}
      ${renderSection("skills", renderSkillsMarkup(), "bastion-row")}
      ${renderSection("languages", renderLanguagesMarkup(), "bastion-row")}
    </article>
  `;
  }

  // A solid sidebar down the full height of the page, holding everything but the work history.
  function renderFjordTemplate() {
    const identity = getIdentity();
    const main = [
      renderSection("summary", getSummaryMarkup()),
      renderSection("experience", renderExperienceEntries()),
      renderSection("education", renderEducationEntries())
    ].join("");

    return `
    <article class="resume-page">
      <aside class="fjord-side">
        <header class="fjord-head">
          <h1 class="fjord-name">${identity.name}</h1>
          <p class="fjord-role">${identity.title}</p>
          ${identity.headerLocation}
        </header>
        ${renderSection("details", renderList(identity.details, "contact-list"))}
        ${renderSection("links", renderList(identity.links, "contact-list"))}
        ${renderSection("skills", renderSkillsMarkup())}
        ${renderSection("languages", renderLanguagesMarkup())}
      </aside>
      <div class="fjord-main">${main}</div>
    </article>
  `;
  }

  // A solid band over one column of work history, with the short lists at the foot of the page.
  function renderSolsticeTemplate() {
    const identity = getIdentity();
    const contact = [...identity.details, ...identity.links];
    const foot = [
      renderSection("education", renderEducationEntries(), "solstice-education"),
      renderSection("skills", renderSkillsMarkup(), "solstice-skills"),
      renderSection("languages", renderLanguagesMarkup(), "solstice-languages")
    ].join("");

    return `
    <article class="resume-page">
      <header class="solstice-band">
        <div class="solstice-title">
          <h1 class="solstice-name">${identity.name}</h1>
          <p class="solstice-role">${identity.title}</p>
          ${identity.headerLocation}
        </div>
        ${renderList(contact, "contact-list")}
      </header>
      <div class="solstice-body">
        ${renderSection("summary", getSummaryMarkup())}
        ${renderSection("experience", renderExperienceEntries())}
      </div>
      ${foot ? `<footer class="solstice-foot">${foot}</footer>` : ""}
    </article>
  `;
  }

  // Compact: skills come first, and an entry's role, company and date share one line.
  function renderKernelTemplate() {
    const identity = getIdentity();
    const contact = [...identity.details, ...identity.links];
    const facts = [renderSection("skills", renderSkillsMarkup()), renderSection("languages", renderLanguagesMarkup())].join("");

    return `
    <article class="resume-page">
      <header class="kernel-head">
        <div>
          <h1 class="kernel-name">${identity.name}</h1>
          <p class="kernel-role">${identity.title}</p>
          ${identity.headerLocation}
        </div>
        ${renderList(contact, "contact-list")}
      </header>
      ${renderSection("summary", getSummaryMarkup())}
      ${facts ? `<div class="kernel-facts">${facts}</div>` : ""}
      ${renderSection("experience", renderExperienceEntries())}
      ${renderSection("education", renderEducationEntries())}
    </article>
  `;
  }

  const rendererMap = {
    berlin: renderBerlinTemplate,
    columns: renderColumnsTemplate,
    aurora: renderAuroraTemplate,
    atelier: renderAtelierTemplate,
    alpine: renderAlpineTemplate,
    bastion: renderBastionTemplate,
    fjord: renderFjordTemplate,
    solstice: renderSolsticeTemplate,
    kernel: renderKernelTemplate
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
