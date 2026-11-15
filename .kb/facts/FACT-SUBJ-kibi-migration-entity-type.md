---
title: Entity type field during migration
status: active
fact_kind: subject
subject_key: kibi.migration.entity_type
tags:
  - strict-lane
origin:
  kind: agent
  recorded_at: '2026-10-14T21:06:30.280Z'
id: FACT-SUBJ-kibi-migration-entity-type
type: fact
---

The type field in an authored entity file's front matter as kibi migrate handles it: a file without one gets the type its folder implies, at any schema version, and no other line changes. It is about the backfill, not about how sync reads types.
