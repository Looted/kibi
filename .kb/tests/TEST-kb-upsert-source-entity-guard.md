---
title: Writes into another entity's document are refused
status: passing
priority: must
verification_scope: end_to_end
tags:
  - kb_upsert
  - source-authoring
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-upsert-source-entity-guard
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T18:13:16.740Z'
id: TEST-kb-upsert-source-entity-guard
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-96493349574a8ae5aff6f55c
    test_id: TEST-kb-upsert-source-entity-guard
    scope: end_to_end
    outcome: passed
    code_snapshot: 04e8cd5f88571daca2dfb665c6f2e664510c158b3b32560807258ea7c52c1538
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T19:04:24.997Z'
    finished_at: '2026-11-17T19:04:25.388Z'
    artifact_digest: ce3b71548745707c602b97f27d34c85102dab76e823f059921078759b8cd2eb3
    contract_hash: 334c289ce948633d72e92abadadb502e4783702c3636f285fcfe48b964401172
    binding_hash: 9beefa8c13a860e704321115aaffe2323aaedebbfb9354d94229df2e7840465a
    fingerprint: 39d6ec7ed1a22a7711ac40bac2fd2cf8523f1c4b70793515a9a7a8ca0fc915a1
    fingerprint_components:
      contract: 334c289ce948633d72e92abadadb502e4783702c3636f285fcfe48b964401172
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
      - symbol_id: SYM-test-kb-upsert-source-entity-guard
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Renders source writes into documents that hold another entity by front-matter id, documents without an id that the store does not read the entity from, and documents that hold the written entity (packages/cli/tests/operations-mutation/mutation/source-authoring.test.ts).
