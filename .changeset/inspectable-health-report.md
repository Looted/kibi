---
"kibi-core": minor
"kibi-cli": minor
---

Kibi's public requirement-health report now makes its proof claims inspectable and trustworthy after the page has been sitting on disk or GitHub Pages. Proven no longer shares a card with blocking proof gaps, evidence ages stay honest in a static file, and the report header identifies the repository, branch, and commit when that metadata is available.

- Classify extra verification-receipt issues as `proofAdvisories` when strict proof already exists; `proofGaps` remain blocking-only.
- Preserve absolute evidence and generation timestamps, compute relative ages in the viewer, and link proof-chain sources from structured coordinates.
- Present strict proof coverage, unmapped production symbols, requirements without implementation, proof-gate filtering, filter counts, a Kibi favicon, and a subtle getting-started CTA without loading network assets.
