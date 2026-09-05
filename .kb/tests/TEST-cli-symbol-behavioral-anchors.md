---
id: TEST-cli-symbol-behavioral-anchors
title: CLI staged checks enforce behavioral symbol granularity
status: passing
created_at: 2026-06-06T00:00:00.000Z
updated_at: 2026-06-06T00:00:00.000Z
source: packages/cli/tests/commands/check-staged-enforcement.test.ts
tags:
  - cli
  - symbols
  - traceability
  - unit
links:
  - type: validates
    target: SCEN-symbol-behavioral-anchors
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-symbol-behavioral-anchors
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verifies that staged symbol granularity diagnostics reject coarse links only when narrower behavioral symbols are available and ignore interface/type-only symbols as blockers.
