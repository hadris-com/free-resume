// Renders the template gallery's thumbnails and the README screenshots from the Sample resume.
//
// Usage: node scripts/render-images.mjs
//
// Run it whenever the sample, a template or the interface changes. It drives Chrome, like the
// tests, so it needs only Node 22+ and Chrome. Run it on macOS: the interface uses the system font,
// and the committed screenshots were taken there.
import { writeFile } from "node:fs/promises";
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
} finally {
  await browser.close();
  await server.close();
}
