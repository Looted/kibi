---
title: Capability plugin host resolution tests
status: passing
tags:
  - plugins
  - review:context-missing
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-capability-plugin-host-resolution-v1
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-capability-plugin-host-resolution-v1
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# TEST-capability-plugin-host-resolution-v1

Automated coverage: packages/cli/tests/plugins/capability-plugin-host.test.ts
