---
id: REQ-root-suite-batch-diagnostics
title: Root suite batch diagnostics for curated unit test batches
status: open
created_at: 2026-07-27T10:00:00Z
updated_at: 2026-07-27T10:00:00Z
priority: must
tags:
  - testing
  - diagnostics
  - root-suite
links:
  - type: specified_by
    target: SCEN-root-suite-batch-diagnostics
  - type: verified_by
    target: TEST-root-suite-batch-diagnostics
---

The curated unit test suite (`test/root.test.ts`) runs package-scoped
batches as spawned `bun` subprocesses and must surface actionable
diagnostics when a batch times out, exits non-zero, or produces an
unexpected number of bun summaries.

Each batch is bounded by `BATCH_TIMEOUT_MINUTES` (25 min). When a batch
fails, `getBatchFailureMessage` produces a human-readable message that
identifies the batch label, timeout status, exit code, and summary count
so the operator can trace the failure without re-running the suite.
