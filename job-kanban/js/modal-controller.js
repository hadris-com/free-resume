import {
  formatInstant,
  formatPlainDate,
  formatPlainDateTime,
  nowPlainDateTimeString,
  toDateTimeInputValue,
  todayPlainDateString
} from "./dates.js"
import { getLocalizedKanbanOptionLabel } from "./i18n.js"
import {
  backlogCloseReasonOptions,
  backlogLabelOptions,
  closeReasonOptions,
  fitVerdictOptions,
  processStageOptions,
  processStatusOptions
} from "./schema.js"
import { normalizeHttpUrl } from "./url-sanitization.js"

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderOptions(options, selectedValue, getOptionLabel, { blankLabel = null } = {}) {
  const items = []

  if (blankLabel != null) {
    items.push(`<option value="">${escapeHtml(blankLabel)}</option>`)
  }

  for (const option of options) {
    items.push(
      `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(getOptionLabel(option.value))}</option>`
    )
  }

  return items.join("")
}

function getLatestProcessStep(card) {
  if (!Array.isArray(card.processSteps) || card.processSteps.length === 0) {
    return null
  }

  return card.processSteps
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]
}

function normalizeShortText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeLongText(value) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : ""
}

function renderCloseButton(view, getTranslation) {
  const action = view.returnView ? "return" : "close"
  const label = view.returnView ? getTranslation("actions.back") : getTranslation("actions.cancel")
  return `<button type="button" class="toolbar-btn toolbar-btn-quiet" data-modal-action="${action}">${escapeHtml(label)}</button>`
}

function renderModalShell({ kicker, title, subtitle = "", body, footer, formView = null }) {
  const content = `
    <div class="modal-shell">
      <div class="modal-header">
        <div>
          <p class="modal-kicker">${escapeHtml(kicker)}</p>
          <h2>${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="modal-subtitle">${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer">${footer}</div>
    </div>
  `

  if (!formView) {
    return content
  }

  return `<form class="modal-form" data-modal-view="${escapeHtml(formView)}">${content}</form>`
}

function renderDetailItem(label, value, { emptyLabel, full = false, rich = false, isLink = false } = {}) {
  const classes = `detail-item${full ? " detail-item-full" : ""}`
  let detailMarkup = `<span class="detail-empty">${escapeHtml(emptyLabel)}</span>`

  if (value) {
    if (isLink) {
      const safeUrl = normalizeHttpUrl(value)
      detailMarkup = safeUrl
        ? `<a class="detail-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(value)}</a>`
        : escapeHtml(value)
    } else {
      detailMarkup = rich
        ? `<div class="detail-rich-text">${escapeHtml(value)}</div>`
        : escapeHtml(value)
    }
  }

  return `
    <dl class="${classes}">
      <dt>${escapeHtml(label)}</dt>
      <dd>${detailMarkup}</dd>
    </dl>
  `
}

