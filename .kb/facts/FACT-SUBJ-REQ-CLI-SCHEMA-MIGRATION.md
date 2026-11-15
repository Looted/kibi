---
title: CLI migrates branch KB schema versions
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.migration.schema_version
canonical_key: req.req_cli_schema_migration
id: FACT-SUBJ-REQ-CLI-SCHEMA-MIGRATION
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Upgrading a branch KB from one schema version to the next through kibi migrate: idempotent steps, applied only with the approved hash of the current migration plan. It is the version path, not the orchestration flow around it.
