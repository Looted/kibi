---
"kibi-cli": patch
---

`kibi proof migrate-legacy` now detects legacy `verification_receipts` blocks in the authored test documents, not only in compiled entities left over from older stores. Because current sync no longer extracts the legacy lane, the compiled-store check alone could never fire on a workspace synced by a current release, leaving the exact stale blocks the command exists to remove untouched. The migration still runs only for tests that already carry a `proof_contract`, keeps pruning compiled legacy lanes where they exist, and reports the same summary output.
