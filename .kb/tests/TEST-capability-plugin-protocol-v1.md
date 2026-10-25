---
title: Capability plugin protocol validation tests
status: passing
tags:
  - plugins
  - protocol
  - review:context-missing
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-capability-plugin-protocol-v1
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-capability-plugin-protocol-v1
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# TEST-capability-plugin-protocol-v1

Automated coverage: packages/plugin-sdk/tests/sdk.test.ts
