---
title: CLI relationship type vocabulary contract
status: passing
tags:
  - cli
  - relationships
  - types
  - unit
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-relationship-type-contract
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-cli-relationship-type-contract
type: test
links:
  - type: validates
    target: SCEN-mcp-relationship-preflight
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3b6ec47b4519ad261405c633
    test_id: TEST-cli-relationship-type-contract
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 7c248887e3535f391dfdb988d41a0be649a5f5b6c5b2f6e982ae8eea5be3a44f
    binding_hash: bfa89caea9587a45a1a693a774b603c2c1635b005b7a65470dad6224009e0e09
    fingerprint: fac9d313156cefaa7730fa6c33f3713c726adb88f089685e3e990c1650fca490
    fingerprint_components:
      contract: 7c248887e3535f391dfdb988d41a0be649a5f5b6c5b2f6e982ae8eea5be3a44f
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
      - symbol_id: SYM-unit-test-cli-relationship-type-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Imports the exported relationship configuration and type contract, then asserts the complete supported relationship vocabulary.