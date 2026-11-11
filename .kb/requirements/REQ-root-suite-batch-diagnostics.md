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
semantic_text: The curated unit suite (test/root.test.ts) must run package-scoped batches as spawned bun subprocesses bounded by BATCH_TIMEOUT_MINUTES (25 minutes). When a batch times out, exits non-zero or produces an unexpected number of bun summaries, getBatchFailureMessage must report the batch label, timeout status, exit code and summary count.
logic_claims:
  - CLAIM-F06D80E8EEC340F7
  - CLAIM-2289156CE3CCB8DB
semantic_clauses:
  - The curated unit suite (test/root.test.ts) must run package-scoped batches as spawned bun subprocesses bounded by BATCH_TIMEOUT_MINUTES (25 minutes).
  - When a batch times out, exits non-zero or produces an unexpected number of bun summaries, getBatchFailureMessage must report the batch label, timeout status, exit code and summary count.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 26cb063b590e35b2c2922f58807b7ee236215108b5fbac1989026dcaff60db08
semantic_inventory:
  - claim_key: CLAIM-F06D80E8EEC340F7
    claim_text: The curated unit suite (test/root.test.ts) must run package-scoped batches as spawned bun subprocesses bounded by BATCH_TIMEOUT_MINUTES (25 minutes)
    role: normative
    status: modeled
    span:
      start: 0
      end: 148
  - claim_key: CLAIM-2289156CE3CCB8DB
    claim_text: When a batch times out, exits non-zero or produces an unexpected number of bun summaries, getBatchFailureMessage must report the batch label, timeout status, exit code and summary count
    role: condition
    status: modeled
    span:
      start: 150
      end: 335
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
rationale: "A hung or partial test batch otherwise fails with no clue which package broke, so each failure names the batch, the timeout and the exit status."
---
- The curated unit suite (test/root.test.ts) must run package-scoped batches as spawned bun subprocesses bounded by BATCH_TIMEOUT_MINUTES (25 minutes).
- When a batch times out, exits non-zero or produces an unexpected number of bun summaries, getBatchFailureMessage must report the batch label, timeout status, exit code and summary count.

## Rationale
A hung or partial test batch otherwise fails with no clue which package broke, so each failure names the batch, the timeout and the exit status.
