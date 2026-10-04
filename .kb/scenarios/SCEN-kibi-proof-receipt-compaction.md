---
title: Proof ingest keeps only deciding receipts and a failing step fails only the tests that own it
status: active
priority: must
tags:
  - proof
  - receipts
  - compaction
  - attribution
origin:
  kind: agent
  recorded_at: '2026-10-04T02:16:06.070Z'
id: SCEN-kibi-proof-receipt-compaction
type: scenario
---
# Proof ingest keeps only deciding receipts and a failing step fails only the tests that own it

Given a test whose receipt history holds many receipts for older snapshots and contracts
When `kibi prove` ingests a new run
Then the history keeps the newest receipt, the newest passing receipt and the newest receipt per scope and contract hash for the current binding and the live snapshot, in their original order
And every coverage decision is the same as before compaction.

Given a store written before compaction existed
When `kibi proof compact` runs
Then it applies the same policy and rewrites only the `proof_receipts` frontmatter block.

Given a command proof integration that writes a complete `kibi.proof-test-report.v1`
When one step fails
Then only the tests that own that step fail and the summary names the failing step
And when the report is missing, malformed or incomplete the whole run is evaluated as before.
