import { isValidInstantString, normalizeDateInputValue, normalizeDateTimeInputValue } from "./dates.js"
import {
  APP_ID,
  FIXED_COLUMN_ORDER,
  SCHEMA_VERSION,
  backlogCloseReasonValues,
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
const requiredColumnOrder = FIXED_COLUMN_ORDER.join("|")

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeLongText(value) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : ""
}

function normalizeEnum(value, allowedValues, fallback = null) {
  return allowedValues.has(value) ? value : fallback
}

function normalizeFitAssessment(source) {
  if (source != null && typeof source !== "object") {
    return null
  }

  const candidate = source && typeof source === "object" ? source : {}
  const verdict = candidate.verdict == null ? null : normalizeEnum(candidate.verdict, fitVerdictValues, null)
  const summary = normalizeLongText(candidate.summary)
  const reviewedAt = candidate.reviewedAt == null ? null : normalizeDateInputValue(candidate.reviewedAt)

  if (candidate.verdict != null && !verdict) {
    return null
  }

  if (candidate.reviewedAt != null && !reviewedAt) {
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
    reviewedAt
  }
}

function normalizeProcessStep(source) {
  if (!source || typeof source !== "object") {
    return null
  }

  const id = normalizeText(source.id)
  const stage = normalizeEnum(source.stage, processStageValues, null)
  const status = normalizeEnum(source.status, processStatusValues, null)
  const createdAt = normalizeText(source.createdAt)
  const updatedAt = normalizeText(source.updatedAt)
  const scheduledAt = source.scheduledAt == null ? null : normalizeDateTimeInputValue(source.scheduledAt)

  if (!id || !stage || !status || !isValidInstantString(createdAt) || !isValidInstantString(updatedAt)) {
    return null
  }

  if (source.scheduledAt != null && !scheduledAt) {
    return null
  }

  return {
    id,
    stage,
    status,
    scheduledAt,
    contactPerson: normalizeText(source.contactPerson),
    stepNotes: normalizeLongText(source.stepNotes),
    createdAt,
    updatedAt
  }
}

function normalizeCard(source) {
  if (!source || typeof source !== "object") {
    return null
  }

  const id = normalizeText(source.id)
  const company = normalizeText(source.company)
  const role = normalizeText(source.role)
  const createdAt = normalizeText(source.createdAt)
  const updatedAt = normalizeText(source.updatedAt)
  const processSteps = Array.isArray(source.processSteps) ? source.processSteps.map(normalizeProcessStep) : null

  if (!id || !company || !role || !isValidInstantString(createdAt) || !isValidInstantString(updatedAt) || !processSteps) {
    return null
  }

  if (processSteps.some((step) => !step)) {
    return null
  }

  if (source.backlogLabel != null && !backlogLabelValues.has(source.backlogLabel)) {
    return null
  }

  const backlogLabel = normalizeEnum(source.backlogLabel, backlogLabelValues, "considering")
  const closeReason = source.closeReason == null ? null : normalizeEnum(source.closeReason, closeReasonValues, null)
  const appliedAt = source.appliedAt == null ? null : normalizeDateInputValue(source.appliedAt)
  const closedAt = source.closedAt == null ? null : normalizeDateInputValue(source.closedAt)
  const fitAssessment = normalizeFitAssessment(source.fitAssessment)

  if (source.closeReason != null && !closeReason) {
    return null
  }

  if (source.appliedAt != null && !appliedAt) {
    return null
  }

  if (source.closedAt != null && !closedAt) {
    return null
  }

  if (!fitAssessment) {
    return null
  }

  return {
    id,
    company,
    role,
    jobUrl: normalizeHttpUrl(source.jobUrl),
    location: normalizeText(source.location),
    notes: normalizeLongText(source.notes),
    backlogLabel,
    fitAssessment,
    processSteps,
    appliedAt,
    closeReason,
    closeNote: normalizeLongText(source.closeNote),
    closedAt,
    createdAt,
    updatedAt
  }
}

export function normalizeBoardState(source) {
  if (!source || typeof source !== "object") {
    return null
  }

  const columnOrder = Array.isArray(source.columnOrder) ? source.columnOrder : []

  if (columnOrder.join("|") !== requiredColumnOrder) {
    return null
  }

  if (!source.columns || typeof source.columns !== "object" || !source.cardsById || typeof source.cardsById !== "object") {
    return null
  }

  const nextState = createEmptyBoardState()
  const referencedCardIds = []

  for (const columnId of FIXED_COLUMN_ORDER) {
    const column = source.columns[columnId]

    if (!column || column.id !== columnId || !Array.isArray(column.cardIds)) {
      return null
    }

    const columnCardIds = column.cardIds.map((cardId) => normalizeText(cardId))

    if (columnCardIds.some((cardId) => !cardId)) {
      return null
    }

    nextState.columns[columnId].cardIds = columnCardIds
    referencedCardIds.push(...columnCardIds)
  }

  const dedupedIds = new Set(referencedCardIds)

  if (dedupedIds.size !== referencedCardIds.length) {
    return null
  }

  const cardEntries = Object.entries(source.cardsById)

  for (const [cardId, cardValue] of cardEntries) {
    const normalizedCard = normalizeCard(cardValue)

    if (!normalizedCard || normalizedCard.id !== cardId) {
      return null
    }

    nextState.cardsById[cardId] = normalizedCard
  }

  if (cardEntries.length !== dedupedIds.size) {
    return null
  }

  for (const cardId of dedupedIds) {
    if (!nextState.cardsById[cardId]) {
      return null
    }
  }

  return nextState
}

export function validateBoardState(source) {
  return Boolean(normalizeBoardState(source))
}

export function parseBoardPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null
  }

  if (payload.app != null && payload.app !== APP_ID) {
    return null
  }

  if (
    payload.schemaVersion != null &&
    (!Number.isFinite(Number(payload.schemaVersion)) || Number(payload.schemaVersion) !== SCHEMA_VERSION)
  ) {
    return null
  }

  const source =
    payload.data && typeof payload.data === "object"
      ? payload.data
      : payload.board && typeof payload.board === "object"
        ? payload.board
        : payload

  return normalizeBoardState(source)
}

export function isDiscardReason(value) {
  return backlogCloseReasonValues.includes(value)
}
