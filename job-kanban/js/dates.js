const temporalApi = globalThis.Temporal ?? null
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/

function pad(value) {
  return String(value).padStart(2, "0")
}

function buildLocalDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function buildLocalDateTimeString(date) {
  return `${buildLocalDateString(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function createLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const [, yearString, monthString, dayString] = match
  const year = Number(yearString)
  const month = Number(monthString)
  const day = Number(dayString)
  const date = new Date(year, month - 1, day)

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

function createLocalDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value)

  if (!match) {
    return null
  }

  const [, yearString, monthString, dayString, hourString, minuteString, secondString = "0"] = match
  const year = Number(yearString)
  const month = Number(monthString)
  const day = Number(dayString)
  const hour = Number(hourString)
  const minute = Number(minuteString)
  const second = Number(secondString)

  if (hour > 23 || minute > 59 || second > 59) {
    return null
  }

  const date = new Date(year, month - 1, day, hour, minute, second)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null
  }

  return date
}

export function nowInstantString() {
  if (temporalApi?.Now?.instant) {
    return temporalApi.Now.instant().toString()
  }

  return new Date().toISOString()
}

export function todayPlainDateString() {
  if (temporalApi?.Now?.plainDateISO) {
    return temporalApi.Now.plainDateISO().toString()
  }

  return buildLocalDateString(new Date())
}

export function nowPlainDateTimeString() {
  if (temporalApi?.Now?.plainDateTimeISO) {
    return temporalApi.Now.plainDateTimeISO().toString({ smallestUnit: "minute" })
  }

  return buildLocalDateTimeString(new Date())
}

export function isValidPlainDateString(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false
  }

  if (temporalApi?.PlainDate?.from) {
    try {
      temporalApi.PlainDate.from(value)
      return true
    } catch {
      return false
    }
  }

  return Boolean(createLocalDate(value))
}

export function isValidPlainDateTimeString(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false
  }

  if (temporalApi?.PlainDateTime?.from) {
    try {
      temporalApi.PlainDateTime.from(value)
      return true
    } catch {
      return false
    }
  }

  return Boolean(createLocalDateTime(value))
}

export function isValidInstantString(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false
  }

  if (temporalApi?.Instant?.from) {
    try {
      temporalApi.Instant.from(value)
      return true
    } catch {
      return false
    }
  }

  return ISO_INSTANT_PATTERN.test(value) && !Number.isNaN(Date.parse(value))
}

export function normalizeDateInputValue(value) {
  const nextValue = typeof value === "string" ? value.trim() : ""
  return isValidPlainDateString(nextValue) ? nextValue : null
}

export function normalizeDateTimeInputValue(value) {
  const nextValue = typeof value === "string" ? value.trim() : ""
  return isValidPlainDateTimeString(nextValue) ? nextValue : null
}

export function toDateTimeInputValue(value) {
  return normalizeDateTimeInputValue(value)?.slice(0, 16) ?? ""
}

export function formatPlainDate(value) {
  const date = typeof value === "string" ? createLocalDate(value) : null

  if (!date) {
    return "Not set"
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)
}

export function formatPlainDateTime(value) {
  const date = typeof value === "string" ? createLocalDateTime(value) : null

  if (!date) {
    return "Not set"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date)
}

export function formatInstant(value) {
  const date = typeof value === "string" ? new Date(value) : null

  if (!date || Number.isNaN(date.getTime())) {
    return "Not set"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date)
}
