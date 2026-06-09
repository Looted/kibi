---
id: REQ-cli-schema-migration
title: CLI migrates branch KB schema versions
status: open
created_at: 2026-05-30T00:00:00Z
updated_at: 2026-06-08T00:00:00Z
source: docs/entity-schema.md#schema-migration
priority: must
tags:
  - cli
  - migration
  - schema
links:
  - type: specified_by
    target: SCEN-cli-migrate
  - type: verified_by
    target: TEST-cli-migrate
---

The CLI must provide an idempotent migration path for branch KB schema changes, including dry-run preview, explicit application, audit metadata, compatibility remediation for legacy ontology data, and a non-mutating semantic-advisor backfill marker for existing requirement prose.
