import { getPageMetrics } from "./page-layout.js";
import { toBoolean } from "./utils.js";

// Match --ui-dur-2, --ui-dur-3 and --ui-ease in foundation.css.
const ENTRY_MOTION_MS = 200;
const COLLAPSE_MOTION_MS = 280;
const MOTION_EASING = "cubic-bezier(0.2, 0, 0, 1)";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createUiControls({ state, refs, getUiTranslation }) {
  const collapseTimers = new WeakMap();

  // While this class is on, depth.css clips the body and lets its inline max-height apply.
  function markCollapseAnimating(container) {
    container.classList.add("is-animating");
    clearTimeout(collapseTimers.get(container));
    collapseTimers.set(
      container,
      setTimeout(() => container.classList.remove("is-animating"), COLLAPSE_MOTION_MS + 40)
    );
  }

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
        markCollapseAnimating(container);
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

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const key = element.getAttribute("data-i18n-aria-label");
      if (key) {
        element.setAttribute("aria-label", getUiTranslation(key));
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

    const selectedThumb = refs.templateSelectMenu.querySelector(`[data-value="${state.template}"] img`);
    const thumbSrc = selectedThumb?.getAttribute("src");
    if (refs.templateSelectThumb && thumbSrc && refs.templateSelectThumb.getAttribute("src") !== thumbSrc) {
      refs.templateSelectThumb.setAttribute("src", thumbSrc);
    }

    refs.templateSelectTrigger.setAttribute(
      "aria-expanded",
      String(refs.templateSelectWrapper?.classList.contains("is-open"))
    );

    if (refs.templateSelect) {
      refs.templateSelect.value = state.template;
    }
  }

  function isTemplateSelectOpen() {
    return refs.templateSelectWrapper?.classList.contains("is-open") === true;
  }

  function closeTemplateSelect({ restoreFocus = false } = {}) {
    if (!isTemplateSelectOpen()) {
      return;
    }
    refs.templateSelectWrapper.classList.remove("is-open");
    refs.templateSelectTrigger?.setAttribute("aria-expanded", "false");
    if (restoreFocus) {
      refs.templateSelectTrigger?.focus();
    }
  }

  // Focus lands on the current template, which also scrolls it into view inside the gallery.
  function openTemplateSelect() {
    refs.templateSelectWrapper.classList.add("is-open");
    refs.templateSelectTrigger.setAttribute("aria-expanded", "true");
    refs.templateSelectMenu?.querySelector("[aria-selected='true']")?.focus();
  }

  function toggleTemplateSelect() {
    if (!refs.templateSelectWrapper || !refs.templateSelectTrigger) {
      return;
    }
    if (isTemplateSelectOpen()) {
      closeTemplateSelect({ restoreFocus: true });
    } else {
      openTemplateSelect();
    }
  }

  // Enter and Space need no handling: an option is a button, so they click it.
  function handleTemplateSelectKeydown(event) {
    if (!isTemplateSelectOpen()) {
      if (event.target === refs.templateSelectTrigger && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        openTemplateSelect();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeTemplateSelect({ restoreFocus: true });
      return;
    }

    // Tab leaves from the trigger's place in the page, as in the more menu.
    if (event.key === "Tab") {
      closeTemplateSelect({ restoreFocus: true });
      return;
    }

    const options = [...refs.templateSelectMenu.querySelectorAll("[role='option']")];
    const current = options.indexOf(document.activeElement);
    const columns = window.getComputedStyle(refs.templateSelectMenu).gridTemplateColumns.split(" ").length;
    const targets = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      ArrowDown: current + columns,
      ArrowUp: current - columns,
      Home: 0,
      End: options.length - 1
    };

    if (event.key in targets) {
      event.preventDefault();
      // With focus outside the options, as after a click on the gallery's padding, arrows enter at the current template.
      const next = current === -1 ? refs.templateSelectMenu.querySelector("[aria-selected='true']") : options[targets[event.key]];
      next?.focus();
    }
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

  function setMoreMenuOpen(open) {
    if (!refs.moreMenuList || !refs.moreMenuTrigger) {
      return;
    }
    refs.moreMenuList.hidden = !open;
    refs.moreMenuTrigger.setAttribute("aria-expanded", String(open));
    if (open) {
      refs.moreMenuList.querySelector("[role='menuitem']")?.focus();
    }
  }

  function toggleMoreMenu() {
    setMoreMenuOpen(refs.moreMenuList?.hidden === true);
  }

  function closeMoreMenu({ restoreFocus = false } = {}) {
    if (!refs.moreMenuList || refs.moreMenuList.hidden) {
      return;
    }
    setMoreMenuOpen(false);
    if (restoreFocus) {
      refs.moreMenuTrigger.focus();
    }
  }

  function handleMoreMenuKeydown(event) {
    const { moreMenuList, moreMenuTrigger } = refs;
    const isOpen = !moreMenuList.hidden;

    if (!isOpen) {
      if (event.target === moreMenuTrigger && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        setMoreMenuOpen(true);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMoreMenu({ restoreFocus: true });
      return;
    }

    // Tab leaves the menu from the trigger's place in the page, as if the menu had not been open.
    if (event.key === "Tab") {
      closeMoreMenu({ restoreFocus: true });
      return;
    }

    const items = [...moreMenuList.querySelectorAll("[role='menuitem']")];
    const current = items.indexOf(document.activeElement);
    const targets = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1
    };

    if (event.key in targets) {
      event.preventDefault();
      items[targets[event.key]]?.focus();
    }
  }

  // Scale the page's real width down to the paper area. Layout and print are untouched: see paper-fit.css.
  function syncPaperFit() {
    const { previewPanel, resumePreview } = refs;
    const page = resumePreview?.querySelector(".resume-page");
    if (!previewPanel || !page) {
      return;
    }

    const panelStyle = window.getComputedStyle(previewPanel);
    const available =
      previewPanel.clientWidth -
      (Number.parseFloat(panelStyle.paddingLeft) || 0) -
      (Number.parseFloat(panelStyle.paddingRight) || 0);
    const { widthPx } = getPageMetrics(state.pageSize);
    const scale = available > 0 ? Math.min(1, available / widthPx) : 1;

    // Set on the panel, which the paper inherits it from: the first-run card lines up with the paper too.
    previewPanel.style.setProperty("--paper-scale", String(scale));
    resumePreview.style.setProperty("--paper-height", `${Math.ceil(page.offsetHeight * scale)}px`);
  }

  let firstRunTimer = null;

  // Called after every render. Whatever held focus inside the card, or the top bar's Sample button
  // that it stands in for, hands focus over rather than dropping it on the page.
  function setFirstRunVisible(visible) {
    const { firstRun, firstRunSample, sampleBtn, moreMenuTrigger } = refs;
    if (!firstRun) {
      return;
    }

    const wasVisible = !firstRun.hidden && !firstRun.classList.contains("is-leaving");
    document.body.classList.toggle("is-first-run", visible);
    if (visible === wasVisible) {
      return;
    }

    clearTimeout(firstRunTimer);

    if (visible) {
      firstRun.classList.remove("is-leaving");
      firstRun.hidden = false;
      if (document.activeElement === sampleBtn && sampleBtn.checkVisibility?.() === false) {
        firstRunSample?.focus();
      }
      return;
    }

    if (firstRun.contains(document.activeElement)) {
      (sampleBtn?.hidden ? moreMenuTrigger : sampleBtn)?.focus();
    }

    // A timer, not the animation's end: a hidden page may never finish it.
    firstRun.classList.add("is-leaving");
    firstRunTimer = setTimeout(() => {
      firstRun.hidden = true;
      firstRun.classList.remove("is-leaving");
    }, prefersReducedMotion() ? 0 : ENTRY_MOTION_MS);
  }

  // The choice lasts for this page load; each view keeps its own scroll position.
  const mobileViewScroll = { edit: 0, preview: 0 };

  function setMobileView(view) {
    const workspace = refs.workspace;
    const current = workspace?.dataset.view;
    if (!workspace || !(view in mobileViewScroll) || view === current) {
      return;
    }

    mobileViewScroll[current] = window.scrollY;
    workspace.dataset.view = view;
    document.querySelectorAll(".view-btn").forEach((button) => {
      const isActive = button.dataset.view === view;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    window.scrollTo(0, mobileViewScroll[view]);
  }

  let savePulseTimer = null;

  // The live region stays in place and its text stays the same: only a change of state is announced.
  // The check mark confirms a save once typing pauses, so it keeps still during a burst of keys.
  function setSaveStatusVisible(visible) {
    const text = refs.saveStatusText;
    if (!text) {
      return;
    }
    text.hidden = !visible;
    clearTimeout(savePulseTimer);
    if (visible && !prefersReducedMotion()) {
      savePulseTimer = setTimeout(() => {
        text.animate(
          [{ opacity: 0.2, scale: 0.5 }, { opacity: 1, scale: 1 }],
          { duration: COLLAPSE_MOTION_MS, easing: MOTION_EASING, pseudoElement: "::before" }
        );
      }, 250);
    }
  }

  // The lists are re-rendered from state, so entry motion runs around that render: a removal plays
  // first and replays its click afterwards; an addition or a move plays on the new elements.
  function entryFrames(item) {
    const { height, paddingTop, paddingBottom } = window.getComputedStyle(item);
    const gap = window.getComputedStyle(item.parentElement).rowGap;
    return [
      { height: "0px", paddingTop: "0px", paddingBottom: "0px", marginBottom: `-${gap}`, opacity: 0, overflow: "clip" },
      { height, paddingTop, paddingBottom, marginBottom: "0px", opacity: 1, overflow: "clip" }
    ];
  }

  let isRemovingEntry = false;
  let isReplayingRemoval = false;

  function animateEntryOut(trigger) {
    const item = trigger.closest(".repeat-item");
    isRemovingEntry = true;
    item.animate(entryFrames(item).reverse(), { duration: ENTRY_MOTION_MS, easing: MOTION_EASING, fill: "forwards" });
    // A timer, not the animation's end: a hidden page may never finish it, and the removal must still happen.
    setTimeout(() => {
      isRemovingEntry = false;
      isReplayingRemoval = true;
      trigger.click();
      isReplayingRemoval = false;
    }, ENTRY_MOTION_MS);
  }

  function animateEntryMove(list, from, to) {
    const entries = () => list.querySelectorAll(":scope > .repeat-item");
    const tops = [...entries()].map((item) => item.getBoundingClientRect().top);
    requestAnimationFrame(() => {
      entries().forEach((item, position) => {
        const previous = position === from ? to : position === to ? from : position;
        const offset = tops[previous] - item.getBoundingClientRect().top;
        if (offset) {
          item.animate(
            [{ transform: `translateY(${offset}px)` }, { transform: "none" }],
            { duration: ENTRY_MOTION_MS, easing: MOTION_EASING }
          );
        }
      });
    });
  }

  refs.editorPanel?.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("button[data-action]");
    const list = trigger?.closest(".repeat-list");
    if (!list || isReplayingRemoval || prefersReducedMotion()) {
      return;
    }

    // The pending removal targets an index, so nothing may change the list until it has run.
    if (isRemovingEntry) {
      event.stopPropagation();
      return;
    }

    const { action } = trigger.dataset;
    if (action.startsWith("remove-") && trigger.closest(".repeat-item")) {
      event.stopPropagation();
      animateEntryOut(trigger);
    } else if (action.startsWith("add-")) {
      requestAnimationFrame(() => {
        const item = [...list.querySelectorAll(":scope > .repeat-item")].pop();
        item?.animate(entryFrames(item), { duration: ENTRY_MOTION_MS, easing: MOTION_EASING });
      });
    } else if (action === "move-item") {
      const from = Number(trigger.dataset.index);
      animateEntryMove(list, from, from + Number(trigger.dataset.direction));
    }
  }, true);

  return {
    applyTheme,
    applyI18n,
    syncPageSizeUI,
    syncSectionToggles,
    syncTemplateSelectUI,
    closeTemplateSelect,
    toggleTemplateSelect,
    handleTemplateSelectKeydown,
    setSkillLevelSelectOpen,
    closeSkillLevelSelects,
    setLanguageLevelSelectOpen,
    closeLanguageLevelSelects,
    setCollapsibleState,
    syncCollapsibleHeights,
    toggleMoreMenu,
    closeMoreMenu,
    handleMoreMenuKeydown,
    syncPaperFit,
    setFirstRunVisible,
    setMobileView,
    setSaveStatusVisible
  };
}
