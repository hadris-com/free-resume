import { formatPlainDate, formatPlainDateTime } from "./dates.js"
import { FIXED_COLUMN_ORDER, getColumnTitle, getOptionLabel } from "./schema.js"

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

function renderBacklogCard(card) {
  return `
    <div class="badge-row">
      <span class="badge" data-tone="${getBacklogTone(card.backlogLabel)}">${escapeHtml(getOptionLabel("backlog", card.backlogLabel))}</span>
      ${
        card.fitAssessment.verdict
          ? `<span class="badge" data-tone="${getFitTone(card.fitAssessment.verdict)}">${escapeHtml(getOptionLabel("fit", card.fitAssessment.verdict))}</span>`
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
      ${renderActionButton("apply-card", card.id, "Applied", "action-btn-primary")}
      ${renderActionButton("discard-card", card.id, "Discard")}
      ${renderActionButton("show-details", card.id, "See more", "action-btn-quiet")}
    </div>
  `
}

function renderAppliedCard(card) {
  return `
    <div>
      <h3>${escapeHtml(card.company)}</h3>
      <p class="card-role">${escapeHtml(card.role)}</p>
    </div>
    <div class="card-meta">
      <span class="meta-chip">Applied ${escapeHtml(formatPlainDate(card.appliedAt))}</span>
    </div>
    <div class="card-actions">
      ${renderActionButton("start-process", card.id, "Start Process", "action-btn-primary")}
      ${renderActionButton("close-card", card.id, "Close")}
      ${renderActionButton("show-details", card.id, "See more", "action-btn-quiet")}
    </div>
  `
}

function renderInProgressCard(card) {
  const latestStep = getLatestProcessStep(card)

  return `
    <div class="badge-row">
      ${
        latestStep
          ? `<span class="badge">${escapeHtml(getOptionLabel("stage", latestStep.stage))}</span>`
          : `<span class="badge" data-tone="muted">Waiting for first step</span>`
      }
      <span class="badge" data-tone="muted">${card.processSteps.length} step${card.processSteps.length === 1 ? "" : "s"}</span>
    </div>
    <div>
      <h3>${escapeHtml(card.company)}</h3>
      <p class="card-role">${escapeHtml(card.role)}</p>
    </div>
    <div class="card-meta">
      ${
        latestStep?.scheduledAt
          ? `<span class="meta-chip">${escapeHtml(formatPlainDateTime(latestStep.scheduledAt))}</span>`
          : `<span class="meta-chip">No meeting scheduled</span>`
      }
    </div>
    <div class="card-actions">
      ${renderActionButton("add-step", card.id, "Add step", "action-btn-primary")}
      ${renderActionButton("close-card", card.id, "Close")}
      ${renderActionButton("show-details", card.id, "See more", "action-btn-quiet")}
    </div>
  `
}

function renderClosedCard(card) {
  return `
    <div class="badge-row">
      <span class="badge" data-tone="${getCloseTone(card.closeReason)}">${escapeHtml(getOptionLabel("close", card.closeReason))}</span>
    </div>
    <div>
      <h3>${escapeHtml(card.company)}</h3>
      <p class="card-role">${escapeHtml(card.role)}</p>
    </div>
    <div class="card-meta">
      <span class="meta-chip">Closed ${escapeHtml(formatPlainDate(card.closedAt))}</span>
    </div>
    <div class="card-actions">
      ${renderActionButton("reopen-card", card.id, "Reopen", "action-btn-primary")}
      ${renderActionButton("show-details", card.id, "See more", "action-btn-quiet")}
    </div>
  `
}

function renderCard(columnId, card) {
  const body =
    columnId === "backlog"
      ? renderBacklogCard(card)
      : columnId === "applied"
        ? renderAppliedCard(card)
        : columnId === "in_progress"
          ? renderInProgressCard(card)
          : renderClosedCard(card)

  return `<li><article class="application-card">${body}</article></li>`
}

function renderColumn(columnId, column, cards, columnIndex) {
  const cardMarkup = cards.length
    ? cards.map((card) => renderCard(columnId, card)).join("")
    : `<p class="column-empty">No applications here yet. Use the buttons on other cards or create a new one from the top bar.</p>`

  return `
    <section class="board-column" data-column-id="${escapeHtml(columnId)}">
      <header class="column-header">
        <div class="column-title-group">
          <p class="column-kicker">Lane ${String(columnIndex + 1).padStart(2, "0")}</p>
          <h2>${escapeHtml(getColumnTitle(columnId))}</h2>
        </div>
        <div class="column-count" aria-label="${escapeHtml(String(column.cardIds.length))} cards">${escapeHtml(String(column.cardIds.length))}</div>
      </header>
      <ol class="card-list">${cardMarkup}</ol>
    </section>
  `
}

export function createBoardRenderer({ getState, boardRoot, summaryRoot }) {
  function renderSummary(state) {
    const total = Object.keys(state.cardsById).length
    const active = state.columns.applied.cardIds.length + state.columns.in_progress.cardIds.length
    const closed = state.columns.closed.cardIds.length

    if (total === 0) {
      summaryRoot.textContent = "Create your first application card to start tracking the pipeline."
      return
    }

    summaryRoot.textContent = `${total} application${total === 1 ? "" : "s"} saved locally. ${active} active and ${closed} closed.`
  }

  function render() {
    const state = getState()

    renderSummary(state)

    boardRoot.innerHTML = FIXED_COLUMN_ORDER.map((columnId, index) => {
      const column = state.columns[columnId]
      const cards = column.cardIds.map((cardId) => state.cardsById[cardId]).filter(Boolean)
      return renderColumn(columnId, column, cards, index)
    }).join("")
  }

  return {
    render
  }
}
