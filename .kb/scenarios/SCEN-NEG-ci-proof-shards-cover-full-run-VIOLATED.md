---
title: A shard's gap passes the proof workflow
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:21:33.983Z'
id: SCEN-NEG-ci-proof-shards-cover-full-run-VIOLATED
type: scenario
---
A shard failed, never reported, skipped a test or changed a file other than its own receipts, and the proof workflow still passes on the receipts committed earlier.

This is the failure side the join must not produce; scripts/tests/ci-proof-shards.test.ts checks it.