---
title: Requirement statuses during migration
status: active
fact_kind: subject
subject_key: kibi.migration.requirement_status
tags:
  - strict-lane
origin:
  kind: agent
  recorded_at: '2026-10-14T08:54:05.618Z'
id: FACT-SUBJ-kibi-migration-requirement-status
type: fact
---

Legacy requirement statuses as kibi migrate handles them: implemented, done and completed become closed with the implemented tag, and the migration is not reported complete while a requirement sync cannot compile remains. It does not cover the retired status rules.
