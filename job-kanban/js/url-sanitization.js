const allowedProtocols = new Set(["http:", "https:"])

export function normalizeHttpUrl(value) {
  const trimmedValue = typeof value === "string" ? value.trim() : ""

  if (!trimmedValue) {
    return ""
  }

  try {
    const url = new URL(trimmedValue)
    return allowedProtocols.has(url.protocol) ? url.toString() : ""
  } catch {
    return ""
  }
}
