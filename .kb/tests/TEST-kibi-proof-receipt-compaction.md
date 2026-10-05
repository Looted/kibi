---
title: Proof receipts are compacted on ingest, failures are attributed per test, and bindings use repository-relative paths
status: passing
tags:
  - proof
  - receipts
  - compaction
  - attribution
  - snapshot
verification_scope: unit
verification_perspective: internal
text_ref: packages/cli/tests/proof/receipt-compaction.test.ts; packages/cli/tests/commands/proof-maintenance-in-process.test.ts; packages/cli/tests/proof/command-test-report.test.ts; packages/cli/tests/proof/prove-command.test.ts; packages/cli/tests/proof/code-scope.test.ts; packages/cli/tests/utils/repo-relative-path.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:16:04.212Z'
id: TEST-kibi-proof-receipt-compaction
type: test
---
# Proof receipts are compacted on ingest, failures are attributed per test, and bindings use repository-relative paths

Runs `packages/cli/tests/proof/receipt-compaction.test.ts` (compaction policy keeps the newest, newest passing and newest per scope and contract receipts as an ordered subsequence), `packages/cli/tests/commands/proof-maintenance-in-process.test.ts` (`kibi proof compact` rewrites only the `proof_receipts` block), `packages/cli/tests/proof/command-test-report.test.ts` and `packages/cli/tests/proof/prove-command.test.ts` (a `kibi.proof-test-report.v1` partitions a command run per test; a missing or incomplete report keeps whole-run evaluation), and `packages/cli/tests/proof/code-scope.test.ts` with `packages/cli/tests/utils/repo-relative-path.test.ts` (NFC, repository-relative receipt bindings).
