import { toBoolean } from "./utils.js";

export function createUiControls({ state, refs, getUiTranslation }) {
  function setCollapseTriggerState(trigger, isCollapsed) {
    if (!(trigger instanceof HTMLButtonElement)) {
      return;
    }

    const label = isCollapsed ? getUiTranslation("actions.expand") : getUiTranslation("actions.collapse");
    trigger.classList.toggle("is-collapsed", isCollapsed);
    trigger.setAttribute("aria-expanded", String(!isCollapsed));
    trigger.setAttribute("aria-label", label);
    trigger.setAttribute("title", label);
  }

  function setCollapsibleState(container, bodySelector, isCollapsed, { trigger = null, animate = false } = {}) {
    const body = container.querySelector(bodySelector);

    if (body instanceof HTMLElement) {
      if (animate) {
        if (isCollapsed) {
          body.style.maxHeight = `${body.scrollHeight}px`;
          container.classList.add("is-collapsed");
          void body.offsetHeight;
          body.style.maxHeight = "0px";
        } else {
          container.classList.remove("is-collapsed");
          body.style.maxHeight = "0px";
          void body.offsetHeight;
          body.style.maxHeight = `${body.scrollHeight}px`;
        }
      } else {
        container.classList.toggle("is-collapsed", isCollapsed);
        body.style.maxHeight = isCollapsed ? "0px" : `${body.scrollHeight}px`;
      }

      body.setAttribute("aria-hidden", String(isCollapsed));
    } else {
      container.classList.toggle("is-collapsed", isCollapsed);
    }

    setCollapseTriggerState(trigger, isCollapsed);
  }

  function syncCollapsibleHeights() {
    if (!refs.editorPanel) {
      return;
    }

    refs.editorPanel.querySelectorAll(".section-body, .repeat-item-body").forEach((body) => {
      if (!(body instanceof HTMLElement)) {
        return;
      }

      const container = body.closest(".panel-section, .repeat-item");
      const isCollapsed = container?.classList.contains("is-collapsed");
      body.style.maxHeight = isCollapsed ? "0px" : `${body.scrollHeight}px`;
    });
  }

  function applyTheme() {
    document.body.classList.toggle("theme-dark", state.theme === "dark");
    refs.themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));
  }

  function applyI18n() {
    document.documentElement.lang = state.uiLang;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      if (key) {
        element.textContent = getUiTranslation(key);
      }
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      if (key) {
        element.setAttribute("placeholder", getUiTranslation(key));
      }
    });

    refs.themeToggle.querySelector("[data-role='theme-label']").textContent =
      state.theme === "dark" ? getUiTranslation("actions.lightMode") : getUiTranslation("actions.darkMode");

    document.querySelectorAll(".lang-btn").forEach((button) => {
      const isActive = button.getAttribute("data-lang") === state.uiLang;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    document.querySelectorAll(".cv-lang-btn").forEach((button) => {
      const isActive = button.getAttribute("data-cv-lang") === state.cvLang;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    syncPageSizeUI();
    syncTemplateSelectUI();
    syncSectionToggles();
  }

  function syncPageSizeUI() {
    document.querySelectorAll(".page-size-btn").forEach((button) => {
      const isActive = button.getAttribute("data-page-size") === state.pageSize;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function syncSectionToggles() {
    document.querySelectorAll(".panel-section[data-section]").forEach((section) => {
      const sectionId = section.getAttribute("data-section");
      if (!sectionId) {
        return;
      }
      const isCollapsed = toBoolean(state.collapsedSections?.[sectionId], false);
      const toggle = section.querySelector(".section-toggle");
      setCollapsibleState(section, ".section-body", isCollapsed, { trigger: toggle, animate: false });
    });

    syncCollapsibleHeights();
  }

  function syncTemplateSelectUI() {
    if (!refs.templateSelectMenu || !refs.templateSelectValue || !refs.templateSelectTrigger) {
      return;
    }

    const options = refs.templateSelectMenu.querySelectorAll("[data-value]");
    let selectedLabel = "";
    options.forEach((option) => {
      const value = option.getAttribute("data-value");
      const isSelected = value === state.template;
      option.setAttribute("aria-selected", String(isSelected));
      if (isSelected) {
        selectedLabel = option.textContent?.trim() ?? "";
      }
    });

    if (!selectedLabel) {
      const fallback = refs.templateSelectMenu.querySelector(`[data-value="${state.template}"]`);
      selectedLabel = fallback?.textContent?.trim() ?? "";
    }

    if (selectedLabel) {
      refs.templateSelectValue.textContent = selectedLabel;
    }

    refs.templateSelectTrigger.setAttribute(
      "aria-expanded",
      String(refs.templateSelectWrapper?.classList.contains("is-open"))
    );

    if (refs.templateSelect) {
      refs.templateSelect.value = state.template;
    }
  }

  function closeTemplateSelect() {
    refs.templateSelectWrapper?.classList.remove("is-open");
    refs.templateSelectTrigger?.setAttribute("aria-expanded", "false");
  }

  function toggleTemplateSelect() {
    if (!refs.templateSelectWrapper || !refs.templateSelectTrigger) {
      return;
    }
    const nextOpen = !refs.templateSelectWrapper.classList.contains("is-open");
    refs.templateSelectWrapper.classList.toggle("is-open", nextOpen);
    refs.templateSelectTrigger.setAttribute("aria-expanded", String(nextOpen));
  }

  function updateSelectMenuPlacement(wrapper) {
    if (!wrapper) {
      return;
    }

    const menu = wrapper.querySelector(".custom-select-menu");
    if (!menu) {
      return;
    }

    const editorRect = refs.editorPanel?.getBoundingClientRect();
    const previewRect = refs.previewPanel?.getBoundingClientRect();
    const hasOverlap = editorRect && previewRect
      ? editorRect.top < previewRect.bottom && editorRect.bottom > previewRect.top
      : false;
    const isSideBySide = Boolean(hasOverlap);
    if (!isSideBySide) {
      wrapper.classList.remove("open-up");
      return;
    }

    const trigger = wrapper.querySelector(".custom-select-trigger") || wrapper;
    const triggerRect = trigger.getBoundingClientRect();
    const bounds = editorRect && editorRect.height > 0
      ? editorRect
      : { top: 0, bottom: window.innerHeight };

    const menuHeight = menu.scrollHeight;
    const spaceBelow = bounds.bottom - triggerRect.bottom;
    const spaceAbove = triggerRect.top - bounds.top;
    const shouldOpenUp = menuHeight > spaceBelow && spaceAbove > spaceBelow;

    wrapper.classList.toggle("open-up", shouldOpenUp);
  }

  function setSkillLevelSelectOpen(wrapper, open) {
    wrapper.classList.toggle("is-open", open);
    const trigger = wrapper.querySelector(".custom-select-trigger");
    if (trigger instanceof HTMLButtonElement) {
      trigger.setAttribute("aria-expanded", String(open));
    }
    if (open) {
      requestAnimationFrame(() => updateSelectMenuPlacement(wrapper));
    } else {
      wrapper.classList.remove("open-up");
    }
  }

  function closeSkillLevelSelects(exceptWrapper = null) {
    document.querySelectorAll(".skill-level-select.is-open").forEach((wrapper) => {
      if (exceptWrapper && wrapper === exceptWrapper) {
        return;
      }
      setSkillLevelSelectOpen(wrapper, false);
    });
  }

  function setLanguageLevelSelectOpen(wrapper, open) {
    wrapper.classList.toggle("is-open", open);
    const trigger = wrapper.querySelector(".custom-select-trigger");
    if (trigger instanceof HTMLButtonElement) {
      trigger.setAttribute("aria-expanded", String(open));
    }
    if (open) {
      requestAnimationFrame(() => updateSelectMenuPlacement(wrapper));
    } else {
      wrapper.classList.remove("open-up");
    }
  }

  function closeLanguageLevelSelects(exceptWrapper = null) {
    document.querySelectorAll(".language-level-select.is-open").forEach((wrapper) => {
      if (exceptWrapper && wrapper === exceptWrapper) {
        return;
      }
      setLanguageLevelSelectOpen(wrapper, false);
    });
  }

  function syncEditorPanelHeight() {
    if (!refs.editorPanel || !refs.previewPanel) {
      return;
    }

    syncCollapsibleHeights();

    const isDesktop = window.matchMedia("(min-width: 1181px)").matches;
    if (!isDesktop) {
      refs.editorPanel.style.height = "";
      refs.editorPanel.style.maxHeight = "";
      return;
    }

    const previewHeight = Math.round(refs.previewPanel.getBoundingClientRect().height);
    if (previewHeight > 0) {
      refs.editorPanel.style.height = `${previewHeight}px`;
      refs.editorPanel.style.maxHeight = `${previewHeight}px`;
    }
  }

  return {
    applyTheme,
    applyI18n,
    syncPageSizeUI,
    syncSectionToggles,
    syncTemplateSelectUI,
    closeTemplateSelect,
    toggleTemplateSelect,
    setSkillLevelSelectOpen,
    closeSkillLevelSelects,
    setLanguageLevelSelectOpen,
    closeLanguageLevelSelects,
    setCollapsibleState,
    syncCollapsibleHeights,
    syncEditorPanelHeight
  };
}
