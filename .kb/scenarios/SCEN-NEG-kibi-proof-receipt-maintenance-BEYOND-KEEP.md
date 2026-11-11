---
title: 'An invalid keep window is refused and leaves the receipts in place'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-proof-receipt-maintenance-BEYOND-KEEP
type: scenario
---
Given a test with two receipts, when kibi proof prune runs with --keep 0, then it fails with "keep must be an integer between 1 and 50" and the history is unchanged until a valid prune runs.

This is the failure side of pruning. documentation/tests/e2e/packed/proof-maintenance-ops.test.ts, in its prune case, exercises it.
