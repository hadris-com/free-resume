// The MCP server and the app each validate resumes. These checks keep them in agreement, so a
// file the server produces or accepts is one the app can import.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { sampleResume } from "../dist/sample-data.js";
import { retiredTemplates as serverRetired, templateNames } from "../dist/schema.js";
import { sanitizeResumeState, validateResumeDetailed } from "../dist/validation.js";
import { retiredTemplates as appRetired, templateCatalog } from "../../js/preview-renderers.js";
import { createResumeNormalization } from "../../js/resume-normalization.js";

const app = createResumeNormalization({ templateCatalog, retiredTemplates: appRetired });

const cases = {
  "the bundled example": sampleResume.data,
  "an empty resume": {},
  "a retired template": { template: "noir" },
  "an unknown template": { template: "nonsense" },
  "an unknown root key": { color: "red" },
  "an unknown page size": { pageSize: "a5" },
  "a summary over the limit": { summary: "x".repeat(10001) },
  "a role over the limit": { experience: [{ role: "x".repeat(161) }] },
  "too many skills": { skills: Array.from({ length: 101 }, (_, i) => ({ name: `Skill ${i}` })) },
  "an invalid skill level": { skills: [{ name: "Figma", level: "guru" }] },
  "experience that isn't a list": { experience: {} }
};

describe("server and app", () => {
  test("offer the same templates", () => {
    assert.deepEqual([...templateNames].sort(), Object.keys(templateCatalog).sort());
  });

  test("map retired templates the same way", () => {
    assert.deepEqual(serverRetired, appRetired);
  });

  for (const [name, resume] of Object.entries(cases)) {
    test(`agree on whether ${name} is valid`, () => {
      const serverAccepts = validateResumeDetailed(resume).length === 0;
      assert.equal(app.validateResumeShape(resume), serverAccepts);
    });
  }

  // Sanitizing keeps long text whole, so a sanitized resume can still break a limit. The server
  // then refuses to create the file; whenever it would create one, the app must accept it.
  test("agree on every sanitized resume", () => {
    for (const [name, resume] of Object.entries(cases)) {
      const sanitized = sanitizeResumeState(resume);
      assert.equal(app.validateResumeShape(sanitized), validateResumeDetailed(sanitized).length === 0, name);
    }
  });

  test("sanitize the same input to the same resume", () => {
    for (const [name, resume] of Object.entries(cases)) {
      assert.deepEqual(sanitizeResumeState(resume), app.sanitizeResumeState(resume), name);
    }
  });
});
