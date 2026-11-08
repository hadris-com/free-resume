// The app in WebKit (Safari's engine, and every browser on iOS) and Firefox.
// Printing to PDF isn't available in these engines, so these check the preview: it loads,
// every template renders, the sample fits one sheet, and the sheets show every word once.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { firefox, webkit } from "playwright";
import { startServer } from "../helpers/server.mjs";

const pageSizes = ["a4", "letter"];

// Fills the saved draft with the sample resume plus extra jobs, then reloads the app on it.
async function loadSample(page, extraJobs = 0) {
  await page.evaluate(async (extra) => {
    const { createSampleStateBuilders } = await import("/js/sample-state.js");
    const sample = createSampleStateBuilders({ getState: () => ({}), sanitizeResumeState: (state) => state }).buildSampleResumeState();
    const jobs = sample.experience.slice();
    for (let i = 0; i < extra; i++) sample.experience.push({ ...jobs[i % jobs.length], role: `${jobs[i % jobs.length].role} ${i + 2}` });
    const draft = JSON.parse(localStorage.getItem("free-resume:draft"));
    draft.data = { ...draft.data, ...sample };
    localStorage.setItem("free-resume:draft", JSON.stringify(draft));
  }, extraJobs);
  await page.reload();
  await page.waitForSelector("#resume-preview .resume-page");
  await page.evaluate(() => document.fonts.ready);
}

async function choose(page, template, pageSize) {
  await page.evaluate(([template, pageSize]) => {
    document.querySelector(`#template-select-menu [data-value=${template}]`).click();
    document.querySelector(`[data-page-size=${pageSize}]`).click();
  }, [template, pageSize]);
  await page.waitForFunction((template) => document.getElementById("resume-preview").className.includes(`template-${template}`), template);
  await page.waitForTimeout(150);
}

// Words whose center falls inside a sheet, compared with every word of the resume.
function sheetCoverage() {
  const words = (root, box) => {
    const out = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const pattern = /\S+/g;
      let match;
      while ((match = pattern.exec(node.nodeValue))) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const rect = range.getBoundingClientRect();
        if (!rect.width) continue;
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        if (!box || (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom)) out.push(match[0]);
      }
    }
    return out;
  };
  const sheets = [...document.querySelectorAll("#resume-preview .paper-sheet")];
  const visible = sheets.flatMap((sheet) => words(sheet, sheet.getBoundingClientRect()));
  const all = words(sheets[0].querySelector(".resume-page"));
  const count = (list) => list.reduce((map, word) => map.set(word, (map.get(word) || 0) + 1), new Map());
  const shown = count(visible);
  const expected = count(all);
  return {
    sheets: sheets.length,
    missing: [...expected].filter(([word, n]) => (shown.get(word) || 0) < n).map(([word]) => word),
    repeated: [...shown].filter(([word, n]) => (expected.get(word) || 0) < n).map(([word]) => word)
  };
}

for (const [name, engine] of [
  ["webkit", webkit],
  ["firefox", firefox]
]) {
  describe(name, { timeout: 300000 }, () => {
    let server;
    let browser;
    let page;
    let templates;
    const errors = [];

    before(async () => {
      server = await startServer();
      browser = await engine.launch();
      page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(server.url);
      await page.waitForSelector("#resume-preview .resume-page");
      templates = await page.evaluate(() => [...document.querySelectorAll("#template-select-menu [role=option]")].map((option) => option.dataset.value));
    });

    after(async () => {
      await browser?.close();
      await server?.close();
    });

    test("every template renders", async () => {
      assert.ok(templates.length > 0);
      await loadSample(page);
      for (const template of templates) {
        await choose(page, template, "a4");
        assert.ok(await page.evaluate(() => document.getElementById("resume-preview").textContent.includes("Lena Hoffmann")), template);
      }
    });

    test("the sample resume fits on one sheet", async () => {
      await loadSample(page);
      for (const template of templates) {
        for (const pageSize of pageSizes) {
          await choose(page, template, pageSize);
          assert.equal(await page.locator("#resume-preview .paper-sheet").count(), 1, `${template} ${pageSize}`);
        }
      }
    });

    // WebKit doesn't repeat the page's top padding on later sheets, so a line can fall
    // between two of them: https://github.com/hadris-com/free-resume/issues/91
    test(
      "a long resume shows every word on exactly one sheet",
      { todo: name === "webkit" ? "WebKit clips lines at sheet boundaries (#91)" : false },
      async () => {
        await loadSample(page, 6);
        const problems = [];
        for (const template of templates) {
          for (const pageSize of pageSizes) {
            await choose(page, template, pageSize);
            const { sheets, missing, repeated } = await page.evaluate(sheetCoverage);
            if (sheets < 2) problems.push(`${template} ${pageSize}: only ${sheets} sheet`);
            if (missing.length) problems.push(`${template} ${pageSize}: missing ${missing.slice(0, 5).join(" ")}`);
            if (repeated.length) problems.push(`${template} ${pageSize}: repeated ${repeated.slice(0, 5).join(" ")}`);
          }
        }
        assert.deepEqual(problems, []);
      }
    );

    test("no uncaught errors in the page", () => {
      assert.deepEqual(errors, []);
    });
  });
}
