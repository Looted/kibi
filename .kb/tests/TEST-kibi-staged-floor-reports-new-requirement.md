---
title: 'Staged evidence floor by Kibi level: an added requirement is reported, others block'
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - levels
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-staged-floor-reports-new-requirement
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T09:49:00.095Z'
id: TEST-kibi-staged-floor-reports-new-requirement
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9f5e5d5df1890bdb7fcd198d
    test_id: TEST-kibi-staged-floor-reports-new-requirement
    scope: end_to_end
    outcome: passed
    code_snapshot: b6649d29181ccab088798d2373ba640e85507f701aca154d615cc7f2c4e9cc6f
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T10:21:59.581Z'
    finished_at: '2026-11-25T10:21:59.715Z'
    artifact_digest: 2d7d2286b2dc77f20b46a9fc2896629801c8d17a3eafad9fe5eea8642ea159e8
    contract_hash: 10759496f63f822f6703538b0a11307ae8f1606cb351ab149a98485dcea5c256
    binding_hash: 3d6d80168fde609bfb58575e38e2399b8d3e55fbe6954eb3ef8c619e06019f7f
    fingerprint: 13431a0b5aa0b15ffea03a6795af3f29f27d6b940b4fa395f8b567d0b5a97ead
    fingerprint_components:
      contract: 10759496f63f822f6703538b0a11307ae8f1606cb351ab149a98485dcea5c256
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
      - symbol_id: SYM-test-kibi-staged-floor-reports-new-requirement
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `packages/cli/tests/kibi-levels/staged-floor.test.ts`. It checks that the requirements a commit adds are the current ones with no base version, that a floor finding on an added requirement is reported while every other finding blocks, and that the floor runs at test only.
