---
title: Garbage collection and branch store maintenance
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.cli.gc
canonical_key: req.req_cli_gc
id: FACT-SUBJ-REQ-CLI-GC
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kibi gc command, which removes branch KB stores whose local git branch no longer exists and leaves every other store alone. It is store cleanup, not receipt pruning.
