---
title: Coordinate refresh capability and authored repair regressions
status: passing
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-coordinate-repair-capability
      target: default
  success_policy: all_required_first_attempt
id: TEST-coordinate-repair-capability
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Behavioral regressions in packages/cli/tests/public/operations/symbol-repair-plan.test.ts verify repeated Python extraction misses, typed repair guidance, explicit coarse-anchor recovery, supported JS/TS and Python extraction, and mixed or unknown-symbol batches. The packed dependency-ordered repair-plan suite additionally exercises validate-upsert, upsert, repeated CLI refresh, coverage, migration actions, and coordinate recovery.