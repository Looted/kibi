---
"kibi-cli": patch
---

Kibi's generated requirement-health badge now matches the height of standard GitHub badges and stays readable at small sizes. It uses the canonical Kibi logo on its own, so the badge no longer relies on a tiny wordmark that is difficult to recognize when rendered inline.

- Render the health badge at 20px with a compact logo-only mark and centered status label.
