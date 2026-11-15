---
title: kibi migrate --apply-safe migrates a legacy branch store from its previewed plan
status: pending
priority: must
tags:
  - branching
  - migration
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-cli-legacy-apply-safe
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-15T17:00:00.000Z'
id: TEST-kibi-cli-legacy-apply-safe
type: test
---
Packed end-to-end test documentation/tests/e2e/packed/legacy-attachment-cli-apply.test.ts: in an installed project it moves the compiled store to its legacy literal path, previews the plan with kibi migrate --format json, checks that no hashed store exists, applies the plan's hash with kibi migrate --apply-safe, and checks that the legacy migration applied, only the hashed store remains and kibi query still returns the requirement.