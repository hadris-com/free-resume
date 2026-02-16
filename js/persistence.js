import { isSupportedLanguage } from "./i18n.js";
import { hasText, toBoolean, toInputText } from "./utils.js";

const rawExportConfig = {
  app: "free-resume",
  schemaVersion: 2
};

const localDraftConfig = {
  key: "free-resume:draft"
};

export function createPersistence({ getState, templateCatalog, normalizeSkillLevel }) {
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

  function parseRawResumePayload(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    if (typeof payload.app === "string" && payload.app !== rawExportConfig.app) {
      return null;
    }

    const source =
      payload.data && typeof payload.data === "object"
        ? payload.data
        : payload.resume && typeof payload.resume === "object"
          ? payload.resume
          : payload;

    const hasExpectedShape = ["profile", "summary", "experience", "education", "skills", "template"].some(
      (key) => key in source
    );

    if (!hasExpectedShape) {
      return null;
    }

    return sanitizeResumeState(source);
  }

  function buildRawResumePayload() {
    return {
      app: rawExportConfig.app,
      schemaVersion: rawExportConfig.schemaVersion,
      exportedAt: new Date().toISOString(),
      data: sanitizeResumeState(getState())
    };
  }

  function resetSkillLevelVisibility(resumeState) {
    if (!resumeState) {
      return resumeState;
    }

    const result = { ...resumeState, showSkillLevels: false, showLanguageLevels: false };

    if (Array.isArray(result.skills)) {
      result.skills = result.skills.map((item) => ({ ...item, showLevel: false }));
    }

    if (Array.isArray(result.languages)) {
      result.languages = result.languages.map((item) => ({ ...item, showLevel: false }));
    }

    return result;
  }

  function loadDraftFromLocalStorage() {
    try {
      const rawDraft = window.localStorage.getItem(localDraftConfig.key);

      if (!rawDraft) {
        return null;
      }

      const parsedDraft = JSON.parse(rawDraft);
      const parsedState = parseRawResumePayload(parsedDraft);

      if (!parsedState) {
        return null;
      }

      const storedSchemaVersion = Number(parsedDraft?.schemaVersion);
      if (!Number.isFinite(storedSchemaVersion) || storedSchemaVersion < rawExportConfig.schemaVersion) {
        return resetSkillLevelVisibility(parsedState);
      }

      return parsedState;
    } catch (error) {
      console.warn("Could not load draft from localStorage", error);
      return null;
    }
  }

  function saveDraftToLocalStorage() {
    try {
      window.localStorage.setItem(localDraftConfig.key, JSON.stringify(buildRawResumePayload()));
    } catch (error) {
      console.warn("Could not save draft to localStorage", error);
    }
  }

  function getRawResumeFilename() {
    const state = getState();
    const baseName = hasText(state.profile.name) ? state.profile.name : "resume";
    const safeName = baseName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `${safeName || "resume"}-raw.json`;
  }

  function downloadRawResume() {
    const blob = new Blob([JSON.stringify(buildRawResumePayload(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = getRawResumeFilename();

    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return {
    sanitizeResumeState,
    parseRawResumePayload,
    loadDraftFromLocalStorage,
    saveDraftToLocalStorage,
    downloadRawResume
  };
}
