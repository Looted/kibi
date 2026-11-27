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
    receipt_id: PR-5ff0b993e96c7cfd55aaeb4b
    test_id: TEST-kibi-pending-receipt-committed-elsewhere
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b0472b88ca49cfd30d508044f7c14fc9e34e0bede46962d811e9ae96d1e98a4
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T11:34:17.436Z'
    finished_at: '2026-11-25T11:34:21.110Z'
    artifact_digest: 96d4b0b55ee5b02ac8ef5d05a9cbbaad5892ab422d6a58aeff0d4a5762fa6c9a
    contract_hash: 018b580d5f4ca67d387dd74321209d8b26f436f698c7dbf0793f5e978a8e1d4a
    binding_hash: 8bb37413db0c50cd43ef9f77c63bc677396b541942cc9e204b8d375c641fe44e
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