---
title: SWI-Prolog pipeline validates artifact boundaries with behavioral controls
status: passing
tags:
  - prolog
  - build
  - pipeline
  - validation
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-build-pipeline-validation
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-build-pipeline-validation
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1341bba012639a6bff36007a
    test_id: TEST-prolog-build-pipeline-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
    binding_hash: e25b6679203a2e2ab5547e5aa9695d6d15c3b91b7bfcb395853fcbec87f47b0b
    fingerprint: a2662d6d8f5823a794ae2fd17d2c367a7b2ef5baf917b021b29f21fc0d5d3477
    fingerprint_components:
      contract: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
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
      - symbol_id: SYM-test-prolog-build-pipeline-validation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a2e9840b1eab8baaa753a545
    test_id: TEST-prolog-build-pipeline-validation
    scope: end_to_end
    outcome: failed
    code_snapshot: ee64eb8b88a6a2c92e9a06edd811ebc2d227632ebe4a319e466804e0b7282710
    environment_hash: c3396960f96c78d6f5360cbef2847d583acbdcef5cb250b0d7567253c1ac2f41
    started_at: '2026-11-20T12:24:15.507Z'
    finished_at: '2026-11-20T12:24:54.346Z'
    artifact_digest: 8ffdc5d8b969c04ff0cb6e7853c3cc3fcb61a4328dd0fbdb071dc16ccbb4d9cc
    contract_hash: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
    binding_hash: 654601b92428bdc2ec7e55e47580c894a9b40ee835c297cfd7145b442cc3f7a2
    fingerprint: a2662d6d8f5823a794ae2fd17d2c367a7b2ef5baf917b021b29f21fc0d5d3477
    fingerprint_components:
      contract: fa61f45dd9a8a08d102eb9d896b90734b53eee74de819297fe02c9b70bc6a473
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-test-prolog-build-pipeline-validation
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-test-prolog-build-pipeline-validation
        target: default
        reason: 'run did not pass (outcome: failed, phase: execution); this obligation''s own result outcome is ''failed'''
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 4): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
The native pipeline builds, relocates, strips and signs every file, and the controls check the artifact boundaries, so a defect fails locally before an expensive four-platform run. Source: PR 299 phase 2: "Local pipeline controls: 70 passed".
