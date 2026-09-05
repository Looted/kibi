---
id: TEST-kibi-proof-aware-quality-diagnostics
title: Proof-aware coverage-depth and receipt-gap diagnostic tests
status: passing
created_at: 2026-08-14T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
source: packages/cli/tests/public/impact/coverage-depth-quality.test.ts
tags:
  - requirements
  - diagnostics
  - coverage
  - proof
  - receipts
  - cli
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: SCEN-kibi-proof-aware-quality-diagnostics
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-proof-aware-quality-diagnostics
      target: default
  success_policy: all_required_first_attempt
type: test
---

Validates suppression of stale weak-depth heuristics when current scenario-backed E2E proof passes, preservation of independent proof gaps, and bounded receipt-gap evidence with v2 remediation guidance.
