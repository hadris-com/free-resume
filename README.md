# Free Resume

A modern, template-driven resume web application with:

- English, Spanish, and German UI
- Light and dark mode
- Blank-by-default editor
- Skills section with per-skill level
- Multiple resume templates (including a two-column layout inspired by the existing PDF resume in this repository)

## Run locally


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
