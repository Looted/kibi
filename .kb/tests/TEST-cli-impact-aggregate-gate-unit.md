---
title: Aggregate pull request gate unit contract
status: pending
source: packages/cli/tests/traceability/impact-pr-diff.test.ts
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
    - symbol_id: SYM-unit-test-cli-impact-aggregate-gate
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-impact-aggregate-gate-unit
type: test
origin:
  kind: agent
  recorded_at: '2026-11-10T14:00:00.000Z'
---
Runs the trusted pull request event resolver and the protected-target diff checks: a unique trusted repository, target ref, base and head; refusal of an advanced protected path; and refusal of a change that edits the impact policy.
