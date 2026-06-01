# QuizOnline — User Manual

Multilingual end-user documentation. Pick your language:

- **[Français](fr/index.md)** — Manuel d'utilisation complet (apprenant, instructeur, admin de domaine)
- **[English](en/index.md)** — Full user manual (learner, instructor, domain admin)
- **[Nederlands](nl/index.md)** — Volledige handleiding (cursist, instructeur, domeinbeheerder)

Screenshots live under `screenshots/<locale>/`. Each language is a self-contained mirror of the same content captured with the UI in that language.

## PDF export

One combined PDF per language (cover + table of contents + the four role chapters with screenshots) is built from these Markdown sources:

```powershell
cd quizonline-frontend
npm run manual:pdf
```

This runs `scripts/build-manual-pdf.mjs` (Markdown → HTML → Chromium print, reusing the Playwright Chromium already installed for E2E — no extra system dependency). Output: `docs/manual/QuizOnline-Manuel-<locale>.pdf`. The generated PDFs are git-ignored; regenerate them on demand.
