export const APP_ID = "job-kanban"
export const SCHEMA_VERSION = 1
export const LOCAL_STORAGE_KEY = "job-kanban:draft"

export const FIXED_COLUMN_ORDER = ["backlog", "applied", "in_progress", "closed"]

export const COLUMN_TITLES = {
  backlog: "Backlog",
  applied: "Applied",
  in_progress: "In Progress",
  closed: "Closed"
}

export const backlogLabelOptions = [
  { value: "considering", label: "Considering" },
  { value: "ready_to_apply", label: "Ready to apply" },
  { value: "maybe_later", label: "Maybe later" }
]

export const fitVerdictOptions = [
  { value: "strong", label: "Strong fit" },
  { value: "maybe", label: "Maybe" },
  { value: "weak", label: "Weak fit" }
]

export const processStageOptions = [
  { value: "screening", label: "Screening" },
  { value: "technical", label: "Technical" },
  { value: "onsite", label: "Onsite" },
  { value: "offer", label: "Offer" }
]

export const processStatusOptions = [
  { value: "planned", label: "Planned" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
]

export const closeReasonOptions = [
  { value: "not_pursuing", label: "Not pursuing" },
  { value: "low_fit", label: "Low fit" },
  { value: "compensation", label: "Compensation" },
  { value: "location", label: "Location" },
  { value: "duplicate", label: "Duplicate" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrew", label: "Withdrew" },
  { value: "offer_declined", label: "Offer declined" },
  { value: "accepted", label: "Accepted" }
]

export const backlogCloseReasonValues = ["not_pursuing", "low_fit", "compensation", "location", "duplicate", "expired"]

export const backlogCloseReasonOptions = closeReasonOptions.filter((option) => backlogCloseReasonValues.includes(option.value))

const optionLookups = new Map()

function buildOptionLookup(options) {
  return options.reduce((accumulator, option) => {
    accumulator[option.value] = option.label
    return accumulator
  }, {})
}

optionLookups.set("backlog", buildOptionLookup(backlogLabelOptions))
optionLookups.set("fit", buildOptionLookup(fitVerdictOptions))
optionLookups.set("stage", buildOptionLookup(processStageOptions))
optionLookups.set("status", buildOptionLookup(processStatusOptions))
optionLookups.set("close", buildOptionLookup(closeReasonOptions))

export function createEmptyBoardState() {
  return {
    columnOrder: [...FIXED_COLUMN_ORDER],
    columns: FIXED_COLUMN_ORDER.reduce((accumulator, columnId) => {
      accumulator[columnId] = {
        id: columnId,
        title: COLUMN_TITLES[columnId],
        cardIds: []
      }

      return accumulator
    }, {}),
    cardsById: {}
  }
}

export function getColumnTitle(columnId) {
  return COLUMN_TITLES[columnId] ?? columnId
}

export function getOptionLabel(group, value, fallback = "Not set") {
  if (!value) {
    return fallback
  }

  return optionLookups.get(group)?.[value] ?? fallback
}
