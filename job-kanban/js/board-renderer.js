import { formatPlainDate, formatPlainDateTime } from "./dates.js"
import { FIXED_COLUMN_ORDER } from "./schema.js"
import { getLocalizedKanbanOptionLabel } from "./i18n.js"

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getLatestProcessStep(card) {
  if (!Array.isArray(card.processSteps) || card.processSteps.length === 0) {
    return null
  }

  return card.processSteps
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
}

function getBacklogTone(label) {
  if (label === "ready_to_apply") {
    return "accent"
  }

  if (label === "maybe_later") {
    return "warm"
  }

  return "muted"
}

function getFitTone(verdict) {
  if (verdict === "strong") {
    return "accent"
  }

  if (verdict === "weak") {
    return "danger"
  }

  return "warm"
}

function getCloseTone(reason) {
  if (reason === "accepted") {
    return "accent"
  }

  if (reason === "rejected") {
    return "danger"
  }

  return "muted"
}

function renderActionButton(action, cardId, label, variant = "") {
  const classes = variant ? `action-btn ${variant}` : "action-btn"
  return `<button type="button" class="${classes}" data-action="${action}" data-card-id="${escapeHtml(cardId)}">${escapeHtml(label)}</button>`
}

function renderBacklogCard(card, getTranslation) {
  return `
    <div class="badge-row">
      <span class="badge" data-tone="${getBacklogTone(card.backlogLabel)}">${escapeHtml(getLocalizedKanbanOptionLabel("backlog", card.backlogLabel, getTranslation))}</span>
      ${
        card.fitAssessment.verdict
          ? `<span class="badge" data-tone="${getFitTone(card.fitAssessment.verdict)}">${escapeHtml(getLocalizedKanbanOptionLabel("fit", card.fitAssessment.verdict, getTranslation))}</span>`
          : ""
      }
    </div>
    <div>
      <h3>${escapeHtml(card.company)}</h3>
      <p class="card-role">${escapeHtml(card.role)}</p>
    </div>
    ${
      card.location
        ? `<div class="card-meta"><span class="meta-chip">${escapeHtml(card.location)}</span></div>`
        : ""
    }
    <div class="card-actions">
      ${renderActionButton("apply-card", card.id, getTranslation("actions.applied"), "action-btn-primary")}
      ${renderActionButton("discard-card", card.id, getTranslation("actions.discard"))}
      ${renderActionButton("show-details", card.id, getTranslation("actions.seeMore"), "action-btn-quiet")}
    </div>
  `
}

function renderAppliedCard(card, getTranslation) {
  return `
    <div>
      <h3>${escapeHtml(card.company)}</h3>
      <p class="card-role">${escapeHtml(card.role)}</p>
    </div>
    <div class="card-meta">
      <span class="meta-chip">${escapeHtml(getTranslation("card.appliedMeta", { date: formatPlainDate(card.appliedAt) }))}</span>
    </div>
    <div class="card-actions">
      ${renderActionButton("start-process", card.id, getTranslation("actions.startProcess"), "action-btn-primary")}
      ${renderActionButton("close-card", card.id, getTranslation("actions.closeCard"))}
      ${renderActionButton("show-details", card.id, getTranslation("actions.seeMore"), "action-btn-quiet")}
    </div>
  `
}

function renderInProgressCard(card, getTranslation, getLanguage) {
  const latestStep = getLatestProcessStep(card)
  const stepKey = new Intl.PluralRules(getLanguage()).select(card.processSteps.length) === "one" ? "one" : "other"

  return `
    <div class="badge-row">
      ${
        latestStep
          ? `<span class="badge">${escapeHtml(getLocalizedKanbanOptionLabel("stage", latestStep.stage, getTranslation))}</span>`
          : `<span class="badge" data-tone="muted">${escapeHtml(getTranslation("card.waitingForFirstStep"))}</span>`
      }
      <span class="badge" data-tone="muted">${escapeHtml(getTranslation(`card.steps.${stepKey}`, { count: card.processSteps.length }))}</span>
    </div>
    <div>
      <h3>${escapeHtml(card.company)}</h3>
      <p class="card-role">${escapeHtml(card.role)}</p>
    </div>
    <div class="card-meta">
      ${
        latestStep?.scheduledAt
          ? `<span class="meta-chip">${escapeHtml(formatPlainDateTime(latestStep.scheduledAt))}</span>`
          : `<span class="meta-chip">${escapeHtml(getTranslation("card.noMeetingScheduled"))}</span>`
      }
    </div>
    <div class="card-actions">
      ${renderActionButton("add-step", card.id, getTranslation("actions.addStep"), "action-btn-primary")}
      ${renderActionButton("close-card", card.id, getTranslation("actions.closeCard"))}
      ${renderActionButton("show-details", card.id, getTranslation("actions.seeMore"), "action-btn-quiet")}
    </div>
  `
}

