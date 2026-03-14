import { toBoolean } from "./utils.js";

export function createFactories({ getState }) {
  function createExperience() {
    return {
      role: "",
      company: "",
      location: "",
      start: "",
      end: "",
      bullets: "",
      isCollapsed: false
    };
  }

  function createEducation() {
    return {
      degree: "",
      school: "",
      location: "",
      start: "",
      end: "",
      isCollapsed: false
    };
  }

  function createSkill() {
    const state = getState();

    return {
      name: "",
      level: "intermediate",
      showLevel: toBoolean(state.showSkillLevels, false)
    };
  }

  function createLanguage() {
    const state = getState();

    return {
      name: "",
      level: "intermediate",
      showLevel: toBoolean(state.showLanguageLevels, false)
    };
  }

  return {
    createExperience,
    createEducation,
    createSkill,
    createLanguage
  };
}
