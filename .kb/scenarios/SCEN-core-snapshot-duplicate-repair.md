---
title: Attaching a store with duplicate triples repairs and reports it
status: active
expects: success
priority: must
tags:
  - core
  - persistence
  - doctor
  - status
origin:
  kind: agent
  recorded_at: '2026-11-17T09:08:08.568Z'
id: SCEN-core-snapshot-duplicate-repair
type: scenario
---
Given a branch store whose snapshot holds every triple twice, when an engine attaches it, then the store holds each triple once, the rewritten snapshot loads clean, the engine prints the repair on stderr and records it, kb_status lists a branch_store_repaired notice, and kibi doctor shows the Branch store check as a warning.