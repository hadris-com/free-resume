import { APP_ID, LOCAL_STORAGE_KEY, SCHEMA_VERSION } from "./schema.js"

export function createPersistence({ getState, parseBoardPayload, getTranslation = null }) {
  const t = typeof getTranslation === "function" ? getTranslation : (key) => key

  function buildBoardPayload() {
    return {
      app: APP_ID,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: getState()
    }
  }

  function loadDraftFromLocalStorage() {
    try {
      const rawDraft = window.localStorage.getItem(LOCAL_STORAGE_KEY)

      if (!rawDraft) {
        return null
      }

      const parsedPayload = JSON.parse(rawDraft)
      return parseBoardPayload(parsedPayload)
    } catch (error) {
      console.warn("Could not load job board draft", error)
      return null
    }
  }

  function saveDraftToLocalStorage() {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(buildBoardPayload()))
    } catch (error) {
      console.warn("Could not save job board draft", error)
    }
  }

  function buildExportFilename() {
    const date = new Date().toISOString().slice(0, 10)
    return `job-kanban-${date}.json`
  }

  function downloadBoardSnapshot() {
    const blob = new Blob([JSON.stringify(buildBoardPayload(), null, 2)], { type: "application/json" })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = objectUrl
    link.download = buildExportFilename()
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  }

  async function parseImportFile(file) {
    if (!file) {
      throw new Error(t("errors.importChooseFile"))
    }

    let payload

    try {
      payload = JSON.parse(await file.text())
    } catch {
      throw new Error(t("errors.importInvalidJson"))
    }

    const parsedState = parseBoardPayload(payload)

    if (!parsedState) {
      throw new Error(t("errors.importSchemaMismatch"))
    }

    return parsedState
  }

  return {
    loadDraftFromLocalStorage,
    saveDraftToLocalStorage,
    downloadBoardSnapshot,
    parseImportFile
  }
}
