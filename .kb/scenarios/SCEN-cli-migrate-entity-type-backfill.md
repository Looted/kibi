---
title: A migrated legacy entity file states its type, so the first upsert changes only what it asks for
status: active
expects: success
tags:
  - cli
  - migration
  - upsert
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:44.372Z'
id: SCEN-cli-migrate-entity-type-backfill
type: scenario
---
Given a legacy KB whose requirement files have no `type` line, when `kibi migrate --yes` runs, then each authored entity file gains the folder-implied `type` as its last front matter key and no other line changes, and a later status-only `kb_upsert` changes only the `status` line. Given a KB at the latest schema that was migrated without the type line, `kibi migrate` plans the automatic `entity-type-backfill` action and `kibi migrate --yes` adds only the `type` line; a second run changes nothing.

This exists because the first Kibi write after a migration added an unrelated `type: req` line to the user's change.
