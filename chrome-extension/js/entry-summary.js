import { getAllTranslations } from "./i18n.js";
import { hasText } from "./utils.js";

// An End value that already reads as "Present" in any supported language (case-insensitive).
export function isPresentValue(value) {
  return getAllTranslations("placeholders.present").includes(String(value ?? "").trim().toLowerCase());
}

const SEPARATOR = " · ";

const summaryConfig = {
  experience: { primary: ["role", "company"], fallback: "entries.newExperience" },
  education: { primary: ["degree", "school"], fallback: "entries.newEducation" }
};

// Collapsed row text for an experience/education entry: "Role · Company" plus a separate dates part.
export function buildEntrySummary(listName, item, getUiTranslation) {
  const config = summaryConfig[listName];
  const title = config.primary
    .map((key) => (hasText(item[key]) ? String(item[key]).trim() : ""))
    .filter(Boolean)
    .join(SEPARATOR);
  const start = hasText(item.start) ? String(item.start).trim() : "";
  const end = hasText(item.end) ? String(item.end).trim() : "";
  const dates = start && end ? `${start} – ${end}` : start || end;

  return {
    title: title || (dates ? "" : getUiTranslation(config.fallback)),
    dates,
    isEmpty: !title && !dates
  };
}
