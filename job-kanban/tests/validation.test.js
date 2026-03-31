import assert from "node:assert/strict"
import test from "node:test"

import { APP_ID, SCHEMA_VERSION, createEmptyBoardState } from "../js/schema.js"
import { isDiscardReason, parseBoardPayload } from "../js/validation.js"

function buildValidState() {
  const state = createEmptyBoardState()

  state.cardsById["card-1"] = {
    id: "card-1",
    company: "Acme Corp",
    role: "Staff Engineer",
    jobUrl: "https://example.com/jobs/1",
    location: "Remote",
    notes: "Bring architecture examples.",
    backlogLabel: "ready_to_apply",
    fitAssessment: {
      verdict: "strong",
      summary: "Relevant platform experience.",
      reviewedAt: "2026-03-01"
    },
    processSteps: [
      {
        id: "step-1",
        stage: "screening",
        status: "planned",
        scheduledAt: "2026-03-05T09:30",
        contactPerson: "Taylor Kim",
        stepNotes: "Intro call booked.",
        createdAt: "2026-03-02T08:00:00.000Z",
        updatedAt: "2026-03-02T08:00:00.000Z"
      }
    ],
    appliedAt: "2026-03-02",
    closeReason: null,
    closeNote: "",
    closedAt: null,
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-02T08:00:00.000Z"
  }
  state.columns.in_progress.cardIds.push("card-1")

  return state
}

function buildPayload(data = buildValidState(), overrides = {}) {
  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: "2026-03-15T12:30:00.000Z",
    data,
    ...overrides
  }
}

test("parseBoardPayload normalizes a valid snapshot", () => {
  const state = buildValidState()

  state.cardsById["card-1"] = {
    ...state.cardsById["card-1"],
    company: "  Acme Corp  ",
    role: "  Staff Engineer ",
    jobUrl: " https://example.com/jobs/1 ",
    location: " Remote ",
    notes: "  Bring architecture examples.  ",
    fitAssessment: {
      ...state.cardsById["card-1"].fitAssessment,
      summary: "  Relevant platform experience.  "
    },
    processSteps: [
      {
        ...state.cardsById["card-1"].processSteps[0],
        contactPerson: " Taylor Kim ",
        stepNotes: " Intro call booked. "
      }
    ]
  }

  const parsed = parseBoardPayload(buildPayload(state))

  assert.ok(parsed)
  assert.deepEqual(parsed.columns.in_progress.cardIds, ["card-1"])
  assert.equal(parsed.cardsById["card-1"].company, "Acme Corp")
  assert.equal(parsed.cardsById["card-1"].role, "Staff Engineer")
  assert.equal(parsed.cardsById["card-1"].jobUrl, "https://example.com/jobs/1")
  assert.equal(parsed.cardsById["card-1"].location, "Remote")
  assert.equal(parsed.cardsById["card-1"].notes, "Bring architecture examples.")
  assert.equal(parsed.cardsById["card-1"].fitAssessment.summary, "Relevant platform experience.")
  assert.equal(parsed.cardsById["card-1"].processSteps[0].contactPerson, "Taylor Kim")
  assert.equal(parsed.cardsById["card-1"].processSteps[0].stepNotes, "Intro call booked.")
})

test("parseBoardPayload strips job URLs with unsafe protocols instead of rejecting the snapshot", () => {
  const state = buildValidState()

  state.cardsById["card-1"] = {
    ...state.cardsById["card-1"],
    jobUrl: "javascript:alert(1)"
  }

  const parsed = parseBoardPayload(buildPayload(state))

  assert.ok(parsed)
  assert.equal(parsed.cardsById["card-1"].jobUrl, "")
})

test("parseBoardPayload rejects snapshots with duplicate column references", () => {
  const state = buildValidState()

  state.columns.backlog.cardIds.push("card-1")

  assert.equal(parseBoardPayload(buildPayload(state)), null)
})

test("parseBoardPayload rejects unsupported schema versions", () => {
  assert.equal(parseBoardPayload(buildPayload(buildValidState(), { schemaVersion: SCHEMA_VERSION + 1 })), null)
})

test("parseBoardPayload rejects snapshots with a non-string app marker", () => {
  assert.equal(parseBoardPayload(buildPayload(buildValidState(), { app: 42 })), null)
})

test("parseBoardPayload rejects malformed card data", () => {
  const state = buildValidState()

  state.cardsById["card-1"] = {
    ...state.cardsById["card-1"],
    processSteps: [
      {
        ...state.cardsById["card-1"].processSteps[0],
        stage: "phone_screen"
      }
    ]
  }

  assert.equal(parseBoardPayload(buildPayload(state)), null)
})

test("isDiscardReason only allows the restricted backlog close reasons", () => {
  assert.equal(isDiscardReason("expired"), true)
  assert.equal(isDiscardReason("accepted"), false)
})
