---
title: kb_upsert capture with why tests
status: active
priority: must
verification_scope: end_to_end
verification_perspective: internal
tags:
  - kb_upsert
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-upsert-capture-with-why
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T16:17:30.686Z'
id: TEST-kb-upsert-capture-with-why
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b5d022bd973b51daec4c1b37
    test_id: TEST-kb-upsert-capture-with-why
    scope: end_to_end
    outcome: passed
    code_snapshot: ab876dfefb9fd3c87c95a9a0efb6a8dcfc0155e4fb8b1f918fcab8368e7eeaa6
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T08:37:32.904Z'
    finished_at: '2026-11-17T08:37:41.034Z'
    artifact_digest: 3fdeb249d9e316ae8f336909148fcb26327e3d31e15d81b6f726e1d04d1865fc
    contract_hash: e3a1e8977ba75f24bc5a4c7967629ffde2830d30c2601a80c4e8d9968f6b810e
    binding_hash: 20d381272adeb3b6b5973d388471dd65233831c3180430fab0707c1cb728fe8f
    fingerprint: 3a131a21177955cd5f0aaec572bc916dcdabd6bb755b72c28c0bc15040ef3ed6
    fingerprint_components:
      contract: e3a1e8977ba75f24bc5a4c7967629ffde2830d30c2601a80c4e8d9968f6b810e
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
      - symbol_id: SYM-test-kb-upsert-capture-with-why
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The capture unit tests and a consumer workspace run of the CLI: a requirement written with a statement body, why and origin.ref records its rationale, Context, Source and semantic_text; its result lists the steps kb_check still needs as nextActions, each accepted by kb_upsert once its placeholders are filled, and the current requirements on the same terms, at most five.