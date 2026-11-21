---
title: CLI source relationship parity unit contract
status: passing
tags:
  - cli
  - relationships
  - parity
  - unit
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-source-relationship-parity-unit
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
id: TEST-cli-source-relationship-parity-unit
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5684b391538672971b3d5a88
    test_id: TEST-cli-source-relationship-parity-unit
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: c69cdfb08b304d35127be49d6048cff6b3d05ed83fb38bb6b6705404808f2c7b
    binding_hash: 2721466821f11da359c72fcdd01d17717cbd7cab781c3adf92a238b7039b9ec1
    fingerprint: 04086ed65e033b0ab966768bd3ff3c1afa98100c2ac8be45d8fcbac223a24f36
    fingerprint_components:
      contract: c69cdfb08b304d35127be49d6048cff6b3d05ed83fb38bb6b6705404808f2c7b
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
      - symbol_id: SYM-unit-test-cli-source-relationship-parity-unit
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Directly exercises compiled relationship row parsing, the structural parity record contract, authored-to-compiled loss detection, and runtime-only reverse-ownership handling.