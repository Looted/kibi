---
"kibi-cli": patch
---

CLI sync extraction tests no longer leak mocked extractors into later impact-analysis tests. This makes the unit coverage workflow deterministic in CI and prevents unrelated impact manifest checks from failing after sync extraction error-path tests run first.

- Add an explicit extraction dependency seam for `processExtractions` while preserving the existing default CLI behavior.
- Route sync extraction tests through injected dependencies instead of Bun module-level mocks.
- Verify the polluted test ordering that previously failed in CI now passes.
