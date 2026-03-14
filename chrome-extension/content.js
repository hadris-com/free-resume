/**
 * Content script — runs on linkedin.com/in/* at document_idle.
 * Listens for { action: "extract" } from popup.js and responds
 * with raw LinkedIn profile data scraped from the current DOM.
 *
 * All selectors use optional chaining so missing sections produce
 * empty strings / arrays rather than errors.
 */

function getText(el) {
  return el?.textContent?.trim() ?? "";
}

function extractName() {
  return getText(document.querySelector("h1.text-heading-xlarge"));
}

function extractHeadline() {
  const candidates = document.querySelectorAll(".text-body-medium.break-words");
  return getText(candidates[0]);
}

function extractLocation() {
  const el = document.querySelector(
    ".text-body-small.inline.t-black--light.break-words"
  );
  return getText(el);
}

function extractEmail() {
  const link = document.querySelector('.ci-email a[href^="mailto:"]');
  return link ? link.href.replace("mailto:", "").trim() : "";
}

function extractAbout() {
  const section = document.querySelector("section:has(#about)");
  if (!section) return "";
  // aria-hidden spans always have the full text even when "See more" is collapsed
  const spans = section.querySelectorAll(
    ".pv-shared-text-with-see-more span[aria-hidden='true']"
  );
  return Array.from(spans)
    .map((s) => s.textContent.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 10000);
}

function parseDateRange(rawText) {
  // Normalise en-dash (–) and em-dash (—) to hyphen before splitting
  const normalized = (rawText ?? "").replace(/[–—]/g, "-");
  const parts = normalized.split("-").map((p) => p.trim());
  // Strip duration suffix like "· 3 yrs 3 mos" or "· 1 yr"
  const start = (parts[0] ?? "").split("·")[0].trim();
  const end = (parts[1] ?? "").split("·")[0].trim();
  return { start, end };
}

// ---------------------------------------------------------------------------
// Description extraction — tries multiple strategies because LinkedIn's class
// names vary between account types and A/B test cohorts.
// ---------------------------------------------------------------------------
function extractDescription(li) {
  // Strategy 1: explicit description container class
  const container = li.querySelector(".pv-shared-text-with-see-more");
  if (container) {
    const text = Array.from(
      container.querySelectorAll("span[aria-hidden='true']")
    )
      .map((s) => s.textContent.trim())
      .filter(Boolean)
      .join("\n");
    if (text) return text;
  }

  // Strategy 2: any aria-hidden span long enough to be descriptive text
  // (role titles / company names / dates are short; descriptions are long)
  const allSpans = Array.from(li.querySelectorAll("span[aria-hidden='true']"));
  const longText = allSpans
    .map((s) => s.textContent.trim())
    .filter((t) => t.length > 60)
    .join("\n");
  return longText;
}

// ---------------------------------------------------------------------------
// Extract a single role/position entry from a <li> element.
// defaultCompany is passed in when the company name lives in a parent <li>
// (LinkedIn's "multiple roles at same company" pattern).
// ---------------------------------------------------------------------------
function extractRoleEntry(li, defaultCompany) {
  const boldSpans = li.querySelectorAll(".mr1.t-bold span[aria-hidden='true']");
  const role = getText(boldSpans[0]);

  const normalSpans = li.querySelectorAll(
    ".t-14.t-normal span[aria-hidden='true']"
  );
  // Strip employment-type suffix e.g. "CLARK · Full-time" → "CLARK"
  const companyRaw = defaultCompany || getText(normalSpans[0]);
  const company = companyRaw.split("·")[0].trim();

  const lightSpans = li.querySelectorAll(
    ".t-14.t-normal.t-black--light span[aria-hidden='true']"
  );
  // Strip remote/hybrid suffix e.g. "Berlin, Germany · Remote"
  const location = getText(lightSpans[0]).split("·")[0].trim();

  // Caption wrapper holds the date range. Note: aria-hidden is on inner spans,
  // not the wrapper div itself — do NOT add [aria-hidden='true'] here.
  const caption = li.querySelector(".pvs-entity__caption-wrapper");
  const { start, end } = parseDateRange(getText(caption));

  const bullets = extractDescription(li);

  return { role, company, location, start, end, bullets };
}

