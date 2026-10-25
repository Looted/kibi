---
title: Jev mocked classifier and default-tree absence
status: passing
tags:
  - plugins
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-capability-plugin-jev-mocked-v1
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-capability-plugin-jev-mocked-v1
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# TEST-capability-plugin-jev-mocked-v1

Automated coverage: packages/plugin-jev/tests/jev.test.ts and packages/cli/tests/plugins/default-deps-exclude-jev.test.ts
