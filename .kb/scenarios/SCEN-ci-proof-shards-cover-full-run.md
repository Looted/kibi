---
title: The join merges three complete shards
status: active
expects: success
tags:
  - ci
origin:
  kind: agent
  recorded_at: '2026-11-17T11:21:32.859Z'
id: SCEN-ci-proof-shards-cover-full-run
type: scenario
---
All three shards pass. The join compares their selections with its own `kibi prove --all --list`, finds every contracted test passed by exactly one shard and every changed file a receipt of that shard's tests, copies the receipts and runs the evidence-floor gate.