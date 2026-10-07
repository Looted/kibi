---
title: related-requirement-unmodeled rule tests
status: active
priority: must
tags:
  - checks
  - contradictions
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-related-requirement-unmodeled
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T13:24:04.730Z'
id: TEST-check-related-requirement-unmodeled
type: test
---
Runs the consumer test `packages/cli/tests/consumer/related-requirement-unmodeled.test.ts` through the built CLI: it authors a modeled requirement, a new requirement with an advisor ledger left as missing and a relates_to link, syncs, and asserts the default `kibi check` run reports the blocking violation naming the modeled keys, then that a supersedes link clears it. The Prolog unit tests in `packages/core/tests/kb.plt` (checks_coverage_gaps) cover both link directions, predicate-modeled neighbours, and the ledgerless, classified and superseded cases.