---
title: Impact policy opt-in and parsing unit contract
status: pending
source: packages/cli/tests/traceability/impact-policy.test.ts
tags:
  - cli
  - impact-policy
  - stage-e
  - unit
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-impact-policy-opt-in
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-impact-policy-opt-in-unit
type: test
origin:
  kind: agent
  recorded_at: '2026-11-10T14:00:00.000Z'
---
Runs the impact policy reader: no base policy means impact review is not enabled, a valid base policy enables it, and an invalid policy blob is refused.
