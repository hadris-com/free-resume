# 📄 Free Resume

A modern, template-driven resume web application.

✨ English, Spanish & German UI · 🌗 Light & dark mode · 🎨 Multiple templates · 🛠️ Skills with per-skill levels

## 📸 Screenshots

<!-- Keep these current: update docs/screenshots/ whenever the interface changes, using the Sample resume. -->

![Free Resume on desktop, in light mode](docs/screenshots/desktop.jpg)

| Dark mode | Editing an entry |
| --- | --- |
| ![Free Resume on desktop, in dark mode](docs/screenshots/desktop-dark.jpg) | ![An experience entry open in the editor](docs/screenshots/desktop-entry.jpg) |

| First run | Template gallery |
| --- | --- |
| ![The first-run card on a blank resume](docs/screenshots/desktop-blank.jpg) | ![The template gallery open](docs/screenshots/desktop-gallery.jpg) |

| Mobile, editing | Mobile, preview |
| --- | --- |
| <img src="docs/screenshots/mobile.jpg" alt="The editor on a phone" width="280"> | <img src="docs/screenshots/mobile-preview.jpg" alt="The resume preview on a phone" width="280"> |

---

## 🚀 Run locally

This project uses native ES modules, so opening `index.html` directly with `file://` won't work. Start a local server instead:

```bash
# Option 1: Python 3
python3 -m http.server 5500

# Option 2: Node
npx serve . -l 5500
```

Or use the **Live Server** extension in VS Code — open `index.html` → **Open with Live Server**.

Then visit `http://localhost:5500`.

## 🧪 Tests

The tests drive the app in headless Chrome and need only Node 22 or later and Chrome. Nothing to install:

```bash
node --test tests/*.test.mjs
```

They check the editor, the template gallery and saved drafts, and that the preview always has as many sheets as the exported PDF has pages, including resumes that end right at a page break. If Chrome isn't found, set `CHROME_PATH` to its binary. The **Test** workflow runs them on every pull request, along with checks that `chrome-extension/` is in sync and that the MCP server builds.

## 🌐 Deploy with GitHub Pages

1. Push this repository to GitHub.
2. In repository settings, set **Pages → Source** to **GitHub Actions**.
3. Push to `main` (or trigger **Deploy Free Resume** manually from Actions).
4. GitHub Actions publishes the site using `.github/workflows/deploy-pages.yml`.
5. At deploy time `scripts/stamp-version.sh` stamps every JS/CSS reference (including module imports) with `?v=<commit SHA>`, so versions are never edited by hand and browsers never mix old and new files.

## 📝 Notes

> [!TIP]
> - The editor starts **blank** intentionally.
> - The skills section appears automatically after you add a skill.
> - Use **Export PDF** to print or save your resume as a PDF file.
> - Use **Export JSON** to save your resume data as JSON, and **Import** to restore it later.

## 🧩 Chrome Extension — LinkedIn Import

The `chrome-extension/` directory contains a Manifest V3 Chrome extension that imports a LinkedIn profile and generates a PDF resume in one click.

### 📥 Installation (developer mode)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `chrome-extension/` folder.

### ▶️ Usage

1. Navigate to any LinkedIn profile page (`linkedin.com/in/…`).
2. Click the **Free Resume** extension icon.
3. Choose a template, page size, max skills count, and skills order.
4. Click **Generate PDF** — the extension opens the resume in a new tab ready to print or save.

### 🔍 What gets extracted

| Field | Source |
|---|---|
| 👤 Name, headline, location | Main profile page |
| 📋 Summary / About | Main profile page; falls back to `/details/summary/` |
| 💼 Experience | Main profile page (grouped & single roles) |
| 🎓 Education | Main profile page |
| 🏷️ Skills (up to 30) | `/details/skills/` — fetched in background |
| 🌍 Languages | Main profile page |
| 📧 Email | `/overlay/contact-info/` — mailto or plain-text fallback |
| 📞 Phone | `/overlay/contact-info/` — tel link or plain-text fallback |
| 🔗 Website | `/overlay/contact-info/` — first non-GitHub link |
| 🐙 GitHub | `/overlay/contact-info/` — first `github.com` link |

> [!NOTE]
> Contact info, skills, and about are all fetched in **parallel** background tabs that close automatically after extraction.

### ⚙️ Popup options

| Option | Description |
|---|---|
| **Template** | Any of the 8 Free Resume templates |
| **Page size** | A4 or Letter |
| **Max skills** | Limit the number of skills imported (default 10; 0 = all) |
| **Skills order** | *LinkedIn order* — preserves DOM order; *Top endorsed* — sorts by endorsement count |
