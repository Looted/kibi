---
id: TEST-root-suite-batch-diagnostics
title: Batch timeout and failure diagnostics in root test suite
status: active
created_at: 2026-07-27T10:00:00.000Z
updated_at: 2026-07-27T10:00:00.000Z
priority: must
tags:
  - testing
  - diagnostics
  - root-suite
  - unit
links:
  - type: validates
    target: REQ-root-suite-batch-diagnostics
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-root-suite-batch-diagnostics
      target: default
  success_policy: all_required_first_attempt
type: test
---

Exercises the batch diagnostic helpers in `test/root.test.ts`:
`getBatchFailureMessage` returns `null` for clean batches and a
descriptive string for timeouts, non-zero exits, and summary-count
mismatches. `parseSuiteSummaries` extracts bun pass/fail/file counts
from combined stdout+stderr output across multiple batch runs.
