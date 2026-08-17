---
"kibi-cli": patch
"kibi-runtime": patch
---

Verification status now remains reusable when the only local changes are operational Kibi artifacts that are excluded from the code snapshot. Those changes still appear in status diagnostics, while source changes continue to mark verification evidence dirty.

- Derive workspace snapshot dirtiness from snapshot-relevant changes rather than every Git porcelain row.
- Preserve complete change records and counts for operational diagnostics.
