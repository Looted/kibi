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
---
# Consumer CLI keeps only the newest and deciding proof receipts and fails only the test that owns a failing step

Drives `kibi prove`, `kibi proof compact` and `kibi coverage` through the built `kibi` binary against a fixture command integration (`packages/cli/tests/consumer/proof-receipt-compaction.test.ts`).

- Across pass, pass, fail, fail, pass runs, ingest keeps only the newest receipt and the last passing one, rewriting only the receipts block of the test document.
- With a per-test report, a failing step fails only the test that owns it; a failure that cannot be attributed fails every selected test and says why.
- `kibi proof compact` shortens a long history to its newest and deciding receipts without changing what coverage reports, and a second run removes nothing.
