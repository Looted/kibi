---
title: Reusable Consumer-Local Plugin Launcher End-to-End Contract
status: active
priority: must
text_ref: documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts
tags:
  - kibi
  - test
  - e2e
  - launcher
  - consumer-local
  - ontology
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3ce4d806a8e277bb7e3cea47
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 6299bf4fe2ac5eed1cd93ce7bd7be2c7df3ccb39d29ec90b6f3a57b480f74a8d
    binding_hash: 896c56f0800ec8410059886907a8811bca214d6299ef2dee16c99363d1ad062d
    fingerprint: 920c82a38d2737326a9835f6b6314f8788890cdc4e6b2d6ec23ed31d03c81426
    fingerprint_components:
      contract: 6299bf4fe2ac5eed1cd93ce7bd7be2c7df3ccb39d29ec90b6f3a57b480f74a8d
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
      - symbol_id: SYM-kibi-consumer-local-plugin-launcher-ontology-e2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---