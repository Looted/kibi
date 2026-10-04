---
id: SCEN-core-journaled-engine-delta-sync
title: Normal sync compiles deltas into the active journal
type: scenario
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
tags: [cli, sync, performance]
links:
  - type: verified_by
    target: TEST-core-journaled-engine-delta-sync
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Given a branch with unchanged and changed source files
When the operator runs normal `kibi sync`
Then unchanged files are skipped, normalized entity hashes select only changed
and deleted entity records, relationship shard inventories select only changed
edges, and `sync --rebuild` remains the only replacement-generation operation.

And the canonical 10,000-symbol/30,000-edge benchmark must satisfy the exact
warm query, search, status, durable upsert, delta/full sync, cold attach, and
RSS thresholds listed by `TEST-core-journaled-engine-delta-sync`.
