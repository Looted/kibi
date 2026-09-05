---
"kibi-cli": patch
---

Source discovery no longer crashes when a host or leaked test mock returns a non-array file list from the markdown glob. Sync treats that as “no documents found” and continues pending-receipt and manifest checks instead of throwing.
