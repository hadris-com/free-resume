import assert from "node:assert/strict"
import test from "node:test"

import {
  isValidInstantString,
  isValidPlainDateString,
  normalizeDateInputValue,
  normalizeDateTimeInputValue,
  toDateTimeInputValue
} from "../js/dates.js"

test("isValidPlainDateString accepts real calendar dates and rejects impossible ones", () => {
  assert.equal(isValidPlainDateString("2024-02-29"), true)
  assert.equal(isValidPlainDateString("2026-02-29"), false)
  assert.equal(isValidPlainDateString("2026-13-01"), false)
})

test("normalizeDateInputValue trims valid date input and rejects invalid values", () => {
  assert.equal(normalizeDateInputValue(" 2026-03-08 "), "2026-03-08")
  assert.equal(normalizeDateInputValue("2026-04-31"), null)
  assert.equal(normalizeDateInputValue("not-a-date"), null)
})

test("normalizeDateTimeInputValue accepts minute and second precision values", () => {
  assert.equal(normalizeDateTimeInputValue(" 2026-03-08T09:45 "), "2026-03-08T09:45")
  assert.equal(normalizeDateTimeInputValue("2026-03-08T09:45:30"), "2026-03-08T09:45:30")
  assert.equal(normalizeDateTimeInputValue("2026-03-08T24:00"), null)
})

test("toDateTimeInputValue returns datetime-local compatible values", () => {
  assert.equal(toDateTimeInputValue("2026-03-08T09:45:30"), "2026-03-08T09:45")
  assert.equal(toDateTimeInputValue("bad-input"), "")
})

test("isValidInstantString rejects malformed timestamps", () => {
  assert.equal(isValidInstantString("2026-03-08T09:45:30.000Z"), true)
  assert.equal(isValidInstantString("2026-03-08"), false)
  assert.equal(isValidInstantString("2026-03-08T09:45:30"), false)
  assert.equal(isValidInstantString("not-an-instant"), false)
})