// ---------------------------------------------------------------------------
// Experience — handles both simple (1 role) and grouped (company with several
// roles) LinkedIn layout patterns.
// ---------------------------------------------------------------------------
function extractExperience() {
  const section = document.querySelector("section:has(#experience)");
  if (!section) return [];

  // The top-level list is the first ul inside the section
  const topUl = section.querySelector("ul");
  if (!topUl) return [];

  const results = [];

  for (const li of topUl.querySelectorAll(":scope > li")) {
    // Grouped pattern: the item has a nested ul (sub-roles under one employer)
    const nestedUl = li.querySelector("ul");
    if (nestedUl) {
      // The company name is in the bold span of this parent item
      const companyEl =
        li.querySelector(".mr1.t-bold span[aria-hidden='true']") ||
        li.querySelector(".hoverable-link-text span[aria-hidden='true']");
      const company = getText(companyEl).split("·")[0].trim();

      for (const nestedLi of nestedUl.querySelectorAll(":scope > li")) {
        const entry = extractRoleEntry(nestedLi, company);
        if (entry.role) results.push(entry);
      }
    } else {
      // Simple pattern: single role entry
      const entry = extractRoleEntry(li, "");
      if (entry.role || entry.company) results.push(entry);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------
function extractEducation() {
  const section = document.querySelector("section:has(#education)");
  if (!section) return [];

  const items = section.querySelectorAll("ul > li.artdeco-list__item");
  return Array.from(items)
    .map((li) => {
      const boldSpans = li.querySelectorAll(
        ".mr1.t-bold span[aria-hidden='true']"
      );
      const school = getText(boldSpans[0]);

      const normalSpans = li.querySelectorAll(
        ".t-14.t-normal span[aria-hidden='true']"
      );
      const degree = getText(normalSpans[0]);

      // Same fix: no [aria-hidden='true'] on the caption wrapper
      const caption = li.querySelector(".pvs-entity__caption-wrapper");
      const { start, end } = parseDateRange(getText(caption));

      return { school, degree, start, end };
    })
    .filter((e) => e.school || e.degree);
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------
function extractSkills() {
  const section = document.querySelector("section:has(#skills)");
  if (!section) return [];

  const items = section.querySelectorAll("ul > li.artdeco-list__item");
  return Array.from(items)
    .map((li) => {
      const el =
        li.querySelector(".mr1.hoverable-link-text.t-bold span[aria-hidden='true']") ||
        li.querySelector(".mr1.t-bold span[aria-hidden='true']");
      return getText(el);
    })
    .filter(Boolean)
    .slice(0, 100);
}

// ---------------------------------------------------------------------------
// Languages — map LinkedIn proficiency labels to free-resume level enum
// ---------------------------------------------------------------------------
const PROFICIENCY_TO_LEVEL = {
  // English labels
  "native or bilingual proficiency": "expert",
  "full professional proficiency": "advanced",
  "professional working proficiency": "advanced",
  "limited working proficiency": "intermediate",
  "elementary proficiency": "beginner",
  // Spanish labels (LinkedIn translates based on profile language)
  "competencia bilingüe o nativa": "expert",
  "competencia profesional completa": "advanced",
  "competencia profesional": "advanced",
  "competencia laboral limitada": "intermediate",
  "competencia elemental": "beginner",
};

function mapProficiencyLevel(raw) {
  return PROFICIENCY_TO_LEVEL[(raw ?? "").toLowerCase().trim()] ?? "intermediate";
}

function extractLanguages() {
  const section = document.querySelector("section:has(#languages)");
  if (!section) return [];

  const items = section.querySelectorAll("ul > li.artdeco-list__item");
  return Array.from(items)
    .map((li) => {
      // Language name — try bold span first, fall back to any aria-hidden span
      const nameEl =
        li.querySelector(".mr1.t-bold span[aria-hidden='true']") ||
        li.querySelector(".hoverable-link-text.t-bold span[aria-hidden='true']") ||
        li.querySelector("span[aria-hidden='true']");
      const name = getText(nameEl);

      // Proficiency text — usually in the lighter/smaller line
      const levelEl =
        li.querySelector(".t-14.t-normal.t-black--light span[aria-hidden='true']") ||
        li.querySelector(".t-14.t-normal span[aria-hidden='true']");
      const level = mapProficiencyLevel(getText(levelEl));

      return { name, level };
    })
    .filter((l) => l.name);
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== "extract") return;

  const data = {
    name: extractName(),
    headline: extractHeadline(),
    location: extractLocation(),
    email: extractEmail(),
    about: extractAbout(),
    profileUrl: window.location.href,
    experience: extractExperience(),
    education: extractEducation(),
    skills: extractSkills(),
    languages: extractLanguages()
  };

  sendResponse(data);
  return true;
});
