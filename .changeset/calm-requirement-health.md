---
"kibi-cli": minor
---

Kibi can now turn its conservative proof model into a polished requirement-health site that people can open, screenshot, share, or publish from CI. Run `kibi report --open` for the local dashboard, or publish the self-contained output directory directly to GitHub Pages without a separate frontend build.

- Add the human-facing `kibi report` command with configurable output, tag filtering, complete-scope enforcement, and default-browser launch support.
- Render proof percentage, health metrics, snapshot warnings, searchable requirement-stage cards, receipt freshness, contradiction witnesses, and unowned-code counts in one offline HTML file.
- Publish the `develop` branch report as a GitHub Actions artifact, and document local use plus a GitHub Pages deployment workflow.
