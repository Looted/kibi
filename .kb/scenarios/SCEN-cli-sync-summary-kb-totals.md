---
title: The kibi sync summary shows what the KB holds, not only what the sync recompiled
status: active
expects: success
tags:
  - cli
  - sync
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:47.208Z'
id: SCEN-cli-sync-summary-kb-totals
type: scenario
---
Given a synced KB with two requirements, when one requirement is updated and `kibi sync` runs again, then the summary reports `KB Totals: 2 entities` with `req: 2` and the KB relationship count, followed by the counts imported from changed sources only.

This exists because the summary printed only the imported delta, which read as the KB having lost its entities.
