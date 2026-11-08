// The editor, the template gallery and saved drafts, driven in a real browser.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { launchBrowser, loadSampleDraft } from "./helpers/browser.mjs";
import { startServer } from "./helpers/server.mjs";

describe("app", { timeout: 120000 }, () => {
  let server;
  let browser;
  let page;

  before(async () => {
    server = await startServer();
    browser = await launchBrowser();
    page = browser.page;
    await page.setViewport(1440, 900);
    await page.open(server.url);
  });

  after(async () => {
    await browser?.close();
    await server?.close();
  });

  const templateIds = () =>
    page.evaluate("[...document.querySelectorAll('#template-select-menu [role=option]')].map((option) => option.dataset.value)");

  test("a blank resume shows the first-run card, and its Sample button fills the editor", async () => {
    assert.equal(await page.evaluate("getComputedStyle(document.getElementById('first-run')).display !== 'none'"), true);
    await page.click("document.querySelector('#first-run button')");
    assert.equal(await page.evaluate("document.querySelector('[data-profile=name]').value"), "Lena Hoffmann");
    assert.equal(await page.evaluate("getComputedStyle(document.getElementById('first-run')).display"), "none");
  });

  test("typing in the editor reaches the preview", async () => {
    await page.click("document.querySelector('textarea[data-field=summary]')");
    await page.evaluate("(() => { const t = document.querySelector('textarea[data-field=summary]'); t.setSelectionRange(t.value.length, t.value.length); })()");
    await page.send("Input.insertText", { text: " Typed by the test suite." });
    await page.waitFor("document.getElementById('resume-preview').textContent.includes('Typed by the test suite.')");
  });

  test("every template in the gallery has a thumbnail and renders", async () => {
    const ids = await templateIds();
    assert.ok(ids.length > 0, "the gallery lists templates");
    assert.equal(new Set(ids).size, ids.length, "template ids are unique");

    const thumbnails = await page.evaluate(`Promise.all(
      [...document.querySelectorAll('#template-select-menu [role=option]')].map(async (option) => {
        const image = option.querySelector('img');
        const src = image && (image.getAttribute('src') || image.dataset.src);
        return { id: option.dataset.value, status: src ? (await fetch(src)).status : 0 };
      })
    )`);
    for (const { id, status } of thumbnails) assert.equal(status, 200, `${id} thumbnail`);

    for (const id of ids) {
      await page.evaluate(`document.querySelector('#template-select-menu [data-value=${id}]').click()`);
      await page.waitFor(`document.getElementById('resume-preview').className.includes('template-${id}')`);
      assert.equal(await page.evaluate(`document.getElementById('template-select').value`), id);
    }
  });

  test("the resume's text size doesn't depend on the window", async () => {
    // The preview scales the whole sheet, while print measures vw against the paper, so a
    // window-relative size would print differently from what the preview shows.
    const sizes = `[...document.querySelectorAll('#resume-preview .paper-sheet:first-child :is(h1, h2, h3, p, li)')]
      .map((element) => getComputedStyle(element).fontSize).join(" ")`;
    for (const id of await templateIds()) {
      await page.evaluate(`document.querySelector('#template-select-menu [data-value=${id}]').click()`);
      await page.waitFor(`document.getElementById('resume-preview').className.includes('template-${id}')`);
      await page.setViewport(1920, 1080);
      const wide = await page.evaluate(sizes);
      await page.setViewport(800, 900);
      const narrow = await page.evaluate(sizes);
      await page.setViewport(1440, 900);
      assert.equal(wide, narrow, `${id} font sizes`);
    }
  });

  test("removing a skill can be undone", async () => {
    const skills = "document.querySelectorAll('#skills-list .skill-item').length";
    const before = await page.evaluate(skills);
    await page.click("document.querySelector('[data-action=remove-skill]')");
    assert.equal(await page.evaluate(skills), before - 1);
    await page.click("document.querySelector('.notice-action')");
    assert.equal(await page.evaluate(skills), before);
  });

  for (const retired of ["noir", "slate"]) {
    test(`a draft saved with the retired "${retired}" template opens as Berlin`, async () => {
      const name = `Retired ${retired}`;
      await loadSampleDraft(page, { template: retired, profile: { name, title: "Designer" } });
      assert.match(await page.evaluate("document.getElementById('resume-preview').className"), /template-berlin/);
      assert.equal(await page.evaluate("document.getElementById('template-select').value"), "berlin");
      assert.ok(await page.evaluate(`document.getElementById('resume-preview').textContent.includes(${JSON.stringify(name)})`));
      await page.waitFor("JSON.parse(localStorage.getItem('free-resume:draft')).data.template === 'berlin'");
    });
  }

  test("no uncaught errors in the page", () => {
    assert.deepEqual(page.errors, []);
  });
});
