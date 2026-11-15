---
title: Authored sources kibi sync cannot compile
status: active
fact_kind: subject
subject_key: kibi.sync.uncompiled_sources
tags:
  - strict-lane
origin:
  kind: agent
  recorded_at: '2026-10-14T08:54:06.858Z'
id: FACT-SUBJ-kibi-sync-uncompiled-sources
type: fact
---

Authored entity files that kibi sync cannot compile into the store, and how Kibi treats them: kb_check and kb_status report them, kb_upsert judges writes to them against what the next sync would accept, and a requirement that once failed keeps its legacy treatment while its prose is unchanged. It is not the general sync error output.
