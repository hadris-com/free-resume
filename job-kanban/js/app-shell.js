import { createBoardRenderer } from "./board-renderer.js"
import { createBoardStore } from "./board-store.js"
import { createCardActions } from "./card-actions.js"
import { createModalController } from "./modal-controller.js"
import { createPersistence } from "./persistence.js"
import { createEmptyBoardState } from "./schema.js"
import { parseBoardPayload } from "./validation.js"

const refs = {
  boardRoot: document.getElementById("board-root"),
  boardSummary: document.getElementById("board-summary"),
  statusPill: document.getElementById("status-pill"),
  newApplicationBtn: document.getElementById("new-application-btn"),
  importJsonBtn: document.getElementById("import-json-btn"),
  exportJsonBtn: document.getElementById("export-json-btn"),
  privacyBtn: document.getElementById("privacy-btn"),
  themeToggle: document.getElementById("theme-toggle"),
  importFileInput: document.getElementById("import-file-input"),
  appModal: document.getElementById("app-modal"),
  appModalContent: document.getElementById("app-modal-content"),
  privacyModal: document.getElementById("privacy-modal")
}

const THEME_STORAGE_KEY = "free-resume:job-kanban-theme"

const initialState = createPersistence({
  getState: () => createEmptyBoardState(),
  parseBoardPayload
}).loadDraftFromLocalStorage() ?? createEmptyBoardState()

const store = createBoardStore(initialState)

const persistence = createPersistence({
  getState: () => store.getState(),
  parseBoardPayload
})

const renderer = createBoardRenderer({
  getState: () => store.getState(),
  boardRoot: refs.boardRoot,
  summaryRoot: refs.boardSummary
})

let announcementTimeout = null
let theme = loadThemePreference()

function getPreferredTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function loadThemePreference() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : getPreferredTheme()
  } catch {
    return getPreferredTheme()
  }
}

function saveThemePreference() {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore persistence failures and keep the current in-memory theme.
  }
}

function applyTheme() {
  document.body.classList.toggle("theme-dark", theme === "dark")

  if (!refs.themeToggle) {
    return
  }

  refs.themeToggle.setAttribute("aria-pressed", String(theme === "dark"))

  const label = refs.themeToggle.querySelector("[data-role='theme-label']")
  if (label) {
    label.textContent = theme === "dark" ? "Light mode" : "Dark mode"
  }
}

function announce(message, tone = "success") {
  if (!refs.statusPill) {
    return
  }

  refs.statusPill.hidden = !message
  refs.statusPill.dataset.tone = tone
  refs.statusPill.textContent = message

  window.clearTimeout(announcementTimeout)
  announcementTimeout = window.setTimeout(() => {
    refs.statusPill.hidden = true
    refs.statusPill.textContent = ""
  }, 4200)
}

const modalController = createModalController({
  dialog: refs.appModal,
  contentRoot: refs.appModalContent,
  store,
  announce
})

const cardActions = createCardActions({
  store,
  modalController,
  announce
})

function render() {
  renderer.render()
}

function handleBoardClick(event) {
  const trigger = event.target instanceof Element ? event.target.closest("[data-action]") : null

  if (!trigger) {
    return
  }

  const action = trigger.dataset.action
  const cardId = trigger.dataset.cardId

  cardActions.handleAction(action, cardId)
}

async function handleImportChange(event) {
  const input = event.target
  const file = input.files?.[0]

  if (!file) {
    return
  }

  try {
    const importedState = await persistence.parseImportFile(file)
    const confirmed = window.confirm("Replace the current board with the imported JSON snapshot?")

    if (!confirmed) {
      return
    }

    store.replaceState(importedState)
    announce("Imported board snapshot.", "success")
  } catch (error) {
    announce(error instanceof Error ? error.message : "Could not import that file.", "error")
  } finally {
    input.value = ""
  }
}

function handlePrivacyClick(event) {
  if (event.target === refs.privacyModal) {
    refs.privacyModal.close()
    return
  }

  const trigger = event.target instanceof Element ? event.target.closest("[data-privacy-close]") : null

  if (trigger) {
    refs.privacyModal.close()
  }
}

function init() {
  applyTheme()
  render()

  store.subscribe(() => {
    render()
    persistence.saveDraftToLocalStorage()
  })

  refs.boardRoot?.addEventListener("click", handleBoardClick)
  refs.newApplicationBtn?.addEventListener("click", () => {
    modalController.openCreateCard()
  })
  refs.importJsonBtn?.addEventListener("click", () => {
    refs.importFileInput?.click()
  })
  refs.exportJsonBtn?.addEventListener("click", () => {
    persistence.downloadBoardSnapshot()
    announce("Exported JSON snapshot.", "success")
  })
  refs.importFileInput?.addEventListener("change", handleImportChange)
  refs.privacyBtn?.addEventListener("click", () => {
    refs.privacyModal?.showModal()
  })
  refs.themeToggle?.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark"
    applyTheme()
    saveThemePreference()
  })
  refs.privacyModal?.addEventListener("click", handlePrivacyClick)
}

init()