function renderDetailsActions(cardId, columnId, getTranslation) {
  const workflowButtons =
    columnId === "backlog"
      ? `
        <button type="button" class="toolbar-btn toolbar-btn-primary" data-modal-action="open-apply-card" data-card-id="${escapeHtml(cardId)}">${escapeHtml(getTranslation("actions.applied"))}</button>
        <button type="button" class="toolbar-btn" data-modal-action="open-close-card" data-card-id="${escapeHtml(cardId)}" data-mode="discard">${escapeHtml(getTranslation("actions.discard"))}</button>
      `
      : columnId === "applied"
        ? `
          <button type="button" class="toolbar-btn toolbar-btn-primary" data-modal-action="open-step-editor" data-card-id="${escapeHtml(cardId)}">${escapeHtml(getTranslation("actions.startProcess"))}</button>
          <button type="button" class="toolbar-btn" data-modal-action="open-close-card" data-card-id="${escapeHtml(cardId)}" data-mode="close">${escapeHtml(getTranslation("actions.closeCard"))}</button>
        `
        : columnId === "in_progress"
          ? `
            <button type="button" class="toolbar-btn toolbar-btn-primary" data-modal-action="open-step-editor" data-card-id="${escapeHtml(cardId)}">${escapeHtml(getTranslation("actions.addStep"))}</button>
            <button type="button" class="toolbar-btn" data-modal-action="open-close-card" data-card-id="${escapeHtml(cardId)}" data-mode="close">${escapeHtml(getTranslation("actions.closeCard"))}</button>
          `
          : `<button type="button" class="toolbar-btn toolbar-btn-primary" data-modal-action="reopen-card" data-card-id="${escapeHtml(cardId)}">${escapeHtml(getTranslation("actions.reopen"))}</button>`

  return `
    <div class="details-actions">
      <button type="button" class="toolbar-btn toolbar-btn-quiet" data-modal-action="open-edit-basics" data-card-id="${escapeHtml(cardId)}">${escapeHtml(getTranslation("actions.editBasics"))}</button>
      <button type="button" class="toolbar-btn toolbar-btn-quiet" data-modal-action="open-edit-fit" data-card-id="${escapeHtml(cardId)}">${escapeHtml(getTranslation("actions.editFit"))}</button>
      ${workflowButtons}
      <button type="button" class="toolbar-btn action-btn-danger" data-modal-action="open-delete-confirmation" data-card-id="${escapeHtml(cardId)}">${escapeHtml(getTranslation("actions.deletePermanently"))}</button>
    </div>
  `
}

function renderDetailsView(card, columnId, getTranslation) {
  const emptyLabel = getTranslation("common.notSet")
  const latestStep = getLatestProcessStep(card)
  const subtitle =
    columnId === "backlog"
      ? getLocalizedKanbanOptionLabel("backlog", card.backlogLabel, getTranslation, "modal.subtitle.backlog")
      : columnId === "applied"
        ? getTranslation("modal.subtitle.applied")
        : columnId === "in_progress"
          ? getTranslation("modal.subtitle.inProgress")
          : getTranslation("modal.subtitle.closed")
  const stepListMarkup = card.processSteps.length
    ? `
      <div class="timeline-list">
        ${card.processSteps
          .map((step) => {
            return `
              <article class="timeline-item">
                <div class="timeline-item-header">
                  <div>
                    <p class="timeline-item-title">${escapeHtml(getLocalizedKanbanOptionLabel("stage", step.stage, getTranslation))}</p>
                    <div class="timeline-meta">
                      <span class="meta-chip">${escapeHtml(getLocalizedKanbanOptionLabel("status", step.status, getTranslation))}</span>
                      ${
                        step.scheduledAt
                          ? `<span class="meta-chip">${escapeHtml(formatPlainDateTime(step.scheduledAt))}</span>`
                          : ""
                      }
                      ${
                        step.contactPerson
                          ? `<span class="meta-chip">${escapeHtml(step.contactPerson)}</span>`
                          : ""
                      }
                    </div>
                  </div>
                  <div class="timeline-item-actions">
                    <button
                      type="button"
                      class="text-btn"
                      data-modal-action="edit-step"
                      data-card-id="${escapeHtml(card.id)}"
                      data-step-id="${escapeHtml(step.id)}"
                    >
                      ${escapeHtml(getTranslation("actions.editStep"))}
                    </button>
                  </div>
                </div>
                ${step.stepNotes ? `<div class="detail-rich-text">${escapeHtml(step.stepNotes)}</div>` : ""}
              </article>
            `
          })
          .join("")}
      </div>
    `
    : `<p class="detail-empty">${escapeHtml(getTranslation("modal.noProcessSteps"))}</p>`

  const body = `
    <section class="detail-section">
      <div class="detail-grid">
        ${renderDetailItem(getTranslation("fields.company"), card.company, { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.role"), card.role, { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.location"), card.location, { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.backlogLabel"), getLocalizedKanbanOptionLabel("backlog", card.backlogLabel, getTranslation), { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.jobUrl"), card.jobUrl, { emptyLabel, full: true, isLink: true })}
        ${renderDetailItem(getTranslation("fields.notes"), card.notes, { emptyLabel, full: true, rich: true })}
      </div>
    </section>

    <section class="detail-section">
      <h3>${escapeHtml(getTranslation("sections.fitAssessment"))}</h3>
      <div class="detail-grid">
        ${renderDetailItem(getTranslation("fields.verdict"), getLocalizedKanbanOptionLabel("fit", card.fitAssessment.verdict, getTranslation), { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.reviewed"), card.fitAssessment.reviewedAt ? formatPlainDate(card.fitAssessment.reviewedAt) : "", { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.summary"), card.fitAssessment.summary, { emptyLabel, full: true, rich: true })}
      </div>
    </section>

    <section class="detail-section">
      <h3>${escapeHtml(getTranslation("sections.process"))}</h3>
      ${
        latestStep
          ? `<p class="form-hint">${escapeHtml(getTranslation("modal.currentStepHint", { stage: getLocalizedKanbanOptionLabel("stage", latestStep.stage, getTranslation) }))}</p>`
          : `<p class="form-hint">${escapeHtml(getTranslation("modal.firstStepHint"))}</p>`
      }
      ${stepListMarkup}
    </section>

    <section class="detail-section">
      <h3>${escapeHtml(getTranslation("sections.lifecycle"))}</h3>
      <div class="detail-grid">
        ${renderDetailItem(getTranslation("fields.applied"), card.appliedAt ? formatPlainDate(card.appliedAt) : "", { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.closed"), card.closedAt ? formatPlainDate(card.closedAt) : "", { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.closeReason"), getLocalizedKanbanOptionLabel("close", card.closeReason, getTranslation), { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.closeNote"), card.closeNote, { emptyLabel, full: true, rich: true })}
        ${renderDetailItem(getTranslation("fields.created"), formatInstant(card.createdAt), { emptyLabel })}
        ${renderDetailItem(getTranslation("fields.updated"), formatInstant(card.updatedAt), { emptyLabel })}
      </div>
    </section>
  `

  return renderModalShell({
    kicker: getTranslation("modal.cardDetails"),
    title: `${card.company} · ${card.role}`,
    subtitle,
    body,
    footer: renderDetailsActions(card.id, columnId, getTranslation)
  })
}

