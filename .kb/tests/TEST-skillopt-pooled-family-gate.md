---
title: Family regressions are judged on pooled pass rates against a measured noise floor
status: passing
priority: should
tags:
  - skillopt
  - scoring
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-skillopt-family-gate-suite
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-skillopt-family-gate-suite
    target: default
    native_id: scripts/skillopt-eval/tests/family-gate.test.ts::pooled family gate::stored evaluations give a floor that a candidate is then judged against
    source_file: scripts/skillopt-eval/tests/family-gate.test.ts
    line: 94
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: TEST-skillopt-pooled-family-gate
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5465b15d9e9eb1251dddc282
    test_id: TEST-skillopt-pooled-family-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b98f775e0148449028662ea19d93ed52c2cb6f387740f5edf43e66905435b4
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-13T19:58:37.792Z'
    finished_at: '2026-11-13T19:58:37.857Z'
    artifact_digest: feb7d9f97ffa8953ae175031b0f002fc63835c03a7a4cd1ca28344251e27875e
    contract_hash: 29db14063a2465662343ddf10a330e171f0641a5baafbdcb15680c6b28348a1d
    binding_hash: 7df8ebae1b0d1f56533160d8f31a5a4bff4b99bc6da1494169e2012ac3215a9f
    fingerprint: e5df62a6daef0cd3ad91b77233f90b8c91d081f2518967239ee3d99b716514d8
    fingerprint_components:
      contract: 29db14063a2465662343ddf10a330e171f0641a5baafbdcb15680c6b28348a1d
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 0bc2f67c1e8afdf51063401fbb5316df307dcf75ec3b348c52f97fc1f68963ab
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-skillopt-family-gate-suite
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Writes stored campaign evaluations, measures the noise floor from their baseline cells with `noiseFloorFromEvaluations`, and judges a candidate with `judgeFamily` in `scripts/skillopt-eval/tests/family-gate.test.ts`: a drop within the floor holds, a larger one regresses, and a family with fewer than 16 cells per arm is underpowered. `scripts/skillopt-eval/tests/campaign-workflow.test.ts` checks that the floor is bound into the evaluation and that one repeat judges no family.