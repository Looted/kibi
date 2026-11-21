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
    receipt_id: PR-8d66f66f414d72f390402dc1
    test_id: TEST-kibi-consumer-local-plugin-launcher-ontology-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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
