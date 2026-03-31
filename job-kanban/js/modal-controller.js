import {
  formatInstant,
  formatPlainDate,
  formatPlainDateTime,
  nowPlainDateTimeString,
  toDateTimeInputValue,
  todayPlainDateString
} from "./dates.js"
import {
  backlogCloseReasonOptions,
  backlogLabelOptions,
  closeReasonOptions,
  fitVerdictOptions,
  getOptionLabel,
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

function renderOptions(options, selectedValue, { blankLabel = null } = {}) {
  const items = []

  if (blankLabel != null) {
    items.push(`<option value="">${escapeHtml(blankLabel)}</option>`)
  }

  for (const option of options) {
    items.push(
      `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`
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

function renderCloseButton(view) {
  const action = view.returnView ? "return" : "close"
  const label = view.returnView ? "Back" : "Cancel"
  return `<button type="button" class="toolbar-btn toolbar-btn-quiet" data-modal-action="${action}">${label}</button>`
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

function renderDetailItem(label, value, { full = false, rich = false, isLink = false } = {}) {
  const classes = `detail-item${full ? " detail-item-full" : ""}`
  let detailMarkup = `<span class="detail-empty">Not set</span>`

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

function renderDetailsActions(cardId, columnId) {
  const workflowButtons =
    columnId === "backlog"
      ? `
        <button type="button" class="toolbar-btn toolbar-btn-primary" data-modal-action="open-apply-card" data-card-id="${escapeHtml(cardId)}">Applied</button>
        <button type="button" class="toolbar-btn" data-modal-action="open-close-card" data-card-id="${escapeHtml(cardId)}" data-mode="discard">Discard</button>
      `
      : columnId === "applied"
        ? `
          <button type="button" class="toolbar-btn toolbar-btn-primary" data-modal-action="open-step-editor" data-card-id="${escapeHtml(cardId)}">Start Process</button>
          <button type="button" class="toolbar-btn" data-modal-action="open-close-card" data-card-id="${escapeHtml(cardId)}" data-mode="close">Close</button>
        `
        : columnId === "in_progress"
          ? `
            <button type="button" class="toolbar-btn toolbar-btn-primary" data-modal-action="open-step-editor" data-card-id="${escapeHtml(cardId)}">Add step</button>
            <button type="button" class="toolbar-btn" data-modal-action="open-close-card" data-card-id="${escapeHtml(cardId)}" data-mode="close">Close</button>
          `
          : `<button type="button" class="toolbar-btn toolbar-btn-primary" data-modal-action="reopen-card" data-card-id="${escapeHtml(cardId)}">Reopen</button>`

  return `
    <div class="details-actions">
      <button type="button" class="toolbar-btn toolbar-btn-quiet" data-modal-action="open-edit-basics" data-card-id="${escapeHtml(cardId)}">Edit basics</button>
      <button type="button" class="toolbar-btn toolbar-btn-quiet" data-modal-action="open-edit-fit" data-card-id="${escapeHtml(cardId)}">Edit fit</button>
      ${workflowButtons}
      <button type="button" class="toolbar-btn action-btn-danger" data-modal-action="open-delete-confirmation" data-card-id="${escapeHtml(cardId)}">Delete permanently</button>
    </div>
  `
}

function renderDetailsView(card, columnId) {
  const latestStep = getLatestProcessStep(card)
  const subtitle =
    columnId === "backlog"
      ? getOptionLabel("backlog", card.backlogLabel, "Backlog card")
      : columnId === "applied"
        ? "Applied workflow card"
        : columnId === "in_progress"
          ? "Currently active"
          : "Closed workflow card"
  const stepListMarkup = card.processSteps.length
    ? `
      <div class="timeline-list">
        ${card.processSteps
          .map((step) => {
            return `
              <article class="timeline-item">
                <div class="timeline-item-header">
                  <div>
                    <p class="timeline-item-title">${escapeHtml(getOptionLabel("stage", step.stage))}</p>
                    <div class="timeline-meta">
                      <span class="meta-chip">${escapeHtml(getOptionLabel("status", step.status))}</span>
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
                      Edit step
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
    : `<p class="detail-empty">No process steps yet.</p>`

  const body = `
    <section class="detail-section">
      <div class="detail-grid">
        ${renderDetailItem("Company", card.company)}
        ${renderDetailItem("Role", card.role)}
        ${renderDetailItem("Location", card.location)}
        ${renderDetailItem("Backlog label", getOptionLabel("backlog", card.backlogLabel))}
        ${renderDetailItem("Job URL", card.jobUrl, { full: true, isLink: true })}
        ${renderDetailItem("Notes", card.notes, { full: true, rich: true })}
      </div>
    </section>

    <section class="detail-section">
      <h3>Fit assessment</h3>
      <div class="detail-grid">
        ${renderDetailItem("Verdict", getOptionLabel("fit", card.fitAssessment.verdict))}
        ${renderDetailItem("Reviewed", card.fitAssessment.reviewedAt ? formatPlainDate(card.fitAssessment.reviewedAt) : "")}
        ${renderDetailItem("Summary", card.fitAssessment.summary, { full: true, rich: true })}
      </div>
    </section>

    <section class="detail-section">
      <h3>Process</h3>
      ${
        latestStep
          ? `<p class="form-hint">Current step is derived from the latest recorded process step: ${escapeHtml(getOptionLabel("stage", latestStep.stage))}.</p>`
          : `<p class="form-hint">Current in-progress state appears here after you add the first process step.</p>`
      }
      ${stepListMarkup}
    </section>

    <section class="detail-section">
      <h3>Lifecycle</h3>
      <div class="detail-grid">
        ${renderDetailItem("Applied", card.appliedAt ? formatPlainDate(card.appliedAt) : "")}
        ${renderDetailItem("Closed", card.closedAt ? formatPlainDate(card.closedAt) : "")}
        ${renderDetailItem("Close reason", getOptionLabel("close", card.closeReason))}
        ${renderDetailItem("Close note", card.closeNote, { full: true, rich: true })}
        ${renderDetailItem("Created", formatInstant(card.createdAt))}
        ${renderDetailItem("Updated", formatInstant(card.updatedAt))}
      </div>
    </section>
  `

  return renderModalShell({
    kicker: "Card details",
    title: `${card.company} · ${card.role}`,
    subtitle,
    body,
    footer: renderDetailsActions(card.id, columnId)
  })
}

function renderCreateCardView(view) {
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="company-input">Company</label>
        <input id="company-input" name="company" type="text" required />
      </div>
      <div class="form-field">
        <label for="role-input">Role</label>
        <input id="role-input" name="role" type="text" required />
      </div>
      <div class="form-field">
        <label for="job-url-input">Job URL</label>
        <input id="job-url-input" name="jobUrl" type="text" inputmode="url" />
      </div>
      <div class="form-field">
        <label for="location-input">Location</label>
        <input id="location-input" name="location" type="text" />
      </div>
      <div class="form-field">
        <label for="backlog-label-input">Backlog label</label>
        <select id="backlog-label-input" name="backlogLabel">${renderOptions(backlogLabelOptions, "considering")}</select>
      </div>
      <p class="form-hint form-field-full">New cards always start in Backlog and are inserted at the top of the column.</p>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: "Create card",
    title: "New application",
    subtitle: "Capture the basics now and review the rest later from the details view.",
    body,
    footer: `${renderCloseButton(view)}<button type="submit" class="toolbar-btn toolbar-btn-primary">Create application</button>`,
    formView: "create-card"
  })
}

function renderEditBasicsView(view, card) {
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="company-input">Company</label>
        <input id="company-input" name="company" type="text" value="${escapeHtml(card.company)}" required />
      </div>
      <div class="form-field">
        <label for="role-input">Role</label>
        <input id="role-input" name="role" type="text" value="${escapeHtml(card.role)}" required />
      </div>
      <div class="form-field">
        <label for="job-url-input">Job URL</label>
        <input id="job-url-input" name="jobUrl" type="text" inputmode="url" value="${escapeHtml(card.jobUrl)}" />
      </div>
      <div class="form-field">
        <label for="location-input">Location</label>
        <input id="location-input" name="location" type="text" value="${escapeHtml(card.location)}" />
      </div>
      <div class="form-field">
        <label for="backlog-label-input">Backlog label</label>
        <select id="backlog-label-input" name="backlogLabel">${renderOptions(backlogLabelOptions, card.backlogLabel)}</select>
      </div>
      <div class="form-field-full">
        <label for="notes-input">Notes</label>
        <textarea id="notes-input" name="notes">${escapeHtml(card.notes)}</textarea>
      </div>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: "Edit basics",
    title: card.company,
    subtitle: "Update core card context without changing the workflow column.",
    body,
    footer: `${renderCloseButton(view)}<button type="submit" class="toolbar-btn toolbar-btn-primary">Save basics</button>`,
    formView: "edit-basics"
  })
}

function renderFitView(view, card) {
  const reviewedAt = card.fitAssessment.reviewedAt ?? ""
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="fit-verdict-input">Verdict</label>
        <select id="fit-verdict-input" name="verdict">${renderOptions(fitVerdictOptions, card.fitAssessment.verdict, { blankLabel: "Not reviewed" })}</select>
      </div>
      <div class="form-field">
        <label for="reviewed-at-input">Reviewed date</label>
        <input id="reviewed-at-input" name="reviewedAt" type="date" value="${escapeHtml(reviewedAt)}" />
      </div>
      <div class="form-field-full">
        <label for="summary-input">Summary</label>
        <textarea id="summary-input" name="summary">${escapeHtml(card.fitAssessment.summary)}</textarea>
      </div>
      <p class="form-hint form-field-full">If you save a verdict or summary without a review date, today is used automatically.</p>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: "Edit fit",
    title: card.company,
    subtitle: "Capture structured verdicts for filtering-ready context and keep the explanation as text.",
    body,
    footer: `${renderCloseButton(view)}<button type="submit" class="toolbar-btn toolbar-btn-primary">Save fit</button>`,
    formView: "edit-fit"
  })
}

