---
id: TEST-kibi-dependency-ordered-repair-plan
title: Packed dependency-ordered repair plan tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-dependency-ordered-repair-plan.md
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - requirements
  - proof
  - repair
  - migration
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-dependency-ordered-repair-plan
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
      target: default
  success_policy: all_required_first_attempt
type: test
---

Exercises `kibi.repair-plan.v1` through a fresh packed CLI installation, including dependency ordering, pagination fail-closed behavior, stable plan identity, requirement-only scope, table rendering, and read-only KB state.
