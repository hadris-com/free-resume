export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

export function formatTextBlock(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

export function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

export function hasObjectContent(item) {
  return Object.values(item).some(hasText);
}

export function toInputText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

export function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalizeUrl(raw) {
  const value = String(raw ?? "").trim();
  const allowedProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

  if (!value) {
    return "";
  }

  if (/[\u0000-\u001F\u007F]/.test(value)) {
    return "";
  }

  const parseAllowedUrl = (candidate) => {
    try {
      const parsed = new URL(candidate);
      return allowedProtocols.has(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  };

  const directUrl = parseAllowedUrl(value);
  if (directUrl) {
    return directUrl;
  }

  if (/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(value)) {
    return parseAllowedUrl(`mailto:${value}`);
  }

  if (/^[+()\d\s-]{6,}$/.test(value)) {
    return parseAllowedUrl(`tel:${value.replace(/\s+/g, "")}`);
  }

  if (/^[\w.-]+\.[A-Za-z]{2,}/.test(value)) {
    return parseAllowedUrl(`https://${value}`);
  }

  return "";
}

export function buildLink(value) {
  const cleaned = String(value ?? "").trim();

  if (!cleaned) {
    return "";
  }

  const href = normalizeUrl(cleaned);
  if (!href) {
    return `<span>${escapeHtml(cleaned)}</span>`;
  }

  return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cleaned)}</a>`;
}

export function buildPhoneMarkup(value) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) {
    return "";
  }

  const phoneIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3 5.18 2 2 0 0 1 5.11 3h3a2 2 0 0 1 2 1.72c.12.86.32 1.7.59 2.5a2 2 0 0 1-.45 2.11L9 10.91a16 16 0 0 0 4.09 4.09l1.58-1.25a2 2 0 0 1 2.11-.45c.8.27 1.64.47 2.5.59A2 2 0 0 1 22 16.92z"/></svg>`;

  return `<span class="contact-meta contact-phone"><span class="contact-icon">${phoneIcon}</span><span>${escapeHtml(cleaned)}</span></span>`;
}

function extractSocialHandle(url, type) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return "";
    }
    const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
    if (!path) {
      return "";
    }

    if (type === "linkedin") {
      if (path.startsWith("in/")) {
        return path.slice(3).split("/")[0];
      }
      if (path.startsWith("company/")) {
        return path.slice(8).split("/")[0];
      }
    }

    return path.split("/")[0];
  } catch {
    return "";
  }
}

export function buildSocialLink(value, type) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned) {
    return "";
  }

  const normalized = normalizeUrl(cleaned);
  const isHttp = normalized && /^https?:/i.test(normalized);
  const fallbackHandle = cleaned.replace(/^@/, "");
  const baseUrl = type === "github" ? "https://github.com/" : "https://www.linkedin.com/in/";
  const href = isHttp ? normalized : `${baseUrl}${encodeURIComponent(fallbackHandle)}`;
  const handle = isHttp ? extractSocialHandle(normalized, type) : fallbackHandle;
  const label = handle ? `/${handle}` : cleaned;

  const icon =
    type === "github"
      ? `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 .297a12 12 0 0 0-3.79 23.4c.6.113.82-.258.82-.577v-2.03c-3.34.73-4.04-1.416-4.04-1.416-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.082-.729.082-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.305 3.49.997.107-.776.42-1.305.763-1.605-2.665-.305-5.466-1.332-5.466-5.93 0-1.31.467-2.38 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 0 1 3-.404c1.02.005 2.047.138 3.006.404 2.29-1.552 3.296-1.23 3.296-1.23.653 1.652.242 2.873.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.804 5.623-5.476 5.92.43.37.814 1.103.814 2.222v3.293c0 .322.218.694.825.576A12 12 0 0 0 12 .297z"/></svg>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M20.451 20.451H16.9v-5.569c0-1.327-.027-3.037-1.851-3.037-1.853 0-2.136 1.445-2.136 2.94v5.666H9.36V9h3.412v1.561h.048c.476-.9 1.637-1.85 3.367-1.85 3.6 0 4.264 2.37 4.264 5.455v6.285zM5.337 7.433a1.985 1.985 0 1 1 0-3.97 1.985 1.985 0 0 1 0 3.97zM7.118 20.451H3.556V9h3.562v11.451zM22.225 0H1.771C.792 0 0 .774 0 1.727v20.546C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.273V1.727C24 .774 23.2 0 22.222 0z"/></svg>`;

  return `<a class="social-icon-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer"><span class="social-link-icon">${icon}</span><span class="social-link-text">${escapeHtml(label)}</span></a>`;
}
