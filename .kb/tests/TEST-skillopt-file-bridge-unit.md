---
title: SkillOpt file bridge unit contract
status: passing
tags:
  - skillopt
  - unit
  - structural-contract
  - review:context-missing
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-skillopt-file-bridge-unit
      target: default
  success_policy: all_required_first_attempt
id: TEST-skillopt-file-bridge-unit
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
