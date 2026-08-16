---
"kibi-runtime": patch
---

Clean installations can now build Kibi's shared skill runtime without relying on a dependency supplied by another workspace package. This keeps CI, packed consumers, and direct runtime users consistent with local development.

- Declare `gray-matter` as a direct runtime dependency because the skill manifest parser imports it.
