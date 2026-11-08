// The preview's sheets must match the exported PDF's pages, in every template and page size.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { launchBrowser, loadSampleDraft, sleep } from "./helpers/browser.mjs";
import { startServer } from "./helpers/server.mjs";

const pageSizes = ["a4", "letter"];

describe("pagination", { timeout: 600000 }, () => {
  let server;
  let browser;
  let page;
  let templates;

  before(async () => {
    server = await startServer();
    browser = await launchBrowser();
    page = browser.page;
    await page.setViewport(1440, 900);
    await page.open(server.url);
    templates = await page.evaluate("[...document.querySelectorAll('#template-select-menu [role=option]')].map((option) => option.dataset.value)");
  });

  after(async () => {
    await browser?.close();
    await server?.close();
  });

  const choose = async (template, pageSize) => {
    await page.evaluate(`
      document.querySelector('#template-select-menu [data-value=${template}]').click();
      document.querySelector('[data-page-size=${pageSize}]').click();
    `);
    await page.waitFor(`document.getElementById('resume-preview').className.includes('template-${template}')`);
    await sleep(100);
  };

  test("the sample resume fits on one page", async () => {
    await page.click("document.getElementById('sample-btn')");
    for (const template of templates) {
      for (const pageSize of pageSizes) {
        await choose(template, pageSize);
        assert.equal(await page.sheetCount(), 1, `${template} ${pageSize}: preview sheets`);
        assert.equal(await page.pdfPageCount(), 1, `${template} ${pageSize}: PDF pages`);
      }
    }
  });

  // Grows the summary one sentence at a time across the first page break. Content near a break
  // is where a blank trailing page or a sheet count that differs from the PDF shows up.
  for (const [label, width, height, mobile] of [
    ["desktop", 1440, 900, false],
    ["phone", 390, 844, true]
  ]) {
    test(`sheets match PDF pages across a page break (${label})`, async () => {
      await page.setViewport(1440, 900);
      const sample = await page.evaluate(`import("/js/sample-state.js").then(({ createSampleStateBuilders }) =>
        createSampleStateBuilders({ getState: () => ({}), sanitizeResumeState: (state) => state }).buildSampleResumeState().experience)`);
      // Six jobs: the length at which a pushed-down summary once left a blank last PDF page.
      const extra = [1, 2].map((n) => ({ ...sample[0], role: `${sample[0].role} ${n}` }));
      await loadSampleDraft(page, { experience: [...sample, ...extra] });
      await page.setViewport(width, height, mobile);

      const summary = "document.querySelector('textarea[data-field=summary]')";
      const base = await page.evaluate(`${summary}.value`);
      const setSentences = async (count) => {
        const text = base + " Filler sentence that takes up space to push the text down the page by lines.".repeat(count);
        await page.evaluate(`(() => {
          const field = ${summary};
          field.value = ${JSON.stringify(text)};
          field.dispatchEvent(new Event("input", { bubbles: true }));
        })()`);
        await sleep(60);
      };

      const mismatches = [];
      for (const template of templates) {
        for (const pageSize of pageSizes) {
          await choose(template, pageSize);
          await setSentences(0);
          const startSheets = await page.sheetCount();
          // Coarse steps find the break quickly, then single steps find its exact sentence.
          let breakAt = -1;
          for (let count = 4; count <= 240 && breakAt === -1; count += 4) {
            await setSentences(count);
            if ((await page.sheetCount()) > startSheets) {
              for (breakAt = count - 3; breakAt < count; breakAt++) {
                await setSentences(breakAt);
                if ((await page.sheetCount()) > startSheets) break;
              }
            }
          }
          assert.notEqual(breakAt, -1, `${template} ${pageSize}: the resume never reached another page`);

          for (let count = Math.max(0, breakAt - 3); count <= breakAt + 3; count++) {
            await setSentences(count);
            const sheets = await page.sheetCount();
            const pages = await page.pdfPageCount();
            if (sheets !== pages) mismatches.push(`${template} ${pageSize} +${count}: ${sheets} sheets, ${pages} PDF pages`);
          }
        }
      }
      await setSentences(0);
      assert.deepEqual(mismatches, []);
    });
  }

  test("no uncaught errors in the page", () => {
    assert.deepEqual(page.errors, []);
  });
});
