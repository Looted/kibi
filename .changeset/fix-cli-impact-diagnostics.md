---
"kibi-cli": patch
---

Kibi checks no longer flag a manifest symbol as coarse merely because a different sibling function changed. Staged manifest-only changes also continue to supply Kibi impact evidence. This keeps impact diagnostics focused on the code and metadata that actually changed.

- Preserve full-source manifest anchors during hunk-based granularity analysis and retain changed manifest entity IDs for staged checks.
