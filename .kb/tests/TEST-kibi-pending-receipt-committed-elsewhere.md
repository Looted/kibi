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
    receipt_id: PR-5e2fef89cea22501443f5c84
    test_id: TEST-kibi-pending-receipt-committed-elsewhere
    scope: end_to_end
    outcome: passed
    code_snapshot: 2e3b552acb7a01ab94f5d776630a56432dc197ebe34a80ffc0a1ec4741bbf262
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-15T17:27:55.454Z'
    finished_at: '2026-11-15T17:29:07.118Z'
    artifact_digest: 2442b04cd7d21911650f11964c54d72faba1920b59377a4bb76da0a298d31c38
    contract_hash: 018b580d5f4ca67d387dd74321209d8b26f436f698c7dbf0793f5e978a8e1d4a
    binding_hash: 1cdec8608835ecee3fb5ec5adb7a60156669d74c271bb313289467beafa48a5b
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