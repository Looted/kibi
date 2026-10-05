---
id: SCEN-core-journaled-engine-migration
title: Legacy branch migrates to a fenced journaled generation
type: scenario
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
tags: [core, migration, persistence]
links:
  - type: verified_by
    target: TEST-core-journaled-engine-persistence
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Given a populated legacy branch with `kb.rdf` and its audit journal
When a CLI or MCP client opens that branch
Then Kibi validates and publishes one journaled generation, preserves the
legacy files under `legacy/`, and leaves a sentinel that fences old clients.

If validation or publication is interrupted, the legacy branch remains usable,
the staging generation is disposable, and a later open can retry safely.
