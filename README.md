# 📄 Free Resume

A modern, template-driven resume web application.

✨ English, Spanish & German UI · 🌗 Light & dark mode · 🎨 Multiple templates · 🛠️ Skills with per-skill levels

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

## 🌐 Deploy with GitHub Pages

1. Push this repository to GitHub.
2. In repository settings, set **Pages → Source** to **GitHub Actions**.
3. Push to `main` (or trigger **Deploy Free Resume** manually from Actions).
4. GitHub Actions publishes the site using `.github/workflows/deploy-pages.yml`.

## 📝 Notes

> [!TIP]
> - The editor starts **blank** intentionally.
> - The skills section appears automatically after you add a skill.
> - Use **Print** for paper output and **Save PDF** for exporting a PDF file.
> - Use **Download raw CV** to save your resume data as JSON, and **Upload raw CV** to restore it later.

---

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
| **Template** | Any of the 10 Free Resume templates |
| **Page size** | A4 or Letter |
| **Max skills** | Limit the number of skills imported (default 10; 0 = all) |
| **Skills order** | *LinkedIn order* — preserves DOM order; *Top endorsed* — sorts by endorsement count |
