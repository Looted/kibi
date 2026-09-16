---
id: REQ-root-suite-batch-diagnostics
title: Root suite batch diagnostics for curated unit test batches
status: open
created_at: 2026-07-27T10:00:00.000Z
updated_at: 2026-07-27T10:00:00.000Z
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
semantic_text: The curated unit test suite (`test/root.test.ts`) runs package-scoped\nbatches as spawned `bun` subprocesses and must surface actionable\ndiagnostics when a batch times out, exits non-zero, or produces an\nunexpected number of bun summaries.\n\nEach batch is bounded by `BATCH_TIMEOUT_MINUTES` (25 min). When a batch\nfails, `getBatchFailureMessage` produces a human-readable message that\nidentifies the batch label, timeout status, exit code, and summary count\nso the operator can trace the failure without re-running the suite.
logic_claims:
  - CLAIM-76A149F31027A6F8
  - CLAIM-1C806E08FBD2E6DA
semantic_clauses:
  - The curated unit test suite (`test/root.test.ts`) runs package-scoped\nbatches as spawned `bun` subprocesses and must surface actionable\ndiagnostics when a batch times out, exits non-zero, or produces an\nunexpected number of bun summaries.\n\nEach batch is bounded by `BATCH_TIMEOUT_MINUTES` (25 min)
  - When a batch\nfails, `getBatchFailureMessage` produces a human-readable message that\nidentifies the batch label, timeout status, exit code, and summary count\nso the operator can trace the failure without re-running the suite
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2f6b50af227ecacecf1c6a7e27fb883d0304360dca76165bc4b642b480c669fa
semantic_inventory:
  - claim_key: CLAIM-76A149F31027A6F8
    claim_text: The curated unit test suite (`test/root.test.ts`) runs package-scoped\nbatches as spawned `bun` subprocesses and must surface actionable\ndiagnostics when a batch times out, exits non-zero, or produces an\nunexpected number of bun summaries.\n\nEach batch is bounded by `BATCH_TIMEOUT_MINUTES` (25 min)
    role: normative
    status: modeled
    span:
      start: 0
      end: 302
  - claim_key: CLAIM-1C806E08FBD2E6DA
    claim_text: When a batch\nfails, `getBatchFailureMessage` produces a human-readable message that\nidentifies the batch label, timeout status, exit code, and summary count\nso the operator can trace the failure without re-running the suite
    role: condition
    status: modeled
    span:
      start: 304
      end: 530
type: req
---

The curated unit test suite (`test/root.test.ts`) runs package-scoped
batches as spawned `bun` subprocesses and must surface actionable
diagnostics when a batch times out, exits non-zero, or produces an
unexpected number of bun summaries.

Each batch is bounded by `BATCH_TIMEOUT_MINUTES` (25 min). When a batch
fails, `getBatchFailureMessage` produces a human-readable message that
identifies the batch label, timeout status, exit code, and summary count
so the operator can trace the failure without re-running the suite.