function renderClosedCard(card, getTranslation) {
  return `
    <div class="badge-row">
      <span class="badge" data-tone="${getCloseTone(card.closeReason)}">${escapeHtml(getLocalizedKanbanOptionLabel("close", card.closeReason, getTranslation))}</span>
    </div>
    <div>
      <h3>${escapeHtml(card.company)}</h3>
      <p class="card-role">${escapeHtml(card.role)}</p>
    </div>
    <div class="card-meta">
      <span class="meta-chip">${escapeHtml(getTranslation("card.closedMeta", { date: formatPlainDate(card.closedAt) }))}</span>
    </div>
    <div class="card-actions">
      ${renderActionButton("reopen-card", card.id, getTranslation("actions.reopen"), "action-btn-primary")}
      ${renderActionButton("show-details", card.id, getTranslation("actions.seeMore"), "action-btn-quiet")}
    </div>
  `
}

function renderCard(columnId, card, getTranslation, getLanguage) {
  const body =
    columnId === "backlog"
      ? renderBacklogCard(card, getTranslation)
      : columnId === "applied"
        ? renderAppliedCard(card, getTranslation)
        : columnId === "in_progress"
          ? renderInProgressCard(card, getTranslation, getLanguage)
          : renderClosedCard(card, getTranslation)

  return `<li><article class="application-card">${body}</article></li>`
}

function renderColumn(columnId, column, cards, getTranslation, getLanguage) {
  const cardCountKey = new Intl.PluralRules(getLanguage()).select(column.cardIds.length) === "one" ? "one" : "other"
  const cardMarkup = cards.length
    ? cards.map((card) => renderCard(columnId, card, getTranslation, getLanguage)).join("")
    : `<p class="column-empty">${escapeHtml(getTranslation("columns.empty"))}</p>`

  return `
    <section class="board-column" data-column-id="${escapeHtml(columnId)}">
      <header class="column-header">
        <div class="column-title-group">
          <h2>${escapeHtml(getTranslation(`columns.${columnId}`))}</h2>
        </div>
        <div class="column-count" aria-label="${escapeHtml(getTranslation(`columns.count.${cardCountKey}`, { count: column.cardIds.length }))}">${escapeHtml(String(column.cardIds.length))}</div>
      </header>
      <ol class="card-list">${cardMarkup}</ol>
    </section>
  `
}

export function createBoardRenderer({ getState, boardRoot, summaryRoot, getTranslation, getLanguage }) {
  function renderSummary(state) {
    const total = Object.keys(state.cardsById).length
    const active = state.columns.applied.cardIds.length + state.columns.in_progress.cardIds.length
    const closed = state.columns.closed.cardIds.length

    if (total === 0) {
      summaryRoot.textContent = getTranslation("summary.empty")
      return
    }

    const summaryKey = new Intl.PluralRules(getLanguage()).select(total) === "one" ? "one" : "other"
    summaryRoot.textContent = getTranslation(`summary.status.${summaryKey}`, {
      total,
      active,
      closed
    })
  }

  function render() {
    const state = getState()

    renderSummary(state)

    boardRoot.innerHTML = FIXED_COLUMN_ORDER.map((columnId) => {
      const column = state.columns[columnId]
      const cards = column.cardIds.map((cardId) => state.cardsById[cardId]).filter(Boolean)
      return renderColumn(columnId, column, cards, getTranslation, getLanguage)
    }).join("")
  }

  return {
    render
  }
}