function renderCreateCardView(view, getTranslation) {
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="company-input">${escapeHtml(getTranslation("fields.company"))}</label>
        <input id="company-input" name="company" type="text" required />
      </div>
      <div class="form-field">
        <label for="role-input">${escapeHtml(getTranslation("fields.role"))}</label>
        <input id="role-input" name="role" type="text" required />
      </div>
      <div class="form-field">
        <label for="job-url-input">${escapeHtml(getTranslation("fields.jobUrl"))}</label>
        <input id="job-url-input" name="jobUrl" type="text" inputmode="url" />
      </div>
      <div class="form-field">
        <label for="location-input">${escapeHtml(getTranslation("fields.location"))}</label>
        <input id="location-input" name="location" type="text" />
      </div>
      <div class="form-field">
        <label for="backlog-label-input">${escapeHtml(getTranslation("fields.backlogLabel"))}</label>
        <select id="backlog-label-input" name="backlogLabel">${renderOptions(backlogLabelOptions, "considering", (value) => getLocalizedKanbanOptionLabel("backlog", value, getTranslation))}</select>
      </div>
      <p class="form-hint form-field-full">${escapeHtml(getTranslation("modal.createCard.hint"))}</p>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: getTranslation("modal.createCard.kicker"),
    title: getTranslation("modal.createCard.title"),
    subtitle: getTranslation("modal.createCard.subtitle"),
    body,
    footer: `${renderCloseButton(view, getTranslation)}<button type="submit" class="toolbar-btn toolbar-btn-primary">${escapeHtml(getTranslation("actions.createApplication"))}</button>`,
    formView: "create-card"
  })
}

