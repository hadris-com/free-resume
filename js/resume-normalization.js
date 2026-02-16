import { isSupportedLanguage } from "./i18n.js";
import { toBoolean, toInputText } from "./utils.js";

export const skillLevels = ["beginner", "intermediate", "advanced", "expert"];

export function normalizeSkillLevel(level) {
  return skillLevels.includes(level) ? level : "intermediate";
}

export function createResumeNormalization({ templateCatalog }) {
  function sanitizeExperienceItem(item) {
    return {
      role: toInputText(item?.role),
      company: toInputText(item?.company),
      location: toInputText(item?.location),
      start: toInputText(item?.start),
      end: toInputText(item?.end),
      bullets: toInputText(item?.bullets)
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
    sanitizeResumeState
  };
}
