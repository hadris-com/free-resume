import assert from "node:assert/strict"
import test from "node:test"

import { createBoardStore } from "../js/board-store.js"

test("createCard inserts the newest card at the top of Backlog", () => {
  const store = createBoardStore()
  const firstCard = store.createCard({
    company: "Acme Labs",
    role: "Product Designer",
    backlogLabel: "maybe_later"
  })
  const secondCard = store.createCard({
    company: "Beacon Systems",
    role: "Frontend Engineer"
  })

  assert.deepEqual(store.getState().columns.backlog.cardIds, [secondCard.id, firstCard.id])
  assert.equal(store.getCardColumnId(firstCard.id), "backlog")
  assert.equal(store.getState().cardsById[secondCard.id].backlogLabel, "considering")
})

test("createCard and updateBasics sanitize unsafe job URLs", () => {
  const store = createBoardStore()
  const card = store.createCard({
    company: "Acme Labs",
    role: "Frontend Engineer",
    jobUrl: "javascript:alert(1)"
  })

  assert.equal(card.jobUrl, "")

  const updatedCard = store.updateBasics(card.id, {
    company: "Acme Labs",
    role: "Frontend Engineer",
    jobUrl: "https://example.com/jobs/frontend",
    location: "Remote",
    backlogLabel: "considering",
    notes: ""
  })

  assert.equal(updatedCard.jobUrl, "https://example.com/jobs/frontend")

  store.updateBasics(card.id, {
    company: "Acme Labs",
    role: "Frontend Engineer",
    jobUrl: "data:text/html,<script>alert(1)</script>",
    location: "Remote",
    backlogLabel: "considering",
    notes: ""
  })

  assert.equal(store.getState().cardsById[card.id].jobUrl, "")
})

test("applyCard moves a card into Applied and stores the applied date", () => {
  const store = createBoardStore()
  const card = store.createCard({
    company: "Northwind",
    role: "Full Stack Engineer"
  })

  store.applyCard(card.id, { appliedAt: "2026-03-11" })

  assert.equal(store.getCardColumnId(card.id), "applied")
  assert.deepEqual(store.getState().columns.applied.cardIds, [card.id])
  assert.equal(store.getState().cardsById[card.id].appliedAt, "2026-03-11")
})

test("closeCard and reopenCard preserve application history while clearing close fields", () => {
  const store = createBoardStore()
  const card = store.createCard({
    company: "Orbit Works",
    role: "Platform Engineer"
  })

  store.applyCard(card.id, { appliedAt: "2026-03-07" })
  store.addProcessStep(card.id, {
    stage: "screening",
    status: "completed",
    scheduledAt: "2026-03-08T10:30",
    contactPerson: "Jordan Lee",
    stepNotes: "Great intro call."
  })

  const stepIdsBeforeClose = store.getState().cardsById[card.id].processSteps.map((step) => step.id)

  store.closeCard(card.id, {
    closeReason: "rejected",
    closeNote: "Team paused hiring.",
    closedAt: "2026-03-15"
  })
  store.reopenCard(card.id)

  const reopenedCard = store.getState().cardsById[card.id]

  assert.equal(store.getCardColumnId(card.id), "backlog")
  assert.equal(reopenedCard.appliedAt, "2026-03-07")
  assert.deepEqual(reopenedCard.processSteps.map((step) => step.id), stepIdsBeforeClose)
  assert.equal(reopenedCard.processSteps[0].contactPerson, "Jordan Lee")
  assert.equal(reopenedCard.closeReason, null)
  assert.equal(reopenedCard.closeNote, "")
  assert.equal(reopenedCard.closedAt, null)
})

