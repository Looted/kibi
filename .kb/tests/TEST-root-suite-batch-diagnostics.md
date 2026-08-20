---
id: TEST-root-suite-batch-diagnostics
title: Batch timeout and failure diagnostics in root test suite
status: active
created_at: 2026-07-27T10:00:00Z
updated_at: 2026-07-27T10:00:00Z
priority: must
tags:
  - testing
  - diagnostics
  - root-suite
  - unit
links:
  - type: validates
    target: REQ-root-suite-batch-diagnostics
---

Exercises the batch diagnostic helpers in `test/root.test.ts`:
`getBatchFailureMessage` returns `null` for clean batches and a
descriptive string for timeouts, non-zero exits, and summary-count
mismatches. `parseSuiteSummaries` extracts bun pass/fail/file counts
from combined stdout+stderr output across multiple batch runs.
