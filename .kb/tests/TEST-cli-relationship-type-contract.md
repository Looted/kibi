---
title: CLI relationship type vocabulary contract
status: active
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
    receipt_id: PR-edf6deccbb0e6428307faf09
    test_id: TEST-cli-relationship-type-contract
    scope: unit
    outcome: passed
    code_snapshot: cffe41b11590abbf5935d229d1c33d882718eab1b065285a913e2254bd9e5828
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:36:05.673Z'
    finished_at: '2026-10-25T12:36:05.731Z'
    artifact_digest: d89a71a9c0dd4872a05afd1e8279b31e7842d0cf4c7af5db02de15d80753b5cb
    contract_hash: 7c248887e3535f391dfdb988d41a0be649a5f5b6c5b2f6e982ae8eea5be3a44f
    binding_hash: 34951aa8ce61a4154c8b07152e4cb998781c98b7ec500da3e10e621c0b4a87ee
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