---
id: TEST-kibi-verification-evidence-contract
title: End-to-end proof receipt contract
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - verification
  - e2e
  - playwright
  - receipts
  - proof
  - test
links:
  - type: validates
    target: SCEN-kibi-verification-evidence-contract
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-fresh-verification-receipts
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1e6275776fbd98f4aacc8966
    test_id: TEST-kibi-verification-evidence-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: ed7b763c96c8f85af5b97457206715b719837d03489a7236cd5e2aa2e449bcd8
    binding_hash: c012e820e4e0c402f40742162fb22e6426fc6d24fa36fed9b4898167744a9a21
    fingerprint: cb0be4beb70a47d0226524bfb901643f1ae90d813d706ef3a615b4b9fb78ff16
    fingerprint_components:
      contract: ed7b763c96c8f85af5b97457206715b719837d03489a7236cd5e2aa2e449bcd8
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
      - symbol_id: SYM-test-packed-fresh-verification-receipts
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
Receipt and reporter tests verify stable case IDs, contract and snapshot binding, append-only history across contract evolution, exact argv capture, first-attempt proof semantics, and rejection of stale, skipped, retried, partial, or mismatched runs. Earlier-contract receipts remain immutable audit evidence, while only a receipt for the current contract and snapshot contributes proof.