function renderEditBasicsView(view, card, getTranslation) {
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="company-input">${escapeHtml(getTranslation("fields.company"))}</label>
        <input id="company-input" name="company" type="text" value="${escapeHtml(card.company)}" required />
      </div>
      <div class="form-field">
        <label for="role-input">${escapeHtml(getTranslation("fields.role"))}</label>
        <input id="role-input" name="role" type="text" value="${escapeHtml(card.role)}" required />
      </div>
      <div class="form-field">
        <label for="job-url-input">${escapeHtml(getTranslation("fields.jobUrl"))}</label>
        <input id="job-url-input" name="jobUrl" type="text" inputmode="url" value="${escapeHtml(card.jobUrl)}" />
      </div>
      <div class="form-field">
        <label for="location-input">${escapeHtml(getTranslation("fields.location"))}</label>
        <input id="location-input" name="location" type="text" value="${escapeHtml(card.location)}" />
      </div>
      <div class="form-field">
        <label for="backlog-label-input">${escapeHtml(getTranslation("fields.backlogLabel"))}</label>
        <select id="backlog-label-input" name="backlogLabel">${renderOptions(backlogLabelOptions, card.backlogLabel, (value) => getLocalizedKanbanOptionLabel("backlog", value, getTranslation))}</select>
      </div>
      <div class="form-field-full">
        <label for="notes-input">${escapeHtml(getTranslation("fields.notes"))}</label>
        <textarea id="notes-input" name="notes">${escapeHtml(card.notes)}</textarea>
      </div>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: getTranslation("modal.editBasics.kicker"),
    title: card.company,
    subtitle: getTranslation("modal.editBasics.subtitle"),
    body,
    footer: `${renderCloseButton(view, getTranslation)}<button type="submit" class="toolbar-btn toolbar-btn-primary">${escapeHtml(getTranslation("actions.saveBasics"))}</button>`,
    formView: "edit-basics"
  })
}

function renderFitView(view, card, getTranslation) {
  const reviewedAt = card.fitAssessment.reviewedAt ?? ""
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="fit-verdict-input">${escapeHtml(getTranslation("fields.verdict"))}</label>
        <select id="fit-verdict-input" name="verdict">${renderOptions(fitVerdictOptions, card.fitAssessment.verdict, (value) => getLocalizedKanbanOptionLabel("fit", value, getTranslation), { blankLabel: getTranslation("modal.editFit.blankVerdict") })}</select>
      </div>
      <div class="form-field">
        <label for="reviewed-at-input">${escapeHtml(getTranslation("fields.reviewedDate"))}</label>
        <input id="reviewed-at-input" name="reviewedAt" type="date" value="${escapeHtml(reviewedAt)}" />
      </div>
      <div class="form-field-full">
        <label for="summary-input">${escapeHtml(getTranslation("fields.summary"))}</label>
        <textarea id="summary-input" name="summary">${escapeHtml(card.fitAssessment.summary)}</textarea>
      </div>
      <p class="form-hint form-field-full">${escapeHtml(getTranslation("modal.editFit.hint"))}</p>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: getTranslation("modal.editFit.kicker"),
    title: card.company,
    subtitle: getTranslation("modal.editFit.subtitle"),
    body,
    footer: `${renderCloseButton(view, getTranslation)}<button type="submit" class="toolbar-btn toolbar-btn-primary">${escapeHtml(getTranslation("actions.saveFit"))}</button>`,
    formView: "edit-fit"
  })
}

function renderApplyView(view, card, getTranslation) {
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="applied-at-input">${escapeHtml(getTranslation("fields.appliedDate"))}</label>
        <input id="applied-at-input" name="appliedAt" type="date" value="${escapeHtml(card.appliedAt ?? todayPlainDateString())}" required />
      </div>
      <p class="form-hint form-field-full">${escapeHtml(getTranslation("modal.apply.hint"))}</p>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: getTranslation("modal.apply.kicker"),
    title: `${card.company} · ${card.role}`,
    subtitle: getTranslation("modal.apply.subtitle"),
    body,
    footer: `${renderCloseButton(view, getTranslation)}<button type="submit" class="toolbar-btn toolbar-btn-primary">${escapeHtml(getTranslation("actions.moveToApplied"))}</button>`,
    formView: "apply-card"
  })
}

