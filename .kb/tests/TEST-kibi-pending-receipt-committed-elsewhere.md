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
    receipt_id: PR-1cf3fc55aee831d0d9bb96cf
    test_id: TEST-kibi-pending-receipt-committed-elsewhere
    scope: end_to_end
    outcome: passed
    code_snapshot: d699a078fe8d2323d221f435a979d519f5acca43cfee14f7307e23c39a35f0fa
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T21:00:50.518Z'
    finished_at: '2026-11-16T21:00:56.671Z'
    artifact_digest: 8330562df2abb17cb22a9401a945021cb409b2af2b557388a7ca820a0d99b61a
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