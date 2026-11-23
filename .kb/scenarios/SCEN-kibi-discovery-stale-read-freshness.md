---
title: kb_query and kb_search confirm source and relationship shard freshness and preserve branch_store_stale warnings
status: active
priority: should
tags:
  - cli
  - discovery
  - freshness
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-23T10:46:51.240Z'
id: SCEN-kibi-discovery-stale-read-freshness
type: scenario
---
Verifies GitHub issue #829 (item 2, stale-read warning surface): when tracked `.kb/` entity files or `.kb/relationships/*.yaml` shards have drifted and auto-compile is disabled or skipped, `kb_query` and `kb_search` confirm byte hashes against `sync-cache.json`, report `syncState: "stale"` and `branch_store_stale`, and preserve the warning note even when `result-budget` truncates large `kb_query` results.