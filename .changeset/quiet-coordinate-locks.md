---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

Generated symbol coordinates now stay aligned with live source files during sync and source-first mutations, even when operations overlap or fail partway through. Coordinate artifacts are published and restored atomically, so callers do not inherit stale or half-written compiler state.

- Add workspace-scoped symbol compiler locking and compare-before-restore artifact rollback.
- Include coordinate artifacts and referenced source files in sync freshness fingerprints.
- Support explicit `test-suite` granularity for intentionally coarse test anchors.
