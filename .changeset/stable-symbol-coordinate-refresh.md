---
"kibi-cli": patch
---

Refreshing symbol coordinates now leaves the authored symbol manifest stable and keeps generated locations exclusively in `symbol-coordinates.yaml`. Repeated refreshes no longer alternate thousands of generated fields in and out of `symbols.yaml`, making traceability updates reviewable and idempotent.

- Strip generated coordinate fields from every authored symbol entry after extraction.
- Clarify the manifest header and cover coordinate-free and legacy entries in the refresh tests.
