import { hasText } from "./utils.js";

const rawExportConfig = {
  app: "free-resume",
  schemaVersion: 2
};

const localDraftConfig = {
  key: "free-resume:draft"
};

export function createPersistence({ getState, sanitizeResumeState }) {
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
    parseRawResumePayload,
    loadDraftFromLocalStorage,
    saveDraftToLocalStorage,
    downloadRawResume
  };
}
