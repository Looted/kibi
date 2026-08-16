---
"kibi-cli": minor
---

Kibi requirement-health reports now include a live SVG badge that can sit in a README and open the full dashboard when clicked. Publishing the report directory to GitHub Pages keeps both the badge and report on stable, shareable URLs.

- Emit `badge.svg` beside directory reports and `<name>.badge.svg` beside explicit HTML outputs.
- Color badge health conservatively for contradictions and stale snapshots.
- Publish this repository's report through GitHub Pages and link its README badge to the dashboard.
