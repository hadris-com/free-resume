import {
  normalizeDateInputValue,
  normalizeDateTimeInputValue,
  nowInstantString,
  todayPlainDateString
} from "./dates.js"
import {
  backlogLabelOptions,
  closeReasonOptions,
  createEmptyBoardState,
  fitVerdictOptions,
  processStageOptions,
  processStatusOptions
} from "./schema.js"
import { normalizeHttpUrl } from "./url-sanitization.js"

const backlogLabelValues = new Set(backlogLabelOptions.map((option) => option.value))
const fitVerdictValues = new Set(fitVerdictOptions.map((option) => option.value))
const processStageValues = new Set(processStageOptions.map((option) => option.value))
const processStatusValues = new Set(processStatusOptions.map((option) => option.value))
const closeReasonValues = new Set(closeReasonOptions.map((option) => option.value))

function cloneState(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value))
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function sanitizeShortText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function sanitizeLongText(value) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : ""
}

function sanitizeEnum(value, allowedValues, fallback = null) {
  const normalizedValue = sanitizeShortText(value)

  if (!normalizedValue) {
    return fallback
  }

  return allowedValues.has(normalizedValue) ? normalizedValue : null
}

function removeCardFromAllColumns(draft, cardId) {
  for (const column of Object.values(draft.columns)) {
    column.cardIds = column.cardIds.filter((currentCardId) => currentCardId !== cardId)
  }
}

function moveCardToColumn(draft, cardId, targetColumnId) {
  removeCardFromAllColumns(draft, cardId)
  draft.columns[targetColumnId].cardIds.unshift(cardId)
}

function buildEmptyCard(input) {
  const now = nowInstantString()
  const company = sanitizeShortText(input.company)
  const role = sanitizeShortText(input.role)
  const backlogLabel = sanitizeEnum(input.backlogLabel, backlogLabelValues, "considering")

  if (!company || !role || !backlogLabel) {
    return null
  }

  return {
    id: createId("card"),
    company,
    role,
    jobUrl: normalizeHttpUrl(input.jobUrl),
    location: sanitizeShortText(input.location),
    notes: "",
    backlogLabel,
    fitAssessment: {
      verdict: null,
      summary: "",
      reviewedAt: null
    },
    processSteps: [],
    appliedAt: null,
    closeReason: null,
    closeNote: "",
    closedAt: null,
    createdAt: now,
    updatedAt: now
  }
}

function buildProcessStep(input) {
  const now = nowInstantString()
  const stage = sanitizeEnum(input.stage, processStageValues, "screening")
  const status = sanitizeEnum(input.status, processStatusValues, "planned")
  const scheduledAtInput = sanitizeShortText(input.scheduledAt)
  const scheduledAt = scheduledAtInput ? normalizeDateTimeInputValue(scheduledAtInput) : null

  if (!stage || !status || (scheduledAtInput && !scheduledAt)) {
    return null
  }

  return {
    id: createId("step"),
    stage,
    status,
    scheduledAt,
    contactPerson: sanitizeShortText(input.contactPerson),
    stepNotes: sanitizeLongText(input.stepNotes),
    createdAt: now,
    updatedAt: now
  }
}

function applyFitAssessment(input) {
  const verdict = sanitizeEnum(input.verdict, fitVerdictValues, null)
  const summary = sanitizeLongText(input.summary)
  const reviewedAtInput = sanitizeShortText(input.reviewedAt)
  const reviewedAt = reviewedAtInput ? normalizeDateInputValue(reviewedAtInput) : null

  if (sanitizeShortText(input.verdict) && !verdict) {
    return null
  }

  if (reviewedAtInput && !reviewedAt) {
    return null
  }

  if (!verdict && !summary && !reviewedAt) {
    return {
      verdict: null,
      summary: "",
      reviewedAt: null
    }
  }

  return {
    verdict,
    summary,
    reviewedAt: reviewedAt || todayPlainDateString()
  }
}

