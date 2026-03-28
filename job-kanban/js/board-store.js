import { nowInstantString, todayPlainDateString } from "./dates.js"
import { createEmptyBoardState } from "./schema.js"

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

  return {
    id: createId("card"),
    company: sanitizeShortText(input.company),
    role: sanitizeShortText(input.role),
    jobUrl: sanitizeShortText(input.jobUrl),
    location: sanitizeShortText(input.location),
    notes: "",
    backlogLabel: sanitizeShortText(input.backlogLabel) || "considering",
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

  return {
    id: createId("step"),
    stage: sanitizeShortText(input.stage) || "screening",
    status: sanitizeShortText(input.status) || "planned",
    scheduledAt: sanitizeShortText(input.scheduledAt) || null,
    contactPerson: sanitizeShortText(input.contactPerson),
    stepNotes: sanitizeLongText(input.stepNotes),
    createdAt: now,
    updatedAt: now
  }
}

function applyFitAssessment(input) {
  const verdict = sanitizeShortText(input.verdict) || null
  const summary = sanitizeLongText(input.summary)
  const reviewedAt = sanitizeShortText(input.reviewedAt) || null

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
    reviewedAt: reviewedAt ?? todayPlainDateString()
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

      card.company = sanitizeShortText(input.company)
      card.role = sanitizeShortText(input.role)
      card.jobUrl = sanitizeShortText(input.jobUrl)
      card.location = sanitizeShortText(input.location)
      card.notes = sanitizeLongText(input.notes)
      card.backlogLabel = sanitizeShortText(input.backlogLabel) || "considering"
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

      card.fitAssessment = applyFitAssessment(input)
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

      card.appliedAt = sanitizeShortText(input.appliedAt) || todayPlainDateString()
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

      card.processSteps.unshift(buildProcessStep(input))
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

      step.stage = sanitizeShortText(input.stage) || step.stage
      step.status = sanitizeShortText(input.status) || step.status
      step.scheduledAt = sanitizeShortText(input.scheduledAt) || null
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

      card.closeReason = sanitizeShortText(input.closeReason) || null
      card.closeNote = sanitizeLongText(input.closeNote)
      card.closedAt = sanitizeShortText(input.closedAt) || todayPlainDateString()
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
