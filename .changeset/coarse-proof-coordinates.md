---
"kibi-cli": patch
---

Proof no longer treats coarse test-suite and extractor-miss symbols as missing coordinates after their E2E receipts land. Refresh now stores a title match or whole-file span for those anchors, so a passing contracted test can prove a requirement instead of opening a new coordinate gap.

- Persist title-match or whole-file coordinates for coarse granularity symbols during `kibi sync --refresh-symbol-coordinates`.
- Keep extractable symbols without AST coordinates as refresh failures rather than inventing locations.