export function createBoardStore(initialState = createEmptyBoardState()) {
  let state = cloneState(initialState)
  const listeners = new Set()

  function emit(change) {
    for (const listener of listeners) {
      listener({
        state,
        change
      })
    }
  }

  function commit(mutator, change) {
    const draft = cloneState(state)
    const result = mutator(draft)

    if (result === false) {
      return null
    }

    state = draft
    emit(change)
    return result ?? state
  }

  function getState() {
    return state
  }

  function subscribe(listener) {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  }

  function getCard(cardId) {
    return state.cardsById[cardId] ?? null
  }

  function getCardColumnId(cardId) {
    return state.columnOrder.find((columnId) => state.columns[columnId].cardIds.includes(cardId)) ?? null
  }

  function createCard(input) {
    return commit((draft) => {
      const card = buildEmptyCard(input)

      if (!card) {
        return false
      }

      draft.cardsById[card.id] = card
      moveCardToColumn(draft, card.id, "backlog")
      return card
    }, {
      type: "create"
    })
  }

  function updateBasics(cardId, input) {
    return commit((draft) => {
      const card = draft.cardsById[cardId]

      if (!card) {
        return false
      }

      const company = sanitizeShortText(input.company)
      const role = sanitizeShortText(input.role)
      const backlogLabel = sanitizeEnum(input.backlogLabel, backlogLabelValues, "considering")

      if (!company || !role || !backlogLabel) {
        return false
      }

      card.company = company
      card.role = role
      card.jobUrl = normalizeHttpUrl(input.jobUrl)
      card.location = sanitizeShortText(input.location)
      card.notes = sanitizeLongText(input.notes)
      card.backlogLabel = backlogLabel
      card.updatedAt = nowInstantString()

      return card
    }, {
      type: "edit",
      cardId
    })
  }

  function updateFit(cardId, input) {
    return commit((draft) => {
      const card = draft.cardsById[cardId]

      if (!card) {
        return false
      }

      const fitAssessment = applyFitAssessment(input)

      if (!fitAssessment) {
        return false
      }

      card.fitAssessment = fitAssessment
      card.updatedAt = nowInstantString()

      return card
    }, {
      type: "edit",
      cardId
    })
  }

  function applyCard(cardId, input) {
    return commit((draft) => {
      const card = draft.cardsById[cardId]

      if (!card) {
        return false
      }

      const appliedAtInput = sanitizeShortText(input.appliedAt)
      const appliedAt = appliedAtInput ? normalizeDateInputValue(appliedAtInput) : todayPlainDateString()

      if (appliedAtInput && !appliedAt) {
        return false
      }

      card.appliedAt = appliedAt || todayPlainDateString()
      card.updatedAt = nowInstantString()
      moveCardToColumn(draft, cardId, "applied")

      return card
    }, {
      type: "apply",
      cardId
    })
  }

  function addProcessStep(cardId, input) {
    return commit((draft) => {
      const card = draft.cardsById[cardId]

      if (!card) {
        return false
      }

      const step = buildProcessStep(input)

      if (!step) {
        return false
      }

      card.processSteps.unshift(step)
      card.updatedAt = nowInstantString()
      moveCardToColumn(draft, cardId, "in_progress")

      return card
    }, {
      type: "add-step",
      cardId
    })
  }

  function editProcessStep(cardId, stepId, input) {
    return commit((draft) => {
      const card = draft.cardsById[cardId]
      const step = card?.processSteps.find((currentStep) => currentStep.id === stepId)

      if (!card || !step) {
        return false
      }

      const stage = sanitizeEnum(input.stage, processStageValues, step.stage)
      const status = sanitizeEnum(input.status, processStatusValues, step.status)
      const scheduledAtInput = sanitizeShortText(input.scheduledAt)
      const scheduledAt = scheduledAtInput ? normalizeDateTimeInputValue(scheduledAtInput) : null

      if (!stage || !status || (scheduledAtInput && !scheduledAt)) {
        return false
      }

      step.stage = stage
      step.status = status
      step.scheduledAt = scheduledAt
      step.contactPerson = sanitizeShortText(input.contactPerson)
      step.stepNotes = sanitizeLongText(input.stepNotes)
      step.updatedAt = nowInstantString()
      card.updatedAt = nowInstantString()

      return step
    }, {
      type: "edit-step",
      cardId,
      stepId
    })
  }

  function closeCard(cardId, input) {
    return commit((draft) => {
      const card = draft.cardsById[cardId]

      if (!card) {
        return false
      }

      const closeReason = sanitizeEnum(input.closeReason, closeReasonValues, null)
      const closedAtInput = sanitizeShortText(input.closedAt)
      const closedAt = closedAtInput ? normalizeDateInputValue(closedAtInput) : todayPlainDateString()

      if (sanitizeShortText(input.closeReason) && !closeReason) {
        return false
      }

      if (closedAtInput && !closedAt) {
        return false
      }

      card.closeReason = closeReason
      card.closeNote = sanitizeLongText(input.closeNote)
      card.closedAt = closedAt || todayPlainDateString()
      card.updatedAt = nowInstantString()
      moveCardToColumn(draft, cardId, "closed")

      return card
    }, {
      type: "close",
      cardId
    })
  }

  function reopenCard(cardId) {
    return commit((draft) => {
      const card = draft.cardsById[cardId]

      if (!card) {
        return false
      }

      card.closeReason = null
      card.closeNote = ""
      card.closedAt = null
      card.updatedAt = nowInstantString()
      moveCardToColumn(draft, cardId, "backlog")

      return card
    }, {
      type: "reopen",
      cardId
    })
  }

  function deleteCard(cardId) {
    return commit((draft) => {
      const card = draft.cardsById[cardId]

      if (!card) {
        return false
      }

      removeCardFromAllColumns(draft, cardId)
      delete draft.cardsById[cardId]

      return card
    }, {
      type: "delete",
      cardId
    })
  }

  function replaceState(nextState, type = "import") {
    state = cloneState(nextState)
    emit({ type })
    return state
  }

  return {
    getState,
    subscribe,
    getCard,
    getCardColumnId,
    createCard,
    updateBasics,
    updateFit,
    applyCard,
    addProcessStep,
    editProcessStep,
    closeCard,
    reopenCard,
    deleteCard,
    replaceState
  }
}