test("addProcessStep prepends new steps and editProcessStep only changes the targeted step", () => {
  const store = createBoardStore()
  const card = store.createCard({
    company: "Pine Street",
    role: "Engineering Manager"
  })

  store.addProcessStep(card.id, {
    stage: "screening",
    status: "planned",
    scheduledAt: "2026-03-10T09:00",
    contactPerson: "Avery Park",
    stepNotes: "Phone screen."
  })
  const firstStepId = store.getState().cardsById[card.id].processSteps[0].id

  store.addProcessStep(card.id, {
    stage: "technical",
    status: "planned",
    scheduledAt: "2026-03-12T13:30",
    contactPerson: "Morgan Diaz",
    stepNotes: "Take-home review."
  })

  store.editProcessStep(card.id, firstStepId, {
    stage: "onsite",
    status: "completed",
    scheduledAt: "",
    contactPerson: "Avery Park",
    stepNotes: "Panel completed."
  })

  const steps = store.getState().cardsById[card.id].processSteps

  assert.equal(store.getCardColumnId(card.id), "in_progress")
  assert.deepEqual(steps.map((step) => step.stage), ["technical", "onsite"])
  assert.equal(steps[0].contactPerson, "Morgan Diaz")
  assert.equal(steps[1].status, "completed")
  assert.equal(steps[1].scheduledAt, null)
  assert.equal(steps[1].stepNotes, "Panel completed.")
})

test("date-like fields are validated before being committed to state", () => {
  const store = createBoardStore()
  const card = store.createCard({
    company: "Northwind",
    role: "Platform Engineer"
  })

  assert.equal(store.updateFit(card.id, { verdict: "ship-it", summary: "", reviewedAt: "" }), null)
  assert.equal(store.updateFit(card.id, { verdict: "strong", summary: "", reviewedAt: "2026-02-30" }), null)
  assert.deepEqual(store.getState().cardsById[card.id].fitAssessment, {
    verdict: null,
    summary: "",
    reviewedAt: null
  })

  assert.equal(store.applyCard(card.id, { appliedAt: "2026-02-30" }), null)
  assert.equal(store.getCardColumnId(card.id), "backlog")
  assert.equal(store.getState().cardsById[card.id].appliedAt, null)

  assert.equal(
    store.addProcessStep(card.id, {
      stage: "screening",
      status: "planned",
      scheduledAt: "2026-03-99T09:00",
      contactPerson: "Jordan Lee",
      stepNotes: "Bad schedule."
    }),
    null
  )
  assert.equal(store.getState().cardsById[card.id].processSteps.length, 0)

  store.applyCard(card.id, { appliedAt: "2026-03-07" })
  assert.equal(
    store.closeCard(card.id, {
      closeReason: "rejected",
      closeNote: "Bad close date.",
      closedAt: "2026-02-30"
    }),
    null
  )
  assert.equal(store.getCardColumnId(card.id), "applied")
  assert.equal(store.getState().cardsById[card.id].closedAt, null)

  store.addProcessStep(card.id, {
    stage: "screening",
    status: "planned",
    scheduledAt: "2026-03-10T09:00",
    contactPerson: "Jordan Lee",
    stepNotes: "Valid schedule."
  })
  const stepId = store.getState().cardsById[card.id].processSteps[0].id

  assert.equal(
    store.editProcessStep(card.id, stepId, {
      stage: "screening",
      status: "completed",
      scheduledAt: "not-a-date",
      contactPerson: "Jordan Lee",
      stepNotes: "Invalid edit."
    }),
    null
  )
  assert.equal(store.getState().cardsById[card.id].processSteps[0].scheduledAt, "2026-03-10T09:00")
})

test("deleteCard removes both the stored card and its column reference", () => {
  const store = createBoardStore()
  const keepCard = store.createCard({
    company: "Harbor AI",
    role: "Research Engineer"
  })
  const deletedCard = store.createCard({
    company: "Maple Robotics",
    role: "ML Engineer"
  })

  store.deleteCard(deletedCard.id)

  const state = store.getState()

  assert.equal(state.cardsById[deletedCard.id], undefined)
  assert.deepEqual(state.columns.backlog.cardIds, [keepCard.id])
  assert.equal(store.getCardColumnId(deletedCard.id), null)
})
