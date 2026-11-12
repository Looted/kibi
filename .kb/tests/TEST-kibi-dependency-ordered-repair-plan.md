---
id: TEST-kibi-dependency-ordered-repair-plan
title: Packed dependency-ordered repair plan tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
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
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f31c97f4a9903af3d7d15639
    test_id: TEST-kibi-dependency-ordered-repair-plan
    scope: end_to_end
    outcome: passed
    code_snapshot: 179137a4cc98bad746ede4707d2bddad6bd790d7d9588e4925b753857111ca11
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-10T18:08:45.655Z'
    finished_at: '2026-11-10T18:10:08.613Z'
    artifact_digest: f4ab498153afdfa046662c88be72b8c7d772972997165dffc958c16265ca32db
    contract_hash: 96e6ad53540d1eeb56b046e41503b337fb0ae29fe85536c0e0d0d0da91f38240
    binding_hash: 3b89893ebbaf2a6aed6eb50c93b7e961395da9613667531ff745e3759a413dda
    fingerprint: b63eb23b0af935e81ed7d751ddd81a5883a5f018024a41cf23fb76b1df569d1f
    fingerprint_components:
      contract: 96e6ad53540d1eeb56b046e41503b337fb0ae29fe85536c0e0d0d0da91f38240
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-packed-dependency-ordered-repair-plan
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Exercises `kibi.repair-plan.v1` through a fresh packed CLI installation, including dependency ordering, pagination fail-closed behavior, stable plan identity, requirement-only scope, table rendering, and read-only KB state.
