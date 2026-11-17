---
title: A snapshot written after retracts and re-asserts loads each triple once
status: active
expects: success
priority: must
tags:
  - core
  - persistence
origin:
  kind: agent
  recorded_at: '2026-11-17T09:08:07.291Z'
id: SCEN-core-snapshot-triples-held-once
type: scenario
---
Given a journaled branch store whose triples were retracted and asserted again while the background garbage collector could not run, when Kibi writes its snapshot, then nothing is left for the collector to reclaim and a fresh load of the snapshot holds each triple once.