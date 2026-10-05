---
title: Consumer CLI keeps only the newest and deciding proof receipts and fails only the test that owns a failing step
status: passing
priority: must
tags:
  - proof
  - receipts
  - compaction
  - attribution
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-proof-receipt-compaction-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-proof-receipt-compaction-cli
    target: default
    native_id: packages/cli/tests/consumer/proof-receipt-compaction.test.ts::proof receipt compaction through the kibi CLI::ingest keeps only the newest and deciding receipts of every kibi prove run
    source_file: packages/cli/tests/consumer/proof-receipt-compaction.test.ts
    line: 249
origin:
  kind: agent
  recorded_at: '2026-10-04T05:29:55.515Z'
id: TEST-kibi-proof-receipt-compaction-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3d85b5f6ca48bd8f709b3947
    test_id: TEST-kibi-proof-receipt-compaction-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 5e7b235b6806e8520a2b113b947fef56dc1bc93c8fcfb32859fdf6089a19e33a
    binding_hash: f8d749a83da1b5489c60ae821689945735a1e44bd7b9d7c5af6ad42bf518cc79
    fingerprint: 8a3140b9aacd3e49932dfdf3ef35ab4f5ef88640d5ffddc43c18223a80398d39
    fingerprint_components:
      contract: 5e7b235b6806e8520a2b113b947fef56dc1bc93c8fcfb32859fdf6089a19e33a
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 045e00f9772e3c2a64f8d8df76c3e5287f259e43e91784c9894c58f918f44628
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-proof-receipt-compaction-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Consumer CLI keeps only the newest and deciding proof receipts and fails only the test that owns a failing step

Drives `kibi prove`, `kibi proof compact` and `kibi coverage` through the built `kibi` binary against a fixture command integration (`packages/cli/tests/consumer/proof-receipt-compaction.test.ts`).

- Across pass, pass, fail, fail, pass runs, ingest keeps only the newest receipt and the last passing one, rewriting only the receipts block of the test document.
- With a per-test report, a failing step fails only the test that owns it; a failure that cannot be attributed fails every selected test and says why.
- `kibi proof compact` shortens a long history to its newest and deciding receipts without changing what coverage reports, and a second run removes nothing.