function renderStepView(view, card, step, getTranslation) {
  const isEditing = Boolean(step)
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="stage-input">${escapeHtml(getTranslation("fields.stage"))}</label>
        <select id="stage-input" name="stage">${renderOptions(processStageOptions, step?.stage ?? "screening", (value) => getLocalizedKanbanOptionLabel("stage", value, getTranslation))}</select>
      </div>
      <div class="form-field">
        <label for="status-input">${escapeHtml(getTranslation("fields.status"))}</label>
        <select id="status-input" name="status">${renderOptions(processStatusOptions, step?.status ?? "planned", (value) => getLocalizedKanbanOptionLabel("status", value, getTranslation))}</select>
      </div>
      <div class="form-field">
        <label for="scheduled-at-input">${escapeHtml(getTranslation("fields.scheduledTime"))}</label>
        <input
          id="scheduled-at-input"
          name="scheduledAt"
          type="datetime-local"
          value="${escapeHtml(toDateTimeInputValue(step?.scheduledAt ?? ""))}"
          placeholder="${escapeHtml(nowPlainDateTimeString())}"
        />
      </div>
      <div class="form-field">
        <label for="contact-person-input">${escapeHtml(getTranslation("fields.contactPerson"))}</label>
        <input id="contact-person-input" name="contactPerson" type="text" value="${escapeHtml(step?.contactPerson ?? "")}" />
      </div>
      <div class="form-field-full">
        <label for="step-notes-input">${escapeHtml(getTranslation("fields.stepNotes"))}</label>
        <textarea id="step-notes-input" name="stepNotes">${escapeHtml(step?.stepNotes ?? "")}</textarea>
      </div>
      <p class="form-hint form-field-full">${escapeHtml(getTranslation("modal.step.hint"))}</p>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: isEditing ? getTranslation("modal.step.editKicker") : getTranslation("modal.step.addKicker"),
    title: `${card.company} · ${card.role}`,
    subtitle: isEditing ? getTranslation("modal.step.editSubtitle") : getTranslation("modal.step.addSubtitle"),
    body,
    footer: `${renderCloseButton(view, getTranslation)}<button type="submit" class="toolbar-btn toolbar-btn-primary">${escapeHtml(getTranslation(isEditing ? "actions.saveStep" : "actions.addStep"))}</button>`,
    formView: isEditing ? "edit-step" : "add-step"
  })
}

function renderCloseView(view, card, getTranslation) {
  const isDiscard = view.mode === "discard"
  const options = isDiscard ? backlogCloseReasonOptions : closeReasonOptions
  const defaultReason = card.closeReason && options.some((option) => option.value === card.closeReason) ? card.closeReason : options[0].value
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="close-reason-input">${escapeHtml(getTranslation("fields.reason"))}</label>
        <select id="close-reason-input" name="closeReason">${renderOptions(options, defaultReason, (value) => getLocalizedKanbanOptionLabel("close", value, getTranslation))}</select>
      </div>
      <div class="form-field">
        <label for="closed-at-input">${escapeHtml(getTranslation("fields.closedDate"))}</label>
        <input id="closed-at-input" name="closedAt" type="date" value="${escapeHtml(card.closedAt ?? todayPlainDateString())}" required />
      </div>
      <div class="form-field-full">
        <label for="close-note-input">${escapeHtml(getTranslation("fields.note"))}</label>
        <textarea id="close-note-input" name="closeNote">${escapeHtml(card.closeNote)}</textarea>
      </div>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: isDiscard ? getTranslation("modal.close.discardKicker") : getTranslation("modal.close.closeKicker"),
    title: `${card.company} · ${card.role}`,
    subtitle: isDiscard ? getTranslation("modal.close.discardSubtitle") : getTranslation("modal.close.closeSubtitle"),
    body,
    footer: `${renderCloseButton(view, getTranslation)}<button type="submit" class="toolbar-btn toolbar-btn-primary">${escapeHtml(getTranslation(isDiscard ? "actions.discardApplication" : "actions.closeApplication"))}</button>`,
    formView: isDiscard ? "discard-card" : "close-card"
  })
}

