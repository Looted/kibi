---
id: SCEN-root-suite-batch-diagnostics
title: Curated unit suite surfaces actionable batch failure diagnostics
type: scenario
status: active
created_at: 2026-07-27T10:00:00Z
updated_at: 2026-07-27T10:00:00Z
tags: [testing, diagnostics, root-suite]
links:
  - type: verified_by
    target: TEST-root-suite-batch-diagnostics
---

**Given** the curated unit suite is configured with per-batch timeouts
**When** a batch times out, exits non-zero, or produces an unexpected
summary count
**Then** `getBatchFailureMessage` returns a non-null diagnostic string
identifying the batch label, timeout status, exit code, and summary count
so the operator can trace the failure without re-running the suite.
