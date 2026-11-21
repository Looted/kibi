---
title: Sync retires a receipt whose file another branch committed, and still fails for a lost file
status: pending
priority: must
tags:
  - branching
  - sync
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-pending-receipt-committed-elsewhere
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-15T17:30:00.000Z'
id: TEST-kibi-pending-receipt-committed-elsewhere
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0729846c6ff09fd7e56f4c7b
    test_id: TEST-kibi-pending-receipt-committed-elsewhere
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 018b580d5f4ca67d387dd74321209d8b26f436f698c7dbf0793f5e978a8e1d4a
    binding_hash: a5f57ed1b4d8e25aa46d98b8f1ace2b6427b529e628f6f28900f3173f9937e18
    fingerprint: 8592c8dd17b27f43a831337f1ddb3a82d3b72e4ecbcb261613ffeeff2ae958e3
    fingerprint_components:
      contract: 018b580d5f4ca67d387dd74321209d8b26f436f698c7dbf0793f5e978a8e1d4a
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
      - symbol_id: SYM-e2e-test-kibi-pending-receipt-committed-elsewhere
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packed end-to-end test documentation/tests/e2e/packed/pending-receipt-committed-elsewhere.test.ts: in an installed project without hooks it upserts a scenario on develop, commits the file on a new branch without a sync, checks out develop and checks that kibi sync succeeds and retires the receipt; then it commits another scenario on a branch it deletes and checks that sync fails with a missing pending source.