function renderDeleteView(view, card, getTranslation) {
  const body = `
    <div class="form-grid">
      <div class="form-field-full">
        <p class="danger-copy">${escapeHtml(getTranslation("modal.delete.warning"))}</p>
        <p class="form-hint">${escapeHtml(getTranslation("modal.delete.typeToConfirm"))} <strong>${escapeHtml(card.company)}</strong> ${escapeHtml(getTranslation("modal.delete.confirmSuffix"))}</p>
      </div>
      <div class="form-field-full">
        <label for="delete-confirm-input">${escapeHtml(getTranslation("modal.delete.companyName"))}</label>
        <input id="delete-confirm-input" name="confirmCompany" type="text" required />
      </div>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: getTranslation("modal.delete.kicker"),
    title: `${card.company} · ${card.role}`,
    subtitle: getTranslation("modal.delete.subtitle"),
    body,
    footer: `${renderCloseButton(view, getTranslation)}<button type="submit" class="toolbar-btn action-btn-danger">${escapeHtml(getTranslation("actions.deletePermanently"))}</button>`,
    formView: "delete-card"
  })
}

export function createModalController({ dialog, contentRoot, store, announce, getTranslation }) {
  let currentView = null

  function close() {
    if (dialog.open) {
      dialog.close()
    } else {
      currentView = null
      contentRoot.innerHTML = ""
    }
  }

  function show(view) {
    currentView = view
    render()

    if (!dialog.open) {
      dialog.showModal()
    }
  }

  function refresh() {
    render()
  }

  function setFeedback(message, tone = "error") {
    const feedbackNode = contentRoot.querySelector("[data-modal-feedback]")

    if (!feedbackNode) {
      return
    }

    feedbackNode.textContent = message
    feedbackNode.dataset.tone = tone
  }

  function finish(message, tone = "success") {
    announce(message, tone)

    if (currentView?.returnView) {
      show(currentView.returnView)
      return
    }

    close()
  }

  function render() {
    if (!currentView) {
      contentRoot.innerHTML = ""
      return
    }

    if (currentView.type === "create-card") {
      contentRoot.innerHTML = renderCreateCardView(currentView, getTranslation)
      return
    }

    const card = store.getCard(currentView.cardId)

    if (!card) {
      close()
      return
    }

    if (currentView.type === "details") {
      const columnId = store.getCardColumnId(currentView.cardId)

      if (!columnId) {
        close()
        return
      }

      contentRoot.innerHTML = renderDetailsView(card, columnId, getTranslation)
      return
    }

    if (currentView.type === "edit-basics") {
      contentRoot.innerHTML = renderEditBasicsView(currentView, card, getTranslation)
      return
    }

    if (currentView.type === "edit-fit") {
      contentRoot.innerHTML = renderFitView(currentView, card, getTranslation)
      return
    }

    if (currentView.type === "apply-card") {
      contentRoot.innerHTML = renderApplyView(currentView, card, getTranslation)
      return
    }

    if (currentView.type === "step-editor") {
      const step = currentView.stepId ? card.processSteps.find((item) => item.id === currentView.stepId) ?? null : null
      contentRoot.innerHTML = renderStepView(currentView, card, step, getTranslation)
      return
    }

    if (currentView.type === "close-card") {
      contentRoot.innerHTML = renderCloseView(currentView, card, getTranslation)
      return
    }

    if (currentView.type === "delete-card") {
      contentRoot.innerHTML = renderDeleteView(currentView, card, getTranslation)
    }
  }

  function openCreateCard() {
    show({
      type: "create-card"
    })
  }

  function openCardDetails(cardId) {
    if (!store.getCard(cardId)) {
      return
    }

    show({
      type: "details",
      cardId
    })
  }

  function openEditBasics(cardId, options = {}) {
    if (!store.getCard(cardId)) {
      return
    }

    show({
      type: "edit-basics",
      cardId,
      returnView: options.returnView ?? null
    })
  }

  function openEditFit(cardId, options = {}) {
    if (!store.getCard(cardId)) {
      return
    }

    show({
      type: "edit-fit",
      cardId,
      returnView: options.returnView ?? null
    })
  }

  function openApplyCard(cardId, options = {}) {
    if (!store.getCard(cardId)) {
      return
    }

    show({
      type: "apply-card",
      cardId,
      returnView: options.returnView ?? null
    })
  }

  function openStepEditor({ cardId, stepId = null, returnView = null }) {
    if (!store.getCard(cardId)) {
      return
    }

    show({
      type: "step-editor",
      cardId,
      stepId,
      returnView
    })
  }

  function openCloseCard({ cardId, mode, returnView = null }) {
    if (!store.getCard(cardId)) {
      return
    }

    show({
      type: "close-card",
      cardId,
      mode,
      returnView
    })
  }

  function openDeleteConfirmation(cardId, options = {}) {
    if (!store.getCard(cardId)) {
      return
    }

    show({
      type: "delete-card",
      cardId,
      returnView: options.returnView ?? null
    })
  }

  function handleSubmit(event) {
    const form = event.target

    if (!(form instanceof HTMLFormElement)) {
      return
    }

    event.preventDefault()

    if (!currentView) {
      return
    }

    const formData = new FormData(form)

    if (currentView.type === "create-card") {
      const company = normalizeShortText(formData.get("company"))
      const role = normalizeShortText(formData.get("role"))

      if (!company || !role) {
        setFeedback(getTranslation("feedback.companyRoleRequired"))
        return
      }

      const createdCard = store.createCard({
        company,
        role,
        jobUrl: normalizeShortText(formData.get("jobUrl")),
        location: normalizeShortText(formData.get("location")),
        backlogLabel: normalizeShortText(formData.get("backlogLabel"))
      })

      if (!createdCard) {
        setFeedback(getTranslation("feedback.createFailed"))
        return
      }

      finish(getTranslation("announcements.created", { company: createdCard.company }))
      return
    }

    const card = store.getCard(currentView.cardId)

    if (!card) {
      close()
      return
    }

    if (currentView.type === "edit-basics") {
      const company = normalizeShortText(formData.get("company"))
      const role = normalizeShortText(formData.get("role"))

      if (!company || !role) {
        setFeedback(getTranslation("feedback.companyRoleRequired"))
        return
      }

      const updatedCard = store.updateBasics(card.id, {
        company,
        role,
        jobUrl: normalizeShortText(formData.get("jobUrl")),
        location: normalizeShortText(formData.get("location")),
        backlogLabel: normalizeShortText(formData.get("backlogLabel")),
        notes: normalizeLongText(formData.get("notes"))
      })

      if (!updatedCard) {
        setFeedback(getTranslation("feedback.saveBasicsFailed"))
        return
      }

      finish(getTranslation("announcements.savedBasics", { company: updatedCard.company }))
      return
    }

    if (currentView.type === "edit-fit") {
      const updatedCard = store.updateFit(card.id, {
        verdict: normalizeShortText(formData.get("verdict")),
        summary: normalizeLongText(formData.get("summary")),
        reviewedAt: normalizeShortText(formData.get("reviewedAt"))
      })

      if (!updatedCard) {
        setFeedback(getTranslation("feedback.saveFitFailed"))
        return
      }

      finish(getTranslation("announcements.savedFit", { company: updatedCard.company }))
      return
    }

    if (currentView.type === "apply-card") {
      const appliedCard = store.applyCard(card.id, {
        appliedAt: normalizeShortText(formData.get("appliedAt"))
      })

      if (!appliedCard) {
        setFeedback(getTranslation("feedback.applyFailed"))
        return
      }

      finish(getTranslation("announcements.movedApplied", { company: appliedCard.company }))
      return
    }

    if (currentView.type === "step-editor") {
      const payload = {
        stage: normalizeShortText(formData.get("stage")),
        status: normalizeShortText(formData.get("status")),
        scheduledAt: normalizeShortText(formData.get("scheduledAt")),
        contactPerson: normalizeShortText(formData.get("contactPerson")),
        stepNotes: normalizeLongText(formData.get("stepNotes"))
      }

      const result = currentView.stepId
        ? store.editProcessStep(card.id, currentView.stepId, payload)
        : store.addProcessStep(card.id, payload)

      if (!result) {
        setFeedback(getTranslation("feedback.stepFailed"))
        return
      }

      finish(
        getTranslation(currentView.stepId ? "announcements.updatedStep" : "announcements.addedStep", {
          company: card.company
        })
      )
      return
    }

    if (currentView.type === "close-card") {
      const closedCard = store.closeCard(card.id, {
        closeReason: normalizeShortText(formData.get("closeReason")),
        closeNote: normalizeLongText(formData.get("closeNote")),
        closedAt: normalizeShortText(formData.get("closedAt"))
      })

      if (!closedCard) {
        setFeedback(getTranslation("feedback.closeFailed"))
        return
      }

      finish(getTranslation("announcements.movedClosed", { company: closedCard.company }))
      return
    }

    if (currentView.type === "delete-card") {
      const confirmation = normalizeShortText(formData.get("confirmCompany"))

      if (confirmation !== card.company) {
        setFeedback(getTranslation("feedback.deleteMismatch"))
        return
      }

      const deletedCard = store.deleteCard(card.id)

      if (!deletedCard) {
        setFeedback(getTranslation("feedback.deleteFailed"))
        return
      }

      announce(getTranslation("announcements.deleted", { company: deletedCard.company }), "success")
      close()
    }
  }

  function handleClick(event) {
    if (event.target === dialog) {
      close()
      return
    }

    const trigger = event.target instanceof Element ? event.target.closest("[data-modal-action]") : null

    if (!trigger) {
      return
    }

    event.preventDefault()

    const action = trigger.dataset.modalAction
    const cardId = trigger.dataset.cardId

    if (action === "close") {
      close()
      return
    }

    if (action === "return") {
      if (currentView?.returnView) {
        show(currentView.returnView)
      } else {
        close()
      }

      return
    }

    if (action === "open-edit-basics") {
      openEditBasics(cardId, {
        returnView: {
          type: "details",
          cardId
        }
      })
      return
    }

    if (action === "open-edit-fit") {
      openEditFit(cardId, {
        returnView: {
          type: "details",
          cardId
        }
      })
      return
    }

    if (action === "open-apply-card") {
      openApplyCard(cardId)
      return
    }

    if (action === "open-step-editor") {
      openStepEditor({
        cardId,
        returnView: {
          type: "details",
          cardId
        }
      })
      return
    }

    if (action === "edit-step") {
      openStepEditor({
        cardId,
        stepId: trigger.dataset.stepId,
        returnView: {
          type: "details",
          cardId
        }
      })
      return
    }

    if (action === "open-close-card") {
      openCloseCard({
        cardId,
        mode: trigger.dataset.mode,
        returnView: null
      })
      return
    }

    if (action === "open-delete-confirmation") {
      openDeleteConfirmation(cardId, {
        returnView: {
          type: "details",
          cardId
        }
      })
      return
    }

    if (action === "reopen-card") {
      const reopenedCard = store.reopenCard(cardId)

      if (reopenedCard) {
        announce(getTranslation("announcements.reopened", { company: reopenedCard.company }), "success")
      }

      close()
    }
  }

  dialog.addEventListener("click", handleClick)
  dialog.addEventListener("submit", handleSubmit)
  dialog.addEventListener("close", () => {
    currentView = null
    contentRoot.innerHTML = ""
  })

  return {
    close,
    refresh,
    openCreateCard,
    openCardDetails,
    openEditBasics,
    openEditFit,
    openApplyCard,
    openStepEditor,
    openCloseCard,
    openDeleteConfirmation
  }
}
