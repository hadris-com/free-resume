/**
 * Content script — runs on linkedin.com/in/* at document_idle.
 * Listens for { action: "extract" } from popup.js and responds
 * with raw LinkedIn profile data scraped from the current DOM.
 *
 * All selectors use optional chaining so that missing sections
 * produce empty strings / empty arrays rather than errors.
 * The popup's sanitizeResumeState() pass normalises everything.
 */

function getText(el) {
  return el?.textContent?.trim() ?? "";
}

function extractName() {
  return getText(document.querySelector("h1.text-heading-xlarge"));
}

function extractHeadline() {
  // The headline lives in the first .text-body-medium.break-words below the h1
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
  if (link) {
    return link.href.replace("mailto:", "").trim();
  }
  return "";
}

function extractAbout() {
  // LinkedIn renders the "About" section text in aria-hidden spans to support
  // their "See more" toggle. The aria-hidden span always has the full text.
  const section = document.querySelector("section:has(#about)");
  if (!section) return "";
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
  // Input examples: "Jan 2020 – Mar 2023 · 3 yrs", "Jun 2021 - Present"
  // We normalise both en-dash (–) and hyphen (-) separators.
  const normalized = (rawText ?? "").replace("–", "-");
  const parts = normalized.split("-").map((p) => p.trim());
  // Strip duration suffix ("· 3 yrs 3 mos") from the end part
  const start = (parts[0] ?? "").split("·")[0].trim();
  const end = (parts[1] ?? "").split("·")[0].trim();
  return { start, end };
}

function extractExperience() {
  const section = document.querySelector("section:has(#experience)");
  if (!section) return [];

  const items = section.querySelectorAll("ul > li.artdeco-list__item");
  return Array.from(items)
    .map((li) => {
      // Role is the first bold span
      const boldSpans = li.querySelectorAll(".mr1.t-bold span[aria-hidden='true']");
      const role = getText(boldSpans[0]);

      // Company / subtitle line
      const normalSpans = li.querySelectorAll(
        ".t-14.t-normal span[aria-hidden='true']"
      );
      const company = getText(normalSpans[0]);

      // Location — the lighter, smaller line
      const lightSpans = li.querySelectorAll(
        ".t-14.t-normal.t-black--light span[aria-hidden='true']"
      );
      const location = getText(lightSpans[0]);

      // Date range
      const caption = li.querySelector(
        ".pvs-entity__caption-wrapper[aria-hidden='true']"
      );
      const { start, end } = parseDateRange(getText(caption));

      // Description / bullets
      const descSpans = li.querySelectorAll(
        ".pv-shared-text-with-see-more span[aria-hidden='true']"
      );
      const bullets = Array.from(descSpans)
        .map((s) => s.textContent.trim())
        .filter(Boolean)
        .join("\n");

      return { role, company, location, start, end, bullets };
    })
    .filter((e) => e.role || e.company);
}

function extractEducation() {
  const section = document.querySelector("section:has(#education)");
  if (!section) return [];

  const items = section.querySelectorAll("ul > li.artdeco-list__item");
  return Array.from(items)
    .map((li) => {
      const boldSpans = li.querySelectorAll(".mr1.t-bold span[aria-hidden='true']");
      const school = getText(boldSpans[0]);

      const normalSpans = li.querySelectorAll(
        ".t-14.t-normal span[aria-hidden='true']"
      );
      const degree = getText(normalSpans[0]);

      const caption = li.querySelector(
        ".pvs-entity__caption-wrapper[aria-hidden='true']"
      );
      const { start, end } = parseDateRange(getText(caption));

      return { school, degree, start, end };
    })
    .filter((e) => e.school || e.degree);
}

function extractSkills() {
  const section = document.querySelector("section:has(#skills)");
  if (!section) return [];

  const items = section.querySelectorAll("ul > li.artdeco-list__item");
  return Array.from(items)
    .map((li) => {
      const boldSpan = li.querySelector(
        ".mr1.hoverable-link-text.t-bold span[aria-hidden='true']"
      );
      // Fallback: any first bold span
      const fallback = li.querySelector(".mr1.t-bold span[aria-hidden='true']");
      return getText(boldSpan ?? fallback);
    })
    .filter(Boolean)
    .slice(0, 100);
}

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
    skills: extractSkills()
  };

  sendResponse(data);
  return true; // keep message channel open for async sendResponse
});
