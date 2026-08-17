---
"kibi-cli": patch
---

Explicit branch recovery now retires only the pending-source receipts it
actually observed, while ordinary discovery remains fail-closed when an
authored source is missing.  If another operation replaces a receipt during
recovery, Kibi preserves that newer intent and reports the recovery as
incomplete instead of silently deleting it.

- Carry receipt path, source path, source hash, and raw receipt digest through
  recovery publication for authored files and relationship shards.
- Compare receipt identity before cleanup and fail when it changed.
- Cover read-only failure, preview non-mutation, successful recovery cleanup,
  and replacement-receipt retention in isolated fixtures.
