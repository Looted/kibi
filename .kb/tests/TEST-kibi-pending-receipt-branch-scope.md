---
title: Sync on a branch without a file leaves another branch's pending receipt alone
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
    - symbol_id: SYM-e2e-test-kibi-pending-receipt-branch-scope
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: TEST-kibi-pending-receipt-branch-scope
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b2c8ca5b59b22f42046178f2
    test_id: TEST-kibi-pending-receipt-branch-scope
    scope: end_to_end
    outcome: passed
    code_snapshot: edbe363753ebdf452deb8b8c0bce907dfa4b35ebe6bf786808e4842e1c1dbb8b
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T13:50:13.185Z'
    finished_at: '2026-11-16T13:50:20.305Z'
    artifact_digest: 1aa598be30997931c4549f57899df3a7fb3c39cbaa9c4508db000182395d9a81
    contract_hash: 6ab43b2ef52a41b890c76ff607f02154bc1dc1976406373e4739f7d93e02c132
    binding_hash: 38a6df9235386d66e5cfdca71bf13ace683503eb749448b6347b890180b0787b
    fingerprint: 989bb9510c50fa6519adcbb3aefdc22e5bd86730744cdc2a43d9755415dc2ebb
    fingerprint_components:
      contract: 6ab43b2ef52a41b890c76ff607f02154bc1dc1976406373e4739f7d93e02c132
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
      - symbol_id: SYM-e2e-test-kibi-pending-receipt-branch-scope
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packed end-to-end test documentation/tests/e2e/packed/pending-receipt-branch-scope.test.ts: in an installed project it upserts a scenario on a feature branch, checks that the receipt records that branch, commits the file and checks out the base branch, then checks that kibi sync succeeds there and that back on the feature branch sync consumes the receipt. It also upserts a scenario on the base branch, commits it on a new branch, and checks that sync there retires the base branch's receipt so the base branch still syncs without the file.