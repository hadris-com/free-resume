// Validation, sanitizing and the published schema. Runs against the build in dist/.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { sampleResume } from "../dist/sample-data.js";
import { fieldLimits, resumeJsonSchema, retiredTemplates, templateNames } from "../dist/schema.js";
import { sanitizeResumeState, validateResumeDetailed } from "../dist/validation.js";

const sample = sampleResume.data;
const withChanges = (changes) => ({ ...structuredClone(sample), ...changes });
const errorsFor = (changes) => validateResumeDetailed(withChanges(changes));

describe("validateResumeDetailed", () => {
  test("accepts the bundled example", () => {
    assert.deepEqual(validateResumeDetailed(sample), []);
  });

  test("accepts an empty object, since every field is optional", () => {
    assert.deepEqual(validateResumeDetailed({}), []);
  });

  test("rejects anything that isn't a plain object", () => {
    for (const value of [null, [], "resume", 42, new Date()]) {
      assert.deepEqual(validateResumeDetailed(value), ["Resume must be a plain JSON object"], String(value));
    }
  });

  test("rejects unknown keys at every level", () => {
    assert.match(errorsFor({ color: "red" }).join(), /Unknown root keys: color/);
    assert.match(errorsFor({ profile: { ...sample.profile, age: "30" } }).join(), /Unknown profile keys: age/);
    assert.match(errorsFor({ experience: [{ ...sample.experience[0], salary: "1" }] }).join(), /experience\[0\] has unknown keys: salary/);
    assert.match(errorsFor({ skills: [{ name: "Figma", years: 3 }] }).join(), /skills\[0\] has unknown keys: years/);
  });

  test("accepts every current template and the retired ones", () => {
    for (const template of [...templateNames, ...Object.keys(retiredTemplates)]) {
      assert.deepEqual(errorsFor({ template }), [], template);
    }
  });

  test("rejects an unknown template, page size, theme or language", () => {
    assert.match(errorsFor({ template: "nonsense" }).join(), /'template' must be one of/);
    assert.match(errorsFor({ pageSize: "a5" }).join(), /'pageSize' must be one of/);
    assert.match(errorsFor({ theme: "sepia" }).join(), /'theme' must be one of/);
    assert.match(errorsFor({ cvLang: "fr" }).join(), /'cvLang' must be one of/);
  });

  test("enforces length limits", () => {
    const tooLong = (limit) => "x".repeat(limit + 1);
    assert.match(errorsFor({ summary: tooLong(fieldLimits.summary) }).join(), /'summary' must be a string with max length/);
    assert.match(errorsFor({ profile: { name: tooLong(fieldLimits.profile) } }).join(), /'profile.name'/);
    assert.match(errorsFor({ experience: [{ role: tooLong(fieldLimits.role) }] }).join(), /experience\[0\].role exceeds/);
    assert.match(errorsFor({ education: [{ degree: tooLong(fieldLimits.degree) }] }).join(), /education\[0\].degree exceeds/);
    assert.deepEqual(errorsFor({ summary: "x".repeat(fieldLimits.summary) }), [], "a value at the limit is fine");
  });

  test("limits list length", () => {
    const skills = Array.from({ length: fieldLimits.listLength + 1 }, (_, i) => ({ name: `Skill ${i}` }));
    assert.match(errorsFor({ skills }).join(), /'skills' has 101 items, max is 100/);
  });

  test("checks types and ranges", () => {
    assert.match(errorsFor({ experience: {} }).join(), /'experience' must be an array/);
    assert.match(errorsFor({ experience: ["a job"] }).join(), /experience\[0\] must be a plain object/);
    assert.match(errorsFor({ skills: [{ name: "Figma", level: "guru" }] }).join(), /skills\[0\].level must be one of/);
    assert.match(errorsFor({ nameFontSize: 0 }).join(), /'nameFontSize' must be a number between 1 and 1000/);
    assert.match(errorsFor({ showSkills: {} }).join(), /'showSkills' must be a boolean/);
  });
});

describe("sanitizeResumeState", () => {
  test("opens retired templates as their replacement and unknown ones as Alpine", () => {
    assert.equal(sanitizeResumeState({ template: "noir" }).template, "berlin");
    assert.equal(sanitizeResumeState({ template: "slate" }).template, "berlin");
    assert.equal(sanitizeResumeState({ template: "nonsense" }).template, "alpine");
    assert.equal(sanitizeResumeState({ template: "fjord" }).template, "fjord");
  });

  test("fills defaults for an empty input", () => {
    const state = sanitizeResumeState(undefined);
    assert.equal(state.uiLang, "en");
    assert.equal(state.pageSize, "a4");
    assert.equal(state.theme, "light");
    assert.equal(state.nameFontSize, 100);
    assert.deepEqual(state.experience, []);
    assert.equal(state.profile.name, "");
  });

  test("clamps and coerces values", () => {
    assert.equal(sanitizeResumeState({ nameFontSize: 500 }).nameFontSize, 140);
    assert.equal(sanitizeResumeState({ nameFontSize: 10 }).nameFontSize, 60);
    assert.equal(sanitizeResumeState({ showLanguageLevels: "yes" }).showLanguageLevels, true);
    assert.equal(sanitizeResumeState({ profile: { phone: 5551234 } }).profile.phone, "5551234");
    assert.deepEqual(sanitizeResumeState({ skills: ["Figma"] }).skills, [{ name: "Figma", level: "intermediate", showLevel: false }]);
    assert.equal(sanitizeResumeState({ languages: [{ name: "German", level: "native" }] }).languages[0].level, "intermediate");
  });

  test("its output validates when the input's text is within the limits", () => {
    for (const input of [undefined, {}, sample, { template: "noir", skills: ["Figma"], nameFontSize: 999 }]) {
      assert.deepEqual(validateResumeDetailed(sanitizeResumeState(input)), []);
    }
  });
});

describe("resumeJsonSchema", () => {
  test("lists the current templates and none of the retired ones", () => {
    const templateEnum = resumeJsonSchema.properties.data.properties.template.enum;
    assert.deepEqual(templateEnum, [...templateNames]);
    for (const retired of Object.keys(retiredTemplates)) assert.ok(!templateEnum.includes(retired), retired);
  });
});
