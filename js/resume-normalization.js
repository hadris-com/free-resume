import { isSupportedLanguage } from "./i18n.js";
import { toBoolean, toInputText } from "./utils.js";

export const skillLevels = ["beginner", "intermediate", "advanced", "expert"];

const rootKeys = new Set([
  "lang",
  "uiLang",
  "cvLang",
  "template",
  "theme",
  "showSkills",
  "showSkillLevels",
  "showLanguageLevels",
  "nameFontSize",
  "alpineLocationInHeader",
  "profile",
  "summary",
  "experience",
  "education",
  "skills",
  "languages"
]);

const profileKeys = new Set(["name", "title", "email", "phone", "location", "website", "linkedin", "github"]);
const experienceKeys = new Set(["role", "company", "location", "start", "end", "bullets", "isCollapsed"]);
const educationKeys = new Set(["degree", "school", "location", "start", "end", "isCollapsed"]);
const skillKeys = new Set(["name", "level", "showLevel"]);

const fieldLimits = {
  lang: 8,
  template: 32,
  theme: 16,
  profile: 256,
  summary: 10000,
  role: 160,
  company: 160,
  location: 160,
  period: 64,
  bullets: 16000,
  degree: 180,
  school: 180,
  skillName: 80,
  listLength: 100
};

export function normalizeSkillLevel(level) {
  return skillLevels.includes(level) ? level : "intermediate";
}

