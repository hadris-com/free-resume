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
