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
    receipt_id: PR-c3b7dfa8649ef352be4c12ea
    test_id: TEST-kibi-pending-receipt-branch-scope
    scope: end_to_end
    outcome: passed
    code_snapshot: 2e3b552acb7a01ab94f5d776630a56432dc197ebe34a80ffc0a1ec4741bbf262
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-15T17:31:15.517Z'
    finished_at: '2026-11-15T17:31:23.900Z'
    artifact_digest: 2bd448ab667b18c356b0a7c84b78e79b10227ef2abcd22d08f66c30210bf7e20
    contract_hash: 6ab43b2ef52a41b890c76ff607f02154bc1dc1976406373e4739f7d93e02c132
    binding_hash: ff87110fb524dc948317b820c18ded764ac4a9b43c2903e10441311734b317b7
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