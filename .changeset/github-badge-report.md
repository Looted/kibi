---
"kibi-cli": minor
---

Projects can now publish a Kibi requirement-health badge together with the full HTML report on GitHub Pages. Copy the documented workflow into `.github/workflows`, or run `kibi init --github` to scaffold those same files. Clicking the README badge opens the matching report.

- Add canonical GitHub Actions workflows for badge+report and an explicit badge-only opt-out.
- Scaffold the documented integration with `kibi init --github` without overwriting customized workflows or duplicating badges.
- Document the manual copy/paste flow in the README and `docs/github-integration.md`.
