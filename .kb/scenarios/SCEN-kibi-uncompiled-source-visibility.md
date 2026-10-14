---
title: An authored file sync cannot compile blocks kb_check, keeps kb_status stale and guards kb_upsert
status: active
expects: success
tags:
  - sync
  - upsert
  - status
  - check
origin:
  kind: agent
  recorded_at: '2026-10-14T08:56:45.841Z'
id: SCEN-kibi-uncompiled-source-visibility
type: scenario
---
Given a requirement file that `kibi sync` cannot extract, `kb_check` reports a blocking `source-relationship-parity` violation naming the file and the extraction error, and `kb_status` reports the stale reason `source_extraction_failed` instead of fresh until the file compiles. A `kb_upsert` of that id that only sets `status: closed` on a file with pinned `semantic_text` and no proposition inventory is judged against the front matter of the file and refused with the proposition-complete message, leaving the file unchanged; a write that would leave the file uncompilable is refused naming the file. A write that repairs an uncompiled ADR updates the same file in place, keeps its origin and says so in a warning.
