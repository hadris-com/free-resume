import { toBoolean } from "./utils.js";

export function createStateSync({ state, refs, uiControls, getSampleModeEnabled }) {
  function syncStaticInputsFromState() {
    refs.templateSelect.value = state.template;
    uiControls.syncTemplateSelectUI();

    document.querySelectorAll("[data-profile]").forEach((input) => {
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      const key = input.dataset.profile;
      if (!key) {
        return;
      }

      input.value = state.profile[key] ?? "";
    });

    if (refs.nameSizeSlider) {
      refs.nameSizeSlider.value = String(state.nameFontSize);
    }
    if (refs.nameSizeOutput) {
      refs.nameSizeOutput.textContent = `${state.nameFontSize}%`;
    }

    const summaryField = refs.editorPanel.querySelector("[data-field='summary']");
    if (summaryField instanceof HTMLTextAreaElement) {
      summaryField.value = state.summary;
    }
  }

  function applyImportedState(nextState) {
    state.uiLang = nextState.uiLang;
    state.cvLang = nextState.cvLang;
    state.template = nextState.template;
    state.theme = nextState.theme;
    state.showSkills = nextState.showSkills || nextState.skills.length > 0;
    state.showSkillLevels = toBoolean(nextState.showSkillLevels, false);
    state.showLanguageLevels = toBoolean(nextState.showLanguageLevels, false);
    state.nameFontSize = nextState.nameFontSize ?? 100;
    state.alpineLocationInHeader = toBoolean(nextState.alpineLocationInHeader, false);
    state.profile = nextState.profile;
    state.summary = nextState.summary;
    state.experience = nextState.experience;
    state.education = nextState.education;
    state.skills = nextState.skills.map((item) => ({
      ...item,
      showLevel: state.showSkillLevels
    }));
    state.languages = (nextState.languages || []).map((item) => ({
      ...item,
      showLevel: state.showLanguageLevels
    }));
  }

  function syncSampleButtonState() {
    if (!refs.sampleBtn) {
      return;
    }

    refs.sampleBtn.setAttribute("aria-pressed", String(getSampleModeEnabled()));
  }

  return {
    syncStaticInputsFromState,
    applyImportedState,
    syncSampleButtonState
  };
}
