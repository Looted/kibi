---
id: SCEN-core-journaled-engine-delta-sync
title: Normal sync compiles deltas into the active journal
type: scenario
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/scenarios/SCEN-core-journaled-engine-delta-sync.md
tags: [cli, sync, performance]
links:
  - type: verified_by
    target: TEST-core-journaled-engine-delta-sync
---

Given a branch with unchanged and changed source files
When the operator runs normal `kibi sync`
Then unchanged files are skipped, normalized entity hashes select only changed
and deleted entity records, relationship shard inventories select only changed
edges, and `sync --rebuild` remains the only replacement-generation operation.

And the canonical 10,000-symbol/30,000-edge benchmark must satisfy the exact
warm query, search, status, durable upsert, delta/full sync, cold attach, and
RSS thresholds listed by `TEST-core-journaled-engine-delta-sync`.
