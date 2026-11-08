// Renders the template gallery's thumbnails, the README screenshots and the social preview image
// (og-image.png) from the Sample resume.
//
// Usage: node scripts/render-images.mjs
//
// Run it whenever the sample, a template or the interface changes. It drives Chrome, like the
// tests, so it needs only Node 22+ and Chrome. Run it on macOS: the interface uses the system font,
// and the committed screenshots were taken there.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser, sleep } from "../tests/helpers/browser.mjs";
import { startServer } from "../tests/helpers/server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const thumbnailWidth = 320;

const server = await startServer();
const browser = await launchBrowser();
const { page } = browser;

async function viewport(width, height, scale, colorScheme = "light") {
  await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: width < 768 });
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: colorScheme }] });
}

// A fresh blank resume, then the first-run card's Sample button, as a visitor would see it.
async function openSample() {
  await page.open(server.url);
  await page.evaluate("localStorage.clear()");
  await page.reload();
  await page.evaluate(`(${hideMotion})()`);
  // On a phone the card sits in the Preview tab.
  const phone = await page.evaluate("innerWidth < 768");
  if (phone) await page.click("document.querySelector('.view-btn[data-view=preview]')");
  await page.click("document.querySelector('#first-run button')");
  if (phone) await page.click("document.querySelector('.view-btn[data-view=edit]')");
  await sleep(400);
}

function hideMotion() {
  const style = document.createElement("style");
  style.textContent = "*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }";
  document.head.append(style);
}

async function save(path, format, clip) {
  const { data } = await page.send("Page.captureScreenshot", { format, quality: format === "png" ? undefined : 85, ...(clip && { clip }) });
  await writeFile(new URL(path, `file://${root}`), Buffer.from(data, "base64"));
  console.log("wrote", path);
}

try {
  // Thumbnails: the first sheet of each template at full width, scaled down.
  await viewport(1800, 1400, 1);
  await openSample();
  await page.click("document.querySelector('[data-paper-zoom=width]')");
  const templates = await page.evaluate("[...document.querySelectorAll('#template-select-menu [role=option]')].map((option) => option.dataset.value)");
  for (const template of templates) {
    await page.evaluate(`document.querySelector('#template-select-menu [data-value=${template}]').click(); document.querySelector('[data-page-size=a4]').click()`);
    await sleep(400);
    const box = await page.evaluate(`(() => {
      const rect = document.querySelector('#resume-preview .paper-sheet').getBoundingClientRect();
      return { x: rect.left + scrollX, y: rect.top + scrollY, width: rect.width, height: rect.height };
    })()`);
    await save(`assets/templates/${template}.webp`, "webp", { ...box, scale: thumbnailWidth / box.width });
  }

  // README screenshots, at twice the pixel density.
  await viewport(1440, 900, 2);
  await openSample();
  await save("docs/screenshots/desktop.jpg", "jpeg");

  await page.click("document.getElementById('template-select-trigger')");
  await sleep(500);
  await save("docs/screenshots/desktop-gallery.jpg", "jpeg");

  await openSample();
  await page.evaluate("document.querySelector('.panel-section[data-section=experience]').scrollIntoView({ block: 'start' })");
  await page.click("document.querySelector('#experience-list [data-action=toggle-experience]')");
  await page.evaluate("document.querySelector('.panel-section[data-section=experience]').scrollIntoView({ block: 'start' })");
  await sleep(300);
  await save("docs/screenshots/desktop-entry.jpg", "jpeg");

  await page.open(server.url);
  await page.evaluate("localStorage.clear()");
  await page.reload();
  await page.evaluate(`(${hideMotion})()`);
  await sleep(300);
  await save("docs/screenshots/desktop-blank.jpg", "jpeg");

  await viewport(1440, 900, 2, "dark");
  await openSample();
  await save("docs/screenshots/desktop-dark.jpg", "jpeg");

  await viewport(390, 844, 2);
  await openSample();
  await save("docs/screenshots/mobile.jpg", "jpeg");
  await page.click("document.querySelector('.view-btn[data-view=preview]')");
  await sleep(500);
  await save("docs/screenshots/mobile-preview.jpg", "jpeg");

  // Social preview: three templates fanned out beside the name, at the 1200 x 630 link previews use.
  await viewport(1800, 1400, 2);
  await openSample();
  await page.click("document.querySelector('[data-paper-zoom=width]')");
  const sheets = {};
  for (const template of ["alpine", "fjord", "solstice"]) {
    await page.evaluate(`document.querySelector('#template-select-menu [data-value=${template}]').click(); document.querySelector('[data-page-size=a4]').click()`);
    await sleep(400);
    const clip = await page.evaluate(`(() => {
      const rect = document.querySelector('#resume-preview .paper-sheet').getBoundingClientRect();
      return { x: rect.left + scrollX, y: rect.top + scrollY, width: rect.width, height: rect.height, scale: 1 };
    })()`);
    sheets[template] = (await page.send("Page.captureScreenshot", { format: "png", clip })).data;
  }
  const logo = (await readFile(new URL("assets/logo/logo.svg", `file://${root}`))).toString("base64");
  const folder = await mkdtemp(join(tmpdir(), "free-resume-og-"));
  await writeFile(join(folder, "og.html"), socialPreviewHtml(logo, sheets, templates.length));
  await viewport(1200, 630, 1);
  await page.send("Page.navigate", { url: `file://${join(folder, "og.html")}` });
  await sleep(1000);
  await save("og-image.png", "png");
  await rm(folder, { recursive: true, force: true });
} finally {
  await browser.close();
  await server.close();
}