export function createResumeNormalization({ templateCatalog }) {
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
  }

  function hasOnlyKeys(value, allowedKeys) {
    return Object.keys(value).every((key) => allowedKeys.has(key));
  }

  function isOptionalString(value, maxLength) {
    if (value === undefined || value === null) {
      return true;
    }
    return typeof value === "string" && value.length <= maxLength;
  }

  function isBooleanLike(value) {
    if (value === undefined || value === null) {
      return true;
    }
    return typeof value === "boolean" || typeof value === "number" || typeof value === "string";
  }

  function isSkillLevelLike(value) {
    if (value === undefined || value === null) {
      return true;
    }
    return typeof value === "string" && skillLevels.includes(value);
  }

  function isListOfObjects(value, maxLength) {
    return Array.isArray(value) && value.length <= maxLength && value.every(isPlainObject);
  }

  function validateProfileShape(profile) {
    return isPlainObject(profile) &&
      hasOnlyKeys(profile, profileKeys) &&
      isOptionalString(profile.name, fieldLimits.profile) &&
      isOptionalString(profile.title, fieldLimits.profile) &&
      isOptionalString(profile.email, fieldLimits.profile) &&
      isOptionalString(profile.phone, fieldLimits.profile) &&
      isOptionalString(profile.location, fieldLimits.profile) &&
      isOptionalString(profile.website, fieldLimits.profile) &&
      isOptionalString(profile.linkedin, fieldLimits.profile) &&
      isOptionalString(profile.github, fieldLimits.profile);
  }

  function validateExperienceShape(experience) {
    if (!isListOfObjects(experience, fieldLimits.listLength)) {
      return false;
    }

    return experience.every((item) =>
      hasOnlyKeys(item, experienceKeys) &&
      isOptionalString(item.role, fieldLimits.role) &&
      isOptionalString(item.company, fieldLimits.company) &&
      isOptionalString(item.location, fieldLimits.location) &&
      isOptionalString(item.start, fieldLimits.period) &&
      isOptionalString(item.end, fieldLimits.period) &&
      isOptionalString(item.bullets, fieldLimits.bullets) &&
      isBooleanLike(item.isCollapsed)
    );
  }

  function validateEducationShape(education) {
    if (!isListOfObjects(education, fieldLimits.listLength)) {
      return false;
    }

    return education.every((item) =>
      hasOnlyKeys(item, educationKeys) &&
      isOptionalString(item.degree, fieldLimits.degree) &&
      isOptionalString(item.school, fieldLimits.school) &&
      isOptionalString(item.location, fieldLimits.location) &&
      isOptionalString(item.start, fieldLimits.period) &&
      isOptionalString(item.end, fieldLimits.period) &&
      isBooleanLike(item.isCollapsed)
    );
  }

  function validateSkillLikeListShape(list) {
    if (!isListOfObjects(list, fieldLimits.listLength)) {
      return false;
    }

    return list.every((item) =>
      hasOnlyKeys(item, skillKeys) &&
      isOptionalString(item.name, fieldLimits.skillName) &&
      isSkillLevelLike(item.level) &&
      isBooleanLike(item.showLevel)
    );
  }

  function validateResumeShape(rawState) {
    if (!isPlainObject(rawState)) {
      return false;
    }

    if (!hasOnlyKeys(rawState, rootKeys)) {
      return false;
    }

    if (!isOptionalString(rawState.lang, fieldLimits.lang) ||
      !isOptionalString(rawState.uiLang, fieldLimits.lang) ||
      !isOptionalString(rawState.cvLang, fieldLimits.lang) ||
      !isOptionalString(rawState.template, fieldLimits.template) ||
      !isOptionalString(rawState.theme, fieldLimits.theme) ||
      !isBooleanLike(rawState.showSkills) ||
      !isBooleanLike(rawState.showSkillLevels) ||
      !isBooleanLike(rawState.showLanguageLevels) ||
      !isBooleanLike(rawState.alpineLocationInHeader) ||
      !isOptionalString(rawState.summary, fieldLimits.summary)) {
      return false;
    }

    if (typeof rawState.lang === "string" && !isSupportedLanguage(rawState.lang)) {
      return false;
    }

    if (typeof rawState.uiLang === "string" && !isSupportedLanguage(rawState.uiLang)) {
      return false;
    }

    if (typeof rawState.cvLang === "string" && !isSupportedLanguage(rawState.cvLang)) {
      return false;
    }

    if (typeof rawState.template === "string" && !Object.prototype.hasOwnProperty.call(templateCatalog, rawState.template)) {
      return false;
    }

    if (typeof rawState.theme === "string" && rawState.theme !== "dark" && rawState.theme !== "light") {
      return false;
    }

    if (rawState.nameFontSize !== undefined && rawState.nameFontSize !== null) {
      const parsedNameSize = Number(rawState.nameFontSize);
      if (!Number.isFinite(parsedNameSize) || parsedNameSize < 1 || parsedNameSize > 1000) {
        return false;
      }
    }

    if (rawState.profile !== undefined && rawState.profile !== null && !validateProfileShape(rawState.profile)) {
      return false;
    }

    if (rawState.experience !== undefined && rawState.experience !== null && !validateExperienceShape(rawState.experience)) {
      return false;
    }

    if (rawState.education !== undefined && rawState.education !== null && !validateEducationShape(rawState.education)) {
      return false;
    }

    if (rawState.skills !== undefined && rawState.skills !== null && !validateSkillLikeListShape(rawState.skills)) {
      return false;
    }

    if (rawState.languages !== undefined && rawState.languages !== null && !validateSkillLikeListShape(rawState.languages)) {
      return false;
    }

    return true;
  }

  function sanitizeExperienceItem(item) {
    return {
      role: toInputText(item?.role),
      company: toInputText(item?.company),
      location: toInputText(item?.location),
      start: toInputText(item?.start),
      end: toInputText(item?.end),
      bullets: toInputText(item?.bullets),
      isCollapsed: toBoolean(item?.isCollapsed, false)
    };
  }

  function sanitizeEducationItem(item) {
    return {
      degree: toInputText(item?.degree),
      school: toInputText(item?.school),
      location: toInputText(item?.location),
      start: toInputText(item?.start),
      end: toInputText(item?.end),
      isCollapsed: toBoolean(item?.isCollapsed, false)
    };
  }

  function sanitizeSkillItem(item) {
    const source = item && typeof item === "object" ? item : { name: item };

    return {
      name: toInputText(source?.name),
      level: normalizeSkillLevel(source?.level),
      showLevel: toBoolean(source?.showLevel, false)
    };
  }

  function sanitizeLanguageItem(item) {
    const source = item && typeof item === "object" ? item : { name: item };

    return {
      name: toInputText(source?.name),
      level: normalizeSkillLevel(source?.level),
      showLevel: toBoolean(source?.showLevel, false)
    };
  }

  function sanitizeResumeState(rawState) {
    const source = rawState && typeof rawState === "object" ? rawState : {};
    const profileSource = source.profile && typeof source.profile === "object" ? source.profile : {};
    const fallbackLang = isSupportedLanguage(source.lang) ? source.lang : "en";
    const uiLang = isSupportedLanguage(source.uiLang) ? source.uiLang : fallbackLang;
    const cvLang = isSupportedLanguage(source.cvLang) ? source.cvLang : fallbackLang;
    const legacyShowLevels = Array.isArray(source.skills)
      ? source.skills.some((item) => toBoolean(item?.showLevel, false))
      : false;
    const showSkillLevels = toBoolean(source.showSkillLevels, legacyShowLevels);

    return {
      lang: uiLang,
      uiLang,
      cvLang,
      template: typeof source.template === "string" && templateCatalog[source.template] ? source.template : "alpine",
      theme: source.theme === "dark" ? "dark" : "light",
      showSkills: Boolean(source.showSkills),
      showSkillLevels,
      showLanguageLevels: toBoolean(source.showLanguageLevels, false),
      nameFontSize: Math.max(60, Math.min(140, Number(source.nameFontSize) || 100)),
      alpineLocationInHeader: toBoolean(source.alpineLocationInHeader, false),
      profile: {
        name: toInputText(profileSource.name),
        title: toInputText(profileSource.title),
        email: toInputText(profileSource.email),
        phone: toInputText(profileSource.phone),
        location: toInputText(profileSource.location),
        website: toInputText(profileSource.website),
        linkedin: toInputText(profileSource.linkedin),
        github: toInputText(profileSource.github)
      },
      summary: toInputText(source.summary),
      experience: Array.isArray(source.experience) ? source.experience.map((item) => sanitizeExperienceItem(item)) : [],
      education: Array.isArray(source.education) ? source.education.map((item) => sanitizeEducationItem(item)) : [],
      skills: Array.isArray(source.skills) ? source.skills.map((item) => sanitizeSkillItem(item)) : [],
      languages: Array.isArray(source.languages) ? source.languages.map((item) => sanitizeLanguageItem(item)) : []
    };
  }

  return {
    sanitizeResumeState,
    validateResumeShape
  };
}