function renderApplyView(view, card) {
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="applied-at-input">Applied date</label>
        <input id="applied-at-input" name="appliedAt" type="date" value="${escapeHtml(card.appliedAt ?? todayPlainDateString())}" required />
      </div>
      <p class="form-hint form-field-full">Saving moves the card to Applied and inserts it at the top of that column.</p>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: "Applied",
    title: `${card.company} · ${card.role}`,
    subtitle: "Record the application date before moving the card forward.",
    body,
    footer: `${renderCloseButton(view)}<button type="submit" class="toolbar-btn toolbar-btn-primary">Move to Applied</button>`,
    formView: "apply-card"
  })
}

function renderStepView(view, card, step) {
  const isEditing = Boolean(step)
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="stage-input">Stage</label>
        <select id="stage-input" name="stage">${renderOptions(processStageOptions, step?.stage ?? "screening")}</select>
      </div>
      <div class="form-field">
        <label for="status-input">Status</label>
        <select id="status-input" name="status">${renderOptions(processStatusOptions, step?.status ?? "planned")}</select>
      </div>
      <div class="form-field">
        <label for="scheduled-at-input">Scheduled time</label>
        <input
          id="scheduled-at-input"
          name="scheduledAt"
          type="datetime-local"
          value="${escapeHtml(toDateTimeInputValue(step?.scheduledAt ?? ""))}"
          placeholder="${escapeHtml(nowPlainDateTimeString())}"
        />
      </div>
      <div class="form-field">
        <label for="contact-person-input">Contact person</label>
        <input id="contact-person-input" name="contactPerson" type="text" value="${escapeHtml(step?.contactPerson ?? "")}" />
      </div>
      <div class="form-field-full">
        <label for="step-notes-input">Step notes</label>
        <textarea id="step-notes-input" name="stepNotes">${escapeHtml(step?.stepNotes ?? "")}</textarea>
      </div>
      <p class="form-hint form-field-full">A new step moves the card into In Progress if it is not already there.</p>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: isEditing ? "Edit step" : "Add step",
    title: `${card.company} · ${card.role}`,
    subtitle: isEditing ? "Update the selected process step." : "Append the next process step to this application.",
    body,
    footer: `${renderCloseButton(view)}<button type="submit" class="toolbar-btn toolbar-btn-primary">${isEditing ? "Save step" : "Add step"}</button>`,
    formView: isEditing ? "edit-step" : "add-step"
  })
}

