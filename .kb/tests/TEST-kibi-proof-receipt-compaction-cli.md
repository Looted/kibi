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
    receipt_id: PR-b92f7f0d419b353a510cf74c
    test_id: TEST-kibi-proof-receipt-compaction-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: f0fd27d161e0f366d0e4027f08bc1530db0ab8379a4a8d6801b80cf635d125ea
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-04T06:02:54.913Z'
    finished_at: '2026-10-04T06:03:25.180Z'
    artifact_digest: f3c59f48d56ccb0091c0e9b2cb54303627249f129ee696956c029725f3593a6f
    contract_hash: 5e7b235b6806e8520a2b113b947fef56dc1bc93c8fcfb32859fdf6089a19e33a
    binding_hash: 3e23c9e58804f5257bc48f0afa14593b8d9d4135124d911d3365078627cabc7d
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
