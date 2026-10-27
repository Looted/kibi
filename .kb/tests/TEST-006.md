---
id: TEST-006
title: Git hooks fire on branch switch and trigger KB sync
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - integration
  - hooks
  - git
links:
  - type: validates
    target: SCEN-003
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-default-branch-sync-hooks
      target: default
    - symbol_id: SYM-test-packed-post-merge-sync
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3db0c72e329a39df946f0155
    test_id: TEST-006
    scope: end_to_end
    outcome: passed
    code_snapshot: 287d8b7e21fc5ebfe33742e839feb2dd6ab1c5b91349284c293a90ceeeb17a0c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T10:14:26.994Z'
    finished_at: '2026-10-27T10:16:52.372Z'
    artifact_digest: 229bc4a6fcc8659413f446a84cc831766dba20ec526f161b2cebc410c6b70faf
    contract_hash: aef4a06e30bbd2f83b2b111ebd93d66428597177001bf1b3f3f161e8474ff45a
    binding_hash: fa1d3fb85030933ff88f6206dfb08f169cc47613c52ad07bda80ebc225e419ec
    fingerprint: f0f212553ad9ac7036181bdfa6ee2b4c13538d6d4084ef0938862e31ed310c4b
    fingerprint_components:
      contract: aef4a06e30bbd2f83b2b111ebd93d66428597177001bf1b3f3f161e8474ff45a
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
      - symbol_id: SYM-test-packed-default-branch-sync-hooks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-packed-post-merge-sync
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
In a temp git repo with hooks installed:
1. Adds a requirement markdown file and commits
2. Switches to a new branch via `git checkout -b test-branch`
3. Asserts `post-checkout` hook ran `kibi sync`
4. Runs `git merge main` and asserts `post-merge` hook ran `kibi sync`