function socialPreviewHtml(logo, sheets, templateCount) {
  const sheet = (name, className) => `<div class="sheet ${className}"><img src="data:image/png;base64,${sheets[name]}" alt=""></div>`;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
    color: #1d1d1f;
    background:
      radial-gradient(circle at 82% 30%, rgba(42, 147, 255, 0.14), transparent 46%),
      linear-gradient(180deg, #fbfbfd 0%, #eef1f6 100%);
  }
  .copy { position: absolute; left: 72px; top: 0; bottom: 0; width: 560px; display: flex; flex-direction: column; justify-content: center; }
  .logo { width: 84px; height: 84px; margin-bottom: 30px; filter: drop-shadow(0 10px 22px rgba(0, 88, 208, 0.28)); }
  h1 { font-size: 78px; font-weight: 700; letter-spacing: -0.035em; line-height: 1; }
  p { margin-top: 18px; font-size: 28px; line-height: 1.25; color: #6e6e73; letter-spacing: -0.01em; }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 34px; }
  .chip { font-size: 21px; font-weight: 600; padding: 9px 17px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.06); }
  .url { margin-top: 36px; font-size: 23px; font-weight: 600; color: #0066cc; }
  .sheet { position: absolute; width: 300px; border-radius: 10px; overflow: hidden; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 24px 60px rgba(15, 35, 70, 0.22); }
  .sheet img { display: block; width: 100%; }
  .left { left: 660px; top: 120px; transform: rotate(-7deg); }
  .right { left: 880px; top: 120px; transform: rotate(7deg); }
  .front { left: 765px; top: 70px; width: 320px; z-index: 2; }
</style>
</head>
<body>
  <div class="copy">
    <img class="logo" src="data:image/svg+xml;base64,${logo}" alt="">
    <h1>Free Resume</h1>
    <p>A free, private resume builder.<br>No sign-up. Your data stays on your device.</p>
    <div class="chips"><span class="chip">${templateCount} templates</span><span class="chip">3 languages</span><span class="chip">PDF export</span></div>
    <div class="url">resume.hadris.com</div>
  </div>
  ${sheet("alpine", "left")}
  ${sheet("solstice", "right")}
  ${sheet("fjord", "front")}
</body>
</html>`;
}
