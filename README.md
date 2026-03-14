# Free Resume

A modern, template-driven resume web application with:

- English, Spanish, and German UI
- Light and dark mode
- Blank-by-default editor
- Skills section with per-skill level
- Multiple resume templates (including a two-column layout inspired by the existing PDF resume in this repository)

## Run locally

This project uses native ES modules (`<script type="module">`), so opening `index.html` directly with `file://` will fail in modern browsers due to CORS/module restrictions.

Start a local HTTP server from the project root and open the shown URL instead:

```bash
# Option 1: Python 3
python3 -m http.server 5500
```

```bash
# Option 2: Node (without installing globally)
npx serve . -l 5500
```

Option 3: VS Code Live Server extension
- Install the **Live Server** extension in VS Code.
- Open `index.html` and choose **Open with Live Server**.

Then open `http://localhost:5500` or use the URL printed by the server.


## Deploy with GitHub Actions (GitHub Pages)

1. Push this repository to GitHub.
2. In your repository settings, set **Pages** source to **GitHub Actions**.
3. Push to `main` (or trigger **Deploy Free Resume** manually from Actions).
4. GitHub Actions publishes the site using `.github/workflows/deploy-pages.yml`.

## Notes

- The editor starts blank intentionally.
- The skills section appears automatically after you add a skill.
- Use **Print** for paper output and **Save PDF** when exporting a PDF file.
- Use **Download raw CV** to save your editable resume data as JSON.
- Use **Upload raw CV** later to restore and continue editing that same resume.

---

## Chrome Extension — LinkedIn Import

The `chrome-extension/` directory contains a Manifest V3 Chrome extension that imports a LinkedIn profile and generates a PDF resume in one click.

### Installation (developer mode)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `chrome-extension/` folder.

### Usage

1. Navigate to any LinkedIn profile page (`linkedin.com/in/…`).
2. Click the **Free Resume** extension icon.
3. Choose a template, page size, max skills count, and skills order.
4. Click **Generate PDF** — the extension opens the resume in a new tab ready to print or save.

### What gets extracted

| Field | Source |
|---|---|
| Name, headline, location | Main profile page |
| Summary / About | Main profile page; falls back to `/details/summary/` |
| Experience (all roles, grouped & single) | Main profile page |
| Education | Main profile page |
| Skills (up to 30) | `/details/skills/` — fetched in background |
| Languages | Main profile page |
| Email | `/overlay/contact-info/` — mailto link or plain-text fallback (e.g. IM section) |
| Phone | `/overlay/contact-info/` — tel link or plain-text fallback |
| Website | `/overlay/contact-info/` — first non-GitHub link in Websites section |
| GitHub | `/overlay/contact-info/` — first `github.com` link in Websites section |

Contact info, skills, and about are all fetched in **parallel** background tabs that close automatically after extraction.

### Popup options

| Option | Description |
|---|---|
| **Template** | Any of the 10 Free Resume templates |
| **Page size** | A4 or Letter |
| **Max skills** | Limit the number of skills imported (default 10; set to 0 for all) |
| **Skills order** | *LinkedIn order* — preserves the order from the skills page; *Top endorsed* — sorts by endorsement count descending |