function renderCloseView(view, card) {
  const isDiscard = view.mode === "discard"
  const options = isDiscard ? backlogCloseReasonOptions : closeReasonOptions
  const defaultReason = card.closeReason && options.some((option) => option.value === card.closeReason) ? card.closeReason : options[0].value
  const body = `
    <div class="form-grid">
      <div class="form-field">
        <label for="close-reason-input">Reason</label>
        <select id="close-reason-input" name="closeReason">${renderOptions(options, defaultReason)}</select>
      </div>
      <div class="form-field">
        <label for="closed-at-input">Closed date</label>
        <input id="closed-at-input" name="closedAt" type="date" value="${escapeHtml(card.closedAt ?? todayPlainDateString())}" required />
      </div>
      <div class="form-field-full">
        <label for="close-note-input">Note</label>
        <textarea id="close-note-input" name="closeNote">${escapeHtml(card.closeNote)}</textarea>
      </div>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: isDiscard ? "Discard" : "Close",
    title: `${card.company} · ${card.role}`,
    subtitle: isDiscard ? "Choose a self-decision reason before moving the card to Closed." : "Record why this application is closing.",
    body,
    footer: `${renderCloseButton(view)}<button type="submit" class="toolbar-btn toolbar-btn-primary">${isDiscard ? "Discard application" : "Close application"}</button>`,
    formView: isDiscard ? "discard-card" : "close-card"
  })
}

function renderDeleteView(view, card) {
  const body = `
    <div class="form-grid">
      <div class="form-field-full">
        <p class="danger-copy">Permanent delete removes the card and every process step from this browser immediately.</p>
        <p class="form-hint">Type <strong>${escapeHtml(card.company)}</strong> to confirm.</p>
      </div>
      <div class="form-field-full">
        <label for="delete-confirm-input">Company name</label>
        <input id="delete-confirm-input" name="confirmCompany" type="text" required />
      </div>
      <p class="modal-feedback form-field-full" data-modal-feedback></p>
    </div>
  `

  return renderModalShell({
    kicker: "Delete confirmation",
    title: `${card.company} · ${card.role}`,
    subtitle: "This action cannot be undone.",
    body,
    footer: `${renderCloseButton(view)}<button type="submit" class="toolbar-btn action-btn-danger">Delete permanently</button>`,
    formView: "delete-card"
  })
}

export function createModalController({ dialog, contentRoot, store, announce }) {
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
      contentRoot.innerHTML = renderCreateCardView(currentView)
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

      contentRoot.innerHTML = renderDetailsView(card, columnId)
      return
    }

    if (currentView.type === "edit-basics") {
      contentRoot.innerHTML = renderEditBasicsView(currentView, card)
      return
    }

    if (currentView.type === "edit-fit") {
      contentRoot.innerHTML = renderFitView(currentView, card)
      return
    }

    if (currentView.type === "apply-card") {
      contentRoot.innerHTML = renderApplyView(currentView, card)
      return
    }

    if (currentView.type === "step-editor") {
      const step = currentView.stepId ? card.processSteps.find((item) => item.id === currentView.stepId) ?? null : null
      contentRoot.innerHTML = renderStepView(currentView, card, step)
      return
    }

    if (currentView.type === "close-card") {
      contentRoot.innerHTML = renderCloseView(currentView, card)
      return
    }

    if (currentView.type === "delete-card") {
      contentRoot.innerHTML = renderDeleteView(currentView, card)
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
        setFeedback("Company and role are required.")
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
        setFeedback("Could not create the application card.")
        return
      }

      finish(`Created ${createdCard.company} in Backlog.`)
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
        setFeedback("Company and role are required.")
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
        setFeedback("Could not save the card changes.")
        return
      }

      finish(`Saved basics for ${updatedCard.company}.`)
      return
    }

    if (currentView.type === "edit-fit") {
      const updatedCard = store.updateFit(card.id, {
        verdict: normalizeShortText(formData.get("verdict")),
        summary: normalizeLongText(formData.get("summary")),
        reviewedAt: normalizeShortText(formData.get("reviewedAt"))
      })

      if (!updatedCard) {
        setFeedback("Could not save the fit assessment.")
        return
      }

      finish(`Saved fit notes for ${updatedCard.company}.`)
      return
    }

    if (currentView.type === "apply-card") {
      const appliedCard = store.applyCard(card.id, {
        appliedAt: normalizeShortText(formData.get("appliedAt"))
      })

      if (!appliedCard) {
        setFeedback("Could not move this card to Applied.")
        return
      }

      finish(`Moved ${appliedCard.company} to Applied.`)
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
        setFeedback("Could not save the process step.")
        return
      }

      finish(currentView.stepId ? `Updated a step for ${card.company}.` : `Added a step for ${card.company}.`)
      return
    }

    if (currentView.type === "close-card") {
      const closedCard = store.closeCard(card.id, {
        closeReason: normalizeShortText(formData.get("closeReason")),
        closeNote: normalizeLongText(formData.get("closeNote")),
        closedAt: normalizeShortText(formData.get("closedAt"))
      })

      if (!closedCard) {
        setFeedback("Could not close this application.")
        return
      }

      finish(`Moved ${closedCard.company} to Closed.`)
      return
    }

    if (currentView.type === "delete-card") {
      const confirmation = normalizeShortText(formData.get("confirmCompany"))

      if (confirmation !== card.company) {
        setFeedback("Type the company name exactly to confirm deletion.")
        return
      }

      const deletedCard = store.deleteCard(card.id)

      if (!deletedCard) {
        setFeedback("Could not delete this card.")
        return
      }

      announce(`Deleted ${deletedCard.company} permanently.`, "success")
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
        announce(`Moved ${reopenedCard.company} back to Backlog.`, "success")
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
