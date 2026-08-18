---
"kibi-cli": patch
---

GitHub Pages now publishes the requirement-health report and badge under `/kibi-report/` instead of the site root. That keeps Kibi from occupying `/index.html` by default on project and owner Pages sites.

- Namespace the packaged report and badge-only workflows, `kibi init --github` URLs, and this repository's proof Pages deploy under `/kibi-report/`.
- Document that `deploy-pages` still replaces the Pages deployment; merge `kibi-report/` into an existing site when Pages is already in use.
