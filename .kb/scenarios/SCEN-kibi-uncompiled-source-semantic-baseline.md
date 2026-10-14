---
title: A requirement that once failed to compile syncs again when its prose is unchanged
status: active
expects: success
tags:
  - sync
  - upsert
origin:
  kind: agent
  recorded_at: '2026-10-14T17:39:54.226Z'
id: SCEN-kibi-uncompiled-source-semantic-baseline
type: scenario
---
Given a migrated legacy requirement with no proposition inventory that synced cleanly, when its status is edited to a value sync cannot compile and `kibi sync` reports the extraction failure, then restoring the committed file with `git checkout` syncs cleanly and `kb_status` is fresh again, also after more than one failed sync. A status-only `kb_upsert` that closes the uncompiled file is accepted, and the next `kibi sync` compiles it, whether the store still holds the entity or a `kibi sync --rebuild` dropped it. When the prose changed while the file failed, `kibi sync` refuses it with the proposition-complete message.

A legacy requirement that failed the store's first compilation can be closed with `kb_upsert` and then syncs; one written after the first compilation is refused before writing.

This exists because a requirement file that once failed extraction was treated as new authoring forever after, so sync refused the restored file while `kb_upsert` accepted the same write.