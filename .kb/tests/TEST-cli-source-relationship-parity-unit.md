---
title: CLI source relationship parity unit contract
status: active
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
    receipt_id: PR-06e26eb26b2d4b21bb8d2ac5
    test_id: TEST-cli-source-relationship-parity-unit
    scope: unit
    outcome: passed
    code_snapshot: cffe41b11590abbf5935d229d1c33d882718eab1b065285a913e2254bd9e5828
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:36:10.703Z'
    finished_at: '2026-10-25T12:36:11.107Z'
    artifact_digest: ff9de9b55c0177cf405a53783f6e4cca2767f137df9533acd48de0b17c064638
    contract_hash: c69cdfb08b304d35127be49d6048cff6b3d05ed83fb38bb6b6705404808f2c7b
    binding_hash: 42df01e9db475745f6418b391ec10f04f6b05ab4872a2f4a98ce98bf739e3b34
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