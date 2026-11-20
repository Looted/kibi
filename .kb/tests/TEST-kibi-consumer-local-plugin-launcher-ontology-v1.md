---
title: Reusable Consumer-Local Plugin Launcher End-to-End Contract
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9cd9869a91b6693b416e7230
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 6299bf4fe2ac5eed1cd93ce7bd7be2c7df3ccb39d29ec90b6f3a57b480f74a8d
    binding_hash: a33bf39f451d69f8ee2b4428d79ee6ba245cf9dbfbbe7a5f14f72b1ed3d6a62c
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This is the Cursor launcher coverage that the same commit added for the new schemas.
