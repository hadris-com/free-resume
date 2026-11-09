// Drives headless Chrome over the DevTools protocol, with no dependencies beyond Node.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

export const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(mac)) return mac;
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    for (const dir of (process.env.PATH || "").split(delimiter)) {
      if (existsSync(join(dir, name))) return join(dir, name);
    }
  }
  throw new Error("Chrome not found. Set CHROME_PATH to a Chrome or Chromium binary.");
}

// A cold CI runner starting two Chromes at once can miss the wait, so a failed start is retried.
export async function launchBrowser(attempts = 2) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await startChrome();
    } catch (error) {
      if (attempt >= attempts) throw error;
    }
  }
}

async function startChrome() {
  const profile = await mkdtemp(join(tmpdir(), "free-resume-test-"));
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank"
  ];
  // Linux CI runners can't create Chrome's sandbox.
  if (process.platform === "linux") args.unshift("--no-sandbox");
  const chrome = spawn(findChrome(), args, { stdio: "ignore" });
  let exited = false;
  chrome.once("exit", () => (exited = true));

  // With port 0, Chrome writes the port it picked to this file, so parallel runs never collide.
  let port;
  for (let i = 0; i < 300 && !port && !exited; i++) {
    await sleep(100);
    try {
      port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0];
    } catch {}
  }
  if (!port) {
    // A Chrome left running would keep the test process alive until the job times out.
    if (!exited) {
      chrome.kill("SIGKILL");
      await new Promise((done) => chrome.once("exit", done));
    }
    await rm(profile, { recursive: true, force: true });
    throw new Error("Chrome did not start");
  }

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
    } catch {}
    if (!target) await sleep(100);
  }
  const page = await connect(target.webSocketDebuggerUrl);

  return {
    page,
    async close() {
      page.close();
      chrome.kill();
      await new Promise((done) => chrome.once("exit", done));
      await rm(profile, { recursive: true, force: true });
    }
  };
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((done, fail) => {
    ws.onopen = done;
    ws.onerror = fail;
  });
  let nextId = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.method === "Runtime.exceptionThrown") {
      errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
    }
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };

  const send = (method, params = {}) =>
    new Promise((done, fail) => {
      const id = ++nextId;
      pending.set(id, (data) => (data.error ? fail(new Error(`${method}: ${data.error.message}`)) : done(data.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });

  // Evaluates an expression in the page and returns its value; a page exception fails the test.
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

  const page = {
    send,
    evaluate,
    errors,
    close: () => ws.close(),

    async setViewport(width, height, mobile = false) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
      await sleep(250);
    },

    // Loads the app and waits until the preview and its fonts are ready.
    async open(url) {
      await send("Page.navigate", { url });
      await page.waitFor("!!document.querySelector('#resume-preview .resume-page')");
      await evaluate("document.fonts.ready.then(() => true)");
      await sleep(300);
    },

    async reload() {
      await send("Page.reload", { ignoreCache: true });
      await sleep(200);
      await page.waitFor("!!document.querySelector('#resume-preview .resume-page')");
      await evaluate("document.fonts.ready.then(() => true)");
      await sleep(300);
    },

    async waitFor(expression, timeoutMs = 10000) {
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        try {
          if (await evaluate(expression)) return;
        } catch {}
        await sleep(100);
      }
      throw new Error(`Timed out waiting for ${expression}`);
    },

    // Real mouse click at the element's center, so pointer handlers and focus behave as for a person.
    async click(selectorExpression) {
      const box = await evaluate(`(() => {
        const element = ${selectorExpression};
        element.scrollIntoView({ block: "center" });
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
      await sleep(300);
    },

    sheetCount: () => evaluate("document.querySelectorAll('#resume-preview .paper-sheet').length"),

    // Exports the PDF the way the app's print dialog does and returns its page count.
    async pdfPageCount() {
      const { data } = await send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
      const pdf = Buffer.from(data, "base64").toString("latin1");
      const match = pdf.match(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/);
      if (!match) throw new Error("Could not read the PDF's page count");
      return Number(match[1]);
    }
  };
  return page;
}

// Replaces the saved draft with the sample resume plus any overrides, then reloads the app on it.
// The Sample button shows the sample without saving it, so tests seed the draft directly.
export async function loadSampleDraft(page, overrides = {}) {
  await page.evaluate(`(async () => {
    const { createSampleStateBuilders } = await import("/js/sample-state.js");
    const sample = createSampleStateBuilders({
      getState: () => ({ uiLang: "en", cvLang: "en", template: "alpine", pageSize: "a4", theme: "light" }),
      sanitizeResumeState: (state) => state
    }).buildSampleResumeState();
    const draft = JSON.parse(localStorage.getItem("free-resume:draft"));
    draft.data = { ...draft.data, ...sample, ...${JSON.stringify(overrides)} };
    localStorage.setItem("free-resume:draft", JSON.stringify(draft));
  })()`);
  await page.reload();
}
