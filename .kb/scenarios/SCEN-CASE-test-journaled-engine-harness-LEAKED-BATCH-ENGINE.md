---
title: An engine a root suite batch left running is stopped before the batch returns
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:03.936Z'
id: SCEN-CASE-test-journaled-engine-harness-LEAKED-BATCH-ENGINE
type: scenario
---
Given a root suite batch whose test spawns a detached long-lived process and records its PID in the batch's private runtime directory, when the batch finishes, then the root runner stops that process and removes the private runtime directory before it returns the batch summary.

This covers the edge case of one uncleaned root suite batch, the value past the bound `gt 0`. test/root-summary.test.ts "stops an engine a batch left running and removes its runtime before returning" exercises it through runBatch.
